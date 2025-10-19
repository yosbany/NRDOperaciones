import { Ionicons } from '@expo/vector-icons';
// import { useFocusEffect } from '@react-navigation/native'; // Removed to fix LinkPreviewContext error
// import { useRouter } from 'expo-router'; // Removed to fix filename error
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    AppState,
    FlatList,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TabRestrictedAccess from '../../components/TabRestrictedAccess';
import { useUser } from '../../components/UserContext';
import { Colors } from '../../constants/Colors';
import {
    IngredienteCosto,
    Producto,
    Proveedor,
    RecetaCosto,
    calcularCostoIngrediente,
    canAccessTab,
    deleteRecetaCosto,
    getProductos,
    getProveedores,
    getRecetaCosto,
    saveRecetaCosto,
    updateProducto,
} from '../../services/firebase';

const UNIDADES_INGREDIENTES = [
  'gr', 'g', 'kg', 'ml', 'l', 'litro', 'unidad', 'pieza', 'cucharada', 'cucharadita', 'taza'
];

// Función para filtrar productos
const filtrarProductos = (productos: Producto[], filtro: string): Producto[] => {
  if (!filtro.trim()) return productos;
  
  return productos.filter(producto =>
    producto.nombre?.toLowerCase().includes(filtro.toLowerCase()) ||
    producto.id?.toLowerCase().includes(filtro.toLowerCase())
  );
};

function Header({ title, onBack, showBackButton = true }: { 
  title: string, 
  onBack?: () => void,
  showBackButton?: boolean
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <StatusBar backgroundColor={Colors.tint} barStyle="light-content" />
      {showBackButton && onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
      <Text style={styles.headerText}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

export default function CostosProductoScreen() {
  const { userData } = useUser();
  // const router = useRouter(); // Removed to fix filename error
  
  // Estado para el productoId (se puede pasar como prop o estado global)
  const [productoId, setProductoId] = useState<string | undefined>(undefined);

  // Verificar si el usuario tiene permisos para acceder a costos
  if (!userData || !canAccessTab(userData, 'productos')) {
    return <TabRestrictedAccess tabName="costos" />;
  }
  
  // Estado para controlar qué vista mostrar
  const [showList, setShowList] = useState(true);
  const [productosCosteados, setProductosCosteados] = useState<Producto[]>([]);
  const [filtroProducto, setFiltroProducto] = useState('');
  const [navegacionDirecta, setNavegacionDirecta] = useState(true); // Para trackear si viene de navegación directa
  
  const [producto, setProducto] = useState<Producto | null>(null);
  const [receta, setReceta] = useState<RecetaCosto | null>(null);
  const [ingredientes, setIngredientes] = useState<IngredienteCosto[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [rendimiento, setRendimiento] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [showProductoModal, setShowProductoModal] = useState(false);
  const [showUnidadModal, setShowUnidadModal] = useState(false);
  const [ingredienteEditando, setIngredienteEditando] = useState<IngredienteCosto | null>(null);
  const [showTipoModal, setShowTipoModal] = useState(false);
  const [showPersonalizadoModal, setShowPersonalizadoModal] = useState(false);
  const [filtroProductoModal, setFiltroProductoModal] = useState('');
  const swipeableRefs = useRef<{ [key: string]: any }>({});

  // Manejar navegación: mostrar lista por defecto, formulario solo cuando viene de "Costear"
  useEffect(() => {
    console.log('🔄 Tab costos montado', { productoId, navegacionDirecta });
    
    if (productoId && navegacionDirecta) {
        // Si hay productoId y es navegación directa, es que venimos de "Costear"
        console.log('📊 Navegando a costos del producto:', productoId);
        setShowList(false);
        setNavegacionDirecta(false); // Marcar que ya no es navegación directa
        loadData(productoId);
      } else {
        // En todos los otros casos, mostrar lista y limpiar URL si es necesario
        console.log('📋 Mostrando lista de productos costeados');
        setShowList(true);
        setProducto(null);
        setReceta(null);
        setIngredientes([]);
        loadProductosCosteados();
        setNavegacionDirecta(true); // Reset para próxima navegación
        
        // Si hay productoId residual, limpiar URL
        if (productoId) {
          console.log('🧹 Limpiando productoId residual de la URL');
          console.log('🧹 Limpiando productoId residual de la URL');
        }
      }
    }, [productoId]);

  // Cargar datos iniciales y configurar listener de AppState
  useEffect(() => {
    console.log('🚀 Componente montado');
    
    // Listener para cambios de estado de la app
    const handleAppStateChange = (nextAppState: string) => {
      console.log('📱 AppState cambió a:', nextAppState);
      
      // Si la app se desenfoca y estamos en vista de detalles, volver a la lista
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (!showList) {
          console.log('🧹 App en background, limpiando estado del formulario');
          setShowList(true);
          setProducto(null);
          setReceta(null);
          setIngredientes([]);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [showList]);

  // Función para volver - SIEMPRE a la lista de costos
  const handleVolver = () => {
    console.log('🔙 Volviendo a la lista de costos');
    setShowList(true);
    setProducto(null);
    setReceta(null);
    setIngredientes([]);
    setNavegacionDirecta(true); // Reset para próxima navegación
    
    // Limpiar el productoId de la URL para evitar que se mantenga
    console.log('🧹 Limpiando productoId residual de la URL');
  };

  const handleEliminarRecetaDesdeLista = async (productoEliminar: Producto) => {
    console.log('🗑️ Eliminando receta desde lista:', {
      productoId: productoEliminar.id,
      productoNombre: productoEliminar.nombre
    });

    Alert.alert(
      'Eliminar Receta',
      `¿Está seguro de que desea eliminar la receta de costos de "${productoEliminar.nombre}"? El precio del producto se reseteará a cero.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Eliminando receta desde lista...');
              
              // Cerrar swipe
              if (swipeableRefs.current[productoEliminar.id]) {
                swipeableRefs.current[productoEliminar.id].close();
              }
              
              // Eliminar la receta de costos
              await deleteRecetaCosto(productoEliminar.id);
              console.log('✅ Receta eliminada de Firebase');
              
              // Actualizar precio del producto a cero
              const updateData = { 
                precio: 0,
                updatedAt: new Date().toISOString()
              };
              
              await updateProducto(productoEliminar.id, updateData as any);
              console.log('✅ Precio actualizado a 0');

              // Recargar lista de productos costeados
              loadProductosCosteados();
              
              Alert.alert('Éxito', 'Receta eliminada correctamente. El precio del producto se ha resetado a cero.');
            } catch (error) {
              console.error('❌ Error eliminando receta desde lista:', error);
              Alert.alert('Error', `No se pudo eliminar la receta: ${error.message || 'Error desconocido'}`);
            }
          }
        }
      ]
    );
  };

  const loadProductosCosteados = async () => {
    setLoading(true);
    try {
      getProductos((productosData) => {
        // Filtrar solo productos que tienen costoTotal (están costeados)
        const costeados = productosData.filter(p => p.costoTotal && p.costoTotal > 0);
        setProductosCosteados(costeados);
        setLoading(false);
      });
    } catch (error) {
      console.error('Error cargando productos costeados:', error);
      setLoading(false);
    }
  };

  const loadData = async (productId?: string) => {
    const idToUse = productId || productoId;
    if (!idToUse) return;

    setLoading(true);
    try {
      // Cargar productos disponibles (excluyendo el actual)
      getProductos((productosData) => {
        const productoActual = productosData.find(p => p.id === idToUse);
        if (productoActual) {
          setProducto(productoActual);
        }
        const productosFiltrados = productosData.filter(p => p.id !== idToUse);
        setProductos(productosFiltrados);
      });

      // Cargar proveedores
      getProveedores((proveedoresData) => {
        setProveedores(proveedoresData);
      });

      // Cargar receta existente
      const recetaExistente = await getRecetaCosto(idToUse);
      if (recetaExistente) {
        setReceta(recetaExistente);
        setIngredientes(recetaExistente.ingredientes);
        setRendimiento(recetaExistente.rendimiento?.toString() || '');
        setObservaciones(recetaExistente.observaciones || '');
      } else {
        // Inicializar con receta vacía
        setReceta(null);
        setIngredientes([]);
        setRendimiento('');
        setObservaciones('');
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const addIngrediente = (tipo: 'producto' | 'personalizado') => {
    const nuevoIngrediente: IngredienteCosto = {
      id: Date.now().toString(),
      tipo,
      nombre: '',
      cantidad: 0,
      unidad: tipo === 'personalizado' ? 'gr' : '', // Solo para personalizados, para productos se llenará automáticamente
      costo: 0,
    };

    if (tipo === 'producto') {
      nuevoIngrediente.productoId = '';
    }

    setIngredienteEditando(nuevoIngrediente);
    if (tipo === 'producto') {
      setShowProductoModal(true);
    } else if (tipo === 'personalizado') {
      setShowPersonalizadoModal(true);
    }
  };

  const updateIngrediente = (id: string, updates: Partial<IngredienteCosto>) => {
    if (ingredienteEditando && ingredienteEditando.id === id) {
      // Actualizar ingrediente en edición
      const updated = { ...ingredienteEditando, ...updates };
      
      // Recalcular costo si es necesario
      if (updates.productoId) {
        const productoRef = productos.find(p => p.id === updates.productoId);
        if (productoRef) {
          // Actualizar el nombre, unidad y costo del ingrediente con los datos del producto
          updated.nombre = productoRef.nombre;
          updated.unidad = productoRef.unidad;
          updated.costo = calcularCostoIngrediente(updated, productoRef);
        }
      } else if (updates.cantidad !== undefined || updates.unidad) {
        // Recalcular si cambió cantidad o unidad
        if (updated.tipo === 'producto' && updated.productoId) {
          const productoRef = productos.find(p => p.id === updated.productoId);
          if (productoRef) {
            updated.costo = calcularCostoIngrediente(updated, productoRef);
          }
        }
      }
      
      setIngredienteEditando(updated);
    } else {
      // Actualizar ingrediente existente
      setIngredientes(ingredientes.map(ing => {
        if (ing.id === id) {
          const updated = { ...ing, ...updates };
          
          // Recalcular costo si es necesario
          if (updates.productoId) {
            const productoRef = productos.find(p => p.id === updates.productoId);
            if (productoRef) {
              // Actualizar el nombre, unidad y costo del ingrediente con los datos del producto
              updated.nombre = productoRef.nombre;
              updated.unidad = productoRef.unidad;
              updated.costo = calcularCostoIngrediente(updated, productoRef);
            }
          } else if (updates.cantidad !== undefined || updates.unidad) {
            // Recalcular si cambió cantidad o unidad
            if (updated.tipo === 'producto' && updated.productoId) {
              const productoRef = productos.find(p => p.id === updated.productoId);
              if (productoRef) {
                updated.costo = calcularCostoIngrediente(updated, productoRef);
              }
            }
          }

          return updated;
        }
        return ing;
      }));
    }
  };

  const removeIngrediente = (id: string) => {
    setIngredientes(ingredientes.filter(ing => ing.id !== id));
  };

  const confirmarIngrediente = () => {
    if (ingredienteEditando) {
      if (ingredienteEditando.tipo === 'producto' && !ingredienteEditando.productoId) {
        Alert.alert('Error', 'Debe seleccionar un producto');
        return;
      }
      if (ingredienteEditando.tipo === 'personalizado' && !ingredienteEditando.nombre.trim()) {
        Alert.alert('Error', 'Debe ingresar el nombre del ingrediente');
        return;
      }
      if (ingredienteEditando.cantidad <= 0) {
        Alert.alert('Error', 'La cantidad debe ser mayor a 0');
        return;
      }

      setIngredientes([...ingredientes, ingredienteEditando]);
      setIngredienteEditando(null);
      setShowProductoModal(false);
      setShowUnidadModal(false);
      setFiltroProductoModal(''); // Limpiar filtro al confirmar
    }
  };

  const cancelarIngrediente = () => {
    setIngredienteEditando(null);
    setShowProductoModal(false);
    setShowUnidadModal(false);
    setFiltroProductoModal(''); // Limpiar filtro al cerrar
  };

  const calcularCostoTotal = () => {
    // Primero calcular la suma de costos fijos (productos + costos personalizados fijos)
    const costosFijos = ingredientes.reduce((sum, ing) => {
      if (ing.porcentaje === undefined) {
        // Es costo fijo (producto o personalizado fijo)
        return sum + ing.costo;
      }
      return sum;
    }, 0);

    // Luego calcular los porcentajes sobre la suma de costos fijos
    const costosPorcentaje = ingredientes.reduce((sum, ing) => {
      if (ing.porcentaje !== undefined && ing.porcentaje > 0) {
        // Es costo por porcentaje
        return sum + (costosFijos * ing.porcentaje / 100);
      }
      return sum;
    }, 0);

    return costosFijos + costosPorcentaje;
  };

  const handleSave = async () => {
    if (!producto?.id) return;

    // Validar ingredientes
    const ingredientesValidos = ingredientes.filter(ing => {
      const isValid = ing.nombre.trim() && ing.cantidad > 0 && ing.costo >= 0;
      return isValid;
    });

    if (ingredientesValidos.length === 0) {
      Alert.alert('Error', 'Debe agregar al menos un costo válido');
      return;
    }

    setLoading(true);
    try {
      const recetaData: any = {
        productoId: producto.id,
        nombre: producto?.nombre || '',
        ingredientes: ingredientesValidos,
        createdAt: receta?.createdAt || new Date().toISOString(),
      };

      // Solo agregar campos opcionales si tienen valor
      if (rendimiento && rendimiento.trim()) {
        recetaData.rendimiento = parseFloat(rendimiento);
      }
      if (observaciones && observaciones.trim()) {
        recetaData.observaciones = observaciones.trim();
      }

      await saveRecetaCosto(recetaData);
      
      // Actualizar el precio del producto con el costo total calculado
      const costoTotal = calcularCostoTotal();
      if (producto) {
        await updateProducto(producto.id, {
          ...producto,
          precio: costoTotal,
          costoTotal: costoTotal
        });
      }

      // Actualizar el estado local de la receta para que aparezca el botón eliminar
      const nuevaReceta: RecetaCosto = {
        id: producto.id, // El ID de la receta es el mismo que el productoId
        productoId: producto.id,
        nombre: producto?.nombre || '',
        ingredientes: ingredientesValidos,
        costoTotal: calcularCostoTotal(),
        rendimiento: rendimiento ? parseFloat(rendimiento) : undefined,
        observaciones: observaciones || undefined,
        createdAt: receta?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setReceta(nuevaReceta);
      
      Alert.alert('Éxito', 'Receta de costos guardada correctamente');
      handleVolver();
    } catch (error) {
      console.error('Error guardando receta:', error);
      Alert.alert('Error', 'No se pudo guardar la receta');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const idProducto = producto?.id || productoId; // Usar producto.id como prioridad
    
    console.log('🗑️ INICIO handleDelete:', {
      productoIdURL: productoId,
      productoIdObjeto: producto?.id,
      idProductoFinal: idProducto,
      tieneReceta: !!receta,
      tieneProducto: !!producto
    });
    
    if (!idProducto || !receta) {
      console.log('❌ No se puede eliminar - faltan datos:', {
        idProducto: !!idProducto,
        receta: !!receta
      });
      Alert.alert('Error', 'No se puede eliminar la receta. Faltan datos necesarios.');
      return;
    }

    Alert.alert(
      'Confirmar eliminación',
      '¿Está seguro de que desea eliminar la receta de costos? El precio del producto se reseteará a cero.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            console.log('🗑️ Usuario confirmó eliminación');
            setLoading(true);
            try {
              console.log('🗑️ Eliminando receta de costos...');
              // Eliminar la receta de costos (esto ya elimina el campo costoTotal)
              await deleteRecetaCosto(idProducto);
              console.log('✅ Receta eliminada de Firebase');
              
              console.log('🔄 Actualizando precio del producto a 0...');
              // Actualizar solo el precio del producto a cero usando update parcial
              const updateData = { 
                precio: 0,
                updatedAt: new Date().toISOString()
              };
              
              // Filtrar campos undefined
              const updateDataLimpio = Object.fromEntries(
                Object.entries(updateData).filter(([_, value]) => value !== undefined)
              );
              
              console.log('🔄 Datos de actualización:', updateDataLimpio);
              await updateProducto(idProducto, updateDataLimpio as any);
              console.log('✅ Precio del producto actualizado a 0');

              // Limpiar el estado local
              setReceta(null);
              setIngredientes([]);
              setRendimiento('');
              setObservaciones('');
              
              console.log('✅ Estado local limpiado');
              Alert.alert('Éxito', 'Receta eliminada correctamente. El precio del producto se ha resetado a cero.');
              handleVolver();
            } catch (error) {
              console.error('❌ Error eliminando receta:', error);
              Alert.alert('Error', `No se pudo eliminar la receta: ${error.message || 'Error desconocido'}`);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderIngrediente = ({ item }: { item: IngredienteCosto }) => {
    // Calcular el costo real para mostrar
    let costoReal = item.costo;
    
    if (item.porcentaje !== undefined && item.porcentaje > 0) {
      // Calcular la suma de costos fijos (sin porcentajes)
      const costosFijos = ingredientes.reduce((sum, ing) => {
        if (ing.porcentaje === undefined) {
          return sum + ing.costo;
        }
        return sum;
      }, 0);
      
      // Calcular el porcentaje sobre los costos fijos
      costoReal = costosFijos * item.porcentaje / 100;
    }

    return (
      <View style={styles.ingredienteCard}>
        <View style={styles.ingredienteHeader}>
          <View style={styles.ingredienteTipoContainer}>
            <Ionicons 
              name={item.tipo === 'producto' ? 'cube-outline' : 'create-outline'} 
              size={16} 
              color={item.tipo === 'producto' ? '#007AFF' : '#34C759'} 
            />
            <Text style={styles.ingredienteTipo}>
              {item.tipo === 'producto' ? 'Producto' : 'Personalizado'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => removeIngrediente(item.id)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        <Text style={styles.ingredienteNombre}>{item.nombre}</Text>
        
        <View style={styles.ingredienteInfo}>
          {/* Solo mostrar cantidad para productos */}
          {item.tipo === 'producto' && (
            <View style={styles.ingredienteInfoItem}>
              <Text style={styles.ingredienteInfoLabel}>Cantidad:</Text>
              <Text style={styles.ingredienteInfoValue}>{item.cantidad} {item.unidad}</Text>
            </View>
          )}
          
          {/* Mostrar información específica según el tipo */}
          {item.tipo === 'producto' && item.productoId && (
            <View style={styles.ingredienteInfoItem}>
              <Text style={styles.ingredienteInfoLabel}>Producto:</Text>
              <Text style={styles.ingredienteInfoValue}>
                {productos.find(p => p.id === item.productoId)?.nombre || 'No encontrado'}
              </Text>
            </View>
          )}
          
          {item.tipo === 'personalizado' && item.porcentaje !== undefined && (
            <View style={styles.ingredienteInfoItem}>
              <Text style={styles.ingredienteInfoLabel}>Porcentaje:</Text>
              <Text style={styles.ingredienteInfoValue}>{item.porcentaje}%</Text>
            </View>
          )}
        </View>

        <View style={styles.costoRow}>
          <Text style={styles.costoLabel}>Costo:</Text>
          <Text style={styles.costoValue}>${costoReal.toFixed(2)}</Text>
        </View>
      </View>
    );
  };

  // Vista de lista de productos costeados
  if (showList) {
    return (
      <View style={styles.safeArea}>
        <Header 
          title="Productos Costeados" 
          showBackButton={false}
        />
        <View style={styles.container}>
          {/* Filtro de productos */}
          <View style={styles.filtroContainer}>
            <View style={styles.filtroInputContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.filtroSearchIcon} />
              <TextInput
                style={styles.filtroInputWithIcon}
                placeholder="Buscar producto..."
                value={filtroProducto}
                onChangeText={setFiltroProducto}
                autoCapitalize="none"
              />
              {filtroProducto.length > 0 && (
                <TouchableOpacity 
                  onPress={() => setFiltroProducto('')}
                  style={styles.filtroClearButton}
                >
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#666', fontSize: 16 }}>Cargando productos costeados...</Text>
            </View>
          ) : (
            <FlatList
              data={filtrarProductos(productosCosteados, filtroProducto)}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 8 }}
              ListEmptyComponent={() => (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Ionicons name="search" size={48} color="#ccc" style={{ marginBottom: 12 }} />
                  <Text style={{ color: '#888', fontSize: 16, textAlign: 'center' }}>
                    {filtroProducto.trim() ? 
                      `No se encontraron productos que coincidan con "${filtroProducto}"` : 
                      'No hay productos costeados aún'
                    }
                  </Text>
                  {filtroProducto.trim() && (
                    <TouchableOpacity 
                      onPress={() => setFiltroProducto('')}
                      style={{ 
                        marginTop: 12, 
                        paddingHorizontal: 16, 
                        paddingVertical: 8, 
                        backgroundColor: '#e63946', 
                        borderRadius: 6 
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Limpiar filtro</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              renderItem={({ item }) => (
                <Swipeable
                  ref={ref => { if (ref) swipeableRefs.current[item.id] = ref; }}
                  renderRightActions={() => (
                    <View style={{ 
                      backgroundColor: '#FF3B30', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      paddingHorizontal: 20,
                      marginBottom: 8,
                      borderRadius: 8
                    }}>
                      <TouchableOpacity
                        style={{
                          justifyContent: 'center',
                          alignItems: 'center',
                          flex: 1,
                          width: '100%'
                        }}
                        onPress={() => handleEliminarRecetaDesdeLista(item)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginTop: 2 }}>
                          Eliminar
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  rightThreshold={40}
                >
                  <TouchableOpacity
                    style={styles.productoCostItem}
                    onPress={() => {
                      console.log('📊 Navegando a detalles de:', item.nombre);
                      setShowList(false);
                      setNavegacionDirecta(false); // Marcar que no es navegación directa
                      // Cargar datos del producto directamente
                      setProducto(item);
                      loadData(item.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productoCostName}>{item.nombre}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons name="calculator" size={16} color="#34C759" style={{ marginRight: 6 }} />
                        <Text style={styles.productoCostValue}>
                          Costo: ${item.costoTotal?.toFixed(2) || '0.00'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Ionicons name="pricetag" size={16} color="#007AFF" style={{ marginRight: 6 }} />
                        <Text style={styles.productoCostPrice}>
                          Precio: ${item.precio?.toFixed(2) || '0.00'}
                        </Text>
                      </View>
                      {item.precio && item.costoTotal && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <Ionicons name="trending-up" size={16} color="#D7263D" style={{ marginRight: 6 }} />
                          <Text style={styles.productoCostMargin}>
                            Margen: {(((item.precio - item.costoTotal) / item.precio) * 100).toFixed(1)}%
                          </Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                  </TouchableOpacity>
                </Swipeable>
              )}
              ListEmptyComponent={() => (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 }}>
                  <Ionicons name="calculator-outline" size={64} color="#ccc" />
                  <Text style={{ color: '#888', fontSize: 16, marginTop: 16, textAlign: 'center' }}>
                    No hay productos costeados aún
                  </Text>
                  <Text style={{ color: '#aaa', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
                    Ve a la pestaña Productos y costea algunos productos
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </View>
    );
  }

  if (!producto) {
    return (
      <View style={styles.safeArea}>
        <Header 
          title="Cargando..." 
          onBack={handleVolver} 
        />
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
        <Header 
          title="Costos de producto" 
          onBack={handleVolver} 
        />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Información del producto */}
        <View style={styles.productoInfoCard}>
          <Text style={styles.productoNombre}>{producto.nombre}</Text>
          
          <View style={styles.productoInfoRow}>
            <Ionicons name="business-outline" size={16} color="#888" style={{ marginRight: 8 }} />
            <Text style={styles.productoInfoValue}>
              {proveedores.find(p => p.id === producto.proveedorId)?.nombre || 'Sin proveedor'}
            </Text>
          </View>
          
          <View style={styles.productoInfoRow}>
            <Ionicons name="scale-outline" size={16} color="#888" style={{ marginRight: 8 }} />
            <Text style={styles.productoInfoValue}>{producto.unidad}</Text>
          </View>
          
          {producto.costoTotal && (
            <View style={styles.productoInfoRow}>
              <Ionicons name="calculator" size={16} color="#34C759" style={{ marginRight: 8 }} />
              <Text style={[styles.productoInfoValue, { color: '#34C759', fontWeight: 'bold' }]}>
                ${producto.costoTotal.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {/* Rendimiento */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Rendimiento (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Cantidad final del producto."
            value={rendimiento}
            onChangeText={setRendimiento}
            keyboardType="numeric"
            placeholderTextColor="#aaa"
          />
        </View>

        {/* Ingredientes */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Costos ({ingredientes.length})</Text>
          </View>

          {ingredientes.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No hay costos agregados</Text>
              <Text style={styles.emptyStateSubtext}>Toca el botón + para agregar costos</Text>
            </View>
          ) : (
            <FlatList
              data={ingredientes}
              keyExtractor={(item) => item.id}
              renderItem={renderIngrediente}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Observaciones */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Observaciones</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Notas adicionales sobre la receta..."
            value={observaciones}
            onChangeText={setObservaciones}
            multiline
            numberOfLines={3}
            placeholderTextColor="#aaa"
          />
        </View>

        {/* Resumen de costos */}
        <View style={styles.costoTotalCard}>
          <View style={styles.costoTotalHeader}>
            <Ionicons name="calculator" size={24} color={Colors.tint} />
            <Text style={styles.costoTotalLabel}>Costo Total de la Receta</Text>
          </View>
          <Text style={styles.costoTotalValue}>${calcularCostoTotal().toFixed(2)}</Text>
          {rendimiento && parseFloat(rendimiento) > 0 && (
            <Text style={styles.costoPorUnidad}>
              Costo por unidad: ${(calcularCostoTotal() / parseFloat(rendimiento)).toFixed(2)}
            </Text>
          )}
        </View>

        {/* Botón eliminar receta */}
        {(() => {
          console.log('🔍 Condición botón eliminar:', {
            tieneReceta: !!receta,
            recetaId: receta?.id,
            productoId: producto?.id,
            loading
          });
          return receta;
        })() && (
          <TouchableOpacity
            style={[
              styles.deleteRecetaButton,
              loading && { backgroundColor: '#f5f5f5', opacity: 0.5 }
            ]}
            onPress={() => {
              console.log('🗑️ Botón eliminar presionado');
              handleDelete();
            }}
            disabled={loading}
          >
            <Ionicons name="trash-outline" size={20} color={loading ? "#ccc" : "#FF3B30"} />
            <Text style={[styles.deleteRecetaText, loading && { color: '#ccc' }]}>
              {loading ? 'Eliminando...' : 'Eliminar Receta'}
            </Text>
          </TouchableOpacity>
        )}
        
        {/* Espacio adicional para que no se tape con el footer */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Botón flotante para agregar ingrediente */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          console.log('🔘 Botón flotante presionado');
          setShowTipoModal(true);
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Footer con botones */}
      <View style={styles.formFooterRow}>
        <TouchableOpacity
          style={[styles.formFooterBtn, styles.formFooterBtnSecondary]}
          onPress={() => {
            Alert.alert(
              'Cancelar',
              '¿Estás seguro de que deseas cancelar? Los cambios no se guardarán.',
              [
                { text: 'No', style: 'cancel' },
                { text: 'Sí', onPress: handleVolver }
              ]
            );
          }}
        >
          <Ionicons name="close" size={24} color="#D7263D" />
          <Text style={styles.formFooterBtnTextSecondary}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.formFooterBtn, styles.formFooterBtnPrimary]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons name="save-outline" size={22} color="#fff" />
          <Text style={styles.formFooterBtnText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      {/* Modal para seleccionar producto */}
      <Modal
        visible={showProductoModal}
        transparent
        animationType="fade"
        onRequestClose={cancelarIngrediente}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCompact}>
            <Text style={styles.modalTitleCompact}>Seleccionar Producto</Text>
            
            {ingredienteEditando && (
              <>
                {/* Solo mostrar campo de nombre para ingredientes personalizados */}
                {ingredienteEditando.tipo === 'personalizado' && (
                  <>
                    <Text style={styles.modalLabel}>Nombre del ingrediente:</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Ej: Harina, Azúcar, etc."
                      value={ingredienteEditando.nombre}
                      onChangeText={(text) => updateIngrediente(ingredienteEditando.id, { nombre: text })}
                      placeholderTextColor="#aaa"
                    />
                  </>
                )}

                {/* Campo de filtro */}
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginBottom: 12,
                  borderWidth: 1, 
                  borderColor: '#ddd', 
                  borderRadius: 6, 
                  backgroundColor: '#f9f9f9',
                  paddingHorizontal: 8
                }}>
                  <Ionicons name="search" size={18} color="#999" style={{ marginRight: 8 }} />
                  <TextInput
                    style={{ 
                      flex: 1, 
                      padding: 8, 
                      fontSize: 14,
                      backgroundColor: 'transparent'
                    }}
                    placeholder="Buscar producto..."
                    value={filtroProductoModal}
                    onChangeText={setFiltroProductoModal}
                    autoCapitalize="none"
                  />
                  {filtroProductoModal.length > 0 && (
                    <TouchableOpacity 
                      onPress={() => setFiltroProductoModal('')}
                      style={{ marginLeft: 8, padding: 4 }}
                    >
                      <Ionicons name="close-circle" size={18} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
                
                <ScrollView style={styles.productosListCompact}>
                  {productos
                    .filter(prod => 
                      !filtroProductoModal.trim() || 
                      prod.nombre?.toLowerCase().includes(filtroProductoModal.toLowerCase()) ||
                      prod.id?.toLowerCase().includes(filtroProductoModal.toLowerCase())
                    )
                    .map((prod) => (
                    <TouchableOpacity
                      key={prod.id}
                      style={[
                        styles.productoItemCompact,
                        ingredienteEditando.productoId === prod.id && styles.productoItemSelected
                      ]}
                      onPress={() => updateIngrediente(ingredienteEditando.id, { productoId: prod.id })}
                    >
                      <View style={styles.productoItemContent}>
                        <Text style={[
                          styles.productoItemTextCompact,
                          ingredienteEditando.productoId === prod.id && styles.productoItemTextSelected
                        ]}>
                          {prod.nombre}
                        </Text>
                        <Text style={styles.productoItemPriceCompact}>
                          ${prod.precio?.toFixed(2) || '0.00'}/{prod.unidad}
                        </Text>
                      </View>
                      {ingredienteEditando.productoId === prod.id && (
                        <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {/* Mostrar cantidad cuando se selecciona un producto */}
                {ingredienteEditando.productoId && (
                  <View style={styles.cantidadSection}>
                    <Text style={styles.modalLabel}>Cantidad (parte de la unidad de compra):</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Ej: 0.1 para 100g de 1kg"
                      value={ingredienteEditando.cantidad.toString()}
                      onChangeText={(text) => updateIngrediente(ingredienteEditando.id, { cantidad: parseFloat(text) || 0 })}
                      keyboardType="numeric"
                      placeholderTextColor="#aaa"
                    />
                    <Text style={styles.modalHelperText}>
                      Unidad del producto: {productos.find(p => p.id === ingredienteEditando.productoId)?.unidad || 'N/A'}
                    </Text>
                  </View>
                )}
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={cancelarIngrediente}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={confirmarIngrediente}
              >
                <Text style={styles.modalButtonTextPrimary}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para seleccionar unidad */}
      <Modal
        visible={showUnidadModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnidadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Unidad</Text>
            <ScrollView>
              {UNIDADES_INGREDIENTES.map((unidad) => (
                <TouchableOpacity
                  key={unidad}
                  style={[
                    styles.unidadItem,
                    ingredienteEditando?.unidad === unidad && styles.unidadItemSelected
                  ]}
                  onPress={() => {
                    if (ingredienteEditando) {
                      updateIngrediente(ingredienteEditando.id, { unidad });
                    }
                    setShowUnidadModal(false);
                  }}
                >
                  <Text style={[
                    styles.unidadItemText,
                    ingredienteEditando?.unidad === unidad && styles.unidadItemTextSelected
                  ]}>
                    {unidad}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => setShowUnidadModal(false)}
            >
              <Text style={styles.modalButtonTextSecondary}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para seleccionar tipo de ingrediente */}
      <Modal
        visible={showTipoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          console.log('🔘 Modal cerrado');
          setShowTipoModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar Costo</Text>
            <Text style={styles.modalSubtitle}>Selecciona el tipo de costo que deseas agregar a la receta</Text>
            
            <View style={styles.tipoButtons}>
              <TouchableOpacity
                style={[styles.tipoButton, { backgroundColor: '#007AFF' }]}
                onPress={() => {
                  setShowTipoModal(false);
                  addIngrediente('producto');
                }}
              >
                <Ionicons name="cube-outline" size={24} color="#fff" />
                <Text style={styles.tipoButtonText}>Producto Existente</Text>
                <Text style={styles.tipoButtonSubtext}>Usar un producto de la lista con su precio</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.tipoButton, { backgroundColor: '#34C759' }]}
                onPress={() => {
                  setShowTipoModal(false);
                  addIngrediente('personalizado');
                }}
              >
                <Ionicons name="create-outline" size={24} color="#fff" />
                <Text style={styles.tipoButtonText}>Costo Personalizado</Text>
                <Text style={styles.tipoButtonSubtext}>Agregar un costo con nombre e importe personalizado</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowTipoModal(false)}
            >
              <Ionicons name="close" size={20} color="#666" />
              <Text style={styles.modalCancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para costo personalizado */}
      <Modal
        visible={showPersonalizadoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPersonalizadoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCompact}>
            <Text style={styles.modalTitleCompact}>Costo Personalizado</Text>
            
            {ingredienteEditando && (
              <>
                <Text style={styles.modalLabel}>Nombre del costo:</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ej: Mano de obra, Transporte, etc."
                  value={ingredienteEditando.nombre}
                  onChangeText={(text) => updateIngrediente(ingredienteEditando.id, { nombre: text })}
                  placeholderTextColor="#aaa"
                />

                <Text style={styles.modalLabel}>Tipo de costo:</Text>
                <View style={styles.tipoCostoButtons}>
                  <TouchableOpacity
                    style={[
                      styles.tipoCostoButton,
                      ingredienteEditando.porcentaje === undefined && styles.tipoCostoButtonActive
                    ]}
                    onPress={() => updateIngrediente(ingredienteEditando.id, { porcentaje: undefined })}
                  >
                    <Text style={[
                      styles.tipoCostoButtonText,
                      ingredienteEditando.porcentaje === undefined && styles.tipoCostoButtonTextActive
                    ]}>
                      Cantidad Fija
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.tipoCostoButton,
                      ingredienteEditando.porcentaje !== undefined && styles.tipoCostoButtonActive
                    ]}
                    onPress={() => updateIngrediente(ingredienteEditando.id, { porcentaje: 0 })}
                  >
                    <Text style={[
                      styles.tipoCostoButtonText,
                      ingredienteEditando.porcentaje !== undefined && styles.tipoCostoButtonTextActive
                    ]}>
                      Por Porcentaje
                    </Text>
                  </TouchableOpacity>
                </View>

                {ingredienteEditando.porcentaje !== undefined ? (
                  <>
                    <Text style={styles.modalLabel}>Porcentaje (%):</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Ej: 15.5 (para 15.5%)"
                      value={ingredienteEditando.porcentaje.toString()}
                      onChangeText={(text) => {
                        const cleanValue = text.replace(/[^0-9.,]/g, '').replace(',', '.');
                        const porcentaje = parseFloat(cleanValue) || 0;
                        updateIngrediente(ingredienteEditando.id, { porcentaje });
                      }}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#aaa"
                    />
                    <Text style={styles.modalHelperText}>
                      Se calculará sobre la suma de costos fijos y de productos
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.modalLabel}>Costo fijo:</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Ej: 100.00"
                      value={ingredienteEditando.costo.toString()}
                      onChangeText={(text) => {
                        const cleanValue = text.replace(/[^0-9.,]/g, '').replace(',', '.');
                        const costo = parseFloat(cleanValue) || 0;
                        updateIngrediente(ingredienteEditando.id, { costo });
                      }}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#aaa"
                    />
                  </>
                )}
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowPersonalizadoModal(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => {
                  if (ingredienteEditando && ingredienteEditando.nombre.trim()) {
                    if (ingredienteEditando.porcentaje !== undefined) {
                      // Es porcentaje, validar que tenga valor
                      if (ingredienteEditando.porcentaje > 0) {
                        setIngredientes(prev => [...prev, ingredienteEditando]);
                        setIngredienteEditando(null);
                        setShowPersonalizadoModal(false);
                      } else {
                        Alert.alert('Error', 'Por favor ingresa un porcentaje válido');
                      }
                    } else {
                      // Es costo fijo, validar que tenga valor
                      if (ingredienteEditando.costo > 0) {
                        setIngredientes(prev => [...prev, ingredienteEditando]);
                        setIngredienteEditando(null);
                        setShowPersonalizadoModal(false);
                      } else {
                        Alert.alert('Error', 'Por favor ingresa un costo válido');
                      }
                    }
                  } else {
                    Alert.alert('Error', 'Por favor completa el nombre del costo');
                  }
                }}
              >
                <Text style={styles.modalButtonTextPrimary}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.tint },
  header: {
    backgroundColor: Colors.tint,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    padding: 8,
  },
  headerText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
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
  fab: {
    position: 'absolute',
    bottom: 100, // Espacio para el footer
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D7263D',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1001, // Más alto que el footer
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 2,
    paddingBottom: 20, // Reducido para mejor scroll
  },
  productoInfoCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  productoNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  productoInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  productoInfoLabel: {
    fontSize: 14,
    color: '#888',
  },
  productoInfoValue: {
    fontSize: 14,
    color: '#888',
    fontWeight: 'normal',
  },
  sectionCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#888',
    marginTop: 12,
    fontWeight: 'bold',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
    textAlign: 'center',
  },
  ingredienteCard: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  ingredienteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ingredienteTipoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ingredienteTipo: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 4,
  },
  deleteButton: {
    padding: 4,
  },
  ingredienteNombre: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  ingredienteInfo: {
    marginBottom: 8,
  },
  ingredienteInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ingredienteInfoLabel: {
    fontSize: 13,
    color: '#888',
  },
  ingredienteInfoValue: {
    fontSize: 13,
    color: '#666',
    fontWeight: 'normal',
  },
  costoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  costoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  costoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 17,
    backgroundColor: '#fff',
    height: 44,
    marginBottom: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  costoTotalCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.tint,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  costoTotalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  costoTotalLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  costoTotalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.tint,
  },
  costoPorUnidad: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  deleteRecetaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF3B30',
    gap: 8,
    marginBottom: 8,
  },
  deleteRecetaText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    width: '85%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 17,
    color: Colors.tint,
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 15,
    color: '#444',
    marginBottom: 4,
    marginTop: 10,
    fontWeight: 'bold',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 17,
    backgroundColor: '#fff',
    height: 44,
    marginBottom: 8,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalPickerText: {
    fontSize: 17,
    color: '#222',
  },
  productosList: {
    maxHeight: 200,
    marginBottom: 12,
  },
  productoItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productoItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  productoItemText: {
    color: '#222',
    fontSize: 16,
  },
  productoItemTextSelected: {
    color: Colors.tint,
    fontWeight: 'bold',
  },
  productoItemPrice: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: Colors.tint,
  },
  modalButtonSecondary: {
    backgroundColor: '#666',
  },
  modalButtonTextPrimary: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalButtonTextSecondary: {
    color: 'white',
  },
  unidadItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  unidadItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  unidadItemText: {
    color: '#222',
    fontSize: 16,
  },
  unidadItemTextSelected: {
    color: Colors.tint,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  tipoButtons: {
    gap: 12,
    marginBottom: 20,
  },
  tipoButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tipoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  tipoButtonSubtext: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
    textAlign: 'center',
  },
  modalCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  productosListCompact: {
    maxHeight: 180, // Aumentado ligeramente para mejor visibilidad
    marginBottom: 12,
  },
  productoItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6, // Más compacto: reducido de 8 a 6
    paddingHorizontal: 10, // Más compacto: reducido de 12 a 10
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 38, // Altura mínima reducida de 44 a 38
  },
  productoItemContent: {
    flex: 1,
  },
  productoItemTextCompact: {
    color: '#222',
    fontSize: 14, // Más compacto: reducido de 15 a 14
    fontWeight: '500',
    lineHeight: 18, // Altura de línea compacta
  },
  productoItemPriceCompact: {
    color: '#888',
    fontSize: 11, // Más compacto: reducido de 12 a 11
    marginTop: 1, // Reducido de 2 a 1
    lineHeight: 14, // Altura de línea compacta
  },
  modalContentCompact: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16, // Reducido de 20 a 16
    margin: 20,
    maxHeight: '80%', // Asegurar que no ocupe toda la pantalla
    width: '90%',
    maxWidth: 400,
  },
  modalTitleCompact: {
    fontSize: 18, // Reducido de 20 a 18
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 16, // Reducido de 20 a 16
    textAlign: 'center',
  },
  modalHelperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  cantidadSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  tipoCostoButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tipoCostoButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  tipoCostoButtonActive: {
    backgroundColor: '#D7263D',
    borderColor: '#D7263D',
  },
  tipoCostoButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  tipoCostoButtonTextActive: {
    color: '#fff',
  },
  // Estilos para la lista de productos costeados
  productoCostItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  productoCostName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  productoCostValue: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
  },
  productoCostPrice: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  productoCostMargin: {
    fontSize: 14,
    color: '#D7263D',
    fontWeight: '600',
  },
  // Estilos para el filtro auto-ajustable
  filtroContainer: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  filtroInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 0,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 12,
    minHeight: 44,
  },
  filtroSearchIcon: {
    marginRight: 8,
  },
  filtroInputWithIcon: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: 'transparent',
  },
  filtroClearButton: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
});
