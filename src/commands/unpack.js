const fs = require('fs-extra');
const path = require('path');
const tar = require('tar');
const chalk = require('chalk');
const ora = require('ora');
const os = require('os');
const { createInterface } = require('readline');
const { validatePackage } = require('../utils/validation');
const { normalizePathForClaude, findClaudeDbPath } = require('../utils/claudeUtils');

/**
 * Muestra una pregunta de confirmación y espera la respuesta del usuario
 * @param {string} question - La pregunta a mostrar
 * @returns {Promise<boolean>} - true si el usuario confirma, false en caso contrario
 */
function askConfirmation(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(`${question} (s/n): `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 's' || answer.toLowerCase() === 'sí' || answer.toLowerCase() === 'si');
    });
  });
}

/**
 * Implementación del comando unpack
 * @param {string} packageFile - Ruta al archivo de paquete
 * @param {object} options - Opciones del comando
 */
async function unpack(packageFile, options) {
  const spinner = ora('Validando paquete...').start();
  
  try {
    // Modo depuración
    if (options.debug) {
      spinner.info('Modo depuración activado');
      console.log('Opciones:', options);
    }
    
    // Resolver ruta absoluta del archivo de paquete
    const absolutePackagePath = path.resolve(packageFile);
    
    // Validar el paquete
    const validationResult = validatePackage(absolutePackagePath);
    if (!validationResult.valid) {
      spinner.fail(`Error de validación: ${validationResult.error}`);
      process.exit(1);
    }
    
    // Determinar directorio de destino (por defecto: directorio actual)
    let destDir = options.destination || process.cwd();
    destDir = path.resolve(destDir);
    
    if (options.debug) {
      spinner.info(`Directorio de destino: ${destDir}`);
    }
    
    // Extraer el nombre del proyecto del nombre del archivo
    const packageFileName = path.basename(absolutePackagePath);
    let projectName = packageFileName.replace('.claudepack.tar.gz', '');
    
    // Usar el directorio de destino directamente, sin crear un subdirectorio adicional
    const projectDestDir = destDir;
    
    // Verificar si el directorio ya tiene archivos
    if (fs.existsSync(projectDestDir) && fs.readdirSync(projectDestDir).length > 0) {
      if (!options.overwrite && !options.merge) {
        spinner.warn(`El directorio ${chalk.cyan(projectDestDir)} no está vacío.`);
        console.log('Usa --overwrite para sobrescribir o --merge para combinar con archivos existentes.');
        
        if (!options.force) {
          const continueAnyway = await askConfirmation('¿Deseas continuar de todos modos?');
          if (!continueAnyway) {
            spinner.info('Operación cancelada por el usuario.');
            process.exit(0);
          }
        }
      }
    }
    
    // Si es solo validación, terminar aquí
    if (options.validateOnly) {
      spinner.succeed('Validación completada. El paquete puede ser desempaquetado.');
      console.log(chalk.green('✓ El paquete es válido para desempaquetar.'));
      process.exit(0);
    }
    
    // Si es simulación, mostrar lo que se haría
    if (options.dryRun) {
      spinner.info(`Simulando desempaquetado de ${chalk.cyan(absolutePackagePath)} a ${chalk.cyan(projectDestDir)}...`);
      console.log(chalk.yellow('Este es un dry-run. No se realizarán cambios.'));
      
      // Crear directorio temporal para examinar el contenido
      const tempDir = path.join(os.tmpdir(), `claudepack-dryrun-${Date.now()}`);
      fs.ensureDirSync(tempDir);
      
      // Extraer en el directorio temporal
      spinner.text = 'Examinando contenido del paquete...';
      await tar.extract({
        file: absolutePackagePath,
        cwd: tempDir
      });
      
      // Verificar si existe el manifiesto
      const manifestPath = path.join(tempDir, '.claude-manifest.json');
      if (!fs.existsSync(manifestPath)) {
        spinner.fail('El paquete no contiene un manifiesto válido (.claude-manifest.json).');
        fs.removeSync(tempDir);
        process.exit(1);
      }
      
      // Leer el manifiesto
      const manifest = fs.readJsonSync(manifestPath);
      
      spinner.succeed('Simulación completada. Detalles del paquete:');
      console.log(chalk.cyan('Nombre del proyecto:'), manifest.project_name);
      console.log(chalk.cyan('Versión de Claude:'), manifest.claude_version);
      console.log(chalk.cyan('Versión de CLI:'), manifest.cli_version);
      console.log(chalk.cyan('Archivos:'), manifest.files_count);
      console.log(chalk.cyan('Conversaciones:'), manifest.conversations_count);
      console.log(chalk.cyan('Archivos de tareas:'), manifest.todo_files_count);
      console.log(chalk.cyan('Archivos statsig:'), manifest.statsig_files_count || 0);
      console.log(chalk.cyan('Sistemas compatibles:'), manifest.compatible_with.join(', '));
      
      // Limpiar directorio temporal
      fs.removeSync(tempDir);
      process.exit(0);
    }
    
    // Preparar para desempaquetar
    spinner.text = `Desempaquetando ${chalk.cyan(absolutePackagePath)}...`;
    
    // Crear directorio de destino si no existe
    fs.ensureDirSync(projectDestDir);
    
    // Extraer el archivo
    await tar.extract({
      file: absolutePackagePath,
      cwd: projectDestDir,
      // Asegurar que se extraigan archivos y directorios ocultos
      preservePaths: true,
      follow: false,
      strict: true,
      onentry: entry => {
        if (options.debug) {
          spinner.info(`Extrayendo: ${entry.path}`);
        }
      }
    });
    
    // Verificar si existe el directorio .claudepack y sus archivos necesarios
    const claudepackDir = path.join(projectDestDir, '.claudepack');
    const manifestPath = path.join(claudepackDir, 'manifest.json');
    const installScriptPath = path.join(claudepackDir, 'install.sh');
    const entryScriptPath = path.join(projectDestDir, 'claudepack-install.sh');
    
    if (!fs.existsSync(claudepackDir)) {
      spinner.fail('El paquete no contiene un directorio .claudepack válido.');
      process.exit(1);
    }
    
    if (!fs.existsSync(manifestPath)) {
      spinner.fail('El paquete no contiene un manifiesto válido (.claudepack/manifest.json).');
      process.exit(1);
    }
    
    if (!fs.existsSync(installScriptPath)) {
      spinner.fail('El paquete no contiene un script de instalación (.claudepack/install.sh).');
      process.exit(1);
    }
    
    // Leer el manifiesto
    const manifest = fs.readJsonSync(manifestPath);
    
    // Verificar compatibilidad
    const currentSystem = os.platform() === 'darwin' ? 'macos' : (os.platform() === 'linux' ? 'linux' : 'windows');
    if (!manifest.compatible_with.includes(currentSystem) && !options.force) {
      spinner.fail(`Este paquete no es compatible con tu sistema (${currentSystem}).`);
      console.log(`Sistemas compatibles: ${manifest.compatible_with.join(', ')}`);
      console.log('Usa --force para intentar instalar de todos modos.');
      process.exit(1);
    }
    
    // Encontrar directorio .claude (usar la opción personalizada si se proporciona)
    if (options.debug) {
      spinner.info(`Buscando directorio .claude en ${os.homedir()}/.claude`);
    }
    
    const claudeDbPath = findClaudeDbPath(options.claudeDb);
    if (!claudeDbPath) {
      spinner.warn(`No se pudo encontrar el directorio .claude.`);
      spinner.info(`Para instalar automáticamente, necesitamos el directorio .claude.`);
      spinner.info(`Puedes especificar manualmente la ruta con la opción --claude-db.`);
      spinner.info(`Ejemplo: claudepack unpack ${packageFile} --claude-db /ruta/a/tu/directorio/.claude`);
      
      // Continuar con la descompresión pero sin instalar
      spinner.info(`El paquete ha sido desempaquetado pero no se ha instalado en Claude DB.`);
      spinner.succeed(`Paquete desempaquetado en ${chalk.cyan(projectDestDir)}`);
      
      console.log('\nPara completar la instalación manualmente, ejecuta:');
      console.log(chalk.cyan(`cd ${projectDestDir}`));
      console.log(chalk.cyan('./claude-install.sh'));
    } else {
      if (options.debug) {
        spinner.info(`Directorio .claude encontrado en: ${claudeDbPath}`);
      }
      
      // Hacer ejecutable el script de instalación
      fs.chmodSync(installScriptPath, 0o755);
      
      // Ejecutar automáticamente el script de instalación
      spinner.text = 'Instalando en Claude DB...';
      
      // Ahora vamos a instalar el contenido del directorio .claudepack
      spinner.text = 'Instalando datos de Claude...';
      
      // Copiar conversaciones desde .claudepack/conversations a .claude/projects
      const conversationsDir = path.join(claudepackDir, 'conversations');

      // Obtener la ruta normalizada del proyecto
      const normalizedPath = normalizePathForClaude(projectDestDir);
      const targetProjectDir = path.join(claudeDbPath, 'projects', normalizedPath);
      
      if (options.debug) {
        spinner.info(`Ruta normalizada: ${normalizedPath}`);
        spinner.info(`Creando directorio: ${targetProjectDir}`);
      }
      
      // Crear el directorio de destino si no existe, incluso si no hay conversaciones
      // Esto garantiza que el proyecto esté registrado en Claude DB
      fs.ensureDirSync(targetProjectDir);
      
      // Crear un archivo de marcador si no existen conversaciones
      if (!fs.existsSync(conversationsDir) || fs.readdirSync(conversationsDir).length === 0) {
        if (options.debug) {
          spinner.info(`No hay conversaciones para copiar. Creando archivo de marcador.`);
        }
        
        // Crear un archivo README.md en el directorio del proyecto
        const readmePath = path.join(targetProjectDir, 'README.md');
        const readmeContent = `# Proyecto Importado con Claudepack

Este proyecto fue importado desde ${manifest.project_path || 'un proyecto externo'} 
utilizando claudepack el ${new Date().toISOString().split('T')[0]}.

Para continuar la conversación con este proyecto, ejecuta:
\`\`\`
cd ${projectDestDir}
claude --continue
\`\`\`
`;
        fs.writeFileSync(readmePath, readmeContent);
      } else if (fs.existsSync(conversationsDir)) {
        // Copiar todos los archivos de conversaciones
        const conversationFiles = fs.readdirSync(conversationsDir)
          .filter(file => file.endsWith('.jsonl'));
          
        if (conversationFiles.length > 0) {
          spinner.info(`Copiando ${conversationFiles.length} conversaciones...`);
          
          // Adaptar las rutas en las conversaciones al nuevo sistema
          conversationFiles.forEach(file => {
            const srcPath = path.join(conversationsDir, file);
            const destPath = path.join(targetProjectDir, file);
            
            // Leer el contenido del archivo
            let content = fs.readFileSync(srcPath, 'utf8');
            
            // Reemplazar la ruta original con la nueva
            if (manifest.project_path && manifest.project_path !== 'unknown') {
              content = content.replace(new RegExp(manifest.project_path, 'g'), projectDestDir);
            }
            
            // Escribir el archivo con las rutas actualizadas
            fs.writeFileSync(destPath, content);
          });
        }
      }
      
      // Copiar tareas desde .claudepack/todos a .claude/todos
      const todosDir = path.join(claudepackDir, 'todos');
      if (fs.existsSync(todosDir) && fs.readdirSync(todosDir).length > 0) {
        spinner.info(`Copiando archivos de tareas...`);
        fs.copySync(todosDir, path.join(claudeDbPath, 'todos'), { overwrite: options.overwrite });
      }
      
      // Copiar statsig desde .claudepack/statsig a .claude/statsig
      const statsigDir = path.join(claudepackDir, 'statsig');
      if (fs.existsSync(statsigDir) && fs.readdirSync(statsigDir).length > 0) {
        spinner.info(`Copiando archivos statsig...`);
        fs.copySync(statsigDir, path.join(claudeDbPath, 'statsig'), { overwrite: options.overwrite });
      }
      
      // Verificar si hay un directorio .claude local incluido en el paquete
      const localClaudeDbDir = path.join(projectDestDir, '.claude');
      if (fs.existsSync(localClaudeDbDir) && fs.statSync(localClaudeDbDir).isDirectory()) {
        spinner.info(`Se encontró un directorio .claude local en el paquete.`);
        
        // No es necesario hacer nada más, ya que este directorio se mantendrá en el proyecto
        if (options.debug) {
          spinner.info(`Directorio .claude local mantenido en el proyecto.`);
        }
      }
      
      // No ejecutamos el script de instalación manualmente, sino que incluimos 
      // directamente la lógica de instalación aquí
        
      spinner.succeed(`Paquete desempaquetado e instalado en ${chalk.cyan(projectDestDir)}`);
      console.log(chalk.green('✓ El proyecto está listo para usarse con Claude Code.'));
      console.log(chalk.green(`Para continuar la conversación, ejecuta:`));
      console.log(chalk.cyan(`cd ${projectDestDir}`));
      console.log(chalk.cyan(`claude --continue`));
    }
    
  } catch (error) {
    spinner.fail(`Error: ${error.message}`);
    console.error(chalk.red(error.stack));
    process.exit(1);
  }
}

module.exports = unpack;