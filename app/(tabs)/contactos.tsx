import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useRouter } from 'expo-router'; // Removed to fix filename error
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TabRestrictedAccess from '../../components/TabRestrictedAccess';
import { useUser } from '../../components/UserContext';
import { Colors } from '../../constants/Colors';
import { canAccessTab, deleteProveedor, getOrdenes, getProductos, getProductosDefaultCliente, getProveedores, logEvento, Producto, Proveedor, saveProveedor, updateProductosDefaultCliente, updateProveedor } from '../../services/firebaseUnified';
import { containsSearchTerm } from '../../utils/searchUtils';

type ProveedorWithCelular = Proveedor & { celular?: string; tipo?: string; salarioPorDia?: number };

function Header({ title, onBack, onAdd, showBackButton = true }: { 
  title: string, 
  onBack?: () => void,
  onAdd?: () => void,
  showBackButton?: boolean
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[
      styles.header,
      {
        paddingTop: insets.top + 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
      },
    ]}>
      <StatusBar backgroundColor={Colors.tint} barStyle="light-content" />
      {showBackButton && onBack ? (
        <TouchableOpacity onPress={onBack} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
      <Text style={styles.headerText}>{title}</Text>
      {onAdd ? (
        <TouchableOpacity onPress={onAdd} style={{ marginLeft: 12 }}>
          <Ionicons name="add-circle" size={32} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
    </View>
  );
}

const FRECUENCIAS = [
  { label: 'Por Día', value: 'dia' },
  { label: 'Por Semana', value: 'semana' },
  { label: 'Por Quincena', value: 'quincena' },
  { label: 'Por Mes', value: 'mes' },
];
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_MES = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

// Componente para mostrar productos predeterminados de un cliente
function ProductosPredeterminadosView({ 
  productosDefault, 
  productos 
}: { 
  productosDefault: Array<{ productoId: string; cantidad: string; unidad: string }>; 
  productos: Producto[] 
}) {
  console.log('🔄 ProductosPredeterminadosView renderizando');
  console.log('📋 Productos predeterminados recibidos:', productosDefault.length);
  console.log('📋 Detalle productos predeterminados:', productosDefault);
  console.log('📦 Total productos disponibles:', productos.length);

  return (
    <View style={{ 
      borderWidth: 1, 
      borderColor: '#eee', 
      borderRadius: 6, 
      backgroundColor: '#f9f9f9',
      minHeight: 100,
      maxHeight: 200
    }}>
      <ScrollView style={{ padding: 8 }}>
        {productosDefault.map(item => {
          const producto = productos.find(p => p.id === item.productoId);
          return (
            <View
              key={item.productoId}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 8,
                backgroundColor: '#e8f5e8',
                borderRadius: 6,
                marginBottom: 6
              }}
            >
              <Ionicons name="list-outline" size={16} color="#4CAF50" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold' }}>{producto?.nombre || 'Producto no encontrado'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Text style={{ fontSize: 11, color: '#666', marginRight: 8 }}>
                    Cantidad: {item.cantidad} {item.unidad}
                  </Text>
                  {producto && (
                    <Text style={{ fontSize: 11, color: '#007AFF', fontWeight: 'bold' }}>
                      ${producto.precio}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}
        {productosDefault.length === 0 && (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Ionicons name="list-outline" size={48} color="#ccc" style={{ marginBottom: 12 }} />
            <Text style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', fontSize: 14, marginBottom: 8 }}>
              No hay productos predeterminados configurados
            </Text>
            <Text style={{ textAlign: 'center', color: '#999', fontSize: 12, marginBottom: 12 }}>
              Configura los productos que este cliente suele pedir
            </Text>
            <View style={{
              backgroundColor: '#4CAF50',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <Ionicons name="arrow-up" size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                Usa "Gestionar" arriba
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Componente para mostrar productos directamente asociados a un proveedor/productor
function ProductosDirectosView({ proveedorId, productos }: { proveedorId: string; productos: Producto[] }) {
  const productosRelacionados = productos.filter(p => p.proveedorId === proveedorId);

  return (
    <View style={{ 
      borderWidth: 1, 
      borderColor: '#eee', 
      borderRadius: 6, 
      backgroundColor: '#f9f9f9',
      minHeight: 100,
      maxHeight: 200
    }}>
      <ScrollView style={{ padding: 8 }}>
        {productosRelacionados.map(producto => (
          <View
            key={producto.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 8,
              backgroundColor: '#fff',
              borderRadius: 6,
              marginBottom: 6
            }}
          >
            <Ionicons name="cube-outline" size={16} color="#D7263D" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold' }}>{producto.nombre}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Text style={{ fontSize: 11, color: '#666', marginRight: 8 }}>
                  Stock: {producto.stock} {producto.unidad}
                </Text>
                <Text style={{ fontSize: 11, color: '#007AFF', fontWeight: 'bold' }}>
                  ${producto.precio}
                </Text>
              </View>
            </View>
            {producto.archivado && (
              <View style={{ 
                backgroundColor: '#ff6b6b', 
                paddingHorizontal: 4, 
                paddingVertical: 2, 
                borderRadius: 4 
              }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>
                  ARCHIVADO
                </Text>
              </View>
            )}
            {producto.fueraDeTemporada && (
              <View style={{ 
                backgroundColor: '#ffc107', 
                paddingHorizontal: 4, 
                paddingVertical: 2, 
                borderRadius: 4,
                marginLeft: 4
              }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>
                  TEMPORADA
                </Text>
              </View>
            )}
          </View>
        ))}
        {productosRelacionados.length === 0 && (
          <Text style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', marginTop: 20 }}>
            No hay productos relacionados con este contacto
          </Text>
        )}
      </ScrollView>
    </View>
  );
}


export default function ProveedoresScreen() {
  const { userData } = useUser();
  const insets = useSafeAreaInsets();

  // Verificar si el usuario tiene permisos para acceder a contactos
  if (!userData || !canAccessTab(userData, 'contactos')) {
    return <TabRestrictedAccess tabName="contactos" />;
  }

  // const router = useRouter(); // Removed to fix filename error
  const [showResumen, setShowResumen] = useState(false);
  const [contactoResumen, setContactoResumen] = useState<ProveedorWithCelular | null>(null);
  const [proveedores, setProveedores] = useState<ProveedorWithCelular[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [frecuenciaTipo, setFrecuenciaTipo] = useState('');
  const [frecuenciaValor, setFrecuenciaValor] = useState('');
  const [frecuenciaExtra, setFrecuenciaExtra] = useState<string | string[]>('');
  const [frecuenciaExtra2, setFrecuenciaExtra2] = useState('');
  const [error, setError] = useState(false);
  const [filtroSegmento, setFiltroSegmento] = useState<'todos' | 'nombre' | 'tipo'>('todos');
  const [filtroNombre, setFiltroNombre] = useState('');
  const [proveedorEditando, setProveedorEditando] = useState<string | null>(null);
  const [showFrecuenciaModal, setShowFrecuenciaModal] = useState(false);
  const [showDiaModal, setShowDiaModal] = useState(false);
  const [celular, setCelular] = useState('');
  const [mostrarConfirmacionEliminar, setMostrarConfirmacionEliminar] = useState<string | null>(null);
  const swipeableRefs = useRef<{ [key: string]: any }>({});
  const [tipo, setTipo] = useState('Proveedor');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'Proveedor' | 'Cliente' | 'Productor'>('todos');
  const [salarioPorDia, setSalarioPorDia] = useState('');
  const [showProductosDefaultModal, setShowProductosDefaultModal] = useState(false);
  const [clienteProductosDefault, setClienteProductosDefault] = useState<ProveedorWithCelular | null>(null);
  const [productosDefault, setProductosDefault] = useState<Array<{ productoId: string; cantidad: string; unidad: string }>>([]);
  const [volverAEditarContacto, setVolverAEditarContacto] = useState(false);
  const [filtroProductosDisponibles, setFiltroProductosDisponibles] = useState('');
  const [productosDefaultFormulario, setProductosDefaultFormulario] = useState<Array<{ productoId: string; cantidad: string; unidad: string }>>([]);
  const [conteoProductosRelacionados, setConteoProductosRelacionados] = useState<Record<string, number>>({});

  useEffect(() => {
    getProveedores((proveedoresData) => {
      setProveedores(proveedoresData);
    });
    getProductos((productosData) => {
      setProductos(productosData);
    });
    // Obtener órdenes
    if (typeof getOrdenes === 'function') {
      getOrdenes((ordenesData: any[]) => {
        setOrdenes(ordenesData);
      });
    }
  }, []);

  // Cargar productos predeterminados cuando se edita un cliente
  useEffect(() => {
    console.log('🔄 useEffect productos predeterminados ejecutado');
    console.log('📊 Estado actual:', { proveedorEditando, tipo });
    
    const cargarProductosDefaultFormulario = async () => {
      if (proveedorEditando && tipo === 'Cliente') {
        try {
          console.log('✅ Condiciones cumplidas, cargando productos predeterminados para:', proveedorEditando);
          const productosDefault = await getProductosDefaultCliente(proveedorEditando);
          console.log('📋 Productos predeterminados obtenidos:', productosDefault.length);
          console.log('📋 Detalle productos:', productosDefault);
          setProductosDefaultFormulario(productosDefault);
          console.log('✅ Estado productosDefaultFormulario actualizado');
        } catch (error) {
          console.error('❌ Error cargando productos predeterminados para formulario:', error);
          setProductosDefaultFormulario([]);
        }
      } else {
        console.log('🚫 Condiciones no cumplidas para cargar productos predeterminados');
        setProductosDefaultFormulario([]);
      }
    };

    cargarProductosDefaultFormulario();
  }, [proveedorEditando, tipo]);

  // Calcular conteo de productos relacionados para todos los contactos
  useEffect(() => {
    const calcularConteoProductos = async () => {
      const conteos: Record<string, number> = {};
      
      for (const proveedor of proveedores) {
        if (proveedor.tipo === 'Cliente') {
          // Para clientes: contar productos predeterminados
          try {
            const productosDefault = await getProductosDefaultCliente(proveedor.id);
            conteos[proveedor.id] = productosDefault.length;
          } catch (error) {
            conteos[proveedor.id] = 0;
          }
        } else {
          // Para proveedores/productores: contar productos directamente asociados
          conteos[proveedor.id] = productos.filter((p: Producto) => p.proveedorId === proveedor.id).length;
        }
      }
      
      setConteoProductosRelacionados(conteos);
      console.log('📊 Conteo de productos relacionados calculado:', conteos);
    };

    if (proveedores.length > 0 && productos.length > 0) {
      calcularConteoProductos();
    }
  }, [proveedores, productos]);

  const editarProveedor = (proveedor: ProveedorWithCelular) => {
    setNombre(proveedor.nombre);
    if (proveedor.celular && proveedor.celular.startsWith('+598')) {
      setCelular(proveedor.celular.slice(4));
    } else {
      setCelular(proveedor.celular || '');
    }
    setTipo(proveedor.tipo || 'Proveedor');
    setSalarioPorDia(proveedor.salarioPorDia ? proveedor.salarioPorDia.toString() : '');
    if (proveedor.frecuencia) {
      setFrecuenciaTipo(proveedor.frecuencia.tipo);
      setFrecuenciaValor(proveedor.frecuencia.valor);
      if (Array.isArray(proveedor.frecuencia.diasSemana)) {
        setFrecuenciaExtra(proveedor.frecuencia.diasSemana);
      } else if (typeof proveedor.frecuencia.diaSemana === 'string') {
        setFrecuenciaExtra([proveedor.frecuencia.diaSemana]);
      } else if (proveedor.frecuencia.diaMes) {
        setFrecuenciaExtra(proveedor.frecuencia.diaMes);
      } else {
        setFrecuenciaExtra('');
      }
    } else {
      setFrecuenciaTipo('');
      setFrecuenciaValor('');
      setFrecuenciaExtra('');
    }
    setProveedorEditando(proveedor.id);
    setShowForm(true);
  };

  const getResponsableOrAlert = async () => {
    const responsable = (await AsyncStorage.getItem('responsableApp'))?.trim() || '';
    if (!responsable) {
      Alert.alert('Configuración requerida', 'Debe configurar el nombre del responsable en el engranaje de configuración antes de realizar esta acción.');
      return null;
    }
    return responsable;
  };

  const calcularResumenContacto = (contacto: ProveedorWithCelular) => {
    const ordenesContacto = ordenes.filter((o: any) => o.proveedorId === contacto.id);
    
    // Obtener conteo correcto de productos según el tipo
    const totalProductos = contacto.tipo === 'Cliente' 
      ? conteoProductosRelacionados[contacto.id] || 0  // Productos predeterminados
      : productos.filter((p: Producto) => p.proveedorId === contacto.id).length; // Productos directos
    
    console.log('Analizando contacto:', { 
      nombre: contacto.nombre, 
      id: contacto.id, 
      totalOrdenes: ordenesContacto.length,
      totalProductos: totalProductos,
      tipo: contacto.tipo
    });
    
    // Calcular valores de órdenes
    const valoresOrdenes = ordenesContacto.map((o: any) => {
      const total = (o.productos || []).reduce((sum: number, p: any) => {
        // Buscar el producto en la lista de productos para obtener el precio
        const productoInfo = productos.find((prod: Producto) => prod.id === p.productoId);
        const precio = productoInfo?.precio || 0;
        const cantidad = Number(p.cantidad) || 0;
        const subtotal = Number(precio) * cantidad;
        console.log('Calculando producto:', { 
          productoId: p.productoId, 
          productoNombre: productoInfo?.nombre, 
          precio, 
          cantidad: p.cantidad, 
          subtotal,
          tienePrecio: productoInfo?.precio !== undefined && productoInfo?.precio !== null
        });
        return sum + subtotal;
      }, 0);
      console.log('Total de orden:', total, 'Productos en orden:', o.productos?.length || 0);
      return total;
    }).filter(valor => valor > 0);

    const resumen = {
      totalOrdenes: ordenesContacto.length,
      totalProductos: totalProductos,
      valorMaximo: valoresOrdenes.length > 0 ? Math.max(...valoresOrdenes) : 0,
      valorMinimo: valoresOrdenes.length > 0 ? Math.min(...valoresOrdenes) : 0,
      valorPromedio: valoresOrdenes.length > 0 ? valoresOrdenes.reduce((a, b) => a + b, 0) / valoresOrdenes.length : 0,
      esProductor: contacto.tipo === 'Productor',
      salarioPorDia: contacto.salarioPorDia || 0,
      proporcionSalario: 0
    };

    // Calcular proporción para productores
    if (resumen.esProductor && resumen.valorPromedio > 0) {
      if (resumen.salarioPorDia > 0) {
        resumen.proporcionSalario = (resumen.salarioPorDia / resumen.valorPromedio) * 100;
      } else {
        resumen.proporcionSalario = 100; // Si no tiene salario definido, es 100%
      }
    }

    console.log('Resumen del contacto:', resumen);
    return resumen;
  };

  const mostrarResumenContacto = (contacto: ProveedorWithCelular) => {
    setContactoResumen(contacto);
    setShowResumen(true);
  };

  // Función para abrir modal de productos predeterminados
  const abrirProductosDefault = async (cliente: ProveedorWithCelular) => {
    try {
      console.log('🔄 Abriendo productos predeterminados para cliente:', cliente.nombre);
      console.log('👤 Cliente ID:', cliente.id);
      console.log('📦 Total productos en sistema:', productos.length);
      
      // Preparar datos primero
      setClienteProductosDefault(cliente);
      setVolverAEditarContacto(true);
      
      // Cargar productos predeterminados
      const productosDefault = await getProductosDefaultCliente(cliente.id);
      console.log('📋 Productos predeterminados cargados:', productosDefault.length);
      console.log('📋 Productos predeterminados detalle:', productosDefault);
      setProductosDefault(productosDefault);
      
      // Transición suave: abrir modal de productos primero, luego cerrar edición
      setShowProductosDefaultModal(true);
      
      // Pequeño delay para que se vea la transición
      setTimeout(() => {
        setShowForm(false);
      }, 100);
      
      console.log('✅ Modal de productos predeterminados abierto');
    } catch (error) {
      console.error('❌ Error cargando productos predeterminados:', error);
      Alert.alert('Error', 'No se pudieron cargar los productos predeterminados');
    }
  };

  // Función para guardar productos predeterminados
  const guardarProductosDefault = async () => {
    if (!clienteProductosDefault) return;
    
    try {
      await updateProductosDefaultCliente(clienteProductosDefault.id, productosDefault);
      
      // Actualizar también el estado del formulario
      setProductosDefaultFormulario([...productosDefault]);
      
      // Actualizar el conteo en la lista de contactos
      setConteoProductosRelacionados(prev => ({
        ...prev,
        [clienteProductosDefault.id]: productosDefault.length
      }));
      
      console.log('✅ Estado del formulario y conteo actualizados con productos guardados');
      
      Alert.alert('Éxito', 'Productos predeterminados guardados correctamente');
      cerrarModalProductosDefault();
    } catch (error) {
      console.error('Error guardando productos predeterminados:', error);
      Alert.alert('Error', 'No se pudieron guardar los productos predeterminados');
    }
  };

  // Función para cerrar modal de productos y volver a edición
  const cerrarModalProductosDefault = () => {
    // Si se debe volver al modal de edición, hacerlo primero
    if (volverAEditarContacto) {
      setShowForm(true);
      
      // Pequeño delay antes de cerrar el modal de productos para transición suave
      setTimeout(() => {
        setShowProductosDefaultModal(false);
        setClienteProductosDefault(null);
        setProductosDefault([]);
        setFiltroProductosDisponibles(''); // Limpiar filtro
        setVolverAEditarContacto(false);
      }, 150);
    } else {
      // Si no hay que volver, cerrar directamente
      setShowProductosDefaultModal(false);
      setClienteProductosDefault(null);
      setProductosDefault([]);
      setFiltroProductosDisponibles(''); // Limpiar filtro
    }
  };

  // Función para agregar producto a la lista predeterminada
  const agregarProductoDefault = (producto: Producto) => {
    const yaExiste = productosDefault.some(p => p.productoId === producto.id);
    if (!yaExiste) {
      setProductosDefault(prev => [...prev, {
        productoId: producto.id,
        cantidad: '1',
        unidad: producto.unidad
      }]);
    }
  };

  // Función para remover producto de la lista predeterminada
  const removerProductoDefault = (productoId: string) => {
    setProductosDefault(prev => prev.filter(p => p.productoId !== productoId));
  };

  // Función para actualizar cantidad de producto predeterminado
  const actualizarCantidadDefault = (productoId: string, cantidad: string) => {
    setProductosDefault(prev => prev.map(p => 
      p.productoId === productoId ? { ...p, cantidad } : p
    ));
  };

  // Función para obtener productos relacionados según el tipo de contacto
  const getProductosRelacionados = async (contacto: ProveedorWithCelular): Promise<number> => {
    if (contacto.tipo === 'Cliente') {
      // Para clientes: contar productos predeterminados
      try {
        const productosDefault = await getProductosDefaultCliente(contacto.id);
        return productosDefault.length;
      } catch (error) {
        console.error('Error obteniendo productos predeterminados para conteo:', error);
        return 0;
      }
    } else {
      // Para proveedores/productores: contar productos directamente asociados
      return productos.filter((p: Producto) => p.proveedorId === contacto.id).length;
    }
  };

  // Función para filtrar productos disponibles
  const filtrarProductosDisponibles = () => {
    const productosNoSeleccionados = productos.filter(p => !productosDefault.some(pd => pd.productoId === p.id));
    const productosFiltrados = productosNoSeleccionados.filter(p => 
      !filtroProductosDisponibles.trim() || 
      p.nombre?.toLowerCase().includes(filtroProductosDisponibles.toLowerCase()) ||
      p.id?.toLowerCase().includes(filtroProductosDisponibles.toLowerCase())
    );
    
    console.log('🔍 Filtrado de productos disponibles:');
    console.log('📦 Total productos:', productos.length);
    console.log('✅ Productos predeterminados:', productosDefault.length);
    console.log('📋 Productos no seleccionados:', productosNoSeleccionados.length);
    console.log('🔍 Productos filtrados:', productosFiltrados.length);
    console.log('🔍 Filtro actual:', filtroProductosDisponibles);
    
    return productosFiltrados;
  };

  const agregarProveedor = async () => {
    const responsable = await getResponsableOrAlert();
    if (!responsable) return;
    if (!nombre.trim()) {
      setError(true);
      return;
    }
    // Si el celular está presente, debe ser válido
    if (celular && (celular.length !== 8 || !/^[0-9]{8}$/.test(celular))) {
      setError(true);
      return;
    }
    setError(false);
    let frecuencia: any = undefined;
    if (frecuenciaTipo && frecuenciaValor) {
      frecuencia = { tipo: frecuenciaTipo, valor: frecuenciaValor };
      if (frecuenciaTipo === 'semana') frecuencia.diasSemana = Array.isArray(frecuenciaExtra) ? frecuenciaExtra : frecuenciaExtra ? [frecuenciaExtra] : [];
      if (frecuenciaTipo === 'mes') frecuencia.diaMes = frecuenciaExtra;
    }
    const celularCompleto = celular ? '+598' + celular : undefined;
    // Construir objeto solo con campos definidos
    const proveedorData: any = { nombre, tipo };
    if (frecuencia) proveedorData.frecuencia = frecuencia;
    if (celularCompleto) proveedorData.celular = celularCompleto;
    if (tipo === 'Productor' && salarioPorDia.trim()) {
      const salario = parseFloat(salarioPorDia);
      if (!isNaN(salario) && salario > 0) {
        proveedorData.salarioPorDia = salario;
      }
    }
    try {
      let id = proveedorEditando;
      if (proveedorEditando) {
        // Obtener datos existentes del proveedor para preservar campos como productosDefault
        const proveedorExistente = proveedores.find(p => p.id === proveedorEditando);
        
        // Combinar datos existentes con nuevos datos
        const proveedorCompleto = {
          ...proveedorExistente, // Preservar campos existentes
          ...proveedorData,      // Aplicar cambios del formulario
          id: proveedorEditando,
          updatedAt: new Date().toISOString()
        };
        
        console.log('🔄 Actualizando proveedor con datos completos:', proveedorCompleto);
        await updateProveedor(proveedorEditando, proveedorCompleto as ProveedorWithCelular);
      } else {
        id = await saveProveedor(proveedorData as ProveedorWithCelular);
      }
      // Registrar evento
      await logEvento({ tipoEvento: proveedorEditando ? 'actualizacion_proveedor' : 'creacion_proveedor', responsable, idAfectado: (proveedorEditando || id || ''), datosJSON: proveedorData });
      setNombre('');
      setCelular('');
      setTipo('Proveedor');
      setSalarioPorDia('');
      setFrecuenciaTipo('');
      setFrecuenciaValor('');
      setFrecuenciaExtra('');
      setFrecuenciaExtra2('');
      setProveedorEditando(null);
      setShowForm(false);
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo guardar el proveedor: ' + (e?.message || e));
    }
  };

  const eliminarProveedorHandler = (id: string) => {
    // Verificar si hay productos asociados
    const tieneProductos = productos.some((p: Producto) => p.proveedorId === id);
    if (tieneProductos) {
      Alert.alert('No permitido', 'No puedes eliminar un proveedor que tiene productos asociados.');
      return;
    }
    Alert.alert('Eliminar', '¿Seguro que deseas eliminar este proveedor?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        const responsable = await getResponsableOrAlert();
        if (!responsable) return;
        await deleteProveedor(id);
        await logEvento({ tipoEvento: 'eliminacion_proveedor', responsable, idAfectado: id, datosJSON: {} });
      }}
    ]);
  };

  // Filtrado de proveedores según segmento
  let contactosFiltrados = proveedores;
  if (filtroSegmento === 'tipo' && filtroTipo !== 'todos') {
    contactosFiltrados = contactosFiltrados.filter(c => c.tipo && c.tipo === filtroTipo);
  }
  if (filtroSegmento === 'nombre' && filtroNombre.trim()) {
    contactosFiltrados = contactosFiltrados.filter(p => containsSearchTerm(p.nombre, filtroNombre));
  }

  // --- Formulario ---
  if (showForm) {
    return (
      <View style={styles.safeArea}>
        <Header title={proveedorEditando ? "Editar contacto" : "Nuevo contacto"} />
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Nombre <Text style={{ color: '#FF3B30' }}>*</Text></Text>
          <TextInput
            style={[styles.input, error && !nombre.trim() && styles.inputError]}
            placeholder="Ej: Distribuidora S.A."
            value={nombre}
            onChangeText={t => { setNombre(t); setError(false); }}
            placeholderTextColor="#aaa"
            autoCapitalize="characters"
          />
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>Tipo de contacto <Text style={{ color: '#FF3B30' }}>*</Text></Text>
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
              {['Proveedor', 'Cliente', 'Productor'].map((op) => (
                <TouchableOpacity
                  key={op}
                  style={{
                    backgroundColor: tipo === op ? '#D7263D' : '#f0f0f0',
                    borderRadius: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    marginRight: 8,
                  }}
                  onPress={() => setTipo(op)}
                >
                  <Text style={{ color: tipo === op ? '#fff' : '#333', fontWeight: 'bold' }}>{op}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={styles.label}>Celular</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ backgroundColor: '#eee', borderTopLeftRadius: 8, borderBottomLeftRadius: 8, paddingHorizontal: 10, height: 44, justifyContent: 'center', borderWidth: 1, borderColor: error && (celular.length !== 8) ? '#FF3B30' : '#ccc', borderRightWidth: 0 }}>
              <Text style={{ color: '#888', fontSize: 17 }}>+598</Text>
            </View>
            <TextInput
              style={[styles.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeftWidth: 0 }, error && (celular.length !== 8) && styles.inputError]}
              placeholder="Ej: 98765432"
              value={celular}
              onChangeText={t => {
                setCelular(t.replace(/[^0-9]/g, '').slice(0, 8));
                setError(false);
              }}
              keyboardType="numeric"
              maxLength={8}
              placeholderTextColor="#aaa"
            />
          </View>
          {tipo === 'Productor' && (
            <View>
              <Text style={styles.label}>Salario por día (UYU)</Text>
              <TextInput
                style={[styles.input, error && salarioPorDia.trim() && isNaN(parseFloat(salarioPorDia)) && styles.inputError]}
                placeholder="Ej: 1500"
                value={salarioPorDia}
                onChangeText={t => { 
                  setSalarioPorDia(t.replace(/[^0-9.]/g, '')); 
                  setError(false); 
                }}
                keyboardType="numeric"
                placeholderTextColor="#aaa"
              />
            </View>
          )}
          <Text style={styles.label}>Frecuencia</Text>
          <TouchableOpacity
            style={[styles.pickerWrapper, error && !frecuenciaTipo && styles.inputError, { flexDirection: 'row', alignItems: 'center' }]}
            onPress={() => setShowFrecuenciaModal(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pickerText, { flex: 1, color: frecuenciaTipo ? '#222' : '#aaa', fontWeight: frecuenciaTipo ? 'bold' : 'normal' }]}
              numberOfLines={1}
            >
              {frecuenciaTipo ? (FRECUENCIAS.find(f => f.value === frecuenciaTipo)?.label) : 'Seleccione frecuencia...'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#888" />
          </TouchableOpacity>
          <Modal
            visible={showFrecuenciaModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowFrecuenciaModal(false)}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 18, width: '85%', maxHeight: '60%' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#D7263D', marginBottom: 12 }}>Selecciona frecuencia</Text>
                <ScrollView>
                  {FRECUENCIAS.map(f => (
                    <TouchableOpacity
                      key={f.value}
                      style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                      onPress={() => {
                        setFrecuenciaTipo(f.value);
                        setFrecuenciaValor('');
                        setFrecuenciaExtra('');
                        setError(false);
                        setShowFrecuenciaModal(false);
                      }}
                    >
                      <Text style={{ color: '#222', fontSize: 16, fontWeight: 'bold' }}>{f.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={{ flex: 1, padding: 10, backgroundColor: '#D7263D', borderRadius: 5, alignItems: 'center' }}
                    onPress={() => {
                      setFrecuenciaTipo('');
                      setFrecuenciaValor('');
                      setFrecuenciaExtra('');
                      setError(false);
                      setShowFrecuenciaModal(false);
                    }}
                  >
                    <Text style={{ color: 'white' }}>Limpiar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, padding: 10, backgroundColor: '#666', borderRadius: 5, alignItems: 'center' }}
                    onPress={() => setShowFrecuenciaModal(false)}
                  >
                    <Text style={{ color: 'white' }}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          {/* Campos adicionales según frecuencia */}
          {frecuenciaTipo === 'dia' && (
            <View>
              <Text style={styles.label}>Cada cuántos días</Text>
              <TextInput
                style={[styles.input, error && !frecuenciaValor.trim() && styles.inputError]}
                placeholder="Ej: 3"
                value={frecuenciaValor}
                onChangeText={t => { setFrecuenciaValor(t.replace(/[^0-9]/g, '')); setError(false); }}
                keyboardType="numeric"
                placeholderTextColor="#aaa"
              />
            </View>
          )}
          {frecuenciaTipo === 'semana' && (
            <View>
              <Text style={styles.label}>Cada cuántas semanas</Text>
              <TextInput
                style={[styles.input, error && !frecuenciaValor.trim() && styles.inputError]}
                placeholder="Ej: 2"
                value={frecuenciaValor}
                onChangeText={t => { setFrecuenciaValor(t.replace(/[^0-9]/g, '')); setError(false); }}
                keyboardType="numeric"
                placeholderTextColor="#aaa"
              />
              <Text style={styles.label}>Días de la semana</Text>
              <TouchableOpacity
                style={[styles.pickerWrapper, error && (!frecuenciaExtra || (Array.isArray(frecuenciaExtra) && frecuenciaExtra.length === 0)) && styles.inputError, { flexDirection: 'row', alignItems: 'center' }]}
                onPress={() => setShowDiaModal(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.pickerText, { flex: 1, color: frecuenciaExtra && (Array.isArray(frecuenciaExtra) ? frecuenciaExtra.length > 0 : frecuenciaExtra) ? '#222' : '#aaa', fontWeight: (frecuenciaExtra && (Array.isArray(frecuenciaExtra) ? frecuenciaExtra.length > 0 : frecuenciaExtra)) ? 'bold' : 'normal' }]}
                  numberOfLines={1}
                >
                  {Array.isArray(frecuenciaExtra) && frecuenciaExtra.length > 0
                    ? frecuenciaExtra.join(', ')
                    : typeof frecuenciaExtra === 'string' && frecuenciaExtra
                      ? frecuenciaExtra
                      : 'Seleccione días...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#888" />
              </TouchableOpacity>
              <Modal
                visible={showDiaModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDiaModal(false)}
              >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
                  <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 18, width: '85%', maxHeight: '60%' }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#D7263D', marginBottom: 12 }}>Selecciona días</Text>
                    <ScrollView>
                      {DIAS_SEMANA.map(d => {
                        const selected = Array.isArray(frecuenciaExtra) ? frecuenciaExtra.includes(d) : frecuenciaExtra === d;
                        return (
                          <TouchableOpacity
                            key={d}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                            onPress={() => {
                              if (Array.isArray(frecuenciaExtra)) {
                                if (frecuenciaExtra.includes(d)) {
                                  setFrecuenciaExtra(frecuenciaExtra.filter(x => x !== d));
                                } else {
                                  setFrecuenciaExtra([...frecuenciaExtra, d]);
                                }
                              } else {
                                setFrecuenciaExtra([d]);
                              }
                            }}
                          >
                            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D7263D', marginRight: 10, backgroundColor: selected ? '#D7263D' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                              {selected && <Ionicons name="checkmark" size={16} color="#fff" />}
                            </View>
                            <Text style={{ color: '#222', fontSize: 16, fontWeight: 'bold' }}>{d}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                      <TouchableOpacity
                        style={{ flex: 1, padding: 10, backgroundColor: '#D7263D', borderRadius: 5, alignItems: 'center' }}
                        onPress={() => {
                          setFrecuenciaExtra([]);
                          setError(false);
                          setShowDiaModal(false);
                        }}
                      >
                        <Text style={{ color: 'white' }}>Limpiar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, padding: 10, backgroundColor: '#666', borderRadius: 5, alignItems: 'center' }}
                        onPress={() => setShowDiaModal(false)}
                      >
                        <Text style={{ color: 'white' }}>Cerrar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </View>
          )}
          {frecuenciaTipo === 'quincena' && (
            <View>
              <Text style={styles.label}>Cada cuántas quincenas</Text>
              <TextInput
                style={[styles.input, error && !frecuenciaValor.trim() && styles.inputError]}
                placeholder="Ej: 1"
                value={frecuenciaValor}
                onChangeText={t => { setFrecuenciaValor(t.replace(/[^0-9]/g, '')); setError(false); }}
                keyboardType="numeric"
                placeholderTextColor="#aaa"
              />
            </View>
          )}
          {frecuenciaTipo === 'mes' && (
            <View>
              <Text style={styles.label}>Cada cuántos meses</Text>
              <TextInput
                style={[styles.input, error && !frecuenciaValor.trim() && styles.inputError]}
                placeholder="Ej: 1"
                value={frecuenciaValor}
                onChangeText={t => { setFrecuenciaValor(t.replace(/[^0-9]/g, '')); setError(false); }}
                keyboardType="numeric"
                placeholderTextColor="#aaa"
              />
              <Text style={styles.label}>Día del mes</Text>
              <TouchableOpacity
                style={[styles.pickerWrapper, error && !frecuenciaExtra && styles.inputError, { flexDirection: 'row', alignItems: 'center' }]}
                onPress={() => setShowDiaModal(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.pickerText, { flex: 1, color: frecuenciaExtra ? '#222' : '#aaa', fontWeight: frecuenciaExtra ? 'bold' : 'normal' }]}
                  numberOfLines={1}
                >
                  {frecuenciaExtra || 'Seleccione día...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#888" />
              </TouchableOpacity>
              <Modal
                visible={showDiaModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDiaModal(false)}
              >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
                  <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 18, width: '85%', maxHeight: '60%' }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#D7263D', marginBottom: 12 }}>Selecciona día</Text>
                    <ScrollView>
                      {DIAS_MES.map(d => (
                        <TouchableOpacity
                          key={d}
                          style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                          onPress={() => {
                            setFrecuenciaExtra(d);
                            setError(false);
                            setShowDiaModal(false);
                          }}
                        >
                          <Text style={{ color: '#222', fontSize: 16, fontWeight: 'bold' }}>{d}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                      <TouchableOpacity
                        style={{ flex: 1, padding: 10, backgroundColor: '#D7263D', borderRadius: 5, alignItems: 'center' }}
                        onPress={() => {
                          setFrecuenciaExtra('');
                          setError(false);
                          setShowDiaModal(false);
                        }}
                      >
                        <Text style={{ color: 'white' }}>Limpiar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, padding: 10, backgroundColor: '#666', borderRadius: 5, alignItems: 'center' }}
                        onPress={() => setShowDiaModal(false)}
                      >
                        <Text style={{ color: 'white' }}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </View>
          )}

          {/* Sección de productos relacionados */}
          {proveedorEditando && (
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={styles.label}>
                  {tipo === 'Cliente' ? 'Productos Predeterminados' : 'Productos Relacionados'}
                </Text>
                {tipo === 'Cliente' && (
                  <TouchableOpacity
                    onPress={() => {
                      console.log('🔄 Botón Gestionar presionado');
                      console.log('📊 Estado actual:', { proveedorEditando, tipo, nombre });
                      
                      // Crear cliente con datos actuales del formulario
                      const clienteData: ProveedorWithCelular = {
                        id: proveedorEditando || 'temp-id',
                        nombre: nombre || 'Cliente Temporal',
                        tipo: 'Cliente',
                        celular: celular,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      };
                      
                      console.log('📋 Datos del cliente preparados:', clienteData);
                      abrirProductosDefault(clienteData);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#4CAF50',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6
                    }}
                  >
                    <Ionicons name="list-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                      Gestionar
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {tipo === 'Cliente' ? (
                // Para clientes: mostrar productos predeterminados
                <ProductosPredeterminadosView 
                  productosDefault={productosDefaultFormulario}
                  productos={productos}
                />
              ) : (
                // Para proveedores/productores: mostrar productos directamente asociados
                <ProductosDirectosView 
                  proveedorId={proveedorEditando}
                  productos={productos}
                />
              )}
            </View>
          )}

          {error && <Text style={styles.errorText}>El nombre es obligatorio y el celular debe tener 8 dígitos si se ingresa</Text>}
          {/* Espacio para el footer fijo */}
          <View style={{ height: 80 }} />
        </ScrollView>
        {/* Footer fijo de acciones */}
        <View style={styles.formFooterRow}>
          <TouchableOpacity
            style={[styles.formFooterBtn, styles.formFooterBtnSecondary]}
            onPress={() => {
              Alert.alert(
                'Cancelar',
                '¿Estás seguro de que deseas cancelar?',
                [
                  { text: 'No', style: 'cancel' },
                  { text: 'Sí', onPress: () => { setShowForm(false); setError(false); } }
                ]
              );
            }}
          >
            <Ionicons name="close" size={24} color="#D7263D" />
            <Text style={styles.formFooterBtnTextSecondary}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.formFooterBtn, styles.formFooterBtnPrimary]}
            onPress={agregarProveedor}
            activeOpacity={0.8}
          >
            <Ionicons name={proveedorEditando ? 'create-outline' : 'add-circle'} size={22} color="#fff" />
            <Text style={styles.formFooterBtnText}>{proveedorEditando ? 'Actualizar' : 'Crear'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- Renderizado condicional: Lista o Resumen ---
  if (showResumen && contactoResumen) {
    const resumen = calcularResumenContacto(contactoResumen);
    
    return (
      <View style={styles.safeArea}>
        <Header 
          title="Resumen del Contacto" 
          onBack={() => {
            setShowResumen(false);
            setContactoResumen(null);
          }}
          showBackButton={true}
        />
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Información básica */}
          <View style={{ backgroundColor: '#f8f9fa', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#222', marginBottom: 8 }}>
              {contactoResumen.nombre}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <View style={{ 
                backgroundColor: contactoResumen.tipo === 'Productor' ? '#FFD700' : contactoResumen.tipo === 'Cliente' ? '#4CAF50' : '#D7263D',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                marginRight: 8
              }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                  {contactoResumen.tipo || 'Proveedor'}
                </Text>
              </View>
              {contactoResumen.celular && (
                <Text style={{ color: '#666', fontSize: 14 }}>
                  📞 {contactoResumen.celular}
                </Text>
              )}
            </View>
          </View>

          {/* Estadísticas generales */}
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e0e0e0' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 12 }}>
              📊 Estadísticas Generales
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#666', fontSize: 14 }}>Total de órdenes:</Text>
              <Text style={{ color: '#D7263D', fontSize: 14, fontWeight: 'bold' }}>
                {resumen.totalOrdenes}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#666', fontSize: 14 }}>Productos relacionados:</Text>
              <Text style={{ color: '#D7263D', fontSize: 14, fontWeight: 'bold' }}>
                {resumen.totalProductos}
              </Text>
            </View>
          </View>

          {/* Valores de órdenes */}
          {resumen.totalOrdenes > 0 && (
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e0e0e0' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 12 }}>
                💰 Valores de Órdenes (UYU)
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#666', fontSize: 14 }}>Valor máximo:</Text>
                <Text style={{ color: '#4CAF50', fontSize: 14, fontWeight: 'bold' }}>
                  {resumen.valorMaximo.toLocaleString()}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#666', fontSize: 14 }}>Valor mínimo:</Text>
                <Text style={{ color: '#FF9800', fontSize: 14, fontWeight: 'bold' }}>
                  {resumen.valorMinimo.toLocaleString()}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#666', fontSize: 14 }}>Valor promedio:</Text>
                <Text style={{ color: '#D7263D', fontSize: 14, fontWeight: 'bold' }}>
                  {resumen.valorPromedio.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Text>
              </View>
            </View>
          )}

          {/* Información específica para productores */}
          {resumen.esProductor && (
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e0e0e0' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 12 }}>
                👷 Información del Productor
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#666', fontSize: 14 }}>Salario por día:</Text>
                <Text style={{ color: '#D7263D', fontSize: 14, fontWeight: 'bold' }}>
                  {resumen.salarioPorDia > 0 ? `UYU ${resumen.salarioPorDia.toLocaleString()}` : 'No definido'}
                </Text>
              </View>
              {resumen.valorPromedio > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#666', fontSize: 14 }}>Proporción salario/orden:</Text>
                  <Text style={{ 
                    color: resumen.proporcionSalario > 50 ? '#FF3B30' : resumen.proporcionSalario > 25 ? '#FF9800' : '#4CAF50', 
                    fontSize: 14, 
                    fontWeight: 'bold' 
                  }}>
                    {resumen.proporcionSalario.toFixed(1)}%
                  </Text>
                </View>
              )}
              {resumen.salarioPorDia === 0 && resumen.valorPromedio > 0 && (
                <View style={{ backgroundColor: '#FFF3CD', borderRadius: 8, padding: 12, marginTop: 8 }}>
                  <Text style={{ color: '#856404', fontSize: 13, textAlign: 'center' }}>
                    ⚠️ Este productor no tiene salario definido. Se recomienda configurar su salario diario.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Mensaje cuando no hay órdenes */}
          {resumen.totalOrdenes === 0 && (
            <View style={{ backgroundColor: '#E3F2FD', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <Text style={{ color: '#1976D2', fontSize: 16, textAlign: 'center', fontWeight: 'bold' }}>
                📝 Sin órdenes registradas
              </Text>
              <Text style={{ color: '#1976D2', fontSize: 14, textAlign: 'center', marginTop: 4 }}>
                Este contacto aún no tiene órdenes asociadas en el sistema.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // --- Vista principal: Listado de contactos ---
  return (
    <View style={styles.safeArea}>
      <Header 
        title={`Contactos (${contactosFiltrados.length})`} 
        showBackButton={false}
        onAdd={() => {
          setNombre('');
          setFrecuenciaTipo('');
          setFrecuenciaValor('');
          setFrecuenciaExtra('');
          setFrecuenciaExtra2('');
          setProveedorEditando(null);
          setError(false);
          setShowForm(true);
        }} 
      />
      <View style={styles.container}>
        <View style={styles.segmentedContainer}>
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'nombre', label: 'Nombre' },
            { key: 'tipo', label: 'Tipo' },
          ].map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.segmentedBtn, filtroSegmento === f.key && styles.segmentedBtnActive,
                f.key === 'todos' && styles.segmentedBtnLeft,
                f.key === 'tipo' && styles.segmentedBtnRight]}
              onPress={() => setFiltroSegmento(f.key as any)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentedBtnText, filtroSegmento === f.key && styles.segmentedBtnTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {filtroSegmento === 'tipo' && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 8, gap: 8 }}>
            {[
              { key: 'todos', label: 'Todos' },
              { key: 'Proveedor', label: 'Proveedor' },
              { key: 'Cliente', label: 'Cliente' },
              { key: 'Productor', label: 'Productor' },
            ].map(f => (
              <TouchableOpacity
                key={f.key}
                style={{
                  backgroundColor: filtroTipo === f.key ? '#D7263D' : '#f2f2f2',
                  paddingVertical: 6,
                  paddingHorizontal: 14,
                  borderRadius: 16,
                  marginHorizontal: 2,
                  borderWidth: filtroTipo === f.key ? 0 : 1,
                  borderColor: '#eee',
                }}
                onPress={() => setFiltroTipo(f.key as any)}
                activeOpacity={0.8}
              >
                <Text style={{ color: filtroTipo === f.key ? '#fff' : '#D7263D', fontWeight: 'bold', fontSize: 13 }}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {filtroSegmento === 'nombre' && (
          <View style={styles.filtroInputWrapper}>
            <Ionicons name="search" size={18} color="#888" style={styles.filtroInputIcon} />
            <TextInput
              style={styles.filtroInput}
              placeholder="Buscar contacto..."
              value={filtroNombre}
              onChangeText={setFiltroNombre}
              placeholderTextColor="#aaa"
            />
          </View>
        )}
        <FlatList
          data={contactosFiltrados}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }: { item: ProveedorWithCelular }) => (
            <Swipeable
              ref={ref => { if (ref) swipeableRefs.current[item.id] = ref; }}
              renderRightActions={() => (
                <View style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'flex-end', 
                  alignItems: 'stretch',
                  marginBottom: 2,
                  borderRadius: 6,
                  overflow: 'hidden'
                }}>
                  <TouchableOpacity
                    style={{ 
                      backgroundColor: '#D7263D', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 8
                    }}
                    onPress={async () => {
                      if (swipeableRefs.current[item.id]) swipeableRefs.current[item.id].close();
                      eliminarProveedorHandler(item.id);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      Eliminar
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              rightThreshold={40}
            >
              <TouchableOpacity
                onPress={() => editarProveedor(item)}
                onLongPress={() => mostrarResumenContacto(item)}
                style={styles.proveedorCard}
                activeOpacity={0.7}
              >
                <View style={styles.proveedorContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 }}>
                    <Ionicons name="person-outline" size={15} color="#888" style={{ marginRight: 4, marginTop: 2 }} />
                    <Text style={styles.proveedorNombre} numberOfLines={2} ellipsizeMode="tail">{item.nombre}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <Ionicons name="repeat" size={15} color="#888" style={{ marginRight: 4 }} />
                    <Text style={styles.frecuenciaText}>
                      {item.frecuencia ? (
                        <>
                          Cada {item.frecuencia.valor} {' '}
                          {item.frecuencia.tipo === 'dia' && (item.frecuencia.valor === '1' ? 'día' : 'días')}
                          {item.frecuencia.tipo === 'semana' && (item.frecuencia.valor === '1' ? 'semana' : 'semanas')}
                          {item.frecuencia.tipo === 'quincena' && (item.frecuencia.valor === '1' ? 'quincena' : 'quincenas')}
                          {item.frecuencia.tipo === 'mes' && (item.frecuencia.valor === '1' ? 'mes' : 'meses')}
                          {Array.isArray(item.frecuencia.diasSemana) && item.frecuencia.diasSemana.length > 0
                            ? ` (${item.frecuencia.diasSemana.join(', ')})`
                            : item.frecuencia.diaSemana
                              ? ` (${item.frecuencia.diaSemana})`
                              : ''}
                          {item.frecuencia.diaMes ? ` (día ${item.frecuencia.diaMes})` : ''}
                        </>
                      ) : 'Sin frecuencia definida'}
                    </Text>
                  </View>
                  {item.celular && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                      <Ionicons name="call" size={15} color="#888" style={{ marginRight: 4 }} />
                      <Text style={styles.frecuenciaText}>{item.celular}</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="cube-outline" size={15} color="#888" style={{ marginRight: 4 }} />
                    <Text style={styles.proveedorProductos}>
                      {item.tipo === 'Cliente' ? 'Productos predeterminados' : 'Productos relacionados'} {conteoProductosRelacionados[item.id] || 0}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Ionicons name="list-outline" size={15} color="#888" style={{ marginRight: 4 }} />
                    <Text style={styles.proveedorProductos}>
                      Órdenes relacionadas {ordenes.filter((o: any) => o.proveedorId === item.id).length}
                    </Text>
                  </View>
                  {item.tipo === 'Productor' && item.salarioPorDia && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <Ionicons name="cash-outline" size={15} color="#888" style={{ marginRight: 4 }} />
                      <Text style={styles.proveedorProductos}>
                        Salario: UYU {item.salarioPorDia.toLocaleString()} por día
                      </Text>
                    </View>
                  )}
                  {/* Tag de tipo al final */}
                  {item.tipo && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                      <View style={{ 
                        backgroundColor: item.tipo === 'Productor' ? '#FFD700' : item.tipo === 'Cliente' ? '#4CAF50' : '#D7263D',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                        alignSelf: 'flex-start'
                      }}>
                        <Text style={{ 
                          color: '#fff', 
                          fontSize: 11, 
                          fontWeight: 'bold' 
                        }}>
                          {item.tipo}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </Swipeable>
          )}
        />
      </View>

      {/* Modal de Productos Predeterminados */}
      <Modal
        visible={showProductosDefaultModal}
        animationType="slide"
        onRequestClose={cerrarModalProductosDefault}
      >
        <View style={styles.safeArea}>
          {/* Header personalizado con botón volver */}
          <View style={[
            styles.header,
            {
              paddingTop: insets.top + 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 18,
            },
          ]}>
            <StatusBar backgroundColor={Colors.tint} barStyle="light-content" />
            <TouchableOpacity onPress={cerrarModalProductosDefault} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.headerText, { flex: 1, textAlign: 'center', marginRight: 36 }]}>
              Productos de Cliente
            </Text>
          </View>
          <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { marginBottom: 4 }]}>Cliente: {clienteProductosDefault?.nombre}</Text>

            {/* Productos disponibles con filtro */}
            <Text style={[styles.label, { marginTop: 16, marginBottom: 8 }]}>Productos Disponibles</Text>
            
            {/* Filtro de productos */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 6,
              backgroundColor: '#f9f9f9',
              paddingHorizontal: 8,
              marginBottom: 12
            }}>
              <Ionicons name="search" size={16} color="#999" style={{ marginRight: 8 }} />
              <TextInput
                style={{
                  flex: 1,
                  padding: 8,
                  fontSize: 14,
                  backgroundColor: 'transparent'
                }}
                placeholder="Buscar producto..."
                value={filtroProductosDisponibles}
                onChangeText={setFiltroProductosDisponibles}
                autoCapitalize="none"
              />
              {filtroProductosDisponibles.length > 0 && (
                <TouchableOpacity 
                  onPress={() => setFiltroProductosDisponibles('')}
                  style={{ marginLeft: 8, padding: 4 }}
                >
                  <Ionicons name="close-circle" size={16} color="#999" />
                </TouchableOpacity>
              )}
            </View>
            
            <View style={{ maxHeight: 180, marginBottom: 16, borderWidth: 1, borderColor: '#eee', borderRadius: 6, backgroundColor: '#f9f9f9' }}>
              <ScrollView style={{ padding: 8 }}>
              {filtrarProductosDisponibles().map(producto => (
                <TouchableOpacity
                  key={producto.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 8,
                    backgroundColor: '#fff',
                    borderRadius: 6,
                    marginBottom: 6
                  }}
                  onPress={() => agregarProductoDefault(producto)}
                >
                  <Ionicons name="add-circle" size={18} color="#4CAF50" style={{ marginRight: 8 }} />
                  <Text style={{ flex: 1, fontSize: 13 }}>{producto.nombre}</Text>
                  <Text style={{ fontSize: 11, color: '#666' }}>{producto.unidad}</Text>
                </TouchableOpacity>
              ))}
              {filtrarProductosDisponibles().length === 0 && (
                <Text style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', marginTop: 20 }}>
                  {filtroProductosDisponibles.trim() ? 'No se encontraron productos' : 'Todos los productos están agregados'}
                </Text>
              )}
              </ScrollView>
            </View>

            {/* Lista de productos predeterminados */}
            <Text style={[styles.label, { marginBottom: 8 }]}>Productos Predeterminados</Text>
            <View style={{ flex: 1, marginBottom: 16, borderWidth: 1, borderColor: '#eee', borderRadius: 6, backgroundColor: '#f9f9f9', minHeight: 150 }}>
              <ScrollView style={{ padding: 8 }}>
              {productosDefault.map(item => {
                const producto = productos.find(p => p.id === item.productoId);
                return (
                  <View
                    key={item.productoId}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 8,
                      backgroundColor: '#e8f5e8',
                      borderRadius: 6,
                      marginBottom: 6
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold' }}>{producto?.nombre}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <TextInput
                          style={{
                            borderWidth: 1,
                            borderColor: '#ddd',
                            borderRadius: 4,
                            padding: 4,
                            width: 50,
                            textAlign: 'center',
                            marginRight: 6,
                            fontSize: 12
                          }}
                          value={item.cantidad}
                          onChangeText={(cantidad) => actualizarCantidadDefault(item.productoId, cantidad)}
                          keyboardType="decimal-pad"
                        />
                        <Text style={{ fontSize: 11, color: '#666' }}>{item.unidad}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => removerProductoDefault(item.productoId)}
                      style={{ padding: 6 }}
                    >
                      <Ionicons name="remove-circle" size={18} color="#D7263D" />
                    </TouchableOpacity>
                  </View>
                );
              })}
              {productosDefault.length === 0 && (
                <Text style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', marginTop: 20 }}>
                  No hay productos predeterminados configurados
                </Text>
              )}
              </ScrollView>
            </View>

            {/* Espacio para el footer fijo */}
            <View style={{ height: 80 }} />
          </ScrollView>
          
          {/* Footer fijo de acciones */}
          <View style={styles.formFooterRow}>
            <TouchableOpacity
              style={[styles.formFooterBtn, styles.formFooterBtnSecondary]}
              onPress={cerrarModalProductosDefault}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color="#D7263D" />
              <Text style={styles.formFooterBtnTextSecondary}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formFooterBtn, styles.formFooterBtnPrimary]}
              onPress={guardarProductosDefault}
              activeOpacity={0.8}
            >
              <Ionicons name="save-outline" size={22} color="#fff" />
              <Text style={styles.formFooterBtnText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F6FC' },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingTop: 2,
  },
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
  },
  headerText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  formCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
  label: { fontSize: 15, color: '#444', marginBottom: 4, marginTop: 10, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, fontSize: 17, backgroundColor: '#fff', height: 44 },
  inputError: { borderColor: '#FF3B30', backgroundColor: '#fff0f0' },
  formFooterRow: {
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
    paddingVertical: 8,
    paddingBottom: 14,
    zIndex: 10,
  },
  formFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minWidth: 100,
  },
  formFooterBtnPrimary: {
    backgroundColor: '#D7263D',
  },
  formFooterBtnSecondary: {
    backgroundColor: '#f8f8f8',
  },
  formFooterBtnText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
  },
  formFooterBtnTextSecondary: {
    color: '#D7263D',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  errorText: { color: '#FF3B30', marginBottom: 8, marginTop: 8, fontWeight: 'bold', fontSize: 15, textAlign: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8f8f8', padding: 10, borderRadius: 4, marginBottom: 2, minHeight: 80, borderWidth: 2, borderColor: 'transparent' },
  itemText: { fontSize: 16 },
  itemSubText: { fontSize: 13, color: '#888', marginTop: 2 },
  itemCount: { fontSize: 13, color: '#007AFF', fontWeight: 'bold' },
  pickerWrapper: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: '#fff', marginBottom: 0, marginTop: 0, overflow: 'hidden', height: 44, paddingVertical: 0, paddingHorizontal: 8, justifyContent: 'center' },
  picker: { width: '100%', height: 44, fontSize: 17, color: '#222', backgroundColor: 'transparent', paddingHorizontal: 8 },
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
    backgroundColor: Colors.tint,
  },
  segmentedBtnText: {
    color: Colors.tint,
    fontWeight: 'bold',
    fontSize: 15,
  },
  segmentedBtnTextActive: {
    color: '#fff',
  },
  filtroInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    height: 44,
    paddingHorizontal: 12,
  },
  filtroInputIcon: {
    marginRight: 6,
  },
  filtroInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    fontSize: 15,
    height: 44,
    color: '#222',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  proveedorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    padding: 10,
    marginBottom: 2,
    minHeight: 80,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  proveedorContent: {
    flex: 1,
    marginRight: 12,
  },
  proveedorNombre: { fontSize: 15, fontWeight: 'bold', color: '#222', marginBottom: 2, flexWrap: 'wrap' },
  frecuenciaText: { fontSize: 14, color: '#888', marginBottom: 2 },
  proveedorProductos: { fontSize: 14, color: '#888', fontWeight: 'normal', marginTop: 2 },
  deleteProveedorBtn: {
    padding: 4,
    marginTop: 0,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerText: { fontSize: 17 },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    height: 44,
    paddingHorizontal: 12,
  },
  dropdownPickerWrapper: {
    flex: 1,
    minWidth: 180,
    width: '100%',
  },
  dropdownPicker: {
    flex: 1,
    minWidth: 180,
    width: '100%',
    height: 44,
    fontSize: 17,
    color: '#222',
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
  },
}); 