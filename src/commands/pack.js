const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const minimatch = require('minimatch');
const chalk = require('chalk');
const archiver = require('archiver');
const ora = require('ora');
const os = require('os');
const { validateProject, createManifest } = require('../utils/validation');
const { normalizePathForClaude, findClaudeDbPath } = require('../utils/claudeUtils');
const { createInstallScript } = require('../utils/scriptGenerator');

/**
 * Implementación del comando pack
 * @param {string} projectPath - Ruta al directorio del proyecto (opcional, por defecto: directorio actual)
 * @param {object} options - Opciones del comando
 */
async function pack(projectPath, options) {
  const spinner = ora('Analizando proyecto...').start();
  
  try {
    // Modo depuración
    if (options.debug) {
      spinner.info('Modo depuración activado');
      console.log('Opciones:', options);
    }
    
    // Utilizar el directorio actual si no se proporciona una ruta específica
    if (!projectPath) {
      projectPath = process.cwd();
      if (options.debug) {
        spinner.info(`No se especificó ruta del proyecto, usando el directorio actual: ${projectPath}`);
      }
    }
    
    // Resolver ruta absoluta del proyecto
    const absoluteProjectPath = path.resolve(projectPath);
    
    // Verificar que el directorio existe
    if (!fs.existsSync(absoluteProjectPath)) {
      spinner.fail(`El directorio ${chalk.cyan(absoluteProjectPath)} no existe.`);
      process.exit(1);
    }
    
    // Verificar que es un directorio
    if (!fs.statSync(absoluteProjectPath).isDirectory()) {
      spinner.fail(`La ruta ${chalk.cyan(absoluteProjectPath)} no es un directorio.`);
      process.exit(1);
    }
    
    // Obtener nombre del proyecto (último segmento de la ruta)
    const projectName = path.basename(absoluteProjectPath);
    
    spinner.text = 'Localizando directorio de Claude DB...';
    
    // Mostrar que se está buscando en el directorio home
    if (options.debug) {
      spinner.info(`Buscando directorio .claude en ${os.homedir()}/.claude`);
    }
    
    // Encontrar directorio .claude (usar la opción personalizada si se proporciona)
    const claudeDbPath = findClaudeDbPath(options.claudeDb);
    if (!claudeDbPath) {
      spinner.fail(`No se pudo encontrar el directorio .claude.`);
      spinner.info(`Ubicaciones comprobadas:
      - ${path.join(os.homedir(), '.claude')} (ubicación estándar)
      - ${path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude-db')}
      - ${path.join(process.cwd(), '.claude')}
      - ${path.join(__dirname, '..', '..', '.claude')}
      - ${'/Volumes/DevelopmentProjects/Claude/claude-relocate/claude-db'}`);
      
      spinner.info(`Puedes especificar manualmente la ruta con la opción --claude-db.
      Ejemplo: claudepack pack ${projectPath} --claude-db /ruta/a/tu/directorio/.claude`);
      
      process.exit(1);
    }
    
    if (options.debug) {
      spinner.info(`Directorio .claude-db encontrado en: ${claudeDbPath}`);
    }
    
    spinner.text = 'Buscando conversaciones asociadas al proyecto...';
    
    // Normalizar la ruta del proyecto según convenciones de Claude
    const normalizedPath = normalizePathForClaude(absoluteProjectPath);
    const projectConversationsDir = path.join(claudeDbPath, 'projects', normalizedPath);
    
    if (options.debug) {
      spinner.info(`Ruta normalizada: ${normalizedPath}`);
      spinner.info(`Directorio de conversaciones: ${projectConversationsDir}`);
    }
    
    // Verificar si hay conversaciones para este proyecto
    let conversationFiles = [];
    if (fs.existsSync(projectConversationsDir)) {
      conversationFiles = fs.readdirSync(projectConversationsDir)
        .filter(file => file.endsWith('.jsonl'))
        .map(file => {
          return {
            uuid: path.basename(file, '.jsonl'),
            path: path.join(projectConversationsDir, file)
          };
        });
    }
    
    spinner.text = `Encontradas ${conversationFiles.length} conversaciones asociadas al proyecto.`;
    
    // Si está en modo validate-only y no hay conversaciones, mostrar advertencia
    if (options.validateOnly && conversationFiles.length === 0) {
      spinner.warn('No se encontraron conversaciones asociadas a este proyecto.');
      if (!options.ignoreWarnings) {
        spinner.info('Usa --ignore-warnings para continuar de todos modos.');
        process.exit(0);
      }
    }
    
    // Buscar archivos de tareas asociados
    spinner.text = 'Buscando archivos de tareas...';
    const todosDir = path.join(claudeDbPath, 'todos');
    let todoFiles = [];
    
    if (fs.existsSync(todosDir)) {
      // Usar los mismos UUIDs de las conversaciones para encontrar archivos de tareas
      todoFiles = conversationFiles.map(conv => conv.uuid)
        .filter(uuid => fs.existsSync(path.join(todosDir, `${uuid}.json`)))
        .map(uuid => {
          return {
            uuid: uuid,
            path: path.join(todosDir, `${uuid}.json`)
          };
        });
    }
    
    spinner.text = `Encontrados ${todoFiles.length} archivos de tareas asociados.`;
    
    // Buscar archivos statsig relacionados
    spinner.text = 'Buscando archivos statsig...';
    const statsigDir = path.join(claudeDbPath, 'statsig');
    let statsigFiles = [];
    
    if (fs.existsSync(statsigDir)) {
      // Recopilar todos los archivos statsig
      statsigFiles = fs.readdirSync(statsigDir)
        .filter(file => !fs.statSync(path.join(statsigDir, file)).isDirectory())
        .map(file => {
          return {
            name: file,
            path: path.join(statsigDir, file)
          };
        });
      
      spinner.text = `Encontrados ${statsigFiles.length} archivos statsig.`;
    } else {
      spinner.text = 'No se encontró directorio statsig.';
    }
    
    // Buscar archivos de tareas adicionales que podrían no estar vinculados directamente
    // a conversaciones del proyecto
    spinner.text = 'Buscando archivos de tareas adicionales...';
    let additionalTodos = [];
    
    if (fs.existsSync(todosDir)) {
      additionalTodos = fs.readdirSync(todosDir)
        .filter(file => file.endsWith('.json'))
        .filter(file => {
          // Excluir los que ya tenemos
          const uuid = path.basename(file, '.json');
          return !todoFiles.some(todo => todo.uuid === uuid);
        })
        .map(file => {
          const todoPath = path.join(todosDir, file);
          // Intentar leer el archivo para ver si contiene referencias al proyecto
          try {
            const content = fs.readFileSync(todoPath, 'utf8');
            // Si el contenido menciona la ruta del proyecto, incluirlo
            if (content.includes(absoluteProjectPath)) {
              return {
                uuid: path.basename(file, '.json'),
                path: todoPath
              };
            }
          } catch (err) {
            // Ignorar errores de lectura
          }
          return null;
        })
        .filter(Boolean);
    }
    
    if (additionalTodos.length > 0) {
      spinner.text = `Encontrados ${additionalTodos.length} archivos de tareas adicionales relacionados con el proyecto.`;
      todoFiles = [...todoFiles, ...additionalTodos];
    }
    
    // Validar el proyecto
    spinner.text = 'Validando proyecto...';
    const validationResult = validateProject(absoluteProjectPath, conversationFiles, todoFiles, options.strict);
    
    if (!validationResult.valid) {
      spinner.fail(`Error de validación: ${validationResult.error}`);
      process.exit(1);
    }
    
    // Si es solo validación, terminar aquí
    if (options.validateOnly) {
      spinner.succeed('Validación completada. El proyecto puede ser empaquetado.');
      console.log(chalk.green('✓ El proyecto es válido para empaquetado.'));
      process.exit(0);
    }
    
    // Determinar nombre del archivo de salida
    let outputFile = options.output;
    if (!outputFile) {
      outputFile = `${projectName}.claudepack.tar.gz`;
    }
    
    // Asegurarse de que el nombre de archivo termine con .claudepack.tar.gz
    if (!outputFile.endsWith('.claudepack.tar.gz')) {
      outputFile += '.claudepack.tar.gz';
    }
    
    // Resolver ruta absoluta del archivo de salida
    const outputPath = path.resolve(outputFile);
    
    // Crear directorio temporal para preparar el paquete
    spinner.text = 'Preparando paquete...';
    const tempDir = path.join(os.tmpdir(), `claudepack-${Date.now()}`);
    fs.ensureDirSync(tempDir);
    
    // Usar el tempDir directamente como directorio de destino para el proyecto
    const tempProjectDir = tempDir;
    
    // Copiar proyecto al directorio temporal (excluyendo patrones especificados)
    spinner.text = 'Copiando archivos del proyecto...';
    
    // Patrones a excluir por defecto
    const defaultExcludes = [
      'node_modules/**',
      '.git/**',
      '*.claudepack.tar.gz'
    ];
    
    const excludePatterns = [...defaultExcludes];
    
    // Añadir patrones de exclusión personalizados
    if (options.exclude && Array.isArray(options.exclude)) {
      excludePatterns.push(...options.exclude);
    }
    
    // Función para determinar si un archivo debe ser excluido
    const shouldExclude = (file) => {
      const relativePath = path.relative(absoluteProjectPath, file);
      return excludePatterns.some(pattern => {
        return minimatch(relativePath, pattern, { dot: true });
      });
    };
    
    if (options.debug) {
      spinner.info(`Copiando archivos de ${absoluteProjectPath} a ${tempProjectDir}`);
    }
    
    // Leer los archivos en el directorio del proyecto
    const projectFiles = fs.readdirSync(absoluteProjectPath);
    
    // Copiar cada archivo/directorio individualmente
    projectFiles.forEach(file => {
      const srcPath = path.join(absoluteProjectPath, file);
      const destPath = path.join(tempProjectDir, file);
      
      // Verificar si debe ser excluido
      if (!shouldExclude(srcPath)) {
        if (options.debug) {
          spinner.info(`Copiando ${srcPath} a ${destPath}`);
        }
        fs.copySync(srcPath, destPath);
      } else if (options.debug) {
        spinner.info(`Excluyendo ${srcPath}`);
      }
    });
    
    // El directorio .claude-db local ya se habrá copiado con los demás archivos
    // No necesitamos hacer nada adicional, solo informar si existe
    const tempLocalClaudeDbDir = path.join(tempProjectDir, '.claude-db');
    if (fs.existsSync(tempLocalClaudeDbDir) && fs.statSync(tempLocalClaudeDbDir).isDirectory()) {
      spinner.info(`Se encontró un directorio .claude-db local en el proyecto.`);
      
      if (options.debug) {
        spinner.info(`Directorio .claude-db local incluido: ${tempLocalClaudeDbDir}`);
      }
    }
    
    // Crear directorio .claudepack para almacenar todos los metadatos
    const tempClaudepackDir = path.join(tempDir, '.claudepack');
    fs.ensureDirSync(tempClaudepackDir);
    
    // Crear directorios para conversaciones, tareas y statsig dentro de .claudepack
    const tempConversationsDir = path.join(tempClaudepackDir, 'conversations');
    const tempTodosDir = path.join(tempClaudepackDir, 'todos');
    const tempStatsigDir = path.join(tempClaudepackDir, 'statsig');
    fs.ensureDirSync(tempConversationsDir);
    fs.ensureDirSync(tempTodosDir);
    fs.ensureDirSync(tempStatsigDir);
    
    // Copiar archivos de conversaciones
    spinner.text = 'Copiando conversaciones...';
    conversationFiles.forEach(file => {
      fs.copySync(file.path, path.join(tempConversationsDir, `${file.uuid}.jsonl`));
    });
    
    // Copiar archivos de tareas
    spinner.text = 'Copiando archivos de tareas...';
    todoFiles.forEach(file => {
      fs.copySync(file.path, path.join(tempTodosDir, `${file.uuid}.json`));
    });
    
    // Copiar archivos de statsig
    spinner.text = 'Copiando archivos statsig...';
    statsigFiles.forEach(file => {
      fs.copySync(file.path, path.join(tempStatsigDir, file.name));
    });
    
    // Crear manifiesto
    spinner.text = 'Creando manifiesto...';
    const manifestData = createManifest(
      absoluteProjectPath,
      projectName,
      conversationFiles,
      todoFiles,
      statsigFiles
    );
    
    // Guardar manifiesto dentro del directorio .claudepack
    fs.writeJsonSync(path.join(tempClaudepackDir, 'manifest.json'), manifestData, { spaces: 2 });
    
    // Crear script de instalación
    spinner.text = 'Creando script de instalación...';
    const installScript = createInstallScript(projectName);
    
    // Guardar script de instalación dentro del directorio .claudepack
    fs.writeFileSync(path.join(tempClaudepackDir, 'install.sh'), installScript, { mode: 0o755 });
    
    // Crear archivo claudepack en la raíz que sirva como punto de entrada
    const entryScript = `#!/bin/bash
# Este archivo es un punto de entrada para claudepack
# Para instalar manualmente, ejecute:
# ./.claudepack/install.sh

if [ -f ".claudepack/install.sh" ]; then
  echo "Ejecutando script de instalación de claudepack..."
  ./.claudepack/install.sh
else
  echo "ERROR: No se encontró el script de instalación."
  exit 1
fi
`;
    fs.writeFileSync(path.join(tempDir, 'claudepack-install.sh'), entryScript, { mode: 0o755 });
    
    // Crear archivo empaquetado
    spinner.text = `Creando paquete ${chalk.cyan(outputPath)}...`;
    
    // Crear stream de escritura para el archivo de salida
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('tar', {
      gzip: true,
      gzipOptions: { level: 9 } // Nivel máximo de compresión
    });
    
    // Escuchar eventos del archivo
    output.on('close', () => {
      const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      spinner.succeed(`Paquete creado: ${chalk.cyan(outputPath)} (${sizeMB} MB)`);
      
      // Limpiar directorio temporal
      fs.removeSync(tempDir);
      
      console.log('\nPara desempaquetar este proyecto en otro sistema:');
      console.log(chalk.cyan(`claudepack unpack ${path.basename(outputPath)}`));
      console.log('o descomprimir manualmente y ejecutar:');
      console.log(chalk.cyan(`tar -xzf ${path.basename(outputPath)}`));
      console.log(chalk.cyan(`./claudepack-install.sh`));
    });
    
    archive.on('error', (err) => {
      spinner.fail(`Error al crear el archivo: ${err.message}`);
      fs.removeSync(tempDir);
      process.exit(1);
    });
    
    // Conectar archivo y stream
    archive.pipe(output);
    
    // Añadir todos los archivos del directorio temporal al archivo
    archive.directory(tempDir, false);
    
    // Finalizar el archivo
    archive.finalize();
    
  } catch (error) {
    spinner.fail(`Error: ${error.message}`);
    console.error(chalk.red(error.stack));
    process.exit(1);
  }
}

module.exports = pack;