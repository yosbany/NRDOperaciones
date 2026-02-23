#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
  
  // Corregir rutas específicas de fuentes
  content = content.replace(/url\("\/assets\/assets\/fonts\//g, 'url("./assets/fonts/');
  content = content.replace(/href="\/assets\/assets\/fonts\//g, 'href="./assets/fonts/');
  content = content.replace(/src="\/assets\/assets\/fonts\//g, 'src="./assets/fonts/');
  
  fs.writeFileSync(filePath, content);
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
  // Leer CSS de fuentes si existe
  let fontCSS = '';
  if (fs.existsSync('./assets/fonts.css')) {
    fontCSS = `<style>${fs.readFileSync('./assets/fonts.css', 'utf8')}</style>`;
  } else {
    // Fallback con CDN
    fontCSS = `
<style>
/* Fuentes de iconos para GitHub Pages - Usando CDN como fallback */
@font-face {
  font-family: 'Ionicons';
  src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.0.3/Fonts/Ionicons.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'FontAwesome';
  src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.0.3/Fonts/FontAwesome.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'MaterialIcons';
  src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.0.3/Fonts/MaterialIcons.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'MaterialCommunityIcons';
  src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.0.3/Fonts/MaterialCommunityIcons.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

/* Fallback para iconos usando Unicode */
.icon-fallback {
  font-family: 'Arial', sans-serif;
  font-size: 20px;
  color: currentColor;
}

.icon-home::before { content: '🏠'; }
.icon-list::before { content: '📋'; }
.icon-cube::before { content: '📦'; }
.icon-calculator::before { content: '🧮'; }
.icon-people::before { content: '👥'; }
</style>`;
  }

  const htmlFiles = ['index.html', 'ordenes.html', 'productos.html', 'contactos.html'];
  
  htmlFiles.forEach(file => {
    if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      
      // Insertar el CSS antes del cierre de </head>
      content = content.replace('</head>', fontCSS + '\n</head>');
      
      fs.writeFileSync(file, content);
    }
  });
}

try {
  // Procesar archivos en la raíz
  const rootFiles = ['index.html', 'ordenes.html', 'productos.html', 'contactos.html'];
  rootFiles.forEach(file => fixPathsInFile(file));
  
  // Agregar CSS de fuentes a los archivos HTML
  addFontsCSS();
  
  // Procesar directorios
  processDirectory('./_expo');
  if (fs.existsSync('./assets')) processDirectory('./assets');
  if (fs.existsSync('./web')) processDirectory('./web');
  if (fs.existsSync('./tabs')) processDirectory('./tabs');
} catch (error) {
  console.error('❌ Error corrigiendo rutas:', error);
  process.exit(1);
}
