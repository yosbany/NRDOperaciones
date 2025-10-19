# Capa de Acceso a Datos Unificada

Esta capa proporciona una interfaz unificada para acceder a los datos de Firebase tanto desde la aplicación móvil como desde la aplicación web.

## Estructura

```
shared/
├── services/
│   ├── firebaseConfig.ts    # Configuración de Firebase compartida
│   ├── types.ts            # Tipos de datos compartidos
│   ├── dataAccess.ts       # Capa de acceso a datos base
│   ├── mobileAdapter.ts    # Adaptador para React Native/Expo
│   ├── webAdapter.ts       # Adaptador para React Web
│   └── index.ts            # Exportaciones principales
├── tsconfig.json           # Configuración de TypeScript
└── README.md               # Este archivo
```

## Características

### ✅ **Ventajas de la capa unificada:**

1. **Código compartido** - Misma lógica para móvil y web
2. **Tipos consistentes** - Interfaces TypeScript compartidas
3. **Mantenimiento simplificado** - Un solo lugar para cambios
4. **Reutilización** - Lógica de negocio centralizada
5. **Consistencia** - Mismo comportamiento en ambas plataformas

### 🔧 **Componentes principales:**

- **`firebaseConfig.ts`** - Configuración de Firebase compartida
- **`types.ts`** - Interfaces TypeScript para todos los modelos
- **`dataAccess.ts`** - Capa base con operaciones CRUD
- **`mobileAdapter.ts`** - Adaptador específico para móvil
- **`webAdapter.ts`** - Adaptador específico para web

## Uso

### En la aplicación móvil:

```typescript
import { mobileDataAdapter } from '../shared/services/mobileAdapter';

// Obtener órdenes
const ordenes = await mobileDataAdapter.getOrdenes();

// Obtener órdenes con proveedores resueltos
const ordenesConProveedores = await mobileDataAdapter.getOrdenesConProveedores();
```

### En la aplicación web:

```typescript
import { webDataAdapter } from '../shared/services/webAdapter';

// Obtener datos del dashboard
const dashboardData = await webDataAdapter.getDashboardData();

// Obtener estadísticas
const stats = await webDataAdapter.getDashboardStats();
```

## Modelos de datos

### Orden
```typescript
interface Orden {
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
```

### Producto
```typescript
interface Producto {
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
```

### Proveedor
```typescript
interface Proveedor {
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
```

## Operaciones disponibles

### CRUD básico:
- `get*()` - Obtener todos los registros
- `get*ById(id)` - Obtener por ID
- `save*(data)` - Crear nuevo registro
- `update*(id, data)` - Actualizar registro
- `delete*(id)` - Eliminar registro

### Operaciones específicas:
- `getOrdenesConProveedores()` - Órdenes con datos de proveedores
- `getProductosConProveedores()` - Productos con datos de proveedores
- `getDashboardData()` - Datos completos para dashboard (web)
- `getDashboardStats()` - Estadísticas del dashboard (web)

### Listeners en tiempo real:
- `onOrdenesChange(callback)` - Cambios en órdenes
- `onProveedoresChange(callback)` - Cambios en proveedores
- `onProductosChange(callback)` - Cambios en productos
- `onTareasChange(callback)` - Cambios en tareas

## Migración

### Para migrar la app móvil:

1. Reemplazar imports de `services/firebase.ts` por `services/firebaseUnified.ts`
2. Actualizar las llamadas a funciones para usar la nueva API
3. Los tipos ahora vienen de `shared/services/types`

### Para migrar la app web:

1. Reemplazar imports de `services/firebase.ts` por `services/firebaseUnified.ts`
2. Usar `webDataAdapter` en lugar de llamadas directas a Firebase
3. Aprovechar métodos específicos como `getDashboardData()`

## Beneficios

1. **Consistencia** - Misma lógica en móvil y web
2. **Mantenibilidad** - Un solo lugar para cambios
3. **Reutilización** - Código compartido
4. **Tipos seguros** - TypeScript en toda la aplicación
5. **Escalabilidad** - Fácil agregar nuevas plataformas
