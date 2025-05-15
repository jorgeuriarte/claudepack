#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const packCommand = require('./commands/pack');
const unpackCommand = require('./commands/unpack');
const packageInfo = require('../package.json');

// Configurar el programa
program
  .name('claudepack')
  .description('Herramienta para empaquetar y transportar proyectos de Claude Code')
  .version(packageInfo.version);

// Comando pack
program
  .command('pack')
  .description('Empaqueta un proyecto de Claude Code con su historial de conversaciones')
  .argument('[projectPath]', 'Ruta al directorio del proyecto (por defecto: directorio actual)', process.cwd())
  .option('-o, --output <filename>', 'Nombre del archivo de salida')
  .option('-e, --exclude <patterns...>', 'Patrones de archivos a excluir (glob)')
  .option('--strict', 'Activa validaciones más estrictas durante el empaquetado')
  .option('--ignore-warnings', 'Continúa incluso si hay advertencias')
  .option('--validate-only', 'Solo verifica si el proyecto puede ser empaquetado sin crear el paquete')
  .option('--claude-db <path>', 'Ruta al directorio .claude (por defecto: ~/.claude)')
  .option('--debug', 'Muestra información de depuración durante la ejecución')
  .action(packCommand);

// Comando unpack
program
  .command('unpack')
  .description('Desempaqueta un proyecto de Claude Code con su historial de conversaciones')
  .argument('<packageFile>', 'Archivo .claudepack.tar.gz a desempaquetar')
  .option('-d, --destination <path>', 'Directorio donde desempaquetar el proyecto (por defecto: directorio actual)', process.cwd())
  .option('-f, --force', 'Ignora incompatibilidades de versión y otras advertencias')
  .option('--dry-run', 'Simula el proceso sin realizar cambios')
  .option('--merge', 'Intenta combinar con conversaciones existentes')
  .option('--overwrite', 'Sobrescribe conversaciones existentes')
  .option('--validate-only', 'Solo verifica si el paquete puede ser desempaquetado')
  .option('--claude-db <path>', 'Ruta al directorio .claude (por defecto: ~/.claude)')
  .option('--debug', 'Muestra información de depuración durante la ejecución')
  .action(unpackCommand);

// Mensajes de error personalizados
program.showHelpAfterError('(Usa --help para información adicional)');

// Manejo de comandos desconocidos
program.on('command:*', function () {
  console.error(chalk.red('Comando inválido: %s'), program.args.join(' '));
  console.error(chalk.yellow('Consulta --help para ver una lista de comandos disponibles.'));
  process.exit(1);
});

// Si no se proporciona ningún comando, mostrar ayuda
if (process.argv.length <= 2) {
  program.help();
}

// Analizar los argumentos
program.parse(process.argv);