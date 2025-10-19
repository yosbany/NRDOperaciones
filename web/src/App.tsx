import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import Features from './components/Features';
import Footer from './components/Footer';
import Header from './components/Header';
import Hero from './components/Hero';
import Installation from './components/Installation';
import Technology from './components/Technology';
import About from './pages/About';
import Contact from './pages/Contact';

function App() {
  return (
    <Router basename="/NRDOperaciones">
      <div className="App">
        <Header />
        <Routes>
          <Route path="/" element={
            <>
              <Hero />
              <Features />
              <Technology />
              <Installation />
            </>
          } />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;