// Exportaciones de la capa de acceso a datos unificada

// Configuración
export { auth, database } from './firebaseConfig';

// Tipos
export * from '../models';

// Capa de acceso a datos
export { DataAccessLayer, dataAccess } from './dataAccess';
