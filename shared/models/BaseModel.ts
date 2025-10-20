// Clase base para todos los modelos
export abstract class BaseModel {
  id: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  usuarioCreacion?: string;
  usuarioActualizacion?: string;

  constructor(
    id: string, 
    fechaCreacion?: string, 
    fechaActualizacion?: string,
    usuarioCreacion?: string,
    usuarioActualizacion?: string
  ) {
    this.id = id;
    this.fechaCreacion = fechaCreacion;
    this.fechaActualizacion = fechaActualizacion;
    this.usuarioCreacion = usuarioCreacion;
    this.usuarioActualizacion = usuarioActualizacion;
  }

  // Método para actualizar la fecha de actualización
  updateTimestamp(usuarioActualizacion?: string): void {
    this.fechaActualizacion = new Date().toISOString();
    if (usuarioActualizacion) {
      this.usuarioActualizacion = usuarioActualizacion;
    }
  }

  // Método para establecer la fecha de creación
  setCreationTimestamp(usuarioCreacion?: string): void {
    if (!this.fechaCreacion) {
      this.fechaCreacion = new Date().toISOString();
      if (usuarioCreacion) {
        this.usuarioCreacion = usuarioCreacion;
      }
    }
  }

  // Método abstracto para validar el modelo
  abstract validate(): boolean;

  // Método para convertir a objeto plano
  toPlainObject(): Record<string, any> {
    return { ...this };
  }

  // Método estático para crear desde objeto plano
  static fromPlainObject<T extends BaseModel>(
    this: new (...args: any[]) => T,
    data: Record<string, any>
  ): T {
    const instance = new this(
      data.id, 
      data.fechaCreacion, 
      data.fechaActualizacion,
      data.usuarioCreacion,
      data.usuarioActualizacion
    );
    Object.assign(instance, data);
    return instance;
  }
}
