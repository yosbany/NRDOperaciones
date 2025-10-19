import React from 'react';

const Hero: React.FC = () => {
  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1 className="hero-title">NRD Operaciones 📱</h1>
        <p className="hero-subtitle">
          Aplicación móvil para la gestión integral de operaciones empresariales. 
          Desarrollada con React Native y Expo para máxima compatibilidad.
        </p>
        <div className="hero-buttons">
          <a 
            href="https://github.com/yosbany/NRDOperaciones" 
            className="btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            📱 Ver en GitHub
          </a>
          <a href="#features" className="btn-outline">
            ℹ️ Conocer más
          </a>
        </div>
      </div>
    </section>
  );
};

export default Hero;
