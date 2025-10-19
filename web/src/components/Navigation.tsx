import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (!user) {
    return null;
  }

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/ordenes', label: 'Órdenes', icon: '📋' },
    { path: '/tareas', label: 'Tareas', icon: '✅' },
  ];

  // Solo mostrar estas opciones a administradores
  if (user.role === 'ADMIN') {
    navItems.push(
      { path: '/productos', label: 'Productos', icon: '📦' },
      { path: '/contactos', label: 'Contactos', icon: '👥' },
      { path: '/costos', label: 'Costos', icon: '💰' }
    );
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link 
            to="/" 
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#667eea',
              textDecoration: 'none'
            }}
          >
            NRD Operaciones 📱
          </Link>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  color: location.pathname === item.path ? '#667eea' : '#666',
                  background: location.pathname === item.path ? '#f8f9fa' : 'transparent',
                  fontWeight: location.pathname === item.path ? '500' : '400',
                  transition: 'all 0.3s ease'
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              {user.displayName || user.username}
            </div>
            <span style={{
              background: user.role === 'ADMIN' ? '#667eea' : '#28a745',
              color: 'white',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: '500'
            }}>
              {user.role === 'ADMIN' ? 'Administrador' : 'Productor'}
            </span>
          </div>
          
          <button
            onClick={handleLogout}
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
