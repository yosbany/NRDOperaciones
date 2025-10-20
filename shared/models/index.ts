// Exportar todas las clases de modelos
export { BaseModel } from './BaseModel';
export { Evento } from './Evento';
export { FcmToken } from './FcmToken';
export { Orden, ProductoOrden } from './Orden';
export { Producto } from './Producto';
export { Proveedor, TipoProveedor } from './Proveedor';
export { IngredienteCosto, RecetaCosto } from './RecetaCosto';
export { EstadoTarea, PrioridadTarea, Tarea } from './Tarea';
export { RolUsuario, User } from './User';

// Exportar tipos de filtros y estadísticas
export interface OrdenFilter {
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  proveedorId?: string;
  cliente?: string;
}

export interface ProductoFilter {
  nombre?: string;
  proveedorId?: string;
  archivado?: boolean;
  stockMinimo?: number;
}

export interface ProveedorFilter {
  nombre?: string;
  tipo?: string;
  activo?: boolean;
}

export interface Estadisticas {
  totalOrdenes: number;
  totalProductos: number;
  totalProveedores: number;
  totalTareas: number;
  ordenesPendientes: number;
  ordenesCompletadas: number;
  productosBajoStock: number;
}
