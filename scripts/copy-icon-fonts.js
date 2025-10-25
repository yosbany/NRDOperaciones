#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📦 Copiando fuentes de iconos para GitHub Pages...');

// Función para copiar archivos
function copyFile(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`⚠️  Archivo no encontrado: ${src}`);
    return false;
  }
  
  // Crear directorio de destino si no existe
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  try {
    fs.copyFileSync(src, dest);
    console.log(`✅ Copiado: ${src} -> ${dest}`);
    return true;
  } catch (error) {
    console.error(`❌ Error copiando ${src}:`, error.message);
    return false;
  }
}

// Función para copiar directorio recursivamente
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`⚠️  Directorio no encontrado: ${src}`);
    return;
  }
  
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
      copyFile(srcPath, destPath);
    }
  }
}

// Función para descargar fuentes desde CDN como fallback
function downloadFontFromCDN(fontName, url, destPath) {
  const https = require('https');
  const file = fs.createWriteStream(destPath);
  
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ Descargado: ${fontName} desde CDN`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {}); // Eliminar archivo parcial
      console.log(`⚠️  No se pudo descargar ${fontName}: ${err.message}`);
      reject(err);
    });
  });
}

async function copyIconFonts() {
  const sourceDir = './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts';
  const destDir = './assets/fonts';
  
  // Crear directorio de destino
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Preservar SpaceMono-Regular.ttf si existe
  const spaceMonoPath = path.join(destDir, 'SpaceMono-Regular.ttf');
  let spaceMonoExists = false;
  if (fs.existsSync(spaceMonoPath)) {
    spaceMonoExists = true;
    console.log('📁 Preservando SpaceMono-Regular.ttf existente');
  }
  
  // Intentar copiar desde node_modules
  if (fs.existsSync(sourceDir)) {
    console.log('📁 Copiando fuentes desde node_modules...');
    copyDir(sourceDir, destDir);
    
    // Restaurar SpaceMono si existía antes
    if (spaceMonoExists) {
      const spaceMonoSource = path.join('./assets/assets/fonts', 'SpaceMono-Regular.49a79d66bdea2debf1832bf4d7aca127.ttf');
      if (fs.existsSync(spaceMonoSource)) {
        fs.copyFileSync(spaceMonoSource, spaceMonoPath);
        console.log('✅ SpaceMono-Regular.ttf restaurado');
      }
    }
  } else {
    console.log('⚠️  node_modules no encontrado, descargando desde CDN...');
    
    // Descargar fuentes principales desde CDN
    const fonts = [
      { name: 'Ionicons.ttf', url: 'https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.0.3/Fonts/Ionicons.ttf' },
      { name: 'FontAwesome.ttf', url: 'https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.0.3/Fonts/FontAwesome.ttf' },
      { name: 'MaterialIcons.ttf', url: 'https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.0.3/Fonts/MaterialIcons.ttf' },
      { name: 'MaterialCommunityIcons.ttf', url: 'https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.0.3/Fonts/MaterialCommunityIcons.ttf' }
    ];
    
    for (const font of fonts) {
      try {
        await downloadFontFromCDN(font.name, font.url, path.join(destDir, font.name));
      } catch (error) {
        console.log(`⚠️  No se pudo descargar ${font.name}, se usará fallback`);
      }
    }
  }
  
  // Crear archivo CSS con las fuentes
  const cssContent = `
/* Fuentes de iconos para GitHub Pages */
@font-face {
  font-family: 'Ionicons';
  src: url('./assets/fonts/Ionicons.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'FontAwesome';
  src: url('./assets/fonts/FontAwesome.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'MaterialIcons';
  src: url('./assets/fonts/MaterialIcons.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'MaterialCommunityIcons';
  src: url('./assets/fonts/MaterialCommunityIcons.ttf') format('truetype');
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
`;

  fs.writeFileSync('./assets/fonts.css', cssContent);
  console.log('✅ Archivo CSS de fuentes creado');
}

// Ejecutar
try {
  copyIconFonts();
  console.log('✅ Fuentes de iconos copiadas exitosamente');
} catch (error) {
  console.error('❌ Error copiando fuentes:', error);
  process.exit(1);
}
