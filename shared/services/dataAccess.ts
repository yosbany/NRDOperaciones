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
import {
  Estadisticas,
  Evento,
  FcmToken,
  IngredienteCosto,
  Orden,
  OrdenFilter,
  Producto,
  ProductoFilter,
  ProductoOrden,
  Proveedor,
  ProveedorFilter,
  RecetaCosto,
  Tarea,
  User
} from '../models';
import { database } from './firebaseConfig';

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
        return Object.keys(data).map(key => {
          const ordenData = data[key];
          const productos = ordenData.productos?.map((p: any) => 
            new ProductoOrden(p.productoId, p.productoId, p.cantidad, p.unidad, p.precio, p.nombre)
          ) || [];
          
          return new Orden(
            key,
            ordenData.estado,
            ordenData.fecha,
            ordenData.hecha,
            ordenData.proveedorId,
            productos,
            ordenData.tipo
          );
        });
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
        const ordenData = snapshot.val();
        const productos = ordenData.productos?.map((p: any) => 
          new ProductoOrden(p.productoId, p.productoId, p.cantidad, p.unidad, p.precio, p.nombre)
        ) || [];
        
        return new Orden(
          id,
          ordenData.estado,
          ordenData.fecha,
          ordenData.hecha,
          ordenData.proveedorId,
          productos,
          ordenData.tipo
        );
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo orden:', error);
      throw error;
    }
  }

  async saveOrden(orden: Orden): Promise<string> {
    try {
      const ordenesRef = ref(this.database, 'ordenes');
      const newOrdenRef = push(ordenesRef);
      
      // Convertir la clase Orden a objeto plano para Firebase
      const ordenData = {
        estado: orden.estado,
        fecha: orden.fecha,
        hecha: orden.hecha,
        tipo: orden.tipo,
        proveedorId: orden.proveedorId,
        productos: orden.productos.map(p => ({
          productoId: p.productoId,
          cantidad: p.cantidad,
          unidad: p.unidad,
          precio: p.precio,
          nombre: p.nombre
        }))
      };
      
      await set(newOrdenRef, ordenData);
      return newOrdenRef.key!;
    } catch (error) {
      console.error('Error guardando orden:', error);
      throw error;
    }
  }

  async updateOrden(id: string, orden: Orden): Promise<void> {
    try {
      const ordenRef = ref(this.database, `ordenes/${id}`);
      
      // Convertir la clase Orden a objeto plano para Firebase
      const ordenData = {
        estado: orden.estado,
        fecha: orden.fecha,
        hecha: orden.hecha,
        tipo: orden.tipo,
        proveedorId: orden.proveedorId,
        productos: orden.productos.map(p => ({
          productoId: p.productoId,
          cantidad: p.cantidad,
          unidad: p.unidad,
          precio: p.precio,
          nombre: p.nombre
        }))
      };
      
      await set(ordenRef, ordenData);
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
        return Object.keys(data).map(key => {
          const productoData = data[key];
          return new Producto(
            key,
            productoData.nombre,
            productoData.orden,
            productoData.precio,
            productoData.proveedorId || '',
            productoData.stock,
            productoData.unidad
          );
        });
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
        const productoData = snapshot.val();
        return new Producto(
          id,
          productoData.nombre,
          productoData.orden,
          productoData.precio,
          productoData.proveedorId || '',
          productoData.stock,
          productoData.unidad
        );
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo producto:', error);
      throw error;
    }
  }

  async saveProducto(producto: Producto): Promise<string> {
    try {
      const productosRef = ref(this.database, 'productos');
      const newProductoRef = push(productosRef);
      
      // Convertir la clase Producto a objeto plano para Firebase
      const productoData = {
        nombre: producto.nombre,
        orden: producto.orden,
        precio: producto.precio,
        proveedorId: producto.proveedorId,
        stock: producto.stock,
        unidad: producto.unidad
      };
      
      await set(newProductoRef, productoData);
      return newProductoRef.key!;
    } catch (error) {
      console.error('Error guardando producto:', error);
      throw error;
    }
  }

  async updateProducto(id: string, producto: Producto): Promise<void> {
    try {
      const productoRef = ref(this.database, `productos/${id}`);
      
      // Convertir la clase Producto a objeto plano para Firebase
      const productoData = {
        nombre: producto.nombre,
        orden: producto.orden,
        precio: producto.precio,
        proveedorId: producto.proveedorId,
        stock: producto.stock,
        unidad: producto.unidad
      };
      
      await set(productoRef, productoData);
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
        return Object.keys(data).map(key => {
          const proveedorData = data[key];
          return new Proveedor(
            key,
            proveedorData.nombre,
            proveedorData.tipo,
            proveedorData.celular,
            proveedorData.salarioPorDia,
            proveedorData.frecuencia,
            proveedorData.productosDefault,
            proveedorData.updatedAt
          );
        });
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
        const proveedorData = snapshot.val();
        return new Proveedor(
          id,
          proveedorData.nombre,
          proveedorData.tipo,
          proveedorData.celular,
          proveedorData.salarioPorDia,
          proveedorData.frecuencia,
          proveedorData.productosDefault,
          proveedorData.updatedAt
        );
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo proveedor:', error);
      throw error;
    }
  }

  async saveProveedor(proveedor: Proveedor): Promise<string> {
    try {
      const proveedoresRef = ref(this.database, 'proveedores');
      const newProveedorRef = push(proveedoresRef);
      
      // Convertir la clase Proveedor a objeto plano para Firebase
      const proveedorData = {
        nombre: proveedor.nombre,
        tipo: proveedor.tipo,
        celular: proveedor.celular,
        salarioPorDia: proveedor.salarioPorDia,
        frecuencia: proveedor.frecuencia,
        productosDefault: proveedor.productosDefault,
        updatedAt: proveedor.updatedAt
      };
      
      await set(newProveedorRef, proveedorData);
      return newProveedorRef.key!;
    } catch (error) {
      console.error('Error guardando proveedor:', error);
      throw error;
    }
  }

  async updateProveedor(id: string, proveedor: Proveedor): Promise<void> {
    try {
      const proveedorRef = ref(this.database, `proveedores/${id}`);
      
      // Convertir la clase Proveedor a objeto plano para Firebase
      const proveedorData = {
        nombre: proveedor.nombre,
        tipo: proveedor.tipo,
        celular: proveedor.celular,
        salarioPorDia: proveedor.salarioPorDia,
        frecuencia: proveedor.frecuencia,
        productosDefault: proveedor.productosDefault,
        updatedAt: proveedor.updatedAt
      };
      
      await set(proveedorRef, proveedorData);
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
        return Object.keys(data).map(key => {
          const tareaData = data[key];
          return new Tarea(
            key,
            tareaData.titulo,
            tareaData.completada,
            tareaData.descripcion,
            tareaData.asignadaA,
            tareaData.usuarioAsignado,
            tareaData.prioridad,
            tareaData.publica,
            tareaData.seguidores,
            tareaData.observacion,
            tareaData.createdAt,
            tareaData.updatedAt,
            tareaData.fechaCompletada
          );
        });
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
        const tareaData = snapshot.val();
        return new Tarea(
          id,
          tareaData.titulo,
          tareaData.completada,
          tareaData.descripcion,
          tareaData.asignadaA,
          tareaData.usuarioAsignado,
          tareaData.prioridad,
          tareaData.publica,
          tareaData.seguidores,
          tareaData.observacion,
          tareaData.createdAt,
          tareaData.updatedAt,
          tareaData.fechaCompletada
        );
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo tarea:', error);
      throw error;
    }
  }

  async saveTarea(tarea: Tarea): Promise<string> {
    try {
      const tareasRef = ref(this.database, 'tareas');
      const newTareaRef = push(tareasRef);
      
      // Convertir la clase Tarea a objeto plano para Firebase
      const tareaData = {
        titulo: tarea.titulo,
        descripcion: tarea.descripcion,
        asignadaA: tarea.asignadaA,
        usuarioAsignado: tarea.usuarioAsignado,
        prioridad: tarea.prioridad,
        completada: tarea.completada,
        publica: tarea.publica,
        seguidores: tarea.seguidores,
        observacion: tarea.observacion,
        createdAt: tarea.createdAt,
        updatedAt: tarea.updatedAt,
        fechaCompletada: tarea.fechaCompletada
      };
      
      await set(newTareaRef, tareaData);
      return newTareaRef.key!;
    } catch (error) {
      console.error('Error guardando tarea:', error);
      throw error;
    }
  }

  async updateTarea(id: string, tarea: Tarea): Promise<void> {
    try {
      const tareaRef = ref(this.database, `tareas/${id}`);
      
      // Convertir la clase Tarea a objeto plano para Firebase
      const tareaData = {
        titulo: tarea.titulo,
        descripcion: tarea.descripcion,
        asignadaA: tarea.asignadaA,
        usuarioAsignado: tarea.usuarioAsignado,
        prioridad: tarea.prioridad,
        completada: tarea.completada,
        publica: tarea.publica,
        seguidores: tarea.seguidores,
        observacion: tarea.observacion,
        createdAt: tarea.createdAt,
        updatedAt: tarea.updatedAt,
        fechaCompletada: tarea.fechaCompletada
      };
      
      await set(tareaRef, tareaData);
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
        return Object.keys(data).map(key => {
          const userData = data[key];
          return new User(
            key,
            userData.displayName,
            userData.email,
            userData.role,
            userData.userId,
            userData.contactId,
            userData.idContacto,
            userData.username,
            userData.nombre,
            userData.createdAt,
            userData.updatedAt
          );
        });
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
        const userData = data[userId];
        return new User(
          userId,
          userData.displayName,
          userData.email,
          userData.role,
          userData.userId,
          userData.contactId,
          userData.idContacto,
          userData.username,
          userData.nombre,
          userData.createdAt,
          userData.updatedAt
        );
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      throw error;
    }
  }

  async saveUser(user: User): Promise<string> {
    try {
      const usersRef = ref(this.database, 'users');
      const newUserRef = push(usersRef);
      
      // Convertir la clase User a objeto plano para Firebase
      const userData = {
        userId: user.userId,
        contactId: user.contactId,
        idContacto: user.idContacto,
        displayName: user.displayName,
        email: user.email,
        username: user.username,
        nombre: user.nombre,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
      await set(newUserRef, userData);
      return newUserRef.key!;
    } catch (error) {
      console.error('Error guardando usuario:', error);
      throw error;
    }
  }

  async updateUser(id: string, user: User): Promise<void> {
    try {
      const userRef = ref(this.database, `users/${id}`);
      
      // Convertir la clase User a objeto plano para Firebase
      const userData = {
        userId: user.userId,
        contactId: user.contactId,
        idContacto: user.idContacto,
        displayName: user.displayName,
        email: user.email,
        username: user.username,
        nombre: user.nombre,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
      await set(userRef, userData);
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
        return Object.keys(data).map(key => {
          const recetaData = data[key];
          const ingredientes = recetaData.ingredientes?.map((i: any) => 
            new IngredienteCosto(
              i.id || '',
              i.nombre,
              i.productoId,
              i.tipo || '',
              i.unidad,
              i.cantidad,
              i.costo
            )
          ) || [];
          
          return new RecetaCosto(
            key,
            recetaData.nombre,
            recetaData.productoId,
            ingredientes,
            recetaData.costoTotal,
            recetaData.createdAt,
            recetaData.updatedAt
          );
        });
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
        const recetaData = snapshot.val();
        const ingredientes = recetaData.ingredientes?.map((i: any) => 
          new IngredienteCosto(
            i.id || '',
            i.nombre,
            i.productoId,
            i.tipo || '',
            i.unidad,
            i.cantidad,
            i.costo
          )
        ) || [];
        
        return new RecetaCosto(
          id,
          recetaData.nombre,
          recetaData.productoId,
          ingredientes,
          recetaData.costoTotal,
          recetaData.createdAt,
          recetaData.updatedAt
        );
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo receta de costo:', error);
      throw error;
    }
  }

  async saveRecetaCosto(receta: RecetaCosto): Promise<string> {
    try {
      const recetasRef = ref(this.database, 'recetasCostos');
      const newRecetaRef = push(recetasRef);
      
      // Convertir la clase RecetaCosto a objeto plano para Firebase
      const recetaData = {
        nombre: receta.nombre,
        productoId: receta.productoId,
        ingredientes: receta.ingredientes.map(i => ({
          nombre: i.nombre,
          productoId: i.productoId,
          tipo: i.tipo,
          unidad: i.unidad,
          cantidad: i.cantidad,
          costo: i.costo
        })),
        costoTotal: receta.costoTotal,
        createdAt: receta.createdAt,
        updatedAt: receta.updatedAt
      };
      
      await set(newRecetaRef, recetaData);
      return newRecetaRef.key!;
    } catch (error) {
      console.error('Error guardando receta de costo:', error);
      throw error;
    }
  }

  async updateRecetaCosto(id: string, receta: RecetaCosto): Promise<void> {
    try {
      const recetaRef = ref(this.database, `recetasCostos/${id}`);
      
      // Convertir la clase RecetaCosto a objeto plano para Firebase
      const recetaData = {
        nombre: receta.nombre,
        productoId: receta.productoId,
        ingredientes: receta.ingredientes.map(i => ({
          nombre: i.nombre,
          productoId: i.productoId,
          tipo: i.tipo,
          unidad: i.unidad,
          cantidad: i.cantidad,
          costo: i.costo
        })),
        costoTotal: receta.costoTotal,
        createdAt: receta.createdAt,
        updatedAt: receta.updatedAt
      };
      
      await set(recetaRef, recetaData);
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

  // ===== FUNCIONES ESPECÍFICAS PARA MÓVIL =====
  
  // Obtener órdenes por rol de usuario (para compatibilidad con app móvil)
  async getOrdenesByUserRole(user: User, callback: (ordenes: Orden[]) => void): Promise<void> {
    try {
      const ordenes = await this.getOrdenes();
      
      // Filtrar órdenes según el rol del usuario
      let ordenesFiltradas = ordenes;
      
      if (user.role === 'PRODUCTOR' && user.contactId) {
        // Los productores solo ven sus propias órdenes
        ordenesFiltradas = ordenes.filter(orden => orden.proveedorId === user.contactId);
      }
      
      callback(ordenesFiltradas);
    } catch (error) {
      console.error('Error obteniendo órdenes por rol:', error);
      callback([]);
    }
  }

  // Obtener órdenes con callback (para compatibilidad con app móvil)
  async getOrdenesCallback(callback: (ordenes: Orden[]) => void): Promise<void> {
    try {
      const ordenes = await this.getOrdenes();
      callback(ordenes);
    } catch (error) {
      console.error('Error obteniendo órdenes:', error);
      callback([]);
    }
  }

  // Obtener productos con callback (para compatibilidad con app móvil)
  async getProductosCallback(callback: (productos: Producto[]) => void): Promise<void> {
    try {
      const productos = await this.getProductos();
      callback(productos);
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      callback([]);
    }
  }

  // Obtener proveedores con callback (para compatibilidad con app móvil)
  async getProveedoresCallback(callback: (proveedores: Proveedor[]) => void): Promise<void> {
    try {
      const proveedores = await this.getProveedores();
      callback(proveedores);
    } catch (error) {
      console.error('Error obteniendo proveedores:', error);
      callback([]);
    }
  }

  // Obtener tareas con callback (para compatibilidad con app móvil)
  async getTareasCallback(callback: (tareas: Tarea[]) => void): Promise<void> {
    try {
      const tareas = await this.getTareas();
      callback(tareas);
    } catch (error) {
      console.error('Error obteniendo tareas:', error);
      callback([]);
    }
  }

  // Obtener tareas por rol de usuario (para compatibilidad con app móvil)
  async getTareasByUserRole(user: User, callback: (tareas: Tarea[]) => void): Promise<void> {
    try {
      const tareas = await this.getTareas();
      
      // Filtrar tareas según el rol del usuario
      let tareasFiltradas = tareas;
      
      if (user.role === 'PRODUCTOR' && user.contactId) {
        // Los productores solo ven tareas asignadas a ellos
        tareasFiltradas = tareas.filter(tarea => tarea.asignadaA === user.contactId);
      }
      
      callback(tareasFiltradas);
    } catch (error) {
      console.error('Error obteniendo tareas por rol:', error);
      callback([]);
    }
  }

  // Obtener órdenes con información de proveedores resuelta
  async getOrdenesConProveedores(): Promise<Orden[]> {
    const ordenes = await this.getOrdenes();
    return ordenes;
  }

  // Obtener productos con información de proveedores resuelta
  async getProductosConProveedores(): Promise<Producto[]> {
    const productos = await this.getProductos();
    return productos;
  }

  // Buscar proveedor por ID (método de conveniencia)
  async findProveedorById(proveedorId: string): Promise<Proveedor | null> {
    return this.getProveedorById(proveedorId);
  }

  // Buscar producto por ID (método de conveniencia)
  async findProductoById(productoId: string): Promise<Producto | null> {
    return this.getProductoById(productoId);
  }

  // Obtener datos completos para el dashboard (específico para web)
  async getDashboardData(): Promise<{
    ordenes: Orden[];
    productos: Producto[];
    proveedores: Proveedor[];
    tareas: Tarea[];
    ordenesConProveedores: (Orden & { proveedor?: Proveedor })[];
    productosConProveedores: (Producto & { proveedor?: Proveedor })[];
  }> {
    const [ordenes, productos, proveedores, tareas] = await Promise.all([
      this.getOrdenes(),
      this.getProductos(),
      this.getProveedores(),
      this.getTareas()
    ]);

    const ordenesConProveedores = ordenes.map(orden => orden);
    const productosConProveedores = productos.map(producto => producto);

    return {
      ordenes,
      productos,
      proveedores,
      tareas,
      ordenesConProveedores,
      productosConProveedores
    };
  }

  // Obtener estadísticas del dashboard (específico para web)
  async getDashboardStats(): Promise<{
    totalOrdenes: number;
    totalProductos: number;
    totalProveedores: number;
    totalTareas: number;
    ordenesPendientes: number;
    ordenesCompletadas: number;
    productosBajoStock: number;
  }> {
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

  // ===== EVENTOS =====
  async getEventos(): Promise<Evento[]> {
    try {
      const eventosRef = ref(this.database, 'eventos');
      const snapshot = await get(eventosRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => {
          const eventoData = data[key];
          return new Evento(
            key,
            eventoData.tipo,
            eventoData.fecha,
            eventoData.descripcion,
            eventoData.usuarioId
          );
        });
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo eventos:', error);
      throw error;
    }
  }

  async saveEvento(evento: Evento): Promise<string> {
    try {
      const eventosRef = ref(this.database, 'eventos');
      const newEventoRef = push(eventosRef);
      
      const eventoData = {
        tipo: evento.tipo,
        descripcion: evento.descripcion,
        fecha: evento.fecha,
        usuarioId: evento.usuarioId
      };
      
      await set(newEventoRef, eventoData);
      return newEventoRef.key!;
    } catch (error) {
      console.error('Error guardando evento:', error);
      throw error;
    }
  }

  // ===== FCM TOKENS =====
  async getFcmTokens(): Promise<FcmToken[]> {
    try {
      const tokensRef = ref(this.database, 'fcm_tokens');
      const snapshot = await get(tokensRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => {
          const tokenData = data[key];
          return new FcmToken(
            key,
            tokenData.userId,
            tokenData.token,
            tokenData.updatedAt
          );
        });
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo FCM tokens:', error);
      throw error;
    }
  }

  async saveFcmToken(token: FcmToken): Promise<string> {
    try {
      const tokensRef = ref(this.database, 'fcm_tokens');
      const newTokenRef = push(tokensRef);
      
      const tokenData = {
        userId: token.userId,
        token: token.token,
        updatedAt: token.updatedAt
      };
      
      await set(newTokenRef, tokenData);
      return newTokenRef.key!;
    } catch (error) {
      console.error('Error guardando FCM token:', error);
      throw error;
    }
  }

  async updateFcmToken(id: string, token: FcmToken): Promise<void> {
    try {
      const tokenRef = ref(this.database, `fcm_tokens/${id}`);
      
      const tokenData = {
        userId: token.userId,
        token: token.token,
        updatedAt: token.updatedAt
      };
      
      await set(tokenRef, tokenData);
    } catch (error) {
      console.error('Error actualizando FCM token:', error);
      throw error;
    }
  }
}

// Instancia singleton
export const dataAccess = new DataAccessLayer();
