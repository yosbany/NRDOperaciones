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

// Copiar todo el contenido de dist/ a la raíz
try {
  copyDir('./dist', './');
  console.log('✅ Archivos copiados exitosamente a la raíz');
} catch (error) {
  console.error('❌ Error copiando archivos:', error);
  process.exit(1);
}
