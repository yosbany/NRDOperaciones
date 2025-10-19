// Importación condicional de notificaciones para compatibilidad con Expo Go
import { User as FirebaseAuthUser, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { push as dbPush, ref as dbRef, set as dbSet, get, off, onValue, push, ref, remove, set, update } from 'firebase/database';
import { USER_ROLES, UserRole } from '../constants/Config';
import { clearAuthState, saveAuthState, saveUserData } from './authStorage';
import { auth, database } from './firebaseConfig';
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (error) {
  console.warn('⚠️ expo-notifications no disponible en Expo Go. Se deshabilitarán las notificaciones push.');
}

// Verificar que Firebase esté inicializado correctamente
console.log('🔥 Firebase Auth inicializado:', !!auth);
console.log('🔥 Firebase Database inicializado:', !!database);

// Interfaces de usuario
export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string; // Nombre para mostrar (opcional)
  role?: UserRole; // Rol opcional, puede ser undefined hasta que se asigne
  contactId?: string; // ID del contacto asociado (solo para PRODUCTOR)
  createdAt: string;
  updatedAt: string;
}

// Modelos de datos
export interface Orden {
  id: string;
  proveedorId: string;
  proveedorNombre: string;
  fecha: string;
  tipo?: string; // 'Normal', 'Producción', etc.
  estado: string;
  productos: ProductoOrden[];
  total: number;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductoOrden {
  id?: string;           // Nueva estructura
  productoId?: string;   // Estructura antigua (compatibilidad)
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
  fueraDeTemporada?: boolean; // Si está fuera de temporada
  fueraDeTemporadaHasta?: string; // Fecha hasta cuando está fuera de temporada (ISO string)
  costoTotal?: number; // Costo total calculado de la receta
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
  }>; // Lista de productos predeterminados para clientes
  createdAt: string;
  updatedAt: string;
}

export interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  prioridad: 'alta' | 'media' | 'baja';
  completada: boolean;
  asignadaA: string; // ID del usuario asignado (UID de Firebase)
  usuarioAsignado: string; // Nombre del usuario asignado
  observacion?: string;
  fechaCompletada?: string;
  seguidores?: string[]; // Array de IDs de usuarios que pueden seguir la tarea
  publica?: boolean; // Si es true, todos pueden verla. Si es false, solo los seguidores
  createdAt: string;
  updatedAt: string;
}

// Interfaces para el sistema de costos de productos
export interface IngredienteCosto {
  id: string;
  tipo: 'producto' | 'personalizado'; // Si es un producto existente o línea personalizada
  productoId?: string; // ID del producto si tipo es 'producto'
  nombre: string; // Nombre del ingrediente
  cantidad: number; // Cantidad utilizada en la receta
  unidad: string; // Unidad de la cantidad (gr, ml, etc.)
  precioUnitario?: number; // Precio por unidad del producto (si es producto existente)
  porcentaje?: number; // Porcentaje del precio unitario (ej: 10% si se usa 100gr de 1kg)
  costo: number; // Costo calculado (precioUnitario * porcentaje o precio personalizado)
  observaciones?: string;
}

export interface RecetaCosto {
  id: string;
  productoId: string; // ID del producto al que pertenece esta receta
  nombre: string; // Nombre del producto
  ingredientes: IngredienteCosto[];
  costoTotal: number; // Suma de todos los costos de ingredientes
  rendimiento?: number; // Cantidad de producto final que produce esta receta
  costoPorUnidad?: number; // Costo total dividido por rendimiento
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}

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
  
  // Enviar notificación push SIEMPRE (app abierta o cerrada)
  try {
    await notifyNewOrderToAllUsers(ordenConId, orden.proveedorNombre);
    console.log('✅ Push notification enviada para nueva orden');
  } catch (error) {
    console.warn('⚠️ Error enviando notificación push de nueva orden:', error);
  }
  
  // Generar órdenes de producción automáticamente si es una orden de cliente
  try {
    await generarOrdenesProduccion(ordenConId);
  } catch (error) {
    console.warn('⚠️ Error generando órdenes de producción:', error);
  }
  
  return id;
};

export const updateOrden = async (id: string, orden: Orden) => {
  const ordenRef = ref(database, 'ordenes/' + id);
  await set(ordenRef, orden);
  
  // Enviar notificación inteligente de orden actualizada
  try {
    const NotificationManager = (await import('./notificationManager')).default;
    const notificationManager = NotificationManager.getInstance();
    await notificationManager.notifyOrderUpdated(orden, auth.currentUser?.uid);
    console.log('✅ Notificación inteligente enviada para orden actualizada');
  } catch (error) {
    console.warn('⚠️ Error enviando notificación inteligente de orden actualizada:', error);
  }
  
  // Enviar notificación push si se actualiza a estado pendiente (compatibilidad)
  if (orden.estado === 'PENDIENTE') {
    try {
      await notifyNewOrderToAllUsers(orden, orden.proveedorNombre);
      console.log('✅ Push notification enviada para orden actualizada a pendiente');
    } catch (error) {
      console.warn('⚠️ Error enviando notificación push de orden actualizada:', error);
    }
  }
  
  // Actualizar órdenes de producción automáticamente si es una orden de cliente
  try {
    await actualizarOrdenesProduccion(orden);
  } catch (error) {
    console.warn('⚠️ Error actualizando órdenes de producción:', error);
  }
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

/**
 * Registra un evento en la colección 'eventos' de Firebase
 * @param {Object} params
 * @param {string} params.tipoEvento - Tipo de evento (creacion, actualizacion, eliminacion, envio_whatsapp, impresion, etc)
 * @param {string} params.responsable - Nombre del responsable
 * @param {string} params.idAfectado - ID (firebaseKey) del objeto afectado
 * @param {any} [params.datosJSON] - Datos relevantes (opcional)
 */
export const logEvento = async ({ tipoEvento, responsable, idAfectado, datosJSON }: { tipoEvento: string, responsable: string, idAfectado: string, datosJSON?: any }) => {
  const eventosRef = dbRef(database, 'eventos');
  const nuevoEventoRef = dbPush(eventosRef);
  const fechaCompleta = new Date().toISOString();
  const evento = {
    fecha: fechaCompleta,
    tipoEvento,
    responsable,
    idAfectado,
    datosJSON: datosJSON ? JSON.stringify(datosJSON) : null,
  };
  await dbSet(nuevoEventoRef, evento);
};


/**
 * Actualiza el campo 'orden' de muchos productos en un solo request (batch) en Realtime Database.
 * @param {Array<{id: string, orden: number}>} productos
 */
export const updateProductosOrdenBatch = async (productos: {id: string, orden: number}[]) => {
  const updates: any = {};
  productos.forEach((producto) => {
    updates[`/productos/${producto.id}/orden`] = producto.orden;
  });
  await update(ref(database), updates);
};

// ===== FUNCIONES DE AUTENTICACIÓN Y USUARIOS =====

/**
 * Obtiene un usuario por su UID de Firebase Auth
 * @param uid - UID del usuario de Firebase Auth
 * @returns Promise<User | null>
 */
export const getUserByUid = async (uid: string): Promise<User | null> => {
  try {
    console.log('🔍 getUserByUid - Buscando usuario con UID:', uid);
    console.log('🔍 Timestamp de búsqueda:', new Date().toISOString());
    const usersRef = ref(database, `users/${uid}`);
    console.log('🔍 Ruta de búsqueda:', `users/${uid}`);
    
    const snapshot = await get(usersRef);
    console.log('🔍 Snapshot existe:', snapshot.exists());
    console.log('🔍 Snapshot key:', snapshot.key);
    console.log('🔍 Snapshot val:', snapshot.val());
    
    if (!snapshot.exists()) {
      console.log('❌ Usuario no encontrado en base de datos');
      console.log('🔍 Verificando si el usuario existe en otras rutas...');
      
      // Verificar si el usuario existe en alguna otra ruta
      try {
        const allUsersRef = ref(database, 'users');
        const allUsersSnapshot = await get(allUsersRef);
        if (allUsersSnapshot.exists()) {
          const allUsers = allUsersSnapshot.val();
          const userExists = Object.keys(allUsers).includes(uid);
          console.log('🔍 Usuario existe en la colección general:', userExists);
          if (userExists) {
            console.log('🔍 Datos del usuario en colección general:', allUsers[uid]);
          }
        }
      } catch (checkError) {
        console.warn('⚠️ Error verificando existencia del usuario:', checkError);
      }
      
      return null;
    }
    
    const userData = snapshot.val();
    console.log('🔍 Datos del usuario encontrado:', userData);
    console.log('🔍 displayName en userData:', userData.displayName);
    console.log('🔍 role en userData:', userData.role);
    console.log('🔍 email en userData:', userData.email);
    
    const user: User = { 
      id: uid, 
      username: userData.username,
      email: userData.email,
      displayName: userData.displayName || undefined, // Incluir displayName
      role: userData.role || undefined, // Manejar caso donde role no existe
      contactId: userData.contactId || undefined,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt
    };
    
    console.log('🔍 Usuario construido:', user);
    console.log('🔍 displayName en user construido:', user.displayName);
    return user;
  } catch (error) {
    console.error('❌ Error en getUserByUid:', error);
    console.error('❌ Stack trace:', (error as any).stack);
    throw error;
  }
};

/**
 * Obtiene un usuario por su username (para compatibilidad)
 * @param username - Nombre de usuario
 * @returns Promise<User | null>
 */
export const getUserByUsername = async (username: string): Promise<User | null> => {
  const usersRef = ref(database, 'users');
  const snapshot = await get(usersRef);
  
  if (!snapshot.exists()) return null;
  
  const users = snapshot.val();
  const userEntry = Object.entries(users).find(([_, user]: any) => user.username === username);
  
  if (!userEntry) return null;
  
  const [id, userData] = userEntry;
  const userDataTyped = userData as any;
  return { 
    id, 
    username: userDataTyped.username,
    email: userDataTyped.email,
    displayName: userDataTyped.displayName || undefined, // Incluir displayName
    role: userDataTyped.role,
    contactId: userDataTyped.contactId,
    createdAt: userDataTyped.createdAt,
    updatedAt: userDataTyped.updatedAt
  } as User;
};

/**
 * Crea un nuevo usuario en la base de datos (llamado automáticamente después del primer login)
 * @param firebaseUser - Usuario de Firebase Auth
 * @returns Promise<string> - ID del usuario creado
 */
export const createUserInDatabase = async (firebaseUser: FirebaseAuthUser): Promise<string> => {
  try {
    console.log('📝 Creando usuario en base de datos...');
    console.log('🆔 UID:', firebaseUser.uid);
    console.log('📧 Email:', firebaseUser.email);
    
    // Obtener el token de autenticación para verificar permisos
    const idToken = await firebaseUser.getIdToken();
    console.log('🔑 Token de autenticación obtenido:', !!idToken);
    
    // Verificar que el usuario tenga un UID válido
    if (!firebaseUser.uid) {
      throw new Error('Usuario no tiene UID válido');
    }
    
    // Verificar el estado de autenticación
    console.log('🔐 Verificando estado de autenticación...');
    console.log('🔐 firebaseUser.uid:', firebaseUser.uid);
    console.log('🔐 auth.currentUser?.uid:', auth.currentUser?.uid);
    console.log('🔐 ¿Son iguales?:', firebaseUser.uid === auth.currentUser?.uid);
    
    // Usar directamente el firebaseUser que viene del login exitoso
    console.log('🔐 Usando firebaseUser directamente para la operación');
    
    // Crear la referencia a la base de datos
    const usersRef = ref(database, `users/${firebaseUser.uid}`);
    const now = new Date().toISOString();
    
    // Extraer username del email (antes del @)
    const username = firebaseUser.email?.split('@')[0] || firebaseUser.uid;
    console.log('👤 Username extraído:', username);
    
    const user: any = {
      id: firebaseUser.uid,
      username: username,
      email: firebaseUser.email || '',
      // No incluir role si es undefined para evitar errores de Firebase
      createdAt: now,
      updatedAt: now
    };
    
    console.log('💾 Guardando usuario en base de datos...');
    console.log('📊 Datos del usuario:', JSON.stringify(user, null, 2));
    console.log('🔐 Ruta de base de datos:', `users/${firebaseUser.uid}`);
    
    // Intentar escribir en la base de datos con manejo de errores específico
    try {
      // Forzar la autenticación antes de escribir
      console.log('🔐 Forzando autenticación antes de escribir...');
      await firebaseUser.getIdToken(true); // Force refresh
      
      await set(usersRef, user);
      console.log('✅ Usuario creado en base de datos:', firebaseUser.uid);
    } catch (writeError: any) {
      console.error('❌ Error específico al escribir en Firebase:', writeError);
      console.error('❌ Código de error de escritura:', writeError.code);
      console.error('❌ Mensaje de error de escritura:', writeError.message);
      
      // Si hay error de permisos, intentar con una ruta diferente o formato diferente
      if (writeError.code === 'PERMISSION_DENIED') {
        console.log('🔄 Reintentando con formato diferente...');
        const simpleUser = {
          username: username,
          email: firebaseUser.email || '',
          createdAt: now
        };
        await set(usersRef, simpleUser);
        console.log('✅ Usuario creado con formato simplificado');
      } else {
        throw writeError;
      }
    }
    return firebaseUser.uid;
  } catch (error) {
    console.error('❌ Error creando usuario en base de datos:', error);
    console.error('❌ Tipo de error:', typeof error);
    console.error('❌ Código de error:', (error as any).code);
    console.error('❌ Mensaje de error:', (error as any).message);
    throw error;
  }
};

/**
 * Actualiza un usuario existente
 * @param uid - UID del usuario
 * @param userData - Datos a actualizar
 */
export const updateUser = async (uid: string, userData: Partial<User>): Promise<void> => {
  const userRef = ref(database, `users/${uid}`);
  const updates: any = {
    updatedAt: new Date().toISOString()
  };
  
  if (userData.username !== undefined) updates.username = userData.username;
  if (userData.email !== undefined) updates.email = userData.email;
  if (userData.role !== undefined) updates.role = userData.role;
  if (userData.contactId !== undefined) updates.contactId = userData.contactId;
  
  await update(userRef, updates);
};

/**
 * Login con Firebase Authentication
 * @param email - Email del usuario
 * @param password - Contraseña del usuario
 * @returns Promise<User> - Datos del usuario
 */
export const loginWithFirebase = async (email: string, password: string): Promise<User> => {
  try {
    console.log('🔐 Intentando login con Firebase Auth...');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password ? '***' : 'vacío');
    
    // Intentar login con Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    console.log('✅ Login exitoso con Firebase Auth');
    console.log('🆔 UID:', firebaseUser.uid);
    console.log('📧 Email verificado:', firebaseUser.email);
    
    // Verificar estado de autenticación inmediatamente después del login
    console.log('🔐 Estado de auth.currentUser después del login:', auth.currentUser?.uid);
    console.log('🔐 ¿Usuario autenticado?:', !!auth.currentUser);
    
    // Verificar si el usuario existe en la base de datos
    console.log('🔍 Verificando si existe en base de datos...');
    let userData = await getUserByUid(firebaseUser.uid);
    
    if (userData) {
      console.log('✅ Usuario encontrado en base de datos');
      console.log('👤 Rol:', userData.role);
      console.log('📞 ContactId:', userData.contactId || 'No asignado');
    } else {
      console.log('🆕 Usuario nuevo detectado, creando en base de datos...');
      
      // Verificar estado de autenticación antes de crear el usuario
      console.log('🔐 Estado de auth.currentUser antes de crear:', auth.currentUser?.uid);
      console.log('🔐 Estado de firebaseUser:', firebaseUser.uid);
      
      // Agregar un delay más largo para asegurar que la autenticación esté establecida
      console.log('⏳ Esperando 2 segundos para estabilizar autenticación...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar estado de autenticación después del delay
      console.log('🔐 Estado de auth.currentUser después del delay:', auth.currentUser?.uid);
      console.log('🔐 Estado de firebaseUser después del delay:', firebaseUser.uid);
      
      console.log('🚀 Intentando crear usuario en base de datos...');
      await createUserInDatabase(firebaseUser);
      
      console.log('🔍 Verificando que el usuario se creó correctamente...');
      userData = await getUserByUid(firebaseUser.uid);
      
      if (!userData) {
        throw new Error('Error al crear usuario en base de datos');
      }
      console.log('✅ Usuario creado exitosamente en base de datos');
    }
    
    // Guardar estado de autenticación y datos del usuario
    try {
      await saveAuthState(true);
      await saveUserData(userData);
      console.log('💾 Estado de autenticación y datos del usuario guardados');
    } catch (storageError) {
      console.warn('⚠️ Error guardando estado de autenticación:', storageError);
      // No fallar el login por errores de almacenamiento
    }
    
    return userData;
  } catch (error: any) {
    console.error('❌ Error en login:', error);
    console.error('❌ Código de error:', error.code);
    console.error('❌ Mensaje de error:', error.message);
    
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

/**
 * Logout de Firebase Authentication
 */
export const logoutFromFirebase = async (): Promise<void> => {
  try {
    await signOut(auth);
    
    // Limpiar estado de autenticación guardado
    try {
      await clearAuthState();
      console.log('🧹 Estado de autenticación limpiado del almacenamiento local');
    } catch (storageError) {
      console.warn('⚠️ Error limpiando estado de autenticación:', storageError);
      // No fallar el logout por errores de almacenamiento
    }
    
    console.log('✅ Usuario desautenticado de Firebase');
  } catch (error) {
    console.error('❌ Error al cerrar sesión:', error);
    throw error;
  }
};

/**
 * Función de diagnóstico para verificar el estado de un usuario específico
 * @param uid - UID del usuario a diagnosticar
 */
export const diagnosticarUsuario = async (uid: string): Promise<void> => {
  try {
    console.log('🔍 === DIAGNÓSTICO DE USUARIO ===');
    console.log('🔍 UID a diagnosticar:', uid);
    console.log('🔍 Timestamp:', new Date().toISOString());
    
    // 1. Verificar estado de Firebase Auth
    console.log('🔍 1. Estado de Firebase Auth:');
    console.log('🔍 auth.currentUser?.uid:', auth.currentUser?.uid);
    console.log('🔍 auth.currentUser?.email:', auth.currentUser?.email);
    console.log('🔍 ¿UID coincide?:', auth.currentUser?.uid === uid);
    
    // 2. Verificar en base de datos
    console.log('🔍 2. Verificando en Firebase Database:');
    const userData = await getUserByUid(uid);
    console.log('🔍 Usuario encontrado en DB:', !!userData);
    if (userData) {
      console.log('🔍 Datos del usuario:', userData);
    }
    
    // 3. Verificar en AsyncStorage
    console.log('🔍 3. Verificando en AsyncStorage:');
    try {
      const { getUserData } = await import('./authStorage');
      const storedData = await getUserData();
      console.log('🔍 Datos guardados localmente:', !!storedData);
      if (storedData) {
        console.log('🔍 UID guardado:', storedData.id);
        console.log('🔍 ¿UID coincide?:', storedData.id === uid);
      }
    } catch (storageError) {
      console.warn('⚠️ Error verificando AsyncStorage:', storageError);
    }
    
    // 4. Verificar todas las rutas posibles en la base de datos
    console.log('🔍 4. Verificando todas las rutas en DB:');
    try {
      const allUsersRef = ref(database, 'users');
      const allUsersSnapshot = await get(allUsersRef);
      if (allUsersSnapshot.exists()) {
        const allUsers = allUsersSnapshot.val();
        const userKeys = Object.keys(allUsers);
        console.log('🔍 Total de usuarios en DB:', userKeys.length);
        console.log('🔍 UIDs en DB:', userKeys);
        console.log('🔍 ¿UID existe en DB?:', userKeys.includes(uid));
        
        if (userKeys.includes(uid)) {
          console.log('🔍 Datos del usuario en DB:', allUsers[uid]);
        }
      } else {
        console.log('🔍 No hay usuarios en la base de datos');
      }
    } catch (dbError) {
      console.error('❌ Error verificando base de datos:', dbError);
    }
    
    console.log('🔍 === FIN DIAGNÓSTICO ===');
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
};

// ==================== TAREAS ====================

/**
 * Obtiene todos los usuarios disponibles para asignación
 * @param callback - Callback con los usuarios
 */
export const getUsuariosParaAsignacion = (callback: (usuarios: { id: string, nombre: string, role: string }[]) => void) => {
  const usuariosRef = ref(database, 'users');
  
  // Función para procesar los datos de usuarios
  const processUsuarios = (data: any) => {
    const usuarios = data ? Object.entries(data).map(([id, user]: [string, any]) => ({ 
      id, 
      nombre: user.displayName || user.username || user.email, 
      role: user.role || 'Sin rol'
    })) : [];
    
    // Filtrar para excluir usuarios con username "admin"
    const usuariosFiltrados = usuarios.filter(usuario => {
      const userData = data[usuario.id];
      return userData.username !== 'admin';
    });
    
    callback(usuariosFiltrados);
  };
  
  // Verificar si Firebase Auth está autenticado
  if (!auth.currentUser) {
    console.log('⚠️ Firebase Auth no autenticado, esperando autenticación...');
    // Esperar a que Firebase Auth se sincronice
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log('✅ Firebase Auth sincronizado, cargando usuarios...');
        unsubscribe(); // Limpiar el listener
        // Usar onValue() ahora que Firebase Auth está autenticado
        onValue(usuariosRef, (snapshot) => {
          const data = snapshot.val();
          processUsuarios(data);
        });
      }
    });
    return;
  }
  
  // Usar onValue() cuando Firebase Auth está autenticado (comportamiento normal)
  onValue(usuariosRef, (snapshot) => {
    const data = snapshot.val();
    processUsuarios(data);
  });
};

/**
 * Obtiene todas las tareas
 * @param callback - Callback con las tareas
 */
export const getTareas = (callback: (tareas: Tarea[]) => void) => {
  const tareasRef = ref(database, 'tareas');
  onValue(tareasRef, (snapshot) => {
    const data = snapshot.val();
    const tareas = data ? Object.entries(data).map(([id, tarea]: [string, any]) => ({ ...tarea, id })) : [];
    callback(tareas);
  });
};

/**
 * Obtiene tareas filtradas por usuario
 * @param user - Usuario autenticado
 * @param filtro - 'mis' para solo las asignadas al usuario, 'todas' para todas
 * @param callback - Callback con las tareas filtradas
 */
export const getTareasByUserRole = (user: User, filtro: 'mis' | 'todas', callback: (tareas: Tarea[]) => void) => {
  const tareasRef = ref(database, 'tareas');
  
  // Función para procesar los datos de tareas
  const processTareas = (data: any) => {
    let tareas = data ? Object.entries(data).map(([id, tarea]: any) => ({ id, ...tarea })) : [];
    
    console.log('🔍 getTareasByUserRole - Usuario:', {
      userId: user.id,
      role: user.role,
      filtro: filtro,
      totalTareas: tareas.length
    });
    
    // Si el usuario no tiene rol definido, no mostrar tareas
    if (!user.role) {
      console.log('⚠️ Usuario sin rol, no mostrando tareas');
      callback([]);
      return;
    }
    
    // Filtrar tareas según el rol del usuario y el filtro seleccionado
    if (user.role === USER_ROLES.ADMIN) {
      if (filtro === 'mis') {
        // Solo tareas asignadas al usuario admin actual
        tareas = tareas.filter(tarea => tarea.asignadaA === user.id);
      } else if (filtro === 'todas') {
        // Para admin, mostrar todas las tareas que puede ver
        tareas = tareas.filter(tarea => {
          // Si la tarea es pública, todos pueden verla
          if (tarea.publica === true || tarea.publica === undefined) {
            return true;
          }
          // Si no es pública, solo los seguidores pueden verla
          if (tarea.seguidores && Array.isArray(tarea.seguidores)) {
            return tarea.seguidores.includes(user.id);
          }
          // Si no tiene seguidores definidos, solo el asignado puede verla
          return tarea.asignadaA === user.id;
        });
      }
    } else {
      // Para otros roles, solo mostrar tareas que pueden ver
      tareas = tareas.filter(tarea => {
        // Si la tarea es pública, todos pueden verla
        if (tarea.publica === true || tarea.publica === undefined) {
          return tarea.asignadaA === user.id; // Solo las asignadas a ellos
        }
        // Si no es pública, solo los seguidores pueden verla
        if (tarea.seguidores && Array.isArray(tarea.seguidores)) {
          return tarea.seguidores.includes(user.id) && tarea.asignadaA === user.id;
        }
        // Si no tiene seguidores definidos, solo el asignado puede verla
        return tarea.asignadaA === user.id;
      });
    }
    
    // Ordenar tareas: activas primero, completadas al final
    tareas.sort((a, b) => {
      if (a.completada && !b.completada) return 1; // Completadas al final
      if (!a.completada && b.completada) return -1; // Activas primero
      return 0; // Mantener orden original si ambos tienen el mismo estado
    });
    
    console.log('✅ Tareas filtradas:', tareas.length);
    callback(tareas);
  };
  
  // Verificar si Firebase Auth está autenticado
  if (!auth.currentUser) {
    console.log('⚠️ Firebase Auth no autenticado, esperando autenticación...');
    // Esperar a que Firebase Auth se sincronice
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log('✅ Firebase Auth sincronizado, cargando tareas...');
        unsubscribe(); // Limpiar el listener
        // Usar onValue() ahora que Firebase Auth está autenticado
        onValue(tareasRef, (snapshot) => {
          const data = snapshot.val();
          processTareas(data);
        });
      }
    });
    return;
  }
  
  // Usar onValue() cuando Firebase Auth está autenticado (comportamiento normal)
  onValue(tareasRef, (snapshot) => {
    const data = snapshot.val();
    processTareas(data);
  });
};

/**
 * Obtiene tareas que el usuario puede ver basándose en seguidores
 * @param user - Usuario autenticado
 * @param callback - Callback con las tareas visibles
 */
export const getTareasVisibles = (user: User, callback: (tareas: Tarea[]) => void) => {
  const tareasRef = ref(database, 'tareas');
  
  onValue(tareasRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    
    const tareas = Object.entries(data).map(([id, tarea]: [string, any]) => ({ ...tarea, id }));
    
    // Filtrar tareas que el usuario puede ver
    const tareasVisibles = tareas.filter(tarea => {
      // Si la tarea es pública, todos pueden verla
      if (tarea.publica === true || tarea.publica === undefined) {
        return true;
      }
      // Si no es pública, solo los seguidores pueden verla
      if (tarea.seguidores && Array.isArray(tarea.seguidores)) {
        return tarea.seguidores.includes(user.id);
      }
      // Si no tiene seguidores definidos, solo el asignado puede verla
      return tarea.asignadaA === user.id;
    });
    
    console.log('👁️ getTareasVisibles - Usuario:', { role: user.role, totalTareas: tareasVisibles.length, userId: user.id });
    callback(tareasVisibles);
  });
};

/**
 * Crea una nueva tarea
 * @param tarea - Datos de la tarea (sin id)
 * @returns Promise<string> - ID de la tarea creada
 */
export const saveTarea = async (tarea: Omit<Tarea, 'id'>): Promise<string> => {
  try {
    const tareasRef = ref(database, 'tareas');
    const nuevaTareaRef = push(tareasRef);
    const id = nuevaTareaRef.key!;
    
    // Filtrar campos undefined antes de enviar a Firebase
    const tareaLimpia = Object.fromEntries(
      Object.entries(tarea).filter(([_, value]) => value !== undefined)
    );
    
    const tareaConId = {
      ...tareaLimpia,
      id,
      publica: tarea.publica !== undefined ? tarea.publica : true, // Por defecto pública
      seguidores: tarea.seguidores || [], // Por defecto array vacío
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('📝 Tarea limpia a guardar:', tareaConId);
    
    await set(nuevaTareaRef, tareaConId);
    console.log('✅ Tarea creada:', id);
    
    // Enviar notificación push SIEMPRE si hay usuario asignado (app abierta o cerrada)
    if (tarea.asignadaA) {
      try {
        await notifyNewTaskToUser(tarea.asignadaA, tareaConId);
        console.log('✅ Push notification enviada para nueva tarea');
      } catch (error) {
        console.warn('⚠️ Error enviando notificación push de nueva tarea:', error);
      }
    }
    
    // Registrar evento de creación de tarea
    try {
      await logEvento({
        tipoEvento: 'CREACION_TAREA',
        responsable: tarea.usuarioAsignado,
        idAfectado: id,
        datosJSON: tareaConId
      });
      console.log('📝 Evento de creación de tarea registrado');
    } catch (eventoError) {
      console.warn('⚠️ Error registrando evento de tarea:', eventoError);
    }
    
    return id;
  } catch (error) {
    console.error('❌ Error creando tarea:', error);
    throw error;
  }
};

/**
 * Actualiza una tarea existente
 * @param id - ID de la tarea
 * @param tarea - Datos actualizados de la tarea
 */
export const updateTarea = async (id: string, tarea: Partial<Tarea>, usuarioResponsable?: string): Promise<void> => {
  try {
    const tareaRef = ref(database, `tareas/${id}`);
    
    // Filtrar campos undefined antes de enviar a Firebase
    const updatesLimpios = Object.fromEntries(
      Object.entries(tarea).filter(([_, value]) => value !== undefined)
    );
    
    const updates = {
      ...updatesLimpios,
      updatedAt: new Date().toISOString()
    };
    
    console.log('📝 Updates limpios a aplicar:', updates);
    
    await update(tareaRef, updates);
    console.log('✅ Tarea actualizada:', id);
    
    // Enviar notificación inteligente de tarea actualizada
    try {
      const NotificationManager = (await import('./notificationManager')).default;
      const notificationManager = NotificationManager.getInstance();
      const tareaCompleta = { id, ...tarea };
      await notificationManager.notifyTaskUpdated(tareaCompleta, auth.currentUser?.uid);
      console.log('✅ Notificación inteligente enviada para tarea actualizada');
    } catch (error) {
      console.warn('⚠️ Error enviando notificación inteligente de tarea actualizada:', error);
    }
    
    // Registrar evento de actualización de tarea
    try {
      await logEvento({
        tipoEvento: 'ACTUALIZACION_TAREA',
        responsable: usuarioResponsable || 'Usuario del sistema',
        idAfectado: id,
        datosJSON: updates
      });
      console.log('📝 Evento de actualización de tarea registrado');
    } catch (eventoError) {
      console.warn('⚠️ Error registrando evento de tarea:', eventoError);
    }
  } catch (error) {
    console.error('❌ Error actualizando tarea:', error);
    throw error;
  }
};

/**
 * Elimina una tarea
 * @param id - ID de la tarea a eliminar
 */
export const deleteTarea = async (id: string, usuarioResponsable?: string): Promise<void> => {
  try {
    const tareaRef = ref(database, `tareas/${id}`);
    await remove(tareaRef);
    console.log('✅ Tarea eliminada:', id);
    
    // Registrar evento de eliminación de tarea
    try {
      await logEvento({
        tipoEvento: 'ELIMINACION_TAREA',
        responsable: usuarioResponsable || 'Usuario del sistema',
        idAfectado: id,
        datosJSON: { id }
      });
      console.log('📝 Evento de eliminación de tarea registrado');
    } catch (eventoError) {
      console.warn('⚠️ Error registrando evento de tarea:', eventoError);
    }
  } catch (error) {
    console.error('❌ Error eliminando tarea:', error);
    throw error;
  }
};

/**
 * Completa una tarea
 * @param id - ID de la tarea
 * @param observacion - Observación opcional
 */
export const completarTarea = async (id: string, observacion?: string, usuarioResponsable?: string): Promise<void> => {
  try {
    const updates: Partial<Tarea> = {
      completada: true,
      fechaCompletada: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (observacion) {
      updates.observacion = observacion;
    }
    
    await updateTarea(id, updates, usuarioResponsable);
    console.log('✅ Tarea completada:', id);
    
    // Registrar evento de tarea completada
    try {
      await logEvento({
        tipoEvento: 'TAREA_COMPLETADA',
        responsable: usuarioResponsable || 'Usuario del sistema',
        idAfectado: id,
        datosJSON: { ...updates, observacion }
      });
      console.log('📝 Evento de tarea completada registrado');
    } catch (eventoError) {
      console.warn('⚠️ Error registrando evento de tarea:', eventoError);
    }
  } catch (error) {
    console.error('❌ Error completando tarea:', error);
    throw error;
  }
};

/**
 * Reactiva una tarea (marca como no completada)
 * @param id - ID de la tarea
 */
export const reactivarTarea = async (id: string, usuarioResponsable?: string): Promise<void> => {
  try {
    const updates: Partial<Tarea> = {
      completada: false,
      fechaCompletada: undefined,
      observacion: undefined,
      updatedAt: new Date().toISOString()
    };
    
    await updateTarea(id, updates, usuarioResponsable);
    console.log('✅ Tarea reactivada:', id);
    
    // Registrar evento de tarea reactivada
    try {
      await logEvento({
        tipoEvento: 'TAREA_REACTIVADA',
        responsable: usuarioResponsable || 'Usuario del sistema',
        idAfectado: id,
        datosJSON: { ...updates }
      });
      console.log('📝 Evento de tarea reactivada registrado');
    } catch (eventoError) {
      console.warn('⚠️ Error registrando evento de tarea:', eventoError);
    }
  } catch (error) {
    console.error('❌ Error reactivando tarea:', error);
    throw error;
  }
};

/**
 * Obtiene todas las órdenes filtradas por el rol del usuario
 * @param user - Usuario autenticado
 * @param callback - Callback con las órdenes filtradas
 */
export const getOrdenesByUserRole = (user: User, callback: (ordenes: Orden[]) => void) => {
  const ordenesRef = ref(database, 'ordenes');
  
  // Función para procesar los datos de órdenes
  const processOrdenes = (data: any) => {
    let ordenes = data ? Object.entries(data).map(([id, v]: any) => ({ id, ...v })) : [];
    
    console.log('🔍 getOrdenesByUserRole - Usuario:', {
      role: user.role,
      contactId: user.contactId,
      totalOrdenes: ordenes.length
    });
    
    // Si el usuario no tiene rol definido, no mostrar órdenes
    if (!user.role) {
      console.log('⚠️ Usuario sin rol, no mostrando órdenes');
      callback([]);
      return;
    }
    
    // Filtrar órdenes según el rol del usuario
    if (user.role === USER_ROLES.PRODUCTOR && user.contactId) {
      // Para productores, solo mostrar órdenes de su contacto asociado
      const ordenesAntes = ordenes.length;
      ordenes = ordenes.filter((orden: Orden) => orden.proveedorId === user.contactId);
      console.log('👤 PRODUCTOR - Filtrado de órdenes:', {
        ordenesAntes,
        ordenesDespues: ordenes.length,
        contactId: user.contactId,
        ordenesFiltradas: ordenes.map(o => ({ id: o.id, proveedorId: o.proveedorId }))
      });
    } else if (user.role === USER_ROLES.ADMIN) {
      console.log('👑 ADMIN - Mostrando todas las órdenes:', ordenes.length);
    }
    
    callback(ordenes);
  };
  
  // Verificar si Firebase Auth está autenticado
  if (!auth.currentUser) {
    console.log('⚠️ Firebase Auth no autenticado, esperando autenticación...');
    // Esperar a que Firebase Auth se sincronice
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log('✅ Firebase Auth sincronizado, cargando órdenes...');
        unsubscribe(); // Limpiar el listener
        // Usar onValue() ahora que Firebase Auth está autenticado
        onValue(ordenesRef, (snapshot) => {
          const data = snapshot.val();
          processOrdenes(data);
        });
      }
    });
    return;
  }
  
  // Usar onValue() cuando Firebase Auth está autenticado (comportamiento normal)
  onValue(ordenesRef, (snapshot) => {
    const data = snapshot.val();
    processOrdenes(data);
  });
};

/**
 * Verifica si un usuario tiene permisos para acceder a una funcionalidad
 * @param user - Usuario autenticado
 * @param requiredRole - Rol requerido
 * @returns boolean
 */
export const hasPermission = (user: User, requiredRole: UserRole): boolean => {
  if (user.role === USER_ROLES.ADMIN) return true;
  return user.role === requiredRole;
};

/**
 * Verifica si un usuario puede acceder a una pestaña específica
 * @param user - Usuario autenticado
 * @param tabName - Nombre de la pestaña
 * @returns boolean
 */
export const canAccessTab = (user: User, tabName: string): boolean => {
  // Si el usuario no tiene rol definido, no puede acceder a nada
  if (!user.role) {
    return false;
  }

  switch (tabName) {
    case 'index':
      return true; // Todos pueden acceder al inicio
    case 'ordenes':
      return true; // Todos pueden acceder a órdenes (pero filtradas)
    case 'contactos':
      return user.role === USER_ROLES.ADMIN;
    case 'productos':
      return user.role === USER_ROLES.ADMIN;
    default:
      return false;
  }
};

// ==================== SISTEMA DE COSTOS DE PRODUCTOS ====================

/**
 * Obtiene la receta de costos de un producto específico
 * @param productoId - ID del producto
 * @returns Promise<RecetaCosto | null>
 */
export const getRecetaCosto = async (productoId: string): Promise<RecetaCosto | null> => {
  try {
    const recetaRef = ref(database, `recetas-costos/${productoId}`);
    const snapshot = await get(recetaRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const data = snapshot.val();
    return {
      id: productoId,
      ...data
    } as RecetaCosto;
  } catch (error) {
    console.error('❌ Error obteniendo receta de costo:', error);
    throw error;
  }
};

/**
 * Guarda o actualiza la receta de costos de un producto
 * @param receta - Datos de la receta de costos
 * @returns Promise<string> - ID de la receta
 */
export const saveRecetaCosto = async (receta: Omit<RecetaCosto, 'id'> & { productoId: string }): Promise<string> => {
  try {
    const recetaRef = ref(database, `recetas-costos/${receta.productoId}`);
    
    // Calcular costo total
    const costoTotal = receta.ingredientes.reduce((sum, ingrediente) => sum + ingrediente.costo, 0);
    
    const recetaData: any = {
      ...receta,
      costoTotal,
      updatedAt: new Date().toISOString()
    };

    // Solo agregar costoPorUnidad si hay rendimiento
    if (receta.rendimiento && receta.rendimiento > 0) {
      recetaData.costoPorUnidad = costoTotal / receta.rendimiento;
    }
    
    await set(recetaRef, recetaData);
    
    // Actualizar el costo total en el producto
    await updateProducto(receta.productoId, { costoTotal });
    
    console.log('✅ Receta de costo guardada:', receta.productoId);
    return receta.productoId;
  } catch (error) {
    console.error('❌ Error guardando receta de costo:', error);
    throw error;
  }
};

/**
 * Elimina la receta de costos de un producto
 * @param productoId - ID del producto
 */
export const deleteRecetaCosto = async (productoId: string): Promise<void> => {
  try {
    const recetaRef = ref(database, `recetas-costos/${productoId}`);
    await remove(recetaRef);
    
    // Limpiar el costo total del producto usando remove para eliminar el campo
    const productoRef = ref(database, `productos/${productoId}/costoTotal`);
    await remove(productoRef);
    
    console.log('✅ Receta de costo eliminada:', productoId);
  } catch (error) {
    console.error('❌ Error eliminando receta de costo:', error);
    throw error;
  }
};

/**
 * Calcula el porcentaje de uso de un ingrediente basado en la cantidad y unidad
 * @param cantidadIngrediente - Cantidad del ingrediente en la receta
 * @param unidadIngrediente - Unidad del ingrediente (gr, ml, etc.)
 * @param precioUnitarioProducto - Precio por unidad del producto
 * @param unidadProducto - Unidad del producto (kg, litro, etc.)
 * @returns number - Porcentaje de uso (0-1)
 */
export const calcularPorcentajeUso = (
  cantidadIngrediente: number,
  unidadIngrediente: string,
  precioUnitarioProducto: number,
  unidadProducto: string
): number => {
  // Convertir todo a unidades base para el cálculo
  const conversiones: { [key: string]: number } = {
    'gr': 1,
    'g': 1,
    'gramo': 1,
    'gramos': 1,
    'kg': 1000,
    'kilogramo': 1000,
    'kilogramos': 1000,
    'ml': 1,
    'mililitro': 1,
    'mililitros': 1,
    'litro': 1000,
    'l': 1000,
    'litros': 1000,
    'unidad': 1,
    'unidades': 1,
    'pieza': 1,
    'piezas': 1
  };
  
  const factorIngrediente = conversiones[unidadIngrediente.toLowerCase()] || 1;
  const factorProducto = conversiones[unidadProducto.toLowerCase()] || 1;
  
  // Convertir a unidades base
  const cantidadBase = cantidadIngrediente * factorIngrediente;
  const unidadBase = factorProducto;
  
  // Calcular porcentaje
  const porcentaje = cantidadBase / unidadBase;
  
  return Math.min(porcentaje, 1); // Máximo 100%
};

/**
 * Calcula el costo de un ingrediente
 * @param ingrediente - Datos del ingrediente
 * @param productoReferencia - Producto de referencia si es tipo 'producto'
 * @returns number - Costo calculado
 */
export const calcularCostoIngrediente = (
  ingrediente: Omit<IngredienteCosto, 'costo'> & { costo?: number },
  productoReferencia?: Producto
): number => {
  if (ingrediente.tipo === 'personalizado') {
    // Para ingredientes personalizados, el costo se ingresa directamente
    return ingrediente.costo || 0;
  }
  
  if (ingrediente.tipo === 'producto' && productoReferencia) {
    // Si el ingrediente tiene porcentaje definido, usarlo
    if (ingrediente.porcentaje !== undefined) {
      // Costo por porcentaje del precio total
      return productoReferencia.precio * (ingrediente.porcentaje / 100);
    }
    
    // Si no tiene porcentaje, calcular por cantidad directa
    // Costo = cantidad * precio unitario
    return ingrediente.cantidad * productoReferencia.precio;
  }
  
  return 0;
};

// ==================== NOTIFICACIONES EN TIEMPO REAL ====================

/**
 * Configura listeners para notificaciones en tiempo real
 * @param userData - Datos del usuario actual
 * @param onOrdenNotification - Callback para notificaciones de órdenes
 * @param onTareaNotification - Callback para notificaciones de tareas
 * @returns Función para limpiar los listeners
 */
// Cache para evitar notificaciones duplicadas
const notificationCache = new Map<string, number>();

export const setupRealtimeNotifications = (
  userData: User,
  onOrdenNotification: (orden: Orden) => void,
  onTareaNotification: (tarea: Tarea) => void
): (() => void) => {
  console.log('🔔 Configurando notificaciones en tiempo real para usuario:', userData.id);
  
  // Listener para nuevas órdenes pendientes
  const ordenesRef = ref(database, 'ordenes');
  const ordenesListener = onValue(ordenesRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    
    const ordenes = Object.entries(data).map(([id, orden]: [string, any]) => ({ ...orden, id }));
    
    // Buscar órdenes pendientes nuevas (creadas en los últimos 10 segundos)
    const ahora = new Date();
    const hace10Segundos = new Date(ahora.getTime() - 10000);
    
    ordenes.forEach((orden: Orden) => {
      const fechaCreacion = new Date(orden.createdAt);
      const cacheKey = `orden_${orden.id}`;
      const lastNotification = notificationCache.get(cacheKey) || 0;
      const timeSinceLastNotification = ahora.getTime() - lastNotification;
      
      // Si es una orden pendiente creada recientemente y no se ha notificado en los últimos 30 segundos
      if (orden.estado === 'PENDIENTE' && 
          fechaCreacion > hace10Segundos && 
          orden.createdAt !== orden.updatedAt && // Solo órdenes nuevas, no actualizaciones
          timeSinceLastNotification > 30000) { // Cooldown de 30 segundos
        
        console.log('🔔 Nueva orden pendiente detectada:', orden.id);
        notificationCache.set(cacheKey, ahora.getTime());
        onOrdenNotification(orden);
      }
    });
  });
  
  // Listener para nuevas tareas asignadas al usuario
  const tareasRef = ref(database, 'tareas');
  const tareasListener = onValue(tareasRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    
    const tareas = Object.entries(data).map(([id, tarea]: [string, any]) => ({ ...tarea, id }));
    
    // Buscar tareas nuevas asignadas al usuario actual
    const ahora = new Date();
    const hace10Segundos = new Date(ahora.getTime() - 10000);
    
    tareas.forEach((tarea: Tarea) => {
      const fechaCreacion = new Date(tarea.createdAt);
      const cacheKey = `tarea_${tarea.id}`;
      const lastNotification = notificationCache.get(cacheKey) || 0;
      const timeSinceLastNotification = ahora.getTime() - lastNotification;
      
      // Si es una tarea asignada al usuario actual y creada recientemente
      if (tarea.asignadaA === userData.id && 
          !tarea.completada &&
          fechaCreacion > hace10Segundos &&
          tarea.createdAt === tarea.updatedAt && // Solo tareas nuevas
          timeSinceLastNotification > 30000) { // Cooldown de 30 segundos
        
        console.log('🔔 Nueva tarea asignada detectada:', tarea.id);
        notificationCache.set(cacheKey, ahora.getTime());
        onTareaNotification(tarea);
      }
    });
  });
  
  // Función para limpiar listeners
  return () => {
    console.log('🧹 Limpiando listeners de notificaciones en tiempo real');
    off(ordenesRef, 'value', ordenesListener);
    off(tareasRef, 'value', tareasListener);
    // Limpiar cache
    notificationCache.clear();
  };
};

/**
 * Obtiene el nombre del proveedor por ID
 * @param proveedorId - ID del proveedor
 * @returns Promise<string> - Nombre del proveedor
 */
export const getProveedorNombre = async (proveedorId: string): Promise<string> => {
  try {
    const proveedorRef = ref(database, `proveedores/${proveedorId}`);
    const snapshot = await get(proveedorRef);
    const proveedor = snapshot.val();
    return proveedor?.nombre || 'Proveedor desconocido';
  } catch (error) {
    console.error('❌ Error obteniendo nombre del proveedor:', error);
    return 'Proveedor desconocido';
  }
};

// ==================== FIREBASE CLOUD MESSAGING (FCM) ====================

/**
 * Obtiene el token de FCM del dispositivo
 * @returns Promise<string | null> - Token de FCM o null si no se puede obtener
 */
export const getFCMToken = async (): Promise<string | null> => {
  if (!Notifications) {
    console.warn('⚠️ Notificaciones no disponibles - saltando obtención de token FCM');
    return null;
  }
  
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    console.log('📱 Token FCM obtenido:', token.data);
    return token.data;
  } catch (error) {
    console.error('❌ Error obteniendo token FCM:', error);
    return null;
  }
};

/**
 * Guarda el token FCM del usuario en Firebase
 * @param userId - ID del usuario
 * @param token - Token FCM
 */
export const saveFCMToken = async (userId: string, token: string): Promise<void> => {
  try {
    // Verificar que el usuario esté autenticado
    if (!auth.currentUser) {
      console.warn('⚠️ Usuario no autenticado, no se puede guardar token FCM');
      return;
    }

    // Verificar que el userId coincida con el usuario autenticado
    if (auth.currentUser.uid !== userId) {
      console.warn('⚠️ ID de usuario no coincide con el usuario autenticado');
      return;
    }

    const tokenRef = ref(database, `fcm_tokens/${userId}`);
    await set(tokenRef, {
      token,
      updatedAt: new Date().toISOString(),
      platform: 'expo'
    });
    console.log('💾 Token FCM guardado para usuario:', userId);
  } catch (error: any) {
    if (error.code === 'PERMISSION_DENIED') {
      console.warn('⚠️ Permisos insuficientes para guardar token FCM. El usuario puede no estar autenticado correctamente.');
    } else {
      console.error('❌ Error guardando token FCM:', error);
    }
    // No lanzar el error para evitar que falle la autenticación
  }
};

/**
 * Obtiene el token FCM de un usuario
 * @param userId - ID del usuario
 * @returns Promise<string | null> - Token FCM o null si no existe
 */
export const getFCMTokenForUser = async (userId: string): Promise<string | null> => {
  try {
    const tokenRef = ref(database, `fcm_tokens/${userId}`);
    const snapshot = await get(tokenRef);
    const data = snapshot.val();
    return data?.token || null;
  } catch (error) {
    console.error('❌ Error obteniendo token FCM del usuario:', error);
    return null;
  }
};

/**
 * Envía una notificación push usando FCM
 * @param targetUserId - ID del usuario destinatario
 * @param title - Título de la notificación
 * @param body - Cuerpo de la notificación
 * @param data - Datos adicionales
 */
export const sendPushNotification = async (
  targetUserId: string,
  title: string,
  body: string,
  data: any = {}
): Promise<void> => {
  try {
    // Obtener el token FCM del usuario destinatario
    const fcmToken = await getFCMTokenForUser(targetUserId);
    
    if (!fcmToken) {
      console.warn('⚠️ No se encontró token FCM para usuario:', targetUserId);
      return;
    }

    // Crear la notificación
    const message = {
      to: fcmToken,
      title,
      body,
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      sound: 'notification-sound.wav'
    };

    // Enviar usando Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (response.ok) {
      console.log('✅ Notificación push enviada exitosamente a:', targetUserId);
    } else {
      const errorText = await response.text();
      console.error('❌ Error enviando notificación push:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        message: message
      });
    }
  } catch (error) {
    console.error('❌ Error enviando notificación push:', error);
  }
};

/**
 * Configura FCM para un usuario
 * @param userData - Datos del usuario
 */
export const setupFCMForUser = async (userData: User): Promise<void> => {
  if (!Notifications) {
    console.warn('⚠️ Notificaciones no disponibles - saltando configuración FCM para:', userData.id);
    return;
  }
  
  try {
    console.log('🔔 Configurando FCM para usuario:', userData.id);
    
    // Obtener token FCM
    const token = await getFCMToken();
    
    if (token) {
      // Guardar token en Firebase
      await saveFCMToken(userData.id, token);
      console.log('✅ FCM configurado exitosamente para usuario:', userData.id);
    } else {
      console.warn('⚠️ No se pudo obtener token FCM');
    }
  } catch (error) {
    console.error('❌ Error configurando FCM:', error);
  }
};

/**
 * Envía notificación de nueva orden a todos los usuarios
 * @param orden - Datos de la orden
 * @param proveedorNombre - Nombre del proveedor
 */
export const notifyNewOrderToAllUsers = async (orden: Orden, proveedorNombre: string): Promise<void> => {
  try {
    console.log('🔔 Enviando notificación de nueva orden a todos los usuarios...');
    
    // Obtener todos los tokens FCM
    const tokensRef = ref(database, 'fcm_tokens');
    const snapshot = await get(tokensRef);
    const tokens = snapshot.val();
    
    if (!tokens) {
      console.warn('⚠️ No hay tokens FCM registrados');
      return;
    }
    
    // Enviar notificación push a cada usuario (funciona cuando la app está cerrada)
    const promises = Object.entries(tokens).map(async ([userId, tokenData]: [string, any]) => {
      if (tokenData?.token) {
        await sendPushNotification(
          userId,
          '🔔 Nueva orden pendiente',
          `Orden creada para: ${proveedorNombre}`,
          {
            type: 'nueva_orden_push',
            ordenId: orden.id,
            proveedorId: orden.proveedorId,
            proveedorNombre,
            timestamp: new Date().toISOString()
          }
        );
      }
    });
    
    await Promise.all(promises);
    
    // También enviar notificación inteligente (SIEMPRE se envía)
    const NotificationManager = (await import('./notificationManager')).default;
    const notificationManager = NotificationManager.getInstance();
    
    // Notificar a todos los usuarios excepto al creador (si se proporciona)
    await notificationManager.notifyOrderCreated(orden, auth.currentUser?.uid);
    
    console.log('✅ Notificaciones push y local de nueva orden enviadas a todos los usuarios');
  } catch (error) {
    console.error('❌ Error enviando notificaciones de nueva orden:', error);
  }
};

/**
 * Envía notificación de nueva tarea a un usuario específico
 * @param targetUserId - ID del usuario destinatario
 * @param tarea - Datos de la tarea
 */
export const notifyNewTaskToUser = async (targetUserId: string, tarea: Tarea): Promise<void> => {
  try {
    console.log('🔔 Enviando notificación de nueva tarea a usuario:', targetUserId);
    
    // Siempre enviar notificación push (funciona cuando la app está cerrada)
    await sendPushNotification(
      targetUserId,
      '🔔 Nueva tarea asignada',
      `Tarea: ${tarea.titulo}`,
      {
        type: 'nueva_tarea_push',
        tareaId: tarea.id,
        titulo: tarea.titulo,
        prioridad: tarea.prioridad,
        timestamp: new Date().toISOString()
      }
    );
    
    // También enviar notificación inteligente (SIEMPRE se envía)
    const NotificationManager = (await import('./notificationManager')).default;
    const notificationManager = NotificationManager.getInstance();
    
    // Notificar a todos los usuarios excepto al creador (si se proporciona)
    await notificationManager.notifyTaskCreated(tarea, auth.currentUser?.uid);
    
    console.log('✅ Notificación push y local de nueva tarea enviada');
  } catch (error) {
    console.error('❌ Error enviando notificación de nueva tarea:', error);
  }
};

/**
 * Obtiene los productos predeterminados de un cliente
 * @param clienteId - ID del cliente
 * @returns Array de productos con cantidades y unidades predeterminadas
 */
export const getProductosDefaultCliente = async (clienteId: string): Promise<Array<{ productoId: string; cantidad: string; unidad: string }>> => {
  try {
    const proveedorSnapshot = await get(ref(database, `proveedores/${clienteId}`));
    const proveedor = proveedorSnapshot.val() as Proveedor;
    
    if (!proveedor || proveedor.tipo !== 'Cliente') {
      return [];
    }
    
    return proveedor.productosDefault || [];
  } catch (error) {
    console.error('❌ Error obteniendo productos default del cliente:', error);
    return [];
  }
};

/**
 * Actualiza los productos predeterminados de un cliente
 * @param clienteId - ID del cliente
 * @param productos - Array de productos predeterminados
 */
export const updateProductosDefaultCliente = async (
  clienteId: string, 
  productos: Array<{ productoId: string; cantidad: string; unidad: string }>
): Promise<void> => {
  try {
    const proveedorRef = ref(database, `proveedores/${clienteId}`);
    await update(proveedorRef, {
      productosDefault: productos,
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Productos predeterminados actualizados para cliente:', clienteId);
  } catch (error) {
    console.error('❌ Error actualizando productos predeterminados:', error);
    throw error;
  }
};

/**
 * Calcula las cantidades totales de productos para un productor en una fecha específica
 * sumando todas las órdenes de clientes del día
 */
const calcularCantidadesTotalesDelDia = async (
  productorId: string, 
  fecha: string
): Promise<Array<{ producto: Producto; cantidad: string; unidad: string }>> => {
  try {
    console.log(`📊 Calculando cantidades totales del día para productor: ${productorId}, fecha: ${fecha}`);
    
    // Obtener todas las órdenes del día
    const ordenesSnapshot = await get(ref(database, 'ordenes'));
    const todasLasOrdenes = ordenesSnapshot.val() ? Object.entries(ordenesSnapshot.val()).map(([id, orden]: [string, any]) => ({ ...orden, id })) : [];
    
    // Filtrar órdenes de clientes del día específico
    const ordenesClientesDelDia = todasLasOrdenes.filter(orden => {
      // Buscar el proveedor para verificar si es cliente
      return orden.fecha === fecha && orden.estado === 'PENDIENTE';
    });
    
    console.log(`📋 Órdenes del día encontradas: ${ordenesClientesDelDia.length}`);
    
    // Obtener información de proveedores y productos
    const [productosSnapshot, proveedoresSnapshot] = await Promise.all([
      get(ref(database, 'productos')),
      get(ref(database, 'proveedores'))
    ]);
    
    const productos = productosSnapshot.val() ? Object.entries(productosSnapshot.val()).map(([id, prod]: [string, any]) => ({ ...prod, id })) : [];
    const proveedores = proveedoresSnapshot.val() ? Object.entries(proveedoresSnapshot.val()).map(([id, prov]: [string, any]) => ({ ...prov, id })) : [];
    
    // Filtrar solo órdenes de clientes
    const ordenesDeClientes = ordenesClientesDelDia.filter(orden => {
      const proveedor = proveedores.find(p => p.id === orden.proveedorId);
      return proveedor?.tipo === 'Cliente';
    });
    
    console.log(`👥 Órdenes de clientes del día: ${ordenesDeClientes.length}`);
    
    // Agrupar y sumar productos por productor
    const productosDelProductor: Record<string, { producto: Producto; cantidad: number; unidad: string }> = {};
    
    for (const orden of ordenesDeClientes) {
      for (const itemOrden of orden.productos) {
        const productoIdItem = itemOrden.id || itemOrden.productoId; // Compatibilidad
        const producto = productos.find(p => p.id === productoIdItem);
        if (!producto) {
          console.warn(`⚠️ Producto no encontrado: ${productoIdItem}`);
          continue;
        }
        
        // Verificar si este producto pertenece al productor
        if (producto.proveedorId !== productorId) continue;
        
        const productoId = producto.id;
        const cantidad = parseFloat(itemOrden.cantidad.toString()) || 0;
        
        if (productosDelProductor[productoId]) {
          // Sumar cantidad existente
          productosDelProductor[productoId].cantidad += cantidad;
          console.log(`➕ Sumando ${producto.nombre}: ${productosDelProductor[productoId].cantidad - cantidad} + ${cantidad} = ${productosDelProductor[productoId].cantidad}`);
        } else {
          // Agregar nuevo producto
          productosDelProductor[productoId] = {
            producto,
            cantidad: cantidad,
            unidad: itemOrden.unidad
          };
          console.log(`🆕 Nuevo producto: ${producto.nombre} = ${cantidad} ${itemOrden.unidad}`);
        }
      }
    }
    
    // Convertir a array
    const productosFinales = Object.values(productosDelProductor).map(item => ({
      producto: item.producto,
      cantidad: item.cantidad.toString(),
      unidad: item.unidad
    }));
    
    console.log(`📊 Total productos calculados para ${productorId}: ${productosFinales.length}`);
    return productosFinales;
    
  } catch (error) {
    console.error('❌ Error calculando cantidades totales del día:', error);
    return [];
  }
};

// Sistema de bloqueo para evitar ejecuciones simultáneas
const procesamientoEnCurso = new Set<string>();

/**
 * Genera órdenes de producción automáticamente basadas en todas las órdenes de clientes del día
 * @param ordenCliente - Orden del cliente que dispara el recálculo
 */
export const generarOrdenesProduccion = async (ordenCliente: Orden): Promise<void> => {
  const lockKey = `ordenes_automaticas_${ordenCliente.fecha}`;
  
  console.log(`🚀 ENTRADA generarOrdenesProduccion - Orden: ${ordenCliente.id}, Cliente: ${ordenCliente.proveedorNombre}, Fecha: ${ordenCliente.fecha}`);
  
  // Verificar si ya se está procesando esta fecha
  if (procesamientoEnCurso.has(lockKey)) {
    console.log('🔒 Ya se está procesando órdenes automáticas para esta fecha, saltando:', ordenCliente.fecha);
    return;
  }
  
  try {
    // Bloquear procesamiento para esta fecha
    procesamientoEnCurso.add(lockKey);
    console.log('🏭 Iniciando recálculo completo de órdenes automáticas para fecha:', ordenCliente.fecha);
    
    // Obtener información del proveedor para verificar si es cliente
    const proveedorSnapshot = await get(ref(database, `proveedores/${ordenCliente.proveedorId}`));
    const proveedor = proveedorSnapshot.val() as Proveedor;
    
    if (!proveedor || proveedor.tipo !== 'Cliente') {
      console.log('🚫 La orden no es de un cliente, no se generan órdenes de producción');
      return;
    }
    
    console.log('✅ Orden confirmada como de cliente:', proveedor.nombre);
    
    // PASO 1: Obtener TODAS las órdenes de clientes del día
    const [ordenesSnapshot, productosSnapshot, proveedoresSnapshot] = await Promise.all([
      get(ref(database, 'ordenes')),
      get(ref(database, 'productos')),
      get(ref(database, 'proveedores'))
    ]);
    
    const todasLasOrdenes = ordenesSnapshot.val() ? Object.entries(ordenesSnapshot.val()).map(([id, orden]: [string, any]) => ({ ...orden, id })) : [];
    const productos = productosSnapshot.val() ? Object.entries(productosSnapshot.val()).map(([id, prod]: [string, any]) => ({ ...prod, id })) : [];
    const proveedores = proveedoresSnapshot.val() ? Object.entries(proveedoresSnapshot.val()).map(([id, prov]: [string, any]) => ({ ...prov, id })) : [];
    
    // Normalizar fecha a solo día (sin hora) para agrupar órdenes del mismo día
    const fechaDelDia = ordenCliente.fecha.split(' ')[0]; // "20-09-2025"
    console.log(`📅 Fecha normalizada del día: ${fechaDelDia}`);
    
    // Filtrar órdenes de clientes del día específico
    const ordenesClientesDelDia = todasLasOrdenes.filter(orden => {
      const proveedorOrden = proveedores.find(p => p.id === orden.proveedorId);
      const fechaOrdenDelDia = orden.fecha.split(' ')[0]; // Normalizar fecha de la orden
      return fechaOrdenDelDia === fechaDelDia && 
             orden.estado === 'PENDIENTE' && 
             proveedorOrden?.tipo === 'Cliente';
    });
    
    console.log(`👥 Órdenes de clientes del día encontradas: ${ordenesClientesDelDia.length}`);
    ordenesClientesDelDia.forEach(orden => {
      const prov = proveedores.find(p => p.id === orden.proveedorId);
      console.log(`   - ${prov?.nombre}: ${orden.productos?.length || 0} productos`);
    });
    
    // PASO 2: Sumar cantidades por producto
    const productosTotales: Record<string, { producto: Producto; cantidad: number; unidad: string }> = {};
    
    for (const orden of ordenesClientesDelDia) {
      for (const itemOrden of orden.productos || []) {
        const productoId = itemOrden.id || itemOrden.productoId; // Compatibilidad con estructura antigua
        const producto = productos.find(p => p.id === productoId);
        if (!producto) {
          console.warn(`⚠️ Producto no encontrado: ${productoId}`);
          continue;
        }
        
        const cantidad = parseFloat(itemOrden.cantidad?.toString() || '0');
        
        if (productosTotales[producto.id]) {
          productosTotales[producto.id].cantidad += cantidad;
          console.log(`➕ Sumando ${producto.nombre}: ${productosTotales[producto.id].cantidad - cantidad} + ${cantidad} = ${productosTotales[producto.id].cantidad}`);
        } else {
          productosTotales[producto.id] = {
            producto,
            cantidad: cantidad,
            unidad: itemOrden.unidad || 'UNIDAD'
          };
          console.log(`🆕 Nuevo producto total: ${producto.nombre} = ${cantidad}`);
        }
      }
    }
    
    console.log(`📊 Total productos únicos procesados: ${Object.keys(productosTotales).length}`);
    
    // PASO 3: Agrupar productos por productor
    const productosPorProductor: Record<string, { proveedor: Proveedor; productos: Array<{ producto: Producto; cantidad: string; unidad: string }> }> = {};
    
    for (const [productoId, { producto, cantidad, unidad }] of Object.entries(productosTotales)) {
      const productor = proveedores.find(p => p.id === producto.proveedorId && p.tipo === 'Productor');
      if (!productor) continue;
      
      if (!productosPorProductor[productor.id]) {
        productosPorProductor[productor.id] = {
          proveedor: productor,
          productos: []
        };
      }
      
      productosPorProductor[productor.id].productos.push({
        producto,
        cantidad: cantidad.toString(),
        unidad
      });
    }
    
    console.log(`👨‍🍳 Productores con productos: ${Object.keys(productosPorProductor).length}`);
    
    // PASO 4: Crear/actualizar UNA orden por productor
    for (const [productorId, { proveedor, productos: productosProductor }] of Object.entries(productosPorProductor)) {
      console.log(`🔄 LLAMANDO crearOActualizarOrdenProduccion para productor: ${proveedor.nombre} (${proveedor.id})`);
      console.log(`📦 Productos a procesar: ${productosProductor.map(p => `${p.producto.nombre}(${p.cantidad})`).join(', ')}`);
      console.log(`📅 Fecha de producción: ${ordenCliente.fecha}`);
      
      await crearOActualizarOrdenProduccion(
        proveedor,
        productosProductor,
        ordenCliente.fecha,
        `Producción automática para el día ${ordenCliente.fecha} - Suma de todas las órdenes de clientes`
      );
      
      console.log(`✅ COMPLETADO crearOActualizarOrdenProduccion para ${proveedor.nombre}`);
    }
    
    // Verificación final: eliminar duplicados si existen
    await limpiarOrdenesAutomaticasDuplicadas(ordenCliente.fecha);
    
    console.log('✅ Recálculo completo de órdenes automáticas completado');
  } catch (error) {
    console.error('❌ Error generando órdenes de producción:', error);
    throw error;
  } finally {
    // Liberar el bloqueo siempre
    procesamientoEnCurso.delete(lockKey);
    console.log('🔓 Liberando bloqueo para fecha:', ordenCliente.fecha);
  }
};

/**
 * Limpia órdenes automáticas duplicadas para una fecha específica
 * @param fecha - Fecha a verificar
 */
const limpiarOrdenesAutomaticasDuplicadas = async (fecha: string): Promise<void> => {
  try {
    console.log('🧹 Verificando órdenes automáticas duplicadas para fecha:', fecha);
    
    // Obtener todas las órdenes
    const ordenesSnapshot = await get(ref(database, 'ordenes'));
    const ordenes = ordenesSnapshot.val() ? Object.entries(ordenesSnapshot.val()).map(([id, orden]: [string, any]) => ({ ...orden, id })) : [];
    
    // Normalizar fecha para búsqueda
    const fechaDelDia = fecha.split(' ')[0]; // "20-09-2025"
    
    // Filtrar órdenes automáticas de la fecha específica (comparar solo día)
    const ordenesAutomaticas = ordenes.filter(orden => {
      const fechaOrdenDelDia = orden.fecha.split(' ')[0];
      return fechaOrdenDelDia === fechaDelDia && 
             orden.tipo === 'AUTOMATICA' &&
             orden.estado === 'PENDIENTE';
    });
    
    // Agrupar por productor
    const ordenesPorProductor: Record<string, Orden[]> = {};
    ordenesAutomaticas.forEach(orden => {
      if (!ordenesPorProductor[orden.proveedorId]) {
        ordenesPorProductor[orden.proveedorId] = [];
      }
      ordenesPorProductor[orden.proveedorId].push(orden);
    });
    
    // Eliminar duplicados (mantener la más reciente)
    for (const [productorId, ordenesDelProductor] of Object.entries(ordenesPorProductor)) {
      if (ordenesDelProductor.length > 1) {
        console.log(`⚠️ Encontradas ${ordenesDelProductor.length} órdenes automáticas duplicadas para productor ${productorId}`);
        
        // Ordenar por fecha de creación (más reciente primero)
        ordenesDelProductor.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
        
        // Mantener la primera (más reciente) y eliminar el resto
        const ordenAMantener = ordenesDelProductor[0];
        const ordenesAEliminar = ordenesDelProductor.slice(1);
        
        console.log(`✅ Manteniendo orden: ${ordenAMantener.id}`);
        console.log(`🗑️ Eliminando órdenes duplicadas: ${ordenesAEliminar.map(o => o.id).join(', ')}`);
        
        // Eliminar las órdenes duplicadas
        for (const ordenDuplicada of ordenesAEliminar) {
          const ordenRef = ref(database, `ordenes/${ordenDuplicada.id}`);
          await remove(ordenRef);
          console.log(`🗑️ Orden duplicada eliminada: ${ordenDuplicada.id}`);
        }
      }
    }
    
    console.log('🧹 Limpieza de duplicados completada');
  } catch (error) {
    console.error('❌ Error limpiando órdenes duplicadas:', error);
  }
};

/**
 * Actualiza órdenes de producción existentes basadas en cambios en una orden de cliente
 * @param ordenCliente - Orden del cliente actualizada
 */
export const actualizarOrdenesProduccion = async (ordenCliente: Orden): Promise<void> => {
  try {
    console.log('🔄 Iniciando actualización de órdenes de producción para orden:', ordenCliente.id);
    
    // Obtener información del proveedor para verificar si es cliente
    const proveedorSnapshot = await get(ref(database, `proveedores/${ordenCliente.proveedorId}`));
    const proveedor = proveedorSnapshot.val() as Proveedor;
    
    if (!proveedor || proveedor.tipo !== 'Cliente') {
      console.log('🚫 La orden no es de un cliente, no se actualizan órdenes de producción');
      return;
    }
    
    // Reutilizar la lógica de generación que también maneja actualizaciones
    await generarOrdenesProduccion(ordenCliente);
    
    console.log('✅ Actualización de órdenes de producción completada');
  } catch (error) {
    console.error('❌ Error actualizando órdenes de producción:', error);
    throw error;
  }
};

/**
 * Crea una nueva orden de producción o actualiza una existente
 */
const crearOActualizarOrdenProduccion = async (
  productor: Proveedor,
  productos: Array<{ producto: Producto; cantidad: string; unidad: string }>,
  fechaProduccion: string,
  observaciones: string
): Promise<void> => {
  try {
    console.log(`🏭 INICIO - Procesando orden para productor: ${productor.nombre} (${productor.id}) en fecha: ${fechaProduccion}`);
    
    // Normalizar fecha a solo día para buscar órdenes automáticas
    const fechaDelDia = fechaProduccion.split(' ')[0]; // "20-09-2025"
    console.log(`📅 Fecha normalizada para búsqueda: ${fechaDelDia}`);
    
    // PASO CRÍTICO: Obtener órdenes automáticas del día para este productor
    const ordenesSnapshot = await get(ref(database, 'ordenes'));
    const todasLasOrdenes = ordenesSnapshot.val() ? Object.entries(ordenesSnapshot.val()).map(([id, orden]: [string, any]) => ({ ...orden, id })) : [];
    
    // Buscar específicamente órdenes automáticas del productor del día (solo comparar fecha sin hora)
    const ordenesAutomaticasDelDia = todasLasOrdenes.filter(orden => {
      const fechaOrdenDelDia = orden.fecha.split(' ')[0];
      return orden.proveedorId === productor.id && 
             fechaOrdenDelDia === fechaDelDia &&
             orden.tipo === 'AUTOMATICA';
    });
    
    console.log(`🔍 Órdenes automáticas del día para ${productor.nombre}:`, ordenesAutomaticasDelDia.map(o => ({
      id: o.id,
      fecha: o.fecha,
      tipo: o.tipo,
      estado: o.estado,
      productos: o.productos?.length || 0
    })));
    
    if (ordenesAutomaticasDelDia.length > 0) {
      // Ya existe orden automática, actualizar la primera (debería ser solo una)
      const ordenExistente = ordenesAutomaticasDelDia[0];
      console.log('📝 Actualizando orden automática existente:', ordenExistente.id);
      
      // Si hay múltiples, eliminar las extras
      if (ordenesAutomaticasDelDia.length > 1) {
        console.log(`⚠️ Eliminando ${ordenesAutomaticasDelDia.length - 1} órdenes automáticas duplicadas`);
        for (let i = 1; i < ordenesAutomaticasDelDia.length; i++) {
          const ordenDuplicada = ordenesAutomaticasDelDia[i];
          await remove(ref(database, `ordenes/${ordenDuplicada.id}`));
          console.log(`🗑️ Eliminada orden duplicada: ${ordenDuplicada.id}`);
        }
      }
      
      await reemplazarOrdenAutomatica(ordenExistente, productos);
    } else {
      console.log('🆕 No existe orden automática, creando nueva');
      await crearNuevaOrdenProduccion(productor, productos, fechaProduccion, observaciones);
    }
  } catch (error) {
    console.error(`❌ Error procesando orden para productor ${productor.nombre}:`, error);
    throw error;
  }
};

/**
 * Reemplaza completamente una orden automática con las cantidades totales calculadas
 */
const reemplazarOrdenAutomatica = async (
  ordenExistente: Orden,
  productosNuevos: Array<{ producto: Producto; cantidad: string; unidad: string }>
): Promise<void> => {
  try {
    console.log(`🔄 Reemplazando orden automática: ${ordenExistente.id}`);
    
    // Reemplazar completamente los productos con las cantidades calculadas
    const productosActualizados = productosNuevos.map(item => ({
      id: item.producto.id,
      nombre: item.producto.nombre,
      cantidad: parseFloat(item.cantidad),
      unidad: item.unidad,
      precio: item.producto.precio,
      subtotal: parseFloat(item.cantidad) * item.producto.precio
    }));
    
    // Calcular el total actualizado
    const totalActualizado = productosActualizados.reduce((sum, producto) => sum + producto.subtotal, 0);
    
    // Log de cambios
    console.log(`📊 Productos en orden automática:`);
    productosActualizados.forEach(prod => {
      console.log(`   ${prod.nombre}: ${prod.cantidad} ${prod.unidad} ($${prod.subtotal.toFixed(2)})`);
    });
    console.log(`💰 Total: $${totalActualizado.toFixed(2)}`);
    
    // Actualizar la orden usando la función interna para evitar recursión
    const ordenRef = ref(database, 'ordenes/' + ordenExistente.id);
    const ordenActualizada: Orden = {
      ...ordenExistente,
      productos: productosActualizados,
      total: totalActualizado,
      updatedAt: new Date().toISOString()
    };
    await set(ordenRef, ordenActualizada);
    
    console.log('✅ Orden automática reemplazada:', ordenExistente.id);
  } catch (error) {
    console.error('❌ Error reemplazando orden automática:', error);
    throw error;
  }
};

/**
 * Actualiza una orden de producción existente combinando productos
 */
const actualizarOrdenExistente = async (
  ordenExistente: Orden,
  nuevosProductos: Array<{ producto: Producto; cantidad: string; unidad: string }>
): Promise<void> => {
  try {
    // Combinar productos existentes con nuevos productos
    const productosActualizados = [...ordenExistente.productos];
    
    for (const nuevoItem of nuevosProductos) {
      const indiceExistente = productosActualizados.findIndex(p => p.id === nuevoItem.producto.id);
      
      if (indiceExistente >= 0) {
        // Sumar cantidades si el producto ya existe
        const cantidadExistente = productosActualizados[indiceExistente].cantidad;
        const cantidadNueva = parseFloat(nuevoItem.cantidad);
        const cantidadTotal = cantidadExistente + cantidadNueva;
        
        productosActualizados[indiceExistente].cantidad = cantidadTotal;
        productosActualizados[indiceExistente].subtotal = cantidadTotal * nuevoItem.producto.precio;
        
        console.log(`📈 Producto ${nuevoItem.producto.nombre}: ${cantidadExistente} + ${cantidadNueva} = ${cantidadTotal}`);
      } else {
        // Agregar producto nuevo
        const cantidad = parseFloat(nuevoItem.cantidad);
        productosActualizados.push({
          id: nuevoItem.producto.id,
          nombre: nuevoItem.producto.nombre,
          cantidad: cantidad,
          unidad: nuevoItem.unidad,
          precio: nuevoItem.producto.precio,
          subtotal: cantidad * nuevoItem.producto.precio
        });
        
        console.log(`➕ Producto nuevo agregado: ${nuevoItem.producto.nombre} - ${nuevoItem.cantidad} ${nuevoItem.unidad}`);
      }
    }
    
    // Calcular el total actualizado
    const totalActualizado = productosActualizados.reduce((sum, producto) => sum + producto.subtotal, 0);
    
    // Actualizar la orden usando la función interna para evitar recursión
    const ordenRef = ref(database, 'ordenes/' + ordenExistente.id);
    const ordenActualizada: Orden = {
      ...ordenExistente,
      productos: productosActualizados,
      total: totalActualizado,
      updatedAt: new Date().toISOString()
    };
    await set(ordenRef, ordenActualizada);
    
    console.log('✅ Orden de producción actualizada:', ordenExistente.id);
  } catch (error) {
    console.error('❌ Error actualizando orden existente:', error);
    throw error;
  }
};

/**
 * Crea una nueva orden de producción
 */
const crearNuevaOrdenProduccion = async (
  productor: Proveedor,
  productos: Array<{ producto: Producto; cantidad: string; unidad: string }>,
  fechaProduccion: string,
  observaciones: string
): Promise<void> => {
  try {
    // Normalizar fecha para la orden automática (usar solo día sin hora específica)
    const fechaNormalizada = fechaProduccion.split(' ')[0] + ' 00:00:00'; // "20-09-2025 00:00:00"
    
    const nuevaOrden: Omit<Orden, 'id'> = {
      proveedorId: productor.id,
      proveedorNombre: productor.nombre,
      fecha: fechaNormalizada,
      tipo: 'AUTOMATICA', // Tipo "Automática" para órdenes automáticas de producción
      estado: 'PENDIENTE',
      productos: productos.map(item => ({
        id: item.producto.id,
        nombre: item.producto.nombre,
        cantidad: parseFloat(item.cantidad),
        unidad: item.unidad,
        precio: item.producto.precio,
        subtotal: parseFloat(item.cantidad) * item.producto.precio // Calcular subtotal correctamente
      })),
      total: productos.reduce((sum, item) => sum + (parseFloat(item.cantidad) * item.producto.precio), 0), // Calcular total
      observaciones,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Usar una función interna para evitar recursión infinita
    const ordenesRef = ref(database, 'ordenes');
    const nuevaOrdenRef = push(ordenesRef);
    const id = nuevaOrdenRef.key!;
    const ordenConId = { ...nuevaOrden, id };
    await set(nuevaOrdenRef, ordenConId);
    
    console.log(`✅ Nueva orden de producción creada: ${id} para ${productor.nombre}`);
    
    // Enviar notificación para nueva orden automática
    try {
      await notifyNewOrderToAllUsers(ordenConId, productor.nombre);
      console.log('✅ Notificación enviada para nueva orden automática');
    } catch (error) {
      console.warn('⚠️ Error enviando notificación para orden automática:', error);
    }
  } catch (error) {
    console.error('❌ Error creando nueva orden de producción:', error);
    throw error;
  }
};

/**
 * Calcula la semana del mes (1-4) basada en una fecha
 * @param fecha - Fecha en formato "DD-MM-YYYY HH:MM:SS"
 * @returns Número de semana del mes (1-4)
 */
export const calcularSemanaDelMes = (fecha: string): number => {
  try {
    const [fechaParte] = fecha.split(' ');
    const [dia, mes, ano] = fechaParte.split('-').map(Number);
    const fechaObj = new Date(ano, mes - 1, dia);
    
    // Obtener el primer día del mes
    const primerDia = new Date(ano, mes - 1, 1);
    const diaSemana = primerDia.getDay(); // 0 = domingo, 1 = lunes, etc.
    
    // Calcular la semana considerando que la primera semana puede estar incompleta
    const diaDelMes = fechaObj.getDate();
    const semana = Math.ceil((diaDelMes + diaSemana) / 7);
    
    return Math.min(semana, 4); // Máximo 4 semanas
  } catch (error) {
    console.error('Error calculando semana del mes:', error);
    return 1; // Por defecto primera semana
  }
};

/**
 * Analiza el historial de órdenes para generar sugerencias basadas en patrones
 * @param proveedorId - ID del proveedor
 * @param ordenes - Array de todas las órdenes
 * @param productos - Array de todos los productos
 * @returns Array de productos sugeridos con cantidades promedio
 */
export const generarSugerenciasOrden = (
  proveedorId: string, 
  ordenes: Orden[], 
  productos: Producto[]
): Array<{ 
  producto: Producto; 
  cantidadSugerida: number; 
  unidadSugerida: string;
  promedioCalculado: number;
  ordenesAnalizadas: number;
}> => {
  try {
    // Obtener la fecha actual y calcular la semana del mes actual
    const fechaActual = new Date();
    const diaActual = fechaActual.getDate();
    const mesActual = fechaActual.getMonth();
    const anoActual = fechaActual.getFullYear();
    
    // Calcular semana actual del mes
    const primerDia = new Date(anoActual, mesActual, 1);
    const diaSemana = primerDia.getDay();
    const semanaActual = Math.min(Math.ceil((diaActual + diaSemana) / 7), 4);
    
    console.log('📊 Generando sugerencias para:', {
      proveedorId,
      semanaActual,
      fechaActual: fechaActual.toISOString().split('T')[0]
    });

    // Filtrar órdenes del proveedor que estén completadas
    const ordenesProveedor = ordenes.filter(orden => 
      orden.proveedorId === proveedorId && 
      orden.estado === 'COMPLETADA' &&
      orden.productos && 
      orden.productos.length > 0
    );

    console.log('📋 Órdenes del proveedor encontradas:', ordenesProveedor.length);

    // Agrupar productos por ID y semana del mes
    const historialProductos: Record<string, Array<{
      cantidad: number;
      unidad: string;
      fecha: string;
      semana: number;
    }>> = {};

    // Procesar cada orden
    ordenesProveedor.forEach(orden => {
      const semanaOrden = calcularSemanaDelMes(orden.fecha);
      
      // Solo considerar órdenes de la misma semana del mes que la actual
      if (semanaOrden === semanaActual) {
        orden.productos.forEach(producto => {
          const productoId = producto.id || producto.productoId;
          if (!productoId) return;

          if (!historialProductos[productoId]) {
            historialProductos[productoId] = [];
          }

          historialProductos[productoId].push({
            cantidad: parseFloat(producto.cantidad?.toString() || '0'),
            unidad: producto.unidad,
            fecha: orden.fecha,
            semana: semanaOrden
          });
        });
      }
    });

    console.log('📊 Historial de productos procesado:', {
      productosConHistorial: Object.keys(historialProductos).length,
      semanaAnalizada: semanaActual
    });

    // Generar sugerencias basadas en el historial
    const sugerencias: Array<{ 
      producto: Producto; 
      cantidadSugerida: number; 
      unidadSugerida: string;
      promedioCalculado: number;
      ordenesAnalizadas: number;
    }> = [];

    Object.entries(historialProductos).forEach(([productoId, historial]) => {
      // Verificar que tenga al menos 5 órdenes para esta semana
      if (historial.length >= 5) {
        // Encontrar el producto correspondiente
        const producto = productos.find(p => p.id === productoId);
        if (!producto) return;

        // Calcular promedio de cantidades
        const cantidades = historial.map(h => h.cantidad);
        const promedioCalculado = cantidades.reduce((sum, cant) => sum + cant, 0) / cantidades.length;
        const cantidadSugerida = Math.round(promedioCalculado);

        // Usar la unidad más frecuente
        const unidades = historial.map(h => h.unidad);
        const unidadMasFrecuente = unidades.reduce((a, b, i, arr) =>
          arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
        );

        sugerencias.push({
          producto,
          cantidadSugerida,
          unidadSugerida: unidadMasFrecuente,
          promedioCalculado,
          ordenesAnalizadas: historial.length
        });

        console.log('💡 Sugerencia generada:', {
          producto: producto.nombre,
          cantidadSugerida,
          unidadSugerida: unidadMasFrecuente,
          promedioCalculado: promedioCalculado.toFixed(2),
          ordenesAnalizadas: historial.length
        });
      } else {
        console.log('📉 Producto sin datos suficientes:', {
          productoId,
          ordenesEncontradas: historial.length,
          minimoRequerido: 5
        });
      }
    });

    // Ordenar sugerencias por cantidad promedio (mayor a menor)
    sugerencias.sort((a, b) => b.promedioCalculado - a.promedioCalculado);

    console.log('✅ Sugerencias generadas:', {
      totalSugerencias: sugerencias.length,
      semanaAnalizada: semanaActual
    });

    return sugerencias;
  } catch (error) {
    console.error('❌ Error generando sugerencias de orden:', error);
    return [];
  }
}; 