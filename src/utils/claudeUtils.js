const os = require('os');
const path = require('path');
const fs = require('fs-extra');

/**
 * Normaliza una ruta según las convenciones de Claude
 * Reemplaza las barras '/' por guiones '-'
 * @param {string} filePath - Ruta a normalizar
 * @returns {string} - Ruta normalizada
 */
function normalizePathForClaude(filePath) {
  return filePath.replace(/\//g, '-');
}

/**
 * Encuentra la ruta al directorio .claude-db
 * @param {string} customPath - Ruta personalizada al directorio .claude-db (opcional)
 * @returns {string|null} - Ruta al directorio .claude-db o null si no se encuentra
 */
function findClaudeDbPath(customPath = null) {
  // Si se proporciona una ruta personalizada, usarla primero
  if (customPath) {
    if (fs.existsSync(customPath) && fs.statSync(customPath).isDirectory()) {
      return customPath;
    }
  }
  
  // Ubicaciones comunes donde podría estar el directorio .claude, en orden de prioridad
  const possibleLocations = [
    // Directorio home del usuario (ubicación estándar)
    path.join(os.homedir(), '.claude'),
    
    // Directorio .claude-db (ubicación anterior)
    path.join(os.homedir(), '.claude-db'),
    
    // Ubicación alternativa en macOS
    path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude'),
    
    // Directorio claude relativo al directorio actual
    path.join(process.cwd(), '.claude'),
    
    // Directorio node_modules en modo desarrollo
    path.join(process.cwd(), 'node_modules', '.claude'),
    
    // Directorio actual de trabajo de este script
    path.join(__dirname, '..', '..', '.claude'),
    
    // En directorio temporal (para pruebas)
    path.join(os.tmpdir(), '.claude'),

    // Carpeta actual
    path.join(process.cwd()),
    
    // Ubicaciones específicas basadas en estructura del proyecto (menor prioridad)
    '/Volumes/DevelopmentProjects/Claude/claude-relocate/claude-db'
  ];
  
  // Para depuración, recopilar todas las ubicaciones verificadas
  const checkedLocations = [];
  
  // Verificar cada ubicación posible
  for (const location of possibleLocations) {
    checkedLocations.push(location);
    
    if (fs.existsSync(location) && fs.statSync(location).isDirectory()) {
      // Verificar si es un directorio .claude-db válido
      if (fs.existsSync(path.join(location, 'projects')) || 
          fs.existsSync(path.join(location, 'todos')) || 
          fs.existsSync(path.join(location, 'statsig'))) {
        return location;
      }
    }
  }
  
  // Si no se encuentra, regresar null
  return null;
}

/**
 * Detecta la versión de Claude a partir de archivos JSONL
 * @param {Array} conversationFiles - Lista de archivos de conversación
 * @returns {string|null} - Versión de Claude detectada o null si no se puede detectar
 */
function detectClaudeVersion(conversationFiles) {
  if (!conversationFiles || conversationFiles.length === 0) {
    return null;
  }
  
  // Intentar leer el primer archivo JSONL para buscar información de versión
  try {
    const firstFile = conversationFiles[0].path;
    const content = fs.readFileSync(firstFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // Buscar en las primeras 20 líneas o menos
    const linesToCheck = Math.min(20, lines.length);
    
    for (let i = 0; i < linesToCheck; i++) {
      try {
        const jsonData = JSON.parse(lines[i]);
        
        // Buscar en el campo de mensaje para la información del modelo
        if (jsonData.message && jsonData.message.model) {
          return jsonData.message.model;
        }
        
        // Buscar en la versión CLI
        if (jsonData.version) {
          return jsonData.version;
        }
      } catch (e) {
        // Ignorar errores de parsing JSON
        continue;
      }
    }
  } catch (error) {
    // Silenciosamente fallar si no podemos leer el archivo
    return null;
  }
  
  return null;
}

/**
 * Detecta la versión CLI de Claude a partir de archivos JSONL
 * @param {Array} conversationFiles - Lista de archivos de conversación
 * @returns {string|null} - Versión CLI de Claude detectada o null si no se puede detectar
 */
function detectClaudeCliVersion(conversationFiles) {
  if (!conversationFiles || conversationFiles.length === 0) {
    return null;
  }
  
  // Intentar leer el primer archivo JSONL para buscar información de versión
  try {
    const firstFile = conversationFiles[0].path;
    const content = fs.readFileSync(firstFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // Buscar en las primeras 20 líneas o menos
    const linesToCheck = Math.min(20, lines.length);
    
    for (let i = 0; i < linesToCheck; i++) {
      try {
        const jsonData = JSON.parse(lines[i]);
        
        // Buscar el campo 'version'
        if (jsonData.version && jsonData.version.startsWith('0.')) {
          return jsonData.version;
        }
      } catch (e) {
        // Ignorar errores de parsing JSON
        continue;
      }
    }
  } catch (error) {
    // Silenciosamente fallar si no podemos leer el archivo
    return null;
  }
  
  return null;
}

module.exports = {
  normalizePathForClaude,
  findClaudeDbPath,
  detectClaudeVersion,
  detectClaudeCliVersion
};