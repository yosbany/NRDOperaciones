import { dataAccess } from '../services/dataAccess';
import { BaseModel } from './BaseModel';
import { Producto } from './Producto';
import { Proveedor } from './Proveedor';

// Clase auxiliar para productos en órdenes
export class ProductoOrden {
  id: string;
  cantidad: string;
  unidad: string;
  precio?: number;
  nombre?: string;
  private _productoId: string;
  private _producto: Producto | null = null;

  constructor(
    id: string,
    productoId: string,
    cantidad: string,
    unidad: string,
    precio?: number,
    nombre?: string
  ) {
    this.id = id;
    this._productoId = productoId;
    this.cantidad = cantidad;
    this.unidad = unidad;
    this.precio = precio;
    this.nombre = nombre;
  }

  validate(): boolean {
    return !!(
      this._productoId &&
      this.cantidad &&
      this.unidad &&
      parseFloat(this.cantidad) > 0
    );
  }

  // Método para obtener el producto (lazy loading)
  async getProducto(): Promise<Producto | null> {
    if (this._producto === null) {
      try {
        this._producto = await dataAccess.getProductoById(this._productoId);
      } catch (error) {
        console.error('Error cargando producto:', error);
        this._producto = null;
      }
    }
    return this._producto;
  }

  // Getter para el ID del producto (solo lectura)
  get productoId(): string {
    return this._productoId;
  }

  // Calcular el subtotal del producto
  calcularSubtotal(): number {
    const cantidad = parseFloat(this.cantidad) || 0;
    const precio = this.precio || 0;
    return cantidad * precio;
  }

  // Actualizar precio
  actualizarPrecio(nuevoPrecio: number): void {
    this.precio = nuevoPrecio;
  }

  // Actualizar cantidad
  actualizarCantidad(nuevaCantidad: string): void {
    this.cantidad = nuevaCantidad;
  }
}

export class Orden extends BaseModel {
  estado: string;
  fecha: string;
  hecha: boolean;
  tipo?: string;
  private _proveedorId: string;
  private _proveedor: Proveedor | null = null;
  private _productos: ProductoOrden[];

  constructor(
    id: string,
    estado: string,
    fecha: string,
    hecha: boolean,
    proveedorId: string,
    productos: ProductoOrden[],
    tipo?: string,
    fechaCreacion?: string,
    fechaActualizacion?: string,
    usuarioCreacion?: string,
    usuarioActualizacion?: string
  ) {
    super(id, fechaCreacion, fechaActualizacion, usuarioCreacion, usuarioActualizacion);
    this.estado = estado;
    this.fecha = fecha;
    this.hecha = hecha;
    this.tipo = tipo;
    this._proveedorId = proveedorId;
    this._productos = productos;
  }

  validate(): boolean {
    return !!(
      this.estado &&
      this.fecha &&
      typeof this.hecha === 'boolean' &&
      this._proveedorId &&
      this._productos &&
      this._productos.length > 0 &&
      this._productos.every(p => p.validate())
    );
  }

  // Métodos públicos para obtener referencias
  async getProveedor(): Promise<Proveedor | null> {
    if (this._proveedor === null) {
      try {
        this._proveedor = await dataAccess.getProveedorById(this._proveedorId);
      } catch (error) {
        console.error('Error cargando proveedor:', error);
        this._proveedor = null;
      }
    }
    return this._proveedor;
  }

  getProductos(): ProductoOrden[] {
    return this._productos;
  }

  // Getter para el ID del proveedor (solo lectura)
  get proveedorId(): string {
    return this._proveedorId;
  }

  // Calcular el total de la orden
  calcularTotal(): number {
    return this._productos.reduce((total, producto) => {
      return total + producto.calcularSubtotal();
    }, 0);
  }

  // Agregar producto a la orden
  agregarProducto(producto: ProductoOrden): void {
    this._productos.push(producto);
    this.updateTimestamp();
  }

  // Remover producto de la orden
  removerProducto(productoId: string): void {
    this._productos = this._productos.filter(p => p.productoId !== productoId);
    this.updateTimestamp();
  }

  // Actualizar estado de la orden
  actualizarEstado(nuevoEstado: string): void {
    this.estado = nuevoEstado;
    this.updateTimestamp();
  }

  // Marcar como hecha
  marcarComoHecha(): void {
    this.hecha = true;
    this.updateTimestamp();
  }

  // Marcar como no hecha
  marcarComoNoHecha(): void {
    this.hecha = false;
    this.updateTimestamp();
  }

  // Obtener cantidad de productos
  getCantidadProductos(): number {
    return this._productos.length;
  }

  // Verificar si la orden está hecha
  estaHecha(): boolean {
    return this.hecha;
  }

  // Verificar si la orden está pendiente
  estaPendiente(): boolean {
    return this.estado === 'PENDIENTE';
  }

  // Verificar si la orden está completada
  estaCompletada(): boolean {
    return this.estado === 'COMPLETADA';
  }

  // Obtener nombre del proveedor (lazy)
  async getProveedorNombre(): Promise<string> {
    const proveedor = await this.getProveedor();
    return proveedor?.nombre || 'Proveedor no encontrado';
  }

  // Verificar si tiene proveedor cargado
  tieneProveedorCargado(): boolean {
    return this._proveedor !== null;
  }
}
