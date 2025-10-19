#!/bin/bash

# Colores para los mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

set -e

echo -e "${GREEN}🚀 Generando AAB para Google Play Store${NC}"

# 1. Leer y actualizar versión en package.json
VERSION=$(node -p "require('./package.json').version")
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"
NEW_PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"

# Actualizar package.json
jq ".version=\"$NEW_VERSION\"" package.json > package.tmp.json && mv package.tmp.json package.json

echo -e "${YELLOW}📦 Versión incrementada: $VERSION -> $NEW_VERSION${NC}"

# 2. Actualizar link en app/(tabs)/index.tsx
INDEX_FILE="app/(tabs)/index.tsx"
APK_URL="http://apk-operaciones.nrdonline.site/nrd_operaciones.apk"
sed -i '' "s|const apkUrl = 'http://apk-ordenes.nrdonline.site[^']*'|const apkUrl = '$APK_URL'|g" "$INDEX_FILE"
echo -e "${YELLOW}🔗 Link de descarga actualizado en $INDEX_FILE${NC}"

# 3. Configurar entorno Java y Android
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools

# 4. Limpiar y reinstalar dependencias
echo -e "${YELLOW}🧹 Limpiando caché y dependencias...${NC}"

# Detener procesos de Node.js de manera segura
echo -e "${YELLOW}⏹️ Deteniendo procesos de Node.js...${NC}"
if pgrep -f "node" > /dev/null; then
  kill -TERM $(pgrep -f "node") 2>/dev/null || true
fi
if pgrep -f "expo" > /dev/null; then
  kill -TERM $(pgrep -f "expo") 2>/dev/null || true
fi
if pgrep -f "metro" > /dev/null; then
  kill -TERM $(pgrep -f "metro") 2>/dev/null || true
fi
sleep 5

# Forzar terminación de procesos si aún están activos
echo -e "${YELLOW}🔨 Forzando terminación de procesos restantes...${NC}"
pkill -f "node" 2>/dev/null || true
pkill -f "expo" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true
sleep 3

# Limpiar caché de npm
echo -e "${YELLOW}🗑️ Limpiando caché de npm...${NC}"
npm cache clean --force

# Eliminar node_modules y archivos de caché
echo -e "${YELLOW}📁 Eliminando node_modules y archivos de caché...${NC}"
if [ -d "node_modules" ]; then
  echo -e "${YELLOW}Eliminando node_modules...${NC}"
  find node_modules -type f -delete 2>/dev/null || true
  find node_modules -type d -empty -delete 2>/dev/null || true
  rm -rf node_modules 2>/dev/null || true
  if [ -d "node_modules" ]; then
    echo -e "${YELLOW}Usando sudo para eliminar node_modules...${NC}"
    sudo rm -rf node_modules 2>/dev/null || true
  fi
fi
rm -f package-lock.json
rm -rf .expo
rm -rf .expo-shared

# Instalar dependencias
echo -e "${YELLOW}📦 Instalando dependencias...${NC}"
npm install --legacy-peer-deps

# 5. Limpiar caché de Metro
echo -e "${YELLOW}🔄 Limpiando caché de Metro...${NC}"
npx expo start -c --offline &
EXPO_PID=$!
sleep 20
kill -TERM $EXPO_PID 2>/dev/null || true
sleep 2

# 6. Verificar y corregir archivos de recursos
echo -e "${YELLOW}🔍 Verificando archivos de recursos...${NC}"
if [ -f "assets/notification-sound.wav" ]; then
  echo -e "${YELLOW}🔊 Renombrando archivo de sonido para compatibilidad con Android...${NC}"
  mv assets/notification-sound.wav assets/notification_sound.wav
  sed -i '' 's/notification-sound\.wav/notification_sound.wav/g' app.json
fi

# 7. Limpiar y regenerar directorio android si es necesario
echo -e "${YELLOW}🤖 Verificando directorio android...${NC}"
if [ ! -d "android" ] || [ ! -f "android/app/src/main/AndroidManifest.xml" ]; then
  echo -e "${YELLOW}🔄 Regenerando directorio android...${NC}"
  rm -rf android
  npx expo prebuild --platform android --clean
fi

# Verificar y corregir AndroidManifest.xml si es necesario
echo -e "${YELLOW}📋 Verificando AndroidManifest.xml...${NC}"
if [ -f "android/app/src/main/AndroidManifest.xml" ]; then
  if ! grep -q 'xmlns:tools=' android/app/src/main/AndroidManifest.xml; then
    echo -e "${YELLOW}➕ Agregando namespace tools al AndroidManifest.xml...${NC}"
    sed -i '' 's/xmlns:android="http:\/\/schemas.android.com\/apk\/res\/android"/xmlns:android="http:\/\/schemas.android.com\/apk\/res\/android" xmlns:tools="http:\/\/schemas.android.com\/tools"/' android/app/src/main/AndroidManifest.xml
  fi
  
  if grep -q 'com.google.firebase.messaging.default_notification_color' android/app/src/main/AndroidManifest.xml && ! grep -q 'tools:replace=' android/app/src/main/AndroidManifest.xml; then
    echo -e "${YELLOW}➕ Agregando tools:replace al AndroidManifest.xml...${NC}"
    sed -i '' 's/android:resource="@color\/notification_icon_color"/android:resource="@color\/notification_icon_color" tools:replace="android:resource"/' android/app/src/main/AndroidManifest.xml
  fi
fi

# 8. Eliminar archivos de versiones anteriores
echo -e "${YELLOW}🗑️ Eliminando archivos de versiones anteriores...${NC}"
find . -name '*.apk' -delete
find . -name 'NRD_Operaciones_v*.zip' -delete
find . -name 'NRD_Operaciones_v*.aab' -delete

# 9. Compilar el AAB para Google Play Store
echo -e "${YELLOW}🏗️ Compilando AAB para Google Play Store...${NC}"

# Configurar el entorno para el build
export NODE_OPTIONS="--max-old-space-size=4096"
export EXPO_USE_NPM=true
export NPM_CONFIG_PACKAGE_MANAGER=npm
export EAS_BUILD_PACKAGE_MANAGER=npm
export YARN_ENABLE_IMMUTABLE_INSTALLS=false
export YARN_ENABLE_GLOBAL_CACHE=false

# Ejecutar el build del AAB usando gradlew
echo -e "${YELLOW}🚀 Iniciando build del AAB con gradlew...${NC}"
cd android
./gradlew bundleRelease
cd ..

# 10. Buscar el AAB generado
echo -e "${YELLOW}🔍 Buscando AAB generado...${NC}"
AAB_PATH=$(find android/app/build/outputs/bundle/release -name "*.aab" -type f | head -1)

if [ -z "$AAB_PATH" ]; then
  echo -e "${RED}❌ No se encontró el AAB generado.${NC}"
  exit 1
fi

# Renombrar el AAB
AAB_NAME="NRD_Operaciones_v${NEW_VERSION}.aab"
if [ "$AAB_PATH" != "$(pwd)/$AAB_NAME" ]; then
  cp "$AAB_PATH" "$(pwd)/$AAB_NAME"
  AAB_PATH="$(pwd)/$AAB_NAME"
fi

echo -e "${GREEN}✅ AAB generado para Google Play Store: $AAB_PATH${NC}"

# 11. Mostrar información importante
echo -e "${GREEN}🎉 ¡AAB listo para Google Play Store!${NC}"
echo -e "${YELLOW}📋 Información importante:${NC}"
echo -e "   📦 Archivo: $AAB_NAME"
echo -e "   📱 Versión: $NEW_VERSION"
echo -e "   🏪 Listo para subir a Google Play Console"
echo -e ""
echo -e "${YELLOW}📝 Pasos siguientes:${NC}"
echo -e "   1. Ve a Google Play Console"
echo -e "   2. Selecciona tu app"
echo -e "   3. Ve a 'Producción' > 'Crear nueva versión'"
echo -e "   4. Sube el archivo: $AAB_NAME"
echo -e "   5. Completa la información de la versión"
echo -e "   6. Revisa y publica"
echo -e ""
echo -e "${GREEN}🚀 ¡Proceso completado exitosamente!${NC}"
