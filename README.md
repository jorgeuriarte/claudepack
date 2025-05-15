# claudepack

Una herramienta para empaquetar y transportar proyectos de Claude Code entre diferentes ordenadores, preservando el historial de conversaciones y tareas.

![Claudepack Logo](https://github.com/jorgeuriarte/claudepack/raw/main/docs/images/claudepack-logo.png)

## Instalación

```bash
npm install -g claudepack
```

## Descripción

claudepack es una utilidad que permite "empaquetar" un directorio de proyecto que usa Claude Code, incluyendo todo su historial de conversaciones asociado, y trasladarlo a otro ordenador manteniendo toda la información y contexto. La herramienta genera un paquete comprimido que contiene:

1. El directorio del proyecto completo
2. Los archivos de conversación (JSONL) asociados al proyecto
3. Los archivos de tareas (JSON) asociados al proyecto
4. Un script de instalación que, al ejecutarse en el ordenador destino, crea las referencias necesarias en el directorio `.claude`

## Características

✅ Empaqueta todo el proyecto y sus datos asociados de Claude  
✅ Mantiene el historial completo de conversaciones  
✅ Conserva los archivos de tareas y Statsig  
✅ Instalación automatizada en el ordenador destino  
✅ Compatible con sistemas macOS y Linux  
✅ Funciona con la nueva estructura de directorios de Claude Code (`.claude`)  
✅ Soporte para incluir o excluir archivos específicos  

## Uso básico

### Empaquetando un proyecto

```bash
# Empaquetar un proyecto específico
claudepack pack /ruta/a/mi/proyecto

# Empaquetar el proyecto en el directorio actual
claudepack pack
```

### Desempaquetando un proyecto

```bash
# Desempaquetar en un directorio específico
claudepack unpack mi_proyecto.claudepack.tar.gz --destination /ruta/destino

# Desempaquetar en el directorio actual
claudepack unpack mi_proyecto.claudepack.tar.gz
```

### Continuar trabajando con el proyecto

Una vez desempaquetado, puedes continuar la conversación con Claude Code usando:

```bash
cd /ruta/al/proyecto/desempaquetado
claude --continue
```

El flag `--continue` es importante para mantener el contexto de la conversación anterior.

## Opciones avanzadas

### Comando Pack

```bash
claudepack pack [projectPath] [options]
```

Opciones:
- `-o, --output <filename>`: Nombre personalizado para el archivo de salida
- `-e, --exclude <patterns...>`: Patrones glob para excluir archivos
- `--strict`: Activa validaciones más estrictas durante el empaquetado
- `--ignore-warnings`: Continúa incluso si hay advertencias
- `--validate-only`: Solo verifica si el proyecto puede ser empaquetado
- `--claude-db <path>`: Ruta alternativa al directorio .claude
- `--debug`: Muestra información de depuración

### Comando Unpack

```bash
claudepack unpack <packageFile> [options]
```

Opciones:
- `-d, --destination <path>`: Directorio donde desempaquetar (por defecto: actual)
- `-f, --force`: Ignora incompatibilidades y advertencias
- `--dry-run`: Simula el proceso sin realizar cambios
- `--merge`: Intenta combinar con conversaciones existentes
- `--overwrite`: Sobrescribe conversaciones existentes
- `--validate-only`: Solo verifica si el paquete puede ser desempaquetado
- `--claude-db <path>`: Ruta alternativa al directorio .claude
- `--debug`: Muestra información de depuración

## Documentación detallada

Para más información sobre opciones avanzadas, ejemplos de uso y guías detalladas, consulta la [documentación completa](./docs/README.md).

## Compatibilidad

claudepack es compatible con:

- Claude Code CLI
- macOS, Linux (compatibilidad parcial con Windows)
- Node.js v14 o superior

## Licencia

[MIT](./LICENSE)

## Autores

- Jorge Uriarte
- Claude (Anthropic)

## Contribuir

Las contribuciones son bienvenidas. Por favor, crea un issue o pull request en GitHub.

## Agradecimientos

- Equipo de Anthropic por Claude Code
- A todos los usuarios que han probado y dado feedback sobre esta herramienta