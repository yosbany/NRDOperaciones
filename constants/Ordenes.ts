
// Tipos de órdenes
export type TipoOrden = 'Vacía' | 'Duplicada' | 'Automática';

// Estados de las órdenes
export const ESTADOS_ORDEN = {
  PENDIENTE: 'PENDIENTE',
  ENVIADA_IMPRESA: 'ENVIADA / IMPRESA',
  COMPLETADA: 'COMPLETADA',
  RECHAZADA: 'RECHAZADA',
} as const;

export type EstadoOrden = typeof ESTADOS_ORDEN[keyof typeof ESTADOS_ORDEN];

// Array de estados para el modal de selección
export const ESTADOS_ORDEN_ARRAY = [
  ESTADOS_ORDEN.PENDIENTE,
  ESTADOS_ORDEN.ENVIADA_IMPRESA,
  ESTADOS_ORDEN.COMPLETADA,
  ESTADOS_ORDEN.RECHAZADA,
] as const; 