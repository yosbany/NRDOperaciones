import { dataAccess } from '../services/dataAccess';
import { BaseModel } from './BaseModel';
import { Proveedor } from './Proveedor';
import { User } from './User';

export type EstadoTarea = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA';
export type PrioridadTarea = 'BAJA' | 'MEDIA' | 'ALTA';

export class Tarea extends BaseModel {
  titulo: string;
  descripcion?: string;
  prioridad?: string;
  completada: boolean;
  publica?: boolean;
  observacion?: string;
  fechaCompletada?: string;
  private _asignadaA?: string;
  private _usuarioAsignado?: string;
  private _seguidores?: string[];
  private _usuarioAsignadoObj: User | null = null;
  private _proveedorAsignado: Proveedor | null = null;

  constructor(
    id: string,
    titulo: string,
    completada: boolean,
    descripcion?: string,
    asignadaA?: string,
    usuarioAsignado?: string,
    prioridad?: string,
    publica?: boolean,
    seguidores?: string[],
    observacion?: string,
    fechaCompletada?: string,
    fechaCreacion?: string,
    fechaActualizacion?: string,
    usuarioCreacion?: string,
    usuarioActualizacion?: string
  ) {
    super(id, fechaCreacion, fechaActualizacion, usuarioCreacion, usuarioActualizacion);
    this.titulo = titulo;
    this.descripcion = descripcion;
    this._asignadaA = asignadaA;
    this._usuarioAsignado = usuarioAsignado;
    this.prioridad = prioridad;
    this.completada = completada;
    this.publica = publica || true;
    this._seguidores = seguidores || [];
    this.observacion = observacion;
    this.fechaCompletada = fechaCompletada;
  }

  validate(): boolean {
    return !!(
      this.id &&
      this.titulo &&
      typeof this.completada === 'boolean'
    );
  }

  // Métodos públicos para obtener referencias
  async getUsuarioAsignado(): Promise<User | null> {
    if (!this._usuarioAsignado) return null;
    
    if (this._usuarioAsignadoObj === null) {
      try {
        // Buscar usuario por username
        const usuarios = await dataAccess.getUsers();
        this._usuarioAsignadoObj = usuarios.find(u => u.username === this._usuarioAsignado) || null;
      } catch (error) {
        console.error('Error cargando usuario asignado:', error);
        this._usuarioAsignadoObj = null;
      }
    }
    return this._usuarioAsignadoObj;
  }

  async getProveedorAsignado(): Promise<Proveedor | null> {
    if (!this._asignadaA) return null;
    
    if (this._proveedorAsignado === null) {
      try {
        this._proveedorAsignado = await dataAccess.getProveedorById(this._asignadaA);
      } catch (error) {
        console.error('Error cargando proveedor asignado:', error);
        this._proveedorAsignado = null;
      }
    }
    return this._proveedorAsignado;
  }

  async getSeguidores(): Promise<User[]> {
    if (!this._seguidores || this._seguidores.length === 0) return [];
    
    try {
      const usuarios = await dataAccess.getUsers();
      return usuarios.filter(u => this._seguidores!.includes(u.id));
    } catch (error) {
      console.error('Error cargando seguidores:', error);
      return [];
    }
  }

  // Getters para IDs (solo lectura)
  get asignadaA(): string | undefined {
    return this._asignadaA;
  }

  get usuarioAsignado(): string | undefined {
    return this._usuarioAsignado;
  }

  get seguidores(): string[] {
    return this._seguidores || [];
  }

  // Marcar como completada
  marcarCompletada(): void {
    this.completada = true;
    this.fechaCompletada = new Date().toISOString();
    this.updateTimestamp();
  }

  // Marcar como pendiente
  marcarPendiente(): void {
    this.completada = false;
    this.fechaCompletada = undefined;
    this.updateTimestamp();
  }

  // Cambiar prioridad
  cambiarPrioridad(nuevaPrioridad: string): void {
    this.prioridad = nuevaPrioridad;
    this.updateTimestamp();
  }

  // Asignar a usuario
  asignarA(usuarioId: string, usuarioNombre?: string): void {
    this._asignadaA = usuarioId;
    this._usuarioAsignado = usuarioNombre;
    this.updateTimestamp();
  }

  // Agregar seguidor
  agregarSeguidor(usuarioId: string): void {
    if (!this._seguidores) this._seguidores = [];
    if (!this._seguidores.includes(usuarioId)) {
      this._seguidores.push(usuarioId);
      this.updateTimestamp();
    }
  }

  // Remover seguidor
  removerSeguidor(usuarioId: string): void {
    if (this._seguidores) {
      this._seguidores = this._seguidores.filter(id => id !== usuarioId);
      this.updateTimestamp();
    }
  }

  // Verificar si está completada
  estaCompletada(): boolean {
    return this.completada === true;
  }

  // Verificar si está pendiente
  estaPendiente(): boolean {
    return !this.completada;
  }

  // Obtener color de prioridad
  getColorPrioridad(): string {
    switch (this.prioridad) {
      case 'alta': return '#dc3545';
      case 'media': return '#ffc107';
      case 'baja': return '#28a745';
      default: return '#6c757d';
    }
  }

  // Obtener icono de estado
  getIconoEstado(): string {
    return this.completada ? '✅' : '⏳';
  }

  // Agregar observación
  agregarObservacion(observacion: string): void {
    this.observacion = observacion;
    this.updateTimestamp();
  }


  // Obtener nombre del usuario asignado (lazy)
  async getUsuarioAsignadoNombre(): Promise<string> {
    if (!this._usuarioAsignado) return 'Sin asignar';
    
    const usuario = await this.getUsuarioAsignado();
    return usuario?.displayName || usuario?.username || 'Usuario no encontrado';
  }

  // Obtener nombre del proveedor asignado (lazy)
  async getProveedorAsignadoNombre(): Promise<string> {
    if (!this._asignadaA) return 'Sin asignar';
    
    const proveedor = await this.getProveedorAsignado();
    return proveedor?.nombre || 'Proveedor no encontrado';
  }

  // Verificar si tiene usuario cargado
  tieneUsuarioCargado(): boolean {
    return this._usuarioAsignadoObj !== null;
  }

  // Verificar si tiene proveedor cargado
  tieneProveedorCargado(): boolean {
    return this._proveedorAsignado !== null;
  }
}
