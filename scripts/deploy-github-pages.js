#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Desplegando a GitHub Pages con corrección de iconos...');

try {
  // 1. Limpiar build anterior
  console.log('🧹 Limpiando build anterior...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  if (fs.existsSync('assets/fonts')) {
    fs.rmSync('assets/fonts', { recursive: true, force: true });
  }

  // 2. Instalar dependencias si es necesario
  console.log('📦 Verificando dependencias...');
  try {
    execSync('npm install', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️  Error instalando dependencias, continuando...');
  }

  // 3. Copiar fuentes de iconos
  console.log('📦 Copiando fuentes de iconos...');
  execSync('node scripts/copy-icon-fonts.js', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });

  // 4. Build de Expo para web
  console.log('📦 Building Expo web app...');
  execSync('npx expo export --platform web --output-dir dist', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });

  // 5. Crear archivo .nojekyll
  console.log('📝 Creating .nojekyll file...');
  fs.writeFileSync('dist/.nojekyll', '');

  // 6. Copiar fuentes al directorio dist
  console.log('📁 Copiando fuentes al directorio dist...');
  if (fs.existsSync('assets/fonts')) {
    const destFontsDir = path.join('dist', 'assets', 'fonts');
    if (!fs.existsSync(destFontsDir)) {
      fs.mkdirSync(destFontsDir, { recursive: true });
    }
    
    const fontFiles = fs.readdirSync('assets/fonts');
    fontFiles.forEach(file => {
      if (file.endsWith('.ttf')) {
        fs.copyFileSync(
          path.join('assets/fonts', file),
          path.join(destFontsDir, file)
        );
        console.log(`✅ Copiado: ${file}`);
      }
    });
  }

  // 7. Corregir rutas para GitHub Pages
  console.log('🔧 Corrigiendo rutas para GitHub Pages...');
  execSync('node scripts/fix-github-pages-paths.js', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });

  // 8. Copiar archivos a la raíz
  console.log('🔄 Copiando archivos a la raíz...');
  execSync('node scripts/copy-dist-to-root.js', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });

  console.log('✅ Despliegue completado exitosamente!');
  console.log('📁 Archivos listos en la raíz del proyecto');
  console.log('🌐 Listo para commit y push a GitHub Pages');

} catch (error) {
  console.error('❌ Error en el despliegue:', error.message);
  process.exit(1);
}
