// Servicio unificado de Firebase para autenticación y manejo de usuarios
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
    getAuth,
    getReactNativePersistence,
    initializeAuth,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { Platform } from 'react-native';
import { APP_CONFIG } from '../constants/Config';

// Configuración de Firebase
const firebaseConfig = APP_CONFIG.FIREBASE_CONFIG;

// Inicializar Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Inicializar Firebase Auth con persistencia apropiada para cada plataforma
let auth;
if (Platform.OS === 'web') {
  // Para web, usar getAuth con persistencia por defecto
  auth = getAuth(app);
} else {
  // Para React Native, usar initializeAuth con AsyncStorage
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (error) {
    // Si ya existe una instancia de auth, usar getAuth
    auth = getAuth(app);
  }
}

export { auth };
export const database = getDatabase(app);

/** Dominio de correo para administradores: usuario@nrd.adm.com = admin */
export const ADMIN_EMAIL_DOMAIN = '@nrd.adm.com';

/** true si el usuario es admin por dominio de email */
export function isAdmin(user: User | null): boolean {
  return (user?.email ?? '').toLowerCase().endsWith(ADMIN_EMAIL_DOMAIN);
}

/** Parte antes del @ del email (ej: marcelo@nrd.com → "marcelo"). Usado para productores sin .adm.com */
export function getEmailPrefix(user: User | null): string {
  return (user?.email ?? '').split('@')[0].toLowerCase().trim();
}

// Modelo User simple
export interface User {
  id: string;
  displayName: string;
  email: string;
  role: string;
  userId?: string;
  contactId?: string;
  idContacto?: string;
  username?: string;
  nombre?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Función de login con Firebase Auth
export async function loginWithFirebase(email: string, password: string): Promise<User> {
  try {
    // Autenticar con Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Si está autenticado con Firebase Auth, permitir entrada (con o sin usuario en BD)
    let userData = await getUserByUid(firebaseUser.uid);
    if (!userData) {
      userData = await createUserInDatabase(
        firebaseUser.uid,
        firebaseUser.email || '',
        firebaseUser.displayName || undefined
      );
    }
    return userData;
  } catch (error: any) {
    console.error('❌ Error en login:', error);
    throw error;
  }
}

// Función de logout
export async function logout(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('❌ Error en logout:', error);
    throw error;
  }
}

// Crear usuario en la base de datos
export async function createUserInDatabase(uid: string, email: string, displayName?: string): Promise<User> {
  try {
    const { set, ref } = await import('firebase/database');
    const userRef = ref(database, `users/${uid}`);
    
    const roleFromEmail = email.toLowerCase().endsWith(ADMIN_EMAIL_DOMAIN) ? 'ADMIN' : 'user';
    const userData = {
      uid: uid,
      email: email,
      displayName: displayName || email.split('@')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await set(userRef, userData);
    
    const user: User = {
      id: uid,
      displayName: userData.displayName,
      email: userData.email,
      role: roleFromEmail,
      userId: uid,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt
    };
    
    return user;
  } catch (error: any) {
    console.error('❌ Error creando usuario en base de datos:', error);
    throw error;
  }
}

// Obtener usuario por UID
export async function getUserByUid(uid: string): Promise<User | null> {
  try {
    // Buscar usuario directamente por la clave del nodo
    const { get, ref } = await import('firebase/database');
    const userRef = ref(database, `users/${uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      
      const roleFromEmail = (userData.email || '').toLowerCase().endsWith(ADMIN_EMAIL_DOMAIN) ? 'ADMIN' : 'user';
      const user: User = {
        id: uid,
        displayName: userData.displayName,
        email: userData.email,
        role: roleFromEmail,
        userId: userData.userId || uid,
        contactId: userData.contactId,
        idContacto: userData.idContacto,
        username: userData.username,
        nombre: userData.nombre,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      };
      
      return user;
    } else {
      return null;
    }
  } catch (error: any) {
    console.error('❌ Error obteniendo usuario por UID:', error);
    throw error;
  }
}

// FCM eliminado

// ===== FUNCIONES DE DATOS =====

// Obtener proveedores
export async function getProveedores(callback: (proveedores: any[]) => void): Promise<void> {
  try {
    const { get, ref } = await import('firebase/database');
    const proveedoresRef = ref(database, 'proveedores');
    const snapshot = await get(proveedoresRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      const proveedores = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
      callback(proveedores);
    } else {
      callback([]);
    }
  } catch (error: any) {
    console.error('❌ Error obteniendo proveedores:', error);
    callback([]);
  }
}

// Obtener órdenes por rol de usuario
// Admin (@nrd.adm.com): todas. Resto: solo órdenes cuyo proveedor.nombre = parte antes del @ (ej: marcelo@nrd.com → órdenes de proveedor "marcelo")
export async function getOrdenesByUserRole(userData: User, callback: (ordenes: any[]) => void): Promise<void> {
  try {
    const { get, ref } = await import('firebase/database');
    const ordenesRef = ref(database, 'ordenes');
    const snapshot = await get(ordenesRef);
    
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    let ordenes = Object.keys(data).map((key: string) => ({
      id: key,
      ...data[key]
    }));
    if (isAdmin(userData)) {
      callback(ordenes);
      return;
    }
    getProveedores((proveedores) => {
      const prefix = getEmailPrefix(userData);
      ordenes = ordenes.filter((orden: any) => {
        const prov = proveedores.find((p: any) => p.id === orden.proveedorId);
        const provNombre = (prov?.nombre ?? '').toLowerCase().trim();
        return provNombre === prefix;
      });
      callback(ordenes);
    });
  } catch (error: any) {
    console.error('❌ Error obteniendo órdenes:', error);
    callback([]);
  }
}

// Obtener productos
export async function getProductos(callback: (productos: any[]) => void): Promise<void> {
  try {
    const { get, ref } = await import('firebase/database');
    const productosRef = ref(database, 'productos');
    const snapshot = await get(productosRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const productos = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
      callback(productos);
    } else {
      callback([]);
    }
  } catch (error: any) {
    console.error('❌ Error obteniendo productos:', error);
    callback([]);
  }
}

// Función de diagnóstico para usuarios problemáticos
export async function diagnosticarUsuario(uid: string): Promise<void> {
  try {
    const user = await getUserByUid(uid);
    if (user) {
      // Usuario encontrado
    }
    // Aquí se podrían agregar más verificaciones de diagnóstico
  } catch (error: any) {
    console.error('❌ Error en diagnóstico de usuario:', error);
  }
}

// ===== FUNCIONES DE PERMISOS =====

// Admin: todas las pestañas. Sin @nrd.adm.com: solo Inicio y Órdenes (Contactos y Productos restringidos)
export function canAccessTab(userData: User, tabName: string): boolean {
  if (!userData) return false;
  if (isAdmin(userData)) return true;
  const allowedTabs = ['index', 'ordenes'];
  return allowedTabs.includes(tabName);
}

// ===== FUNCIONES DE PRODUCTOS =====

// Guardar producto
export async function saveProducto(productoData: any): Promise<void> {
  try {
    const { set, ref } = await import('firebase/database');
    const productosRef = ref(database, `productos/${Date.now()}`);
    
    const producto = {
      ...productoData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await set(productosRef, producto);
  } catch (error: any) {
    console.error('❌ Error guardando producto:', error);
    throw error;
  }
}

// Actualizar producto
export async function updateProducto(id: string, updateData: any): Promise<void> {
  try {
    const { update, ref } = await import('firebase/database');
    const productoRef = ref(database, `productos/${id}`);
    
    const updateDataWithTimestamp = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    await update(productoRef, updateDataWithTimestamp);
  } catch (error: any) {
    console.error('❌ Error actualizando producto:', error);
    throw error;
  }
}

// Eliminar producto
export async function deleteProducto(id: string): Promise<void> {
  try {
    const { remove, ref } = await import('firebase/database');
    const productoRef = ref(database, `productos/${id}`);
    
    await remove(productoRef);
  } catch (error: any) {
    console.error('❌ Error eliminando producto:', error);
    throw error;
  }
}

// ===== FUNCIONES DE ÓRDENES =====

// Obtener todas las órdenes
export async function getOrdenes(callback: (ordenes: any[]) => void): Promise<void> {
  try {
    const { get, ref } = await import('firebase/database');
    const ordenesRef = ref(database, 'ordenes');
    const snapshot = await get(ordenesRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const ordenes = Object.keys(data).map(key => ({
        ...data[key],
        id: key
      }));
      callback(ordenes);
    } else {
      callback([]);
    }
  } catch (error: any) {
    console.error('❌ Error obteniendo órdenes:', error);
    callback([]);
  }
}

// Guardar orden
export async function saveOrden(ordenData: any): Promise<void> {
  try {
    const { set, ref } = await import('firebase/database');
    const ordenesRef = ref(database, `ordenes/${ordenData.id}`);
    
    const orden = {
      ...ordenData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await set(ordenesRef, orden);
  } catch (error: any) {
    console.error('❌ Error guardando orden:', error);
    throw error;
  }
}

// Actualizar orden
export async function updateOrden(id: string, updateData: any): Promise<void> {
  try {
    const { update, ref } = await import('firebase/database');
    const ordenRef = ref(database, `ordenes/${id}`);
    
    const updateDataWithTimestamp = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    await update(ordenRef, updateDataWithTimestamp);
  } catch (error: any) {
    console.error('❌ Error actualizando orden:', error);
    throw error;
  }
}

// Eliminar orden
export async function deleteOrden(id: string): Promise<void> {
  try {
    const { remove, ref } = await import('firebase/database');
    const ordenRef = ref(database, `ordenes/${id}`);
    
    await remove(ordenRef);
  } catch (error: any) {
    console.error('❌ Error eliminando orden:', error);
    throw error;
  }
}

// ===== FUNCIONES ADICIONALES =====

// Generar sugerencias de orden
export async function generarSugerenciasOrden(proveedorId: string): Promise<any[]> {
  try {
    // Por ahora retornar array vacío - se puede implementar después
    return [];
  } catch (error: any) {
    console.error('❌ Error generando sugerencias:', error);
    return [];
  }
}

// Obtener productos default de cliente
export async function getProductosDefaultCliente(clienteId: string): Promise<any[]> {
  try {
    // Por ahora retornar array vacío - se puede implementar después
    return [];
  } catch (error: any) {
    console.error('❌ Error obteniendo productos default:', error);
    return [];
  }
}

// Actualizar solo el campo 'orden' de productos en batch (nunca escribe otros campos para no pisar nombre, etc.)
export async function updateProductosOrdenBatch(updates: { id: string; data: { orden?: number } }[]): Promise<void> {
  try {
    const { update, ref } = await import('firebase/database');
    const updatesObj: Record<string, { orden: number }> = {};
    for (const u of updates) {
      const orden = typeof u.data?.orden === 'number' ? u.data.orden : 0;
      updatesObj[`productos/${u.id}`] = { orden };
    }
    await update(ref(database), updatesObj);
  } catch (error: any) {
    console.error('❌ Error actualizando productos en batch:', error);
    throw error;
  }
}

// ===== FUNCIONES DE PROVEEDORES =====

// Guardar proveedor
export async function saveProveedor(proveedorData: any): Promise<void> {
  try {
    const { set, ref } = await import('firebase/database');
    const proveedoresRef = ref(database, `proveedores/${Date.now()}`);
    
    const proveedor = {
      ...proveedorData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await set(proveedoresRef, proveedor);
  } catch (error: any) {
    console.error('❌ Error guardando proveedor:', error);
    throw error;
  }
}

// Actualizar proveedor
export async function updateProveedor(id: string, updateData: any): Promise<void> {
  try {
    const { update, ref } = await import('firebase/database');
    const proveedorRef = ref(database, `proveedores/${id}`);
    
    const updateDataWithTimestamp = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    await update(proveedorRef, updateDataWithTimestamp);
  } catch (error: any) {
    console.error('❌ Error actualizando proveedor:', error);
    throw error;
  }
}

// Eliminar proveedor
export async function deleteProveedor(id: string): Promise<void> {
  try {
    const { remove, ref } = await import('firebase/database');
    const proveedorRef = ref(database, `proveedores/${id}`);
    
    await remove(proveedorRef);
  } catch (error: any) {
    console.error('❌ Error eliminando proveedor:', error);
    throw error;
  }
}

// Actualizar productos default de cliente
export async function updateProductosDefaultCliente(clienteId: string, productos: string[]): Promise<void> {
  try {
    const { update, ref } = await import('firebase/database');
    const clienteRef = ref(database, `proveedores/${clienteId}`);
    
    await update(clienteRef, {
      productosDefault: productos,
      updatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Error actualizando productos default:', error);
    throw error;
  }
}

// ===== FUNCIONES DE COSTOS =====

// Tipo IngredienteCosto
export interface IngredienteCosto {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  precio: number;
  proveedorId: string;
}

// Tipo RecetaCosto
export interface RecetaCosto {
  id: string;
  productoId: string;
  ingredientes: IngredienteCosto[];
  rendimiento: number;
  observaciones: string;
  costoTotal: number;
  createdAt: string;
  updatedAt: string;
}

// Obtener receta de costo
export async function getRecetaCosto(productoId: string): Promise<RecetaCosto | null> {
  try {
    const { get, ref } = await import('firebase/database');
    const recetaRef = ref(database, `recetasCosto/${productoId}`);
    const snapshot = await get(recetaRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return { id: productoId, ...data };
    } else {
      return null;
    }
  } catch (error: any) {
    console.error('❌ Error obteniendo receta de costo:', error);
    return null;
  }
}

// Guardar receta de costo
export async function saveRecetaCosto(recetaData: RecetaCosto): Promise<void> {
  try {
    const { set, ref } = await import('firebase/database');
    const recetaRef = ref(database, `recetasCosto/${recetaData.productoId}`);
    
    const receta = {
      ...recetaData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await set(recetaRef, receta);
  } catch (error: any) {
    console.error('❌ Error guardando receta de costo:', error);
    throw error;
  }
}

// Eliminar receta de costo
export async function deleteRecetaCosto(productoId: string): Promise<void> {
  try {
    const { remove, ref } = await import('firebase/database');
    const recetaRef = ref(database, `recetasCosto/${productoId}`);
    
    await remove(recetaRef);
  } catch (error: any) {
    console.error('❌ Error eliminando receta de costo:', error);
    throw error;
  }
}

// Calcular costo de ingrediente
export function calcularCostoIngrediente(ingrediente: IngredienteCosto): number {
  return ingrediente.cantidad * ingrediente.precio;
}

// ===== FUNCIONES DE ALMACENAMIENTO DE AUTENTICACIÓN =====

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
      return null;
    }
    
    const authData: StoredAuthData = JSON.parse(authDataString);
    
    // Verificar si el token no es muy antiguo (opcional: 30 días)
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const isExpired = Date.now() - authData.timestamp > thirtyDaysInMs;
    
    if (isExpired) {
      await clearAuthState();
      return null;
    }
    
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
      return null;
    }
    
    const userData: User = JSON.parse(userDataString);
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
    return isValid;
  } catch (error) {
    console.error('❌ Error verificando sesión válida:', error);
    return false;
  }
};

// ===== TIPOS Y INTERFACES =====

// Tipo Orden
export interface Orden {
  id: string;
  estado: string;
  fecha: string;
  hecha: boolean;
  proveedorId: string;
  productos: any[];
  tipo: string;
  total?: number;
  asignadaA?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Tipo Producto
export interface Producto {
  id: string;
  nombre: string;
  orden: number;
  precio: number;
  proveedorId: string;
  stock: number;
  unidad: string;
  archivado?: boolean;
  fueraDeTemporada?: boolean;
  fueraDeTemporadaHasta?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Tipo Proveedor
export interface Proveedor {
  id: string;
  nombre: string;
  tipo: string;
  celular: string;
  salarioPorDia: number;
  frecuencia: string;
  productosDefault: string[];
  updatedAt: string;
  telefono?: string;
}

