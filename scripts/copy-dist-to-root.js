#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Copiando archivos de dist/ a la raíz para GitHub Pages...');

// Función para copiar directorios recursivamente
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Función para copiar fuentes de iconos
function copyIconFonts() {
  console.log('📦 Copiando fuentes de iconos...');
  
  const sourceDir = './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts';
  const destDir = './assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts';
  
  if (fs.existsSync(sourceDir)) {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    copyDir(sourceDir, destDir);
    console.log('✅ Fuentes de iconos copiadas');
  } else {
    console.log('⚠️  No se encontraron fuentes de iconos en node_modules');
  }
}

// Copiar todo el contenido de dist/ a la raíz
try {
  copyDir('./dist', './');
  console.log('✅ Archivos copiados exitosamente a la raíz');
  
  // Copiar fuentes de iconos desde node_modules
  copyIconFonts();
} catch (error) {
  console.error('❌ Error copiando archivos:', error);
  process.exit(1);
}
