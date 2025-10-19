import React from 'react';

const Installation: React.FC = () => {
  return (
    <section className="install-section">
      <div className="hero-content">
        <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
          Instalación Rápida
        </h2>
        <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem' }}>
          Pasos para configurar el proyecto en tu entorno local
        </p>
        <div className="code-block">
          <pre>{`# Clonar el repositorio
git clone https://github.com/yosbany/NRDOperaciones.git
cd NRDOperaciones

# Instalar dependencias
npm install

# Iniciar la aplicación
npx expo start`}</pre>
        </div>
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#333' }}>
            Requisitos Previos
          </h3>
          <ul style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto', color: '#666' }}>
            <li>Node.js (versión 18 o superior)</li>
            <li>npm o yarn</li>
            <li>Expo CLI</li>
            <li>Cuenta de Firebase (para funcionalidades completas)</li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default Installation;
