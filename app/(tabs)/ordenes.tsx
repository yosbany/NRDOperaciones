import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
// import { useFocusEffect, useRoute } from '@react-navigation/native'; // Removed to fix LinkPreviewContext error
import Constants from 'expo-constants';
// import { useRouter } from 'expo-router'; // Removed to fix filename error
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Keyboard, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import FormFooterButtons from '../../components/FormFooterButtons';
import { useUser } from '../../components/UserContext';
import { useLoading } from '../../contexts/LoadingContext';
import { Colors } from '../../constants/Colors';
import { ORDENES_TIPOS, ORDENES_TIPOS_ICONS } from '../../constants/OrdenesTipos';
import { deleteOrden, generarSugerenciasOrden, getEmailPrefix, getOrdenes, getOrdenesByUserRole, getProductos, getProductosDefaultCliente, getProveedores, isAdmin, Orden, Producto, Proveedor, saveOrden, updateOrden, updateProductosOrdenBatch } from '../../services/firebaseService';
import { containsSearchTerm } from '../../utils/searchUtils';

const MAX_ORDENES_VISIBLES = 50;

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

const WIZARD_BAR_COLOR = '#f8f8f8';

function sumaSegura(a: number, b: number): number {
  return a + b;
}

const getResponsableOrAlert = async () => {
  const responsable = (await AsyncStorage.getItem('responsableApp'))?.trim() || '';
  return responsable || 'App';
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

// Parsear fecha para ordenar/filtrar (fuera del componente para no recrear)
function parseFechaOrden(fecha: string): Date {
  if (/^\d{2}-\d{2}-\d{4}/.test(fecha)) {
    const [d, m, y, ...resto] = fecha.split(/[-T ]/);
    const [h, min, s] = resto.length > 0 ? (resto[0] || '00:00:00').split(':') : ['00', '00', '00'];
    return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s));
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) {
    const [y, m, d, ...resto] = fecha.split(/[-T ]/);
    const [h, min, s] = resto.length > 0 ? (resto[0] || '00:00:00').split(':') : ['00', '00', '00'];
    return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s));
  }
  return new Date(fecha);
}

export default function OrdenesScreen() {
  const insets = useSafeAreaInsets();
  // const router = useRouter(); // Removed to fix filename error
  const { userData, onLogout } = useUser();
  const { showLoading, hideLoading } = useLoading();

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

  const [usuario] = useState<string>('Usuario');
  const [showAddProductoModal, setShowAddProductoModal] = useState(false);
  const [showCrearProductoTempModal, setShowCrearProductoTempModal] = useState(false);
  const [nombreProductoTemp, setNombreProductoTemp] = useState('');
  const [precioProductoTemp, setPrecioProductoTemp] = useState('');
  const [unidadProductoTemp, setUnidadProductoTemp] = useState('UNIDAD');
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
  const [showCancelModal, setShowCancelModal] = useState(false);
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
  const lastTapRef = useRef<{ id: string; timestamp: number } | null>(null);
  // Estado para el orden original y para mostrar el botón de aplicar en el paso 3 del wizard
  const [productosWizardOrdenOriginal, setProductosWizardOrdenOriginal] = useState<Producto[]>([]);
  const [busquedaProveedor, setBusquedaProveedor] = useState('');
  const [fechaOrden, setFechaOrden] = useState<string>('');
  const [editandoFecha, setEditandoFecha] = useState(false);
  const [fechaInputText, setFechaInputText] = useState<string>('');
  const [fechaUpdateTrigger, setFechaUpdateTrigger] = useState(0);
  const [shouldReloadData, setShouldReloadData] = useState(false);
  const [justCreatedOrder, setJustCreatedOrder] = useState(false);
  const [limiteMostradas, setLimiteMostradas] = useState(MAX_ORDENES_VISIBLES);

  const filtroChangeRef = useRef(false);
  useEffect(() => {
    setLimiteMostradas(MAX_ORDENES_VISIBLES);
  }, [filtro, proveedorFiltro, busquedaOrden]);

  useEffect(() => {
    if (!filtroChangeRef.current) {
      filtroChangeRef.current = true;
      return;
    }
    const t = setTimeout(() => hideLoading(), 250);
    return () => clearTimeout(t);
  }, [filtro, proveedorFiltro, busquedaOrden, hideLoading]);

  const handleCambioFiltro = useCallback((key: 'ultimas' | 'hoy' | 'proveedor' | 'todas') => {
    showLoading();
    requestAnimationFrame(() => setFiltro(key));
  }, [showLoading]);

  const handleCambioProveedor = useCallback((value: string) => {
    showLoading();
    requestAnimationFrame(() => setProveedorFiltro(value));
  }, [showLoading]);

  useEffect(() => {
    showLoading();
    getProductos((productosData) => setProductos(productosData || []));
    getProveedores((proveedoresData) => setProveedores(proveedoresData || []));
    if (userData) {
      getOrdenesByUserRole(userData, (ordenesData) => {
        setOrdenes(ordenesData);
        setLoading(false);
        hideLoading();
      });
    } else {
      getOrdenes((ordenesData) => {
        setOrdenes(ordenesData);
        setLoading(false);
        hideLoading();
      });
    }
  }, [userData, showLoading, hideLoading]);

  // Recargar órdenes cuando el componente se monta
  useEffect(() => {
      // NO recargar si acabamos de crear/actualizar una orden o si el wizard está activo
      if (wizardVisible || justCreatedOrder) return;
      // Solo recargar si no hay órdenes cargadas o si se solicita explícitamente
      if (ordenes.length === 0 || shouldReloadData) {
        if (userData) {
          getOrdenesByUserRole(userData, (ordenesData) => {
            setOrdenes(ordenesData);
            setShouldReloadData(false);
          });
        } else {
          getOrdenes((ordenesData) => {
            setOrdenes(ordenesData);
            setShouldReloadData(false);
          });
        }
      }
    }, [userData, ordenes.length, wizardVisible, shouldReloadData, justCreatedOrder]);

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
    if (ordenIdPreseleccionada && ordenes.length > 0) {
      const ordenEncontrada = ordenes.find(o => o.id === ordenIdPreseleccionada);
      if (ordenEncontrada) openWizard(ordenEncontrada);
    }
  }, [ordenes, ordenIdPreseleccionada]);


  // Si el usuario no es admin y tiene el filtro de proveedor activo, cambiarlo a ultimas
  useEffect(() => {
    if (!isAdmin(userData) && filtro === 'proveedor') {
      setFiltro('ultimas');
      setProveedorFiltro('');
    }
  }, [userData, filtro]);

  // Wizard handlers (useCallback para no invalidar renderOrden en cada render)
  const openWizard = useCallback((ordenToEdit?: Orden) => {
    if (ordenToEdit) {
      setEditOrden(ordenToEdit);
      setProveedorSel(proveedores.find(p => p.id === ordenToEdit.proveedorId) || null);
      setTipoSel(ordenToEdit.tipo);
      const productosCompatibles = (ordenToEdit.productos || [])
        .map(p => {
          const productoId = p.id || p.productoId;
          const cantidad = typeof p.cantidad === 'string' ? p.cantidad : p.cantidad?.toString() || '0';
          return { id: productoId, cantidad, unidad: p.unidad || 'UNIDAD' };
        })
        .filter(p => p.id);
      setProductosSel(productosCompatibles);
      setFechaOrden(ordenToEdit.fecha || obtenerFechaActual());
      setWizardStep(3);
      setSoloSeleccionados(false);
      setOrdenDuplicarSel(null);
    } else {
      setEditOrden(null);
      setTipoSel(null);
      setProductosSel([]);
      setProductosDefaultDisponibles([]);
      setProductosSugeridos([]);
      setFechaOrden(obtenerFechaActual());
      setBusquedaOrden('');
      setSoloSeleccionados(false);
      if (!isAdmin(userData) && userData) {
        const prefix = getEmailPrefix(userData);
        const proveedorAsociado = proveedores.find(p => (p.nombre ?? '').toLowerCase().trim() === prefix);
        setProveedorSel(proveedorAsociado || null);
        setWizardStep(proveedorAsociado ? 2 : 1);
      } else {
        setProveedorSel(null);
        setWizardStep(1);
      }
      setOrdenDuplicarSel(null);
    }
    setWizardVisible(true);
  }, [proveedores, userData, userData?.contactId]);
  const closeWizard = () => {
    setWizardVisible(false);
    setWizardStep(1);
    setProveedorSel(null);
    setTipoSel(null);
    setProductosSel([]);
    setEditOrden(null);
    setBusquedaOrden('');
    setBusquedaProveedor('');
    setSoloSeleccionados(false);
    setFechaOrden('');
    setEditandoFecha(false);
    setProductosDefaultDisponibles([]);
    setProductosSugeridos([]);
    setFechaInputText('');
  };

  // Memoizar ordenación y filtrado de órdenes para evitar recalcular en cada render
  const hoyStr = useMemo(() => {
    const hoyDate = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hoyDate.getDate())}-${pad(hoyDate.getMonth() + 1)}-${hoyDate.getFullYear()}`;
  }, []);

  const ordenesFiltradas = useMemo(() => {
    const ordenesOrdenadas = [...ordenes].sort((a, b) =>
      parseFechaOrden(b.fecha).getTime() - parseFechaOrden(a.fecha).getTime()
    );
    if (filtro === 'ultimas') {
      return ordenesOrdenadas.slice(0, 10);
    }
    if (filtro === 'hoy') {
      return ordenesOrdenadas.filter(o => {
        let fechaSoloDia = o.fecha;
        if (fechaSoloDia.includes(' ')) fechaSoloDia = fechaSoloDia.split(' ')[0];
        if (/^\d{4}-\d{2}-\d{2}/.test(fechaSoloDia)) {
          const [y, m, d] = fechaSoloDia.split('-');
          fechaSoloDia = `${d}-${m}-${y}`;
        }
        return fechaSoloDia === hoyStr;
      });
    }
    if (filtro === 'proveedor' && proveedorFiltro) {
      if (busquedaOrden) {
        const proveedor = proveedores.find(p => p.id === proveedorFiltro);
        if (proveedor && containsSearchTerm(proveedor.nombre, busquedaOrden)) {
          return ordenesOrdenadas.filter(o => o.proveedorId === proveedorFiltro);
        }
        return [];
      }
      return ordenesOrdenadas.filter(o => o.proveedorId === proveedorFiltro);
    }
    if (busquedaOrden) {
      return ordenesOrdenadas.filter(o => {
        const proveedor = proveedores.find(p => p.id === o.proveedorId);
        return proveedor && containsSearchTerm(proveedor.nombre, busquedaOrden);
      });
    }
    return ordenesOrdenadas;
  }, [ordenes, filtro, proveedorFiltro, busquedaOrden, proveedores, hoyStr]);

  // Map proveedor id -> proveedor para O(1) lookup en listas
  const proveedorById = useMemo(() => {
    const m = new Map<string, ProveedorWithPhone>();
    proveedores.forEach(p => m.set(p.id, p));
    return m;
  }, [proveedores]);

  const ordenesParaLista = useMemo(
    () => ordenesFiltradas.slice(0, limiteMostradas),
    [ordenesFiltradas, limiteMostradas]
  );

  // Metadata solo para las órdenes visibles (máx 50) para no bloquear la UI al cambiar filtro
  const ordenMetadataMap = useMemo(() => {
    const hoy = new Date();
    const tresMesesAtras = new Date(hoy.getFullYear(), hoy.getMonth() - 3, hoy.getDate());
    const map = new Map<string, { importeTotal: number; fueraDeTendencia: boolean; fechaMostrar: string }>();
    ordenesParaLista.forEach(item => {
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
      const importeTotal = item.productos && item.productos.length > 0
        ? item.productos.reduce((acc, prod) => {
            let precio = 0;
            if (prod.precio !== undefined && prod.precio !== null) {
              precio = Number(prod.precio);
            } else if (prod.subtotal !== undefined && prod.subtotal !== null && Number(prod.cantidad) > 0) {
              precio = Number(prod.subtotal) / Number(prod.cantidad);
            } else {
              const productoId = prod.id || prod.productoId;
              const productoInfo = productos.find(p => p.id === productoId);
              precio = productoInfo?.precio ?? 0;
            }
            return acc + ((Number(prod.cantidad) || 0) * precio);
          }, 0)
        : (item.total || 0);
      const fueraDeTendencia = !!(item.productos && item.productos.length > 0 && item.productos.some((prod: any) => {
        const ordenesUltimos3Meses = ordenes.filter(o => {
          const fechaO = parseFechaOrden(o.fecha);
          return fechaO >= tresMesesAtras && fechaO <= hoy && Array.isArray(o.productos) && (o.productos as ProductoOrden[]).some((p: ProductoOrden) => p.productoId === (prod.productoId || prod.id));
        });
        ordenesUltimos3Meses.sort((a, b) => parseFechaOrden(b.fecha).getTime() - parseFechaOrden(a.fecha).getTime());
        const comprasProducto = ordenesUltimos3Meses
          .map(o => Array.isArray(o.productos) ? (o.productos as ProductoOrden[]).find((p: ProductoOrden) => p.productoId === (prod.productoId || prod.id)) : null)
          .filter((p): p is ProductoOrden => !!p && typeof p.cantidad === 'string' && !isNaN(Number(p.cantidad)))
          .map(p => Number(p.cantidad))
          .filter((n): n is number => typeof n === 'number' && !isNaN(n));
        const cantidadActual = Number(prod.cantidad);
        const cantidadPromedio = comprasProducto.length > 0 ? Math.round(comprasProducto.reduce((a, b) => a + b, 0) / comprasProducto.length) : null;
        return cantidadActual !== null && cantidadPromedio !== null && cantidadPromedio > 0 &&
          Math.abs(cantidadActual - cantidadPromedio) / cantidadPromedio > 0.2;
      }));
      map.set(item.id, { importeTotal, fueraDeTendencia, fechaMostrar });
    });
    return map;
  }, [ordenesParaLista, ordenes, productos]);

  const puedeEliminarOrden = () => true;
  const keyExtractorOrdenes = useCallback((item: Orden) => item.id, []);

  const hayMasOrdenes = ordenesFiltradas.length > MAX_ORDENES_VISIBLES && limiteMostradas < ordenesFiltradas.length;
  const cantidadMas = ordenesFiltradas.length - limiteMostradas;

  const renderOrden = useCallback(({ item }: { item: Orden }) => {
    const meta = ordenMetadataMap.get(item.id);
    const proveedor = proveedorById.get(item.proveedorId);
    const importeTotal = meta?.importeTotal ?? 0;
    const fueraDeTendencia = meta?.fueraDeTendencia ?? false;
    const fechaMostrar = meta?.fechaMostrar ?? item.fecha ?? '';
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
                  const responsable = await getResponsableOrAlert();
                  if (!responsable) return;
                  try {
                    showLoading();
                    await deleteOrden(item.id);
                    setOrdenes(prev => prev.filter(o => o.id !== item.id));
                  } finally {
                    hideLoading();
                  }
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
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.proveedor}>{proveedor?.nombre || 'Proveedor desconocido'}</Text>
            <View style={{ position: 'absolute', top: 0, right: 0, flexDirection: 'row', alignItems: 'center' }}>
              {fueraDeTendencia && (
                <Ionicons name="warning" size={20} color="#FFD600" style={{ marginRight: 4 }} />
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 1 }}>
            <Ionicons name="calendar-outline" size={14} color="#888" style={{ marginRight: 4 }} />
            <Text style={[styles.cardPropText, { fontWeight: 'bold', color: '#333' }]}>{fechaMostrar}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 1 }}>
            <Ionicons name="cube-outline" size={14} color="#888" style={{ marginRight: 4 }} />
            <Text style={styles.cardPropText}>Ítems: {item.productos ? item.productos.length : 0}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="pricetag-outline" size={16} color="#888" style={{ marginRight: 6 }} />
              <Text style={styles.cardPropText}>{ORDENES_TIPOS[item.tipo as keyof typeof ORDENES_TIPOS]}</Text>
            </View>
            {isAdmin(userData) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="cash-outline" size={16} color="#D7263D" />
                <Text style={{ color: '#D7263D', fontWeight: 'bold', fontSize: 15 }}>${importeTotal.toFixed(2)}</Text>
              </View>
            )}
          </View>
              </TouchableOpacity>
      </Swipeable>
    );
  }, [ordenMetadataMap, proveedorById, highlightedOrdenId, userData, openWizard]);

  // Uso de proveedores por orden (para ordenar en paso 1 del wizard)
  const proveedorUso = useMemo(() => {
    const u: Record<string, number> = {};
    ordenes.forEach(o => {
      if (o.proveedorId) u[o.proveedorId] = (u[o.proveedorId] || 0) + 1;
    });
    return u;
  }, [ordenes]);

  // No-admin: solo mostrar botón nueva orden si tiene al menos un proveedor con nombre = parte antes del @
  const mostrarBotonNuevaOrden = useMemo(() => {
    if (!proveedores.length) return false;
    if (isAdmin(userData)) return true;
    if (!userData) return false;
    const prefix = getEmailPrefix(userData);
    return proveedores.some(p => (p.nombre ?? '').toLowerCase().trim() === prefix);
  }, [proveedores, userData]);

  // Wizard UI
  const renderWizard = () => {
    // Si estamos en paso 3 pero no hay proveedor (estado inconsistente), mostrar paso 1 para no dejar pantalla en blanco
    const effectiveStep: 1 | 2 | 3 = (wizardStep === 3 && !proveedorSel) ? 1 : wizardStep;
    const pasos = ['Proveedor', 'Tipo', 'Productos'];
    const productosProveedorCount = proveedorSel ? productos.filter(p => p.proveedorId === proveedorSel.id).length : 0;
    const colorFondoEstado = WIZARD_BAR_COLOR;
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
                effectiveStep === idx + 1 && styles.wizardStepTextActive
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
        {effectiveStep === 3 && (
          <TouchableOpacity onPress={() => setShowAddProductoModal(true)} style={{ marginLeft: 8, padding: 4 }}>
            <Ionicons name="add-circle-outline" size={30} color="#D7263D" />
          </TouchableOpacity>
        )}
      </View>
    );
    // Paso 1: Seleccionar proveedor (no-admin solo ve el proveedor cuyo nombre = parte antes del @)
    if (effectiveStep === 1) {
      const proveedoresDisponibles = !isAdmin(userData) && userData
        ? proveedores.filter(p => (p.nombre ?? '').toLowerCase().trim() === getEmailPrefix(userData))
        : proveedores;
      const proveedoresFiltrados = busquedaProveedor.trim() 
        ? proveedoresDisponibles.filter(p => 
            (p.nombre ?? '').toLowerCase().includes(busquedaProveedor.toLowerCase()) ||
            (p.tipo && p.tipo.toLowerCase().includes(busquedaProveedor.toLowerCase()))
          )
        : proveedoresDisponibles;
      
      // Ordenar proveedores: más usados primero, luego por nombre
      const proveedoresOrdenados = [...proveedoresFiltrados].sort((a, b) => {
        const usoA = proveedorUso[a.id] || 0;
        const usoB = proveedorUso[b.id] || 0;
        if (usoA !== usoB) return usoB - usoA;
        return a.nombre.localeCompare(b.nombre);
      });

    return (
        <View style={styles.wizardContainer}>
          <AppHeader 
            title={editOrden?.id ? "Editar Orden" : "Nueva Orden"} 
            showBackButton={false}
            actions={[
              { icon: 'log-out-outline', onPress: () => onLogout(), size: 28 }
            ]}
          />
          {toast && (
            <View style={styles.toastRed}>
              <Text style={styles.toastRedText}>{toast.message}</Text>
            </View>
          )}
          <View style={{ flex: 1, minHeight: 0 }}>
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
              style={{ flex: 1 }}
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
                  if (item.tipo === 'Cliente') {
                    try {
                      showLoading();
                      const productosDefault = await getProductosDefaultCliente(item.id);
                      if (productosDefault.length > 0) {
                        setProductosDefaultDisponibles(productosDefault);
                        setProductosSel([]);
                      } else {
                        setProductosDefaultDisponibles([]);
                      }
                      setWizardStep(2);
                    } catch (error) {
                      console.error('Error cargando productos predeterminados:', error);
                      setProductosDefaultDisponibles([]);
                      setWizardStep(2);
                    } finally {
                      hideLoading();
                    }
                  } else {
                    setProductosDefaultDisponibles([]);
                    setWizardStep(2);
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
        </View>
    );
  }
    // Paso 2: Seleccionar tipo
    if (effectiveStep === 2) {
    return (
        <View style={styles.wizardContainer}>
          <AppHeader 
            title={editOrden?.id ? "Editar Orden" : "Nueva Orden"} 
            showBackButton={false}
            actions={[
              { icon: 'log-out-outline', onPress: () => onLogout(), size: 28 }
            ]}
          />
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
                        const sugerencias = generarSugerenciasOrden(proveedorSel.id, ordenes, productos);
                        setProductosSugeridos(sugerencias);
                        
                        // Auto-seleccionar productos sugeridos
                        const productosAutoSeleccionados = sugerencias.map(sug => ({
                          id: sug.producto.id,
                          cantidad: sug.cantidadSugerida.toString(),
                          unidad: sug.unidadSugerida
                        }));
                        setProductosSel(productosAutoSeleccionados);
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
                  o.tipo !== 'AUTOMATICA'
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
              ListEmptyComponent={<Text style={{ color: '#888', fontStyle: 'italic', marginTop: 8 }}>No hay órdenes para duplicar de este proveedor.</Text>}
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
      }
      
      // Para órdenes sugeridas: incluir productos sugeridos que no estén ya en la lista
      if (tipoSel === 'SUGERIDA' && productosSugeridos.length > 0) {
        const productosSugeridosCompletos = productosSugeridos
          .map(ps => ps.producto)
          .filter(p => !productosProveedor.some(pp => pp.id === p.id));
        
        productosProveedor = [...productosProveedor, ...productosSugeridosCompletos];
      }
      
      const otrosProductos = productosSel
        .filter(p => !productosProveedor.some(pp => pp.id === p.id))
        .map(p => {
          const found = productos.find(prod => prod.id === p.id);
          if (found) return found;
          // Al editar: si el producto no está en el catálogo, usar nombre guardado en la orden
          if (proveedorSel && editOrden?.productos) {
            const enOrden = editOrden.productos.find((pr: any) => (pr.id || pr.productoId) === p.id);
            const nombreEnOrden = (enOrden as any)?.nombre;
            if (nombreEnOrden) {
              return {
                id: p.id,
                nombre: nombreEnOrden,
                orden: 0,
                precio: 0,
                proveedorId: proveedorSel.id,
                stock: 0,
                unidad: p.unidad || 'UNIDAD'
              } as Producto;
            }
          }
          return null;
        })
        .filter((p): p is Producto => p !== null && p !== undefined);
      
      const nom = (x: Producto) => (x as any).nombre ?? (x as any).name ?? '';
      productosProveedor = [...productosProveedor, ...otrosProductos].sort((a, b) => {
        const nomA = nom(a);
        const nomB = nom(b);
        if (a.proveedorId === b.proveedorId) {
          if (a.orden !== undefined && b.orden !== undefined) return a.orden - b.orden;
          return nomA.localeCompare(nomB);
        }
        if (a.proveedorId === proveedorSel.id) return -1;
        if (b.proveedorId === proveedorSel.id) return 1;
        return nomA.localeCompare(nomB);
      });

      // Helper: nombre del producto (soporta nombre o name por compatibilidad)
      const nombreProd = (p: Producto) => (p as any).nombre ?? (p as any).name ?? '';

      // Filtrar productos según la búsqueda y el checkbox
      productosProveedor = productosProveedor.filter(p => {
        if (!busquedaOrden) return !soloSeleccionados || productosSel.some(sel => sel.id === p.id);

        const proveedor = proveedores.find(prov => prov.id === p.proveedorId);
        const nombreMatch = containsSearchTerm(nombreProd(p), busquedaOrden);
        const proveedorMatch = proveedor ? containsSearchTerm(proveedor.nombre, busquedaOrden) : false;

        const matchesSearch = nombreMatch || proveedorMatch;
        const matchesFilter = !soloSeleccionados || productosSel.some(sel => sel.id === p.id);

        return matchesSearch && matchesFilter;
      });

      // OFERTA primero: productos cuyo nombre empieza por "OFERTA" al inicio
      productosProveedor = [...productosProveedor].sort((a, b) => {
        const aOferta = (nombreProd(a) || '').trim().toUpperCase().startsWith('OFERTA');
        const bOferta = (nombreProd(b) || '').trim().toUpperCase().startsWith('OFERTA');
        if (aOferta && !bOferta) return -1;
        if (!aOferta && bOferta) return 1;
        return 0;
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
          <View style={{ flex: 1 }}>
            {proveedorSel && (
              <Text style={{ color: '#888', fontSize: 13 }}>
                {proveedorSel.nombre}
              </Text>
            )}
            {tipoSel && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Text style={{ color: '#aaa', fontSize: 12 }}>
                  Tipo: {ORDENES_TIPOS[tipoSel as keyof typeof ORDENES_TIPOS]}
                </Text>
                {wizardStep === 3 && (
                  <TouchableOpacity 
                    onPress={() => {
                      if (Platform.OS === 'android') {
                        // Usar DateTimePickerAndroid para Android
                        const fechaActual = fechaOrden || obtenerFechaActual();
                        let fechaDate: Date;
                        
                        try {
                          if (fechaActual.includes('-')) {
                            const [fechaPart, horaPart] = fechaActual.split(' ');
                            const [dia, mes, año] = fechaPart.split('-');
                            if (horaPart) {
                              const [hora, minuto, segundo] = horaPart.split(':');
                              fechaDate = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), parseInt(hora), parseInt(minuto), parseInt(segundo));
                            } else {
                              fechaDate = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
                            }
                          } else {
                            fechaDate = new Date(fechaActual);
                          }
                        } catch {
                          fechaDate = new Date();
                        }
                        
                        DateTimePickerAndroid.open({
                          value: fechaDate,
                          mode: 'datetime',
                          is24Hour: true,
                          onChange: (event, selectedDate) => {
                            if (event.type === 'set' && selectedDate) {
                              const dia = selectedDate.getDate().toString().padStart(2, '0');
                              const mes = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
                              const año = selectedDate.getFullYear();
                              const hora = selectedDate.getHours().toString().padStart(2, '0');
                              const minuto = selectedDate.getMinutes().toString().padStart(2, '0');
                              const segundo = selectedDate.getSeconds().toString().padStart(2, '0');
                              
                              const nuevaFechaTexto = `${dia}-${mes}-${año} ${hora}:${minuto}:${segundo}`;
                              setFechaOrden(nuevaFechaTexto);
                            }
                          }
                        });
                      } else {
                        // iOS: usar el componente normal
                        const fechaFormateada = formatearFecha(fechaOrden || obtenerFechaActual());
                        setFechaInputText(fechaFormateada);
                        setEditandoFecha(true);
                      }
                    }}
                  >
                    <Text style={{ color: '#D7263D', fontSize: 12, textDecorationLine: 'underline' }}>
                      {formatearFecha(fechaOrden || obtenerFechaActual())}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
          {wizardStep === 3 && (
            <TouchableOpacity onPress={() => setShowAddProductoModal(true)} style={{ marginLeft: 8, padding: 4 }}>
              <Ionicons name="add-circle-outline" size={30} color="#D7263D" />
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
            <AppHeader 
              title={editOrden?.id ? "Editar Orden" : "Nueva Orden"}
              showBackButton={false}
              actions={[
                { icon: 'ellipsis-horizontal', onPress: () => setShowActionsModal(true), size: 28 },
                { icon: 'log-out-outline', onPress: () => onLogout(), size: 28 }
              ]}
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
                  setSoloSeleccionados(!soloSeleccionados);
                }}
                disabled={false}
            >
                <View style={[styles.checkbox, soloSeleccionados && styles.checkboxSelected]}>
                  {soloSeleccionados && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Solo seleccionados</Text>
            </TouchableOpacity>
          </View>
            <View style={{ height: 4 }} />
            <View style={{ flex: 1 }}>
              <DraggableFlatList
                data={productosProveedor}
                keyExtractor={item => item.id}
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
              onDragEnd={({ data }) => {
                const ordenById = new Map(data.map((p, i) => [p.id, i]));
                setProductos(prev => prev.map(p => ordenById.has(p.id) ? { ...p, orden: ordenById.get(p.id)! } : p));
                const productosDelProveedor = data.filter(p => p.proveedorId === proveedorSel.id);
                showLoading();
                updateProductosOrdenBatch(productosDelProveedor.map((p, i) => ({ id: p.id, data: { orden: i } })))
                  .then(() => {
                    getProductos((productosData) => {
                      setProductos(productosData);
                      setProductosWizardOrdenOriginal(productosData);
                      setTimeout(() => hideLoading(), 1000);
                    });
                  })
                  .catch(error => {
                    console.error('Error al actualizar el orden:', error);
                    Alert.alert('Error', 'No se pudo actualizar el orden de los productos');
                    setTimeout(() => hideLoading(), 1000);
                  });
              }}
              renderItem={({ item, drag, isActive }) => {
                const seleccionado = productosSel.find(p => p.id === item.id);
                const esOtroProveedor = item.proveedorId !== proveedorSel.id;
                // Nombre: del item (nombre o name), de la orden al editar, o fallback
                const nombreDelItem = (item as any).nombre ?? (item as any).name;
                const nombreEnOrden = editOrden?.productos?.find((pr: any) => (pr.id || pr.productoId) === item.id) as any;
                const nombreProducto = (nombreDelItem && String(nombreDelItem).trim()) || (nombreEnOrden?.nombre && String(nombreEnOrden.nombre).trim()) || 'Producto';
                const esOferta = (nombreProducto || '').trim().toUpperCase().startsWith('OFERTA');
                
                const handlePress = () => {
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
                  
                  // Si está siendo procesado, ignorar
                  if (productoCalculando === item.id) {
                    return;
                  }

                  if (isSelected) {
                    if (isDoubleTap) {
                      // DOBLE TAP: Desmarcar producto
                      setProductoCalculando(item.id);
                      lastTapRef.current = null; // Limpiar inmediatamente
                      
                      // Desmarcar inmediatamente
                      setProductosSel(prev => prev.filter(p => p.id !== item.id));
                      
                      // Si es un producto temporal, eliminarlo de la lista de productos
                      if (item.id.startsWith('temp_')) {
                        setProductos(prev => prev.filter(p => p.id !== item.id));
                      }
                      
                      setTimeout(() => {
                        setProductoCalculando(null);
                      }, 500);
                    } else {
                      // PRIMER TAP en producto seleccionado: Registrar para posible doble tap
                      lastTapRef.current = { id: item.id, timestamp: now };
                    }
                  } else {
                    // TAP en producto NO seleccionado: Agregar
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
                    } else if (productoSugerido) {
                      // Usar cantidad y unidad sugeridas (órdenes sugeridas)
                      cantidadDefault = productoSugerido.cantidadSugerida.toString();
                      unidadDefault = productoSugerido.unidadSugerida;
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
                    }, 500);
                  }
                };
                // Calcula la cantidad última compra y la tendencia
                const hoy = new Date();
                const tresMesesAtras = new Date(hoy.getFullYear(), hoy.getMonth() - 3, hoy.getDate());
                const ordenesUltimos3Meses = ordenes.filter(o => {
                  const fechaO = parseFechaOrden(o.fecha);
                  return fechaO >= tresMesesAtras && fechaO <= hoy && Array.isArray(o.productos) && (o.productos as ProductoOrden[]).some((p: ProductoOrden) => p.productoId === item.id);
                });
                // Ordenar por fecha descendente
                ordenesUltimos3Meses.sort((a, b) => parseFechaOrden(b.fecha).getTime() - parseFechaOrden(a.fecha).getTime());
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
                              setProductoCalculando(item.id);
                              
                              setTimeout(() => {
                                setProductosSel(prev => prev.filter(p => p.id !== item.id));
                                setProductoCalculando(null);
                              }, 1000);
                            } else {
                              // Marcar producto directamente
                              setProductoCalculando(item.id);
                              
                              setTimeout(() => {
                                const productoInfo = productos.find(p => p.id === item.id);
                                const cantidadDefault = productoInfo && productoInfo.stock !== undefined ? String(productoInfo.stock) : '1';
                                setProductosSel(prev => [...prev, { id: item.id, cantidad: cantidadDefault, unidad: item.unidad }]);
                                setProductoCalculando(null);
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
                        esOferta && {
                          backgroundColor: '#fff8e6',
                          borderColor: '#f0ad4e',
                          borderWidth: 2,
                          borderRadius: 6
                        },
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
                        {
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
                            <Text style={[styles.proveedor, { fontSize: 15, flex: 1 }, esOtroProveedor && { color: '#888' }]} numberOfLines={1} ellipsizeMode="tail">{nombreProducto}</Text>
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
                          {/* Cantidad y unidad editable */}
                          {editingCantidad === item.id ? (
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
          </View>
        </TouchableWithoutFeedback>
    );
  }
    return null;
  };

  // Guardar o actualizar orden
  const handleSaveOrden = async () => {
    if (!proveedorSel) {
      setToast({ message: 'Selecciona un proveedor.', type: 'error' });
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => setToast(null), 2500);
      return;
    }
    if (!tipoSel) {
      setToast({ message: 'Selecciona un tipo de orden.', type: 'error' });
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => setToast(null), 2500);
      return;
    }
    if (productosSel.length === 0) {
      setToast({ message: 'Selecciona al menos un producto.', type: 'error' });
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => setToast(null), 2500);
      return;
    }
    const responsable = await getResponsableOrAlert();
    if (!responsable) {
      return;
    }
    const ordenData: Omit<Orden, 'id'> = {
      proveedorId: proveedorSel.id,
      proveedorNombre: proveedorSel.nombre,
      fecha: fechaOrden || obtenerFechaActual(),
      tipo: tipoSel as any,
      estado: editOrden?.estado || 'PENDIENTE',
      productos: productosSel.map(p => {
        const productoInfo = productos.find(prod => prod.id === p.id);
        const nombreProducto = productoInfo?.nombre || 'Producto desconocido';
        const precioProducto = productoInfo?.precio ?? 0;
        
        return {
          id: p.id,
          nombre: nombreProducto,
          cantidad: parseFloat(p.cantidad) || 0,
          unidad: p.unidad,
          precio: precioProducto,
          subtotal: (parseFloat(p.cantidad) || 0) * precioProducto
        };
      }),
      total: productosSel.reduce((sum, p) => {
        const productoInfo = productos.find(prod => prod.id === p.id);
        const precioProducto = productoInfo?.precio ?? 0;
        return sum + ((parseFloat(p.cantidad) || 0) * precioProducto);
      }, 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      showLoading();
      let ordenId: string;
      const esActualizacion = editOrden && typeof editOrden.id === 'string' && editOrden.id.length > 0;
      if (esActualizacion) {
        // Mostrar indicador si es una orden de cliente
        if (proveedorSel?.tipo === 'Cliente') {
        }
        
        await updateOrden(editOrden!.id, { ...ordenData, id: editOrden!.id });
        ordenId = editOrden!.id;
        
      } else {
        // Generar ID único para la nueva orden
        ordenId = Date.now().toString();
        
        await saveOrden({ ...ordenData, id: ordenId });
      }
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
      
      // Resetear el flag después de un delay
      setTimeout(() => {
        setJustCreatedOrder(false);
      }, 500);
      
      // Agregar la nueva orden a la lista existente en lugar de recargar todo
      if (!esActualizacion) {
        // Es una nueva orden, agregarla al inicio de la lista solo si no existe ya
        const nuevaOrdenCompleta: Orden = {
          id: ordenId,
          ...ordenData
        };
        setOrdenes(prevOrdenes => {
          // Verificar si la orden ya existe para evitar duplicados
          const ordenExiste = prevOrdenes.some(orden => orden.id === ordenId);
          if (ordenExiste) {
            return prevOrdenes;
          }
          return [nuevaOrdenCompleta, ...prevOrdenes];
        });
      } else if (editOrden) {
        // Es una edición, actualizar la orden existente en la lista
        setOrdenes(prevOrdenes => 
          prevOrdenes.map(orden => 
            orden.id === editOrden.id 
              ? { ...orden, ...ordenData, id: orden.id }
              : orden
          )
        );
      }
      
      // Resaltar la orden por 3 segundos
      setHighlightedOrdenId(ordenId);
      if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
      highlightTimeout.current = setTimeout(() => {
        setHighlightedOrdenId(null);
      }, 3000);
      
      // Asegurar que no se recarguen los datos automáticamente
      setShouldReloadData(false);
    } catch (e) {
      console.error('Error al guardar la orden:', e);
      setToast({ message: 'No se pudo guardar la orden.', type: 'error' });
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => setToast(null), 2500);
    } finally {
      hideLoading();
    }
  };

  // Eliminar orden
  const handleDeleteOrden = async () => {
    if (!editOrden) return;
    const responsable = await getResponsableOrAlert();
    if (!responsable) return;
    try {
      showLoading();
      await deleteOrden(editOrden.id);
      setToast({ message: 'Orden eliminada', type: 'success' });
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => setToast(null), 2500);
      setOrdenes(prevOrdenes => prevOrdenes.filter(orden => orden.id !== editOrden.id));
      setWizardVisible(false);
      setEditOrden(null);
      setProveedorSel(null);
      setTipoSel(null);
      setProductosSel([]);
      setProductosDefaultDisponibles([]);
      setProductosSugeridos([]);
    } catch (e) {
      setToast({ message: 'No se pudo eliminar la orden', type: 'error' });
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => setToast(null), 2500);
    } finally {
      hideLoading();
    }
  };

  const renderFooter = () => {
    const isEditing = !!editOrden?.id;
    return (
      <>
        <FormFooterButtons
            onCancel={() => {
              if (!editOrden?.id && productosSel.length === 0) {
                closeWizard();
              } else {
                setShowCancelModal(true);
              }
            }}
            onSave={handleSaveOrden}
            saveText={isEditing ? `Actualizar (${productosSel.length})` : `Crear (${productosSel.length})`}
            saveIcon={isEditing ? "save" : "create"}
            disabled={productosSel.length === 0}
            hideSaveWhenDisabled={!isEditing}
            customLeftButton={isEditing ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSecondary, styles.floatingMenuButton]}
                onPress={() => {
                  if (editOrden) {
                    setProveedorSel(proveedores.find(p => p.id === editOrden.proveedorId) || null);
                  }
                  setShowActionsModal(true);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.actionButtonContent}>
                  <Ionicons name="ellipsis-vertical" size={24} color="#D7263D" />
                </View>
              </TouchableOpacity>
            ) : undefined}
          />
      </>
    );
  };

  // Función para limpiar estados de modales
  const limpiarEstadosModales = () => {
    setShowActionsModal(false);
    setShowUnidadModal(false);
    setShowAddProductoModal(false);
    setShowTestModal(false);
    setProductoUnidadEdit(null);
    setBusquedaProducto('');
  };

  const handleCloseModal = (modalType: 'actions' | 'unidad' | 'addProducto') => {
    switch (modalType) {
      case 'actions':
        setShowActionsModal(false);
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
    
    // Si está siendo procesado, ignorar
    if (productoCalculando === producto.id) {
      return;
    }

    if (isSelected) {
      if (isDoubleTap) {
        // DOBLE TAP: Desmarcar producto
        setProductoCalculando(producto.id);
        lastTapRef.current = null;
        
        // Desmarcar inmediatamente
        setProductosSel(productosSel.filter(p => p.id !== producto.id));
        
        // Si es un producto temporal, eliminarlo de la lista de productos
        if (producto.id.startsWith('temp_')) {
          setProductos(prev => prev.filter(p => p.id !== producto.id));
        }
        
        setTimeout(() => {
          setProductoCalculando(null);
        }, 500);
      } else {
        // PRIMER TAP en producto seleccionado: Registrar para posible doble tap
        lastTapRef.current = { id: producto.id, timestamp: now };
      }
    } else {
      // TAP en producto NO seleccionado: Agregar
      setProductoCalculando(producto.id);
      
      // Agregar inmediatamente
      const productoInfo = productos.find(p => p.id === producto.id);
      const cantidadDefault = productoInfo && productoInfo.stock !== undefined ? String(productoInfo.stock) : '1';
      setProductosSel([...productosSel, { id: producto.id, cantidad: cantidadDefault, unidad: producto.unidad || 'UNIDAD' }]);
      
      // NO establecer lastTap aquí - eso interfiere con el doble tap posterior
      lastTapRef.current = null;
      
      setTimeout(() => {
        setProductoCalculando(null);
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
            <Text style={[styles.productoNombreModal, seleccionado && { color: '#fff' }]}>{(item as any).nombre ?? (item as any).name ?? 'Producto'}</Text>
            <Text style={[styles.productoProveedorModal, seleccionado && { color: '#fff' }]}>
              {proveedores.find(p => p.id === item.proveedorId)?.nombre}
            </Text>
          </View>
          <Ionicons 
            name="add-circle-outline" 
            size={22} 
            color={seleccionado ? '#fff' : '#D7263D'} 
          />
        </TouchableOpacity>
      </Swipeable>
    );
  };



  return (
    <View style={{ flex: 1 }}>
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
      
      <View style={[styles.safeArea, { minHeight: 0 }]}>
        {wizardVisible ? (
          <View style={[styles.wizardContainer, { minHeight: 0 }]}>
            {renderWizard()}
            {renderFooter()}
          </View>
        ) : (
          <>
            <AppHeader 
              title={`Órdenes (${ordenesFiltradas.length})`} 
              showBackButton={false}
              actions={[{ icon: 'log-out-outline', onPress: () => onLogout(), size: 28 }]}
            />
            <View style={styles.container}>
              {/* Filtros como segmented control */}
              <View style={styles.segmentedContainer}>
                {[
                  { key: 'ultimas', label: 'Últimas' },
                  { key: 'hoy', label: 'Hoy' },
                  // Solo mostrar filtro de proveedor si el usuario es ADMIN
                  ...(isAdmin(userData) ? [{ key: 'proveedor', label: 'Proveedor' }] : []),
                  { key: 'todas', label: 'Todas' },
                ].map(f => (
                <TouchableOpacity
                    key={f.key}
                    style={[styles.segmentedBtn, filtro === f.key && styles.segmentedBtnActive,
                      f.key === 'ultimas' && styles.segmentedBtnLeft,
                      f.key === 'todas' && styles.segmentedBtnRight]}
                    onPress={() => handleCambioFiltro(f.key as any)}
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
                      onValueChange={(value) => handleCambioProveedor(value)}
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
                <View style={{ marginTop: 40 }}><Text style={styles.emptyText}>Cargando...</Text></View>
              ) : ordenesFiltradas.length === 0 ? (
                <Text style={styles.emptyText}>No hay órdenes para mostrar.</Text>
              ) : (
                <>
                  <FlatList
                    data={ordenesParaLista}
                    keyExtractor={keyExtractorOrdenes}
                    renderItem={renderOrden}
                    contentContainerStyle={{ paddingBottom: hayMasOrdenes ? 60 : 100 }}
                    initialNumToRender={10}
                    maxToRenderPerBatch={8}
                    windowSize={5}
                    removeClippedSubviews={true}
                  />
                  {hayMasOrdenes && (
                    <View style={{ minHeight: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                      <TouchableOpacity
                        onPress={() => setLimiteMostradas(prev => Math.min(prev + MAX_ORDENES_VISIBLES, ordenesFiltradas.length))}
                        style={{ paddingVertical: 4, paddingHorizontal: 8 }}
                        activeOpacity={0.6}
                      >
                        <Text style={{ color: '#666', fontSize: 13, textDecorationLine: 'underline' }}>
                          Mostrar más{cantidadMas > 0 ? ` (${cantidadMas} más)` : ''}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
                )}
              </View>
            {/* Botón flotante nueva orden (oculto si no hay proveedores para este usuario) */}
            {mostrarBotonNuevaOrden && (
            <TouchableOpacity
              style={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                backgroundColor: '#D7263D',
                borderRadius: 30,
                width: 60,
                height: 60,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
                zIndex: 1000
              }}
              onPress={openWizard}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
            )}
            </>
          )}

        {/* Overlay absoluto para acciones (abierto desde ... del header) */}
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
              {!proveedorSel ? (
                <Text style={{ textAlign: 'center', color: '#888' }}>Selecciona un contacto para ver opciones.</Text>
              ) : (
                <>
                  <View style={{ alignItems: 'center', marginBottom: 25 }}>
                    <View style={{ width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, marginBottom: 20 }} />
                    <Text style={{ fontSize: 18, fontWeight: '600', color: '#333' }}>Acciones de la Orden</Text>
                  </View>

                  {/* Cerrar wizard */}
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#f0f0f0',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12
                    }}
                    onPress={() => {
                      setShowActionsModal(false);
                      closeWizard();
                    }}
                  >
                    <Ionicons name="close-circle-outline" size={26} color="#666" style={{ marginRight: 12 }} />
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>Cerrar sin guardar</Text>
                  </TouchableOpacity>

                  {/* Sección WhatsApp */}
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
                            showLoading();
                            const ordenParaMsg = editOrden ?? {
                              fecha: fechaOrden || obtenerFechaActual(),
                              productos: productosSel.map(p => ({ id: p.id, productoId: p.id, cantidad: p.cantidad, unidad: p.unidad }))
                            };
                            const msg = buildWhatsappMessage(ordenParaMsg as Orden, proveedorSel, productos, usuario);
                            const phone = proveedorSel.celular.toString().replace(/[^\d]/g, '');
                            if (phone.length < 8) {
                              hideLoading();
                              Alert.alert('Error', 'El número de celular debe tener al menos 8 dígitos');
                              return;
                            }
                            const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
                            await Linking.openURL(url);
                            Alert.alert('Éxito', 'Orden enviada por WhatsApp correctamente');
                          } catch (error) {
                            console.error('Error al enviar WhatsApp:', error);
                            Alert.alert('Error', 'No se pudo abrir WhatsApp. Verifica que esté instalado.');
                          } finally {
                            hideLoading();
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
                      const ordenParaReport = editOrden ?? {
                        fecha: fechaOrden || obtenerFechaActual(),
                        productos: productosSel.map(p => ({ id: p.id, productoId: p.id, cantidad: p.cantidad, unidad: p.unidad }))
                      };
                      const msg = buildPrintReport(ordenParaReport as Orden, proveedorSel!, productos, usuario);
                      try {
                        showLoading();
                        await fetch(PRINT_SERVICE_URL, {
                          method: 'POST',
                          headers: { 'Content-Type': 'text/plain' },
                          body: msg,
                        });
                        Alert.alert('Impresión', 'Enviado a imprimir.');
                      } catch (e) {
                        Alert.alert('Error', 'No se pudo enviar a imprimir.');
                      } finally {
                        hideLoading();
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

                  {/* Botón Eliminar - solo en edición */}
                  {editOrden && (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#fff0f0',
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: '#ffcdd2'
                      }}
                      activeOpacity={0.7}
                      onPress={() => {
                        setShowActionsModal(false);
                        Alert.alert(
                          'Eliminar orden',
                          '¿Estás seguro de que deseas eliminar esta orden?',
                          [
                            { text: 'No', style: 'cancel' },
                            { text: 'Eliminar', style: 'destructive', onPress: () => handleDeleteOrden() }
                          ]
                        );
                      }}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#D7263D', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <Ionicons name="trash-outline" size={24} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#D7263D', marginBottom: 2 }}>Eliminar orden</Text>
                        <Text style={{ fontSize: 13, color: '#666' }}>Eliminar esta orden permanentemente</Text>
                      </View>
                    </TouchableOpacity>
                  )}

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
                        const nombreP = (p as any).nombre ?? (p as any).name ?? '';
                        const nombreMatch = containsSearchTerm(nombreP, busquedaProducto);
                        const proveedorMatch = proveedor ? containsSearchTerm(proveedor.nombre, busquedaProducto) : false;
                        return nombreMatch || proveedorMatch;
                      })
                    }
                    keyExtractor={item => item.id}
                    renderItem={renderProducto}
                    style={{ marginTop: 12, maxHeight: 400 }}
                    contentContainerStyle={{ paddingBottom: 12 }}
                  />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                    <TouchableOpacity
                      style={{ flex: 1, padding: 10, backgroundColor: '#D7263D', borderRadius: 5, alignItems: 'center' }}
                      onPress={() => {
                        setShowAddProductoModal(false);
                        setShowCrearProductoTempModal(true);
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: 'bold' }}>Nuevo Producto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, padding: 10, backgroundColor: '#666', borderRadius: 5, alignItems: 'center' }}
                      onPress={() => setShowAddProductoModal(false)}
                    >
                      <Text style={{ color: 'white', fontWeight: 'bold' }}>Cerrar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
          </View>
          </View>
        )}

        {/* DateTimePicker para editar fecha de la orden */}
        {editandoFecha && Platform.OS === 'ios' && (
          <DateTimePicker
            value={(() => {
              try {
                const fechaActual = fechaOrden || obtenerFechaActual();
                if (fechaActual.includes('-')) {
                  const [fechaPart, horaPart] = fechaActual.split(' ');
                  const [dia, mes, año] = fechaPart.split('-');
                  if (horaPart) {
                    const [hora, minuto, segundo] = horaPart.split(':');
                    return new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), parseInt(hora), parseInt(minuto), parseInt(segundo));
                  }
                  return new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
                }
                return new Date(fechaActual);
              } catch {
                return new Date();
              }
            })()}
            mode="datetime"
            is24Hour={true}
            display="default"
            onChange={(event, selectedDate) => {
              // Cerrar el picker siempre
              setEditandoFecha(false);
              setFechaInputText('');
              
              // Solo actualizar si hay una fecha seleccionada
              if (selectedDate) {
                const dia = selectedDate.getDate().toString().padStart(2, '0');
                const mes = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
                const año = selectedDate.getFullYear();
                const hora = selectedDate.getHours().toString().padStart(2, '0');
                const minuto = selectedDate.getMinutes().toString().padStart(2, '0');
                const segundo = selectedDate.getSeconds().toString().padStart(2, '0');
                
                const nuevaFechaTexto = `${dia}-${mes}-${año} ${hora}:${minuto}:${segundo}`;
                setFechaOrden(nuevaFechaTexto);
              }
            }}
          />
        )}

        {/* Toast temporal al final de la pantalla */}
        {toast && (
          <View style={styles.toastBottom} pointerEvents="none">
            <Text style={styles.toastBottomText}>{toast.message}</Text>
          </View>
        )}

        {/* Overlay absoluto para cambiar estado de la orden */}
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
      {/* Modal para agregar producto temporal */}
      <Modal
        visible={showCrearProductoTempModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCrearProductoTempModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 24, width: '85%', maxWidth: 400 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#222', marginBottom: 16, textAlign: 'center' }}>
              Agregar Producto Temporal
            </Text>
            
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>Nombre del Producto:</Text>
              <TextInput
                style={{ 
                  borderWidth: 1, 
                  borderColor: '#ddd', 
                  borderRadius: 8, 
                  padding: 12, 
                  fontSize: 16,
                  color: '#222',
                  backgroundColor: '#f9f9f9',
                  textTransform: 'uppercase'
                }}
                value={nombreProductoTemp}
                onChangeText={setNombreProductoTemp}
                placeholder="Ej: PRODUCTO ESPECIAL"
                placeholderTextColor="#aaa"
                autoCapitalize="characters"
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>Precio:</Text>
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
                value={precioProductoTemp}
                onChangeText={setPrecioProductoTemp}
                placeholder="0.00"
                placeholderTextColor="#aaa"
                keyboardType="numeric"
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>Unidad:</Text>
              <Picker
                selectedValue={unidadProductoTemp}
                onValueChange={(itemValue) => setUnidadProductoTemp(itemValue)}
                style={{ backgroundColor: '#f9f9f9', borderRadius: 8 }}
              >
                {UNIDADES.map((unidad) => (
                  <Picker.Item key={unidad} label={unidad} value={unidad} />
                ))}
              </Picker>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{ 
                  flex: 1, 
                  padding: 12, 
                  backgroundColor: '#ccc', 
                  borderRadius: 8, 
                  alignItems: 'center'
                }}
                onPress={() => {
                  setShowCrearProductoTempModal(false);
                  setNombreProductoTemp('');
                  setPrecioProductoTemp('');
                  setUnidadProductoTemp('UNIDAD');
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ 
                  flex: 1, 
                  padding: 12, 
                  backgroundColor: '#D7263D', 
                  borderRadius: 8, 
                  alignItems: 'center'
                }}
                onPress={() => {
                  if (nombreProductoTemp.trim() && precioProductoTemp.trim()) {
                    // Crear un producto temporal con ID único
                    const productoTempId = `temp_${Date.now()}`;
                    const productoTemp: Producto = {
                      id: productoTempId,
                      nombre: nombreProductoTemp.trim(),
                      proveedorId: proveedorSel?.id || '',
                      unidad: unidadProductoTemp,
                      precio: parseFloat(precioProductoTemp) || 0,
                      archivado: false,
                      temporal: true // Marcar como temporal
                    };
                    
                    // Agregar a la lista de productos temporalmente
                    setProductos([...productos, productoTemp]);
                    
                    // Agregar automáticamente a los productos seleccionados con cantidad 1
                    setProductosSel([...productosSel, {
                      id: productoTempId,
                      cantidad: '1',
                      unidad: unidadProductoTemp
                    }]);
                    
                    // Limpiar y cerrar
                    setShowCrearProductoTempModal(false);
                    setNombreProductoTemp('');
                    setPrecioProductoTemp('');
                    setUnidadProductoTemp('UNIDAD');
                  } else {
                    Alert.alert('Error', 'Por favor ingresa nombre y precio');
                  }
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Modal de confirmación de cancelación */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 24, width: '85%', maxWidth: 400 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#222', marginBottom: 8, textAlign: 'center' }}>
              Cancelar
            </Text>
            <Text style={{ fontSize: 15, color: '#666', marginBottom: 24, textAlign: 'center' }}>
              ¿Estás seguro de que deseas cancelar? Se perderán todos los cambios.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, backgroundColor: '#ccc', borderRadius: 8, alignItems: 'center' }}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, backgroundColor: '#D7263D', borderRadius: 8, alignItems: 'center' }}
                onPress={() => {
                  setShowCancelModal(false);
                  closeWizard();
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Sí</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    );
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
    padding: 8,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 0,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  proveedor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  cardPropText: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'normal',
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
    minHeight: 0,
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
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'transparent',
    flexShrink: 0,
    flexGrow: 0,
    flexBasis: 'auto',
    width: 'auto',
    maxWidth: 'none',
  },
  actionButtonPrimary: {
    backgroundColor: '#D7263D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  actionButtonSecondary: {
    flex: 0,
    minWidth: 40,
    backgroundColor: 'transparent',
  },
  floatingMenuButton: {
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minWidth: 56,
    borderWidth: 2,
    borderColor: '#D7263D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
    flexShrink: 0,
    flex: 0,
    flexGrow: 0,
    flexBasis: 'auto',
    numberOfLines: 1,
    width: 'auto',
    maxWidth: 'none',
    lineHeight: 16,
  },
  actionButtonIcon: {
    flexShrink: 0,
    flexGrow: 0,
    flexBasis: 'auto',
    width: 'auto',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    flexShrink: 0,
    flexGrow: 0,
    flexBasis: 'auto',
    width: 'auto',
    maxWidth: 'none',
    gap: 4,
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