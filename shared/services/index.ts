// Exportaciones de la capa de acceso a datos unificada

// Configuración
export { auth, database } from './firebaseConfig';

// Tipos
export * from './types';

// Capa de acceso a datos
export { DataAccessLayer, dataAccess } from './dataAccess';

// Adaptadores específicos
export { MobileDataAdapter, mobileDataAdapter } from './mobileAdapter';
export { WebDataAdapter, webDataAdapter } from './webAdapter';
