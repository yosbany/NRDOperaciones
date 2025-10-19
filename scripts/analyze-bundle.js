#!/usr/bin/env node

/**
 * Script para analizar el tamaño del bundle y identificar optimizaciones
 */

const fs = require('fs');
const path = require('path');

function analyzeDependencies() {
  console.log('📦 Analizando dependencias del proyecto...\n');
  
  const packagePath = path.join(__dirname, '../package.json');
  const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const dependencies = packageData.dependencies || {};
  const devDependencies = packageData.devDependencies || {};
  
  console.log('🔍 Dependencias de producción:');
  console.log('='.repeat(40));
  
  const heavyDependencies = [];
  const potentiallyUnused = [];
  const optimizationCandidates = [];
  
  Object.entries(dependencies).forEach(([name, version]) => {
    const category = categorizeDependency(name);
    const size = estimateSize(name);
    const alternatives = getAlternatives(name);
    
    console.log(`${category.icon} ${name}@${version} (~${size})`);
    
    if (size > 500) {
      heavyDependencies.push({ name, size, alternatives });
    }
    
    if (category.potentially_unused) {
      potentiallyUnused.push(name);
    }
    
    if (alternatives.length > 0) {
      optimizationCandidates.push({ name, alternatives });
    }
  });
  
  console.log('\n🛠️  Dependencias de desarrollo:');
  console.log('='.repeat(40));
  
  Object.entries(devDependencies).forEach(([name, version]) => {
    const category = categorizeDependency(name);
    console.log(`${category.icon} ${name}@${version}`);
  });
  
  generateOptimizationReport(heavyDependencies, potentiallyUnused, optimizationCandidates);
}

function categorizeDependency(name) {
  const categories = {
    // Core React Native / Expo
    'expo': { icon: '⚛️ ', type: 'core', potentially_unused: false },
    'react': { icon: '⚛️ ', type: 'core', potentially_unused: false },
    'react-native': { icon: '📱', type: 'core', potentially_unused: false },
    
    // Navigation
    '@react-navigation': { icon: '🧭', type: 'navigation', potentially_unused: false },
    'expo-router': { icon: '🧭', type: 'navigation', potentially_unused: false },
    
    // UI Components
    '@expo/vector-icons': { icon: '🎨', type: 'ui', potentially_unused: false },
    'react-native-gesture-handler': { icon: '👆', type: 'ui', potentially_unused: false },
    'react-native-reanimated': { icon: '✨', type: 'animation', potentially_unused: true },
    'react-native-screens': { icon: '📱', type: 'ui', potentially_unused: false },
    
    // Firebase
    'firebase': { icon: '🔥', type: 'backend', potentially_unused: false },
    '@react-native-firebase': { icon: '🔥', type: 'backend', potentially_unused: false },
    
    // Storage
    '@react-native-async-storage': { icon: '💾', type: 'storage', potentially_unused: false },
    
    // UI Utilities
    'react-native-safe-area-context': { icon: '📱', type: 'ui', potentially_unused: false },
    'expo-status-bar': { icon: '📱', type: 'ui', potentially_unused: false },
    
    // Heavy libraries that might be optimized
    'react-native-webview': { icon: '🌐', type: 'heavy', potentially_unused: true },
    'react-native-draggable-flatlist': { icon: '📋', type: 'ui', potentially_unused: true },
    'expo-notifications': { icon: '🔔', type: 'feature', potentially_unused: false },
    
    // Potentially unused
    'expo-blur': { icon: '🌫️ ', type: 'ui', potentially_unused: true },
    'expo-haptics': { icon: '📳', type: 'feature', potentially_unused: true },
    'expo-symbols': { icon: '🔣', type: 'ui', potentially_unused: true },
    'expo-web-browser': { icon: '🌐', type: 'feature', potentially_unused: true },
    'react-native-worklets': { icon: '⚡', type: 'performance', potentially_unused: true },
  };
  
  // Buscar por coincidencia parcial
  for (const [key, category] of Object.entries(categories)) {
    if (name.includes(key)) {
      return category;
    }
  }
  
  return { icon: '📦', type: 'other', potentially_unused: false };
}

function estimateSize(name) {
  // Estimaciones aproximadas en KB basadas en bundlephobia.com
  const sizeEstimates = {
    'react-native-reanimated': 800,
    'react-native-gesture-handler': 400,
    'firebase': 600,
    '@react-native-firebase/app': 300,
    '@react-native-firebase/messaging': 200,
    'react-native-webview': 500,
    'expo-notifications': 300,
    'react-native-draggable-flatlist': 150,
    '@expo/vector-icons': 2000, // Muy pesado por los iconos
    'expo-image': 200,
    'react-native-screens': 100,
    'expo-blur': 100,
    'expo-router': 200,
    '@react-navigation/native': 150,
    '@react-navigation/bottom-tabs': 100,
  };
  
  return sizeEstimates[name] || 50;
}

function getAlternatives(name) {
  const alternatives = {
    '@expo/vector-icons': [
      'react-native-vector-icons (más ligero)',
      'Usar solo iconos necesarios con tree-shaking'
    ],
    'react-native-reanimated': [
      'Usar Animated API nativo para animaciones simples',
      'Evaluar si todas las animaciones son necesarias'
    ],
    'react-native-webview': [
      'Usar expo-web-browser para enlaces externos',
      'Evaluar si WebView es realmente necesario'
    ],
    'react-native-draggable-flatlist': [
      'Implementar drag & drop básico manualmente',
      'Usar solo si la funcionalidad es crítica'
    ],
    'expo-blur': [
      'Usar efectos CSS alternativos',
      'Evaluar si el blur es esencial para UX'
    ]
  };
  
  return alternatives[name] || [];
}

function generateOptimizationReport(heavyDependencies, potentiallyUnused, optimizationCandidates) {
  console.log('\n📊 Reporte de Optimización del Bundle\n');
  console.log('='.repeat(50));
  
  if (heavyDependencies.length > 0) {
    console.log('\n🔴 Dependencias Pesadas (>500KB):');
    heavyDependencies.forEach(dep => {
      console.log(`• ${dep.name} (~${dep.size}KB)`);
      if (dep.alternatives.length > 0) {
        dep.alternatives.forEach(alt => console.log(`  💡 ${alt}`));
      }
    });
  }
  
  if (potentiallyUnused.length > 0) {
    console.log('\n🟡 Dependencias Potencialmente No Utilizadas:');
    potentiallyUnused.forEach(dep => {
      console.log(`• ${dep} - Revisar si se está usando realmente`);
    });
  }
  
  console.log('\n🎯 Recomendaciones de Optimización:');
  console.log('1. 📱 Lazy Loading:');
  console.log('   • Cargar componentes pesados solo cuando se necesiten');
  console.log('   • Usar React.lazy() para componentes de rutas');
  
  console.log('\n2. 🌳 Tree Shaking:');
  console.log('   • Importar solo funciones específicas de librerías grandes');
  console.log('   • Ejemplo: import { specific } from "library" en lugar de import * as library');
  
  console.log('\n3. 📦 Bundle Splitting:');
  console.log('   • Separar código de vendor del código de la app');
  console.log('   • Usar dynamic imports para código condicional');
  
  console.log('\n4. 🔍 Análisis Detallado:');
  console.log('   • Usar herramientas como @expo/webpack-config para análisis');
  console.log('   • Revisar el metro.config.js para optimizaciones específicas');
  
  console.log('\n5. 🚀 Alternativas Ligeras:');
  optimizationCandidates.forEach(candidate => {
    console.log(`   • ${candidate.name}:`);
    candidate.alternatives.forEach(alt => console.log(`     - ${alt}`));
  });
  
  const totalEstimatedSize = heavyDependencies.reduce((sum, dep) => sum + dep.size, 0);
  console.log(`\n📊 Tamaño estimado de dependencias pesadas: ~${totalEstimatedSize}KB`);
  console.log('💡 Optimización potencial: 20-40% de reducción con las mejoras sugeridas');
}

function analyzeProjectStructure() {
  console.log('\n🏗️  Analizando estructura del proyecto...\n');
  
  const srcPaths = [
    'app',
    'components', 
    'services',
    'hooks',
    'utils',
    'constants'
  ];
  
  srcPaths.forEach(pathName => {
    const fullPath = path.join(__dirname, '..', pathName);
    if (fs.existsSync(fullPath)) {
      const fileCount = countFiles(fullPath);
      const sizeKB = Math.round(getDirectorySize(fullPath) / 1024);
      console.log(`📁 ${pathName}/: ${fileCount} archivos, ~${sizeKB}KB`);
    }
  });
}

function countFiles(dir) {
  let count = 0;
  try {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        count += countFiles(fullPath);
      } else {
        count++;
      }
    });
  } catch (error) {
    // Ignorar errores de permisos
  }
  return count;
}

function getDirectorySize(dir) {
  let size = 0;
  try {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        size += getDirectorySize(fullPath);
      } else {
        size += stat.size;
      }
    });
  } catch (error) {
    // Ignorar errores de permisos
  }
  return size;
}

// Ejecutar análisis
console.log('🚀 Iniciando análisis del bundle...\n');
analyzeDependencies();
analyzeProjectStructure();

console.log('\n✅ Análisis completado. Revisa las recomendaciones para optimizar el bundle.\n');
