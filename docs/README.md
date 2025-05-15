# claudepack

Una herramienta para empaquetar y transportar proyectos de Claude Code entre diferentes ordenadores, preservando el historial de conversaciones y tareas.

## Descripción

claudepack es una utilidad que permite "empaquetar" un directorio de proyecto que usa Claude Code, incluyendo todo su historial de conversaciones asociado, y trasladarlo a otro ordenador manteniendo toda la información y contexto. La herramienta genera un paquete comprimido que contiene:

1. El directorio del proyecto completo (incluyendo cualquier directorio `.claude-db` local)
2. Los archivos de conversación (JSONL) asociados al proyecto desde `~/.claude-db/projects/`
3. Los archivos de tareas (JSON) asociados al proyecto desde `~/.claude-db/todos/`
4. Los archivos statsig relevantes desde `~/.claude-db/statsig/`
5. Un script de instalación que configura automáticamente el proyecto en el sistema destino

Al desempaquetar con el comando `unpack`, el sistema realiza automáticamente la instalación sin necesidad de ejecutar manualmente el script de instalación.

## Motivación

Claude Code almacena las conversaciones en el directorio `.claude-db` del usuario, utilizando una estructura de directorios que refleja las rutas absolutas de los proyectos. Esto dificulta compartir o transferir proyectos entre ordenadores, ya que se pierde el historial de conversaciones.

claudepack resuelve este problema permitiendo empaquetar un proyecto completo con todo su historial y configurarlo automáticamente en un nuevo sistema.

## Características

- Empaqueta el directorio del proyecto junto con su historial de conversaciones
- Normaliza las rutas para que funcionen en el sistema destino
- Incluye un script de instalación que configura automáticamente el proyecto en el sistema destino
- Preserva los UUIDs de conversación para mantener la integridad de las referencias
- Compatible con macOS y Linux (pendiente soporte para Windows)
- Detecta y ajusta la versión del modelo de Claude utilizado
- Sistema robusto de validación para garantizar la compatibilidad

## Uso

### Empaquetando un proyecto

```bash
# Empaquetar un proyecto específico
claudepack pack /ruta/a/mi/proyecto [--output mi_proyecto.claudepack.tar.gz]

# Empaquetar el proyecto en el directorio actual
claudepack pack [--output mi_proyecto.claudepack.tar.gz]
```

### Desempaquetando un proyecto

```bash
# Opción 1: Usar el comando unpack (destino personalizado)
# El proyecto se desempaqueta en /ruta/destino y se instala automáticamente
claudepack unpack mi_proyecto.claudepack.tar.gz --destination /ruta/destino

# Opción 2: Usar el comando unpack (destino: directorio actual)
# El proyecto se desempaqueta en el directorio actual y se instala automáticamente
claudepack unpack mi_proyecto.claudepack.tar.gz

# Opción 3: Descomprimir manualmente y ejecutar el script (método antiguo)
tar -xzf mi_proyecto.claudepack.tar.gz
cd mi_proyecto
./claude-install.sh
```

> Nota: El comando `unpack` ahora instala automáticamente el proyecto en Claude DB sin necesidad de ejecutar el script de instalación manualmente.

## Opciones de los comandos

### Comando `pack`

```bash
claudepack pack [opciones] [ruta/al/proyecto]
```

| Argumento | Descripción |
|-----------|-------------|
| `ruta/al/proyecto` | Ruta al directorio del proyecto (opcional, por defecto: directorio actual) |

| Opción | Descripción |
|--------|-------------|
| `--output, -o` | Especifica el nombre del archivo de salida |
| `--exclude, -e` | Patrones de archivos a excluir del proyecto |
| `--strict` | Activa validaciones más estrictas durante el empaquetado |
| `--ignore-warnings` | Continúa incluso si hay advertencias |
| `--validate-only` | Solo verifica si el proyecto puede ser empaquetado sin crear el paquete |
| `--claude-db` | Ruta al directorio .claude-db (por defecto: ~/.claude-db) |
| `--debug` | Muestra información de depuración durante la ejecución |

### Comando `unpack`

```bash
claudepack unpack [opciones] archivo.claudepack.tar.gz
```

| Argumento | Descripción |
|-----------|-------------|
| `archivo.claudepack.tar.gz` | Archivo .claudepack.tar.gz a desempaquetar |

| Opción | Descripción |
|--------|-------------|
| `--destination, -d` | Directorio donde desempaquetar el proyecto (por defecto: directorio actual) |
| `--force, -f` | Ignora incompatibilidades de versión y otras advertencias |
| `--dry-run` | Simula el proceso sin realizar cambios |
| `--merge` | Intenta combinar con conversaciones existentes |
| `--overwrite` | Sobrescribe conversaciones existentes |
| `--validate-only` | Solo verifica si el paquete puede ser desempaquetado |
| `--claude-db` | Ruta al directorio .claude-db (por defecto: ~/.claude-db) |
| `--debug` | Muestra información de depuración durante la ejecución |

## Ejemplo de uso

### Escenario 1: Transferir un proyecto específico entre ordenadores

**En el ordenador origen:**

```bash
# Instalar claudepack
npm install -g claudepack

# Empaquetar el proyecto (especificando ruta)
claudepack pack /Volumes/DevelopmentProjects/claude-draw/claude-draw

# Se genera un archivo: claude-draw.claudepack.tar.gz
```

**Transferir el archivo al ordenador destino (por USB, email, etc.)**

**En el ordenador destino:**

```bash
# Opción 1: Usar el comando unpack (si claudepack está instalado)
claudepack unpack claude-draw.claudepack.tar.gz --destination ~/Projects/

# Opción 2: Descomprimir manualmente y ejecutar el script
tar -xzf claude-draw.claudepack.tar.gz
cd claude-draw
./claude-install.sh
```

### Escenario 2: Empaquetar el proyecto actual

**En el ordenador origen:**

```bash
# Navegar al directorio del proyecto
cd /Volumes/DevelopmentProjects/claude-draw/claude-draw

# Empaquetar el proyecto actual (sin especificar ruta)
claudepack pack 

# Se genera un archivo: claude-draw.claudepack.tar.gz en el directorio actual
```

**En el ordenador destino:**

```bash
# Desempaquetar en el directorio actual
claudepack unpack claude-draw.claudepack.tar.gz

# O especificar un directorio de destino
claudepack unpack claude-draw.claudepack.tar.gz --destination ~/Projects/
```

Una vez completado, puedes abrir el proyecto con Claude Code y tendrás acceso a todo el historial de conversaciones y tareas, como si hubieras trabajado en este proyecto desde el principio en el ordenador destino.

## Validación y seguridad

claudepack implementa un riguroso sistema de validación tanto al empaquetar como al desempaquetar proyectos:

1. **Validación de estructura**: Verifica que el proyecto y los archivos de Claude tengan la estructura esperada
2. **Validación de integridad**: Comprueba que el paquete no esté corrupto mediante checksums
3. **Validación de compatibilidad**: Verifica que las versiones de Claude sean compatibles
4. **Prevención de conflictos**: Detecta posibles conflictos con conversaciones existentes

### Mecanismos de validación

claudepack opera bajo un principio estricto: **"Fallar rápido y explícitamente ante cualquier ambigüedad"**. La herramienta no realizará suposiciones ni intentará "arreglar" estructuras incompatibles, ya que esto podría resultar en pérdida de datos o comportamientos inesperados.

Cada paquete incluye un archivo de manifiesto con metadatos esenciales para la validación:

```json
{
  "claudepack_version": "1.0.0",
  "created_at": "2025-05-15T12:30:45Z",
  "claude_version": "claude-3-7-sonnet-20250219",
  "cli_version": "0.2.114",
  "project_path": "/Volumes/DevelopmentProjects/claude-draw/claude-draw",
  "project_name": "claude-draw",
  "files_count": 423,
  "conversations_count": 10,
  "todo_files_count": 10,
  "checksum": "sha256:f8a7b3c2e1d9a5b6c7d8e9f0a1b2c3d4",
  "compatible_with": ["macos", "linux"],
  "structure_version": "1"
}
```

## Detalles de implementación

### Formato de almacenamiento de Claude

Claude Code almacena la información en:

- `~/.claude-db/projects/` - Conversaciones en formato JSONL organizadas por directorios que representan las rutas absolutas
- `~/.claude-db/todos/` - Archivos JSON con las tareas asociadas a cada conversación

Cada conversación tiene un UUID único, y los archivos se nombran usando este UUID (`[uuid].jsonl` y `[uuid].json`).

### Proceso de empaquetado

1. Identifica el directorio del proyecto y su ruta absoluta
2. Busca en `~/.claude-db/projects/` las conversaciones asociadas (carpeta con nombre normalizado de la ruta)
3. Recopila los UUIDs de las conversaciones encontradas
4. Busca los archivos de tareas asociados en `~/.claude-db/todos/`
5. Crea un paquete comprimido con:
   - El directorio del proyecto
   - Los archivos JSONL de conversaciones
   - Los archivos JSON de tareas
   - Un script de instalación que reconfigurará todo en el sistema destino
   - Un manifiesto con metadatos para validación

### Proceso de instalación

El script de instalación:

1. Detecta la ubicación actual donde se ha descomprimido el proyecto
2. Normaliza esta ruta según las convenciones de Claude
3. Crea el directorio correspondiente en `~/.claude-db/projects/`
4. Copia los archivos JSONL adaptando las rutas en su contenido
5. Copia los archivos JSON de tareas a `~/.claude-db/todos/`

## Requisitos

- Node.js 14.0 o superior
- Claude Code CLI instalado en ambos sistemas
- Permisos de escritura en `~/.claude-db/`

## Limitaciones

- Las conversaciones que hagan referencia a archivos externos al directorio del proyecto pueden no funcionar correctamente
- Los sistemas deben usar la misma versión de Claude o una compatible
- Las rutas muy específicas del sistema pueden requerir ajustes manuales

## Desarrollo futuro

- Soporte para Windows
- Interfaz gráfica
- Opciones para filtrar o seleccionar qué conversaciones incluir
- Soporte para empaquetar múltiples proyectos relacionados