# 🚀 Configuración de GitHub Pages para NRD Operaciones

## ✅ Lo que ya está configurado

Tu aplicación Expo ya está configurada para GitHub Pages con:

- ✅ Scripts de build en `package.json`
- ✅ Workflow de GitHub Actions en `.github/workflows/deploy.yml`
- ✅ Configuración de Expo para web estático
- ✅ Archivo `.nojekyll` para GitHub Pages
- ✅ Scripts de deployment automatizado

## 🎯 Pasos para deployar

### 1. Configurar GitHub Pages en tu repositorio

1. Ve a tu repositorio en GitHub
2. Ve a **Settings** → **Pages**
3. En **Source**, selecciona **GitHub Actions**
4. Guarda los cambios

### 2. Hacer el primer deployment

```bash
# Opción 1: Deployment automático (recomendado)
git add .
git commit -m "Setup GitHub Pages deployment"
git push origin main

# Opción 2: Deployment manual
npm run build:github-pages
# Luego subir el directorio dist/ a la rama gh-pages
```

### 3. Verificar el deployment

Una vez configurado, tu aplicación estará disponible en:
```
https://[tu-usuario].github.io/NRDOperaciones
```

## 🔧 Comandos disponibles

```bash
# Desarrollo local
npm start
npm run web

# Build para GitHub Pages
npm run build:github-pages

# Build completo con script personalizado
npm run build:web

# Deployment automatizado
./scripts/deploy-github-pages.sh
```

## 📁 Estructura del proyecto

```
NRDOperaciones/
├── .github/workflows/deploy.yml    # GitHub Actions
├── scripts/
│   ├── build-web.js               # Script de build
│   └── deploy-github-pages.sh     # Script de deployment
├── dist/                          # Build output (generado)
├── app/                           # Código de la aplicación
├── components/                    # Componentes React
├── services/                      # Servicios Firebase
└── package.json                   # Scripts y dependencias
```

## 🔥 Configuración de Firebase

Asegúrate de que tu configuración de Firebase permita el dominio de GitHub Pages:

1. Ve a Firebase Console → Authentication → Settings → Authorized domains
2. Agrega: `[tu-usuario].github.io`
3. Ve a Firebase Console → Hosting → Add custom domain (opcional)

## 🐛 Solución de problemas

### Error: "Module not found"
```bash
npm install
npm run build:github-pages
```

### Error: "Firebase not configured"
- Verifica `constants/Config.ts`
- Asegúrate de que las credenciales sean correctas

### Error: "404 on refresh"
- Esto es normal en SPAs
- GitHub Pages maneja esto automáticamente

### El build falla
```bash
# Limpiar cache
npx expo start --clear
npm run build:github-pages
```

## 📊 Monitoreo del deployment

1. Ve a tu repositorio → **Actions**
2. Verifica que el workflow "Deploy to GitHub Pages" se ejecute
3. Revisa los logs si hay errores

## 🎉 ¡Listo!

Tu aplicación Expo está configurada para GitHub Pages. Solo necesitas:

1. Hacer push a la rama `main`
2. Esperar a que GitHub Actions haga el deployment
3. Visitar tu aplicación en GitHub Pages

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs de GitHub Actions
2. Verifica la configuración de Firebase
3. Asegúrate de que todas las dependencias estén instaladas
