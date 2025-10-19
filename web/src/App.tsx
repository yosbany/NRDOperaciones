import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';

console.log('🚀 App.tsx cargado');

// Componente simple de prueba
const TestComponent: React.FC = () => {
  console.log('🚀 TestComponent renderizado');
  return (
    <div style={{
      padding: '2rem',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div>
        <h1>🚀 NRD Operaciones</h1>
        <p>¡Aplicación React funcionando correctamente!</p>
        <div style={{ marginTop: '2rem' }}>
          <button 
            onClick={() => alert('¡JavaScript funcionando!')}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Probar JavaScript
          </button>
        </div>
        <div style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
          <p>Si ves esta página, React está funcionando correctamente.</p>
          <p>Revisa la consola del navegador para ver los logs.</p>
        </div>
      </div>
    </div>
  );
};

function App() {
  console.log('🚀 App function ejecutada');
  
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<TestComponent />} />
          <Route path="/test" element={<TestComponent />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;