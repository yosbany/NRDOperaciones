import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
// import { useFocusEffect, useRoute } from '@react-navigation/native'; // Removed to fix LinkPreviewContext error
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
// import { useRouter } from 'expo-router'; // Removed to fix filename error
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Keyboard, Linking, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../../components/UserContext';
import { Colors } from '../../constants/Colors';
import { ESTADOS_ORDEN, ESTADOS_ORDEN_ARRAY } from '../../constants/Ordenes';
import { ORDENES_TIPOS, ORDENES_TIPOS_ICONS } from '../../constants/OrdenesTipos';
import { deleteOrden, generarSugerenciasOrden, getOrdenes, getOrdenesByUserRole, getProductos, getProductosDefaultCliente, getProveedores, getProveedorNombre, logEvento, Orden, Producto, Proveedor, saveOrden, setupRealtimeNotifications, updateOrden, updateProductosOrdenBatch } from '../../services/firebase';
import { containsSearchTerm } from '../../utils/searchUtils';

// Constante para convertir unidades a abreviaturas más cortas
const UNIDADES_ABREVIADAS: { [key: string]: string } = {
  'ATADO': 'AT',
  'BOLSA': 'BL',
  'CAJA': 'CJ',
  'FRASCO': 'FR',
  'FUNDA': 'FD',
  'HORMA': 'HR',
  'KILOGRAMO': 'KG',
  'LITRO': 'LT',
  'PACK': 'PK',
  'PLANCHA': 'PL',
  'UNIDAD': 'UN'
};

// Actualizar el tipo Proveedor para incluir telefono
type ProveedorWithPhone = Proveedor & {
  telefono?: string;
  celular?: string;
};

type ProductoOrden = { productoId: string; cantidad: string; unidad: string };

// Utilidad para verificar si un producto está fuera de temporada
const isProductoFueraDeTemporada = (producto: Producto): boolean => {
  if (!producto.fueraDeTemporada || !producto.fueraDeTemporadaHasta) return false;
  
  const fechaLimite = new Date(producto.fueraDeTemporadaHasta);
  const hoy = new Date();
  
  return hoy <= fechaLimite;
};

function Header({ title, subtitle, onAdd }: { title: string, subtitle?: React.ReactNode, onAdd?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[
      styles.header,
      {
        paddingTop: insets.top + 8,
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingHorizontal: 18,
      },
    ]}>
      <StatusBar backgroundColor={Colors.tint} barStyle="light-content" />
      <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={styles.headerText}>{title}</Text>
      {onAdd && (
        <TouchableOpacity onPress={onAdd} style={{ marginLeft: 12 }}>
          <Ionicons name="add-circle" size={32} color="#fff" />
        </TouchableOpacity>
        )}
      </View>
      {subtitle && (
        <View style={{ width: '100%', alignItems: 'flex-start', marginTop: 0 }}>
          {subtitle}
        </View>
      )}
    </View>
  );
}

// Utilidad para formatear mensaje WhatsApp
function buildWhatsappMessage(
  orden: Orden,
  proveedor: ProveedorWithPhone,
  productos: Producto[],
  usuario: string
): string {
  const fecha = orden.fecha;
  let msg = `*Pedido Fecha: ${fecha}*\n*Panadería Nueva Río D'or*\n*TEJAS DE LA CRUZ YOSBANY*\n\n`;
  // Ordenar los productos por la propiedad orden
  const productosOrdenados = [...(orden.productos || [])].sort((a, b) => {
    // Compatibilidad con ambas estructuras: nueva (id) y antigua (productoId)
    const productoIdA = a.id || a.productoId;
    const productoIdB = b.id || b.productoId;
    const prodA = productos.find(p => p.id === productoIdA);
    const prodB = productos.find(p => p.id === productoIdB);
    return (prodA?.orden || 0) - (prodB?.orden || 0);
  });

  productosOrdenados.forEach((p: { id?: string; productoId?: string; cantidad: string; unidad: string; nombre?: string }) => {
    // Compatibilidad con ambas estructuras: nueva (id) y antigua (productoId)
    const productoId = p.id || p.productoId;
    const prod = productos.find((prod: Producto) => prod.id === productoId);
    const unidadNormalizada = p.unidad.trim().toUpperCase();
    const unidadAbreviada = UNIDADES_ABREVIADAS[unidadNormalizada] || p.unidad;
    const fueraTemporada = prod && isProductoFueraDeTemporada(prod) ? ' 🟡' : '';
    
    // Usar el nombre del producto encontrado o el nombre almacenado en la orden
    const nombreProducto = prod?.nombre || p.nombre || 'Producto no encontrado';
    msg += `• *${p.cantidad} ${unidadAbreviada}* - ${nombreProducto.toUpperCase()}${fueraTemporada}\n`;
  });
  msg += `\n--------------------------------\n`;
  msg += `Total Items: ${orden.productos?.length || 0}\n`;
  msg += `Total Unidades: ${(orden.productos || []).reduce((a: number, p: { cantidad: string }) => a + Number(p.cantidad), 0)}\n`;
  return msg;
}

// Utilidad para formatear reporte impresión
function buildPrintReport(
  orden: Orden,
  proveedor: ProveedorWithPhone,
  productos: Producto[],
  usuario: string
): string {
  const fecha = orden.fecha;
  let msg = `*Pedido Fecha: ${fecha}*\n*Panadería Nueva Río D'or*\n*TEJAS DE LA CRUZ YOSBANY*\n\n`;
  // Ordenar los productos por la propiedad orden
  const productosOrdenados = [...(orden.productos || [])].sort((a, b) => {
    // Compatibilidad con ambas estructuras: nueva (id) y antigua (productoId)
    const productoIdA = a.id || a.productoId;
    const productoIdB = b.id || b.productoId;
    const prodA = productos.find(p => p.id === productoIdA);
    const prodB = productos.find(p => p.id === productoIdB);
    return (prodA?.orden || 0) - (prodB?.orden || 0);
  });

  productosOrdenados.forEach((p: { id?: string; productoId?: string; cantidad: string; unidad: string; nombre?: string }) => {
    // Compatibilidad con ambas estructuras: nueva (id) y antigua (productoId)
    const productoId = p.id || p.productoId;
    const prod = productos.find((prod: Producto) => prod.id === productoId);
    const unidadNormalizada = p.unidad.trim().toUpperCase();
    const unidadAbreviada = UNIDADES_ABREVIADAS[unidadNormalizada] || p.unidad;
    const fueraTemporada = prod && isProductoFueraDeTemporada(prod) ? ' 🟡' : '';
    
    // Usar el nombre del producto encontrado o el nombre almacenado en la orden
    const nombreProducto = prod?.nombre || p.nombre || 'Producto no encontrado';
    msg += `• *${p.cantidad} ${unidadAbreviada}* - ${nombreProducto.toUpperCase()}${fueraTemporada}\n`;
  });
  msg += `\n--------------------------------\n`;
  msg += `Total Items: ${orden.productos?.length || 0}\n`;
  msg += `Total Unidades: ${(orden.productos || []).reduce((a: number, p: { cantidad: string }) => a + Number(p.cantidad), 0)}\n`;
  return msg;
}

// Utilidad para obtener la URL del servicio de impresión
const PRINT_SERVICE_URL = Constants?.expoConfig?.extra?.PRINT_SERVICE_URL || process.env.PRINT_SERVICE_URL;

// Agrega la función para obtener el color de fondo según el estado
function getEstadoColorFondo(estado?: string) {
  switch ((estado || '').toUpperCase()) {
    case 'PENDIENTE':
      return '#FFF8E1'; // amarillo suave
    case 'ENVIADA':
    case 'ENVIADA / IMPRESA':
      return '#E3F0FF'; // azul suave
    case 'COMPLETADA':
      return '#E6F9E7'; // verde suave
    case 'RECHAZADA':
      return '#FFE6E6'; // rojo suave
    default:
      return '#f8f8f8'; // gris por defecto
  }
}

function sumaSegura(a: number, b: number): number {
  return a + b;
}

const getResponsableOrAlert = async () => {
  const responsable = (await AsyncStorage.getItem('responsableApp'))?.trim() || '';
  if (!responsable) {
    Alert.alert('Configuración requerida', 'Debe configurar el nombre del responsable en el engranaje de configuración antes de realizar esta acción.');
    return null;
  }
  return responsable;
};


// Función para formatear fecha en formato dd/MM/yyyy HH:mm:ss
const formatearFecha = (fecha: string): string => {
  try {
    // Si ya está en formato dd-mm-yyyy HH:mm:ss, convertir a dd/MM/yyyy HH:mm:ss
    const regexBD = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/;
    const matchBD = fecha.match(regexBD);
    if (matchBD) {
      const [, dia, mes, año, hora, minuto, segundo] = matchBD;
      return `${dia}/${mes}/${año} ${hora}:${minuto}:${segundo}`;
    }
    
    // Si es formato ISO, convertir
    const date = new Date(fecha);
    if (!isNaN(date.getTime())) {
      const dia = date.getDate().toString().padStart(2, '0');
      const mes = (date.getMonth() + 1).toString().padStart(2, '0');
      const año = date.getFullYear();
      const hora = date.getHours().toString().padStart(2, '0');
      const minuto = date.getMinutes().toString().padStart(2, '0');
      const segundo = date.getSeconds().toString().padStart(2, '0');
      
      return `${dia}/${mes}/${año} ${hora}:${minuto}:${segundo}`;
    }
    
    return fecha; // Si no es un formato reconocido, devolver el string original
  } catch (error) {
    return fecha;
  }
};

// Función para obtener fecha actual en formato dd-mm-yyyy HH:mm:ss
const obtenerFechaActual = (): string => {
  const hoy = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dia = pad(hoy.getDate());
  const mes = pad(hoy.getMonth() + 1);
  const anio = hoy.getFullYear();
  const hora = pad(hoy.getHours());
  const minuto = pad(hoy.getMinutes());
  const segundo = pad(hoy.getSeconds());
  return `${dia}-${mes}-${anio} ${hora}:${minuto}:${segundo}`;
};

async function notificarOrdenPendiente(ordenCreada: Orden, proveedores: Proveedor[]) {
  try {
    const proveedor = proveedores.find(p => p.id === ordenCreada.proveedorId);
    const nombreProveedor = proveedor?.nombre || 'Proveedor desconocido';
    
    // Usar NotificationManager para control de duplicados
    const NotificationManager = (await import('../../services/notificationManager')).default;
    const notificationManager = NotificationManager.getInstance();
    
    // Crear un ID único para esta notificación
    const notificationId = `orden_inmediata_${ordenCreada.id}`;
    
    // Usar la función centralizada del NotificationManager
    const sent = await notificationManager.scheduleNotification(
      '¡Nueva orden pendiente!',
      `Orden creada para: ${nombreProveedor}`,
      'orden_pendiente_inmediata',
      notificationId,
      null, // Inmediata
      { 
        proveedorId: ordenCreada.proveedorId,
        ordenId: ordenCreada.id,
        timestamp: new Date().toISOString()
      },
      30000
    );
    
    if (sent) {
      console.log(`✅ Notificación inmediata enviada para orden de: ${nombreProveedor}`);
    } else {
      console.log(`🚫 Notificación inmediata de orden ya enviada, evitando duplicado: ${ordenCreada.id}`);
    }
  } catch (error) {
    console.error('❌ Error enviando notificación inmediata:', error);
  }
}


export default function OrdenesScreen() {
  const insets = useSafeAreaInsets();
  // const router = useRouter(); // Removed to fix filename error
  const { userData } = useUser();
  
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorWithPhone[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'ultimas' | 'hoy' | 'proveedor' | 'todas'>('ultimas');
  const [proveedorFiltro, setProveedorFiltro] = useState('');
  const [wizardVisible, setWizardVisible] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [proveedorSel, setProveedorSel] = useState<ProveedorWithPhone | null>(null);
  const [tipoSel, setTipoSel] = useState<string | null>(null);
  const [productosSel, setProductosSel] = useState<{ id: string; cantidad: string; unidad: string }[]>([]);
  const [productosDefaultDisponibles, setProductosDefaultDisponibles] = useState<{ productoId: string; cantidad: string; unidad: string }[]>([]);
  const [productosSugeridos, setProductosSugeridos] = useState<Array<{ 
    producto: Producto; 
    cantidadSugerida: number; 
    unidadSugerida: string;
    promedioCalculado: number;
    ordenesAnalizadas: number;
  }>>([]);
  const [editOrden, setEditOrden] = useState<Orden | null>(null);
  const [creandoOrdenesProduccion, setCreandoOrdenesProduccion] = useState(false);
  const [editingCantidad, setEditingCantidad] = useState<string | null>(null);
  const [editingUnidad, setEditingUnidad] = useState<string | null>(null);
  const [showUnidadModal, setShowUnidadModal] = useState(false);
  const [productoUnidadEdit, setProductoUnidadEdit] = useState<string | null>(null);
  const [cantidadTemp, setCantidadTemp] = useState<string>('');
  const [ordenDuplicarSel, setOrdenDuplicarSel] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimeout = useRef<any>(null);
  const [highlightedOrdenId, setHighlightedOrdenId] = useState<string | null>(null);
  const highlightTimeout = useRef<any>(null);
  const UNIDADES = ["CAJA","FUNDA","PACK","PLANCHA","BOLSA","FRASCO","UNIDAD","KILOGRAMO","CAJON","LITRO"];

  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [ordenEstadoEdit, setOrdenEstadoEdit] = useState<Orden | null>(null);
  const [soloLectura, setSoloLectura] = useState(false);
  console.log('🔍 COMPONENTE RENDERIZADO - soloLectura:', soloLectura, 'tipo:', typeof soloLectura);
  const [usuario] = useState<string>('Usuario');
  const [showAddProductoModal, setShowAddProductoModal] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [busquedaOrden, setBusquedaOrden] = useState('');
  const [soloSeleccionados, setSoloSeleccionados] = useState(false);
  const [isDraggingEnabled, setIsDraggingEnabled] = useState(false);
  const dragTimeout = useRef<any>(null);
  const swipeableRefs = useRef<{ [key: string]: any }>({});
  const [showActionsModal, setShowActionsModal] = useState(false);
  // Estado para el modal de prueba
  const [showTestModal, setShowTestModal] = useState(false);
  // Estado para la edición inline de celular
  const [editingCelular, setEditingCelular] = useState(false);
  const [tempCelular, setTempCelular] = useState('');
  // const proveedorPreseleccionado = (route.params as any)?.proveedorPreseleccionado; // Removed to fix route error
  // const ordenIdPreseleccionada = (route.params as any)?.ordenId; // Removed to fix route error
  const proveedorPreseleccionado = undefined; // No navigation params available
  const ordenIdPreseleccionada = undefined; // No navigation params available
  // 1. Estado para el modal de historial de producto
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [productoHistorial, setProductoHistorial] = useState<Producto | null>(null);
  const currentSwipeableRef = useRef<Swipeable | null>(null);
  // Estado para mostrar el spinner de cálculo por producto
  const [productoCalculando, setProductoCalculando] = useState<string | null>(null);
  const [procesandoOrden, setProcesandoOrden] = useState(false);
  const lastTapRef = useRef<{ id: string; timestamp: number } | null>(null);
  // Estado para el orden original y para mostrar el botón de aplicar en el paso 3 del wizard
  const [productosWizardOrdenOriginal, setProductosWizardOrdenOriginal] = useState<Producto[]>([]);
  const [ordenProgreso, setOrdenProgreso] = useState<{actual: number, total: number, nombre: string} | null>(null);
  const [isUpdating, setIsUpdating] = useState(false); // Nuevo estado para indicador global
  const [busquedaProveedor, setBusquedaProveedor] = useState('');
  const [updateAction, setUpdateAction] = useState<'marcando' | 'desmarcando'>('marcando'); // Tipo de acción
  const [fechaOrden, setFechaOrden] = useState<string>('');
  const [editandoFecha, setEditandoFecha] = useState(false);
  const [fechaInputText, setFechaInputText] = useState<string>('');
  const [fechaUpdateTrigger, setFechaUpdateTrigger] = useState(0);
  const [shouldReloadData, setShouldReloadData] = useState(false);
  const [justCreatedOrder, setJustCreatedOrder] = useState(false);

  useEffect(() => {
    getProductos((productosData) => {
      setProductos(productosData);
    });
    getProveedores((proveedoresData) => {
      setProveedores(proveedoresData);
    });
    
    // Usar órdenes filtradas por rol si hay usuario autenticado
    if (userData) {
      console.log('🔍 Cargando órdenes filtradas por rol:', {
        role: userData.role,
        contactId: userData.contactId
      });
      getOrdenesByUserRole(userData, (ordenesData) => {
        console.log('✅ Órdenes cargadas para usuario:', {
          role: userData.role,
          totalOrdenes: ordenesData.length,
          ordenes: ordenesData.map(o => ({ id: o.id, proveedorId: o.proveedorId }))
        });
        setOrdenes(ordenesData);
        setLoading(false);
      });
    } else {
      getOrdenes((ordenesData) => {
        setOrdenes(ordenesData);
        setLoading(false);
      });
    }
  }, [userData]);

  // Recargar órdenes cuando el componente se monta
  useEffect(() => {
    console.log('🔄 Tab de órdenes montado - Verificando si recargar datos');
    console.log('🔍 Estado actual:', {
      ordenesLength: ordenes.length,
      filtroActual: filtro,
        proveedorFiltro,
        wizardVisible,
        shouldReloadData,
        justCreatedOrder
      });
      
      // NO recargar si acabamos de crear/actualizar una orden o si el wizard está activo
      // Esto evita que se pierda el filtro después de crear/actualizar una orden
      if (wizardVisible || justCreatedOrder) {
        console.log('📋 No recargando datos:', {
          wizardVisible,
          justCreatedOrder,
          filtroActual: filtro,
          proveedorFiltro,
          razon: wizardVisible ? 'Wizard activo' : 'Orden recién creada/actualizada'
        });
        return;
      }
      
      // Solo recargar si no hay órdenes cargadas o si se solicita explícitamente
      if (ordenes.length === 0 || shouldReloadData) {
        console.log('📋 Recargando datos:', {
          ordenesLength: ordenes.length,
          shouldReloadData
        });
        if (userData) {
          getOrdenesByUserRole(userData, (ordenesData) => {
            console.log('✅ Órdenes recargadas al enfocar tab:', {
              role: userData.role,
              totalOrdenes: ordenesData.length
            });
            setOrdenes(ordenesData);
            setShouldReloadData(false); // Resetear el flag después de recargar
          });
        } else {
          getOrdenes((ordenesData) => {
            setOrdenes(ordenesData);
            setShouldReloadData(false); // Resetear el flag después de recargar
          });
        }
      } else {
        console.log('📋 Manteniendo órdenes existentes y filtros:', {
          totalOrdenes: ordenes.length,
          filtroActual: filtro,
          proveedorFiltro,
          shouldReloadData
        });
      }
    }, [userData, ordenes.length, wizardVisible, shouldReloadData]);

  useEffect(() => {
    if (proveedorPreseleccionado && proveedores.length > 0) {
      const proveedor = proveedores.find(p => p.id === proveedorPreseleccionado);
      if (proveedor) {
        setProveedorSel(proveedor);
        setWizardStep(2);
        setWizardVisible(true);
      }
    }
    // Solo debe ejecutarse una vez al montar o cuando cambian proveedores/proveedorPreseleccionado
     
  }, [proveedores, proveedorPreseleccionado]);

  // Manejar navegación a orden específica
  useEffect(() => {
    console.log('🔍 useEffect ordenIdPreseleccionada:', {
      ordenIdPreseleccionada,
      ordenesLength: ordenes.length,
      routeParams: 'No navigation params available'
    });
    
    if (ordenIdPreseleccionada && ordenes.length > 0) {
      const ordenEncontrada = ordenes.find(o => o.id === ordenIdPreseleccionada);
      console.log('🔍 Buscando orden con ID:', ordenIdPreseleccionada);
      console.log('🔍 Orden encontrada:', ordenEncontrada ? ordenEncontrada.id : 'NO ENCONTRADA');
      
      if (ordenEncontrada) {
        console.log('🚀 Abriendo orden específica:', ordenEncontrada.id);
        openWizard(ordenEncontrada);
      } else {
        console.warn('⚠️ No se encontró la orden con ID:', ordenIdPreseleccionada);
        console.log('📋 Órdenes disponibles:', ordenes.map(o => o.id).slice(0, 5));
      }
    }
  }, [ordenes, ordenIdPreseleccionada]);

  useEffect(() => {
    console.log('🔍 useEffect - soloLectura cambió a:', soloLectura);
    if (soloLectura) {
      setSoloSeleccionados(true);
    } else {
      // Solo establecer como false si no estamos en modo edición
      if (!editOrden) {
        setSoloSeleccionados(false);
      }
    }
  }, [soloLectura, editOrden]);

  // Si el usuario es PRODUCTOR y tiene el filtro de proveedor activo, cambiarlo a ultimas
  useEffect(() => {
    if (userData?.role === 'PRODUCTOR' && filtro === 'proveedor') {
      setFiltro('ultimas');
      setProveedorFiltro('');
    }
  }, [userData?.role, filtro]);

  // Wizard handlers
  const openWizard = (ordenToEdit?: Orden) => {
    if (ordenToEdit) {
      setEditOrden(ordenToEdit);
      setProveedorSel(proveedores.find(p => p.id === ordenToEdit.proveedorId) || null);
      setTipoSel(ordenToEdit.tipo);
      // Debug: Verificar estructura de productos en la orden
      console.log('🔍 DEBUG - Abriendo orden:', {
        ordenId: ordenToEdit.id,
        proveedor: ordenToEdit.proveedorNombre,
        tipo: ordenToEdit.tipo,
        totalProductos: ordenToEdit.productos?.length || 0
      });
      
      console.log('🔍 Estructura de productos en orden existente:', ordenToEdit.productos?.map(p => ({
        tieneId: !!p.id,
        tieneProductoId: !!p.productoId,
        id: p.id,
        productoId: p.productoId,
        cantidad: p.cantidad,
        unidad: p.unidad,
        tipoEstructura: p.id ? 'nueva' : 'antigua'
      })));
      
      const productosCompatibles = (ordenToEdit.productos || [])
        .map(p => {
          // Manejar estructura antigua y nueva
          const productoId = p.id || p.productoId;
          const cantidad = typeof p.cantidad === 'string' ? p.cantidad : p.cantidad?.toString() || '0';
          
          return { 
            id: productoId,
            cantidad: cantidad, 
            unidad: p.unidad || 'UNIDAD'
          };
        })
        .filter(p => p.id); // Filtrar productos sin ID válido
      
      console.log('🔍 Productos convertidos para selección:', productosCompatibles.map(p => ({
        id: p.id,
        cantidad: p.cantidad,
        unidad: p.unidad,
        idValido: !!p.id
      })));
      
      setProductosSel(productosCompatibles);
      setFechaOrden(ordenToEdit.fecha || obtenerFechaActual());
      setWizardStep(3);
      // Determinar si la orden debe estar en solo lectura
      // Las órdenes de productores pueden ser editadas incluso cuando están enviadas/impresas
      const proveedor = proveedores.find(p => p.id === ordenToEdit.proveedorId);
      const esProductor = proveedor?.tipo === 'Productor';
      
      // Forzar que solo COMPLETADA, RECHAZADA y AUTOMATICA estén en solo lectura
      let esSoloLectura = false;
      const estadoNormalizado = ordenToEdit.estado?.trim().toUpperCase();
      const tipoNormalizado = ordenToEdit.tipo?.trim().toUpperCase();
      
      if (estadoNormalizado === 'COMPLETADA' || estadoNormalizado === 'RECHAZADA') {
        esSoloLectura = true;
      }
      
      // Las órdenes automáticas pueden ser editadas por el productor
      // Esto permite que los productores ajusten cantidades, agreguen/quiten productos
      // y modifiquen otros aspectos de la orden automática según sus necesidades
      
      console.log('🔍 Estado de la orden:', {
        estadoOriginal: ordenToEdit.estado,
        estadoNormalizado,
        tipoOriginal: ordenToEdit.tipo,
        tipoNormalizado,
        esSoloLectura,
        esCompletada: estadoNormalizado === 'COMPLETADA',
        esRechazada: estadoNormalizado === 'RECHAZADA',
        esAutomatica: tipoNormalizado === 'AUTOMATICA',
        deberiaSerSoloLectura: estadoNormalizado === 'COMPLETADA' || estadoNormalizado === 'RECHAZADA'
      });
      
      console.log('🔍 SETEANDO soloLectura:', { esSoloLectura, estadoOrden: ordenToEdit.estado });
      setSoloLectura(esSoloLectura);
      // Solo seleccionados debe estar desmarcado para órdenes nuevas y pendientes
      setSoloSeleccionados(false);
      setOrdenDuplicarSel(null);
    } else {
      setEditOrden(null);
      setTipoSel(null);
      setProductosSel([]);
      setProductosDefaultDisponibles([]);
      setProductosSugeridos([]);
      const fechaActual = obtenerFechaActual();
      setFechaOrden(fechaActual);
      console.log('🔍 NUEVA ORDEN - Fecha establecida:', fechaActual);
      
      // Si el usuario es PRODUCTOR, preseleccionar su proveedor y ir al paso 2
      if (userData?.role === 'PRODUCTOR' && userData.contactId) {
        const proveedorAsociado = proveedores.find(p => p.id === userData.contactId);
        if (proveedorAsociado) {
          setProveedorSel(proveedorAsociado);
          setWizardStep(2);
          console.log('🔍 PRODUCTOR - Preseleccionando proveedor:', proveedorAsociado.nombre);
        } else {
          setProveedorSel(null);
          setWizardStep(1);
          console.log('⚠️ PRODUCTOR - No se encontró el proveedor asociado');
        }
      } else {
        setProveedorSel(null);
        setWizardStep(1);
      }
      
      console.log('🔍 NUEVA ORDEN - setSoloLectura(false)');
      setSoloLectura(false);
      // Solo seleccionados debe estar desmarcado para órdenes nuevas
      setSoloSeleccionados(false);
      setOrdenDuplicarSel(null);
    }
    setWizardVisible(true);
  };
  const closeWizard = () => {
    setWizardVisible(false);
    setBusquedaOrden('');
    setBusquedaProveedor('');
    setSoloSeleccionados(false);
    setFechaOrden('');
    setEditandoFecha(false);
    setProductosDefaultDisponibles([]);
    setProductosSugeridos([]);
    setFechaInputText('');
  };

  let ordenesFiltradas = ordenes;
  // Obtener la fecha de hoy en formato dd-mm-yyyy
  const hoyDate = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const hoyStr = `${pad(hoyDate.getDate())}-${pad(hoyDate.getMonth() + 1)}-${hoyDate.getFullYear()}`;

  // Ordenar siempre por fecha descendente antes de filtrar
  const parseFecha = (fecha: string) => {
    // Soporta dd-mm-yyyy y yyyy-mm-dd, incluyendo hora, minuto y segundo
    if (/^\d{2}-\d{2}-\d{4}/.test(fecha)) {
      const [d, m, y, ...resto] = fecha.split(/[-T ]/);
      const [h, min, s] = resto.length > 0 ? resto[0].split(':') : ['00', '00', '00'];
      return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s));
    } else if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) {
      const [y, m, d, ...resto] = fecha.split(/[-T ]/);
      const [h, min, s] = resto.length > 0 ? resto[0].split(':') : ['00', '00', '00'];
      return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s));
    }
    return new Date(fecha);
  };
  const ordenesOrdenadas = [...ordenes].sort((a, b) => parseFecha(b.fecha).getTime() - parseFecha(a.fecha).getTime());

    if (filtro === 'ultimas') {
    ordenesFiltradas = ordenesOrdenadas.slice(0, 10);
    } else if (filtro === 'hoy') {
    ordenesFiltradas = ordenesOrdenadas.filter(o => {
      // Extraer solo la parte de la fecha (sin hora)
      let fechaSoloDia = o.fecha;
      if (fechaSoloDia.includes(' ')) fechaSoloDia = fechaSoloDia.split(' ')[0];
      // Normalizar a dd-mm-yyyy
      if (/^\d{4}-\d{2}-\d{2}/.test(fechaSoloDia)) {
        const [y, m, d] = fechaSoloDia.split('-');
        fechaSoloDia = `${d}-${m}-${y}`;
      }
      return fechaSoloDia === hoyStr;
    });
    } else if (filtro === 'proveedor' && proveedorFiltro) {
    // Si hay un término de búsqueda, buscar en el nombre del proveedor
    if (busquedaOrden) {
      const proveedor = proveedores.find(p => p.id === proveedorFiltro);
      if (proveedor && containsSearchTerm(proveedor.nombre, busquedaOrden)) {
    ordenesFiltradas = ordenesOrdenadas.filter(o => o.proveedorId === proveedorFiltro);
      } else {
        ordenesFiltradas = [];
      }
    } else {
      ordenesFiltradas = ordenesOrdenadas.filter(o => o.proveedorId === proveedorFiltro);
    }
  } else {
    // Si hay un término de búsqueda, buscar en nombres de proveedores
    if (busquedaOrden) {
      ordenesFiltradas = ordenesOrdenadas.filter(o => {
        const proveedor = proveedores.find(p => p.id === o.proveedorId);
        return proveedor && containsSearchTerm(proveedor.nombre, busquedaOrden);
      });
  } else {
    ordenesFiltradas = ordenesOrdenadas;
    }
  }

  const puedeEliminarOrden = (orden: Orden) => orden.estado === 'PENDIENTE';

  const renderOrden = ({ item }: { item: Orden }) => {
    const proveedor = proveedores.find(p => p.id === item.proveedorId);
    let fechaMostrar = item.fecha;
    if (item.fecha && item.fecha.length >= 10) {
      if (/^\d{2}-\d{2}-\d{4}/.test(item.fecha)) {
        fechaMostrar = item.fecha;
      } else if (/^\d{4}-\d{2}-\d{2}/.test(item.fecha)) {
        const [fechaPart, horaPart] = item.fecha.split(' ');
        const [y, m, d] = fechaPart.split('-');
        fechaMostrar = `${d}-${m}-${y}`;
        if (horaPart) fechaMostrar += ` ${horaPart}`;
      }
    }
    // Solo mostrar advertencia si hay productos y al menos uno está fuera de tendencia
    const fueraDeTendencia = item.productos && item.productos.length > 0 && item.productos.some(prod => {
      const hoy = new Date();
      const tresMesesAtras = new Date(hoy.getFullYear(), hoy.getMonth() - 3, hoy.getDate());
      const ordenesUltimos3Meses = ordenes.filter(o => {
        const fechaO = parseFecha(o.fecha);
        return fechaO >= tresMesesAtras && fechaO <= hoy && Array.isArray(o.productos) && (o.productos as ProductoOrden[]).some((p: ProductoOrden) => p.productoId === prod.productoId);
      });
      ordenesUltimos3Meses.sort((a, b) => parseFecha(b.fecha).getTime() - parseFecha(a.fecha).getTime());
      const comprasProducto = ordenesUltimos3Meses
        .map(o => Array.isArray(o.productos) ? (o.productos as ProductoOrden[]).find((p: ProductoOrden) => p.productoId === prod.productoId) : null)
        .filter((p): p is ProductoOrden => !!p && typeof p.cantidad === 'string' && !isNaN(Number(p.cantidad)))
        .map(p => Number(p.cantidad))
        .filter((n): n is number => typeof n === 'number' && !isNaN(n));
      
      const cantidadActual = Number(prod.cantidad);
      const cantidadPromedio = comprasProducto.length > 0 ? Math.round(comprasProducto.reduce((a, b) => a + b, 0) / comprasProducto.length) : null;
      
      return cantidadActual !== null && cantidadPromedio !== null && 
        Math.abs(cantidadActual - cantidadPromedio) / cantidadPromedio > 0.2;
    });
    // 1. En la tarjeta de la orden (renderOrden):
    // Calcular el importe total de la orden
    const importeTotal = item.productos && item.productos.length > 0
      ? item.productos.reduce((acc, prod) => {
          const productoInfo = productos.find(p => p.id === prod.productoId);
          if (productoInfo && productoInfo.precio !== undefined && !isNaN(Number(prod.cantidad))) {
            return acc + (Number(prod.cantidad) * Number(productoInfo.precio));
          }
          return acc;
        }, 0)
      : 0;
    return (
      <Swipeable
        ref={ref => { if (ref) swipeableRefs.current[item.id] = ref; }}
        renderRightActions={() => (
          puedeEliminarOrden(item) ? (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#fff', borderRadius: 4, marginBottom: 8, padding: 0, justifyContent: 'space-between', width: 220, alignSelf: 'stretch' }}>
              <View style={{ flex: 1, justifyContent: 'center', paddingLeft: 16 }}>
                <Text style={{ color: '#D7263D', fontWeight: 'bold' }}>¿Eliminar esta orden?</Text>
              </View>
              <TouchableOpacity
                style={{ backgroundColor: '#D7263D', borderTopRightRadius: 4, borderBottomRightRadius: 4, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch' }}
                onPress={async () => {
                  if (swipeableRefs.current[item.id]) swipeableRefs.current[item.id].close();
                  // Eliminar orden directamente
                  const responsable = await getResponsableOrAlert();
                  if (!responsable) return;
                  await deleteOrden(item.id);
                  await logEvento({ tipoEvento: 'eliminacion_orden', responsable, idAfectado: item.id, datosJSON: item });
                  setOrdenes(prev => prev.filter(o => o.id !== item.id));
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Eliminar</Text>
              </TouchableOpacity>
          </View>
          ) : (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#f8f8f8', borderRadius: 4, marginBottom: 8, paddingLeft: 16, width: 220, alignSelf: 'stretch' }}>
              <Text style={{ color: '#888', fontWeight: 'bold' }}>No se puede eliminar esta orden</Text>
              </View>
          )
        )}
        rightThreshold={40}
      >
              <TouchableOpacity
          style={[
            styles.card,
            highlightedOrdenId === item.id && {
              backgroundColor: '#f0f7ff',
              borderRadius: 6
            },
            // fueraDeTendencia && { borderColor: '#FFD600', borderWidth: 3 } // <-- Elimino esta línea
          ]}
          onPress={() => openWizard(item)}
          onLongPress={() => {
            setOrdenEstadoEdit(item);
            setShowEstadoModal(true);
                }}
          delayLongPress={400}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.proveedor}>{(proveedores.find(p => p.id === item.proveedorId)?.nombre) || 'Proveedor desconocido'}</Text>
            <View style={{ position: 'absolute', top: 0, right: 0, flexDirection: 'row', alignItems: 'center' }}>
              {fueraDeTendencia && (
                <Ionicons name="warning" size={20} color="#FFD600" style={{ marginRight: 4 }} />
              )}
              {/* Indicador para órdenes de productores editables */}
              {(() => {
                const proveedor = proveedores.find(p => p.id === item.proveedorId);
                const esProductor = proveedor?.tipo === 'Productor';
                const puedeEditar = esProductor && (item.estado === 'ENVIADA' || item.estado === 'ENVIADA / IMPRESA');
                return puedeEditar ? (
                  <View style={{ 
                    backgroundColor: '#4CAF50', 
                    borderRadius: 10, 
                    paddingHorizontal: 6, 
                    paddingVertical: 2,
                    marginLeft: 4
                  }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>EDITABLE</Text>
                  </View>
                ) : null;
              })()}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Ionicons name="calendar-outline" size={16} color="#888" style={{ marginRight: 6 }} />
            <Text style={styles.cardPropText}>{fechaMostrar}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Ionicons name="cube-outline" size={16} color="#888" style={{ marginRight: 6 }} />
            <Text style={styles.cardPropText}>Ítems: {item.productos ? item.productos.length : 0}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Ionicons name="pricetag-outline" size={16} color="#888" style={{ marginRight: 6 }} />
            <Text style={styles.cardPropText}>{ORDENES_TIPOS[item.tipo as keyof typeof ORDENES_TIPOS]}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {getEstadoIcon(item.estado)}
            <View style={[styles.estadoBadge, getEstadoStyle(item.estado), { marginLeft: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, minWidth: 0 }]}> 
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, textAlign: 'center', textTransform: 'capitalize', letterSpacing: 0.2 }}>{item.estado}</Text>
            </View>
            </View>
            {importeTotal > 0 && (
              <Text style={{ color: '#D7263D', fontWeight: 'bold', fontSize: 15, textAlign: 'right' }}>${importeTotal.toFixed(2)}</Text>
            )}
          </View>
              </TouchableOpacity>
      </Swipeable>
    );
  };

  // Wizard UI
  const renderWizard = () => {
    const pasos = ['Proveedor', 'Tipo', 'Productos'];
    const productosProveedorCount = proveedorSel ? productos.filter(p => p.proveedorId === proveedorSel.id).length : 0;
    const colorFondoEstado = getEstadoColorFondo(editOrden?.estado || (soloLectura ? 'COMPLETADA' : ''));
    const wizardStepsBar = (
      <View style={[styles.wizardStepsBar, { backgroundColor: colorFondoEstado, marginBottom: 0, justifyContent: 'flex-start', paddingLeft: 12 }]}>
        {pasos.map((label, idx) => {
          let displayLabel = label;
          if (label === 'Productos' && proveedorSel) {
            displayLabel = `Productos (${productosProveedorCount})`;
          }
          return (
            <View key={label} style={styles.wizardStepItem}>
              <Text style={[
                styles.wizardStepText,
                wizardStep === idx + 1 && styles.wizardStepTextActive
              ]}>
                {displayLabel}
              </Text>
              {idx < pasos.length - 1 && <View style={styles.wizardStepDivider} />}
            </View>
          );
        })}
      </View>
    );
    // Sub-header con proveedor y tipo
    const wizardSubHeader = (
      <View style={[styles.wizardSubHeader, { backgroundColor: colorFondoEstado, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }] }>
        <View>
          {proveedorSel && (
            <Text style={{ color: '#888', fontSize: 13 }}>
              {proveedorSel.nombre}
            </Text>
          )}
          {tipoSel && (
            <Text style={{ color: '#aaa', fontSize: 12 }}>
              Tipo: {ORDENES_TIPOS[tipoSel as keyof typeof ORDENES_TIPOS]}
            </Text>
          )}
        </View>
        {!soloLectura && wizardStep === 3 && (
          <TouchableOpacity onPress={() => setShowAddProductoModal(true)} style={{ marginLeft: 8, padding: 4 }}>
            <Ionicons name="add-circle-outline" size={20} color="#D7263D" />
          </TouchableOpacity>
        )}
      </View>
    );
    // Paso 1: Seleccionar proveedor
    if (wizardStep === 1) {
      // Calcular el uso de cada proveedor
      const proveedorUso: Record<string, number> = {};
      ordenes.forEach(o => {
        if (o.proveedorId) {
          proveedorUso[o.proveedorId] = (proveedorUso[o.proveedorId] || 0) + 1;
        }
      });
      // Filtrar proveedores por búsqueda
      const proveedoresFiltrados = busquedaProveedor.trim() 
        ? proveedores.filter(p => 
            p.nombre.toLowerCase().includes(busquedaProveedor.toLowerCase()) ||
            (p.tipo && p.tipo.toLowerCase().includes(busquedaProveedor.toLowerCase()))
          )
        : proveedores;
      
      // Ordenar proveedores: más usados primero, luego por nombre
      const proveedoresOrdenados = [...proveedoresFiltrados].sort((a, b) => {
        const usoA = proveedorUso[a.id] || 0;
        const usoB = proveedorUso[b.id] || 0;
        if (usoA !== usoB) return usoB - usoA;
        return a.nombre.localeCompare(b.nombre);
      });

    return (
        <View style={styles.wizardContainer}>
          <Header title={soloLectura ? "Detalle Orden" : editOrden ? "Editar Orden" : "Nueva Orden"} />
          {toast && (
            <View style={styles.toastRed}>
              <Text style={styles.toastRedText}>{toast.message}</Text>
            </View>
          )}
          {wizardStepsBar}
          {wizardSubHeader}
          {/* Campo de búsqueda */}
          <View style={{ marginHorizontal: 12, marginTop: 8, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e0e0e0' }}>
              <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, paddingVertical: 12, fontSize: 16, color: '#222' }}
                placeholder="Buscar contacto..."
                value={busquedaProveedor}
                onChangeText={setBusquedaProveedor}
                placeholderTextColor="#aaa"
              />
            </View>
          </View>
          <FlatList
            data={proveedoresOrdenados}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.card,
                  { minHeight: 48, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' },
                  proveedorSel?.id === item.id && { borderColor: '#D7263D', borderWidth: 2 }
                ]}
                onPress={async () => { 
                  setProveedorSel(item); 
                  
                  // Si es un cliente, cargar productos predeterminados disponibles
                  if (item.tipo === 'Cliente') {
                    try {
                      const productosDefault = await getProductosDefaultCliente(item.id);
                      if (productosDefault.length > 0) {
                        console.log('📋 Cargando productos predeterminados disponibles para cliente:', item.nombre);
                        // Guardar productos predeterminados disponibles (sin marcar)
                        setProductosDefaultDisponibles(productosDefault);
                        // No marcar automáticamente los productos
                        setProductosSel([]);
                      } else {
                        setProductosDefaultDisponibles([]);
                      }
                      // Siempre ir al paso de tipo, incluso para clientes
                      setWizardStep(2);
                    } catch (error) {
                      console.warn('⚠️ Error cargando productos predeterminados:', error);
                      setProductosDefaultDisponibles([]);
                      setWizardStep(2); // Ir al paso de tipo en caso de error
                    }
                  } else {
                    setProductosDefaultDisponibles([]);
                    setWizardStep(2); // Para proveedores normales
                  }
                }}
              >
                <Ionicons name="storefront-outline" size={22} color="#D7263D" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.proveedor, { fontSize: 16, marginBottom: 0 }]}>{item.nombre}</Text>
                  {item.tipo && (
                    <View style={{ 
                      backgroundColor: item.tipo === 'Productor' ? '#FFD700' : item.tipo === 'Cliente' ? '#4CAF50' : '#D7263D',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 8,
                      alignSelf: 'flex-start',
                      marginTop: 2
                    }}>
                      <Text style={{ 
                        color: '#fff', 
                        fontSize: 10, 
                        fontWeight: 'bold' 
                      }}>
                        {item.tipo}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
          </View>
    );
  }
    // Paso 2: Seleccionar tipo
    if (wizardStep === 2) {
    return (
        <View style={styles.wizardContainer}>
          <Header title={soloLectura ? "Detalle Orden" : editOrden ? "Editar Orden" : "Nueva Orden"} />
          {toast && (
            <View style={styles.toastRed}>
              <Text style={styles.toastRedText}>{toast.message}</Text>
          </View>
          )}
          {wizardStepsBar}
          {wizardSubHeader}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 12, marginTop: 16 }}>
            {Object.entries(ORDENES_TIPOS)
              .filter(([key]) => key !== 'AUTOMATICA') // Excluir tipo automático del selector manual
              .map(([key, label]) => {
                const typedKey = key as keyof typeof ORDENES_TIPOS;
                return (
              <TouchableOpacity
                    key={key}
                    style={[
                      styles.tipoCard,
                      tipoSel === key && { borderColor: '#D7263D', backgroundColor: '#fbeaec' }
                    ]}
                  onPress={async () => {
                    setTipoSel(key);
                    if (key === 'DUPLICADA') {
                      // Para duplicada, mantener en paso 2 para mostrar lista
                      return;
                    } else if (key === 'SUGERIDA') {
                      // Para sugerida, generar sugerencias basadas en historial
                      if (proveedorSel) {
                        console.log('💡 Generando sugerencias para:', proveedorSel.nombre);
                        const sugerencias = generarSugerenciasOrden(proveedorSel.id, ordenes, productos);
                        setProductosSugeridos(sugerencias);
                        
                        // Auto-seleccionar productos sugeridos
                        const productosAutoSeleccionados = sugerencias.map(sug => ({
                          id: sug.producto.id,
                          cantidad: sug.cantidadSugerida.toString(),
                          unidad: sug.unidadSugerida
                        }));
                        setProductosSel(productosAutoSeleccionados);
                        
                        console.log('📋 Productos sugeridos auto-seleccionados:', productosAutoSeleccionados.length);
                      }
                      setWizardStep(3);
                    } else {
                      setWizardStep(3);
                    }
                  }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={ORDENES_TIPOS_ICONS[typedKey] as any} size={32} color={tipoSel === key ? '#D7263D' : '#888'} style={{ marginBottom: 8 }} />
                    <Text style={[styles.tipo, { textAlign: 'center', color: tipoSel === key ? '#D7263D' : '#333' }]}>{label}</Text>
              </TouchableOpacity>
                );
              })}
          </View>
          {/* Si tipoSel es 'Duplicada', mostrar lista de órdenes completadas o rechazadas del proveedor seleccionado */}
          {tipoSel && tipoSel.toUpperCase() === 'DUPLICADA' && proveedorSel && (
            <View style={{ marginTop: 18, marginHorizontal: 12 }}>
              <Text style={{ fontWeight: 'bold', color: '#D7263D', marginBottom: 8 }}>Seleccione una orden para duplicar:</Text>
              <FlatList
                data={ordenes.filter(o => 
                  o.proveedorId === proveedorSel.id && 
                  (o.estado === 'COMPLETADA' || o.estado === 'RECHAZADA') &&
                  o.tipo !== 'AUTOMATICA'  // Excluir órdenes automáticas
                )}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                {
                  marginBottom: 6,
                  borderWidth: 2,
                  borderColor: '#D7263D',
                  backgroundColor: '#fff',
                  minHeight: undefined,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                }
              ]}
              onPress={() => {
                      setProductosSel((item.productos || []).map(p => ({ id: p.productoId, cantidad: p.cantidad, unidad: p.unidad })));
                      setWizardStep(3);
              }}
            >
              <Ionicons name="document-text-outline" size={22} color="#D7263D" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: '#222' }}>{item.fecha}</Text>
                    <Text style={{ color: '#888', fontSize: 13 }}>Tipo: {item.tipo}</Text>
              </View>
            </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={{ color: '#888', fontStyle: 'italic', marginTop: 8 }}>No hay órdenes completadas o rechazadas para este proveedor.</Text>}
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ paddingBottom: 0 }}
              />
            </View>
          )}
        </View>
    );
  }
    // Paso 3: Seleccionar productos
    if (wizardStep === 3 && proveedorSel) {
      let productosProveedor = productos.filter(p => p.proveedorId === proveedorSel.id && !p.archivado);
      
      // Para clientes: agregar productos predeterminados que no estén ya en la lista
      if (proveedorSel.tipo === 'Cliente' && productosDefaultDisponibles.length > 0) {
        const productosDefaultCompletos = productosDefaultDisponibles
          .map(pd => productos.find(p => p.id === pd.productoId))
          .filter((p): p is Producto => p !== undefined && !productosProveedor.some(pp => pp.id === p.id));
        
        productosProveedor = [...productosProveedor, ...productosDefaultCompletos];
        console.log('📋 Productos predeterminados agregados a la lista:', productosDefaultCompletos.length);
      }
      
      // Para órdenes sugeridas: incluir productos sugeridos que no estén ya en la lista
      if (tipoSel === 'SUGERIDA' && productosSugeridos.length > 0) {
        const productosSugeridosCompletos = productosSugeridos
          .map(ps => ps.producto)
          .filter(p => !productosProveedor.some(pp => pp.id === p.id));
        
        productosProveedor = [...productosProveedor, ...productosSugeridosCompletos];
        console.log('💡 Productos sugeridos agregados a la lista:', productosSugeridosCompletos.length);
      }
      
      const otrosProductos = productosSel
        .filter(p => !productosProveedor.some(pp => pp.id === p.id))
        .map(p => productos.find(prod => prod.id === p.id))
        .filter((p): p is Producto => p !== undefined);
      
      productosProveedor = [...productosProveedor, ...otrosProductos].sort((a, b) => {
        if (a.proveedorId === b.proveedorId) {
          if (a.orden !== undefined && b.orden !== undefined) return a.orden - b.orden;
          return a.nombre.localeCompare(b.nombre);
        }
        if (a.proveedorId === proveedorSel.id) return -1;
        if (b.proveedorId === proveedorSel.id) return 1;
        return a.nombre.localeCompare(b.nombre);
      });

      // Filtrar productos según la búsqueda y el checkbox
      productosProveedor = productosProveedor.filter(p => {
        if (!busquedaOrden) return !soloSeleccionados || productosSel.some(sel => sel.id === p.id);

        const proveedor = proveedores.find(prov => prov.id === p.proveedorId);
        const nombreMatch = containsSearchTerm(p.nombre, busquedaOrden);
        const proveedorMatch = proveedor ? containsSearchTerm(proveedor.nombre, busquedaOrden) : false;

        const matchesSearch = nombreMatch || proveedorMatch;
        const matchesFilter = !soloSeleccionados || productosSel.some(sel => sel.id === p.id);

        return matchesSearch && matchesFilter;
      });

      // Calcular el importe total de los productos seleccionados para el detalle
      const importeTotalDetalle = productosSel.reduce((acc, prodSel) => {
        const productoInfo = productos.find(p => p.id === prodSel.id);
        if (productoInfo && productoInfo.precio !== undefined && !isNaN(Number(prodSel.cantidad))) {
          return acc + (Number(prodSel.cantidad) * Number(productoInfo.precio));
        }
        return acc;
      }, 0);

      // Sub-header con proveedor y tipo (sin el importe)
      const wizardSubHeader = (
        <View style={[styles.wizardSubHeader, { backgroundColor: colorFondoEstado, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }] }>
          <View>
            {proveedorSel && (
              <Text style={{ color: '#888', fontSize: 13 }}>
                {proveedorSel.nombre}
              </Text>
            )}
            {tipoSel && (
              <Text style={{ color: '#aaa', fontSize: 12 }}>
                Tipo: {ORDENES_TIPOS[tipoSel as keyof typeof ORDENES_TIPOS]}
              </Text>
            )}
          </View>
          {!soloLectura && wizardStep === 3 && (
            <TouchableOpacity onPress={() => setShowAddProductoModal(true)} style={{ marginLeft: 8, padding: 4 }}>
              <Ionicons name="add-circle-outline" size={20} color="#D7263D" />
            </TouchableOpacity>
          )}
        </View>
      );

    return (
        <TouchableWithoutFeedback
              onPress={() => {
            if (editingCantidad) {
              // Buscar el producto seleccionado
              const seleccionado = productosSel.find(p => p.id === editingCantidad);
              if (seleccionado) {
                if (!cantidadTemp || isNaN(Number(cantidadTemp))) {
                  setProductosSel(productosSel.map(p => p.id === editingCantidad ? { ...p, cantidad: seleccionado.cantidad } : p));
                } else {
                }
              }
              setEditingCantidad(null);
              setCantidadTemp('');
            }
            Keyboard.dismiss();
          }}
        >
          <View style={styles.wizardContainer}>
            <Header 
              title={soloLectura ? "Detalle Orden" : editOrden ? "Editar Orden" : "Nueva Orden"}
              subtitle={
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  {importeTotalDetalle > 0 && (
                    <Text style={{ color: '#fff', fontWeight: '500', fontSize: 13, opacity: 0.85 }}>
                      Total: ${importeTotalDetalle.toFixed(2)}
                    </Text>
                  )}
                  <TouchableOpacity 
                    onLongPress={() => {
                      if (!soloLectura) {
                        setFechaInputText(formatearFecha(fechaOrden));
                        setEditandoFecha(true);
                      }
                    }}
                    style={{ flex: 1, alignItems: 'flex-end' }}
                  >
                    <Text key={fechaUpdateTrigger} style={{ color: '#fff', fontWeight: '500', fontSize: 13, opacity: 0.85 }}>
                      {formatearFecha(fechaOrden)}
                    </Text>
                  </TouchableOpacity>
                </View>
              }
            />
            {toast && (
              <View style={styles.toastRed}>
                <Text style={styles.toastRedText}>{toast.message}</Text>
              </View>
            )}
            {wizardStepsBar}
            {wizardSubHeader}
            {/* Barra de búsqueda y filtro */}
            <View style={[styles.searchFilterContainer, { backgroundColor: colorFondoEstado }]}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
            <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar por nombre..."
                  value={busquedaOrden}
                  onChangeText={setBusquedaOrden}
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                  returnKeyType="search"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
                {busquedaOrden.length > 0 && (
                  <TouchableOpacity onPress={() => setBusquedaOrden('')} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
                )}
          </View>
            <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => {
                  if (!soloLectura) setSoloSeleccionados(!soloSeleccionados);
                }}
                disabled={soloLectura}
            >
                <View style={[styles.checkbox, soloSeleccionados && styles.checkboxSelected]}>
                  {soloSeleccionados && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Solo seleccionados</Text>
            </TouchableOpacity>
          </View>
            <View style={{ height: 4 }} />
            <DraggableFlatList
              data={productosProveedor}
              keyExtractor={item => item.id}
              onDragEnd={({ data }) => {
                // Solo reordenar localmente
                setProductos(data);
                // Actualizar el orden en Firebase inmediatamente
                const productosProveedor = data.filter(p => p.proveedorId === proveedorSel.id);
                setProcesandoOrden(true);
                setOrdenProgreso({actual: productosProveedor.length, total: productosProveedor.length, nombre: 'Marcando Producto'});
                updateProductosOrdenBatch(productosProveedor.map((p, i) => ({ id: p.id, orden: i })))
                  .then(() => {
                    // Refrescar la lista de productos desde la base de datos
                    getProductos((productosData) => {
                      setProductos(productosData);
                      setProductosWizardOrdenOriginal(productosData);
                      // Esperar un momento antes de ocultar el indicador para asegurar que se vea
                      setTimeout(() => {
                        setProcesandoOrden(false);
                        setOrdenProgreso(null);
                      }, 1000);
                    });
                  })
                  .catch(error => {
                    console.error('Error al actualizar el orden:', error);
                    Alert.alert('Error', 'No se pudo actualizar el orden de los productos');
                    // Esperar un momento antes de ocultar el indicador en caso de error
                    setTimeout(() => {
                      setProcesandoOrden(false);
                      setOrdenProgreso(null);
                    }, 1000);
                  });
              }}
              renderItem={({ item, drag, isActive }) => {
                const seleccionado = productosSel.find(p => p.id === item.id);
                const esOtroProveedor = item.proveedorId !== proveedorSel.id;
                
                const handlePress = () => {
                  if (soloLectura) return;
                  
                  const now = Date.now();
                  const DOUBLE_TAP_DELAY = 600;
                  
                  // Verificar si el producto está seleccionado
                  const isSelected = productosSel.some(p => p.id === item.id);
                  
                  // Verificar si es un producto sugerido
                  const productoSugerido = tipoSel === 'SUGERIDA' ? 
                    productosSugeridos.find(ps => ps.producto.id === item.id) : null;
                  
                  // Verificar si es doble tap usando useRef para acceso inmediato
                  const lastTap = lastTapRef.current;
                  const isDoubleTap = isSelected && lastTap && 
                                    lastTap.id === item.id && 
                                    (now - lastTap.timestamp) < DOUBLE_TAP_DELAY;
                  
                  console.log('🔍 Tap detectado:', { 
                    productId: item.id,
                    nombre: item.nombre,
                    isSelected,
                    isDoubleTap,
                    lastTap: lastTap,
                    timeDiff: lastTap ? now - lastTap.timestamp : null,
                    procesando: productoCalculando === item.id
                  });

                  // Si está siendo procesado, ignorar
                  if (productoCalculando === item.id) {
                    console.log('⚠️ Tap ignorado - producto procesándose');
                    return;
                  }

                  if (isSelected) {
                    if (isDoubleTap) {
                      // DOBLE TAP: Desmarcar producto
                      console.log('🔄 DOBLE TAP - Desmarcando producto:', item.nombre);
                      setUpdateAction('desmarcando');
                      setIsUpdating(true);
                      setProductoCalculando(item.id);
                      lastTapRef.current = null; // Limpiar inmediatamente
                      
                      // Desmarcar inmediatamente
                      setProductosSel(prev => prev.filter(p => p.id !== item.id));
                      
                      setTimeout(() => {
                        setProductoCalculando(null);
                        setIsUpdating(false);
                        console.log('✅ Producto desmarcado:', item.nombre);
                      }, 500);
                    } else {
                      // PRIMER TAP en producto seleccionado: Registrar para posible doble tap
                      console.log('👆 Primer tap en producto seleccionado - registrando para doble tap');
                      lastTapRef.current = { id: item.id, timestamp: now };
                    }
                  } else {
                    // TAP en producto NO seleccionado: Agregar
                    console.log('➕ Agregando producto:', item.nombre);
                    setUpdateAction('marcando');
                    setIsUpdating(true);
                    setProductoCalculando(item.id);
                    
                    // Agregar inmediatamente
                    const productoInfo = productos.find(p => p.id === item.id);
                    
                    // Verificar si es un producto predeterminado o sugerido para usar su cantidad/unidad configurada
                    const productoPredeterminado = productosDefaultDisponibles.find(pd => pd.productoId === item.id);
                    const productoSugerido = tipoSel === 'SUGERIDA' ? 
                      productosSugeridos.find(ps => ps.producto.id === item.id) : null;
                    let cantidadDefault, unidadDefault;
                    
                    if (productoPredeterminado) {
                      // Usar cantidad y unidad predefinidas (clientes)
                      cantidadDefault = productoPredeterminado.cantidad;
                      unidadDefault = productoPredeterminado.unidad;
                      console.log('📋 Usando cantidad predeterminada:', cantidadDefault, unidadDefault);
                    } else if (productoSugerido) {
                      // Usar cantidad y unidad sugeridas (órdenes sugeridas)
                      cantidadDefault = productoSugerido.cantidadSugerida.toString();
                      unidadDefault = productoSugerido.unidadSugerida;
                      console.log('💡 Usando cantidad sugerida:', cantidadDefault, unidadDefault, 
                        `(promedio: ${productoSugerido.promedioCalculado.toFixed(2)}, órdenes: ${productoSugerido.ordenesAnalizadas})`);
                    } else {
                      // Usar lógica original
                      cantidadDefault = productoInfo && productoInfo.stock !== undefined ? String(productoInfo.stock) : '1';
                      unidadDefault = item.unidad || 'UNIDAD';
                    }
                    
                    setProductosSel(prev => [...prev, { id: item.id, cantidad: cantidadDefault, unidad: unidadDefault }]);
                    
                    // NO establecer lastTap aquí - eso interfiere con el doble tap posterior
                    lastTapRef.current = null;
                    
                    setTimeout(() => {
                      setProductoCalculando(null);
                      setIsUpdating(false);
                      console.log('✅ Producto agregado:', item.nombre);
                    }, 500);
                  }
                };
                // Calcula la cantidad última compra y la tendencia
                const hoy = new Date();
                const tresMesesAtras = new Date(hoy.getFullYear(), hoy.getMonth() - 3, hoy.getDate());
                const ordenesUltimos3Meses = ordenes.filter(o => {
                  const fechaO = parseFecha(o.fecha);
                  return fechaO >= tresMesesAtras && fechaO <= hoy && Array.isArray(o.productos) && (o.productos as ProductoOrden[]).some((p: ProductoOrden) => p.productoId === item.id);
                });
                // Ordenar por fecha descendente
                ordenesUltimos3Meses.sort((a, b) => parseFecha(b.fecha).getTime() - parseFecha(a.fecha).getTime());
                const comprasProducto = ordenesUltimos3Meses
                  .map(o => Array.isArray(o.productos) ? (o.productos as ProductoOrden[]).find((p: ProductoOrden) => p.productoId === item.id) : null)
                  .filter((prod): prod is ProductoOrden => !!prod && typeof prod.cantidad === 'string' && !isNaN(Number(prod.cantidad)))
                  .map(prod => Number(prod.cantidad))
                  .filter((n): n is number => typeof n === 'number' && !isNaN(n));
                const cantidadUltimaCompra = comprasProducto.length > 0 ? comprasProducto[0] : null;

                // --- TENDENCIA EN TIEMPO REAL ---
                // Si está en edición, usar cantidadTemp (si es válida), si no, usar seleccionado.cantidad
                let cantidadParaTendencia = seleccionado?.cantidad;
                if (editingCantidad === item.id && cantidadTemp !== '' && !isNaN(Number(cantidadTemp))) {
                  cantidadParaTendencia = cantidadTemp;
                }

                // Calcular tendencia usando la misma lógica que el historial
                const cantidadActual = cantidadParaTendencia ? Number(cantidadParaTendencia) : null;
                const cantidadPromedio = comprasProducto.length > 0 ? Math.round(comprasProducto.reduce((a, b) => a + b, 0) / comprasProducto.length) : null;
                
                // Calcular ciclo promedio
                let ciclos: number[] = [];
                for (let i = 0; i < ordenesUltimos3Meses.length - 1; i++) {
                  const d1 = parseFechaHistorial(ordenesUltimos3Meses[i].fecha);
                  const d2 = parseFechaHistorial(ordenesUltimos3Meses[i + 1].fecha);
                  const diff = Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
                  if (isFinite(diff) && diff > 0) ciclos.push(Math.round(diff));
                }
                const cicloPromedio = ciclos.length > 0 ? Math.round(ciclos.reduce((a, b) => a + b, 0) / ciclos.length) : null;
                
                // Determinar si está fuera de tendencia
                const fueraDeTendencia = cantidadActual !== null && cantidadPromedio !== null && 
                  Math.abs(cantidadActual - cantidadPromedio) / cantidadPromedio > 0.2; // 20% de desviación

                const mostrarWarning = !!seleccionado && fueraDeTendencia;
    return (
                  <ScaleDecorator>
                  <Swipeable
                    ref={ref => { if (ref) swipeableRefs.current[item.id] = ref; }}
                    renderRightActions={() => (
                      <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'stretch', 
                        backgroundColor: '#fff', 
                        borderRadius: 4, 
                        marginBottom: 8, 
                        padding: 0, 
                        justifyContent: 'space-between', 
                        width: 160, 
                        alignSelf: 'stretch'
                      }}>
                        {/* Botón Historial */}
                        <TouchableOpacity
                          style={{ 
                            backgroundColor: '#007AFF', 
                            borderTopLeftRadius: 4, 
                            borderBottomLeftRadius: 4, 
                            paddingHorizontal: 12, 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            flex: 1,
                            alignSelf: 'stretch',
                            shadowColor: '#000',
                            shadowOpacity: 0.06,
                            shadowRadius: 2,
                            elevation: 2,
                          }}
                          onPress={() => {
                            currentSwipeableRef.current = swipeableRefs.current[item.id];
                            setProductoHistorial(item);
                            setShowHistorialModal(true);
                          }}
                        >
                          <Ionicons name="time-outline" size={20} color="#fff" />
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginTop: 2 }}>Historial</Text>
                        </TouchableOpacity>

                        {/* Botón Marcar/Desmarcar */}
                        <TouchableOpacity
                          style={{ 
                            backgroundColor: seleccionado ? '#FF3B30' : '#34C759', 
                            borderTopRightRadius: 4, 
                            borderBottomRightRadius: 4, 
                            paddingHorizontal: 12, 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            flex: 1,
                            alignSelf: 'stretch',
                            shadowColor: '#000',
                            shadowOpacity: 0.06,
                            shadowRadius: 2,
                            elevation: 2,
                          }}
                          onPress={() => {
                            // Cerrar el swipe antes de ejecutar la acción
                            if (swipeableRefs.current[item.id]) {
                              swipeableRefs.current[item.id].close();
                            }
                            
                            if (seleccionado) {
                              // Desmarcar producto directamente
                              console.log('🔄 Swipe - Desmarcando producto:', item.nombre);
                              setUpdateAction('desmarcando');
                              setIsUpdating(true);
                              setProductoCalculando(item.id);
                              
                              setTimeout(() => {
                                setProductosSel(prev => prev.filter(p => p.id !== item.id));
                                setProductoCalculando(null);
                                setIsUpdating(false);
                                console.log('✅ Producto desmarcado via swipe:', item.nombre);
                              }, 1000);
                            } else {
                              // Marcar producto directamente
                              console.log('🔄 Swipe - Agregando producto:', item.nombre);
                              setUpdateAction('marcando');
                              setIsUpdating(true);
                              setProductoCalculando(item.id);
                              
                              setTimeout(() => {
                                const productoInfo = productos.find(p => p.id === item.id);
                                const cantidadDefault = productoInfo && productoInfo.stock !== undefined ? String(productoInfo.stock) : '1';
                                setProductosSel(prev => [...prev, { id: item.id, cantidad: cantidadDefault, unidad: item.unidad }]);
                                setProductoCalculando(null);
                                setIsUpdating(false);
                                console.log('✅ Producto agregado via swipe:', item.nombre);
                              }, 1500);
                            }
                          }}
                        >
                          <Ionicons 
                            name={seleccionado ? "remove-circle-outline" : "add-circle-outline"} 
                            size={20} 
                            color="#fff" 
                          />
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginTop: 2 }}>
                            {seleccionado ? 'Quitar' : 'Agregar'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    rightThreshold={40}
                  >
                  <TouchableOpacity
                      style={[
                        styles.card,
                        { minHeight: 'auto', marginBottom: 8 }, // Override del minHeight y asegurar marginBottom consistente
                        seleccionado && { borderColor: '#D7263D' },
                        !seleccionado && { paddingVertical: 12, backgroundColor: '#f0f0f0' },
                        esOtroProveedor && styles.cardOtroProveedor,
                        isActive && {
                          backgroundColor: '#f0f7ff',
                          borderColor: '#007AFF',
                          borderWidth: 2,
                          borderRadius: 6,
                          transform: [{ scale: 1.02 }]
                        },
                        isProductoFueraDeTemporada(item) && {
                          backgroundColor: '#fff3cd',
                          borderColor: '#ffc107',
                          borderWidth: 2
                        }
                      ]}
                      onPress={handlePress}
                      onLongPress={() => {
                        if (!soloLectura) {
                          setIsDraggingEnabled(true);
                          dragTimeout.current = setTimeout(() => {
                            drag();
                          }, 500);
                        }
                      }}
                      onPressOut={() => {
                        if (dragTimeout.current) {
                          clearTimeout(dragTimeout.current);
                        }
                        setIsDraggingEnabled(false);
                      }}
                      activeOpacity={0.85}
                  >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, flexGrow: 1 }}>
                            <Ionicons name="cube" size={15} color="#D7263D" style={{ marginRight: 4 }} />
                            <Text style={[styles.proveedor, { fontSize: 15, flex: 1 }, esOtroProveedor && { color: '#888' }]} numberOfLines={1} ellipsizeMode="tail">{item.nombre}</Text>
                          </View>
                          {esOtroProveedor && (
                            <Text style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>
                              Proveedor: {proveedores.find(p => p.id === item.proveedorId)?.nombre}
                            </Text>
                          )}
                          {isProductoFueraDeTemporada(item) && (
                            <View style={{ 
                              flexDirection: 'row', 
                              alignItems: 'center', 
                              marginTop: 4,
                              backgroundColor: '#fff3cd',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                              alignSelf: 'flex-start'
                            }}>
                              <Text style={{ fontSize: 10, color: '#856404', fontWeight: 'bold' }}>
                                🟡 Fuera de temporada
                              </Text>
                            </View>
                          )}
                          {(() => {
                            const productoSugerido = tipoSel === 'SUGERIDA' ? 
                              productosSugeridos.find(ps => ps.producto.id === item.id) : null;
                            return productoSugerido && (
                              <View style={{ 
                                flexDirection: 'row', 
                                alignItems: 'center', 
                                marginTop: 4,
                                backgroundColor: '#e8f5e8',
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 4,
                                alignSelf: 'flex-start'
                              }}>
                                <Text style={{ fontSize: 10, color: '#2e7d32', fontWeight: 'bold' }}>
                                  💡 Sugerido: {productoSugerido.cantidadSugerida} {productoSugerido.unidadSugerida}
                                </Text>
                              </View>
                            );
                          })()}
                        </View>
                      </View>
                      {seleccionado && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          {/* Cantidad y unidad: solo lectura o editable, con warning */}
                          {soloLectura ? (
                            <>
                            <Text style={styles.productoCantidadUnidad}>{seleccionado.cantidad} {seleccionado.unidad}</Text>
                            </>
                          ) : editingCantidad === item.id ? (
                            <>
                          <TextInput
                                style={[styles.productoCantidadUnidad, styles.cantidadInput]}
                            keyboardType="decimal-pad"
                                placeholder={seleccionado.cantidad}
                                value={cantidadTemp}
                                onChangeText={v => {
                                  // Permitir números y un punto decimal
                                  const newValue = v.replace(/[^0-9.]/g, '');
                                  // Asegurar que solo haya un punto decimal
                                  const parts = newValue.split('.');
                                  const finalValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : newValue;
                                  setCantidadTemp(finalValue);
                                }}
                                onBlur={() => {
                                  if (!cantidadTemp || isNaN(Number(cantidadTemp))) {
                                    setProductosSel(productosSel.map(p => p.id === item.id ? { ...p, cantidad: seleccionado.cantidad } : p));
                                  } else {
                                    setProductosSel(productosSel.map(p => p.id === item.id ? { ...p, cantidad: cantidadTemp } : p));
                                  }
                                  setEditingCantidad(null);
                                  setCantidadTemp('');
                                }}
                            autoFocus
                            maxLength={5}
                          />
                              <Text style={[styles.productoCantidadUnidad, { marginLeft: 8 }]}>{seleccionado.unidad}</Text>
                            </>
                        ) : (
                          <TouchableOpacity 
                              onPress={() => {
                                setCantidadTemp('');
                                setEditingCantidad(item.id);
                              }}
                              onLongPress={() => {
                                setProductoUnidadEdit(item.id);
                                setShowUnidadModal(true);
                              }}
                          >
                              <Text style={styles.productoCantidadUnidad}>{seleccionado.cantidad} {seleccionado.unidad}</Text>
                          </TouchableOpacity>
                        )}
                          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {cantidadUltimaCompra !== null && (
                              <Text style={{ fontSize: 12, color: '#888' }}>Última: {cantidadUltimaCompra}</Text>
                            )}
                            {comprasProducto.length > 1 && (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {cantidadActual !== null && cantidadActual > (cantidadPromedio ?? 0) && <Ionicons name="arrow-up" size={13} color="#34C759" style={{ marginRight: 2 }} />}
                                {cantidadActual !== null && cantidadActual < (cantidadPromedio ?? 0) && <Ionicons name="arrow-down" size={13} color="#D7263D" style={{ marginRight: 2 }} />}
                                {cantidadActual !== null && cantidadActual === (cantidadPromedio ?? 0) && <Ionicons name="remove" size={13} color="#888" style={{ marginRight: 2 }} />}
                                <Text style={{ fontSize: 12, color: cantidadActual !== null && cantidadActual > (cantidadPromedio ?? 0) ? '#34C759' : cantidadActual !== null && cantidadActual < (cantidadPromedio ?? 0) ? '#D7263D' : '#888' }}>
                                  {cantidadActual !== null && cantidadActual > (cantidadPromedio ?? 0) ? '↑' : cantidadActual !== null && cantidadActual < (cantidadPromedio ?? 0) ? '↓' : '→'}
                                </Text>
                              </View>
                            )}
                          </View>
                      </View>
                    )}
                      {/* Mostrar mensaje de advertencia si fuera de tendencia */}
                      {mostrarWarning && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <Ionicons name="warning" size={13} color="#FFD600" style={{ marginRight: 4 }} />
                          <Text style={{ color: '#FFD600', fontSize: 11, fontWeight: 'bold' }}>
                            Esperando aprox.: {cantidadPromedio ?? '-'} {seleccionado?.unidad} para un ciclo de {cicloPromedio ?? '-'} días.
                          </Text>
                        </View>
                      )}
                  </TouchableOpacity>
                  </Swipeable>
                  </ScaleDecorator>
                );
              }}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 320 }}
            />
          </View>
        </TouchableWithoutFeedback>
    );
  }
    return null;
  };

  // Guardar o actualizar orden
  const handleSaveOrden = async () => {
    console.log('Iniciando handleSaveOrden');
    if (!proveedorSel) {
      console.log('No hay proveedor seleccionado');
      setToast({ message: 'Selecciona un proveedor.', type: 'error' });
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => setToast(null), 2500);
      return;
    }
    if (!tipoSel) {
      console.log('No hay tipo seleccionado');
      setToast({ message: 'Selecciona un tipo de orden.', type: 'error' });
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => setToast(null), 2500);
      return;
    }
    if (productosSel.length === 0) {
      console.log('No hay productos seleccionados');
      setToast({ message: 'Selecciona al menos un producto.', type: 'error' });
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => setToast(null), 2500);
      return;
    }
    console.log('Obteniendo responsable');
    const responsable = await getResponsableOrAlert();
    if (!responsable) {
      console.log('No se pudo obtener el responsable');
      return;
    }
    console.log('Preparando datos de la orden');
    const ordenData: Omit<Orden, 'id'> = {
      proveedorId: proveedorSel.id,
      proveedorNombre: proveedorSel.nombre,
      fecha: fechaOrden || obtenerFechaActual(),
      tipo: tipoSel as any,
      estado: 'PENDIENTE',
      productos: productosSel.map(p => {
        const productoInfo = productos.find(prod => prod.id === p.id);
        return {
          id: p.id,
          nombre: productoInfo?.nombre || 'Producto desconocido',
          cantidad: parseFloat(p.cantidad) || 0,
          unidad: p.unidad,
          precio: productoInfo?.precio || 0,
          subtotal: (parseFloat(p.cantidad) || 0) * (productoInfo?.precio || 0)
        };
      }),
      total: productosSel.reduce((sum, p) => {
        const productoInfo = productos.find(prod => prod.id === p.id);
        return sum + ((parseFloat(p.cantidad) || 0) * (productoInfo?.precio || 0));
      }, 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    console.log('Datos de la orden preparados:', ordenData);
    console.log('🔍 Fecha de la orden:', {
      editOrden: !!editOrden,
      fechaOrden,
      fechaFinal: ordenData.fecha,
      fechaActual: obtenerFechaActual(),
      esActualizacion: !!editOrden
    });
    try {
      let ordenId: string;
      let tipoEvento: string;
      if (editOrden) {
        console.log('Actualizando orden existente');
        
        // Mostrar indicador si es una orden de cliente
        if (proveedorSel?.tipo === 'Cliente') {
          setCreandoOrdenesProduccion(true);
        }
        
        await updateOrden(editOrden.id, { ...ordenData, id: editOrden.id });
        ordenId = editOrden.id;
        tipoEvento = 'actualizacion_orden';
        
        // Ocultar indicador después de completar
        if (proveedorSel?.tipo === 'Cliente') {
          setTimeout(() => {
            setCreandoOrdenesProduccion(false);
          }, 1500);
        }
      } else {
        console.log('Creando nueva orden');
        
        // Mostrar indicador si es una orden de cliente
        if (proveedorSel?.tipo === 'Cliente') {
          setCreandoOrdenesProduccion(true);
        }
        
        const nuevaOrden = await saveOrden(ordenData);
        console.log('Nueva orden creada con ID:', nuevaOrden);
        ordenId = nuevaOrden;
        tipoEvento = 'creacion_orden';
        
        // Notificar si la orden es pendiente
        if (ordenData.estado === 'PENDIENTE') {
          console.log('Lanzando notificación push de orden pendiente...');
          const ordenCompleta = { ...ordenData, id: nuevaOrden };
          await notificarOrdenPendiente(ordenCompleta, proveedores);
        }
        
        // Ocultar indicador después de completar
        if (proveedorSel?.tipo === 'Cliente') {
          // Pequeño delay para que el usuario vea que se completó
          setTimeout(() => {
            setCreandoOrdenesProduccion(false);
          }, 1500);
        }
      }
      console.log('Cerrando wizard y limpiando estados');
      setWizardVisible(false);
      setEditOrden(null);
      setProveedorSel(null);
      setTipoSel(null);
      setProductosSel([]);
      setProductosDefaultDisponibles([]);
      setProductosSugeridos([]);
      setFechaOrden('');
      setEditandoFecha(false);
      setFechaInputText('');
      
      // Marcar que acabamos de crear/actualizar una orden para evitar recargas
      setJustCreatedOrder(true);
      console.log('🔒 Protegiendo filtros después de', editOrden ? 'actualizar' : 'crear', 'orden');
      
      // Resetear el flag después de un delay
      setTimeout(() => {
        console.log('🔒 Delay completado - Wizard cerrado completamente');
        setJustCreatedOrder(false);
      }, 500);
      
      // Agregar la nueva orden a la lista existente en lugar de recargar todo
      if (!editOrden) {
        // Es una nueva orden, agregarla al inicio de la lista solo si no existe ya
        const nuevaOrdenCompleta: Orden = {
          id: ordenId,
          ...ordenData
        };
        setOrdenes(prevOrdenes => {
          // Verificar si la orden ya existe para evitar duplicados
          const ordenExiste = prevOrdenes.some(orden => orden.id === ordenId);
          if (ordenExiste) {
            console.log('⚠️ Orden ya existe en la lista, no duplicando:', ordenId);
            return prevOrdenes;
          }
          console.log('✅ Nueva orden agregada a la lista:', {
            ordenId,
            totalOrdenes: prevOrdenes.length + 1
          });
          return [nuevaOrdenCompleta, ...prevOrdenes];
        });
      } else {
        // Es una edición, actualizar la orden existente en la lista
        setOrdenes(prevOrdenes => 
          prevOrdenes.map(orden => 
            orden.id === editOrden.id 
              ? { ...orden, ...ordenData, id: orden.id }
              : orden
          )
        );
        console.log('✅ Orden actualizada en la lista:', {
          ordenId: editOrden.id,
          totalOrdenes: ordenes.length
        });
      }
      
      // Resaltar la orden por 3 segundos
      setHighlightedOrdenId(ordenId);
      if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
      highlightTimeout.current = setTimeout(() => {
        setHighlightedOrdenId(null);
      }, 3000);

      // Registrar evento
      console.log('Registrando evento');
      await logEvento({ tipoEvento, responsable, idAfectado: ordenId, datosJSON: { ...ordenData, id: ordenId } });
      console.log('Proceso completado exitosamente');
      
      // Verificar que el filtro se mantiene después de guardar
      console.log('🔍 Estado del filtro después de guardar:', {
        filtroActual: filtro,
        proveedorFiltro,
        totalOrdenes: ordenes.length,
        wizardVisible: false,
        esActualizacion: !!editOrden
      });
      
      // Asegurar que no se recarguen los datos automáticamente
      setShouldReloadData(false);
    } catch (e) {
      console.error('Error al guardar la orden:', e);
      setToast({ message: 'No se pudo guardar la orden.', type: 'error' });
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => setToast(null), 2500);
      
      // Ocultar indicador de órdenes de producción en caso de error
      if (creandoOrdenesProduccion) {
        setCreandoOrdenesProduccion(false);
      }
    }
  };

  // Eliminar orden
  const handleDeleteOrden = async () => {
    if (!editOrden) return;
    const responsable = await getResponsableOrAlert();
    if (!responsable) return;
    try {
      await deleteOrden(editOrden.id);
      setToast({ message: 'Orden eliminada', type: 'success' });
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => setToast(null), 2500);
      // Remover la orden de la lista local
      setOrdenes(prevOrdenes => prevOrdenes.filter(orden => orden.id !== editOrden.id));
      
      setWizardVisible(false);
      setEditOrden(null);
      setProveedorSel(null);
      setTipoSel(null);
      setProductosSel([]);
      setProductosDefaultDisponibles([]);
      setProductosSugeridos([]);

      // Registrar evento
      await logEvento({ tipoEvento: 'eliminacion_orden', responsable, idAfectado: editOrden.id, datosJSON: editOrden });
    } catch (e) {
      setToast({ message: 'No se pudo eliminar la orden', type: 'error' });
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => setToast(null), 2500);
      }
    };

  // Cambiar estado de la orden
  const handleChangeEstado = async (nuevoEstado: string) => {
    if (!ordenEstadoEdit) return;
    try {
      await updateOrden(ordenEstadoEdit.id, { ...ordenEstadoEdit, estado: nuevoEstado });
      // Actualizar la orden en la lista local
      setOrdenes(prevOrdenes => 
        prevOrdenes.map(orden => 
          orden.id === ordenEstadoEdit.id 
            ? { ...orden, estado: nuevoEstado }
            : orden
        )
      );
    } catch (e) {
      console.error('Error al actualizar el estado:', e);
    }
    setShowEstadoModal(false);
    setOrdenEstadoEdit(null);
  };

  const renderFooter = () => {
    // Determinar si la orden debe estar en solo lectura
    let isFinalizada = false;
    if (editOrden) {
      const proveedor = proveedores.find(p => p.id === editOrden.proveedorId);
      const esProductor = proveedor?.tipo === 'Productor';
      const estadoNormalizado = editOrden.estado?.trim().toUpperCase();
      
      // Solo COMPLETADA y RECHAZADA están finalizadas para todos
      // ENVIADA / IMPRESA solo está finalizada si NO es productor
      if (estadoNormalizado === 'COMPLETADA' || estadoNormalizado === 'RECHAZADA') {
        isFinalizada = true;
      } else if (estadoNormalizado === 'ENVIADA / IMPRESA' && !esProductor) {
        isFinalizada = true;
      }
      
      console.log('🔍 RENDER FOOTER - Lógica de finalización:', {
        ordenId: editOrden.id,
        estadoOriginal: editOrden.estado,
        estadoNormalizado,
        proveedorNombre: proveedor?.nombre,
        proveedorTipo: proveedor?.tipo,
        esProductor,
        isFinalizada,
        deberiaSerEditable: !isFinalizada
      });
    }
    if (isFinalizada) {
      return (
        <View style={styles.wizardFooterRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {/* Solo mostrar botón cancelar si NO está en modo solo lectura */}
            {!soloLectura && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSecondary]}
                onPress={() => {
                  Alert.alert(
                    'Cancelar',
                    '¿Estás seguro de que deseas cancelar?',
                    [
                      { text: 'No', style: 'cancel' },
                      { text: 'Sí', onPress: closeWizard }
                    ]
                  );
                }}
              >
                <Ionicons name="close" size={24} color="#D7263D" />
              </TouchableOpacity>
            )}
            {editOrden && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSecondary]}
                onPress={() => {
                  if (editOrden) {
                    setProveedorSel(proveedores.find(p => p.id === editOrden.proveedorId) || null);
                  }
                  setShowActionsModal(true);
                }}
              >
                <Ionicons name="ellipsis-horizontal" size={24} color="#D7263D" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={closeWizard}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="checkmark" size={20} color="#fff" style={styles.actionButtonIcon} />
              <Text style={styles.actionButtonText}>Cerrar ({productosSel.length})</Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.wizardFooterRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => {
              Alert.alert(
                'Cancelar',
                '¿Estás seguro de que deseas cancelar?',
                [
                  { text: 'No', style: 'cancel' },
                  { text: 'Sí', onPress: closeWizard }
                ]
              );
            }}
          >
            <Ionicons name="close" size={24} color="#D7263D" />
          </TouchableOpacity>
          {editOrden && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={() => {
                if (editOrden) {
                  setProveedorSel(proveedores.find(p => p.id === editOrden.proveedorId) || null);
                }
                setShowActionsModal(true);
              }}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color="#D7263D" />
            </TouchableOpacity>
          )}
        </View>
        {(() => {
          const deberiaMostrarBoton = !soloLectura;
          console.log('🔍 BOTONERA - Estado actual:', {
            soloLectura,
            tipoSoloLectura: typeof soloLectura,
            editOrden: !!editOrden,
            productosSelLength: productosSel.length,
            mostrarBotonActualizar: deberiaMostrarBoton,
            estadoOrden: editOrden?.estado,
            valorExacto: soloLectura
          });
          return deberiaMostrarBoton;
        })() && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary, productosSel.length === 0 && { backgroundColor: '#ccc' }]}
            disabled={productosSel.length === 0}
            onPress={handleSaveOrden}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons 
                name={editOrden ? "save" : "create"} 
                size={20} 
                color="#fff" 
                style={styles.actionButtonIcon} 
              />
              <Text style={[styles.actionButtonText, { textAlign: 'center' }]}> 
                {editOrden ? `Actualizar (${productosSel.length})` : `Crear (${productosSel.length})`}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Función para limpiar estados de modales
  const limpiarEstadosModales = () => {
    setShowActionsModal(false);
    setShowEstadoModal(false);
    setShowUnidadModal(false);
    setShowAddProductoModal(false);
    setShowTestModal(false);
    setOrdenEstadoEdit(null);
    setProductoUnidadEdit(null);
    setBusquedaProducto('');
  };

  // Función para manejar el cierre de modales
  const handleCloseModal = (modalType: 'actions' | 'estado' | 'unidad' | 'addProducto') => {
    switch (modalType) {
      case 'actions':
        setShowActionsModal(false);
        break;
      case 'estado':
        setShowEstadoModal(false);
        setOrdenEstadoEdit(null);
        break;
      case 'unidad':
        setShowUnidadModal(false);
        setProductoUnidadEdit(null);
        break;
      case 'addProducto':
        setShowAddProductoModal(false);
        setBusquedaProducto('');
        break;
    }
  };

  const handleProductoTap = (producto: Producto) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 600;
    
    // Verificar si el producto está seleccionado
    const isSelected = productosSel.some(p => p.id === producto.id);
    
    // Verificar si es doble tap usando useRef para acceso inmediato
    const lastTap = lastTapRef.current;
    const isDoubleTap = isSelected && lastTap && 
                      lastTap.id === producto.id && 
                      (now - lastTap.timestamp) < DOUBLE_TAP_DELAY;
    
    console.log('🔍 Tap en modal:', { 
      productId: producto.id,
      nombre: producto.nombre,
      isSelected,
      isDoubleTap,
      lastTap: lastTap,
      timeDiff: lastTap ? now - lastTap.timestamp : null,
      procesando: productoCalculando === producto.id
    });

    // Si está siendo procesado, ignorar
    if (productoCalculando === producto.id) {
      console.log('⚠️ Tap ignorado - producto procesándose');
      return;
    }

    if (isSelected) {
      if (isDoubleTap) {
        // DOBLE TAP: Desmarcar producto
        console.log('🔄 DOBLE TAP en modal - Desmarcando producto:', producto.nombre);
        setUpdateAction('desmarcando');
        setIsUpdating(true);
        setProductoCalculando(producto.id);
        lastTapRef.current = null;
        
        // Desmarcar inmediatamente
        setProductosSel(productosSel.filter(p => p.id !== producto.id));
        
        setTimeout(() => {
          setProductoCalculando(null);
          setIsUpdating(false);
          console.log('✅ Producto desmarcado en modal:', producto.nombre);
        }, 500);
      } else {
        // PRIMER TAP en producto seleccionado: Registrar para posible doble tap
        console.log('👆 Primer tap en producto seleccionado en modal - registrando para doble tap');
        lastTapRef.current = { id: producto.id, timestamp: now };
      }
    } else {
      // TAP en producto NO seleccionado: Agregar
      console.log('➕ Agregando producto en modal:', producto.nombre);
      setUpdateAction('marcando');
      setIsUpdating(true);
      setProductoCalculando(producto.id);
      
      // Agregar inmediatamente
      const productoInfo = productos.find(p => p.id === producto.id);
      const cantidadDefault = productoInfo && productoInfo.stock !== undefined ? String(productoInfo.stock) : '1';
      setProductosSel([...productosSel, { id: producto.id, cantidad: cantidadDefault, unidad: producto.unidad || 'UNIDAD' }]);
      
      // NO establecer lastTap aquí - eso interfiere con el doble tap posterior
      lastTapRef.current = null;
      
      setTimeout(() => {
        setProductoCalculando(null);
        setIsUpdating(false);
        console.log('✅ Producto agregado en modal:', producto.nombre);
      }, 500);
    }
  };

  const renderProducto = ({ item, drag, isActive }: { item: Producto, drag?: any, isActive?: boolean }) => {
    const seleccionado = productosSel.find(p => p.id === item.id);
    const esOtroProveedor = item.proveedorId !== proveedorSel?.id;

    return (
      <Swipeable
        renderRightActions={() => (
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'stretch', 
            backgroundColor: '#fff', 
            borderRadius: 8, 
            marginBottom: 8, 
            padding: 0, 
            justifyContent: 'space-between', 
            width: 160, 
            alignSelf: 'stretch'
          }}>
            {/* Botón Historial */}
            <TouchableOpacity
              style={{ 
                backgroundColor: '#007AFF', 
                borderTopLeftRadius: 8, 
                borderBottomLeftRadius: 8, 
                paddingHorizontal: 16, 
                justifyContent: 'center', 
                alignItems: 'center', 
                flex: 1,
                alignSelf: 'stretch'
              }}
              onPress={() => {
                setProductoHistorial(item);
                setShowHistorialModal(true);
              }}
            >
              <Ionicons name="time-outline" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginTop: 2 }}>Historial</Text>
            </TouchableOpacity>

            {/* Botón Marcar/Desmarcar */}
            <TouchableOpacity
              style={{ 
                backgroundColor: seleccionado ? '#FF3B30' : '#34C759', 
                borderTopRightRadius: 8, 
                borderBottomRightRadius: 8, 
                paddingHorizontal: 16, 
                justifyContent: 'center', 
                alignItems: 'center', 
                flex: 1,
                alignSelf: 'stretch'
              }}
              onPress={() => handleProductoTap(item)}
            >
              <Ionicons 
                name={seleccionado ? "remove-circle-outline" : "add-circle-outline"} 
                size={20} 
                color="#fff" 
              />
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginTop: 2 }}>
                {seleccionado ? 'Quitar' : 'Agregar'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        rightThreshold={40}
      >
        <TouchableOpacity
          style={[
            styles.productoItemModal,
            seleccionado && { backgroundColor: '#D7263D' },
            esOtroProveedor && styles.cardOtroProveedor
          ]}
          onPress={() => handleProductoTap(item)}
          onLongPress={drag}
          disabled={isActive}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.productoNombreModal, seleccionado && { color: '#fff' }]}>{item.nombre}</Text>
            <Text style={[styles.productoProveedorModal, seleccionado && { color: '#fff' }]}>
              {proveedores.find(p => p.id === item.proveedorId)?.nombre}
            </Text>
          </View>
          {productoCalculando === item.id ? (
            <ActivityIndicator size="small" color="#D7263D" />
          ) : (
            <Ionicons 
              name="add-circle-outline" 
              size={22} 
              color={seleccionado ? '#fff' : '#D7263D'} 
            />
          )}
        </TouchableOpacity>
      </Swipeable>
    );
  };

  useEffect(() => {
    // Utilidad para saber si una orden es de hoy
    function esDeHoy(fechaStr: string): boolean {
      if (!fechaStr) return false;
      const hoy = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const hoyStr = `${pad(hoy.getDate())}-${pad(hoy.getMonth() + 1)}-${hoy.getFullYear()}`;
      // Soporta dd-mm-yyyy y yyyy-mm-dd
      if (/^\d{2}-\d{2}-\d{4}/.test(fechaStr)) {
        return fechaStr.startsWith(hoyStr);
      } else if (/^\d{4}-\d{2}-\d{2}/.test(fechaStr)) {
        const [y, m, d] = fechaStr.split(/[-T ]/);
        return `${d}-${m}-${y}` === hoyStr;
      }
      return false;
    }

    // Verifica si hay órdenes PENDIENTE para hoy
    const hayPendientes = ordenes.some(o => o.estado === 'PENDIENTE' && esDeHoy(o.fecha));
    
    // Debug: Mostrar información sobre órdenes pendientes
    const ordenesPendientesHoy = ordenes.filter(o => o.estado === 'PENDIENTE' && esDeHoy(o.fecha));
    console.log('🔍 Debug notificaciones:');
    console.log(`📊 Total órdenes: ${ordenes.length}`);
    console.log(`⏳ Órdenes pendientes hoy: ${ordenesPendientesHoy.length}`);
    console.log(`📋 Órdenes pendientes:`, ordenesPendientesHoy.map(o => ({ id: o.id, nombre: o.nombre, fecha: o.fecha, estado: o.estado })));
    console.log(`🔔 Hay pendientes: ${hayPendientes}`);

    async function programarNotificacionesOrdenesPendientes() {
      try {
        // Cancela notificaciones previas de órdenes
        const notificacionesProgramadas = await Notifications.getAllScheduledNotificationsAsync();
        const notificacionesOrdenes = notificacionesProgramadas.filter(n => 
          n.content.data?.type === 'orden_pendiente_programada' || 
          n.content.data?.type === 'orden_pendiente_manana'
        );
        
        for (const notif of notificacionesOrdenes) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
        
        console.log(`🧹 ${notificacionesOrdenes.length} notificaciones de órdenes anteriores canceladas`);
        
        if (!hayPendientes) {
          console.log('📱 No hay órdenes pendientes, no se programarán notificaciones');
          return;
        }

        console.log('📱 Programando notificaciones cada 30 minutos para órdenes pendientes...');
        
        const now = new Date();
        const hoy = now.toISOString().slice(0, 10); // yyyy-mm-dd
        
        // Determinar el mensaje de la notificación
        let tituloNotificacion = '';
        let cuerpoNotificacion = '';
        
        if (ordenesPendientesHoy.length === 1) {
          // Si hay solo una orden pendiente, mostrar el proveedor
          const ordenPendiente = ordenesPendientesHoy[0];
          const proveedor = proveedores.find(p => p.id === ordenPendiente.proveedorId);
          const nombreProveedor = proveedor?.nombre || 'Proveedor desconocido';
          
          tituloNotificacion = '¡Tienes una orden pendiente!';
          cuerpoNotificacion = `Orden pendiente de: ${nombreProveedor}`;
        } else {
          // Si hay múltiples órdenes, mostrar la cantidad
          tituloNotificacion = '¡Tienes órdenes pendientes!';
          cuerpoNotificacion = `${ordenesPendientesHoy.length} órdenes pendientes de hoy`;
        }
        
        // Programar notificaciones cada 4 horas de 8:00 AM a 8:00 PM (menos frecuente)
        for (let hora = 8; hora <= 20; hora += 4) {
          const fecha = new Date(`${hoy}T${hora.toString().padStart(2, '0')}:00:00`);
          
          // Solo programar si la fecha es futura
          if (fecha > now) {
            // Usar NotificationManager para control de duplicados
            const NotificationManager = (await import('../../services/notificationManager')).default;
            const notificationManager = NotificationManager.getInstance();
            
            // Crear un ID único para esta notificación programada
            const notificationId = `orden_programada_${hora}_${hoy}`;
            
            // Usar la función centralizada del NotificationManager
            const scheduled = await notificationManager.scheduleNotification(
              tituloNotificacion,
              cuerpoNotificacion,
              'orden_pendiente_programada',
              notificationId,
              { date: fecha },
              { 
                cantidad: ordenesPendientesHoy.length,
                timestamp: fecha.toISOString()
              },
              30000
            );
            
            if (scheduled) {
              console.log(`📱 Notificación programada para: ${fecha.toLocaleString()} - ${cuerpoNotificacion}`);
            } else {
              console.log(`🚫 Notificación de orden ya programada para las ${hora}:00, evitando duplicado`);
            }
          }
        }
        
        // Programar notificación para mañana temprano si hay órdenes pendientes
        const manana = new Date(now);
        manana.setDate(manana.getDate() + 1);
        manana.setHours(8, 0, 0, 0);
        
        // Usar NotificationManager para control de duplicados
        const NotificationManager = (await import('../../services/notificationManager')).default;
        const notificationManager = NotificationManager.getInstance();
        
        const mananaNotificationId = `orden_manana_${manana.toISOString().split('T')[0]}`;
        
        const mananaScheduled = await notificationManager.scheduleNotification(
          '📦 Recordatorio de órdenes pendientes',
          `Tienes ${ordenesPendientesHoy.length} orden${ordenesPendientesHoy.length > 1 ? 'es' : ''} pendiente${ordenesPendientesHoy.length > 1 ? 's' : ''} para hoy`,
          'orden_pendiente_manana',
          mananaNotificationId,
          { date: manana },
          { 
            cantidad: ordenesPendientesHoy.length,
            timestamp: manana.toISOString()
          },
          30000
        );
        
        if (mananaScheduled) {
          console.log(`📱 Notificación de recordatorio de órdenes programada para mañana: ${manana.toLocaleString()}`);
        } else {
          console.log(`🚫 Notificación de órdenes de mañana ya programada, evitando duplicado`);
        }
        
        console.log('✅ Notificaciones programadas exitosamente');
      } catch (error) {
        console.error('❌ Error programando notificaciones:', error);
      }
    }

    programarNotificacionesOrdenesPendientes();
  }, [ordenes]);

  // useEffect para configurar notificaciones en tiempo real
  useEffect(() => {
    if (!userData) return;

    console.log('🔔 Configurando notificaciones en tiempo real para órdenes...');

    // Función para manejar notificaciones de órdenes en tiempo real
    const handleOrdenNotification = async (orden: Orden) => {
      try {
        const nombreProveedor = await getProveedorNombre(orden.proveedorId);
        
        // Importar el NotificationManager dinámicamente
        const NotificationManager = (await import('../../services/notificationManager')).default;
        const notificationManager = NotificationManager.getInstance();
        
        // Usar el NotificationManager para enviar notificación con control de duplicados
        await notificationManager.sendLocalNotification(
          '🔔 Nueva orden pendiente',
          `Orden creada para: ${nombreProveedor}`,
          'nueva_orden_realtime',
          orden.id,
          { 
            type: 'orden_pendiente_realtime',
            ordenId: orden.id,
            proveedorId: orden.proveedorId,
            timestamp: new Date().toISOString()
          },
          30000 // Cooldown de 30 segundos
        );
        
        console.log(`✅ Notificación en tiempo real procesada para orden: ${orden.id}`);
      } catch (error) {
        console.error('❌ Error enviando notificación en tiempo real:', error);
      }
    };

    // Función para manejar notificaciones de tareas en tiempo real
    const handleTareaNotification = async (tarea: any) => {
      try {
        // Importar el NotificationManager dinámicamente
        const NotificationManager = (await import('../../services/notificationManager')).default;
        const notificationManager = NotificationManager.getInstance();
        
        // Usar el NotificationManager para enviar notificación con control de duplicados
        await notificationManager.sendLocalNotification(
          '🔔 Nueva tarea asignada',
          `Tarea: ${tarea.titulo}`,
          'nueva_tarea_realtime',
          tarea.id,
          { 
            type: 'tarea_pendiente_realtime',
            tareaId: tarea.id,
            timestamp: new Date().toISOString()
          },
          30000 // Cooldown de 30 segundos
        );
        
        console.log(`✅ Notificación en tiempo real procesada para tarea: ${tarea.id}`);
      } catch (error) {
        console.error('❌ Error enviando notificación en tiempo real de tarea:', error);
      }
    };

    // Configurar listeners de Firebase
    const cleanup = setupRealtimeNotifications(
      userData,
      handleOrdenNotification,
      handleTareaNotification
    );

    // Limpiar listeners al desmontar el componente
    return cleanup;
  }, [userData]);

  return (
    <>
      {/* Indicador de progreso global */}
      {isUpdating && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 20,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}>
            <ActivityIndicator size="large" color="#D7263D" />
            <Text style={{
              marginTop: 12,
              fontSize: 16,
              fontWeight: 'bold',
              color: '#333',
            }}>
{updateAction === 'marcando' ? 'Marcando Producto...' : 'Desmarcando Producto...'}
            </Text>
          </View>
        </View>
      )}

      {/* Modal de prueba completamente aislado */}
        <Modal
        visible={showTestModal}
          transparent
          animationType="fade"
          onRequestClose={limpiarEstadosModales}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.18)' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 30, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, color: '#D7263D', fontWeight: 'bold', marginBottom: 18 }}>Modal de prueba funcionando</Text>
            <TouchableOpacity onPress={limpiarEstadosModales} style={{ marginTop: 10, backgroundColor: '#D7263D', borderRadius: 8, padding: 10 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Indicador de creación de órdenes de producción */}
      {creandoOrdenesProduccion && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9998,
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 20,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}>
            <ActivityIndicator size="large" color="#D7263D" />
            <Text style={{
              marginTop: 12,
              fontSize: 16,
              fontWeight: 'bold',
              color: '#333',
            }}>
              Creando órdenes de producción...
            </Text>
            <Text style={{
              marginTop: 8,
              fontSize: 14,
              color: '#666',
              textAlign: 'center',
            }}>
              Generando órdenes automáticas para productores
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.safeArea}>
        {wizardVisible ? (
          <View style={styles.wizardContainer}>
            {renderWizard()}
            {renderFooter()}
          </View>
        ) : (
          <>
            <Header title={`Órdenes (${ordenesFiltradas.length})`} onAdd={() => openWizard()} />
            <View style={styles.container}>
              {/* Filtros como segmented control */}
              <View style={styles.segmentedContainer}>
                {[
                  { key: 'ultimas', label: 'Últimas' },
                  { key: 'hoy', label: 'Hoy' },
                  // Solo mostrar filtro de proveedor si el usuario es ADMIN
                  ...(userData?.role === 'ADMIN' ? [{ key: 'proveedor', label: 'Proveedor' }] : []),
                  { key: 'todas', label: 'Todas' },
                ].map(f => (
                <TouchableOpacity
                    key={f.key}
                    style={[styles.segmentedBtn, filtro === f.key && styles.segmentedBtnActive,
                      f.key === 'ultimas' && styles.segmentedBtnLeft,
                      f.key === 'todas' && styles.segmentedBtnRight]}
                    onPress={() => setFiltro(f.key as any)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segmentedBtnText, filtro === f.key && styles.segmentedBtnTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Importe total de hoy */}
            {filtro === 'hoy' && ordenesFiltradas.length > 0 && (
              <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#D7263D' }}>
                  Importe total de hoy: ${ordenesFiltradas.reduce((acc, item) => {
                    return acc + ((item.productos || []).reduce((acc2, prod) => {
                      const productoInfo = productos.find(p => p.id === prod.productoId);
                      if (productoInfo && productoInfo.precio !== undefined && !isNaN(Number(prod.cantidad))) {
                        return acc2 + (Number(prod.cantidad) * Number(productoInfo.precio));
                      }
                      return acc2;
                    }, 0));
                  }, 0).toFixed(2)}
                </Text>
              </View>
            )}
              {/* Dropdown de proveedor si filtro es proveedor */}
              {filtro === 'proveedor' && (
                <View style={styles.dropdownRow}>
                  <Ionicons name="person" size={20} color="#D7263D" style={{ marginRight: 8 }} />
                  <View style={styles.dropdownPickerWrapper}>
                    <Picker
                      selectedValue={proveedorFiltro}
                      onValueChange={setProveedorFiltro}
                      style={styles.dropdownPicker}
                      mode={Platform.OS === 'ios' ? 'dropdown' : 'dialog'}
                    >
                      <Picker.Item label="Seleccione proveedor..." value="" />
                      {proveedores.map(p => (
                        <Picker.Item key={p.id} label={p.nombre} value={p.id} />
                      ))}
                    </Picker>
          </View>
                </View>
              )}
              {loading ? (
                <ActivityIndicator size="large" color="#D7263D" style={{ marginTop: 40 }} />
              ) : ordenesFiltradas.length === 0 ? (
                <Text style={styles.emptyText}>No hay órdenes para mostrar.</Text>
              ) : (
                <FlatList
                  data={ordenesFiltradas}
                  keyExtractor={item => item.id}
                  renderItem={renderOrden}
                  contentContainerStyle={{ paddingBottom: 80 }}
                />
                )}
              </View>
            </>
          )}

        {/* Overlay absoluto para acciones */}
        {showActionsModal && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
            zIndex: 9999
          }}>
            <View style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 20,
              paddingBottom: 40,
              paddingHorizontal: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 5
            }}>
              {(!proveedorSel || !editOrden) ? (
                <Text style={{ textAlign: 'center', color: '#888' }}>Cargando...</Text>
              ) : (
                <>
                  <View style={{ alignItems: 'center', marginBottom: 25 }}>
                    <View style={{ width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, marginBottom: 20 }} />
                    <Text style={{ fontSize: 18, fontWeight: '600', color: '#333' }}>Acciones de la Orden</Text>
                  </View>

                  {/* Sección WhatsApp mejorada */}
                  <>
                    {editingCelular ? (
                      /* Input inline para editar celular */
                      <View style={{
                        backgroundColor: '#f8f8f8',
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 12,
                        borderWidth: 2,
                        borderColor: '#25D366'
                      }}>
                        {/* Primera línea: Icono + Input */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                          <View style={{ 
                            width: 44, 
                            height: 44, 
                            borderRadius: 22, 
                            backgroundColor: '#25D366', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            marginRight: 12 
                          }}>
                            <Ionicons name="logo-whatsapp" size={26} color="#fff" />
                          </View>
                          
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{
                              backgroundColor: '#e0e0e0',
                              borderTopLeftRadius: 8,
                              borderBottomLeftRadius: 8,
                              paddingHorizontal: 12,
                              height: 44,
                              justifyContent: 'center',
                              borderWidth: 1,
                              borderColor: '#ddd',
                              borderRightWidth: 0
                            }}>
                              <Text style={{ color: '#666', fontSize: 15, fontWeight: '600' }}>+598</Text>
                            </View>
                            <TextInput
                              style={{
                                flex: 1,
                                borderWidth: 1,
                                borderColor: '#ddd',
                                borderTopLeftRadius: 0,
                                borderBottomLeftRadius: 0,
                                borderTopRightRadius: 8,
                                borderBottomRightRadius: 8,
                                paddingHorizontal: 12,
                                fontSize: 15,
                                backgroundColor: '#fff',
                                height: 44
                              }}
                              placeholder="98765432"
                              value={tempCelular}
                              onChangeText={(text) => {
                                const cleanText = text.replace(/[^0-9]/g, '').slice(0, 8);
                                setTempCelular(cleanText);
                              }}
                              keyboardType="numeric"
                              maxLength={8}
                              autoFocus
                            />
                          </View>
                        </View>

                        {/* Segunda línea: Botones */}
                        <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
                          {/* Botón Cancelar */}
                          <TouchableOpacity
                            style={{
                              backgroundColor: '#f0f0f0',
                              borderRadius: 8,
                              paddingHorizontal: 20,
                              paddingVertical: 10,
                              minWidth: 80,
                              alignItems: 'center'
                            }}
                            onPress={() => {
                              setEditingCelular(false);
                              setTempCelular('');
                            }}
                          >
                            <Text style={{ color: '#666', fontSize: 14, fontWeight: '600' }}>Cancelar</Text>
                          </TouchableOpacity>

                          {/* Botón Guardar */}
                          <TouchableOpacity
                            style={{
                              backgroundColor: tempCelular.length >= 8 ? '#25D366' : '#e0e0e0',
                              borderRadius: 8,
                              paddingHorizontal: 20,
                              paddingVertical: 10,
                              minWidth: 80,
                              alignItems: 'center',
                              opacity: tempCelular.length >= 8 ? 1 : 0.6
                            }}
                            disabled={tempCelular.length < 8}
                            onPress={() => {
                              if (tempCelular.length >= 8) {
                                const updatedProveedor = { ...proveedorSel, celular: '+598' + tempCelular };
                                setProveedorSel(updatedProveedor);
                                setEditingCelular(false);
                                setTempCelular('');
                              } else {
                                Alert.alert('Error', 'El número debe tener al menos 8 dígitos');
                              }
                            }}
                          >
                            <Text style={{ 
                              color: tempCelular.length >= 8 ? '#fff' : '#999', 
                              fontSize: 14, 
                              fontWeight: '600' 
                            }}>
                              Guardar
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      /* Botón WhatsApp normal */
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: proveedorSel.celular && proveedorSel.celular.toString().trim().length > 0 ? '#25D366' : '#e0e0e0',
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 12,
                          opacity: proveedorSel.celular && proveedorSel.celular.toString().trim().length > 0 ? 1 : 0.6
                        }}
                        activeOpacity={0.7}
                        onPress={async () => {
                          // Validar celular
                          if (!proveedorSel.celular || proveedorSel.celular.toString().trim().length === 0) {
                            Alert.alert(
                              'Sin número de celular', 
                              'Este proveedor no tiene celular registrado. Mantén presionado este botón para agregar uno.',
                              [{ text: 'OK' }]
                            );
                            return;
                          }

                          const responsable = await getResponsableOrAlert();
                          if (!responsable) return;
                          
                          setShowActionsModal(false);
                          
                          try {
                            // Construir mensaje mejorado para WhatsApp
                            const msg = buildWhatsappMessage(editOrden!, proveedorSel, productos, usuario);
                            const phone = proveedorSel.celular.toString().replace(/[^\d]/g, '');
                            
                            // Validar que el número tenga el formato correcto
                            if (phone.length < 8) {
                              Alert.alert('Error', 'El número de celular debe tener al menos 8 dígitos');
                              return;
                            }
                            
                            const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
                            await Linking.openURL(url);
                            
                            // Log del evento
                            await logEvento({ 
                              tipoEvento: 'ENVIO_WHATSAPP', 
                              responsable, 
                              idAfectado: editOrden!.id, 
                              datosJSON: { 
                                mensaje: msg, 
                                proveedor: proveedorSel, 
                                productos: productos, 
                                usuario,
                                celular: phone 
                              }, 
                            });
                            
                            // Actualizar estado de la orden
                            if (editOrden!.estado !== 'ENVIADA / IMPRESA') {
                              const nuevaOrden = { ...editOrden!, estado: 'ENVIADA / IMPRESA' };
                              await updateOrden(editOrden!.id, nuevaOrden);
                              // Actualizar la orden en la lista local
                              setOrdenes(prevOrdenes => 
                                prevOrdenes.map(orden => 
                                  orden.id === editOrden!.id 
                                    ? { ...orden, estado: 'ENVIADA / IMPRESA' }
                                    : orden
                                )
                              );
                            }
                            
                            Alert.alert('Éxito', 'Orden enviada por WhatsApp correctamente');
                          } catch (error) {
                            console.error('Error al enviar WhatsApp:', error);
                            Alert.alert('Error', 'No se pudo abrir WhatsApp. Verifica que esté instalado.');
                          }
                        }}
                        onLongPress={() => {
                          // Activar edición inline del número
                          setTempCelular(proveedorSel.celular?.toString().replace('+598', '') || '');
                          setEditingCelular(true);
                        }}
                      >
                        <View style={{ 
                          width: 44, 
                          height: 44, 
                          borderRadius: 22, 
                          backgroundColor: proveedorSel.celular && proveedorSel.celular.toString().trim().length > 0 ? 'rgba(255,255,255,0.2)' : '#ccc', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          marginRight: 12 
                        }}>
                          <Ionicons name="logo-whatsapp" size={26} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ 
                            fontSize: 16, 
                            fontWeight: '600', 
                            color: proveedorSel.celular && proveedorSel.celular.toString().trim().length > 0 ? '#fff' : '#999', 
                            marginBottom: 2 
                          }}>
                            Enviar por WhatsApp
                          </Text>
                          <Text style={{ 
                            fontSize: 13, 
                            color: proveedorSel.celular && proveedorSel.celular.toString().trim().length > 0 ? 'rgba(255,255,255,0.8)' : '#999' 
                          }}>
                            {proveedorSel.celular && proveedorSel.celular.toString().trim().length > 0 
                              ? `Enviar a ${proveedorSel.celular}` 
                              : 'Mantén presionado para agregar celular'
                            }
                          </Text>
                        </View>
                        {proveedorSel.celular && proveedorSel.celular.toString().trim().length > 0 ? (
                          <View style={{ 
                            backgroundColor: 'rgba(255,255,255,0.2)', 
                            borderRadius: 12, 
                            paddingHorizontal: 8, 
                            paddingVertical: 4 
                          }}>
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '500' }}>ENVIAR</Text>
                          </View>
                        ) : (
                          <View style={{ 
                            backgroundColor: 'rgba(255,255,255,0.1)', 
                            borderRadius: 12, 
                            paddingHorizontal: 8, 
                            paddingVertical: 4 
                          }}>
                            <Text style={{ color: '#999', fontSize: 12, fontWeight: '500' }}>EDITAR</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )}

                    <View style={{ height: 1, backgroundColor: '#e0e0e0', marginBottom: 16 }} />
                  </>

                  {/* Botón Imprimir SIEMPRE visible */}
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#f8f8f8',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12
                    }}
                    activeOpacity={0.7}
                    onPress={async () => {
                      const responsable = await getResponsableOrAlert();
                      if (!responsable) return;
                      setShowActionsModal(false);
                      const msg = buildPrintReport(editOrden!, proveedorSel!, productos, usuario);
                      try {
                        await fetch(PRINT_SERVICE_URL, {
                          method: 'POST',
                          headers: { 'Content-Type': 'text/plain' },
                          body: msg,
                        });
                        Alert.alert('Impresión', 'Enviado a imprimir.');
                        await logEvento({ tipoEvento: 'IMPRESION_ORDEN', responsable, idAfectado: editOrden!.id, datosJSON: { mensaje: msg, proveedor: proveedorSel, productos, usuario } });
                      } catch (e) {
                        Alert.alert('Error', 'No se pudo enviar a imprimir.');
                      }
                    }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <MaterialCommunityIcons name="printer" size={24} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 2 }}>Imprimir Orden</Text>
                      <Text style={{ fontSize: 13, color: '#666' }}>Enviar a la impresora</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Botón Cancelar SIEMPRE visible */}
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 16,
                      marginTop: 8
                    }}
                    activeOpacity={0.7}
                    onPress={() => setShowActionsModal(false)}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#D7263D' }}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {/* Overlay absoluto para unidad */}
        {showUnidadModal && (
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center', zIndex: 9999
          }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 18, width: '85%', maxHeight: '85%' }}>
              {!productoUnidadEdit ? (
                <Text style={{ textAlign: 'center', color: '#888' }}>Cargando...</Text>
              ) : (
                <>
                  <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#D7263D', marginBottom: 12 }}>Selecciona la unidad</Text>
                  <ScrollView style={{ maxHeight: 400 }}>
                    {UNIDADES.map(unit => (
              <TouchableOpacity
                        key={unit}
                        style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                onPress={() => {
                          if (productoUnidadEdit) {
                            setProductosSel(productosSel.map(p =>
                              p.id === productoUnidadEdit ? { ...p, unidad: unit } : p
                            ));
                          }
                          setShowUnidadModal(false);
                }}
              >
                        <Text style={{ color: '#222', fontSize: 16 }}>{unit}</Text>
              </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity
                    style={{ marginTop: 18, padding: 10, backgroundColor: '#666', borderRadius: 5, alignItems: 'center' }}
                    onPress={() => setShowUnidadModal(false)}
                  >
                    <Text style={{ color: 'white' }}>Cancelar</Text>
                  </TouchableOpacity>
                </>
            )}
          </View>
        </View>
        )}

        {/* Overlay absoluto para agregar producto de otro proveedor */}
        {showAddProductoModal && (
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center', zIndex: 9999
          }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 18, width: '90%', maxHeight: '80%' }}>
              {!proveedorSel ? (
                <Text style={{ textAlign: 'center', color: '#888' }}>Cargando...</Text>
              ) : (
                <>
                  <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#D7263D', marginBottom: 12 }}>Agregar producto de otro proveedor</Text>
                  <View style={styles.modalSearchContainer}>
                    <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
                    <TextInput
                      style={styles.modalSearchInput}
                      placeholder="Buscar producto..."
                      value={busquedaProducto}
                      onChangeText={setBusquedaProducto}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {busquedaProducto.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setBusquedaProducto('')}
                        style={styles.clearButton}
                      >
                        <Ionicons name="close-circle" size={20} color="#888" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <FlatList
                    data={productos
                      .filter(p => p.proveedorId !== proveedorSel?.id && !p.archivado)
                      .filter(p => {
                        if (!busquedaProducto) return true;
                        const proveedor = proveedores.find(prov => prov.id === p.proveedorId);
                        const nombreMatch = containsSearchTerm(p.nombre, busquedaProducto);
                        const proveedorMatch = proveedor ? containsSearchTerm(proveedor.nombre, busquedaProducto) : false;
                        return nombreMatch || proveedorMatch;
                      })
                    }
                    keyExtractor={item => item.id}
                    renderItem={renderProducto}
                    style={{ marginTop: 12, maxHeight: 400 }}
                    contentContainerStyle={{ paddingBottom: 12 }}
                  />
                  <TouchableOpacity
                    style={{ marginTop: 18, padding: 10, backgroundColor: '#666', borderRadius: 5, alignItems: 'center' }}
                    onPress={() => setShowAddProductoModal(false)}
                  >
                    <Text style={{ color: 'white' }}>Cerrar</Text>
                  </TouchableOpacity>
                </>
              )}
          </View>
          </View>
        )}

        {/* Modal para editar fecha de la orden */}
        {editandoFecha && (
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center', zIndex: 9999
          }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 18, width: '90%', maxWidth: 400 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#D7263D', marginBottom: 16, textAlign: 'center' }}>
                Editar Fecha de la Orden
              </Text>
              
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>Fecha (dd/MM/yyyy HH:mm:ss):</Text>
                <TextInput
                  style={{ 
                    borderWidth: 1, 
                    borderColor: '#ddd', 
                    borderRadius: 8, 
                    padding: 12, 
                    fontSize: 16,
                    color: '#222',
                    backgroundColor: '#f9f9f9'
                  }}
                  value={fechaInputText}
                  onChangeText={(text) => {
                    setFechaInputText(text);
                    // Validar y convertir el formato dd/MM/yyyy HH:mm:ss a ISO
                    const regex = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/;
                    const match = text.match(regex);
                    if (match) {
                      const [, dia, mes, año, hora, minuto, segundo] = match;
                      const fecha = new Date(
                        parseInt(año),
                        parseInt(mes) - 1,
                        parseInt(dia),
                        parseInt(hora),
                        parseInt(minuto),
                        parseInt(segundo)
                      );
                      if (!isNaN(fecha.getTime())) {
                        setFechaOrden(fecha.toISOString());
                      }
                    }
                  }}
                  placeholder="dd/MM/yyyy HH:mm:ss"
                  placeholderTextColor="#aaa"
                  keyboardType="numeric"
                />
              </View>

              <View style={{ marginBottom: 20 }}>
                <TouchableOpacity
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    backgroundColor: '#D7263D', 
                    borderRadius: 8, 
                    alignItems: 'center'
                  }}
                  onPress={() => {
                    const nuevaFecha = obtenerFechaActual();
                    setFechaOrden(nuevaFecha);
                    setFechaInputText(formatearFecha(nuevaFecha));
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '500', fontSize: 16 }}>Fecha Ahora</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  style={{ 
                    flex: 1, 
                    padding: 12, 
                    backgroundColor: '#666', 
                    borderRadius: 8, 
                    alignItems: 'center',
                    marginRight: 8
                  }}
                  onPress={() => {
                    setEditandoFecha(false);
                    setFechaInputText('');
                    setFechaUpdateTrigger(0);
                  }}
                >
                  <Text style={{ color: 'white' }}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={{ 
                    flex: 1, 
                    padding: 12, 
                    backgroundColor: '#D7263D', 
                    borderRadius: 8, 
                    alignItems: 'center',
                    marginLeft: 8
                  }}
                  onPress={() => {
                    // Procesar la fecha del input antes de cerrar
                    const regex = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/;
                    const match = fechaInputText.match(regex);
                    if (match) {
                      const [, dia, mes, año, hora, minuto, segundo] = match;
                      // Convertir a formato dd-mm-yyyy HH:mm:ss para la BD
                      const nuevaFechaTexto = `${dia}-${mes}-${año} ${hora}:${minuto}:${segundo}`;
                      console.log('Actualizando fecha:', { fechaInputText, nuevaFechaTexto });
                      setFechaOrden(nuevaFechaTexto);
                      // Forzar re-render
                      setTimeout(() => {
                        setFechaUpdateTrigger(prev => prev + 1);
                      }, 100);
                    }
                    setEditandoFecha(false);
                    setFechaInputText('');
                  }}
                >
                  <Text style={{ color: 'white' }}>Aceptar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Toast temporal al final de la pantalla */}
        {toast && (
          <View style={styles.toastBottom} pointerEvents="none">
            <Text style={styles.toastBottomText}>{toast.message}</Text>
          </View>
        )}

        {/* Overlay absoluto para cambiar estado de la orden */}
        {showEstadoModal && (
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center', zIndex: 9999
          }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 18, width: '85%', maxHeight: '60%' }}>
              {!ordenEstadoEdit ? (
                <Text style={{ textAlign: 'center', color: '#888' }}>Cargando...</Text>
              ) : (
                <>
                  <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#D7263D', marginBottom: 12 }}>Cambiar estado de la orden</Text>
                  <ScrollView style={{ maxHeight: 200 }}>
                    {ESTADOS_ORDEN_ARRAY.map(estado => {
                      const estadoStyle = getEstadoStyle(estado) || {};
                      const colorTexto = (estadoStyle && (estadoStyle as any).backgroundColor) ? (estadoStyle as any).backgroundColor : '#222';
                      return (
                        <TouchableOpacity
                          key={estado}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee', gap: 10 }}
                          onPress={() => handleChangeEstado(estado)}
                        >
                          <View style={{ marginRight: 6 }}>{getEstadoIcon(estado)}</View>
                          <Text style={{ color: colorTexto, fontSize: 16, fontWeight: 'bold', flex: 1 }}>
                            {estado}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <TouchableOpacity
                    style={{ marginTop: 18, padding: 10, backgroundColor: '#666', borderRadius: 5, alignItems: 'center' }}
                    onPress={() => { setShowEstadoModal(false); setOrdenEstadoEdit(null); }}
                  >
                    <Text style={{ color: 'white' }}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}
      </View>
      {/* Overlay personalizado para historial de producto */}
      {showHistorialModal && productoHistorial && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 18, width: '90%', maxHeight: '80%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#D7263D', marginBottom: 12 }}>{productoHistorial.nombre}</Text>
            {(() => {
              const historial = ordenes
                .filter(o => Array.isArray(o.productos) && o.productos.some(p => p.productoId === productoHistorial.id))
                .sort((a, b) => parseFechaHistorial(b.fecha).getTime() - parseFechaHistorial(a.fecha).getTime());
              const cantidades = historial.map(o => {
                const prod = (o.productos || []).find(p => p.productoId === productoHistorial.id);
                return prod ? Number(prod.cantidad) : null;
              }).filter((n): n is number => n !== null && !isNaN(n));
              const cantidadPromedio = cantidades.length > 0 ? Math.round(cantidades.reduce((a, b) => a + b, 0) / cantidades.length) : '-';
              let ciclos: number[] = [];
              for (let i = 0; i < historial.length - 1; i++) {
                const d1 = parseFechaHistorial(historial[i].fecha);
                const d2 = parseFechaHistorial(historial[i + 1].fecha);
                const diff = Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
                if (isFinite(diff) && diff > 0) ciclos.push(Math.round(diff));
              }
              const cicloPromedio = ciclos.length > 0 ? Math.round(ciclos.reduce((a, b) => a + b, 0) / ciclos.length) : '-';
              return (
                <>
                  <View style={{
                    marginBottom: 14,
                    backgroundColor: '#F6F8FA',
                    borderRadius: 10,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 18,
                    shadowColor: '#000',
                    shadowOpacity: 0.03,
                    shadowRadius: 2,
                    elevation: 1,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="stats-chart-outline" size={18} color="#D7263D" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#888', fontSize: 13 }}>Promedio</Text>
                      <Text style={{ color: '#D7263D', fontWeight: 'bold', fontSize: 15, marginLeft: 2 }}>{cantidadPromedio}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 18 }}>
                      <Ionicons name="repeat-outline" size={18} color="#007AFF" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#888', fontSize: 13 }}>Ciclo</Text>
                      <Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 15, marginLeft: 2 }}>{cicloPromedio} días</Text>
                    </View>
                  </View>
                  <FlatList
                    data={historial}
                    keyExtractor={item => item.id}
                    renderItem={({ item, index }) => {
                      const prod = (item.productos || []).find(p => p.productoId === productoHistorial.id);
                      const proveedor = proveedores.find(p => p.id === item.proveedorId);
                      let cicloDias: number = 0;
                      if (index < historial.length - 1) {
                        const fechaActual = parseFechaHistorial(item.fecha);
                        const ordenSiguiente = historial[index + 1];
                        if (ordenSiguiente) {
                          const fechaSiguiente = parseFechaHistorial(ordenSiguiente.fecha);
                          const diff = Math.abs(fechaActual.getTime() - fechaSiguiente.getTime()) / (1000 * 60 * 60 * 24);
                          cicloDias = Math.round(diff);
                        }
                      }
                      return (
                        <View style={{
                          backgroundColor: '#fff',
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: '#eee',
                          padding: 12,
                          marginBottom: 10,
                          shadowColor: '#000',
                          shadowOpacity: 0.04,
                          shadowRadius: 2,
                          elevation: 1,
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="document-text-outline" size={20} color="#007AFF" style={{ marginRight: 10 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: '#222', fontSize: 14, fontWeight: 'bold' }}>{item.fecha}</Text>
                              <Text style={{ color: '#888', fontSize: 13 }}>{proveedor?.nombre}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={{ color: '#D7263D', fontWeight: 'bold', fontSize: 15, marginLeft: 10 }}>{prod?.cantidad} {prod?.unidad}</Text>
                              {cicloDias !== null && (
                                <Text style={{ color: '#aaa', fontSize: 11, marginTop: 2, fontStyle: 'italic' }}>{cicloDias} días</Text>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    }}
                    ListEmptyComponent={<Text style={{ color: '#888', fontStyle: 'italic', marginTop: 8 }}>No hay historial para este producto.</Text>}
                    style={{ maxHeight: 350 }}
                  />
                </>
              );
            })()}
            <TouchableOpacity
              style={{ marginTop: 18, padding: 10, backgroundColor: '#666', borderRadius: 5, alignItems: 'center' }}
              onPress={() => {
                setShowHistorialModal(false);
                if (currentSwipeableRef.current) {
                  currentSwipeableRef.current.close();
                  currentSwipeableRef.current = null;
                }
              }}
            >
              <Text style={{ color: 'white' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {procesandoOrden && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
          <ActivityIndicator size="large" color="#D7263D" />
          <Text style={{ marginTop: 12, color: '#D7263D', fontWeight: 'bold', fontSize: 16 }}>Actualizando Posición</Text>
        </View>
      )}
    </>
    );
  }

function getEstadoStyle(estado: string) {
  switch (estado) {
    case ESTADOS_ORDEN.PENDIENTE:
      return styles.estado_pendiente;
    case ESTADOS_ORDEN.COMPLETADA:
      return styles.estado_completada;
    case ESTADOS_ORDEN.RECHAZADA:
      return styles.estado_rechazada;
    case ESTADOS_ORDEN.ENVIADA_IMPRESA:
      return styles.estado_enviada_impresa;
    default:
      return {};
  }
}

function getEstadoIcon(estado: string) {
  switch (estado) {
    case ESTADOS_ORDEN.PENDIENTE:
      return <Ionicons name="time" size={18} color="#FFA500" style={{ marginRight: 6 }} />;
    case ESTADOS_ORDEN.COMPLETADA:
      return <Ionicons name="checkmark-circle" size={18} color="#34C759" style={{ marginRight: 6 }} />;
    case ESTADOS_ORDEN.RECHAZADA:
      return <Ionicons name="close-circle" size={18} color="#FF3B30" style={{ marginRight: 6 }} />;
    case ESTADOS_ORDEN.ENVIADA_IMPRESA:
      return <Ionicons name="print" size={18} color="#007AFF" style={{ marginRight: 6 }} />;
    default:
      return null;
  }
}

// Función robusta para parsear fechas en formatos dd-mm-yyyy y yyyy-mm-dd
function parseFechaHistorial(fecha: string) {
  if (/^\d{2}-\d{2}-\d{4}/.test(fecha)) {
    const [d, m, y] = fecha.split(/[-T ]/);
    return new Date(Number(y), Number(m) - 1, Number(d));
  } else if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) {
    const [y, m, d] = fecha.split(/[-T ]/);
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return new Date(fecha);
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.tint },
  header: {
    backgroundColor: Colors.tint,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    flexDirection: 'row',
    paddingHorizontal: 18,
  },
  headerText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  addBtn: {
    marginLeft: 12,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingTop: 2,
  },
  card: {
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  proveedor: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  cardPropText: {
    color: '#888',
    fontSize: 13,
    fontWeight: 'normal',
    marginBottom: 2,
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 4,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  estadoBadgeText: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#fff',
    textAlign: 'center',
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },
  fecha: {
    fontSize: 15,
    color: '#666',
    marginBottom: 2,
  },
  tipo: {
    fontSize: 15,
    color: '#333',
    marginBottom: 2,
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    marginBottom: 8,
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  segmentedBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedBtnLeft: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  segmentedBtnRight: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  segmentedBtnActive: {
    backgroundColor: '#D7263D',
  },
  segmentedBtnText: {
    color: '#D7263D',
    fontWeight: 'bold',
    fontSize: 15,
  },
  segmentedBtnTextActive: {
    color: '#fff',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    marginTop: 2,
    minHeight: 44,
  },
  dropdownPickerWrapper: {
    flex: 1,
  },
  dropdownPicker: {
    width: '100%',
    color: '#333',
    backgroundColor: 'transparent',
  },
  estadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  wizardContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 0,
    padding: 0,
    margin: 0,
    width: '100%',
    maxWidth: undefined,
    alignSelf: 'stretch',
    elevation: 0,
    paddingBottom: 0,
  },
  wizardStepsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingVertical: 10,
  },
  wizardStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wizardStepText: {
    color: '#888',
    fontWeight: 'bold',
    fontSize: 15,
    paddingHorizontal: 8,
  },
  wizardStepTextActive: {
    color: '#D7263D',
    textDecorationLine: 'underline',
  },
  wizardStepDivider: {
    width: 18,
    height: 2,
    backgroundColor: '#eee',
    marginHorizontal: 2,
    borderRadius: 1,
  },
  toast: {
    position: 'absolute',
    top: 18,
    left: 24,
    right: 24,
    zIndex: 100,
    borderRadius: 7,
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  toastSuccess: {
    // No border, solo fondo translúcido
  },
  toastError: {
    // No border, solo fondo translúcido
  },
  toastText: {
    color: '#444',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  toastRed: {
    backgroundColor: '#D7263D',
    borderRadius: 7,
    marginHorizontal: 18,
    marginTop: 50,
    marginBottom: 4,
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  toastRedText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  toastBottom: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 5,
    backgroundColor: '#D7263D',
    borderRadius: 7,
    paddingVertical: 9,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    zIndex: 200,
  },
  toastBottomText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  estado_pendiente: {
    backgroundColor: '#FFA500',
  },
  estado_completada: {
    backgroundColor: '#34C759',
  },
  estado_rechazada: {
    backgroundColor: '#FF3B30',
  },
  estado_enviada: {
    backgroundColor: '#007AFF',
  },
  estado_enviada_impresa: {
    backgroundColor: '#007AFF',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cantidadInput: {
    width: 50,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 5,
  },
  cantidadTextClickable: {
    fontWeight: 'bold',
  },
  productoCantidadUnidad: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D7263D',
    marginTop: 4,
  },
  tipoCard: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 14,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    minHeight: 90,
    maxHeight: 120,
  },
  wizardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    paddingBottom: 6,
  },
  actionButton: {
    flex: 0,
    minWidth: 40,
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  actionButtonPrimary: {
    backgroundColor: '#D7263D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonSecondary: {
    flex: 0,
    minWidth: 40,
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
  },
  actionButtonIcon: {
    marginRight: 10,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsModalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 18,
    width: '85%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  actionModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginBottom: 0,
    marginTop: 0,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionModalButtonDanger: {
    backgroundColor: '#FF3B30',
    marginBottom: 0,
  },
  actionModalButtonWhatsapp: {
    backgroundColor: '#25D366',
    marginBottom: 0,
  },
  actionModalButtonPrint: {
    backgroundColor: '#222',
    marginBottom: 0,
  },
  actionModalButtonSecondary: {
    backgroundColor: 'transparent',
  },
  actionModalIcon: {
    marginRight: 18,
  },
  actionModalText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 0.2,
  },
  actionModalTextSecondary: {
    color: '#D7263D',
    fontWeight: 'bold',
    fontSize: 15,
  },
  actionDivider: {
    height: 12,
  },
  wizardSubHeader: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 4,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  searchFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 32,
  },
  searchIcon: {
    marginRight: 6,
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    height: 32,
    fontSize: 14,
    color: '#333',
    padding: 0,
    paddingVertical: 4,
  },
  clearButton: {
    padding: 2,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#D7263D',
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#D7263D',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#666',
  },
  productoItemModal: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 7,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
    marginBottom: 4,
  },
  productoNombreModal: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  productoProveedorModal: {
    fontSize: 12,
    color: '#666',
  },
  cardOtroProveedor: {
    backgroundColor: '#f0f7ff',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  otroProveedorBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  otroProveedorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  actionModalButtonDeleteLessImportant: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#eee',
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  actionModalTextDelete: {
    color: '#D7263D',
    fontWeight: 'normal',
    fontSize: 15,
    marginLeft: 8,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  cardHighlighted: {
    backgroundColor: '#f0f7ff',
    borderColor: '#007AFF',
    borderWidth: 2,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    transform: [{ scale: 1.02 }],
  },
  cardDraggable: {
    backgroundColor: '#f0f7ff',
    borderColor: '#007AFF',
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D7263D',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionSelected: {
    backgroundColor: '#fbeaec',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  modalOptionTextSelected: {
    color: '#D7263D',
    fontWeight: 'bold',
  },
  modalCancelButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#D7263D',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 7,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
    marginBottom: 4,
  },
  productoItemSelected: {
    backgroundColor: '#D7263D',
  },
  productoNombre: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  productoProveedor: {
    fontSize: 12,
    color: '#666',
  },
}); 