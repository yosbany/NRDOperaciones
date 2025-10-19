// Configuración de la aplicación
export const APP_CONFIG = {
  // Dominio fijo para autenticación
  AUTH_DOMAIN: 'nrd.com',

  // Configuración de la app
  APP_NAME: 'NRD Operaciones',
  APP_DESCRIPTION: 'Sistema de Gestión Operativa',
  APP_VERSION: '1.0.32',

  // Configuración de entorno
  IS_DEVELOPMENT: __DEV__,

  // Configuración de Firebase
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyCWja3NDganFA2faeVS-NVrlDJnQLBabZA",
    authDomain: "ordenes-prod.firebaseapp.com",
    databaseURL: "https://ordenes-prod-default-rtdb.firebaseio.com",
    projectId: "ordenes-prod",
    storageBucket: "ordenes-prod.firebasestorage.app",
    messagingSenderId: "219625501616",
    appId: "1:219625501616:web:4028f3f6010d819c019c75"
  }
};

// Roles de usuario
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  PRODUCTOR: 'PRODUCTOR'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Función para construir el email completo
export const buildUserEmail = (username: string) => `${username}@${APP_CONFIG.AUTH_DOMAIN}`;

// Función para extraer el username del email
export const extractUsername = (email: string): string => {
  return email.split('@')[0];
};

// Función de logging que solo muestra errores en desarrollo
export const logError = (message: string, error?: any) => {
  if (APP_CONFIG.IS_DEVELOPMENT) {
    console.error(message, error);
  }
};
