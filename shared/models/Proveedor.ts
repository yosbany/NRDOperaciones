import { BaseModel } from './BaseModel';

export type TipoProveedor = 'Proveedor' | 'Productor';

export class Proveedor extends BaseModel {
  nombre: string;
  tipo?: string;
  celular?: string;
  salarioPorDia?: number;
  frecuencia?: {
    tipo?: string;
    valor?: string;
    diasSemana?: string[];
  };
  productosDefault?: {
    productoId: string;
    cantidad: string;
    unidad?: string;
  }[];

  constructor(
    id: string,
    nombre: string,
    tipo?: string,
    celular?: string,
    salarioPorDia?: number,
    frecuencia?: {
      tipo?: string;
      valor?: string;
      diasSemana?: string[];
    },
    productosDefault?: {
      productoId: string;
      cantidad: string;
      unidad?: string;
    }[],
    fechaCreacion?: string,
    fechaActualizacion?: string,
    usuarioCreacion?: string,
    usuarioActualizacion?: string
  ) {
    super(id, fechaCreacion, fechaActualizacion, usuarioCreacion, usuarioActualizacion);
    this.nombre = nombre;
    this.tipo = tipo;
    this.celular = celular;
    this.salarioPorDia = salarioPorDia;
    this.frecuencia = frecuencia;
    this.productosDefault = productosDefault;
  }

  validate(): boolean {
    return !!(
      this.id &&
      this.nombre
    );
  }

  // Actualizar información de contacto
  actualizarContacto(celular?: string): void {
    if (celular !== undefined) this.celular = celular;
    this.updateTimestamp();
  }

  // Actualizar salario por día
  actualizarSalarioPorDia(nuevoSalario: number): void {
    this.salarioPorDia = nuevoSalario;
    this.updateTimestamp();
  }

  // Actualizar frecuencia
  actualizarFrecuencia(frecuencia: {
    tipo?: string;
    valor?: string;
    diasSemana?: string[];
  }): void {
    this.frecuencia = frecuencia;
    this.updateTimestamp();
  }

  // Agregar producto por defecto
  agregarProductoDefault(producto: {
    productoId: string;
    cantidad: string;
    unidad?: string;
  }): void {
    if (!this.productosDefault) this.productosDefault = [];
    this.productosDefault.push(producto);
    this.updateTimestamp();
  }

  // Remover producto por defecto
  removerProductoDefault(productoId: string): void {
    if (this.productosDefault) {
      this.productosDefault = this.productosDefault.filter(p => p.productoId !== productoId);
      this.updateTimestamp();
    }
  }

  // Verificar si tiene teléfono
  tieneTelefono(): boolean {
    return !!this.celular;
  }

  // Obtener información de contacto formateada
  getContactoFormateado(): string {
    const contactos = [];
    if (this.celular) contactos.push(`Cel: ${this.celular}`);
    return contactos.join(' • ');
  }

  // Verificar si es proveedor
  esProveedor(): boolean {
    return this.tipo === 'Proveedor';
  }

  // Verificar si es productor
  esProductor(): boolean {
    return this.tipo === 'Productor';
  }

  // Obtener salario formateado
  getSalarioFormateado(): string {
    return this.salarioPorDia ? `$${this.salarioPorDia}/día` : 'No especificado';
  }
}
