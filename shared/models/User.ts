import { BaseModel } from './BaseModel';

export type RolUsuario = 'ADMIN' | 'USER' | 'PRODUCTOR';

export class User extends BaseModel {
  userId?: string;
  contactId?: string;
  idContacto?: string;
  displayName: string;
  email: string;
  username?: string;
  nombre?: string;
  role: string;

  constructor(
    id: string,
    displayName: string,
    email: string,
    role: string,
    userId?: string,
    contactId?: string,
    idContacto?: string,
    username?: string,
    nombre?: string,
    fechaCreacion?: string,
    fechaActualizacion?: string,
    usuarioCreacion?: string,
    usuarioActualizacion?: string
  ) {
    super(id, fechaCreacion, fechaActualizacion, usuarioCreacion, usuarioActualizacion);
    this.userId = userId;
    this.contactId = contactId;
    this.idContacto = idContacto;
    this.displayName = displayName;
    this.email = email;
    this.username = username;
    this.nombre = nombre;
    this.role = role;
  }

  validate(): boolean {
    return !!(
      this.displayName &&
      this.email &&
      this.role
    );
  }

  // Actualizar último acceso
  actualizarUltimoAcceso(): void {
    this.updateTimestamp();
  }

  // Cambiar rol
  cambiarRol(nuevoRol: string): void {
    this.role = nuevoRol;
    this.updateTimestamp();
  }

  // Actualizar información personal
  actualizarInformacion(displayName?: string, email?: string, username?: string, nombre?: string): void {
    if (displayName) this.displayName = displayName;
    if (email) this.email = email;
    if (username) this.username = username;
    if (nombre) this.nombre = nombre;
    this.updateTimestamp();
  }

  // Verificar si es administrador
  esAdmin(): boolean {
    return this.role === 'ADMIN';
  }

  // Verificar si es usuario normal
  esUsuario(): boolean {
    return this.role === 'USER';
  }

  // Verificar si es productor
  esProductor(): boolean {
    return this.role === 'PRODUCTOR';
  }

  // Obtener nombre para mostrar
  getNombreParaMostrar(): string {
    return this.displayName || this.nombre || this.username || this.email;
  }

  // Obtener iniciales
  getIniciales(): string {
    const nombre = this.getNombreParaMostrar();
    const palabras = nombre.split(' ');
    if (palabras.length >= 2) {
      return (palabras[0][0] + palabras[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  }

  // Obtener color del rol
  getColorRol(): string {
    switch (this.role) {
      case 'ADMIN': return '#667eea';
      case 'PRODUCTOR': return '#ffc107';
      case 'USER': return '#28a745';
      default: return '#6c757d';
    }
  }

  // Obtener texto del rol
  getTextoRol(): string {
    switch (this.role) {
      case 'ADMIN': return 'Administrador';
      case 'PRODUCTOR': return 'Productor';
      case 'USER': return 'Usuario';
      default: return 'Usuario';
    }
  }
}
