// Capa de acceso a datos unificada para móvil y web
import {
  equalTo,
  get,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  remove,
  set
} from 'firebase/database';
import { database } from './firebaseConfig';
import {
  Estadisticas,
  Orden,
  OrdenFilter,
  Producto,
  ProductoFilter,
  Proveedor,
  ProveedorFilter,
  RecetaCosto,
  Tarea,
  User
} from './types';

// Clase base para acceso a datos
export class DataAccessLayer {
  private database = database;

  // ===== ÓRDENES =====
  async getOrdenes(): Promise<Orden[]> {
    try {
      const ordenesRef = ref(this.database, 'ordenes');
      const snapshot = await get(ordenesRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo órdenes:', error);
      throw error;
    }
  }

  async getOrdenById(id: string): Promise<Orden | null> {
    try {
      const ordenRef = ref(this.database, `ordenes/${id}`);
      const snapshot = await get(ordenRef);
      
      if (snapshot.exists()) {
        return { id, ...snapshot.val() };
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo orden:', error);
      throw error;
    }
  }

  async saveOrden(orden: Omit<Orden, 'id'>): Promise<string> {
    try {
      const ordenesRef = ref(this.database, 'ordenes');
      const newOrdenRef = push(ordenesRef);
      await set(newOrdenRef, orden);
      return newOrdenRef.key!;
    } catch (error) {
      console.error('Error guardando orden:', error);
      throw error;
    }
  }

  async updateOrden(id: string, orden: Partial<Orden>): Promise<void> {
    try {
      const ordenRef = ref(this.database, `ordenes/${id}`);
      await set(ordenRef, { ...orden, fechaActualizacion: new Date().toISOString() });
    } catch (error) {
      console.error('Error actualizando orden:', error);
      throw error;
    }
  }

  async deleteOrden(id: string): Promise<void> {
    try {
      const ordenRef = ref(this.database, `ordenes/${id}`);
      await remove(ordenRef);
    } catch (error) {
      console.error('Error eliminando orden:', error);
      throw error;
    }
  }

  // ===== PRODUCTOS =====
  async getProductos(): Promise<Producto[]> {
    try {
      const productosRef = ref(this.database, 'productos');
      const snapshot = await get(productosRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      throw error;
    }
  }

  async getProductoById(id: string): Promise<Producto | null> {
    try {
      const productoRef = ref(this.database, `productos/${id}`);
      const snapshot = await get(productoRef);
      
      if (snapshot.exists()) {
        return { id, ...snapshot.val() };
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo producto:', error);
      throw error;
    }
  }

  async saveProducto(producto: Omit<Producto, 'id'>): Promise<string> {
    try {
      const productosRef = ref(this.database, 'productos');
      const newProductoRef = push(productosRef);
      await set(newProductoRef, producto);
      return newProductoRef.key!;
    } catch (error) {
      console.error('Error guardando producto:', error);
      throw error;
    }
  }

  async updateProducto(id: string, producto: Partial<Producto>): Promise<void> {
    try {
      const productoRef = ref(this.database, `productos/${id}`);
      await set(productoRef, { ...producto, fechaActualizacion: new Date().toISOString() });
    } catch (error) {
      console.error('Error actualizando producto:', error);
      throw error;
    }
  }

  async deleteProducto(id: string): Promise<void> {
    try {
      const productoRef = ref(this.database, `productos/${id}`);
      await remove(productoRef);
    } catch (error) {
      console.error('Error eliminando producto:', error);
      throw error;
    }
  }

  // ===== PROVEEDORES =====
  async getProveedores(): Promise<Proveedor[]> {
    try {
      const proveedoresRef = ref(this.database, 'proveedores');
      const snapshot = await get(proveedoresRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo proveedores:', error);
      throw error;
    }
  }

  async getProveedorById(id: string): Promise<Proveedor | null> {
    try {
      const proveedorRef = ref(this.database, `proveedores/${id}`);
      const snapshot = await get(proveedorRef);
      
      if (snapshot.exists()) {
        return { id, ...snapshot.val() };
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo proveedor:', error);
      throw error;
    }
  }

  async saveProveedor(proveedor: Omit<Proveedor, 'id'>): Promise<string> {
    try {
      const proveedoresRef = ref(this.database, 'proveedores');
      const newProveedorRef = push(proveedoresRef);
      await set(newProveedorRef, proveedor);
      return newProveedorRef.key!;
    } catch (error) {
      console.error('Error guardando proveedor:', error);
      throw error;
    }
  }

  async updateProveedor(id: string, proveedor: Partial<Proveedor>): Promise<void> {
    try {
      const proveedorRef = ref(this.database, `proveedores/${id}`);
      await set(proveedorRef, { ...proveedor, fechaActualizacion: new Date().toISOString() });
    } catch (error) {
      console.error('Error actualizando proveedor:', error);
      throw error;
    }
  }

  async deleteProveedor(id: string): Promise<void> {
    try {
      const proveedorRef = ref(this.database, `proveedores/${id}`);
      await remove(proveedorRef);
    } catch (error) {
      console.error('Error eliminando proveedor:', error);
      throw error;
    }
  }

  // ===== TAREAS =====
  async getTareas(): Promise<Tarea[]> {
    try {
      const tareasRef = ref(this.database, 'tareas');
      const snapshot = await get(tareasRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo tareas:', error);
      throw error;
    }
  }

  async getTareaById(id: string): Promise<Tarea | null> {
    try {
      const tareaRef = ref(this.database, `tareas/${id}`);
      const snapshot = await get(tareaRef);
      
      if (snapshot.exists()) {
        return { id, ...snapshot.val() };
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo tarea:', error);
      throw error;
    }
  }

  async saveTarea(tarea: Omit<Tarea, 'id'>): Promise<string> {
    try {
      const tareasRef = ref(this.database, 'tareas');
      const newTareaRef = push(tareasRef);
      await set(newTareaRef, tarea);
      return newTareaRef.key!;
    } catch (error) {
      console.error('Error guardando tarea:', error);
      throw error;
    }
  }

  async updateTarea(id: string, tarea: Partial<Tarea>): Promise<void> {
    try {
      const tareaRef = ref(this.database, `tareas/${id}`);
      await set(tareaRef, { ...tarea, fechaActualizacion: new Date().toISOString() });
    } catch (error) {
      console.error('Error actualizando tarea:', error);
      throw error;
    }
  }

  async deleteTarea(id: string): Promise<void> {
    try {
      const tareaRef = ref(this.database, `tareas/${id}`);
      await remove(tareaRef);
    } catch (error) {
      console.error('Error eliminando tarea:', error);
      throw error;
    }
  }

  // ===== USUARIOS =====
  async getUsers(): Promise<User[]> {
    try {
      const usersRef = ref(this.database, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      throw error;
    }
  }

  async getUserByUid(uid: string): Promise<User | null> {
    try {
      const usersRef = ref(this.database, 'users');
      const userQuery = query(usersRef, orderByChild('uid'), equalTo(uid));
      const snapshot = await get(userQuery);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const userId = Object.keys(data)[0];
        return { id: userId, ...data[userId] };
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      throw error;
    }
  }

  async saveUser(user: Omit<User, 'id'>): Promise<string> {
    try {
      const usersRef = ref(this.database, 'users');
      const newUserRef = push(usersRef);
      await set(newUserRef, user);
      return newUserRef.key!;
    } catch (error) {
      console.error('Error guardando usuario:', error);
      throw error;
    }
  }

  async updateUser(id: string, user: Partial<User>): Promise<void> {
    try {
      const userRef = ref(this.database, `users/${id}`);
      await set(userRef, { ...user, fechaActualizacion: new Date().toISOString() });
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      throw error;
    }
  }

  // ===== RECETAS DE COSTOS =====
  async getRecetasCostos(): Promise<RecetaCosto[]> {
    try {
      const recetasRef = ref(this.database, 'recetasCostos');
      const snapshot = await get(recetasRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo recetas de costos:', error);
      throw error;
    }
  }

  async getRecetaCostoById(id: string): Promise<RecetaCosto | null> {
    try {
      const recetaRef = ref(this.database, `recetasCostos/${id}`);
      const snapshot = await get(recetaRef);
      
      if (snapshot.exists()) {
        return { id, ...snapshot.val() };
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo receta de costo:', error);
      throw error;
    }
  }

  async saveRecetaCosto(receta: Omit<RecetaCosto, 'id'>): Promise<string> {
    try {
      const recetasRef = ref(this.database, 'recetasCostos');
      const newRecetaRef = push(recetasRef);
      await set(newRecetaRef, receta);
      return newRecetaRef.key!;
    } catch (error) {
      console.error('Error guardando receta de costo:', error);
      throw error;
    }
  }

  async updateRecetaCosto(id: string, receta: Partial<RecetaCosto>): Promise<void> {
    try {
      const recetaRef = ref(this.database, `recetasCostos/${id}`);
      await set(recetaRef, { ...receta, fechaActualizacion: new Date().toISOString() });
    } catch (error) {
      console.error('Error actualizando receta de costo:', error);
      throw error;
    }
  }

  async deleteRecetaCosto(id: string): Promise<void> {
    try {
      const recetaRef = ref(this.database, `recetasCostos/${id}`);
      await remove(recetaRef);
    } catch (error) {
      console.error('Error eliminando receta de costo:', error);
      throw error;
    }
  }

  // ===== FILTROS Y BÚSQUEDAS =====
  async getOrdenesFiltradas(filtro: OrdenFilter): Promise<Orden[]> {
    try {
      const ordenes = await this.getOrdenes();
      
      return ordenes.filter(orden => {
        if (filtro.estado && orden.estado !== filtro.estado) return false;
        if (filtro.proveedorId && orden.proveedorId !== filtro.proveedorId) return false;
        if (filtro.cliente && !orden.cliente?.toLowerCase().includes(filtro.cliente.toLowerCase())) return false;
        if (filtro.fechaDesde && orden.fecha < filtro.fechaDesde) return false;
        if (filtro.fechaHasta && orden.fecha > filtro.fechaHasta) return false;
        return true;
      });
    } catch (error) {
      console.error('Error filtrando órdenes:', error);
      throw error;
    }
  }

  async getProductosFiltrados(filtro: ProductoFilter): Promise<Producto[]> {
    try {
      const productos = await this.getProductos();
      
      return productos.filter(producto => {
        if (filtro.nombre && !producto.nombre.toLowerCase().includes(filtro.nombre.toLowerCase())) return false;
        if (filtro.proveedorId && producto.proveedorId !== filtro.proveedorId) return false;
        if (filtro.archivado !== undefined && producto.archivado !== filtro.archivado) return false;
        if (filtro.stockMinimo && producto.stock < filtro.stockMinimo) return false;
        return true;
      });
    } catch (error) {
      console.error('Error filtrando productos:', error);
      throw error;
    }
  }

  async getProveedoresFiltrados(filtro: ProveedorFilter): Promise<Proveedor[]> {
    try {
      const proveedores = await this.getProveedores();
      
      return proveedores.filter(proveedor => {
        if (filtro.nombre && !proveedor.nombre.toLowerCase().includes(filtro.nombre.toLowerCase())) return false;
        if (filtro.tipo && proveedor.tipo !== filtro.tipo) return false;
        if (filtro.activo !== undefined && proveedor.activo !== filtro.activo) return false;
        return true;
      });
    } catch (error) {
      console.error('Error filtrando proveedores:', error);
      throw error;
    }
  }

  // ===== ESTADÍSTICAS =====
  async getEstadisticas(): Promise<Estadisticas> {
    try {
      const [ordenes, productos, proveedores, tareas] = await Promise.all([
        this.getOrdenes(),
        this.getProductos(),
        this.getProveedores(),
        this.getTareas()
      ]);

      const ordenesPendientes = ordenes.filter(o => o.estado === 'PENDIENTE').length;
      const ordenesCompletadas = ordenes.filter(o => o.estado === 'COMPLETADA').length;
      const productosBajoStock = productos.filter(p => p.stock < 10).length;

      return {
        totalOrdenes: ordenes.length,
        totalProductos: productos.length,
        totalProveedores: proveedores.length,
        totalTareas: tareas.length,
        ordenesPendientes,
        ordenesCompletadas,
        productosBajoStock
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  // ===== LISTENERS EN TIEMPO REAL =====
  onOrdenesChange(callback: (ordenes: Orden[]) => void): () => void {
    const ordenesRef = ref(this.database, 'ordenes');
    
    const unsubscribe = onValue(ordenesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const ordenes = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        callback(ordenes);
      } else {
        callback([]);
      }
    });

    return unsubscribe;
  }

  onProveedoresChange(callback: (proveedores: Proveedor[]) => void): () => void {
    const proveedoresRef = ref(this.database, 'proveedores');
    
    const unsubscribe = onValue(proveedoresRef, (snapshot) => {
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
    });

    return unsubscribe;
  }

  onProductosChange(callback: (productos: Producto[]) => void): () => void {
    const productosRef = ref(this.database, 'productos');
    
    const unsubscribe = onValue(productosRef, (snapshot) => {
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
    });

    return unsubscribe;
  }

  onTareasChange(callback: (tareas: Tarea[]) => void): () => void {
    const tareasRef = ref(this.database, 'tareas');
    
    const unsubscribe = onValue(tareasRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const tareas = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        callback(tareas);
      } else {
        callback([]);
      }
    });

    return unsubscribe;
  }
}

// Instancia singleton
export const dataAccess = new DataAccessLayer();
