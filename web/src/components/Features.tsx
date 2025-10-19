import React from 'react';

const Features: React.FC = () => {
  const features = [
    {
      icon: '📋',
      title: 'Gestión de Órdenes',
      description: 'Crear, editar y gestionar órdenes de trabajo de manera eficiente.'
    },
    {
      icon: '📦',
      title: 'Control de Productos',
      description: 'Administración completa del catálogo de productos y servicios.'
    },
    {
      icon: '👥',
      title: 'Gestión de Contactos',
      description: 'Base de datos centralizada de contactos y clientes.'
    },
    {
      icon: '📊',
      title: 'Control de Costos',
      description: 'Seguimiento y análisis detallado de costos operativos.'
    }
  ];

  return (
    <section id="features" className="features-section">
      <div className="hero-content">
        <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
          Características Principales
        </h2>
        <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '3rem' }}>
          Funcionalidades diseñadas para optimizar la gestión operativa
        </p>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
