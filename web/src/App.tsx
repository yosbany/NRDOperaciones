import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';

console.log('🚀 App.tsx cargado');

// Componente de login simple
const LoginForm: React.FC = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Login con: ${email}`);
  };

  return (
    <div style={{
      background: 'white',
      padding: '2rem',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      maxWidth: '400px',
      width: '100%'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#333' }}>
        Iniciar Sesión
      </h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Email:
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Contraseña:
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          />
        </div>
        <button
          type="submit"
          style={{
            width: '100%',
            background: '#667eea',
            color: 'white',
            border: 'none',
            padding: '0.75rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Iniciar Sesión
        </button>
      </form>
      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        background: '#f8f9fa',
        borderRadius: '4px',
        fontSize: '0.9rem',
        color: '#666'
      }}>
        <strong>Usuarios de prueba:</strong><br />
        • admin@nrd.com / admin123<br />
        • productor@nrd.com / productor123
      </div>
    </div>
  );
};

// Componente de dashboard simple
const Dashboard: React.FC = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#333', marginBottom: '2rem' }}>Dashboard</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#333', marginBottom: '0.5rem' }}>Órdenes</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>12</div>
          <p style={{ color: '#666', margin: 0 }}>Órdenes activas</p>
        </div>
        
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#333', marginBottom: '0.5rem' }}>Tareas</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>8</div>
          <p style={{ color: '#666', margin: 0 }}>Tareas pendientes</p>
        </div>
        
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#333', marginBottom: '0.5rem' }}>Productos</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc107' }}>45</div>
          <p style={{ color: '#666', margin: 0 }}>Productos activos</p>
        </div>
      </div>
      
      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ color: '#333', marginBottom: '1rem' }}>Funcionalidades Disponibles</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '4px' }}>
            <strong>📋 Órdenes</strong><br />
            <small>Gestionar órdenes de trabajo</small>
          </div>
          <div style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '4px' }}>
            <strong>✅ Tareas</strong><br />
            <small>Crear y gestionar tareas</small>
          </div>
          <div style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '4px' }}>
            <strong>📦 Productos</strong><br />
            <small>Catálogo de productos</small>
          </div>
          <div style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '4px' }}>
            <strong>👥 Contactos</strong><br />
            <small>Base de datos de contactos</small>
          </div>
        </div>
      </div>
    </div>
  );
};

// Navegación simple
const Navigation: React.FC = () => {
  return (
    <nav style={{
      background: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      padding: '1rem 0',
      marginBottom: '2rem'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea' }}>
          NRD Operaciones 📱
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href="/" style={{ textDecoration: 'none', color: '#333' }}>Dashboard</a>
          <a href="/ordenes" style={{ textDecoration: 'none', color: '#333' }}>Órdenes</a>
          <a href="/tareas" style={{ textDecoration: 'none', color: '#333' }}>Tareas</a>
          <a href="/productos" style={{ textDecoration: 'none', color: '#333' }}>Productos</a>
        </div>
      </div>
    </nav>
  );
};

function App() {
  console.log('🚀 App function ejecutada');
  
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={
            <div style={{ 
              minHeight: '100vh', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem'
            }}>
              <LoginForm />
            </div>
          } />
          <Route path="/dashboard" element={
            <>
              <Navigation />
              <Dashboard />
            </>
          } />
          <Route path="/ordenes" element={
            <>
              <Navigation />
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h1>Órdenes</h1>
                <p>Gestión de órdenes de trabajo</p>
              </div>
            </>
          } />
          <Route path="/tareas" element={
            <>
              <Navigation />
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h1>Tareas</h1>
                <p>Gestión de tareas</p>
              </div>
            </>
          } />
          <Route path="/productos" element={
            <>
              <Navigation />
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h1>Productos</h1>
                <p>Catálogo de productos</p>
              </div>
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;