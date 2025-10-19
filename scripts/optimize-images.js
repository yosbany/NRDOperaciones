#!/usr/bin/env node

/**
 * Script para optimizar imágenes del proyecto
 * Reduce el tamaño de las imágenes para mejorar el rendimiento en dispositivos móviles
 */

const fs = require('fs');
const path = require('path');

// Configuración de optimización
const OPTIMIZATION_CONFIG = {
  // Tamaños máximos recomendados para móviles
  maxWidth: {
    'icon.png': 512,
    'adaptive-icon.png': 512,
    'splash-icon.png': 400,
    'favicon.png': 64,
    'notification-icon.png.png': 128,
    'default': 800
  },
  
  // Calidad de compresión (0-100)
  quality: 85,
  
  // Formatos preferidos
  preferredFormats: {
    photos: 'webp',
    icons: 'png',
    illustrations: 'svg'
  }
};

function analyzeImageSizes() {
  const assetsDir = path.join(__dirname, '../assets');
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
  
  console.log('🖼️  Analizando tamaños de imágenes...\n');
  
  function scanDirectory(dir, relativePath = '') {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const itemRelativePath = path.join(relativePath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath, itemRelativePath);
      } else if (imageExtensions.includes(path.extname(item).toLowerCase())) {
        const sizeKB = Math.round(stat.size / 1024);
        const sizeCategory = getSizeCategory(sizeKB);
        
        console.log(`${sizeCategory} ${itemRelativePath}: ${sizeKB} KB`);
        
        // Sugerir optimizaciones
        if (sizeKB > 100) {
          suggestOptimization(itemRelativePath, sizeKB);
        }
      }
    });
  }
  
  scanDirectory(assetsDir);
}

function getSizeCategory(sizeKB) {
  if (sizeKB < 10) return '🟢';
  if (sizeKB < 50) return '🟡';
  if (sizeKB < 100) return '🟠';
  return '🔴';
}

function suggestOptimization(imagePath, currentSizeKB) {
  const filename = path.basename(imagePath);
  const maxWidth = OPTIMIZATION_CONFIG.maxWidth[filename] || OPTIMIZATION_CONFIG.maxWidth.default;
  
  console.log(`   💡 Sugerencia: Redimensionar a máximo ${maxWidth}px de ancho`);
  
  if (currentSizeKB > 200) {
    console.log(`   💡 Sugerencia: Comprimir con calidad ${OPTIMIZATION_CONFIG.quality}%`);
  }
  
  if (filename.includes('icon') && !filename.endsWith('.png')) {
    console.log(`   💡 Sugerencia: Convertir a PNG para iconos`);
  }
  
  console.log('');
}

function generateOptimizationReport() {
  console.log('\n📊 Reporte de Optimización de Imágenes\n');
  console.log('='.repeat(50));
  
  console.log('\n🎯 Recomendaciones Generales:');
  console.log('• Usar WebP para fotos (reducción ~30% vs JPEG)');
  console.log('• Usar PNG solo para iconos y gráficos con transparencia');
  console.log('• Comprimir imágenes con herramientas como TinyPNG');
  console.log('• Implementar lazy loading para imágenes grandes');
  console.log('• Usar múltiples resoluciones (@1x, @2x, @3x)');
  
  console.log('\n📱 Tamaños Recomendados para Móviles:');
  console.log('• Iconos de app: 512x512px máximo');
  console.log('• Splash screens: 400x400px máximo');
  console.log('• Imágenes de contenido: 800px ancho máximo');
  console.log('• Favicons: 64x64px');
  console.log('• Notificaciones: 128x128px');
  
  console.log('\n🔧 Herramientas Recomendadas:');
  console.log('• TinyPNG (tinypng.com) - Compresión automática');
  console.log('• Squoosh (squoosh.app) - Compresión manual avanzada');
  console.log('• ImageOptim (macOS) - Optimización local');
  console.log('• Sharp (Node.js) - Procesamiento programático');
  
  console.log('\n⚡ Impacto en Rendimiento:');
  console.log('• Imágenes optimizadas reducen tiempo de carga inicial');
  console.log('• Menor uso de memoria en dispositivos con pocos recursos');
  console.log('• Mejor experiencia de usuario en conexiones lentas');
  console.log('• Reducción del tamaño del bundle de la app');
}

// Ejecutar análisis
console.log('🚀 Iniciando análisis de optimización de imágenes...\n');
analyzeImageSizes();
generateOptimizationReport();

console.log('\n✅ Análisis completado. Revisa las sugerencias arriba.\n');
