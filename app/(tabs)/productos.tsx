import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
// import { useRouter } from 'expo-router'; // Removed to fix filename error
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TabRestrictedAccess from '../../components/TabRestrictedAccess';
import { useUser } from '../../components/UserContext';
import { Colors } from '../../constants/Colors';
import { canAccessTab, deleteProducto, getProductos, getProveedores, logEvento, Producto, Proveedor, saveProducto, updateProducto } from '../../services/firebase';
import { containsSearchTerm } from '../../utils/searchUtils';

const UNIDADES = ["CAJA","FUNDA","PACK","PLANCHA","BOLSA","FRASCO","UNIDAD","KILOGRAMO","CAJON","LITRO"];

// Función para verificar si un producto está actualmente fuera de temporada
const isProductoFueraDeTemporada = (producto: Producto): boolean => {
  if (!producto.fueraDeTemporada || !producto.fueraDeTemporadaHasta) return false;
  
  const fechaLimite = new Date(producto.fueraDeTemporadaHasta);
  const hoy = new Date();
  
  return hoy <= fechaLimite;
};

// Función para limpiar campos undefined de un objeto
const cleanUndefinedFields = (obj: any): any => {
  const cleaned = { ...obj };
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });
  return cleaned;
};

function Header({ title, onAdd }: { title: string, onAdd?: () => void }) {
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
      <Text style={styles.headerText}>{title}</Text>
      {onAdd && (
        <TouchableOpacity onPress={onAdd} style={{ marginLeft: 12 }}>
          <Ionicons name="add-circle" size={32} color="#fff" />
        </TouchableOpacity>
      )}
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
  containerWithSafeBottom: {
    paddingBottom: 34, // Espacio para la barra inferior del dispositivo
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
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  formCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
  label: { fontSize: 15, color: '#444', marginBottom: 4, marginTop: 10, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, fontSize: 17, backgroundColor: '#fff', height: 44 },
  inputError: { borderColor: '#FF3B30', backgroundColor: '#fff0f0' },
  pickerWrapper: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: '#fff', marginBottom: 0, marginTop: 0, overflow: 'hidden', height: 44, paddingVertical: 0, paddingHorizontal: 8, justifyContent: 'center' },
  picker: { width: '100%', height: 44, fontSize: 17, color: '#222', backgroundColor: 'transparent', paddingHorizontal: 8 },
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
  productCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    padding: 10,
    marginBottom: 2,
    minHeight: 48,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  productName: { fontSize: 15, fontWeight: 'bold', color: '#222', marginBottom: 2 },
  productInfoValue: { fontSize: 14, color: '#888', fontWeight: 'normal' },
  pickerText: { fontSize: 17 },
  priceFieldWithCost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#666',
    borderColor: '#ddd',
    flex: 1,
  },
  inputFlex: {
    flex: 1,
  },
  costButton: {
    backgroundColor: '#D7263D',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 100,
    justifyContent: 'center',
  },
  costButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

// Componente memoizado para items de producto
const ProductoItem = React.memo(({ 
  item, 
  proveedores, 
  filtroSegmento, 
  filtroProveedor, 
  productosFiltrados,
  onEdit,
  onDelete,
  onDesactivar,
  onCostear,
  swipeableRefs
}: {
  item: Producto;
  proveedores: Proveedor[];
  filtroSegmento: string;
  filtroProveedor: string;
  productosFiltrados: Producto[];
  onEdit: (item: Producto) => void;
  onDelete: (id: string) => void;
  onDesactivar: (item: Producto) => void;
  onCostear: (id: string) => void;
  swipeableRefs: React.MutableRefObject<{ [key: string]: any }>;
}) => {
  const proveedor = useMemo(() => 
    proveedores.find(p => p.id === item.proveedorId), 
    [proveedores, item.proveedorId]
  );

  const renderRightActions = useCallback(() => {
    if (item.archivado) {
      return (
        <TouchableOpacity
          style={{ 
            backgroundColor: '#34C759', 
            justifyContent: 'center', 
            alignItems: 'center',
            marginBottom: 2,
            borderRadius: 6,
            paddingHorizontal: 12,
            paddingVertical: 8
          }}
          onPress={() => onDesactivar(item)}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
            Activar
          </Text>
        </TouchableOpacity>
      );
    }

    if (isProductoFueraDeTemporada(item)) {
      return (
        <TouchableOpacity
          style={{ 
            backgroundColor: '#34C759', 
            justifyContent: 'center', 
            alignItems: 'center',
            marginBottom: 2,
            borderRadius: 6,
            paddingHorizontal: 12,
            paddingVertical: 8
          }}
          onPress={() => onDesactivar(item)}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
            Activar
          </Text>
        </TouchableOpacity>
      );
    }

    const actions = [
      {
        color: '#007AFF',
        text: 'Costear',
        icon: 'calculator-outline',
        onPress: () => onCostear(item.id)
      },
      {
        color: '#D7263D',
        text: 'Eliminar',
        icon: 'trash-outline',
        onPress: () => onDelete(item.id)
      },
      {
        color: '#888',
        text: 'Desactivar',
        icon: 'archive-outline',
        onPress: () => onDesactivar(item)
      }
    ];

    return (
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'flex-end', 
        alignItems: 'stretch',
        marginBottom: 2,
        borderRadius: 6,
        overflow: 'hidden'
      }}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={{ 
              backgroundColor: action.color, 
              justifyContent: 'center', 
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 8
            }}
            onPress={action.onPress}
          >
            <Ionicons name={action.icon as any} size={20} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
              {action.text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [item, onDesactivar, onCostear, onDelete]);

  return (
    <Swipeable
      ref={ref => { if (ref) swipeableRefs.current[item.id] = ref; }}
      renderRightActions={renderRightActions}
      rightThreshold={40}
    >
      <TouchableOpacity
        onPress={() => onEdit(item)}
        style={[
          styles.productCard, 
          item.archivado && { opacity: 0.5, backgroundColor: '#f2f2f2', borderColor: '#eee', borderWidth: 1 },
          isProductoFueraDeTemporada(item) && { backgroundColor: '#fff3cd', borderColor: '#ffc107', borderWidth: 2 }
        ]}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: 0, flexDirection: 'column' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 }}>
              <Ionicons name="cube" size={15} color="#888" style={{ marginRight: 4, marginTop: 2 }} />
              <Text style={[styles.productName, { paddingRight: 36 }]} numberOfLines={2} ellipsizeMode="tail">
                {item.nombre}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Ionicons name="person" size={15} color="#888" style={{ marginRight: 4 }} />
              <Text style={[styles.productInfoValue, { paddingRight: 36 }]} numberOfLines={1} ellipsizeMode="tail">
                {proveedor?.nombre || 'Sin proveedor'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="layers" size={15} color="#888" style={{ marginRight: 4 }} />
                <Text style={{ fontWeight: 'bold', fontStyle: 'italic', color: '#888' }} numberOfLines={1} ellipsizeMode="tail">
                  STOCK: {item.stock ?? 6} {item.unidad}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {item.costoTotal && (
                  <Ionicons name="calculator" size={16} color="#34C759" style={{ marginRight: 4 }} />
                )}
                <Text style={{ fontSize: 15, color: '#34C759', fontWeight: 'bold', marginLeft: 8 }}>
                  {item.precio !== undefined ? `$${Number(item.precio).toFixed(2)}` : ''}
                </Text>
                {filtroSegmento === 'proveedor' && filtroProveedor && (
                  <Text style={{
                    backgroundColor: '#FBEAEC',
                    color: '#D7263D',
                    fontSize: 12,
                    fontWeight: 'bold',
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    marginLeft: 8,
                    overflow: 'hidden',
                  }}>
                    #{productosFiltrados.findIndex(p => p.id === item.id) + 1}
                  </Text>
                )}
              </View>
            </View>
            
            {/* Indicador de fuera de temporada */}
            {isProductoFueraDeTemporada(item) && (
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginTop: 8, 
                backgroundColor: '#fff3cd', 
                paddingHorizontal: 8, 
                paddingVertical: 4, 
                borderRadius: 6,
                borderWidth: 1,
                borderColor: '#ffc107'
              }}>
                <Ionicons name="time-outline" size={14} color="#ffc107" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12, color: '#b8860b', fontWeight: 'bold' }}>
                  Fuera de temporada hasta {item.fueraDeTemporadaHasta ? 
                    new Date(item.fueraDeTemporadaHasta).toLocaleDateString('es-ES') : 
                    'indefinido'
                  }
                </Text>
              </View>
            )}
          </View>
          {item.archivado && (
            <Ionicons name="archive-outline" size={18} color="#D7263D" style={{ position: 'absolute', top: 6, right: 8, zIndex: 2 }} />
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
});

export default function ProductosScreen() {
  const { userData } = useUser();
  // const router = useRouter(); // Removed to fix filename error

  // Estados temporales para debugging
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productosLoading, setProductosLoading] = useState(true);
  const [proveedoresLoading, setProveedoresLoading] = useState(true);

  // Cargar datos directamente desde Firebase para debugging
  useEffect(() => {
    console.log('🔍 ProductosScreen useEffect iniciado');
    console.log('🔍 userData:', userData);
    console.log('🔍 canAccessTab:', userData ? canAccessTab(userData, 'productos') : 'no userData');
    
    if (!userData || !canAccessTab(userData, 'productos')) {
      console.log('❌ Sin permisos para productos, no cargando datos');
      return;
    }

    console.log('🔍 Cargando productos directamente...');
    try {
      getProductos((productosData) => {
        console.log('📦 Productos cargados:', productosData?.length || 0);
        console.log('📦 Primeros 3 productos:', productosData?.slice(0, 3));
        setProductos(productosData || []);
        setProductosLoading(false);
      });
    } catch (error) {
      console.error('❌ Error cargando productos:', error);
      setProductosLoading(false);
    }

    console.log('🔍 Cargando proveedores directamente...');
    try {
      getProveedores((proveedoresData) => {
        console.log('👥 Proveedores cargados:', proveedoresData?.length || 0);
        console.log('👥 Primeros 3 proveedores:', proveedoresData?.slice(0, 3));
        setProveedores(proveedoresData || []);
        setProveedoresLoading(false);
      });
    } catch (error) {
      console.error('❌ Error cargando proveedores:', error);
      setProveedoresLoading(false);
    }
  }, [userData]);

  // Estados del formulario
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [unidad, setUnidad] = useState('');
  const [error, setError] = useState(false);
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [filtroSegmento, setFiltroSegmento] = useState<'todos' | 'nombre' | 'proveedor'>('todos');
  const [unidadPersonalizada, setUnidadPersonalizada] = useState('');
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [stock, setStock] = useState('');
  const [showProveedorModal, setShowProveedorModal] = useState(false);
  const [showUnidadModal, setShowUnidadModal] = useState(false);
  const [precio, setPrecio] = useState('');
  
  // Estados para procesamiento
  const [procesandoOrden, setProcesandoOrden] = useState(false);
  
  // Estados para modal de desactivación
  const [showDesactivarModal, setShowDesactivarModal] = useState(false);
  const [productoDesactivando, setProductoDesactivando] = useState<Producto | null>(null);
  const [fechaFueraTemporada, setFechaFueraTemporada] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Referencias
  const flatListRef = useRef<FlatList>(null);
  const swipeableRefs = useRef<{ [key: string]: any }>({});

  // Verificar si el usuario tiene permisos para acceder a productos
  if (!userData || !canAccessTab(userData, 'productos')) {
    return <TabRestrictedAccess tabName="productos" />;
  }

  // Funciones utilitarias memoizadas
  const getResponsableOrAlert = useCallback(async () => {
    const responsable = (await AsyncStorage.getItem('responsableApp'))?.trim() || '';
    if (!responsable) {
      Alert.alert('Configuración requerida', 'Debe configurar el nombre del responsable en el engranaje de configuración antes de realizar esta acción.');
      return null;
    }
    return responsable;
  }, []);


  // Filtrado de productos optimizado con useMemo
  const productosFiltrados = useMemo(() => {
    if (!productos || productos.length === 0) return [];

    let filtered = productos;
    
    if (filtroSegmento === 'nombre' && filtroNombre.trim()) {
      filtered = filtered.filter(p => containsSearchTerm(p.nombre, filtroNombre));
    } else if (filtroSegmento === 'proveedor' && filtroProveedor) {
      filtered = filtered.filter(p => p.proveedorId === filtroProveedor);
      // Ordenar por campo 'orden' si existe, si no por nombre
      filtered = [...filtered].sort((a, b) => {
        if (a.orden !== undefined && b.orden !== undefined) return a.orden - b.orden;
        return a.nombre.localeCompare(b.nombre);
      });
    }
    
    return filtered;
  }, [productos, filtroSegmento, filtroNombre, filtroProveedor]);

  // Callbacks optimizados para acciones de productos
  const handleEditProduct = useCallback((item: Producto) => {
    setNombre(item.nombre);
    setProveedorId(item.proveedorId);
    if (UNIDADES.includes(item.unidad)) {
      setUnidad(item.unidad);
      setUnidadPersonalizada('');
    } else if (item.unidad) {
      setUnidad('personalizada');
      setUnidadPersonalizada(item.unidad);
    } else {
      setUnidad('');
      setUnidadPersonalizada('');
    }
    setStock(item.stock !== undefined ? String(item.stock) : '');
    const precioRedondeado = item.precio !== undefined ? Number(item.precio).toFixed(2) : '';
    setPrecio(precioRedondeado);
    setProductoEditando(item);
    setShowForm(true);
  }, []);

  const handleDeleteProduct = useCallback(async (id: string) => {
    Alert.alert('Eliminar', '¿Seguro que deseas eliminar este producto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        const responsable = await getResponsableOrAlert();
        if (!responsable) return;
        await deleteProducto(id);
        await logEvento({ tipoEvento: 'eliminacion_producto', responsable, idAfectado: id, datosJSON: {} });
      }}
    ]);
  }, [getResponsableOrAlert]);

  const handleDesactivarProduct = useCallback((item: Producto) => {
    // Si el producto está archivado o fuera de temporada, activarlo directamente
    if (item.archivado || isProductoFueraDeTemporada(item)) {
      handleActivarProducto(item);
      return;
    }
    
    // Si está activo, mostrar modal de desactivación
    setProductoDesactivando(item);
    setShowDesactivarModal(true);
    // Configurar fecha por defecto (3 meses desde hoy)
    const fechaDefault = new Date();
    fechaDefault.setMonth(fechaDefault.getMonth() + 3);
    setFechaFueraTemporada(fechaDefault);
  }, []);

  const handleActivarProducto = useCallback(async (item: Producto) => {
    try {
      if (swipeableRefs.current[item.id]) {
        swipeableRefs.current[item.id].close();
      }
          setProcesandoOrden(true);
      
      // Crear objeto limpio sin campos undefined
      const updateData = cleanUndefinedFields({ 
        ...item, 
        archivado: false,
        fueraDeTemporada: false,
        fueraDeTemporadaHasta: undefined // Se eliminará por cleanUndefinedFields
      });
      
      await updateProducto(item.id, updateData);
      
      console.log('✅ Producto activado exitosamente');
      
          setTimeout(() => {
            setProcesandoOrden(false);
          }, 800);
    } catch (error) {
      console.error('Error activando producto:', error);
      setProcesandoOrden(false);
    }
  }, [swipeableRefs]);

  const handleArchivarProducto = useCallback(async () => {
    if (!productoDesactivando) return;
    
    try {
      if (swipeableRefs.current[productoDesactivando.id]) {
        swipeableRefs.current[productoDesactivando.id].close();
      }
      setProcesandoOrden(true);
      
      const action = productoDesactivando.archivado ? 'Desarchivar' : 'Archivar';
      
      // Crear objeto limpio sin campos undefined
      const updateData = cleanUndefinedFields({ 
        ...productoDesactivando, 
        archivado: !productoDesactivando.archivado,
        fueraDeTemporada: false,
        fueraDeTemporadaHasta: undefined // Se eliminará por cleanUndefinedFields
      });
      
      await updateProducto(productoDesactivando.id, updateData);
      
      console.log(`✅ Producto ${action.toLowerCase()}do exitosamente`);
      setShowDesactivarModal(false);
      setProductoDesactivando(null);
      
      setTimeout(() => {
        setProcesandoOrden(false);
      }, 800);
    } catch (error) {
      console.error('Error archivando producto:', error);
      setProcesandoOrden(false);
    }
  }, [productoDesactivando, swipeableRefs]);

  const handleFueraDeTemporada = useCallback(async () => {
    if (!productoDesactivando) return;
    
    try {
      if (swipeableRefs.current[productoDesactivando.id]) {
        swipeableRefs.current[productoDesactivando.id].close();
      }
      setProcesandoOrden(true);
      
      const updateData = cleanUndefinedFields({ 
        ...productoDesactivando, 
        fueraDeTemporada: true,
        fueraDeTemporadaHasta: fechaFueraTemporada.toISOString(),
        archivado: false // Asegurar que no esté archivado
      });
      
      await updateProducto(productoDesactivando.id, updateData);
      
      console.log('✅ Producto marcado como fuera de temporada hasta:', fechaFueraTemporada.toLocaleDateString());
      setShowDesactivarModal(false);
      setProductoDesactivando(null);
      
      setTimeout(() => {
        setProcesandoOrden(false);
      }, 800);
    } catch (error) {
      console.error('Error marcando producto fuera de temporada:', error);
      setProcesandoOrden(false);
    }
  }, [productoDesactivando, fechaFueraTemporada, swipeableRefs]);

  const handleCostearProduct = useCallback((id: string) => {
    console.log('📊 Navegando a costos del producto:', id);
  }, []);

  // Función optimizada para renderizar items
  const renderProductItem = useCallback(({ item }: { item: Producto }) => (
    <ProductoItem
      item={item}
      proveedores={proveedores}
      filtroSegmento={filtroSegmento}
      filtroProveedor={filtroProveedor}
      productosFiltrados={productosFiltrados}
      onEdit={handleEditProduct}
      onDelete={handleDeleteProduct}
      onDesactivar={handleDesactivarProduct}
      onCostear={handleCostearProduct}
      swipeableRefs={swipeableRefs}
    />
  ), [
    proveedores, 
    filtroSegmento, 
    filtroProveedor, 
    productosFiltrados,
    handleEditProduct,
    handleDeleteProduct,
    handleDesactivarProduct,
    handleCostearProduct,
    swipeableRefs
  ]);

  // Función para obtener layout de items (optimización de FlatList)
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 80, // Altura aproximada de cada item
    offset: 80 * index,
    index,
  }), []);

  // Key extractor optimizado
  const keyExtractor = useCallback((item: Producto) => item.id, []);

  const agregarProducto = useCallback(async () => {
    const responsable = await getResponsableOrAlert();
    if (!responsable) return;
    const unidadFinal = unidad === 'personalizada' ? unidadPersonalizada : unidad;
    if (!nombre.trim() || !proveedorId || !unidadFinal.trim() || (precio !== '' && isNaN(Number(precio)))) {
      setError(true);
      return;
    }
    setError(false);
    try {
      const id = await saveProducto({ 
        nombre, 
        proveedorId, 
        unidad: unidadFinal, 
        stock: stock ? Number(stock) : undefined, 
        precio: precio !== '' ? Number(precio) : undefined 
      });
      // Registrar evento
      await logEvento({ 
        tipoEvento: 'creacion_producto', 
        responsable, 
        idAfectado: id, 
        datosJSON: { nombre, proveedorId, unidad: unidadFinal, stock, precio: precio !== '' ? Number(precio) : undefined }
      });
      setNombre('');
      setProveedorId('');
      setUnidad('');
      setUnidadPersonalizada('');
      setStock('');
      setPrecio('');
      setShowForm(false);
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo guardar el producto: ' + (e?.message || e));
    }
  }, [nombre, proveedorId, unidad, unidadPersonalizada, stock, precio, getResponsableOrAlert]);

  const actualizarProducto = useCallback(async () => {
    if (!productoEditando || !productoEditando.id) return;
    const responsable = await getResponsableOrAlert();
    if (!responsable) return;
    const unidadFinal = unidad === 'personalizada' ? unidadPersonalizada : unidad;
    if (!nombre.trim() || !proveedorId || !unidadFinal.trim() || (precio !== '' && isNaN(Number(precio)))) {
      setError(true);
      return;
    }
    setError(false);
    try {
      const updateData = cleanUndefinedFields({
        id: productoEditando.id,
        nombre,
        proveedorId,
        unidad: unidadFinal,
        stock: stock ? Number(stock) : undefined,
        precio: precio !== '' ? Number(precio) : undefined
      });
      
      await updateProducto(productoEditando.id, updateData);
      // Registrar evento
      await logEvento({ 
        tipoEvento: 'actualizacion_producto', 
        responsable, 
        idAfectado: productoEditando.id, 
        datosJSON: { nombre, proveedorId, unidad: unidadFinal, stock, precio: precio !== '' ? Number(precio) : undefined }
      });
      setNombre('');
      setProveedorId('');
      setUnidad('');
      setUnidadPersonalizada('');
      setStock('');
      setPrecio('');
      setProductoEditando(null);
      setShowForm(false);
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo actualizar el producto: ' + (e?.message || e));
    }
  }, [productoEditando, nombre, proveedorId, unidad, unidadPersonalizada, stock, precio, getResponsableOrAlert]);

  // Mostrar loading si los datos están cargando
  if (productosLoading || proveedoresLoading) {
    return (
      <View style={styles.safeArea}>
        <Header title="Productos" />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#D7263D" />
          <Text style={{ marginTop: 16, color: '#666', fontSize: 16 }}>Cargando productos...</Text>
        </View>
      </View>
    );
  }

  // --- Formulario ---
  if (showForm) {
    return (
      <View style={styles.safeArea}>
        <Header title={productoEditando ? "Editar producto" : "Nuevo producto"} />
        <View style={styles.container}>
          <Text style={styles.label}>Nombre<Text style={{ color: '#FF3B30' }}>*</Text></Text>
          <TextInput
            style={[styles.input, error && !nombre.trim() && styles.inputError]}
            placeholder="Ej: Leche"
            value={nombre}
            onChangeText={t => { setNombre(t); setError(false); }}
            placeholderTextColor="#aaa"
            autoCapitalize="characters"
          />
          <Text style={styles.label}>Proveedor <Text style={{ color: '#FF3B30' }}>*</Text></Text>
          <TouchableOpacity
            style={[styles.pickerWrapper, error && !proveedorId && styles.inputError, { flexDirection: 'row', alignItems: 'center' }]}
            onPress={() => {
              setShowProveedorModal(true);
              setFiltroNombre('');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.pickerText, { flex: 1, color: proveedorId ? '#222' : '#aaa' }]}
              numberOfLines={1}
            >
              {proveedorId ? (proveedores.find(p => p.id === proveedorId)?.nombre) : 'Seleccione proveedor...'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#888" />
          </TouchableOpacity>
          <Modal
            visible={showProveedorModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowProveedorModal(false)}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 18, width: '85%', maxHeight: '60%' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#D7263D', marginBottom: 12 }}>Selecciona proveedor</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 8, marginBottom: 10, fontSize: 15, color: '#222' }}
                  placeholder="Buscar proveedor..."
                  placeholderTextColor="#aaa"
                  value={filtroNombre}
                  onChangeText={setFiltroNombre}
                  autoFocus
                />
                <ScrollView>
                  {proveedores
                    .filter(p => !filtroNombre.trim() || containsSearchTerm(p.nombre, filtroNombre))
                    .map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                      onPress={() => {
                        setProveedorId(p.id);
                        setError(false);
                        setShowProveedorModal(false);
                          setFiltroNombre('');
                      }}
                    >
                      <Text style={{ color: '#222', fontSize: 16 }}>{p.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={{ flex: 1, padding: 10, backgroundColor: '#D7263D', borderRadius: 5, alignItems: 'center' }}
                    onPress={() => {
                      setProveedorId('');
                      setError(false);
                      setShowProveedorModal(false);
                    }}
                  >
                    <Text style={{ color: 'white' }}>Limpiar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, padding: 10, backgroundColor: '#666', borderRadius: 5, alignItems: 'center' }}
                    onPress={() => setShowProveedorModal(false)}
                  >
                    <Text style={{ color: 'white' }}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          <Text style={styles.label}>Unidad de Medida <Text style={{ color: '#FF3B30' }}>*</Text></Text>
          <TouchableOpacity
            style={[styles.pickerWrapper, error && !unidad.trim() && styles.inputError, { flexDirection: 'row', alignItems: 'center' }]}
            onPress={() => setShowUnidadModal(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pickerText, { flex: 1, color: unidad ? '#222' : '#aaa' }]}
              numberOfLines={1}
            >
              {unidad ? (unidad === 'personalizada' ? unidadPersonalizada || 'Personalizada' : unidad) : 'Seleccione unidad...'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#888" />
          </TouchableOpacity>
          <Modal
            visible={showUnidadModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowUnidadModal(false)}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 18, width: '85%', maxHeight: '60%' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#D7263D', marginBottom: 12 }}>Selecciona unidad</Text>
                <ScrollView>
                  {UNIDADES.map(unidadItem => (
                    <TouchableOpacity
                      key={unidadItem}
                      style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                      onPress={() => {
                        setUnidad(unidadItem);
                        setError(false);
                        setShowUnidadModal(false);
                      }}
                    >
                      <Text style={{ color: '#222', fontSize: 16 }}>{unidadItem}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                    onPress={() => {
                      setUnidad('personalizada');
                      setError(false);
                      setShowUnidadModal(false);
                    }}
                  >
                    <Text style={{ color: '#222', fontSize: 16 }}>PERSONALIZADA</Text>
                  </TouchableOpacity>
                </ScrollView>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={{ flex: 1, padding: 10, backgroundColor: '#D7263D', borderRadius: 5, alignItems: 'center' }}
                    onPress={() => {
                      setUnidad('');
                      setUnidadPersonalizada('');
                      setError(false);
                      setShowUnidadModal(false);
                    }}
                  >
                    <Text style={{ color: 'white' }}>Limpiar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, padding: 10, backgroundColor: '#666', borderRadius: 5, alignItems: 'center' }}
                    onPress={() => setShowUnidadModal(false)}
                  >
                    <Text style={{ color: 'white' }}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          {unidad === 'personalizada' && (
            <>
              <Text style={styles.label}>Unidad Personalizada <Text style={{ color: '#FF3B30' }}>*</Text></Text>
              <TextInput
                style={[styles.input, error && !unidadPersonalizada.trim() && styles.inputError]}
                placeholder="Ej: BOTELLA"
                value={unidadPersonalizada}
                onChangeText={t => { setUnidadPersonalizada(t.toUpperCase()); setError(false); }}
                placeholderTextColor="#aaa"
                autoCapitalize="characters"
              />
            </>
          )}
          <Text style={styles.label}>Stock Deseado</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 10"
            value={stock}
            onChangeText={t => { setStock(t.replace(/[^0-9]/g, '')); setError(false); }}
            keyboardType="numeric"
            placeholderTextColor="#aaa"
          />
          <Text style={styles.label}>Precio</Text>
          {productoEditando?.costoTotal ? (
            <View style={styles.priceFieldWithCost}>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                placeholder="Ej: 100.00"
                value={precio}
                editable={false}
                keyboardType="decimal-pad"
                placeholderTextColor="#aaa"
              />
              <TouchableOpacity
                style={styles.costButton}
                onPress={() => {
                  setShowForm(false);
                  console.log('📊 Navegando a costos del producto:', productoEditando.id);
                }}
              >
                <Ionicons name="calculator" size={20} color="#fff" />
                <Text style={styles.costButtonText}>Ver Costos</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.priceFieldWithCost}>
              <TextInput
                style={[styles.input, styles.inputFlex, error && precio !== '' && isNaN(Number(precio)) && styles.inputError]}
                placeholder="Ej: 100.00"
                value={precio}
                onChangeText={t => { 
                  const cleanValue = t.replace(/[^0-9.,]/g, '').replace(',', '.');
                  setPrecio(cleanValue);
                  setError(false); 
                }}
                onBlur={() => {
                  if (precio && !isNaN(Number(precio))) {
                    const roundedValue = Number(precio).toFixed(2);
                    setPrecio(roundedValue);
                  }
                }}
                keyboardType="decimal-pad"
                placeholderTextColor="#aaa"
              />
              {productoEditando && (
                <TouchableOpacity
                  style={styles.costButton}
                  onPress={() => {
                    setShowForm(false);
                    console.log('📊 Navegando a costos del producto:', productoEditando.id);
                  }}
                >
                  <Ionicons name="calculator" size={20} color="#fff" />
                  <Text style={styles.costButtonText}>Costear</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {error && <Text style={styles.errorText}>Complete todos los campos obligatorios</Text>}
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
              onPress={productoEditando ? actualizarProducto : agregarProducto}
              activeOpacity={0.8}
            >
              <Ionicons name={productoEditando ? 'create-outline' : 'add-circle'} size={22} color="#fff" />
              <Text style={styles.formFooterBtnText}>{productoEditando ? 'Actualizar' : 'Crear'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <Header title={`Productos (${productosFiltrados.length})`} onAdd={() => {
        setNombre('');
        setProveedorId('');
        setUnidad('');
        setUnidadPersonalizada('');
        setStock('');
        setPrecio('');
        setError(false);
        setShowForm(true);
        setProductoEditando(null);
      }} />
      <View style={styles.container}>
        <View style={styles.segmentedContainer}>
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'nombre', label: 'Nombre' },
            { key: 'proveedor', label: 'Proveedor' },
          ].map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.segmentedBtn, filtroSegmento === f.key && styles.segmentedBtnActive,
                f.key === 'todos' && styles.segmentedBtnLeft,
                f.key === 'proveedor' && styles.segmentedBtnRight]}
              onPress={() => setFiltroSegmento(f.key as any)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentedBtnText, filtroSegmento === f.key && styles.segmentedBtnTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {filtroSegmento === 'nombre' && (
          <View style={styles.filtroInputWrapper}>
            <Ionicons name="search" size={18} color="#888" style={styles.filtroInputIcon} />
            <TextInput
              style={styles.filtroInput}
              placeholder="Buscar producto..."
              value={filtroNombre}
              onChangeText={setFiltroNombre}
              placeholderTextColor="#aaa"
            />
          </View>
        )}
        
        {filtroSegmento === 'proveedor' && (
          <View style={styles.dropdownRow}>
            <Ionicons name="person" size={20} color="#007AFF" style={{ marginRight: 8 }} />
            <View style={styles.dropdownPickerWrapper}>
              <Picker
                selectedValue={filtroProveedor}
                onValueChange={setFiltroProveedor}
                style={styles.dropdownPicker}
              >
                <Picker.Item label="Todos los proveedores" value="" />
                {proveedores.map((p) => (
                  <Picker.Item key={p.id} label={p.nombre} value={p.id} />
                ))}
              </Picker>
            </View>
          </View>
        )}
        
        <FlatList
          ref={flatListRef}
          data={productosFiltrados}
          keyExtractor={keyExtractor}
          renderItem={renderProductItem}
          getItemLayout={getItemLayout}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={8}
          initialNumToRender={15}
          updateCellsBatchingPeriod={50}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
        
        {procesandoOrden && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
            <ActivityIndicator size="large" color="#D7263D" />
            <Text style={{ marginTop: 12, color: '#D7263D', fontWeight: 'bold', fontSize: 16 }}>Procesando...</Text>
          </View>
        )}

        {/* Modal de Desactivación */}
        <Modal
          visible={showDesactivarModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDesactivarModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%', maxWidth: 400 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#D7263D', marginBottom: 16, textAlign: 'center' }}>
                Desactivar Producto
              </Text>
              
              {productoDesactivando && (
                <Text style={{ fontSize: 16, color: '#333', marginBottom: 20, textAlign: 'center' }}>
                  {productoDesactivando.nombre}
                </Text>
              )}

              <Text style={{ fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' }}>
                ¿Cómo deseas desactivar este producto?
              </Text>

              {/* Botón Archivar */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#888',
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onPress={handleArchivarProducto}
                activeOpacity={0.8}
              >
                <Ionicons name="archive" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                  {productoDesactivando?.archivado ? 'Desarchivar' : 'Archivar Permanentemente'}
                </Text>
              </TouchableOpacity>

              {/* Botón Fuera de Temporada */}
              {!productoDesactivando?.archivado && (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#ffc107',
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    borderRadius: 12,
                    marginBottom: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="time" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                    Fuera de Temporada
                  </Text>
                </TouchableOpacity>
              )}

              {/* Fecha seleccionada */}
              {!productoDesactivando?.archivado && (
                <View style={{ backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
                    Hasta: {fechaFueraTemporada.toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </Text>
      </View>
              )}

              {/* Botones de acción */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#f8f8f8',
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                  onPress={() => {
                    setShowDesactivarModal(false);
                    setProductoDesactivando(null);
                  }}
                >
                  <Text style={{ color: '#666', fontWeight: 'bold' }}>Cancelar</Text>
                </TouchableOpacity>
                
                {!productoDesactivando?.archivado && (
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: '#D7263D',
                      paddingVertical: 12,
                      borderRadius: 8,
                      alignItems: 'center'
                    }}
                    onPress={handleFueraDeTemporada}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Confirmar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* DateTimePicker */}
        {showDatePicker && (
          <DateTimePicker
            value={fechaFueraTemporada}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setFechaFueraTemporada(selectedDate);
              }
            }}
          />
        )}
      </View>
    </View>
  );
}