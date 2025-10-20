// Servicio de Firebase unificado para la app web
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { dataAccess } from '../../../shared/services/dataAccess';
import { auth } from '../../../shared/services/firebaseConfig';
import { Orden, Producto, Proveedor, RecetaCosto, Tarea, User } from '../../../shared/services/types';

// ===== AUTENTICACIÓN =====

// Función de login con Firebase
export const loginWithFirebase = async (email: string, password: string): Promise<User> => {
  try {
    console.log('🔐 Iniciando sesión con Firebase...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    console.log('✅ Usuario autenticado:', firebaseUser.email);
    
    // Obtener datos del usuario desde la base de datos
    const userData = await dataAccess.getUserByUid(firebaseUser.uid);
    
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
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    
    return await dataAccess.getUserByUid(firebaseUser.uid);
  } catch (error) {
    console.error('❌ Error obteniendo usuario actual:', error);
    return null;
  }
};

// Función para obtener usuario por UID
export const getUserByUid = async (uid: string): Promise<User | null> => {
  return dataAccess.getUserByUid(uid);
};

// ===== ÓRDENES =====

export const getOrdenes = async (): Promise<Orden[]> => {
  return dataAccess.getOrdenes();
};

export const getOrdenById = async (id: string): Promise<Orden | null> => {
  return dataAccess.getOrdenById(id);
};

export const saveOrden = async (orden: Omit<Orden, 'id'>): Promise<string> => {
  return dataAccess.saveOrden(orden);
};

export const updateOrden = async (id: string, orden: Partial<Orden>): Promise<void> => {
  return dataAccess.updateOrden(id, orden);
};

export const deleteOrden = async (id: string): Promise<void> => {
  return dataAccess.deleteOrden(id);
};

// ===== PRODUCTOS =====

export const getProductos = async (): Promise<Producto[]> => {
  return dataAccess.getProductos();
};

export const getProductoById = async (id: string): Promise<Producto | null> => {
  return dataAccess.getProductoById(id);
};

export const saveProducto = async (producto: Omit<Producto, 'id'>): Promise<string> => {
  return dataAccess.saveProducto(producto);
};

export const updateProducto = async (id: string, producto: Partial<Producto>): Promise<void> => {
  return dataAccess.updateProducto(id, producto);
};

export const deleteProducto = async (id: string): Promise<void> => {
  return dataAccess.deleteProducto(id);
};

// ===== PROVEEDORES =====

export const getProveedores = async (): Promise<Proveedor[]> => {
  return dataAccess.getProveedores();
};

export const getProveedorById = async (id: string): Promise<Proveedor | null> => {
  return dataAccess.getProveedorById(id);
};

export const saveProveedor = async (proveedor: Omit<Proveedor, 'id'>): Promise<string> => {
  return dataAccess.saveProveedor(proveedor);
};

export const updateProveedor = async (id: string, proveedor: Partial<Proveedor>): Promise<void> => {
  return dataAccess.updateProveedor(id, proveedor);
};

export const deleteProveedor = async (id: string): Promise<void> => {
  return dataAccess.deleteProveedor(id);
};

// ===== TAREAS =====

export const getTareas = async (): Promise<Tarea[]> => {
  return dataAccess.getTareas();
};

export const getTareaById = async (id: string): Promise<Tarea | null> => {
  return dataAccess.getTareaById(id);
};

export const saveTarea = async (tarea: Omit<Tarea, 'id'>): Promise<string> => {
  return dataAccess.saveTarea(tarea);
};

export const updateTarea = async (id: string, tarea: Partial<Tarea>): Promise<void> => {
  return dataAccess.updateTarea(id, tarea);
};

export const deleteTarea = async (id: string): Promise<void> => {
  return dataAccess.deleteTarea(id);
};

// ===== USUARIOS =====

export const getUsers = async (): Promise<User[]> => {
  return dataAccess.getUsers();
};

export const saveUser = async (user: Omit<User, 'id'>): Promise<string> => {
  return dataAccess.saveUser(user);
};

export const updateUser = async (id: string, user: Partial<User>): Promise<void> => {
  return dataAccess.updateUser(id, user);
};

// ===== RECETAS DE COSTOS =====

export const getRecetasCostos = async (): Promise<RecetaCosto[]> => {
  return dataAccess.getRecetasCostos();
};

export const getRecetaCostoById = async (id: string): Promise<RecetaCosto | null> => {
  return dataAccess.getRecetaCostoById(id);
};

export const saveRecetaCosto = async (receta: Omit<RecetaCosto, 'id'>): Promise<string> => {
  return dataAccess.saveRecetaCosto(receta);
};

export const updateRecetaCosto = async (id: string, receta: Partial<RecetaCosto>): Promise<void> => {
  return dataAccess.updateRecetaCosto(id, receta);
};

export const deleteRecetaCosto = async (id: string): Promise<void> => {
  return dataAccess.deleteRecetaCosto(id);
};

// ===== FUNCIONES ESPECÍFICAS PARA WEB =====

// Obtener datos completos para el dashboard
export const getDashboardData = async () => {
  return dataAccess.getDashboardData();
};

// Obtener estadísticas del dashboard
export const getDashboardStats = async () => {
  return dataAccess.getDashboardStats();
};

// Obtener órdenes con información de proveedores resuelta
export const getOrdenesConProveedores = async (): Promise<(Orden & { proveedor?: Proveedor })[]> => {
  return dataAccess.getOrdenesConProveedores();
};

// Obtener productos con información de proveedores resuelta
export const getProductosConProveedores = async (): Promise<(Producto & { proveedor?: Proveedor })[]> => {
  return dataAccess.getProductosConProveedores();
};

// Buscar proveedor por ID
export const findProveedorById = async (proveedorId: string): Promise<Proveedor | null> => {
  return dataAccess.findProveedorById(proveedorId);
};

// Buscar producto por ID
export const findProductoById = async (productoId: string): Promise<Producto | null> => {
  return dataAccess.findProductoById(productoId);
};

// ===== LISTENERS EN TIEMPO REAL =====

export const onOrdenesChange = (callback: (ordenes: Orden[]) => void): (() => void) => {
  return dataAccess.onOrdenesChange(callback);
};

export const onProveedoresChange = (callback: (proveedores: Proveedor[]) => void): (() => void) => {
  return dataAccess.onProveedoresChange(callback);
};

export const onProductosChange = (callback: (productos: Producto[]) => void): (() => void) => {
  return dataAccess.onProductosChange(callback);
};

export const onTareasChange = (callback: (tareas: Tarea[]) => void): (() => void) => {
  return dataAccess.onTareasChange(callback);
};

// ===== EXPORTACIONES DE TIPOS =====

export type { Orden, Producto, Proveedor, RecetaCosto, Tarea, User };
