# NRD Operaciones - Web Documentation

Esta es la documentación web del proyecto NRD Operaciones, una aplicación React que se despliega en GitHub Pages.

## 🎯 Propósito

Esta aplicación web es **SOLO para documentación** y **NO afecta** la aplicación móvil principal. Es completamente independiente y sirve únicamente para:

- Mostrar información del proyecto
- Proporcionar documentación
- Facilitar la instalación y configuración
- Servir como landing page del repositorio

## 🚀 Despliegue en GitHub Pages

### Configuración Automática

1. **Habilitar GitHub Pages**:
   - Ve a Settings > Pages en tu repositorio
   - Selecciona "Deploy from a branch"
   - Elige la rama `main` y carpeta `/web`

2. **Desplegar automáticamente**:
   ```bash
   cd web
   npm run deploy
   ```

3. **Acceso a la página**:
   - Tu página estará disponible en: `https://yosbany.github.io/NRDOperaciones/`

## 🛠️ Desarrollo Local

```bash
# Navegar al directorio web
cd web

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start

# Construir para producción
npm run build
```

## 📁 Estructura del Proyecto

```
web/
├── public/                 # Archivos estáticos
├── src/
│   ├── components/        # Componentes React
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── Technology.tsx
│   │   ├── Installation.tsx
│   │   └── Footer.tsx
│   ├── pages/            # Páginas de la aplicación
│   │   ├── About.tsx
│   │   └── Contact.tsx
│   ├── App.tsx           # Componente principal
│   ├── App.css           # Estilos globales
│   └── index.tsx         # Punto de entrada
├── package.json          # Dependencias y scripts
└── README.md            # Este archivo
```

## 🔧 Scripts Disponibles

```bash
npm start          # Servidor de desarrollo
npm run build      # Construir para producción
npm run deploy     # Desplegar a GitHub Pages
npm test           # Ejecutar tests
```

## 🎨 Características

- ✅ **React 18** con TypeScript
- ✅ **React Router** para navegación
- ✅ **Diseño responsivo** - Mobile first
- ✅ **CSS personalizado** - Sin dependencias externas
- ✅ **GitHub Pages** - Despliegue automático
- ✅ **SEO optimizado** - Meta tags y estructura semántica

## 🔒 Separación de Proyectos

### Aplicación Móvil (Principal)
- Ubicación: `/` (raíz del repositorio)
- Tecnología: React Native + Expo
- Propósito: Aplicación móvil funcional

### Aplicación Web (Documentación)
- Ubicación: `/web`
- Tecnología: React + TypeScript
- Propósito: Documentación y landing page

**Ambas aplicaciones son completamente independientes y no se afectan entre sí.**

## 📱 Páginas Disponibles

- **Inicio** (`/`) - Landing page con información del proyecto
- **Acerca de** (`/about`) - Información detallada del proyecto
- **Contacto** (`/contact`) - Información de contacto y contribución

## 🔄 Actualizaciones

Para actualizar la documentación web:

```bash
# Hacer cambios en los archivos
# Luego hacer commit y push
git add web/
git commit -m "Update web documentation"
git push origin main

# O desplegar directamente
cd web
npm run deploy
```

## 📞 Soporte

Para problemas con la documentación web:
- Revisa la consola del navegador
- Verifica que GitHub Pages esté habilitado
- Asegúrate de que el build sea exitoso

---

**Nota**: Esta aplicación web es únicamente para documentación y no reemplaza ni afecta la aplicación móvil principal.