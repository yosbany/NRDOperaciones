// Tipos de órdenes
export const ORDENES_TIPOS = {
  VACIA: 'Nueva',
  DUPLICADA: 'Duplicada',
  SUGERIDA: 'Sugerida',
  AUTOMATICA: 'Automática',
} as const;

export type OrdenTipo = keyof typeof ORDENES_TIPOS;

export const ORDENES_TIPOS_ICONS = {
  VACIA: 'cube-outline',
  DUPLICADA: 'copy-outline',
  SUGERIDA: 'flash-outline',
  AUTOMATICA: 'cog-outline',
} as const; 