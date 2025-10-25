// Configuración para GitHub Pages
// Este archivo ayuda a configurar rutas y assets para GitHub Pages

const path = require('path');

module.exports = {
  // Configuración base para GitHub Pages
  basePath: process.env.NODE_ENV === 'production' ? '/NRDOperaciones' : '',
  
  // Configuración de assets
  assetPrefix: process.env.NODE_ENV === 'production' ? '/NRDOperaciones' : '',
  
  // Configuración de rutas
  trailingSlash: true,
  
  // Configuración de exportación
  exportPathMap: async function (defaultPathMap) {
    return {
      '/': { page: '/' },
      '/web': { page: '/web' },
      '/web/ordenes': { page: '/web/ordenes' },
      '/web/productos': { page: '/web/productos' },
      '/web/contactos': { page: '/web/contactos' },
      '/web/costos': { page: '/web/costos' },
      '/web/tareas': { page: '/web/tareas' },
    };
  },
  
  // Configuración de imágenes
  images: {
    unoptimized: true
  },
  
  // Configuración de webpack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};
