import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div style={{ marginBottom: '2rem' }}>
          <h5 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            NRD Operaciones
          </h5>
          <p style={{ marginBottom: '1rem', opacity: 0.9 }}>
            Aplicación móvil para la gestión integral de operaciones empresariales.
          </p>
        </div>
        <div className="footer-links">
          <a 
            href="https://github.com/yosbany/NRDOperaciones" 
            className="footer-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            📱 GitHub
          </a>
          <a 
            href="https://expo.dev" 
            className="footer-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            🚀 Expo
          </a>
          <a 
            href="https://reactnative.dev" 
            className="footer-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            ⚛️ React Native
          </a>
        </div>
        <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #444' }} />
        <p style={{ margin: 0, opacity: 0.8 }}>
          &copy; 2025 NRD Operaciones. Desarrollado con ❤️
        </p>
      </div>
    </footer>
  );
};

export default Footer;
