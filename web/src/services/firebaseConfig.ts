import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Configuración de Firebase (misma que la app móvil)
const firebaseConfig = {
  apiKey: "AIzaSyCWja3NDganFA2faeVS-NVrlDJnQLBabZA",
  authDomain: "ordenes-prod.firebaseapp.com",
  databaseURL: "https://ordenes-prod-default-rtdb.firebaseio.com",
  projectId: "ordenes-prod",
  storageBucket: "ordenes-prod.firebasestorage.app",
  messagingSenderId: "219625501616",
  appId: "1:219625501616:web:4028f3f6010d819c019c75"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
export const auth = getAuth(app);
export const database = getDatabase(app);

console.log('🔥 Firebase Web inicializado:', !!app);
