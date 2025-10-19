import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

console.log('🚀 Iniciando aplicación React...');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

console.log('🚀 Root element encontrado:', !!document.getElementById('root'));

try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('✅ Aplicación React renderizada correctamente');
} catch (error) {
  console.error('❌ Error renderizando aplicación:', error);
}