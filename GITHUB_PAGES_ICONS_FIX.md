# 🔧 Solución para Iconos en GitHub Pages

## Problema Identificado

Los iconos de `@expo/vector-icons` no se muestran en GitHub Pages debido a:

1. **Rutas incorrectas**: Las fuentes no se copian correctamente al build
2. **Configuración de Expo**: Expo no incluye automáticamente las fuentes en el build web
3. **Rutas absolutas vs relativas**: GitHub Pages requiere rutas relativas

## Solución Implementada

### 1. Script de Copia de Fuentes (`scripts/copy-icon-fonts.js`)
- Copia las fuentes desde `node_modules` o las descarga desde CDN
- Crea un archivo CSS con las rutas correctas
- Incluye fallbacks con emojis Unicode

### 2. Script de Deploy Mejorado (`scripts/deploy-github-pages.js`)
- Ejecuta todo el proceso de build y corrección
- Copia las fuentes al directorio `dist`
- Corrige las rutas para GitHub Pages

### 3. Configuración de Webpack (`webpack.config.js`)
- Configura la copia automática de fuentes
- Establece las rutas correctas para los assets

## Cómo Usar

### Despliegue Completo (Recomendado)
```bash
npm run deploy:web
```

### Pasos Manuales
```bash
# 1. Copiar fuentes
node scripts/copy-icon-fonts.js

# 2. Build de Expo
npm run build:web

# 3. Corregir rutas
node scripts/fix-github-pages-paths.js

# 4. Copiar a raíz
node scripts/copy-dist-to-root.js
```

## Archivos Modificados

- `scripts/copy-icon-fonts.js` - Nuevo script para copiar fuentes
- `scripts/deploy-github-pages.js` - Script de deploy mejorado
- `scripts/fix-github-pages-paths.js` - Actualizado para usar fuentes locales
- `scripts/build-web.js` - Incluye copia de fuentes
- `webpack.config.js` - Configuración para incluir fuentes
- `package.json` - Nuevas dependencias y scripts

## Verificación

Después del deploy, verifica que:

1. Los archivos de fuentes estén en `assets/fonts/`
2. El CSS incluya las rutas correctas a las fuentes
3. Los iconos se muestren correctamente en GitHub Pages

## Fallbacks

Si las fuentes no se cargan, el sistema incluye:
- Emojis Unicode como fallback
- CDN como respaldo
- Estilos CSS alternativos

## Troubleshooting

Si los iconos siguen sin aparecer:

1. Verifica que las fuentes estén en `assets/fonts/`
2. Revisa la consola del navegador para errores 404
3. Asegúrate de que las rutas sean relativas (no absolutas)
4. Limpia la caché del navegador
