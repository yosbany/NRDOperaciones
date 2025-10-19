import React from 'react';

const Technology: React.FC = () => {
  const technologies = [
    'React Native',
    'Expo',
    'TypeScript',
    'Firebase',
    'React Navigation',
    'Expo Notifications'
  ];

  return (
    <section className="tech-section">
      <div className="hero-content">
        <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
          Stack Tecnológico
        </h2>
        <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem' }}>
          Tecnologías modernas para un desarrollo robusto
        </p>
        <div className="tech-badges">
          {technologies.map((tech, index) => (
            <span key={index} className="tech-badge">
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Technology;
