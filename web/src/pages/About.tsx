import React from 'react';

const About: React.FC = () => {
  return (
    <div className="page-content">
      <h1 className="page-title">Acerca de NRD Operaciones</h1>
      <p className="page-description">
        NRD Operaciones es una aplicación móvil desarrollada para optimizar la gestión 
        de operaciones empresariales. Diseñada con las mejores prácticas de desarrollo 
        móvil moderno.
      </p>
      
      <div style={{ textAlign: 'left', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '600', marginBottom: '1rem', color: '#333' }}>
          ¿Por qué NRD Operaciones?
        </h2>
        <ul style={{ marginBottom: '2rem', color: '#666', lineHeight: '1.6' }}>
          <li>Gestión centralizada de todas las operaciones</li>
          <li>Interfaz intuitiva y fácil de usar</li>
          <li>Funciona offline y se sincroniza automáticamente</li>
          <li>Notificaciones push para mantenerte informado</li>
          <li>Compatible con Android e iOS</li>
        </ul>

        <h2 style={{ fontSize: '1.8rem', fontWeight: '600', marginBottom: '1rem', color: '#333' }}>
          Características Técnicas
        </h2>
        <ul style={{ marginBottom: '2rem', color: '#666', lineHeight: '1.6' }}>
          <li>Desarrollada con React Native y Expo</li>
          <li>Backend con Firebase Realtime Database</li>
          <li>Autenticación segura con Firebase Auth</li>
          <li>Notificaciones push con Expo Notifications</li>
          <li>Navegación con React Navigation</li>
          <li>Tipado estático con TypeScript</li>
        </ul>

        <h2 style={{ fontSize: '1.8rem', fontWeight: '600', marginBottom: '1rem', color: '#333' }}>
          Desarrollo
        </h2>
        <p style={{ color: '#666', lineHeight: '1.6', marginBottom: '2rem' }}>
          Esta aplicación está en desarrollo activo. Si encuentras algún problema o tienes 
          sugerencias, no dudes en crear un issue en el repositorio de GitHub.
        </p>
      </div>
    </div>
  );
};

export default About;
