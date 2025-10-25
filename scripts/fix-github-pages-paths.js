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

// Función para agregar CSS de fuentes a los archivos HTML
function addFontsCSS() {
  console.log('🎨 Agregando CSS de fuentes de iconos...');
  
  const fontCSS = `
<style>
/* Fuentes de iconos para GitHub Pages */
@font-face {
  font-family: 'Ionicons';
  src: url('./assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Ionicons';
  src: url('./assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.b4eb097d35f44ed943676fd56f6bdc51.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'FontAwesome';
  src: url('./assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'MaterialIcons';
  src: url('./assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'MaterialCommunityIcons';
  src: url('./assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
</style>`;

  const htmlFiles = ['index.html', 'ordenes.html', 'productos.html', 'contactos.html', 'costos.html'];
  
  htmlFiles.forEach(file => {
    if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      
      // Insertar el CSS antes del cierre de </head>
      content = content.replace('</head>', fontCSS + '\n</head>');
      
      fs.writeFileSync(file, content);
      console.log(`✅ CSS de fuentes agregado a ${file}`);
    }
  });
}

try {
  // Procesar archivos en la raíz
  const rootFiles = ['index.html', 'ordenes.html', 'productos.html', 'contactos.html', 'costos.html'];
  rootFiles.forEach(file => fixPathsInFile(file));
  
  // Agregar CSS de fuentes a los archivos HTML
  addFontsCSS();
  
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
