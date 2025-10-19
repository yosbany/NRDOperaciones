// Adaptador para la app móvil (React Native/Expo)
import { dataAccess } from './dataAccess';
import { Orden, Producto, Proveedor, Tarea, User, RecetaCosto } from './types';

// Adaptador para React Native/Expo
export class MobileDataAdapter {
  private dataAccess = dataAccess;

  // ===== ÓRDENES =====
  async getOrdenes(): Promise<Orden[]> {
    return this.dataAccess.getOrdenes();
  }

  async getOrdenById(id: string): Promise<Orden | null> {
    return this.dataAccess.getOrdenById(id);
  }

  async saveOrden(orden: Omit<Orden, 'id'>): Promise<string> {
    return this.dataAccess.saveOrden(orden);
  }

  async updateOrden(id: string, orden: Partial<Orden>): Promise<void> {
    return this.dataAccess.updateOrden(id, orden);
  }

  async deleteOrden(id: string): Promise<void> {
    return this.dataAccess.deleteOrden(id);
  }

  // ===== PRODUCTOS =====
  async getProductos(): Promise<Producto[]> {
    return this.dataAccess.getProductos();
  }

  async getProductoById(id: string): Promise<Producto | null> {
    return this.dataAccess.getProductoById(id);
  }

  async saveProducto(producto: Omit<Producto, 'id'>): Promise<string> {
    return this.dataAccess.saveProducto(producto);
  }

  async updateProducto(id: string, producto: Partial<Producto>): Promise<void> {
    return this.dataAccess.updateProducto(id, producto);
  }

  async deleteProducto(id: string): Promise<void> {
    return this.dataAccess.deleteProducto(id);
  }

  // ===== PROVEEDORES =====
  async getProveedores(): Promise<Proveedor[]> {
    return this.dataAccess.getProveedores();
  }

  async getProveedorById(id: string): Promise<Proveedor | null> {
    return this.dataAccess.getProveedorById(id);
  }

  async saveProveedor(proveedor: Omit<Proveedor, 'id'>): Promise<string> {
    return this.dataAccess.saveProveedor(proveedor);
  }

  async updateProveedor(id: string, proveedor: Partial<Proveedor>): Promise<void> {
    return this.dataAccess.updateProveedor(id, proveedor);
  }

  async deleteProveedor(id: string): Promise<void> {
    return this.dataAccess.deleteProveedor(id);
  }

  // ===== TAREAS =====
  async getTareas(): Promise<Tarea[]> {
    return this.dataAccess.getTareas();
  }

  async getTareaById(id: string): Promise<Tarea | null> {
    return this.dataAccess.getTareaById(id);
  }

  async saveTarea(tarea: Omit<Tarea, 'id'>): Promise<string> {
    return this.dataAccess.saveTarea(tarea);
  }

  async updateTarea(id: string, tarea: Partial<Tarea>): Promise<void> {
    return this.dataAccess.updateTarea(id, tarea);
  }

  async deleteTarea(id: string): Promise<void> {
    return this.dataAccess.deleteTarea(id);
  }

  // ===== USUARIOS =====
  async getUsers(): Promise<User[]> {
    return this.dataAccess.getUsers();
  }

  async getUserByUid(uid: string): Promise<User | null> {
    return this.dataAccess.getUserByUid(uid);
  }

  async saveUser(user: Omit<User, 'id'>): Promise<string> {
    return this.dataAccess.saveUser(user);
  }

  async updateUser(id: string, user: Partial<User>): Promise<void> {
    return this.dataAccess.updateUser(id, user);
  }

  // ===== RECETAS DE COSTOS =====
  async getRecetasCostos(): Promise<RecetaCosto[]> {
    return this.dataAccess.getRecetasCostos();
  }

  async getRecetaCostoById(id: string): Promise<RecetaCosto | null> {
    return this.dataAccess.getRecetaCostoById(id);
  }

  async saveRecetaCosto(receta: Omit<RecetaCosto, 'id'>): Promise<string> {
    return this.dataAccess.saveRecetaCosto(receta);
  }

  async updateRecetaCosto(id: string, receta: Partial<RecetaCosto>): Promise<void> {
    return this.dataAccess.updateRecetaCosto(id, receta);
  }

  async deleteRecetaCosto(id: string): Promise<void> {
    return this.dataAccess.deleteRecetaCosto(id);
  }

  // ===== LISTENERS EN TIEMPO REAL =====
  onOrdenesChange(callback: (ordenes: Orden[]) => void): () => void {
    return this.dataAccess.onOrdenesChange(callback);
  }

  onProveedoresChange(callback: (proveedores: Proveedor[]) => void): () => void {
    return this.dataAccess.onProveedoresChange(callback);
  }

  onProductosChange(callback: (productos: Producto[]) => void): () => void {
    return this.dataAccess.onProductosChange(callback);
  }

  onTareasChange(callback: (tareas: Tarea[]) => void): () => void {
    return this.dataAccess.onTareasChange(callback);
  }

  // ===== MÉTODOS ESPECÍFICOS PARA MÓVIL =====
  
  // Obtener órdenes con información de proveedores resuelta
  async getOrdenesConProveedores(): Promise<(Orden & { proveedor?: Proveedor })[]> {
    const [ordenes, proveedores] = await Promise.all([
      this.getOrdenes(),
      this.getProveedores()
    ]);

    return ordenes.map(orden => ({
      ...orden,
      proveedor: orden.proveedorId ? proveedores.find(p => p.id === orden.proveedorId) : undefined
    }));
  }

  // Obtener productos con información de proveedores resuelta
  async getProductosConProveedores(): Promise<(Producto & { proveedor?: Proveedor })[]> {
    const [productos, proveedores] = await Promise.all([
      this.getProductos(),
      this.getProveedores()
    ]);

    return productos.map(producto => ({
      ...producto,
      proveedor: producto.proveedorId ? proveedores.find(p => p.id === producto.proveedorId) : undefined
    }));
  }

  // Buscar proveedor por ID (método de conveniencia)
  async findProveedorById(proveedorId: string): Promise<Proveedor | null> {
    return this.getProveedorById(proveedorId);
  }

  // Buscar producto por ID (método de conveniencia)
  async findProductoById(productoId: string): Promise<Producto | null> {
    return this.getProductoById(productoId);
  }
}

// Instancia singleton para móvil
export const mobileDataAdapter = new MobileDataAdapter();
