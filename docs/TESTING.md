# Guía de pruebas para claudepack

Este documento describe cómo probar la herramienta claudepack en diferentes entornos para asegurar su correcto funcionamiento.

## Entornos de prueba recomendados

Para asegurar la compatibilidad en diferentes sistemas, se recomienda probar claudepack en:

1. macOS (principal plataforma objetivo)
2. Linux (compatibilidad secundaria)
3. Windows (compatibilidad experimental/futura)

## Configuración para pruebas

### Requisitos previos

- Node.js 14.0 o superior instalado
- Claude Code CLI instalado
- Al menos un proyecto con conversaciones existentes

### Instalación local para pruebas

Para probar directamente desde el código fuente:

```bash
# Clonar el repositorio
git clone https://github.com/username/claudepack.git
cd claudepack

# Instalar dependencias
npm install

# Crear un enlace simbólico global para pruebas
npm link
```

## Escenarios de prueba

### Prueba 1: Empaquetar un proyecto especificando ruta

```bash
# Crear un proyecto de prueba
mkdir -p ~/test-claudepack/proyecto1
cd ~/test-claudepack/proyecto1
echo "console.log('Hola mundo');" > index.js

# Abrir con Claude Code para generar conversación
claude

# Después de generar al menos una conversación, empaquetar
claudepack pack ~/test-claudepack/proyecto1
```

### Prueba 2: Empaquetar usando el directorio actual

```bash
# Navegar al directorio del proyecto
cd ~/test-claudepack/proyecto1

# Empaquetar sin especificar ruta
claudepack pack
```

### Prueba 3: Desempaquetar especificando directorio

```bash
# Crear directorio de destino
mkdir -p ~/test-claudepack/destino

# Desempaquetar especificando directorio
claudepack unpack proyecto1.claudepack.tar.gz --destination ~/test-claudepack/destino
```

### Prueba 4: Desempaquetar en directorio actual

```bash
# Navegar al directorio destino
cd ~/test-claudepack/destino2

# Desempaquetar sin especificar directorio
claudepack unpack ~/test-claudepack/proyecto1.claudepack.tar.gz
```

### Prueba 5: Transferencia entre sistemas

1. Empaquetar en Sistema 1 (por ejemplo, macOS)
2. Transferir el archivo .claudepack.tar.gz a Sistema 2 (por ejemplo, Linux)
3. Desempaquetar en Sistema 2
4. Verificar que las conversaciones y tareas se transfirieron correctamente

## Lista de verificación

Para cada escenario de prueba, verificar:

- [ ] El empaquetado se completa sin errores
- [ ] La estructura del paquete contiene:
  - [ ] Directorio del proyecto
  - [ ] Archivos de conversaciones
  - [ ] Archivos de tareas
  - [ ] Archivos statsig (si corresponde)
  - [ ] Script de instalación
  - [ ] Manifiesto
- [ ] El desempaquetado se completa sin errores
- [ ] Las conversaciones están disponibles en el sistema destino
- [ ] Las tareas aparecen correctamente
- [ ] Las rutas se ajustan correctamente según el sistema destino

## Registro de problemas

Cualquier problema encontrado durante las pruebas debe ser reportado como un issue en GitHub, incluyendo:

1. Sistema operativo y versión
2. Versión de Node.js
3. Versión de Claude Code
4. Comando ejecutado
5. Salida completa del error
6. Pasos para reproducir

## Configuraciones específicas por sistema

### macOS

- Ubicación por defecto de Claude DB: `~/.claude-db`
- Ubicación alternativa: `~/Library/Application Support/Claude/claude-db`

### Linux

- Ubicación por defecto de Claude DB: `~/.claude-db`

### Windows

- Ubicación esperada de Claude DB: `%USERPROFILE%\.claude-db`