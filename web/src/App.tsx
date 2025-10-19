import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import ContactosList from './components/ContactosList';
import CostosList from './components/CostosList';
import Dashboard from './components/Dashboard';
import Features from './components/Features';
import Footer from './components/Footer';
import Header from './components/Header';
import Hero from './components/Hero';
import Installation from './components/Installation';
import LoginForm from './components/LoginForm';
import Navigation from './components/Navigation';
import OrdenesList from './components/OrdenesList';
import ProductosList from './components/ProductosList';
import TareasList from './components/TareasList';
import Technology from './components/Technology';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import About from './pages/About';
import Contact from './pages/Contact';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Cargando...</div>
          <div style={{ color: '#666' }}>Verificando autenticación</div>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <>
        <Navigation />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ordenes" element={<OrdenesList />} />
          <Route path="/tareas" element={<TareasList />} />
          <Route path="/productos" element={<ProductosList />} />
          <Route path="/contactos" element={<ContactosList />} />
          <Route path="/costos" element={<CostosList />} />
        </Routes>
      </>
    );
  }

  return (
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
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<AppContent />} />
            <Route path="/about" element={
              <>
                <Header />
                <About />
                <Footer />
              </>
            } />
            <Route path="/contact" element={
              <>
                <Header />
                <Contact />
                <Footer />
              </>
            } />
            <Route path="/demo" element={
              <>
                <Header />
                <Hero />
                <Features />
                <Technology />
                <Installation />
                <Footer />
              </>
            } />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;