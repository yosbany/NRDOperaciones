import React from 'react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  return (
    <header className="header">
      <nav className="nav">
        <Link to="/" className="nav-logo">
          NRD Operaciones 📱
        </Link>
        <ul className="nav-links">
          <li>
            <Link to="/" className="nav-link">Inicio</Link>
          </li>
          <li>
            <Link to="/demo" className="nav-link">Demo</Link>
          </li>
          <li>
            <Link to="/about" className="nav-link">Acerca de</Link>
          </li>
          <li>
            <Link to="/contact" className="nav-link">Contacto</Link>
          </li>
          <li>
            <a 
              href="https://github.com/yosbany/NRDOperaciones" 
              className="nav-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
