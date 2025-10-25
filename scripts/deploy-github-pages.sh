#!/bin/bash

# Script para deployar a GitHub Pages
# Uso: ./scripts/deploy-github-pages.sh

set -e

echo "🚀 Iniciando deployment a GitHub Pages..."

# Verificar que estamos en la rama correcta
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Advertencia: No estás en la rama 'main'. Rama actual: $CURRENT_BRANCH"
    read -p "¿Continuar de todos modos? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelado"
        exit 1
    fi
fi

# Verificar que no hay cambios sin commitear
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Hay cambios sin commitear. Por favor, commitea o stash los cambios antes de continuar."
    git status --short
    exit 1
fi

# Instalar dependencias si es necesario
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Limpiar build anterior
if [ -d "dist" ]; then
    echo "🧹 Limpiando build anterior..."
    rm -rf dist
fi

# Crear build
echo "🔨 Creando build para GitHub Pages..."
npm run build:github-pages

# Verificar que el build se creó correctamente
if [ ! -d "dist" ]; then
    echo "❌ Error: El directorio 'dist' no se creó"
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    echo "❌ Error: El archivo 'dist/index.html' no se creó"
    exit 1
fi

echo "✅ Build creado exitosamente"

# Mostrar información del build
echo "📊 Información del build:"
echo "   - Directorio: dist/"
echo "   - Archivos generados: $(find dist -type f | wc -l)"
echo "   - Tamaño total: $(du -sh dist | cut -f1)"

# Preguntar si hacer commit y push
read -p "¿Hacer commit y push de los cambios? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📝 Haciendo commit de los cambios..."
    git add .
    git commit -m "Deploy: Build para GitHub Pages $(date '+%Y-%m-%d %H:%M:%S')"
    
    echo "🚀 Haciendo push a GitHub..."
    git push origin $CURRENT_BRANCH
    
    echo "✅ Deployment completado!"
    echo "🌐 Tu aplicación estará disponible en:"
    echo "   https://[tu-usuario].github.io/NRDOperaciones"
else
    echo "ℹ️  Build creado localmente. Para deployar:"
    echo "   1. git add ."
    echo "   2. git commit -m 'Deploy: Build para GitHub Pages'"
    echo "   3. git push origin main"
fi

echo "🎉 ¡Listo! Tu aplicación Expo está preparada para GitHub Pages."
