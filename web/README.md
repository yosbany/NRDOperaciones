# NRD Operaciones - GitHub Pages

Este directorio contiene la documentación web del proyecto NRD Operaciones, diseñada para ser desplegada en GitHub Pages.

## 🚀 Despliegue en GitHub Pages

### Configuración Automática

1. **Habilitar GitHub Pages**:
   - Ve a Settings > Pages en tu repositorio
   - Selecciona "Deploy from a branch"
   - Elige la rama `main` y carpeta `/web`

2. **Acceso a la página**:
   - Tu página estará disponible en: `https://yosbany.github.io/NRDOperaciones/`

### Configuración Manual

Si prefieres configurar manualmente:

```bash
# Clonar el repositorio
git clone https://github.com/yosbany/NRDOperaciones.git
cd NRDOperaciones/web

# Servir localmente para desarrollo
python -m http.server 8000
# o
npx serve .
```

## 📁 Estructura

```
web/
├── index.html          # Página principal
├── README.md          # Este archivo
└── assets/            # Recursos estáticos (opcional)
```

## 🎨 Personalización

La página web está construida con:
- **Bootstrap 5** para el diseño responsivo
- **Font Awesome** para iconos
- **CSS personalizado** para efectos visuales

### Modificar el contenido

Edita `index.html` para:
- Cambiar el texto y descripción
- Actualizar enlaces
- Modificar colores y estilos
- Agregar nuevas secciones

## 🔧 Desarrollo Local

Para desarrollar la página web localmente:

```bash
# Opción 1: Python
python -m http.server 8000

# Opción 2: Node.js
npx serve .

# Opción 3: PHP
php -S localhost:8000
```

Luego visita `http://localhost:8000` en tu navegador.

## 📱 Características de la Página

- ✅ **Diseño responsivo** - Se adapta a móviles, tablets y desktop
- ✅ **SEO optimizado** - Meta tags y estructura semántica
- ✅ **Carga rápida** - CDN para Bootstrap y Font Awesome
- ✅ **Accesible** - Cumple estándares de accesibilidad web
- ✅ **Moderno** - Diseño actual y profesional

## 🔄 Actualizaciones

Para actualizar la página:

1. Modifica los archivos en `/web`
2. Haz commit y push a la rama `main`
3. GitHub Pages se actualizará automáticamente

```bash
git add web/
git commit -m "Update GitHub Pages"
git push origin main
```

## 📞 Soporte

Para problemas con la página web, revisa:
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Bootstrap Documentation](https://getbootstrap.com/docs/)
- [Font Awesome Icons](https://fontawesome.com/icons)
