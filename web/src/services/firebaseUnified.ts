// Servicio de Firebase unificado para la app web
import { User as FirebaseAuthUser, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { webDataAdapter } from '../../../shared/services/webAdapter';
import { Orden, Producto, Proveedor, Tarea, User, RecetaCosto } from '../../../shared/services/types';

// ===== AUTENTICACIÓN =====

// Función de login con Firebase
export const loginWithFirebase = async (email: string, password: string): Promise<User> => {
  try {
    console.log('🔐 Iniciando sesión con Firebase...');
    const { auth } = await import('../../../shared/services/firebaseConfig');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    console.log('✅ Usuario autenticado:', firebaseUser.email);
    
    // Obtener datos del usuario desde la base de datos
    const userData = await webDataAdapter.getUserByUid(firebaseUser.uid);
    
    if (!userData) {
      throw new Error('Usuario no encontrado en la base de datos');
    }
    
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
    const { auth } = await import('../../../shared/services/firebaseConfig');
    await signOut(auth);
    console.log('✅ Sesión cerrada correctamente');
  } catch (error) {
    console.error('❌ Error al cerrar sesión:', error);
    throw error;
  }
};

// Función para obtener usuario actual
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { auth } = await import('../../../shared/services/firebaseConfig');
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    
    return await webDataAdapter.getUserByUid(firebaseUser.uid);
  } catch (error) {
    console.error('❌ Error obteniendo usuario actual:', error);
    return null;
  }
};

// Función para obtener usuario por UID
export const getUserByUid = async (uid: string): Promise<User | null> => {
  return webDataAdapter.getUserByUid(uid);
};

// ===== ÓRDENES =====

export const getOrdenes = async (): Promise<Orden[]> => {
  return webDataAdapter.getOrdenes();
};

export const getOrdenById = async (id: string): Promise<Orden | null> => {
  return webDataAdapter.getOrdenById(id);
};

export const saveOrden = async (orden: Omit<Orden, 'id'>): Promise<string> => {
  return webDataAdapter.saveOrden(orden);
};

export const updateOrden = async (id: string, orden: Partial<Orden>): Promise<void> => {
  return webDataAdapter.updateOrden(id, orden);
};

export const deleteOrden = async (id: string): Promise<void> => {
  return webDataAdapter.deleteOrden(id);
};

// ===== PRODUCTOS =====

export const getProductos = async (): Promise<Producto[]> => {
  return webDataAdapter.getProductos();
};

export const getProductoById = async (id: string): Promise<Producto | null> => {
  return webDataAdapter.getProductoById(id);
};

export const saveProducto = async (producto: Omit<Producto, 'id'>): Promise<string> => {
  return webDataAdapter.saveProducto(producto);
};

export const updateProducto = async (id: string, producto: Partial<Producto>): Promise<void> => {
  return webDataAdapter.updateProducto(id, producto);
};

export const deleteProducto = async (id: string): Promise<void> => {
  return webDataAdapter.deleteProducto(id);
};

// ===== PROVEEDORES =====

export const getProveedores = async (): Promise<Proveedor[]> => {
  return webDataAdapter.getProveedores();
};

export const getProveedorById = async (id: string): Promise<Proveedor | null> => {
  return webDataAdapter.getProveedorById(id);
};

export const saveProveedor = async (proveedor: Omit<Proveedor, 'id'>): Promise<string> => {
  return webDataAdapter.saveProveedor(proveedor);
};

export const updateProveedor = async (id: string, proveedor: Partial<Proveedor>): Promise<void> => {
  return webDataAdapter.updateProveedor(id, proveedor);
};

export const deleteProveedor = async (id: string): Promise<void> => {
  return webDataAdapter.deleteProveedor(id);
};

// ===== TAREAS =====

export const getTareas = async (): Promise<Tarea[]> => {
  return webDataAdapter.getTareas();
};

export const getTareaById = async (id: string): Promise<Tarea | null> => {
  return webDataAdapter.getTareaById(id);
};

export const saveTarea = async (tarea: Omit<Tarea, 'id'>): Promise<string> => {
  return webDataAdapter.saveTarea(tarea);
};

export const updateTarea = async (id: string, tarea: Partial<Tarea>): Promise<void> => {
  return webDataAdapter.updateTarea(id, tarea);
};

export const deleteTarea = async (id: string): Promise<void> => {
  return webDataAdapter.deleteTarea(id);
};

// ===== USUARIOS =====

export const getUsers = async (): Promise<User[]> => {
  return webDataAdapter.getUsers();
};

export const saveUser = async (user: Omit<User, 'id'>): Promise<string> => {
  return webDataAdapter.saveUser(user);
};

export const updateUser = async (id: string, user: Partial<User>): Promise<void> => {
  return webDataAdapter.updateUser(id, user);
};

// ===== RECETAS DE COSTOS =====

export const getRecetasCostos = async (): Promise<RecetaCosto[]> => {
  return webDataAdapter.getRecetasCostos();
};

export const getRecetaCostoById = async (id: string): Promise<RecetaCosto | null> => {
  return webDataAdapter.getRecetaCostoById(id);
};

export const saveRecetaCosto = async (receta: Omit<RecetaCosto, 'id'>): Promise<string> => {
  return webDataAdapter.saveRecetaCosto(receta);
};

export const updateRecetaCosto = async (id: string, receta: Partial<RecetaCosto>): Promise<void> => {
  return webDataAdapter.updateRecetaCosto(id, receta);
};

export const deleteRecetaCosto = async (id: string): Promise<void> => {
  return webDataAdapter.deleteRecetaCosto(id);
};

// ===== MÉTODOS ESPECÍFICOS PARA WEB =====

// Obtener órdenes con información de proveedores resuelta
export const getOrdenesConProveedores = async (): Promise<(Orden & { proveedor?: Proveedor })[]> => {
  return webDataAdapter.getOrdenesConProveedores();
};

// Obtener productos con información de proveedores resuelta
export const getProductosConProveedores = async (): Promise<(Producto & { proveedor?: Proveedor })[]> => {
  return webDataAdapter.getProductosConProveedores();
};

// Obtener datos completos para el dashboard
export const getDashboardData = async () => {
  return webDataAdapter.getDashboardData();
};

// Obtener estadísticas del dashboard
export const getDashboardStats = async () => {
  return webDataAdapter.getDashboardStats();
};

// Buscar proveedor por ID
export const findProveedorById = async (proveedorId: string): Promise<Proveedor | null> => {
  return webDataAdapter.findProveedorById(proveedorId);
};

// Buscar producto por ID
export const findProductoById = async (productoId: string): Promise<Producto | null> => {
  return webDataAdapter.findProductoById(productoId);
};

// ===== LISTENERS EN TIEMPO REAL =====

export const onOrdenesChange = (callback: (ordenes: Orden[]) => void): (() => void) => {
  return webDataAdapter.onOrdenesChange(callback);
};

export const onProveedoresChange = (callback: (proveedores: Proveedor[]) => void): (() => void) => {
  return webDataAdapter.onProveedoresChange(callback);
};

export const onProductosChange = (callback: (productos: Producto[]) => void): (() => void) => {
  return webDataAdapter.onProductosChange(callback);
};

export const onTareasChange = (callback: (tareas: Tarea[]) => void): (() => void) => {
  return webDataAdapter.onTareasChange(callback);
};

// ===== EXPORTACIONES DE TIPOS =====

export type { Orden, Producto, Proveedor, Tarea, User, RecetaCosto };
