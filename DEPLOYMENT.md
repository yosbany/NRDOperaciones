# Deployment a GitHub Pages

Esta guía te ayudará a desplegar tu aplicación Expo en GitHub Pages.

## Configuración Inicial

### 1. Habilitar GitHub Pages en tu repositorio

1. Ve a tu repositorio en GitHub
2. Ve a **Settings** → **Pages**
3. En **Source**, selecciona **GitHub Actions**

### 2. Configurar el repositorio

Asegúrate de que tu repositorio tenga la siguiente estructura:

```
.github/
  workflows/
    deploy.yml
scripts/
  build-web.js
```

## Deployment Automático

El deployment se ejecuta automáticamente cuando:

- Haces push a la rama `main`
- Creas un Pull Request hacia `main`

## Deployment Manual

Si quieres hacer un deployment manual:

```bash
# Instalar dependencias
npm install

# Build para GitHub Pages
npm run build:github-pages

# El directorio `dist/` contendrá los archivos listos para GitHub Pages
```

## Configuración de Firebase

Asegúrate de que tu configuración de Firebase esté correcta en:

- `constants/Config.ts`
- `firebase.json`
- `firebase-rules.json`

## Variables de Entorno

Si necesitas variables de entorno, puedes configurarlas en:

1. **GitHub Secrets** (recomendado para producción)
2. **Archivo `.env`** (para desarrollo local)

## Estructura del Build

El build genera:

```
dist/
├── index.html
├── _expo/
├── assets/
├── .nojekyll
└── ...otros archivos estáticos
```

## Solución de Problemas

### Error: "Module not found"
- Verifica que todas las dependencias estén en `package.json`
- Ejecuta `npm install` antes del build

### Error: "Firebase not configured"
- Verifica la configuración en `constants/Config.ts`
- Asegúrate de que las credenciales de Firebase sean correctas

### Error: "404 on refresh"
- Esto es normal en SPAs, GitHub Pages maneja esto automáticamente

## URLs de Acceso

Una vez desplegado, tu aplicación estará disponible en:

```
https://[tu-usuario].github.io/[nombre-del-repositorio]
```

## Comandos Útiles

```bash
# Desarrollo local
npm start
npm run web

# Build local
npm run build:web

# Build para GitHub Pages
npm run build:github-pages
```

## Notas Importantes

1. **Firebase**: Asegúrate de que tu configuración de Firebase permita el dominio de GitHub Pages
2. **CORS**: Configura CORS en Firebase para permitir el dominio de GitHub Pages
3. **Rutas**: Las rutas de la aplicación deben ser compatibles con GitHub Pages
4. **Assets**: Todos los assets se sirven desde la raíz del dominio

## Troubleshooting

### El build falla
- Verifica que no haya errores de TypeScript
- Ejecuta `npm run lint` para verificar el código
- Revisa los logs de GitHub Actions

### La aplicación no carga
- Verifica la configuración de Firebase
- Revisa la consola del navegador para errores
- Asegúrate de que todas las rutas estén correctas
