import { BaseModel } from './BaseModel';

export class FcmToken extends BaseModel {
  userId: string;
  token: string;

  constructor(
    id: string,
    userId: string,
    token: string,
    fechaCreacion?: string,
    fechaActualizacion?: string,
    usuarioCreacion?: string,
    usuarioActualizacion?: string
  ) {
    super(id, fechaCreacion, fechaActualizacion, usuarioCreacion, usuarioActualizacion);
    this.userId = userId;
    this.token = token;
  }

  validate(): boolean {
    return !!(
      this.userId &&
      this.token
    );
  }

  // Actualizar token
  actualizarToken(nuevoToken: string): void {
    this.token = nuevoToken;
    this.updateTimestamp();
  }

  // Verificar si el token es válido
  esTokenValido(): boolean {
    return this.token.length > 0;
  }

  // Obtener token truncado para mostrar
  getTokenTruncado(): string {
    return this.token.length > 20 ? `${this.token.substring(0, 20)}...` : this.token;
  }

  // Obtener fecha de actualización formateada
  getFechaActualizacionFormateada(): string {
    return this.fechaActualizacion ? new Date(this.fechaActualizacion).toLocaleString() : 'No actualizado';
  }
}
