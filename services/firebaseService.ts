// Servicio unificado de Firebase para autenticación y manejo de usuarios
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { APP_CONFIG } from '../constants/Config';

// Configuración de Firebase
const firebaseConfig = APP_CONFIG.FIREBASE_CONFIG;

// Inicializar Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Exportar servicios
export const auth = getAuth(app);
export const database = getDatabase(app);

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
    console.log('🔐 Iniciando login con Firebase Auth...');
    
    // Autenticar con Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    console.log('✅ Usuario autenticado en Firebase Auth:', firebaseUser.email);
    
    // Obtener datos del usuario desde la base de datos
    const userData = await getUserByUid(firebaseUser.uid);
    
    if (!userData) {
      throw new Error('Usuario no encontrado en la base de datos');
    }
    
    console.log('✅ Datos del usuario obtenidos:', userData.email, 'Rol:', userData.role);
    
    return userData;
  } catch (error: any) {
    console.error('❌ Error en login:', error);
    throw error;
  }
}

// Función de logout
export async function logout(): Promise<void> {
  try {
    console.log('🔐 Iniciando logout...');
    
    // Cerrar sesión en Firebase Auth
    await signOut(auth);
    
    console.log('✅ Logout completado');
  } catch (error: any) {
    console.error('❌ Error en logout:', error);
    throw error;
  }
}

// Crear usuario en la base de datos
export async function createUserInDatabase(uid: string, email: string, displayName?: string): Promise<User> {
  try {
    console.log('👤 Creando usuario en base de datos:', email);
    
    const { set, ref } = await import('firebase/database');
    const userRef = ref(database, `users/${uid}`);
    
    const userData = {
      uid: uid,
      email: email,
      displayName: displayName || email.split('@')[0],
      role: 'user', // Rol por defecto
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await set(userRef, userData);
    
    const user: User = {
      id: uid,
      displayName: userData.displayName,
      email: userData.email,
      role: userData.role,
      userId: uid,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt
    };
    
    console.log('✅ Usuario creado en base de datos:', user.email, 'Rol:', user.role);
    return user;
  } catch (error: any) {
    console.error('❌ Error creando usuario en base de datos:', error);
    throw error;
  }
}

// Obtener usuario por UID
export async function getUserByUid(uid: string): Promise<User | null> {
  try {
    console.log('🔍 Buscando usuario por UID:', uid);
    
    // Buscar usuario directamente por la clave del nodo
    const { get, ref } = await import('firebase/database');
    const userRef = ref(database, `users/${uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      console.log('🔍 Datos raw de la base de datos:', userData);
      
      const user: User = {
        id: uid,
        displayName: userData.displayName,
        email: userData.email,
        role: userData.role || 'user', // Asignar rol por defecto si no existe
        userId: userData.userId || uid,
        contactId: userData.contactId,
        idContacto: userData.idContacto,
        username: userData.username,
        nombre: userData.nombre,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      };
      
      console.log('✅ Usuario encontrado:', user.email, 'Rol:', user.role);
      console.log('🔍 Usuario completo:', user);
      return user;
    } else {
      console.log('⚠️ Usuario no encontrado para UID:', uid);
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
    console.log('🔍 Obteniendo proveedores...');
    const { get, ref } = await import('firebase/database');
    const proveedoresRef = ref(database, 'proveedores');
    const snapshot = await get(proveedoresRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      const proveedores = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
      console.log('✅ Proveedores obtenidos:', proveedores.length);
      callback(proveedores);
    } else {
      console.log('⚠️ No hay proveedores en la base de datos');
      callback([]);
    }
  } catch (error: any) {
    console.error('❌ Error obteniendo proveedores:', error);
    callback([]);
  }
}

// Obtener órdenes por rol de usuario
export async function getOrdenesByUserRole(userData: User, callback: (ordenes: any[]) => void): Promise<void> {
  try {
    console.log('🔍 Obteniendo órdenes por rol de usuario:', userData.role);
    const { get, ref } = await import('firebase/database');
    const ordenesRef = ref(database, 'ordenes');
    const snapshot = await get(ordenesRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      let ordenes = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
      
      // Filtrar por rol si es necesario
      if (userData.role !== 'ADMIN') {
        ordenes = ordenes.filter(orden => orden.asignadaA === userData.id);
      }
      
      console.log('✅ Órdenes obtenidas:', ordenes.length);
      callback(ordenes);
    } else {
      console.log('⚠️ No hay órdenes en la base de datos');
      callback([]);
    }
  } catch (error: any) {
    console.error('❌ Error obteniendo órdenes:', error);
    callback([]);
  }
}

// Obtener productos
export async function getProductos(callback: (productos: any[]) => void): Promise<void> {
  try {
    console.log('🔍 Obteniendo productos...');
    const { get, ref } = await import('firebase/database');
    const productosRef = ref(database, 'productos');
    const snapshot = await get(productosRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      const productos = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
      console.log('✅ Productos obtenidos:', productos.length);
      callback(productos);
    } else {
      console.log('⚠️ No hay productos en la base de datos');
      callback([]);
    }
  } catch (error: any) {
    console.error('❌ Error obteniendo productos:', error);
    callback([]);
  }
}

// Obtener tareas por rol de usuario
export async function getTareasByUserRole(userData: User, callback: (tareas: any[]) => void): Promise<void> {
  try {
    console.log('🔍 Obteniendo tareas por rol de usuario:', userData.role);
    const { get, ref } = await import('firebase/database');
    const tareasRef = ref(database, 'tareas');
    const snapshot = await get(tareasRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      let tareas = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
      
      // Filtrar por rol si es necesario
      if (userData.role !== 'ADMIN') {
        tareas = tareas.filter(tarea => tarea.asignadaA === userData.id);
      }
      
      console.log('✅ Tareas obtenidas:', tareas.length);
      if (typeof callback === 'function') {
        callback(tareas);
      }
    } else {
      console.log('⚠️ No hay tareas en la base de datos');
      if (typeof callback === 'function') {
        callback([]);
      }
    }
  } catch (error: any) {
    console.error('❌ Error obteniendo tareas:', error);
    if (typeof callback === 'function') {
      callback([]);
    }
  }
}

// Obtener usuarios para asignación
export async function getUsuariosParaAsignacion(callback: (usuarios: any[]) => void): Promise<void> {
  try {
    console.log('🔍 Obteniendo usuarios para asignación...');
    const { get, ref } = await import('firebase/database');
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      const usuarios = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
      
      console.log('✅ Usuarios obtenidos:', usuarios.length);
      callback(usuarios);
    } else {
      console.log('⚠️ No hay usuarios en la base de datos');
      callback([]);
    }
  } catch (error: any) {
    console.error('❌ Error obteniendo usuarios:', error);
    callback([]);
  }
}

// Función de diagnóstico para usuarios problemáticos
export async function diagnosticarUsuario(uid: string): Promise<void> {
  try {
    console.log('🔍 Ejecutando diagnóstico para usuario:', uid);
    
    // Verificar si el usuario existe en la base de datos
    const user = await getUserByUid(uid);
    
    if (user) {
      console.log('✅ Usuario encontrado en diagnóstico:', {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName
      });
    } else {
      console.log('❌ Usuario no encontrado en diagnóstico para UID:', uid);
    }
    
    // Aquí se podrían agregar más verificaciones de diagnóstico
    console.log('✅ Diagnóstico completado para usuario:', uid);
  } catch (error: any) {
    console.error('❌ Error en diagnóstico de usuario:', error);
  }
}

// ===== FUNCIONES DE PERMISOS =====

// Verificar si el usuario puede acceder a una pestaña específica
export function canAccessTab(userData: User, tabName: string): boolean {
  if (!userData || !userData.role) {
    return false;
  }
  
  // Los administradores pueden acceder a todas las pestañas
  if (userData.role === 'ADMIN') {
    return true;
  }
  
  // Los productores solo pueden acceder a ciertas pestañas
  if (userData.role === 'PRODUCTOR') {
    const allowedTabs = ['index', 'ordenes', 'productos'];
    return allowedTabs.includes(tabName);
  }
  
  return false;
}

// ===== FUNCIONES DE PRODUCTOS =====

// Guardar producto
export async function saveProducto(productoData: any): Promise<void> {
  try {
    console.log('💾 Guardando producto:', productoData.nombre);
    const { set, ref } = await import('firebase/database');
    const productosRef = ref(database, `productos/${Date.now()}`);
    
    const producto = {
      ...productoData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await set(productosRef, producto);
    console.log('✅ Producto guardado exitosamente');
  } catch (error: any) {
    console.error('❌ Error guardando producto:', error);
    throw error;
  }
}

// Actualizar producto
export async function updateProducto(id: string, updateData: any): Promise<void> {
  try {
    console.log('🔄 Actualizando producto:', id);
    const { update, ref } = await import('firebase/database');
    const productoRef = ref(database, `productos/${id}`);
    
    const updateDataWithTimestamp = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    await update(productoRef, updateDataWithTimestamp);
    console.log('✅ Producto actualizado exitosamente');
  } catch (error: any) {
    console.error('❌ Error actualizando producto:', error);
    throw error;
  }
}

// Eliminar producto
export async function deleteProducto(id: string): Promise<void> {
  try {
    console.log('🗑️ Eliminando producto:', id);
    const { remove, ref } = await import('firebase/database');
    const productoRef = ref(database, `productos/${id}`);
    
    await remove(productoRef);
    console.log('✅ Producto eliminado exitosamente');
  } catch (error: any) {
    console.error('❌ Error eliminando producto:', error);
    throw error;
  }
}

// ===== FUNCIONES DE EVENTOS =====

// Registrar evento
export async function logEvento(eventoData: any): Promise<void> {
  try {
    console.log('📝 Registrando evento:', eventoData.tipoEvento);
    const { set, ref } = await import('firebase/database');
    const eventosRef = ref(database, `eventos/${Date.now()}`);
    
    const evento = {
      ...eventoData,
      timestamp: new Date().toISOString()
    };
    
    await set(eventosRef, evento);
    console.log('✅ Evento registrado exitosamente');
  } catch (error: any) {
    console.error('❌ Error registrando evento:', error);
    throw error;
  }
}

// ===== FUNCIONES DE TAREAS =====

// Guardar tarea
export async function saveTarea(tareaData: any): Promise<void> {
  try {
    console.log('💾 Guardando tarea:', tareaData.titulo);
    const { set, ref } = await import('firebase/database');
    const tareasRef = ref(database, `tareas/${Date.now()}`);
    
    const tarea = {
      ...tareaData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await set(tareasRef, tarea);
    console.log('✅ Tarea guardada exitosamente');
  } catch (error: any) {
    console.error('❌ Error guardando tarea:', error);
    throw error;
  }
}

// Actualizar tarea
export async function updateTarea(id: string, updateData: any): Promise<void> {
  try {
    console.log('🔄 Actualizando tarea:', id);
    const { update, ref } = await import('firebase/database');
    const tareaRef = ref(database, `tareas/${id}`);
    
    const updateDataWithTimestamp = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    await update(tareaRef, updateDataWithTimestamp);
    console.log('✅ Tarea actualizada exitosamente');
  } catch (error: any) {
    console.error('❌ Error actualizando tarea:', error);
    throw error;
  }
}

// Eliminar tarea
export async function deleteTarea(id: string): Promise<void> {
  try {
    console.log('🗑️ Eliminando tarea:', id);
    const { remove, ref } = await import('firebase/database');
    const tareaRef = ref(database, `tareas/${id}`);
    
    await remove(tareaRef);
    console.log('✅ Tarea eliminada exitosamente');
  } catch (error: any) {
    console.error('❌ Error eliminando tarea:', error);
    throw error;
  }
}

// Completar tarea
export async function completarTarea(id: string): Promise<void> {
  try {
    console.log('✅ Completando tarea:', id);
    await updateTarea(id, { 
      completada: true, 
      fechaCompletada: new Date().toISOString() 
    });
    console.log('✅ Tarea completada exitosamente');
  } catch (error: any) {
    console.error('❌ Error completando tarea:', error);
    throw error;
  }
}

// Reactivar tarea
export async function reactivarTarea(id: string): Promise<void> {
  try {
    console.log('🔄 Reactivando tarea:', id);
    await updateTarea(id, { 
      completada: false, 
      fechaCompletada: undefined 
    });
    console.log('✅ Tarea reactivada exitosamente');
  } catch (error: any) {
    console.error('❌ Error reactivando tarea:', error);
    throw error;
  }
}

// ===== FUNCIONES DE ÓRDENES =====

// Obtener todas las órdenes
export async function getOrdenes(callback: (ordenes: any[]) => void): Promise<void> {
  try {
    console.log('🔍 Obteniendo todas las órdenes...');
    const { get, ref } = await import('firebase/database');
    const ordenesRef = ref(database, 'ordenes');
    const snapshot = await get(ordenesRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      const ordenes = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
      console.log('✅ Órdenes obtenidas:', ordenes.length);
      callback(ordenes);
    } else {
      console.log('⚠️ No hay órdenes en la base de datos');
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
    console.log('💾 Guardando orden:', ordenData.id);
    const { set, ref } = await import('firebase/database');
    const ordenesRef = ref(database, `ordenes/${ordenData.id}`);
    
    const orden = {
      ...ordenData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await set(ordenesRef, orden);
    console.log('✅ Orden guardada exitosamente');
  } catch (error: any) {
    console.error('❌ Error guardando orden:', error);
    throw error;
  }
}

// Actualizar orden
export async function updateOrden(id: string, updateData: any): Promise<void> {
  try {
    console.log('🔄 Actualizando orden:', id);
    const { update, ref } = await import('firebase/database');
    const ordenRef = ref(database, `ordenes/${id}`);
    
    const updateDataWithTimestamp = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    await update(ordenRef, updateDataWithTimestamp);
    console.log('✅ Orden actualizada exitosamente');
  } catch (error: any) {
    console.error('❌ Error actualizando orden:', error);
    throw error;
  }
}

// Eliminar orden
export async function deleteOrden(id: string): Promise<void> {
  try {
    console.log('🗑️ Eliminando orden:', id);
    const { remove, ref } = await import('firebase/database');
    const ordenRef = ref(database, `ordenes/${id}`);
    
    await remove(ordenRef);
    console.log('✅ Orden eliminada exitosamente');
  } catch (error: any) {
    console.error('❌ Error eliminando orden:', error);
    throw error;
  }
}

// ===== FUNCIONES ADICIONALES =====

// Generar sugerencias de orden
export async function generarSugerenciasOrden(proveedorId: string): Promise<any[]> {
  try {
    console.log('🔍 Generando sugerencias para proveedor:', proveedorId);
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
    console.log('🔍 Obteniendo productos default para cliente:', clienteId);
    // Por ahora retornar array vacío - se puede implementar después
    return [];
  } catch (error: any) {
    console.error('❌ Error obteniendo productos default:', error);
    return [];
  }
}

// Actualizar productos de orden en batch
export async function updateProductosOrdenBatch(updates: any[]): Promise<void> {
  try {
    console.log('🔄 Actualizando productos en batch:', updates.length);
    const { update, ref } = await import('firebase/database');
    const updatesObj: any = {};
    
    updates.forEach(updateData => {
      updatesObj[`productos/${updateData.id}`] = updateData.data;
    });
    
    await update(ref(database), updatesObj);
    console.log('✅ Productos actualizados en batch exitosamente');
  } catch (error: any) {
    console.error('❌ Error actualizando productos en batch:', error);
    throw error;
  }
}

// ===== FUNCIONES DE PROVEEDORES =====

// Guardar proveedor
export async function saveProveedor(proveedorData: any): Promise<void> {
  try {
    console.log('💾 Guardando proveedor:', proveedorData.nombre);
    const { set, ref } = await import('firebase/database');
    const proveedoresRef = ref(database, `proveedores/${Date.now()}`);
    
    const proveedor = {
      ...proveedorData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await set(proveedoresRef, proveedor);
    console.log('✅ Proveedor guardado exitosamente');
  } catch (error: any) {
    console.error('❌ Error guardando proveedor:', error);
    throw error;
  }
}

// Actualizar proveedor
export async function updateProveedor(id: string, updateData: any): Promise<void> {
  try {
    console.log('🔄 Actualizando proveedor:', id);
    const { update, ref } = await import('firebase/database');
    const proveedorRef = ref(database, `proveedores/${id}`);
    
    const updateDataWithTimestamp = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    await update(proveedorRef, updateDataWithTimestamp);
    console.log('✅ Proveedor actualizado exitosamente');
  } catch (error: any) {
    console.error('❌ Error actualizando proveedor:', error);
    throw error;
  }
}

// Eliminar proveedor
export async function deleteProveedor(id: string): Promise<void> {
  try {
    console.log('🗑️ Eliminando proveedor:', id);
    const { remove, ref } = await import('firebase/database');
    const proveedorRef = ref(database, `proveedores/${id}`);
    
    await remove(proveedorRef);
    console.log('✅ Proveedor eliminado exitosamente');
  } catch (error: any) {
    console.error('❌ Error eliminando proveedor:', error);
    throw error;
  }
}

// Actualizar productos default de cliente
export async function updateProductosDefaultCliente(clienteId: string, productos: string[]): Promise<void> {
  try {
    console.log('🔄 Actualizando productos default para cliente:', clienteId);
    const { update, ref } = await import('firebase/database');
    const clienteRef = ref(database, `proveedores/${clienteId}`);
    
    await update(clienteRef, {
      productosDefault: productos,
      updatedAt: new Date().toISOString()
    });
    console.log('✅ Productos default actualizados exitosamente');
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
    console.log('🔍 Obteniendo receta de costo para producto:', productoId);
    const { get, ref } = await import('firebase/database');
    const recetaRef = ref(database, `recetasCosto/${productoId}`);
    const snapshot = await get(recetaRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('✅ Receta de costo obtenida');
      return { id: productoId, ...data };
    } else {
      console.log('⚠️ No hay receta de costo para este producto');
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
    console.log('💾 Guardando receta de costo:', recetaData.productoId);
    const { set, ref } = await import('firebase/database');
    const recetaRef = ref(database, `recetasCosto/${recetaData.productoId}`);
    
    const receta = {
      ...recetaData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await set(recetaRef, receta);
    console.log('✅ Receta de costo guardada exitosamente');
  } catch (error: any) {
    console.error('❌ Error guardando receta de costo:', error);
    throw error;
  }
}

// Eliminar receta de costo
export async function deleteRecetaCosto(productoId: string): Promise<void> {
  try {
    console.log('🗑️ Eliminando receta de costo:', productoId);
    const { remove, ref } = await import('firebase/database');
    const recetaRef = ref(database, `recetasCosto/${productoId}`);
    
    await remove(recetaRef);
    console.log('✅ Receta de costo eliminada exitosamente');
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

// Tipo Tarea
export interface Tarea {
  id: string;
  titulo: string;
  completada: boolean;
  descripcion: string;
  asignadaA: string;
  usuarioAsignado: string;
  prioridad: string;
  publica: boolean;
  seguidores: string[];
  observacion: string;
  createdAt: string;
  updatedAt: string;
  fechaCompletada?: string;
}
