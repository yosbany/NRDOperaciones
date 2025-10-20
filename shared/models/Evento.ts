import { BaseModel } from './BaseModel';

export class Evento extends BaseModel {
  tipo: string;
  descripcion?: string;
  fecha: string;
  usuarioId?: string;

  constructor(
    id: string,
    tipo: string,
    fecha: string,
    descripcion?: string,
    usuarioId?: string,
    fechaCreacion?: string,
    fechaActualizacion?: string,
    usuarioCreacion?: string,
    usuarioActualizacion?: string
  ) {
    super(id, fechaCreacion, fechaActualizacion, usuarioCreacion, usuarioActualizacion);
    this.tipo = tipo;
    this.descripcion = descripcion;
    this.fecha = fecha;
    this.usuarioId = usuarioId;
  }

  validate(): boolean {
    return !!(
      this.tipo &&
      this.fecha
    );
  }

  // Actualizar descripción
  actualizarDescripcion(nuevaDescripcion: string): void {
    this.descripcion = nuevaDescripcion;
    this.updateTimestamp();
  }

  // Asignar usuario
  asignarUsuario(usuarioId: string): void {
    this.usuarioId = usuarioId;
    this.updateTimestamp();
  }

  // Obtener fecha formateada
  getFechaFormateada(): string {
    return new Date(this.fecha).toLocaleDateString();
  }

  // Obtener tipo formateado
  getTipoFormateado(): string {
    return this.tipo.charAt(0).toUpperCase() + this.tipo.slice(1).toLowerCase();
  }

  // Verificar si tiene usuario asignado
  tieneUsuario(): boolean {
    return !!this.usuarioId;
  }
}
