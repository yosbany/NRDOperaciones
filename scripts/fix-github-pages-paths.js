#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigiendo rutas para GitHub Pages...');

// Función para corregir rutas en un archivo
function fixPathsInFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Corregir rutas que empiezan con / para que sean relativas
  content = content.replace(/src="\/_expo\//g, 'src="./_expo/');
  content = content.replace(/href="\/_expo\//g, 'href="./_expo/');
  content = content.replace(/src="\/assets\//g, 'src="./assets/');
  content = content.replace(/href="\/assets\//g, 'href="./assets/');
  content = content.replace(/url\("\/assets\//g, 'url("./assets/');
  content = content.replace(/href="\/favicon/g, 'href="./favicon');
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Corregido: ${filePath}`);
}

// Función para procesar directorios recursivamente
function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (let entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.html') || entry.name.endsWith('.js'))) {
      fixPathsInFile(fullPath);
    }
  }
}

try {
  // Procesar archivos en la raíz
  const rootFiles = ['index.html', 'ordenes.html', 'productos.html', 'contactos.html', 'costos.html'];
  rootFiles.forEach(file => fixPathsInFile(file));
  
  // Procesar directorios
  processDirectory('./_expo');
  if (fs.existsSync('./assets')) processDirectory('./assets');
  if (fs.existsSync('./web')) processDirectory('./web');
  if (fs.existsSync('./tabs')) processDirectory('./tabs');
  
  console.log('✅ Rutas corregidas exitosamente para GitHub Pages');
} catch (error) {
  console.error('❌ Error corrigiendo rutas:', error);
  process.exit(1);
}
