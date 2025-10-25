# NRD Operaciones

Aplicación de gestión de operaciones construida con Expo y React Native.

## 🚀 Deployment en GitHub Pages

Esta aplicación está configurada para desplegarse automáticamente en GitHub Pages usando GitHub Actions.

### Estado del Deployment

La aplicación debería estar disponible en: https://yosbany.github.io/NRDOperaciones

### Configuración Necesaria

Para que el deployment funcione correctamente:

1. **Habilitar GitHub Pages:**
   - Ve a: https://github.com/yosbany/NRDOperaciones/settings/pages
   - En "Source", selecciona: **GitHub Actions**
   - Guarda los cambios

2. **Verificar GitHub Actions:**
   - Ve a: https://github.com/yosbany/NRDOperaciones/actions
   - Verifica que el workflow "Deploy to GitHub Pages" se esté ejecutando
   - Si hay errores, revisa los logs

3. **Permisos de GitHub Actions:**
   - Ve a: https://github.com/yosbany/NRDOperaciones/settings/actions
   - En "Workflow permissions", selecciona: **Read and write permissions**
   - Marca: **Allow GitHub Actions to create and approve pull requests**
   - Guarda los cambios

### Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm start

# Iniciar en web
npm run web

# Build para GitHub Pages
npm run build:github-pages
```

### Estructura del Proyecto

```
NRDOperaciones/
├── app/                    # Rutas de la aplicación
│   ├── (tabs)/            # Tabs de navegación móvil
│   └── web/               # Rutas específicas para web
├── components/            # Componentes reutilizables
│   └── web/              # Componentes específicos para web
├── services/             # Servicios (Firebase, etc.)
├── contexts/             # Contextos de React
└── .github/workflows/    # GitHub Actions
```

### Tecnologías

- **Expo** - Framework de React Native
- **React Native** - UI Framework
- **Firebase** - Backend y autenticación
- **TypeScript** - Lenguaje de programación
- **GitHub Pages** - Hosting estático

### Soporte

Para más información sobre el deployment, consulta:
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [GITHUB_PAGES_SETUP.md](./GITHUB_PAGES_SETUP.md)
