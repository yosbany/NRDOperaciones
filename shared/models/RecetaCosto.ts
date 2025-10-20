import { dataAccess } from '../services/dataAccess';
import { BaseModel } from './BaseModel';
import { Producto } from './Producto';

// Clase auxiliar para ingredientes en recetas de costo
export class IngredienteCosto {
  id: string;
  nombre: string;
  tipo?: string;
  unidad: string;
  cantidad: number;
  costo: number;
  private _productoId: string;
  private _producto: Producto | null = null;

  constructor(
    id: string,
    nombre: string,
    productoId: string,
    tipo: string,
    unidad: string,
    cantidad: number,
    costo: number
  ) {
    this.id = id;
    this.nombre = nombre;
    this._productoId = productoId;
    this.tipo = tipo;
    this.unidad = unidad;
    this.cantidad = cantidad;
    this.costo = costo;
  }

  validate(): boolean {
    return !!(
      this.nombre &&
      this._productoId &&
      this.cantidad > 0
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

  // Calcular costo total del ingrediente
  get costoTotal(): number {
    return this.cantidad * this.costo;
  }

  // Actualizar cantidad
  actualizarCantidad(nuevaCantidad: number): void {
    if (nuevaCantidad > 0) {
      this.cantidad = nuevaCantidad;
    }
  }

  // Actualizar costo
  actualizarCosto(nuevoCosto: number): void {
    if (nuevoCosto >= 0) {
      this.costo = nuevoCosto;
    }
  }

  // Obtener cantidad formateada
  getCantidadFormateada(): string {
    return `${this.cantidad} ${this.unidad}`;
  }

  // Obtener costo formateado
  getCostoFormateado(): string {
    return `$${this.costo.toFixed(2)}`;
  }

  // Verificar si el ingrediente es válido
  esValido(): boolean {
    return this.validate() && this.costo >= 0;
  }
}

export class RecetaCosto extends BaseModel {
  nombre: string;
  costoTotal: number;
  private _productoId: string;
  private _producto: Producto | null = null;
  private _ingredientes: IngredienteCosto[];

  constructor(
    id: string,
    nombre: string,
    productoId: string,
    ingredientes: IngredienteCosto[],
    costoTotal: number,
    fechaCreacion?: string,
    fechaActualizacion?: string,
    usuarioCreacion?: string,
    usuarioActualizacion?: string
  ) {
    super(id, fechaCreacion, fechaActualizacion, usuarioCreacion, usuarioActualizacion);
    this.nombre = nombre;
    this._productoId = productoId;
    this._ingredientes = ingredientes;
    this.costoTotal = costoTotal;
  }

  validate(): boolean {
    return !!(
      this.nombre &&
      this._productoId &&
      this._ingredientes &&
      this._ingredientes.length > 0 &&
      this._ingredientes.every(i => i.validate())
    );
  }

  // Métodos públicos para obtener referencias
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

  getIngredientes(): IngredienteCosto[] {
    return this._ingredientes;
  }

  // Getter para el ID del producto (solo lectura)
  get productoId(): string {
    return this._productoId;
  }

  // Calcular costo total de la receta
  calcularCostoTotal(): number {
    return this._ingredientes.reduce((total, ingrediente) => {
      return total + ingrediente.costoTotal;
    }, 0);
  }

  // Actualizar costos
  actualizarCostos(): void {
    this.costoTotal = this.calcularCostoTotal();
    this.updateTimestamp();
  }

  // Agregar ingrediente
  agregarIngrediente(ingrediente: IngredienteCosto): void {
    this._ingredientes.push(ingrediente);
    this.actualizarCostos();
  }

  // Remover ingrediente
  removerIngrediente(ingredienteId: string): void {
    this._ingredientes = this._ingredientes.filter(i => i.id !== ingredienteId);
    this.actualizarCostos();
  }

  // Actualizar producto asociado
  actualizarProducto(nuevoProductoId: string): void {
    this._productoId = nuevoProductoId;
    this.updateTimestamp();
  }

  // Obtener ingrediente por ID
  getIngrediente(ingredienteId: string): IngredienteCosto | undefined {
    return this._ingredientes.find(i => i.id === ingredienteId);
  }

  // Obtener costo total formateado
  getCostoTotalFormateado(): string {
    return `$${this.costoTotal.toFixed(2)}`;
  }

  // Obtener costo por porción formateado (asumiendo 1 porción)
  getCostoPorPorcionFormateado(): string {
    return `$${this.costoTotal.toFixed(2)}`;
  }

  // Obtener cantidad de ingredientes
  getCantidadIngredientes(): number {
    return this._ingredientes.length;
  }

  // Verificar si la receta es válida
  esValida(): boolean {
    return this.validate() && this.costoTotal > 0;
  }

  // Obtener resumen de la receta
  getResumen(): string {
    return `${this.nombre} - ${this.getCantidadIngredientes()} ingredientes - ${this.getCostoTotalFormateado()}`;
  }

  // Obtener nombre del producto (lazy)
  async getProductoNombre(): Promise<string> {
    const producto = await this.getProducto();
    return producto?.nombre || 'Producto no encontrado';
  }

  // Verificar si tiene producto cargado
  tieneProductoCargado(): boolean {
    return this._producto !== null;
  }
}
