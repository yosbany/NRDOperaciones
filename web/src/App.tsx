import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import Navigation from './components/Navigation';
import OrdenesList from './components/OrdenesList';
import TareasList from './components/TareasList';
import ProductosList from './components/ProductosList';
import ContactosList from './components/ContactosList';
import CostosList from './components/CostosList';

// Componente principal de la aplicación
const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Cargando...
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div>
      <Navigation />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/ordenes" element={<OrdenesList />} />
        <Route path="/tareas" element={<TareasList />} />
        <Route path="/productos" element={<ProductosList />} />
        <Route path="/contactos" element={<ContactosList />} />
        <Route path="/costos" element={<CostosList />} />
      </Routes>
    </div>
  );
};

// Componente principal con AuthProvider
const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;