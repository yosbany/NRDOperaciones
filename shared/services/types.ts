// Tipos de datos compartidos entre móvil y web

export interface Orden {
  id: string;
  numero?: string;
  fecha: string;
  cliente?: string;
  clienteNombre?: string;
  proveedorId?: string;
  proveedor?: string;
  proveedorNombre?: string;
  productos: ProductoOrden[];
  total: number;
  estado: string;
  observaciones?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface ProductoOrden {
  productoId: string;
  cantidad: string;
  unidad: string;
  precio?: number;
  nombre?: string;
}

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  unidad: string;
  proveedorId?: string;
  proveedorNombre?: string;
  archivado: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  tipo: 'Proveedor' | 'Productor';
  telefono?: string;
  celular?: string;
  email?: string;
  direccion?: string;
  activo: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface Tarea {
  id: string;
  titulo: string;
  descripcion?: string;
  estado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA';
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA';
  fechaCreacion: string;
  fechaVencimiento?: string;
  asignadoA?: string;
  creadoPor: string;
}

export interface User {
  id: string;
  uid: string;
  email: string;
  nombre: string;
  rol: 'ADMIN' | 'USER';
  activo: boolean;
  fechaCreacion: string;
  fechaUltimoAcceso?: string;
}

export interface RecetaCosto {
  id: string;
  nombre: string;
  descripcion?: string;
  ingredientes: IngredienteCosto[];
  costoTotal: number;
  porciones: number;
  costoPorPorcion: number;
  fechaCreacion: string;
  fechaActualizacion?: string;
}

export interface IngredienteCosto {
  productoId: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  costoTotal: number;
}

// Tipos para filtros y búsquedas
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

// Tipos para estadísticas
export interface Estadisticas {
  totalOrdenes: number;
  totalProductos: number;
  totalProveedores: number;
  totalTareas: number;
  ordenesPendientes: number;
  ordenesCompletadas: number;
  productosBajoStock: number;
}
