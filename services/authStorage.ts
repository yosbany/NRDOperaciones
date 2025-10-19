import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from './firebase';

const AUTH_STORAGE_KEY = '@nrd_operaciones_auth';
const USER_DATA_KEY = '@nrd_operaciones_user_data';

export interface StoredAuthData {
  isAuthenticated: boolean;
  timestamp: number;
}

/**
 * Guarda el estado de autenticación en AsyncStorage
 * @param isAuthenticated - Estado de autenticación
 */
export const saveAuthState = async (isAuthenticated: boolean): Promise<void> => {
  try {
    const authData: StoredAuthData = {
      isAuthenticated,
      timestamp: Date.now()
    };
    
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    console.log('💾 Estado de autenticación guardado:', isAuthenticated);
  } catch (error) {
    console.error('❌ Error guardando estado de autenticación:', error);
    throw error;
  }
};

/**
 * Obtiene el estado de autenticación guardado
 * @returns Promise<boolean | null> - Estado de autenticación o null si no existe
 */
export const getAuthState = async (): Promise<boolean | null> => {
  try {
    const authDataString = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    
    if (!authDataString) {
      console.log('📱 No hay estado de autenticación guardado');
      return null;
    }
    
    const authData: StoredAuthData = JSON.parse(authDataString);
    
    // Verificar si el token no es muy antiguo (opcional: 30 días)
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const isExpired = Date.now() - authData.timestamp > thirtyDaysInMs;
    
    if (isExpired) {
      console.log('⏰ Estado de autenticación expirado, limpiando...');
      await clearAuthState();
      return null;
    }
    
    console.log('📱 Estado de autenticación restaurado:', authData.isAuthenticated);
    return authData.isAuthenticated;
  } catch (error) {
    console.error('❌ Error obteniendo estado de autenticación:', error);
    return null;
  }
};

/**
 * Guarda los datos del usuario en AsyncStorage
 * @param userData - Datos del usuario
 */
export const saveUserData = async (userData: User): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    console.log('💾 Datos del usuario guardados:', userData.email);
  } catch (error) {
    console.error('❌ Error guardando datos del usuario:', error);
    throw error;
  }
};

/**
 * Obtiene los datos del usuario guardados
 * @returns Promise<User | null> - Datos del usuario o null si no existen
 */
export const getUserData = async (): Promise<User | null> => {
  try {
    const userDataString = await AsyncStorage.getItem(USER_DATA_KEY);
    
    if (!userDataString) {
      console.log('📱 No hay datos de usuario guardados');
      return null;
    }
    
    const userData: User = JSON.parse(userDataString);
    console.log('📱 Datos del usuario restaurados:', userData.email);
    return userData;
  } catch (error) {
    console.error('❌ Error obteniendo datos del usuario:', error);
    return null;
  }
};

/**
 * Limpia todo el estado de autenticación guardado
 */
export const clearAuthState = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, USER_DATA_KEY]);
    console.log('🧹 Estado de autenticación limpiado');
  } catch (error) {
    console.error('❌ Error limpiando estado de autenticación:', error);
    throw error;
  }
};

/**
 * Verifica si hay una sesión guardada válida
 * @returns Promise<boolean> - true si hay sesión válida
 */
export const hasValidSession = async (): Promise<boolean> => {
  try {
    const authState = await getAuthState();
    const userData = await getUserData();
    
    const isValid = authState === true && userData !== null;
    console.log('🔍 Verificación de sesión válida:', {
      authState,
      hasUserData: userData !== null,
      isValid
    });
    
    return isValid;
  } catch (error) {
    console.error('❌ Error verificando sesión válida:', error);
    return false;
  }
};

