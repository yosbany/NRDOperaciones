// Importación de Firebase para web
import { User as FirebaseAuthUser, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { get, onValue, push, ref, remove, set, update } from 'firebase/database';
import { auth, database } from './firebaseConfig';

// Interfaces de usuario (mismas que la app móvil)
export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  role?: string;
  contactId?: string;
  createdAt: string;
  updatedAt: string;
}

// Modelos de datos (mismos que la app móvil)
export interface Orden {
  id: string;
  proveedorId: string;
  proveedorNombre: string;
  fecha: string;
  tipo?: string;
  estado: string;
  productos: ProductoOrden[];
  total: number;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductoOrden {
  id?: string;
  productoId?: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  precio: number;
  subtotal: number;
}

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  unidad: string;
  proveedorId: string;
  proveedorNombre: string;
  orden: number;
  archivado: boolean;
  fueraDeTemporada?: boolean;
  fueraDeTemporadaHasta?: string;
  costoTotal?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  celular?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  frecuencia?: {
    tipo: string;
    valor: string;
    diaSemana?: string;
    diaMes?: string;
    diasSemana?: string[];
  };
  tipo?: string;
  salarioPorDia?: number;
  productosDefault?: Array<{
    productoId: string;
    cantidad: string;
    unidad: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  prioridad: 'alta' | 'media' | 'baja';
  completada: boolean;
  asignadaA: string;
  usuarioAsignado: string;
  observacion?: string;
  fechaCompletada?: string;
  seguidores?: string[];
  publica?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IngredienteCosto {
  nombre: string;
  cantidad: number;
  unidad: string;
  precio: number;
}

export interface RecetaCosto {
  id: string;
  nombre: string;
  descripcion?: string;
  ingredientes: IngredienteCosto[];
  createdAt: string;
  updatedAt: string;
}

// Roles de usuario
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  PRODUCTOR: 'PRODUCTOR'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// ===== FUNCIONES DE DATOS =====

export const getOrdenes = (callback: (ordenes: Orden[]) => void) => {
  const ordenesRef = ref(database, 'ordenes');
  onValue(ordenesRef, (snapshot) => {
    const data = snapshot.val();
    const ordenes = data ? Object.entries(data).map(([id, orden]: [string, any]) => ({ ...orden, id })) : [];
    callback(ordenes);
  });
};

export const saveOrden = async (orden: Omit<Orden, 'id'>) => {
  const ordenesRef = ref(database, 'ordenes');
  const nuevaOrdenRef = push(ordenesRef);
  const id = nuevaOrdenRef.key!;
  const ordenConId = { ...orden, id };
  await set(nuevaOrdenRef, ordenConId);
  return id;
};

export const updateOrden = async (id: string, orden: Orden) => {
  const ordenRef = ref(database, 'ordenes/' + id);
  await set(ordenRef, orden);
};

export const deleteOrden = (id: string) => {
  const ordenRef = ref(database, 'ordenes/' + id);
  return remove(ordenRef);
};

export const getProveedores = (callback: (proveedores: Proveedor[]) => void) => {
  const proveedoresRef = ref(database, 'proveedores');
  onValue(proveedoresRef, (snapshot) => {
    const data = snapshot.val();
    const proveedores = data ? Object.entries(data).map(([id, v]: any) => ({ id, ...v })) : [];
    callback(proveedores);
  });
};

export const saveProveedor = (proveedor: Omit<Proveedor, 'id'>) => {
  const proveedoresRef = ref(database, 'proveedores');
  const nuevoProveedorRef = push(proveedoresRef);
  const id = nuevoProveedorRef.key!;
  set(nuevoProveedorRef, { ...proveedor, id });
  return id;
};

export const updateProveedor = (id: string, proveedor: Proveedor) => {
  const proveedorRef = ref(database, 'proveedores/' + id);
  return set(proveedorRef, proveedor);
};

export const deleteProveedor = (id: string) => {
  const proveedorRef = ref(database, 'proveedores/' + id);
  return remove(proveedorRef);
};

export const getProductos = (callback: (productos: Producto[]) => void) => {
  const productosRef = ref(database, 'productos');
  onValue(productosRef, (snapshot) => {
    const data = snapshot.val();
    const productos = data ? Object.entries(data).map(([id, v]: any) => ({ id, ...v })) : [];
    callback(productos);
  });
};

export const saveProducto = (producto: Omit<Producto, 'id'>) => {
  const productosRef = ref(database, 'productos');
  const nuevoProductoRef = push(productosRef);
  const id = nuevoProductoRef.key!;
  set(nuevoProductoRef, { ...producto, id });
  return id;
};

export const updateProducto = (id: string, producto: Producto) => {
  const productoRef = ref(database, 'productos/' + id);
  return update(productoRef, producto);
};

export const deleteProducto = (id: string) => {
  const productoRef = ref(database, 'productos/' + id);
  return remove(productoRef);
};

export const getTareas = (callback: (tareas: Tarea[]) => void) => {
  const tareasRef = ref(database, 'tareas');
  onValue(tareasRef, (snapshot) => {
    const data = snapshot.val();
    const tareas = data ? Object.entries(data).map(([id, tarea]: [string, any]) => ({ ...tarea, id })) : [];
    callback(tareas);
  });
};

export const saveTarea = async (tarea: Omit<Tarea, 'id'>): Promise<string> => {
  const tareasRef = ref(database, 'tareas');
  const nuevaTareaRef = push(tareasRef);
  const id = nuevaTareaRef.key!;
  
  const tareaConId = {
    ...tarea,
    id,
    publica: tarea.publica !== undefined ? tarea.publica : true,
    seguidores: tarea.seguidores || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await set(nuevaTareaRef, tareaConId);
  return id;
};

export const updateTarea = async (id: string, tarea: Partial<Tarea>): Promise<void> => {
  const tareaRef = ref(database, `tareas/${id}`);
  
  const updates = {
    ...tarea,
    updatedAt: new Date().toISOString()
  };
  
  await update(tareaRef, updates);
};

export const deleteTarea = async (id: string): Promise<void> => {
  const tareaRef = ref(database, `tareas/${id}`);
  await remove(tareaRef);
};

// ===== FUNCIONES DE AUTENTICACIÓN =====

export const getUserByUid = async (uid: string): Promise<User | null> => {
  try {
    const usersRef = ref(database, `users/${uid}`);
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const userData = snapshot.val();
    const user: User = { 
      id: uid, 
      username: userData.username,
      email: userData.email,
      displayName: userData.displayName || undefined,
      role: userData.role || undefined,
      contactId: userData.contactId || undefined,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt
    };
    
    return user;
  } catch (error) {
    console.error('❌ Error en getUserByUid:', error);
    throw error;
  }
};

export const createUserInDatabase = async (firebaseUser: FirebaseAuthUser): Promise<string> => {
  try {
    const usersRef = ref(database, `users/${firebaseUser.uid}`);
    const now = new Date().toISOString();
    
    const username = firebaseUser.email?.split('@')[0] || firebaseUser.uid;
    
    const user: any = {
      id: firebaseUser.uid,
      username: username,
      email: firebaseUser.email || '',
      createdAt: now,
      updatedAt: now
    };
    
    await set(usersRef, user);
    return firebaseUser.uid;
  } catch (error) {
    console.error('❌ Error creando usuario en base de datos:', error);
    throw error;
  }
};

export const loginWithFirebase = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    let userData = await getUserByUid(firebaseUser.uid);
    
    if (!userData) {
      await createUserInDatabase(firebaseUser);
      userData = await getUserByUid(firebaseUser.uid);
      
      if (!userData) {
        throw new Error('Error al crear usuario en base de datos');
      }
    }
    
    return userData;
  } catch (error: any) {
    console.error('❌ Error en login:', error);
    
    if (error.code === 'auth/user-not-found') {
      throw new Error('Usuario no encontrado. Verifica que el usuario esté creado en Firebase Authentication.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Contraseña incorrecta.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Email inválido.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Demasiados intentos fallidos. Intenta más tarde.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Error de conexión. Verifica tu conexión a internet.');
    } else {
      throw new Error(error.message || 'Error de autenticación');
    }
  }
};

export const logoutFromFirebase = async (): Promise<void> => {
  try {
    await signOut(auth);
    console.log('✅ Usuario desautenticado de Firebase');
  } catch (error) {
    console.error('❌ Error al cerrar sesión:', error);
    throw error;
  }
};

// ===== FUNCIONES DE PERMISOS =====

export const hasPermission = (user: User, requiredRole: UserRole): boolean => {
  if (user.role === USER_ROLES.ADMIN) return true;
  return user.role === requiredRole;
};

export const canAccessTab = (user: User, tabName: string): boolean => {
  if (!user.role) {
    return false;
  }

  switch (tabName) {
    case 'index':
      return true;
    case 'ordenes':
      return true;
    case 'contactos':
      return user.role === USER_ROLES.ADMIN;
    case 'productos':
      return user.role === USER_ROLES.ADMIN;
    default:
      return false;
  }
};

// ===== FUNCIONES DE FILTRADO POR ROL =====

export const getOrdenesByUserRole = (user: User, callback: (ordenes: Orden[]) => void) => {
  const ordenesRef = ref(database, 'ordenes');
  
  const processOrdenes = (data: any) => {
    let ordenes = data ? Object.entries(data).map(([id, v]: any) => ({ id, ...v })) : [];
    
    if (!user.role) {
      callback([]);
      return;
    }
    
    if (user.role === USER_ROLES.PRODUCTOR && user.contactId) {
      ordenes = ordenes.filter((orden: Orden) => orden.proveedorId === user.contactId);
    }
    
    callback(ordenes);
  };
  
  onValue(ordenesRef, (snapshot) => {
    const data = snapshot.val();
    processOrdenes(data);
  });
};

export const getTareasByUserRole = (user: User, filtro: 'mis' | 'todas', callback: (tareas: Tarea[]) => void) => {
  const tareasRef = ref(database, 'tareas');
  
  const processTareas = (data: any) => {
    let tareas = data ? Object.entries(data).map(([id, tarea]: any) => ({ id, ...tarea })) : [];
    
    if (!user.role) {
      callback([]);
      return;
    }
    
    if (user.role === USER_ROLES.ADMIN) {
      if (filtro === 'mis') {
        tareas = tareas.filter(tarea => tarea.asignadaA === user.id);
      }
    } else {
      tareas = tareas.filter(tarea => tarea.asignadaA === user.id);
    }
    
    tareas.sort((a, b) => {
      if (a.completada && !b.completada) return 1;
      if (!a.completada && b.completada) return -1;
      return 0;
    });
    
    callback(tareas);
  };
  
  onValue(tareasRef, (snapshot) => {
    const data = snapshot.val();
    processTareas(data);
  });
};

// Funciones para Recetas de Costos
export const getRecetasCostos = (callback: (recetas: RecetaCosto[]) => void) => {
  const recetasRef = ref(database, 'recetasCostos');
  
  const processRecetas = (data: any) => {
    if (!data) {
      callback([]);
      return;
    }
    
    const recetas: RecetaCosto[] = Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    }));
    
    callback(recetas);
  };
  
  onValue(recetasRef, (snapshot) => {
    const data = snapshot.val();
    processRecetas(data);
  });
};

export const saveRecetaCosto = async (receta: Omit<RecetaCosto, 'id'>): Promise<string> => {
  try {
    const recetasRef = ref(database, 'recetasCostos');
    const newRecetaRef = push(recetasRef);
    
    await set(newRecetaRef, {
      ...receta,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return newRecetaRef.key!;
  } catch (error) {
    console.error('Error guardando receta:', error);
    throw error;
  }
};

export const updateRecetaCosto = async (id: string, updates: Partial<RecetaCosto>): Promise<void> => {
  try {
    const recetaRef = ref(database, `recetasCostos/${id}`);
    await update(recetaRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error actualizando receta:', error);
    throw error;
  }
};

export const deleteRecetaCosto = async (id: string): Promise<void> => {
  try {
    const recetaRef = ref(database, `recetasCostos/${id}`);
    await remove(recetaRef);
  } catch (error) {
    console.error('Error eliminando receta:', error);
    throw error;
  }
};
