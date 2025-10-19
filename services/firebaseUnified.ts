// Servicio de Firebase unificado para la app móvil
import { User as FirebaseAuthUser, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { USER_ROLES, UserRole } from '../constants/Config';
import { clearAuthState, saveAuthState, saveUserData } from './authStorage';
import { auth, database } from '../shared/services/firebaseConfig';
import { mobileDataAdapter } from '../shared/services/mobileAdapter';
import { Orden, Producto, Proveedor, Tarea, User, RecetaCosto } from '../shared/services/types';

// Importación condicional de notificaciones para compatibilidad con Expo Go
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (error) {
  console.warn('⚠️ expo-notifications no disponible en Expo Go. Se deshabilitarán las notificaciones push.');
}

// Verificar que Firebase esté inicializado correctamente
console.log('🔥 Firebase Auth inicializado:', !!auth);
console.log('🔥 Firebase Database inicializado:', !!database);

// ===== AUTENTICACIÓN =====

// Función de login con Firebase
export const loginWithFirebase = async (email: string, password: string): Promise<User> => {
  try {
    console.log('🔐 Iniciando sesión con Firebase...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    console.log('✅ Usuario autenticado:', firebaseUser.email);
    
    // Obtener datos del usuario desde la base de datos
    const userData = await mobileDataAdapter.getUserByUid(firebaseUser.uid);
    
    if (!userData) {
      throw new Error('Usuario no encontrado en la base de datos');
    }
    
    // Guardar estado de autenticación
    await saveAuthState(firebaseUser.uid, firebaseUser.email || '');
    await saveUserData(userData);
    
    return userData;
  } catch (error) {
    console.error('❌ Error en login:', error);
    throw error;
  }
};

// Función de logout
export const logout = async (): Promise<void> => {
  try {
    console.log('🚪 Cerrando sesión...');
    await signOut(auth);
    await clearAuthState();
    console.log('✅ Sesión cerrada correctamente');
  } catch (error) {
    console.error('❌ Error al cerrar sesión:', error);
    throw error;
  }
};

// Función para obtener usuario actual
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    
    return await mobileDataAdapter.getUserByUid(firebaseUser.uid);
  } catch (error) {
    console.error('❌ Error obteniendo usuario actual:', error);
    return null;
  }
};

// Función para obtener usuario por UID
export const getUserByUid = async (uid: string): Promise<User | null> => {
  return mobileDataAdapter.getUserByUid(uid);
};

// ===== ÓRDENES =====

export const getOrdenes = async (): Promise<Orden[]> => {
  return mobileDataAdapter.getOrdenes();
};

export const getOrdenById = async (id: string): Promise<Orden | null> => {
  return mobileDataAdapter.getOrdenById(id);
};

export const saveOrden = async (orden: Omit<Orden, 'id'>): Promise<string> => {
  return mobileDataAdapter.saveOrden(orden);
};

export const updateOrden = async (id: string, orden: Partial<Orden>): Promise<void> => {
  return mobileDataAdapter.updateOrden(id, orden);
};

export const deleteOrden = async (id: string): Promise<void> => {
  return mobileDataAdapter.deleteOrden(id);
};

// ===== PRODUCTOS =====

export const getProductos = async (): Promise<Producto[]> => {
  return mobileDataAdapter.getProductos();
};

export const getProductoById = async (id: string): Promise<Producto | null> => {
  return mobileDataAdapter.getProductoById(id);
};

export const saveProducto = async (producto: Omit<Producto, 'id'>): Promise<string> => {
  return mobileDataAdapter.saveProducto(producto);
};

export const updateProducto = async (id: string, producto: Partial<Producto>): Promise<void> => {
  return mobileDataAdapter.updateProducto(id, producto);
};

export const deleteProducto = async (id: string): Promise<void> => {
  return mobileDataAdapter.deleteProducto(id);
};

// ===== PROVEEDORES =====

export const getProveedores = async (): Promise<Proveedor[]> => {
  return mobileDataAdapter.getProveedores();
};

export const getProveedorById = async (id: string): Promise<Proveedor | null> => {
  return mobileDataAdapter.getProveedorById(id);
};

export const saveProveedor = async (proveedor: Omit<Proveedor, 'id'>): Promise<string> => {
  return mobileDataAdapter.saveProveedor(proveedor);
};

export const updateProveedor = async (id: string, proveedor: Partial<Proveedor>): Promise<void> => {
  return mobileDataAdapter.updateProveedor(id, proveedor);
};

export const deleteProveedor = async (id: string): Promise<void> => {
  return mobileDataAdapter.deleteProveedor(id);
};

// ===== TAREAS =====

export const getTareas = async (): Promise<Tarea[]> => {
  return mobileDataAdapter.getTareas();
};

export const getTareaById = async (id: string): Promise<Tarea | null> => {
  return mobileDataAdapter.getTareaById(id);
};

export const saveTarea = async (tarea: Omit<Tarea, 'id'>): Promise<string> => {
  return mobileDataAdapter.saveTarea(tarea);
};

export const updateTarea = async (id: string, tarea: Partial<Tarea>): Promise<void> => {
  return mobileDataAdapter.updateTarea(id, tarea);
};

export const deleteTarea = async (id: string): Promise<void> => {
  return mobileDataAdapter.deleteTarea(id);
};

// ===== USUARIOS =====

export const getUsers = async (): Promise<User[]> => {
  return mobileDataAdapter.getUsers();
};

export const saveUser = async (user: Omit<User, 'id'>): Promise<string> => {
  return mobileDataAdapter.saveUser(user);
};

export const updateUser = async (id: string, user: Partial<User>): Promise<void> => {
  return mobileDataAdapter.updateUser(id, user);
};

// ===== RECETAS DE COSTOS =====

export const getRecetasCostos = async (): Promise<RecetaCosto[]> => {
  return mobileDataAdapter.getRecetasCostos();
};

export const getRecetaCostoById = async (id: string): Promise<RecetaCosto | null> => {
  return mobileDataAdapter.getRecetaCostoById(id);
};

export const saveRecetaCosto = async (receta: Omit<RecetaCosto, 'id'>): Promise<string> => {
  return mobileDataAdapter.saveRecetaCosto(receta);
};

export const updateRecetaCosto = async (id: string, receta: Partial<RecetaCosto>): Promise<void> => {
  return mobileDataAdapter.updateRecetaCosto(id, receta);
};

export const deleteRecetaCosto = async (id: string): Promise<void> => {
  return mobileDataAdapter.deleteRecetaCosto(id);
};

// ===== MÉTODOS ESPECÍFICOS PARA MÓVIL =====

// Obtener órdenes con información de proveedores resuelta
export const getOrdenesConProveedores = async (): Promise<(Orden & { proveedor?: Proveedor })[]> => {
  return mobileDataAdapter.getOrdenesConProveedores();
};

// Obtener productos con información de proveedores resuelta
export const getProductosConProveedores = async (): Promise<(Producto & { proveedor?: Proveedor })[]> => {
  return mobileDataAdapter.getProductosConProveedores();
};

// Buscar proveedor por ID
export const findProveedorById = async (proveedorId: string): Promise<Proveedor | null> => {
  return mobileDataAdapter.findProveedorById(proveedorId);
};

// Buscar producto por ID
export const findProductoById = async (productoId: string): Promise<Producto | null> => {
  return mobileDataAdapter.findProductoById(productoId);
};

// ===== LISTENERS EN TIEMPO REAL =====

export const onOrdenesChange = (callback: (ordenes: Orden[]) => void): (() => void) => {
  return mobileDataAdapter.onOrdenesChange(callback);
};

export const onProveedoresChange = (callback: (proveedores: Proveedor[]) => void): (() => void) => {
  return mobileDataAdapter.onProveedoresChange(callback);
};

export const onProductosChange = (callback: (productos: Producto[]) => void): (() => void) => {
  return mobileDataAdapter.onProductosChange(callback);
};

export const onTareasChange = (callback: (tareas: Tarea[]) => void): (() => void) => {
  return mobileDataAdapter.onTareasChange(callback);
};

// ===== NOTIFICACIONES (ESPECÍFICO PARA MÓVIL) =====

// Configurar notificaciones push
export const setupNotifications = async (): Promise<void> => {
  if (!Notifications) {
    console.warn('⚠️ Notificaciones no disponibles');
    return;
  }

  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('⚠️ Permisos de notificación denegados');
      return;
    }

    console.log('✅ Notificaciones configuradas');
  } catch (error) {
    console.error('❌ Error configurando notificaciones:', error);
  }
};

// Enviar notificación local
export const sendLocalNotification = async (title: string, body: string): Promise<void> => {
  if (!Notifications) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: null,
    });
  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
  }
};

// ===== EXPORTACIONES DE TIPOS =====

export type { Orden, Producto, Proveedor, Tarea, User, RecetaCosto };
