const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { detectClaudeVersion, detectClaudeCliVersion } = require('./claudeUtils');

/**
 * Valida un proyecto para empaquetado
 * @param {string} projectPath - Ruta al directorio del proyecto
 * @param {Array} conversationFiles - Lista de archivos de conversación
 * @param {Array} todoFiles - Lista de archivos de tareas
 * @param {boolean} strict - Si es true, aplica validaciones más estrictas
 * @returns {Object} - Resultado de la validación { valid: boolean, error: string }
 */
function validateProject(projectPath, conversationFiles, todoFiles, strict = false) {
  // Verificar permisos de lectura en el directorio del proyecto
  try {
    fs.accessSync(projectPath, fs.constants.R_OK);
  } catch (error) {
    return {
      valid: false,
      error: `No se tienen permisos suficientes para leer el directorio del proyecto: ${error.message}`
    };
  }
  
  // En modo estricto, verificar que hay al menos una conversación
  if (strict && (!conversationFiles || conversationFiles.length === 0)) {
    return {
      valid: false,
      error: 'No se encontraron conversaciones asociadas a este proyecto.'
    };
  }
  
  // Verificar que los archivos de conversación existen y son legibles
  for (const file of conversationFiles) {
    try {
      fs.accessSync(file.path, fs.constants.R_OK);
    } catch (error) {
      return {
        valid: false,
        error: `No se puede leer el archivo de conversación ${path.basename(file.path)}: ${error.message}`
      };
    }
    
    // Verificar que el archivo tiene formato JSONL
    if (!file.path.endsWith('.jsonl')) {
      return {
        valid: false,
        error: `El archivo ${path.basename(file.path)} no tiene formato JSONL.`
      };
    }
  }
  
  // Verificar que los archivos de tareas existen y son legibles
  for (const file of todoFiles) {
    try {
      fs.accessSync(file.path, fs.constants.R_OK);
    } catch (error) {
      return {
        valid: false,
        error: `No se puede leer el archivo de tareas ${path.basename(file.path)}: ${error.message}`
      };
    }
    
    // Verificar que el archivo tiene formato JSON
    if (!file.path.endsWith('.json')) {
      return {
        valid: false,
        error: `El archivo ${path.basename(file.path)} no tiene formato JSON.`
      };
    }
  }
  
  // En modo estricto, verificar que se puede detectar la versión de Claude
  if (strict) {
    const claudeVersion = detectClaudeVersion(conversationFiles);
    if (!claudeVersion) {
      return {
        valid: false,
        error: 'No se pudo detectar la versión de Claude en los archivos de conversación.'
      };
    }
  }
  
  return { valid: true };
}

/**
 * Crea un manifiesto para el paquete
 * @param {string} projectPath - Ruta al directorio del proyecto
 * @param {string} projectName - Nombre del proyecto
 * @param {Array} conversationFiles - Lista de archivos de conversación
 * @param {Array} todoFiles - Lista de archivos de tareas
 * @param {Array} statsigFiles - Lista de archivos statsig
 * @returns {Object} - Datos del manifiesto
 */
function createManifest(projectPath, projectName, conversationFiles, todoFiles, statsigFiles = []) {
  const claudeVersion = detectClaudeVersion(conversationFiles) || 'unknown';
  const cliVersion = detectClaudeCliVersion(conversationFiles) || 'unknown';
  
  return {
    claudepack_version: '1.0.0',
    created_at: new Date().toISOString(),
    claude_version: claudeVersion,
    cli_version: cliVersion,
    project_path: projectPath,
    project_name: projectName,
    files_count: countFilesInDirectory(projectPath),
    conversations_count: conversationFiles.length,
    todo_files_count: todoFiles.length,
    statsig_files_count: statsigFiles.length,
    checksum: 'sha256:' + createPackageChecksum(projectPath, conversationFiles, todoFiles, statsigFiles),
    compatible_with: detectCompatibleSystems(),
    structure_version: '1'
  };
}

/**
 * Cuenta archivos en un directorio recursivamente
 * @param {string} dir - Directorio a analizar
 * @returns {number} - Número de archivos
 */
function countFilesInDirectory(dir) {
  try {
    let count = 0;
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        count += countFilesInDirectory(itemPath);
      } else if (stats.isFile()) {
        count++;
      }
    }
    
    return count;
  } catch (error) {
    return 0;
  }
}

/**
 * Crea un checksum para el paquete
 * @param {string} projectPath - Ruta al directorio del proyecto
 * @param {Array} conversationFiles - Lista de archivos de conversación
 * @param {Array} todoFiles - Lista de archivos de tareas
 * @param {Array} statsigFiles - Lista de archivos statsig
 * @returns {string} - Checksum en formato hexadecimal
 */
function createPackageChecksum(projectPath, conversationFiles, todoFiles, statsigFiles = []) {
  const hash = crypto.createHash('sha256');
  
  // Añadir el nombre del proyecto al hash
  hash.update(path.basename(projectPath));
  
  // Añadir UUIDs de conversaciones al hash
  for (const file of conversationFiles) {
    hash.update(file.uuid);
  }
  
  // Añadir UUIDs de tareas al hash
  for (const file of todoFiles) {
    hash.update(file.uuid);
  }
  
  // Añadir nombres de archivos statsig al hash
  for (const file of statsigFiles) {
    hash.update(file.name);
  }
  
  return hash.digest('hex');
}

/**
 * Detecta los sistemas compatibles con este paquete
 * @returns {Array} - Lista de sistemas compatibles (macos, linux, windows)
 */
function detectCompatibleSystems() {
  const platform = os.platform();
  const compatibleSystems = [];
  
  if (platform === 'darwin') {
    compatibleSystems.push('macos');
  }
  
  if (platform === 'linux') {
    compatibleSystems.push('linux');
  }
  
  if (platform === 'win32') {
    compatibleSystems.push('windows');
  }
  
  // Si no podemos detectar, asumir compatibilidad con macOS y Linux
  if (compatibleSystems.length === 0) {
    compatibleSystems.push('macos', 'linux');
  }
  
  return compatibleSystems;
}

/**
 * Valida un paquete antes de desempaquetarlo
 * @param {string} packagePath - Ruta al archivo de paquete
 * @returns {Object} - Resultado de la validación { valid: boolean, error: string }
 */
function validatePackage(packagePath) {
  // Verificar que el archivo existe
  if (!fs.existsSync(packagePath)) {
    return {
      valid: false,
      error: `El archivo ${packagePath} no existe.`
    };
  }
  
  // Verificar que el archivo tiene la extensión correcta
  if (!packagePath.endsWith('.claudepack.tar.gz')) {
    return {
      valid: false,
      error: `El archivo ${packagePath} no tiene la extensión .claudepack.tar.gz.`
    };
  }
  
  // Verificar que el archivo es legible
  try {
    fs.accessSync(packagePath, fs.constants.R_OK);
  } catch (error) {
    return {
      valid: false,
      error: `No se puede leer el archivo ${packagePath}: ${error.message}`
    };
  }
  
  return { valid: true };
}

module.exports = {
  validateProject,
  validatePackage,
  createManifest
};