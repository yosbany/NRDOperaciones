#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Expo web app for GitHub Pages...');

try {
  // Limpiar build anterior si existe
  if (fs.existsSync('dist')) {
    console.log('🧹 Cleaning previous build...');
    fs.rmSync('dist', { recursive: true, force: true });
  }

  // Crear directorio dist
  fs.mkdirSync('dist', { recursive: true });

  // Build de Expo para web
  console.log('📦 Building Expo web app...');
  execSync('npx expo export --platform web --output-dir dist', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });

  // Crear archivo .nojekyll para GitHub Pages
  console.log('📝 Creating .nojekyll file...');
  fs.writeFileSync('dist/.nojekyll', '');

  // Copiar fuentes de iconos
  console.log('📦 Copying icon fonts...');
  execSync('node scripts/copy-icon-fonts.js', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });

  // Crear index.html personalizado si es necesario
  console.log('📄 Creating index.html...');
  const indexPath = path.join('dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Asegurar que las rutas sean relativas para GitHub Pages
    indexContent = indexContent.replace(/src="\//g, 'src="./');
    indexContent = indexContent.replace(/href="\//g, 'href="./');
    
    fs.writeFileSync(indexPath, indexContent);
  }

  console.log('✅ Build completed successfully!');
  console.log('📁 Output directory: dist/');
  console.log('🌐 Ready for GitHub Pages deployment!');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
