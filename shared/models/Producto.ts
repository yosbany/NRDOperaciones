import { dataAccess } from '../services/dataAccess';
import { BaseModel } from './BaseModel';
import { Proveedor } from './Proveedor';

export class Producto extends BaseModel {
  nombre: string;
  orden: number;
  precio: number;
  stock: number;
  unidad: string;
  private _proveedorId?: string;
  private _proveedor: Proveedor | null = null;
  private _proveedorLoaded: boolean = false;

  constructor(
    id: string,
    nombre: string,
    orden: number,
    precio: number,
    proveedorId: string,
    stock: number,
    unidad: string,
    fechaCreacion?: string,
    fechaActualizacion?: string,
    usuarioCreacion?: string,
    usuarioActualizacion?: string
  ) {
    super(id, fechaCreacion, fechaActualizacion, usuarioCreacion, usuarioActualizacion);
    this.nombre = nombre;
    this.orden = orden;
    this.precio = precio;
    this._proveedorId = proveedorId;
    this.stock = stock;
    this.unidad = unidad;
  }

  validate(): boolean {
    return !!(
      this.id &&
      this.nombre &&
      typeof this.orden === 'number' &&
      this.precio >= 0 &&
      this.stock >= 0
    );
  }

  // Actualizar precio
  actualizarPrecio(nuevoPrecio: number): void {
    if (nuevoPrecio >= 0) {
      this.precio = nuevoPrecio;
      this.updateTimestamp();
    }
  }

  // Actualizar stock
  actualizarStock(nuevoStock: number): void {
    if (nuevoStock >= 0) {
      this.stock = nuevoStock;
      this.updateTimestamp();
    }
  }

  // Reducir stock
  reducirStock(cantidad: number): boolean {
    if (cantidad > 0 && this.stock >= cantidad) {
      this.stock -= cantidad;
      this.updateTimestamp();
      return true;
    }
    return false;
  }

  // Aumentar stock
  aumentarStock(cantidad: number): void {
    if (cantidad > 0) {
      this.stock += cantidad;
      this.updateTimestamp();
    }
  }

  // Actualizar orden
  actualizarOrden(nuevaOrden: number): void {
    this.orden = nuevaOrden;
    this.updateTimestamp();
  }

  // Verificar si está bajo stock
  estaBajoStock(stockMinimo: number = 10): boolean {
    return this.stock < stockMinimo;
  }

  // Verificar si está disponible
  estaDisponible(): boolean {
    return this.stock > 0;
  }

  // Obtener precio formateado
  getPrecioFormateado(): string {
    return `$${this.precio.toFixed(2)}`;
  }

  // Obtener stock formateado
  getStockFormateado(): string {
    return `${this.stock} ${this.unidad}`;
  }

  // Getter público para obtener el proveedor (lazy loading)
  async getProveedor(): Promise<Proveedor | null> {
    if (!this._proveedorId) return null;
    
    if (!this._proveedorLoaded) {
      try {
        this._proveedor = await dataAccess.getProveedorById(this._proveedorId);
        this._proveedorLoaded = true;
      } catch (error) {
        console.error('Error cargando proveedor:', error);
        this._proveedor = null;
        this._proveedorLoaded = true;
      }
    }
    return this._proveedor;
  }

  // Getter público para obtener el ID del proveedor (solo lectura)
  get proveedorId(): string | undefined {
    return this._proveedorId;
  }

  // Obtener nombre del proveedor (lazy)
  async getProveedorNombre(): Promise<string> {
    if (!this._proveedorId) return 'Sin proveedor';
    
    const proveedor = await this.getProveedor();
    return proveedor?.nombre || 'Proveedor no encontrado';
  }

  // Verificar si tiene proveedor cargado
  tieneProveedorCargado(): boolean {
    return this._proveedorLoaded;
  }
}
