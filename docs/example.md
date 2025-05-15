# Ejemplo detallado de uso de claudepack

Este documento muestra un caso de uso completo de claudepack, desde el empaquetado hasta la instalación en otro sistema.

## Caso práctico: Transferir el proyecto "claude-draw" entre dos ordenadores

### Sistema de origen: MacBook Pro de Jorge

**Directorio del proyecto:**
```
/Volumes/DevelopmentProjects/claude-draw/claude-draw/
```

**Conversaciones asociadas en Claude DB:**
```
~/.claude-db/projects/-Volumes-DevelopmentProjects-claude-draw-claude-draw/
  - 1cd984c5-ac2f-4e08-b928-7593f9ccfd47.jsonl
  - 66e277b6-40b1-4e15-9fc3-fcd1216bc8bc.jsonl
  - 720d42d2-63d7-475f-84b3-beefc091634e.jsonl
  - ...y otros archivos
```

**Tareas asociadas:**
```
~/.claude-db/todos/
  - 1cd984c5-ac2f-4e08-b928-7593f9ccfd47.json
  - 66e277b6-40b1-4e15-9fc3-fcd1216bc8bc.json
  - 720d42d2-63d7-475f-84b3-beefc091634e.json
  - ...y otros archivos
```

### Paso 1: Instalar claudepack en el sistema de origen

```bash
# Instalación global de la herramienta
npm install -g claudepack

# Verificar la instalación
claudepack --version
# > claudepack v1.0.0
```

### Paso 2: Empaquetar el proyecto

**Opción 1: Empaquetar especificando la ruta del proyecto**

```bash
# Navegar al directorio padre
cd /Volumes/DevelopmentProjects/claude-draw/

# Empaquetar el proyecto especificando la ruta
claudepack pack claude-draw

# Resultado en consola:
# > Analizando proyecto en: /Volumes/DevelopmentProjects/claude-draw/claude-draw
# > Encontradas 10 conversaciones asociadas al proyecto
# > Encontrados 10 archivos de tareas asociados
# > Empaquetando proyecto...
# > Creando script de instalación...
# > Paquete creado: claude-draw.claudepack.tar.gz (15.2 MB)
```

**Opción 2: Empaquetar desde el directorio del proyecto (usando el comportamiento por defecto)**

```bash
# Navegar directamente al directorio del proyecto
cd /Volumes/DevelopmentProjects/claude-draw/claude-draw/

# Empaquetar el proyecto actual (sin especificar ruta)
claudepack pack

# Resultado en consola:
# > Analizando proyecto en: /Volumes/DevelopmentProjects/claude-draw/claude-draw
# > Encontradas 10 conversaciones asociadas al proyecto
# > Encontrados 10 archivos de tareas asociados
# > Empaquetando proyecto...
# > Creando script de instalación...
# > Paquete creado: claude-draw.claudepack.tar.gz (15.2 MB)
```

### Paso 3: Transferir el paquete al sistema de destino

Transferir el archivo `claude-draw.claudepack.tar.gz` al nuevo sistema mediante cualquier método (USB, email, transferencia de archivos, etc.)

### Paso 4: En el sistema de destino (MacBook Air de María)

**Opción 1: Usando claudepack unpack (si está instalado)**

```bash
# Si claudepack está instalado, usar el comando unpack
cd ~/Projects/
claudepack unpack ~/Downloads/claude-draw.claudepack.tar.gz

# O desde el directorio donde está el archivo
cd ~/Downloads/
claudepack unpack claude-draw.claudepack.tar.gz --destination ~/Projects/
```

**Opción 2: Descompresión manual**

```bash
# Descomprimir el paquete en el directorio deseado
cd ~/Projects/
tar -xzf ~/Downloads/claude-draw.claudepack.tar.gz

# Entrar al directorio descomprimido
cd claude-draw

# Verificar el contenido
ls -la
# > total 416
# > drwxr-xr-x  15 maria  staff    480 May 15 15:45 .
# > drwxr-xr-x   8 maria  staff    256 May 15 15:45 ..
# > -rw-r--r--   1 maria  staff    852 May 15 15:45 .claude-manifest.json
# > -rwxr-xr-x   1 maria  staff   2541 May 15 15:45 claude-install.sh
# > drwxr-xr-x  12 maria  staff    384 May 15 15:45 claude-conversations
# > drwxr-xr-x   5 maria  staff    160 May 15 15:45 claude-todos
# > drwxr-xr-x  14 maria  staff    448 May 13 10:32 src
# > -rw-r--r--   1 maria  staff   2841 May 13 10:30 package.json
# > ...y otros archivos del proyecto
```

### Paso 5: Ejecutar el script de instalación

```bash
# Ejecutar el script de instalación
./claude-install.sh

# Resultado en consola:
# > Detectando sistema...
# > Sistema detectado: macOS
# > Ubicación actual del proyecto: /Users/maria/Projects/claude-draw
# > Creando estructura en .claude-db...
# > Procesando conversaciones...
# > Adaptando rutas en archivos JSONL...
# > Copiando archivos de tareas...
# > ¡Instalación completada!
# > 
# > El proyecto está listo para usarse con Claude Code.
# > Para abrir el proyecto con Claude Code, ejecute:
# >   cd /Users/maria/Projects/claude-draw
# >   claude
```

### Paso 6: Abrir el proyecto con Claude Code

```bash
# Entrar al directorio del proyecto (si no estamos ya en él)
cd ~/Projects/claude-draw

# Abrir Claude Code
claude
```

Al abrir Claude Code, se observa que:

1. Todo el historial de conversaciones está disponible
2. Las tareas están preservadas
3. El contexto completo se ha mantenido
4. Las referencias a archivos dentro del proyecto son válidas
5. Las fechas y UUIDs originales se mantienen

### Verificación de la instalación

Para verificar que todo funciona correctamente:

```bash
# Verificar que los archivos se han copiado correctamente
ls -la ~/.claude-db/projects/-Users-maria-Projects-claude-draw/
# > total 3256
# > drwxr-xr-x   12 maria  staff     384 May 15 15:50 .
# > drwxr-xr-x    3 maria  staff      96 May 15 15:50 ..
# > -rw-r--r--    1 maria  staff  152631 May 15 15:50 1cd984c5-ac2f-4e08-b928-7593f9ccfd47.jsonl
# > -rw-r--r--    1 maria  staff  284156 May 15 15:50 66e277b6-40b1-4e15-9fc3-fcd1216bc8bc.jsonl
# > ...y otros archivos
```

### ¿Qué ha ocurrido durante la instalación?

1. El script ha detectado la ruta actual del proyecto: `/Users/maria/Projects/claude-draw`
2. Ha normalizado esta ruta según las convenciones de Claude: `-Users-maria-Projects-claude-draw`
3. Ha creado el directorio correspondiente en `~/.claude-db/projects/`
4. Ha copiado los archivos JSONL adaptando las referencias de rutas:
   - De: `/Volumes/DevelopmentProjects/claude-draw/claude-draw`
   - A: `/Users/maria/Projects/claude-draw`
5. Ha copiado los archivos JSON de tareas a `~/.claude-db/todos/`
6. No ha modificado los UUIDs originales, preservando la integridad de las referencias

## Estructura del script de instalación

El script `claude-install.sh` generado por claudepack tiene la siguiente estructura:

```bash
#!/bin/bash

# Colores para mensajes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
function echo_status {
    echo -e "${BLUE}> ${1}${NC}"
}

# Función para mostrar éxito
function echo_success {
    echo -e "${GREEN}> ${1}${NC}"
}

# Detectar sistema
echo_status "Detectando sistema..."
SYSTEM=$(uname)
echo_status "Sistema detectado: $SYSTEM"

# Obtener ruta actual
CURRENT_PATH=$(pwd)
echo_status "Ubicación actual del proyecto: $CURRENT_PATH"

# Normalizar ruta según convenciones de Claude
if [ "$SYSTEM" = "Darwin" ] || [ "$SYSTEM" = "Linux" ]; then
    NORMALIZED_PATH=$(echo "$CURRENT_PATH" | sed 's/\//-/g')
    CLAUDE_DB_PATH="$HOME/.claude-db"
else
    echo "Sistema no compatible. Por favor, instale manualmente."
    exit 1
fi

# Crear estructura de directorios
echo_status "Creando estructura en .claude-db..."
mkdir -p "$CLAUDE_DB_PATH/projects/$NORMALIZED_PATH"

# Procesar conversaciones
echo_status "Procesando conversaciones..."
# Código para adaptar y copiar archivos JSONL

# Copiar archivos de tareas
echo_status "Copiando archivos de tareas..."
# Código para copiar archivos JSON de tareas

echo_success "¡Instalación completada!"
echo ""
echo_success "El proyecto está listo para usarse con Claude Code."
echo_success "Para abrir el proyecto con Claude Code, ejecute:"
echo_success "  cd $CURRENT_PATH"
echo_success "  claude"
```

## Resolución de problemas comunes

### El script de instalación falla al ejecutarse

**Problema:** No se puede ejecutar el script de instalación.
**Solución:** Asegúrate de que el script tiene permisos de ejecución:

```bash
chmod +x claude-install.sh
```

### Las rutas en las conversaciones no se adaptan correctamente

**Problema:** Claude no encuentra los archivos referenciados en las conversaciones.
**Solución:** Puede ser necesario ajustar manualmente algunas rutas en los archivos JSONL:

```bash
sed -i '' "s|/ruta/antigua|/ruta/nueva|g" ~/.claude-db/projects/-ruta-normalizada/*.jsonl
```

### El proyecto está en una ubicación temporal

**Problema:** Has descomprimido el proyecto en una ubicación temporal y quieres moverlo.
**Solución:** Mueve primero el proyecto a su ubicación final y luego ejecuta el script de instalación.