import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCWja3NDganFA2faeVS-NVrlDJnQLBabZA",
  authDomain: "ordenes-prod.firebaseapp.com",
  databaseURL: "https://ordenes-prod-default-rtdb.firebaseio.com",
  projectId: "ordenes-prod",
  storageBucket: "ordenes-prod.firebasestorage.app",
  messagingSenderId: "219625501616",
  appId: "1:219625501616:web:4028f3f6010d819c019c75"
};

console.log('🔥 Configuración de Firebase:', firebaseConfig);

// Inicializar Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
console.log('🔥 Firebase App inicializado:', !!app);

// Inicializar Firebase Auth con persistencia
let auth;
try {
  // Intentar inicializar con persistencia
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  console.log('🔥 Firebase Auth inicializado con persistencia:', !!auth);
} catch (error) {
  // Si ya existe una instancia, usar getAuth()
  console.log('⚠️ Firebase Auth ya inicializado, usando getAuth()');
  auth = getAuth(app);
  console.log('🔥 Firebase Auth obtenido:', !!auth);
}
export { auth };

// Inicializar servicios
export const database = getDatabase(app);
console.log('🔥 Firebase Database inicializado:', !!database);
