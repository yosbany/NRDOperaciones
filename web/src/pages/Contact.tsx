import React from 'react';

const Contact: React.FC = () => {
  return (
    <div className="page-content">
      <h1 className="page-title">Contacto</h1>
      <p className="page-description">
        ¿Tienes preguntas sobre NRD Operaciones? Estamos aquí para ayudarte.
      </p>
      
      <div style={{ textAlign: 'left', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ 
          background: '#f8f9fa', 
          padding: '2rem', 
          borderRadius: '8px', 
          marginBottom: '2rem' 
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#333' }}>
            📱 GitHub Repository
          </h2>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Para reportar bugs, solicitar features o contribuir al proyecto:
          </p>
          <a 
            href="https://github.com/yosbany/NRDOperaciones" 
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#667eea',
              textDecoration: 'none',
              fontWeight: '500'
            }}
          >
            🔗 https://github.com/yosbany/NRDOperaciones
          </a>
        </div>

        <div style={{ 
          background: '#f8f9fa', 
          padding: '2rem', 
          borderRadius: '8px', 
          marginBottom: '2rem' 
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#333' }}>
            🚀 Tecnologías Utilizadas
          </h2>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Esta aplicación web está construida con:
          </p>
          <ul style={{ color: '#666', lineHeight: '1.6' }}>
            <li>React 18 con TypeScript</li>
            <li>React Router para navegación</li>
            <li>CSS personalizado para el diseño</li>
            <li>GitHub Pages para el despliegue</li>
          </ul>
        </div>

        <div style={{ 
          background: '#f8f9fa', 
          padding: '2rem', 
          borderRadius: '8px' 
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#333' }}>
            📋 Cómo Contribuir
          </h2>
          <ol style={{ color: '#666', lineHeight: '1.6' }}>
            <li>Fork el repositorio</li>
            <li>Crea una rama para tu feature</li>
            <li>Haz commit de tus cambios</li>
            <li>Push a la rama</li>
            <li>Abre un Pull Request</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Contact;
