import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
// import { useFocusEffect } from '@react-navigation/native'; // Removed to fix LinkPreviewContext error
import * as Notifications from 'expo-notifications';
// import { useRouter } from 'expo-router'; // Removed to fix filename error
import { ref as dbRef, getDatabase, onValue } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../../components/UserContext';
import { Colors } from '../../constants/Colors';
import { APP_CONFIG, USER_ROLES } from '../../constants/Config';
import { ESTADOS_ORDEN } from '../../constants/Ordenes';
import { completarTarea as completarTareaFirebase, deleteTarea, getOrdenes, getOrdenesByUserRole, getProductos, getProveedores, getProveedorNombre, getTareasByUserRole, getUsuariosParaAsignacion, logoutFromFirebase, Orden, Producto, Proveedor, reactivarTarea as reactivarTareaFirebase, saveTarea, setupRealtimeNotifications, Tarea, updateOrden, updateTarea } from '../../services/firebase';
import { auth } from '../../services/firebaseConfig';
import { containsSearchTerm } from '../../utils/searchUtils';

// Componente Header
function Header({ title, onConfig, onLogout, onBack }: { title: string, onConfig?: () => void, onLogout?: () => void, onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: Colors.tint, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}> 
      <StatusBar backgroundColor={Colors.tint} barStyle="light-content" />
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerText}>{title}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {onConfig && (
          <TouchableOpacity onPress={onConfig} style={{ marginRight: 12 }}>
            <Ionicons name="settings-outline" size={28} color="#fff" />
          </TouchableOpacity>
        )}
        {onLogout && (
          <TouchableOpacity onPress={onLogout} style={{ marginLeft: 12 }}>
            <Ionicons name="log-out-outline" size={28} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.tint },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.tint,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 4,
    paddingTop: 1,
    paddingBottom: 16,
  },
  itemContainer: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
    flexDirection: 'column',
    alignItems: 'flex-start',
    minHeight: 40,
    marginHorizontal: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
  estadoHecha: {
    color: '#34C759',
    fontWeight: 'bold',
    marginTop: 4,
  },
  estadoPendiente: {
    color: '#FFA500',
    fontWeight: 'bold',
    marginTop: 4,
  },
  button: {
    backgroundColor: Colors.tint,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    marginBottom: 0,
    marginTop: 0,
    backgroundColor: '#f2f2f2',
    borderRadius: 0,
    overflow: 'hidden',
    width: '100%',
    paddingHorizontal: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    minWidth: 0,
  },
  tabActive: {
    backgroundColor: '#fff',
    borderBottomColor: '#D7263D',
  },
  tabText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.05,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  tabTextActive: {
    color: '#D7263D',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 6,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  topBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    marginLeft: 2,
    marginVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  topBadgeText: {
    fontWeight: 'bold',
    fontSize: 20,
    color: '#fff',
  },
  topTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  topSubtitle: {
    fontSize: 15,
    color: '#888',
    marginTop: 0,
  },
  topValue: {
    fontWeight: 'bold',
    color: '#D7263D',
    fontSize: 16,
  },
  priorityBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 4,
  },
  priorityBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  swipeableContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  swipeAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  swipeActionComplete: {
    backgroundColor: '#34C759',
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
  },
  separadorTareas: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  separadorTareasText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  separadorLinea: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  filtroTareasContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 0,
  },
  filtroTareasBoton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  filtroTareasBotonActivo: {
    backgroundColor: '#D7263D',
    borderColor: '#D7263D',
  },
  filtroTareasTexto: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  filtroTareasTextoActivo: {
    color: '#fff',
    fontWeight: '500',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#f2f2f2',
    borderRadius: 6,
    marginBottom: 4,
    marginTop: 1,
    marginHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
    overflow: 'hidden',
  },
  segmentedBtn: {
    flex: 1,
    paddingVertical: 6,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedBtnLeft: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  segmentedBtnRight: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  segmentedBtnActive: {
    backgroundColor: '#D7263D',
  },
  segmentedBtnText: {
    color: '#D7263D',
    fontWeight: '600',
    fontSize: 14,
  },
  segmentedBtnTextActive: {
    color: '#fff',
  },
  emptyTareasActivasContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  emptyTareasActivasIcon: {
    marginBottom: 16,
  },
  emptyTareasActivasTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D7263D',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyTareasActivasText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyTareasActivasSubtext: {
    fontSize: 14,
    color: '#28a745',
    textAlign: 'center',
    fontWeight: '500',
  },
});




export default function InicioScreen() {
  const { userData, onLogout } = useUser();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [vistaActual, setVistaActual] = useState<'ordenes' | 'productos' | 'proveedores' | 'tareas'>('tareas');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [vistaConfiguracion, setVistaConfiguracion] = useState(false);
  const [responsable, setResponsable] = useState('');
  const [eventos, setEventos] = useState<any[]>([]);
  const [filtroEvento, setFiltroEvento] = useState('');
  const [showActionsOverlay, setShowActionsOverlay] = useState(false);
  const [ordenAccion, setOrdenAccion] = useState<Orden | null>(null);
  const [proveedorAccion, setProveedorAccion] = useState<Proveedor | null>(null);
  const [nombreGuardado, setNombreGuardado] = useState('');
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [showFiltroAvanzado, setShowFiltroAvanzado] = useState(false);
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<Date | null>(null);
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<Date | null>(null);
  const [filtroTipoEvento, setFiltroTipoEvento] = useState<string>('');
  const [tiposEventosSeleccionados, setTiposEventosSeleccionados] = useState<string[]>([]);
  const [showDesdePicker, setShowDesdePicker] = useState(false);
  const [showHastaPicker, setShowHastaPicker] = useState(false);
  const [eventosFiltradosAvanzado, setEventosFiltradosAvanzado] = useState<any[]>([]);
  const [eventosCompletos, setEventosCompletos] = useState<any[]>([]);
  const [mostrarTodosEventos, setMostrarTodosEventos] = useState(false);
  const [cargandoEventos, setCargandoEventos] = useState(false);
  const [filtroTermino, setFiltroTermino] = useState('');
  const [topProductos, setTopProductos] = useState<any[]>([]);
  const [topProveedores, setTopProveedores] = useState<any[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [showCompletarTareaModal, setShowCompletarTareaModal] = useState(false);
  const [tareaCompletar, setTareaCompletar] = useState<Tarea | null>(null);
  const [observacionTarea, setObservacionTarea] = useState('');
  const [filtroTareas, setFiltroTareas] = useState<'mis' | 'todas'>('mis');
  const [showCrearTareaModal, setShowCrearTareaModal] = useState(false);
  const [tareaEditando, setTareaEditando] = useState<Tarea | null>(null);
  const [tituloTarea, setTituloTarea] = useState('');
  const [descripcionTarea, setDescripcionTarea] = useState('');
  const [prioridadTarea, setPrioridadTarea] = useState<'alta' | 'media' | 'baja'>('media');
  const [asignadoA, setAsignadoA] = useState('');
  const [nombreAsignado, setNombreAsignado] = useState('');
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<{ id: string, nombre: string, role: string }[]>([]);
  const [showSelectorUsuarios, setShowSelectorUsuarios] = useState(false);
  const [tareaPublica, setTareaPublica] = useState(false);
  const [seguidoresSeleccionados, setSeguidoresSeleccionados] = useState<string[]>([]);
  const [showSelectorSeguidores, setShowSelectorSeguidores] = useState(false);
  // const router = useRouter(); // Removed to fix filename error

  // Función para cargar tareas del usuario desde Firebase
  const cargarTareas = () => {
    if (!userData) {
      console.log('❌ No hay userData, no se pueden cargar tareas');
      return;
    }
    
    console.log('🔄 Cargando tareas desde Firebase...', { role: userData.role, filtroTareas });
    
    getTareasByUserRole(userData, filtroTareas, (tareasData) => {
      console.log('✅ Tareas cargadas desde Firebase:', tareasData.length);
      setTareas(tareasData);
    });
  };

  // Función para notificar tarea pendiente inmediata
  const notificarTareaPendiente = async (tareaCreada: Tarea) => {
    try {
      // Usar NotificationManager para control de duplicados
      const NotificationManager = (await import('../../services/notificationManager')).default;
      const notificationManager = NotificationManager.getInstance();
      
      // Crear un ID único para esta notificación
      const notificationId = `tarea_inmediata_${tareaCreada.id}`;
      
      // Usar la función centralizada del NotificationManager
      const sent = await notificationManager.scheduleNotification(
        '¡Nueva tarea asignada!',
        `Tarea: ${tareaCreada.titulo}`,
        'tarea_pendiente_inmediata',
        notificationId,
        null, // Inmediata
        { 
          tareaId: tareaCreada.id,
          timestamp: new Date().toISOString()
        },
        30000
      );
      
      if (sent) {
        console.log(`✅ Notificación inmediata enviada para tarea: ${tareaCreada.titulo}`);
      } else {
        console.log(`🚫 Notificación inmediata de tarea ya enviada, evitando duplicado: ${tareaCreada.id}`);
      }
    } catch (error) {
      console.error('❌ Error enviando notificación inmediata de tarea:', error);
    }
  };

  // Función para completar una tarea usando Firebase
  const completarTarea = async (tareaId: string, observacion: string) => {
    try {
      await completarTareaFirebase(tareaId, observacion);
      setShowCompletarTareaModal(false);
      setTareaCompletar(null);
      setObservacionTarea('');
      // Las tareas se actualizarán automáticamente por el listener de Firebase
    } catch (error) {
      console.error('❌ Error completando tarea:', error);
      Alert.alert('Error', 'No se pudo completar la tarea');
    }
  };

  // Función para reactivar una tarea usando Firebase
  const reactivarTarea = async (tareaId: string) => {
    try {
      await reactivarTareaFirebase(tareaId);
      // Las tareas se actualizarán automáticamente por el listener de Firebase
    } catch (error) {
      console.error('❌ Error reactivando tarea:', error);
      Alert.alert('Error', 'No se pudo reactivar la tarea');
    }
  };

  // Función para obtener tareas filtradas (ahora solo devuelve las tareas ya filtradas por Firebase)
  const obtenerTareasFiltradas = () => {
    return tareas; // Las tareas ya vienen filtradas desde Firebase
  };

  // Funciones para el modal de crear/editar tarea
  const abrirModalCrearTarea = () => {
    setTareaEditando(null);
    setTituloTarea('');
    setDescripcionTarea('');
    setPrioridadTarea('media');
    setTareaPublica(false); // Por defecto privada
    setSeguidoresSeleccionados([]); // Sin seguidores específicos
    // Por defecto asignar al usuario actual
    if (userData) {
      setAsignadoA(userData.id);
      
      // Determinar el nombre a mostrar con prioridad clara
      let nombreAMostrar = '';
      if (userData.displayName && userData.displayName.trim() !== '') {
        nombreAMostrar = userData.displayName;
        console.log('✅ Usando displayName:', userData.displayName);
      } else if (userData.username && userData.username.trim() !== '') {
        nombreAMostrar = userData.username;
        console.log('⚠️ displayName no disponible, usando username:', userData.username);
      } else {
        nombreAMostrar = userData.email;
        console.log('⚠️ displayName y username no disponibles, usando email:', userData.email);
      }
      
      setNombreAsignado(nombreAMostrar);
      
      console.log('🔧 Modal abierto - Usuario por defecto:', { 
        id: userData.id, 
        displayName: userData.displayName,
        username: userData.username,
        email: userData.email,
        nombreFinal: nombreAMostrar,
        displayNameExiste: !!userData.displayName,
        displayNameVacio: userData.displayName === '',
        displayNameUndefined: userData.displayName === undefined
      });
    }
    setShowCrearTareaModal(true);
  };

  const abrirModalEditarTarea = (tarea: Tarea) => {
    setTareaEditando(tarea);
    setTituloTarea(tarea.titulo);
    setDescripcionTarea(tarea.descripcion);
    setPrioridadTarea(tarea.prioridad);
    setAsignadoA(tarea.asignadaA);
    
    // Si la tarea está asignada al usuario actual, usar su displayName actualizado
    if (tarea.asignadaA === userData?.id && userData) {
      // Determinar el nombre a mostrar con prioridad clara
      let nombreAMostrar = '';
      if (userData.displayName && userData.displayName.trim() !== '') {
        nombreAMostrar = userData.displayName;
        console.log('✅ Editando tarea - Usando displayName actualizado:', userData.displayName);
      } else if (userData.username && userData.username.trim() !== '') {
        nombreAMostrar = userData.username;
        console.log('⚠️ Editando tarea - displayName no disponible, usando username:', userData.username);
      } else {
        nombreAMostrar = userData.email;
        console.log('⚠️ Editando tarea - displayName y username no disponibles, usando email:', userData.email);
      }
      
      setNombreAsignado(nombreAMostrar);
      console.log('🔧 Editando tarea - Usuario actualizado:', { 
        tareaUsuario: tarea.usuarioAsignado,
        usuarioActual: nombreAMostrar,
        displayName: userData.displayName,
        username: userData.username,
        email: userData.email
      });
    } else {
      setNombreAsignado(tarea.usuarioAsignado);
    }
    
    // Cargar configuración de visibilidad y seguidores
    setTareaPublica(tarea.publica === true); // Por defecto false si no está definido
    setSeguidoresSeleccionados(tarea.seguidores || []);
    
    setShowCrearTareaModal(true);
  };

  const cerrarModalTarea = () => {
    setShowCrearTareaModal(false);
    setTareaEditando(null);
    setTituloTarea('');
    setDescripcionTarea('');
    setPrioridadTarea('media');
    setAsignadoA('');
    setNombreAsignado('');
    setTareaPublica(false);
    setSeguidoresSeleccionados([]);
    // Cerrar también los modales de selección
    setShowSelectorUsuarios(false);
    setShowSelectorSeguidores(false);
  };

  const guardarTarea = async () => {
    if (!tituloTarea.trim()) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }

    if (!asignadoA || !nombreAsignado) {
      Alert.alert('Error', 'Debes seleccionar un usuario para asignar la tarea');
      return;
    }

    try {
      const tareaData: Omit<Tarea, 'id'> = {
        titulo: tituloTarea.trim(),
        descripcion: descripcionTarea.trim(),
        prioridad: prioridadTarea,
        completada: tareaEditando?.completada || false,
        asignadaA: asignadoA,
        usuarioAsignado: nombreAsignado,
        publica: tareaPublica,
        seguidores: tareaPublica ? seguidoresSeleccionados : [],
        createdAt: tareaEditando?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Solo agregar campos opcionales si tienen valor definido y no son undefined
      if (tareaEditando?.observacion && tareaEditando.observacion !== undefined) {
        tareaData.observacion = tareaEditando.observacion;
      }
      if (tareaEditando?.fechaCompletada && tareaEditando.fechaCompletada !== undefined) {
        tareaData.fechaCompletada = tareaEditando.fechaCompletada;
      }

      console.log('📝 Datos de tarea a guardar:', tareaData);

      if (tareaEditando) {
        // Editar tarea existente
        await updateTarea(tareaEditando.id, tareaData);
        console.log('✅ Tarea actualizada');
      } else {
        // Crear nueva tarea
        const tareaId = await saveTarea(tareaData);
        console.log('✅ Tarea creada');
        
        // Notificar si la tarea se asigna a alguien (no es para el usuario actual)
        if (asignadoA && asignadoA !== userData?.id) {
          const tareaCreada: Tarea = {
            ...tareaData,
            id: tareaId,
            asignadaA: asignadoA,
            usuarioAsignado: nombreAsignado
          };
          await notificarTareaPendiente(tareaCreada);
        }
      }

      cerrarModalTarea();
    } catch (error) {
      console.error('❌ Error guardando tarea:', error);
      Alert.alert('Error', 'No se pudo guardar la tarea');
    }
  };

  const eliminarTarea = async (tareaId: string) => {
    Alert.alert(
      'Eliminar Tarea',
      '¿Estás seguro de que quieres eliminar esta tarea?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTarea(tareaId);
              console.log('✅ Tarea eliminada');
            } catch (error) {
              console.error('❌ Error eliminando tarea:', error);
              Alert.alert('Error', 'No se pudo eliminar la tarea');
            }
          }
        }
      ]
    );
  };

  // Mapeo de tipos de eventos a nombres humanizados
  const eventoLabels: Record<string, string> = {
    'CREACION_ORDEN': 'Creación de Orden',
    'ACTUALIZACION_ORDEN': 'Actualización de Orden',
    'ELIMINACION_ORDEN': 'Eliminación de Orden',
    'ENVIO_WHATSAPP': 'Envío por WhatsApp',
    'IMPRESION_ORDEN': 'Impresión de Orden',
    'CREACION_PRODUCTO': 'Creación de Producto',
    'ACTUALIZACION_PRODUCTO': 'Actualización de Producto',
    'ELIMINACION_PRODUCTO': 'Eliminación de Producto',
    'CREACION_PROVEEDOR': 'Creación de Proveedor',
    'ACTUALIZACION_PROVEEDOR': 'Actualización de Proveedor',
    'ELIMINACION_PROVEEDOR': 'Eliminación de Proveedor',
    // Eventos de tareas
    'CREACION_TAREA': 'Creación de Tarea',
    'ACTUALIZACION_TAREA': 'Actualización de Tarea',
    'ELIMINACION_TAREA': 'Eliminación de Tarea',
    'TAREA_COMPLETADA': 'Completitud de Tarea',
    'TAREA_REACTIVADA': 'Reactivación de Tarea'
  };


  useEffect(() => {
    getProveedores((proveedoresData) => setProveedores(proveedoresData));
    
    // Usar órdenes filtradas por rol si hay usuario autenticado
    if (userData) {
      getOrdenesByUserRole(userData, (ordenesData) => {
        setOrdenes(ordenesData);
        setLoading(false);
      });
    } else {
      getOrdenes((ordenesData) => {
        setOrdenes(ordenesData);
        setLoading(false);
      });
    }
    
    getProductos((productosData) => setProductos(productosData));
    
    // Cargar tareas del usuario
    cargarTareas();
    
    // Cargar usuarios disponibles para asignación (solo para ADMIN)
    if (userData?.role === 'ADMIN') {
      console.log('🔄 Cargando usuarios disponibles para ADMIN...');
      getUsuariosParaAsignacion((usuarios) => {
        console.log('✅ Usuarios cargados:', usuarios);
        setUsuariosDisponibles(usuarios);
      });
    } else {
      console.log('⚠️ Usuario no es ADMIN, no cargando usuarios');
    }
  }, [userData, filtroTareas]); // Agregar filtroTareas como dependencia

  // Debug: Monitorear cambios en usuariosDisponibles y asignadoA
  useEffect(() => {
    console.log('🔍 Estado actualizado - usuariosDisponibles:', usuariosDisponibles.length, 'asignadoA:', asignadoA, 'nombreAsignado:', nombreAsignado);
  }, [usuariosDisponibles, asignadoA, nombreAsignado]);

  // useEffect para programar notificaciones de tareas pendientes
  useEffect(() => {
    if (!userData || tareas.length === 0) return;

    // Filtrar tareas pendientes del usuario actual
    const tareasPendientes = tareas.filter(t => !t.completada && t.asignadaA === userData.id);
    
    // Debug: Mostrar información sobre tareas pendientes
    console.log('🔍 Debug notificaciones de tareas:');
    console.log(`📊 Total tareas: ${tareas.length}`);
    console.log(`⏳ Tareas pendientes del usuario: ${tareasPendientes.length}`);
    console.log(`📋 Tareas pendientes:`, tareasPendientes.map(t => ({ id: t.id, titulo: t.titulo, completada: t.completada })));

    async function programarNotificacionesTareasPendientes() {
      try {
        // Cancela notificaciones previas de tareas
        const notificacionesProgramadas = await Notifications.getAllScheduledNotificationsAsync();
        const notificacionesTareas = notificacionesProgramadas.filter(n => 
          n.content.data?.type === 'tarea_pendiente_programada' || 
          n.content.data?.type === 'tarea_pendiente_manana'
        );
        
        for (const notif of notificacionesTareas) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
        
        console.log(`🧹 ${notificacionesTareas.length} notificaciones de tareas anteriores canceladas`);
        
        if (tareasPendientes.length === 0) {
          console.log('📱 No hay tareas pendientes, no se programarán notificaciones');
          return;
        }

        console.log('📱 Programando notificaciones cada 30 minutos para tareas pendientes...');
        
        const now = new Date();
        const hoy = now.toISOString().slice(0, 10); // yyyy-mm-dd
        
        // Determinar el mensaje de la notificación
        let tituloNotificacion = '';
        let cuerpoNotificacion = '';
        
        if (tareasPendientes.length === 1) {
          // Si hay solo una tarea pendiente, mostrar el título
          tituloNotificacion = '¡Tienes una tarea pendiente!';
          cuerpoNotificacion = `Tarea: ${tareasPendientes[0].titulo}`;
        } else {
          // Si hay múltiples tareas, mostrar la cantidad
          tituloNotificacion = '¡Tienes tareas pendientes!';
          cuerpoNotificacion = `${tareasPendientes.length} tareas pendientes`;
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
            const notificationId = `tarea_programada_${hora}_${hoy}`;
            
            // Usar la función centralizada del NotificationManager
            const scheduled = await notificationManager.scheduleNotification(
              tituloNotificacion,
              cuerpoNotificacion,
              'tarea_pendiente_programada',
              notificationId,
              { date: fecha },
              { 
                cantidad: tareasPendientes.length,
                timestamp: fecha.toISOString()
              },
              30000
            );
            
            if (scheduled) {
              console.log(`📱 Notificación de tarea programada para: ${fecha.toLocaleString()} - ${cuerpoNotificacion}`);
            } else {
              console.log(`🚫 Notificación de tarea ya programada para las ${hora}:00, evitando duplicado`);
            }
          }
        }
        
        // Programar notificación para mañana temprano si hay tareas pendientes
        const manana = new Date(now);
        manana.setDate(manana.getDate() + 1);
        manana.setHours(8, 0, 0, 0);
        
        // Usar NotificationManager para control de duplicados
        const NotificationManager = (await import('../../services/notificationManager')).default;
        const notificationManager = NotificationManager.getInstance();
        
        const mananaNotificationId = `tarea_manana_${manana.toISOString().split('T')[0]}`;
        
        const mananaScheduled = await notificationManager.scheduleNotification(
          '📋 Recordatorio de tareas pendientes',
          `Tienes ${tareasPendientes.length} tarea${tareasPendientes.length > 1 ? 's' : ''} pendiente${tareasPendientes.length > 1 ? 's' : ''} para hoy`,
          'tarea_pendiente_manana',
          mananaNotificationId,
          { date: manana },
          { 
            cantidad: tareasPendientes.length,
            timestamp: manana.toISOString()
          },
          30000
        );
        
        if (mananaScheduled) {
          console.log(`📱 Notificación de recordatorio programada para mañana: ${manana.toLocaleString()}`);
        } else {
          console.log(`🚫 Notificación de mañana ya programada, evitando duplicado`);
        }
        
        console.log('✅ Notificaciones de tareas programadas exitosamente');
      } catch (error) {
        console.error('❌ Error programando notificaciones de tareas:', error);
      }
    }

    programarNotificacionesTareasPendientes();
  }, [tareas, userData]);

  // useEffect para configurar notificaciones en tiempo real
  useEffect(() => {
    if (!userData) return;

    console.log('🔔 Configurando notificaciones en tiempo real para tareas...');

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
    const handleTareaNotification = async (tarea: Tarea) => {
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

  // Recargar datos cuando el componente se monta
  useEffect(() => {
    console.log('🔄 Tab de inicio montado - Recargando datos');
    getProveedores((proveedoresData) => setProveedores(proveedoresData));
    
    if (userData) {
        getOrdenesByUserRole(userData, (ordenesData) => {
          console.log('✅ Órdenes recargadas en inicio al enfocar tab:', {
            role: userData.role,
            totalOrdenes: ordenesData.length
          });
          setOrdenes(ordenesData);
        });
      } else {
        getOrdenes((ordenesData) => {
          setOrdenes(ordenesData);
        });
      }
      
      getProductos((productosData) => setProductos(productosData));
      
      // Recargar tareas
      cargarTareas();
    }, [userData, filtroTareas]);

  // Asegurar que PRODUCTOR no acceda a tabs restringidos
  useEffect(() => {
    if (userData?.role === 'PRODUCTOR' && (vistaActual === 'productos' || vistaActual === 'proveedores')) {
      setVistaActual('tareas');
    }
  }, [userData?.role, vistaActual]);

  // Procesar datos de productos y proveedores de manera segura
  useEffect(() => {
    try {
      // Procesar productos
      const productosConFrecuencia: Record<string, any> = {};
      
      productos.filter(p => !p.archivado).forEach(producto => {
        productosConFrecuencia[producto.id] = {
          nombre: producto.nombre,
          proveedorId: producto.proveedorId,
          ultimaCompra: null,
          diasSinComprar: Infinity,
          cantidadTotal: 0,
          nombreProveedor: proveedores.find(prov => prov.id === producto.proveedorId)?.nombre || 'Sin proveedor',
          nuncaComprado: true,
          ultimaOrdenId: null
        };
      });

      // Procesar órdenes
      ordenes.forEach(orden => {
        let fechaOrden: Date;
        
        try {
          if (orden.fecha && orden.fecha.includes('T')) {
            fechaOrden = new Date(orden.fecha);
          } else if (orden.fecha && orden.fecha.includes('-')) {
            const partes = orden.fecha.split(' ');
            const fechaParte = partes[0];
            const horaParte = partes[1] || '00:00:00';
            
            const [dia, mes, anio] = fechaParte.split('-').map(Number);
            const [hora, minuto, segundo] = horaParte.split(':').map(Number);
            
            fechaOrden = new Date(anio, mes - 1, dia, hora, minuto, segundo);
          } else {
            fechaOrden = new Date(orden.fecha);
          }
        } catch (error) {
          fechaOrden = new Date();
        }
        
        const esFechaValida = !isNaN(fechaOrden.getTime()) && orden.fecha && orden.fecha.trim() !== '';
        
        (orden.productos || []).forEach(p => {
          const productoId = (p as any).productoId || (p as any).id;
          if (productosConFrecuencia[productoId]) {
            productosConFrecuencia[productoId].nuncaComprado = false;
            productosConFrecuencia[productoId].cantidadTotal += Number((p as any).cantidad) || 0;
            
            if (esFechaValida) {
              if (!productosConFrecuencia[productoId].ultimaCompra || 
                  fechaOrden > productosConFrecuencia[productoId].ultimaCompra!) {
                productosConFrecuencia[productoId].ultimaCompra = fechaOrden;
                productosConFrecuencia[productoId].ultimaOrdenId = orden.id;
              }
            }
          }
        });
      });

      // Calcular días sin comprar
      const hoy = new Date();
      Object.keys(productosConFrecuencia).forEach(id => {
        if (!productosConFrecuencia[id].nuncaComprado && productosConFrecuencia[id].ultimaCompra) {
          try {
            const diffTime = hoy.getTime() - productosConFrecuencia[id].ultimaCompra.getTime();
            const diasCalculados = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diasCalculados >= 0 && diasCalculados <= 3650) {
              productosConFrecuencia[id].diasSinComprar = diasCalculados;
            } else {
              productosConFrecuencia[id].diasSinComprar = -1;
            }
          } catch (error) {
            productosConFrecuencia[id].diasSinComprar = -1;
          }
        }
      });

      // Ordenar productos
      const productosOrdenados = Object.entries(productosConFrecuencia)
        .sort((a, b) => {
          if (a[1].nuncaComprado && !b[1].nuncaComprado) return -1;
          if (!a[1].nuncaComprado && b[1].nuncaComprado) return 1;
          if (a[1].nuncaComprado && b[1].nuncaComprado) {
            return a[1].nombre.localeCompare(b[1].nombre);
          }
          return b[1].diasSinComprar - a[1].diasSinComprar;
        })
        .slice(0, 100)
        .map(([id, data]) => ({ id, ...data }));

      setTopProductos(productosOrdenados);

      // Procesar proveedores
      const proveedoresTotales: Record<string, { nombre: string; total: number }> = {};
      ordenes.forEach(orden => {
        if (!proveedoresTotales[orden.proveedorId]) {
          const prov = proveedores.find(p => p.id === orden.proveedorId);
          proveedoresTotales[orden.proveedorId] = {
            nombre: prov?.nombre || orden.proveedorId,
            total: 0
          };
        }
        proveedoresTotales[orden.proveedorId].total += 1;
      });

      const proveedoresOrdenados = Object.entries(proveedoresTotales)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([id, data]) => ({ id, ...data }));

      setTopProveedores(proveedoresOrdenados);

    } catch (error) {
      console.error('Error procesando datos:', error);
      setTopProductos([]);
      setTopProveedores([]);
    }
  }, [productos, ordenes, proveedores]);




  // Leer eventos de Firebase al abrir el modal
  useEffect(() => {
    if (vistaConfiguracion) {
      setCargandoEventos(true);
      const db = getDatabase();
      const eventosRef = dbRef(db, 'eventos');
      const unsub = onValue(eventosRef, (snapshot) => {
        const data = snapshot.val();
        const eventosArr = data ? Object.values(data) : [];
        const eventosOrdenados = eventosArr.reverse(); // más recientes primero
        setEventosCompletos(eventosOrdenados);
        // Por defecto mostrar solo los últimos 100
        setEventos(eventosOrdenados.slice(0, 100));
        setCargandoEventos(false);
      });
      return () => {
        unsub();
        setCargandoEventos(false);
      };
    }
  }, [vistaConfiguracion]);

  // useEffect para aplicar el filtro avanzado automáticamente
  useEffect(() => {
    let filtrados = [...eventos];
    if (filtroFechaDesde) {
      filtrados = filtrados.filter(ev => {
        const fechaEv = new Date(ev.fecha);
        return fechaEv >= filtroFechaDesde;
      });
    }
    if (filtroFechaHasta) {
      filtrados = filtrados.filter(ev => {
        const fechaEv = new Date(ev.fecha);
        return fechaEv <= filtroFechaHasta;
      });
    }
    if (filtroTipoEvento) {
      filtrados = filtrados.filter(ev =>
        (ev.tipoEvento || '').toUpperCase() === filtroTipoEvento.toUpperCase()
      );
    }
    setEventosFiltradosAvanzado(filtrados);
  }, [filtroFechaDesde, filtroFechaHasta, filtroTipoEvento, eventos]);

  // Función para cargar todos los eventos
  const cargarTodosEventos = () => {
    setEventos(eventosCompletos);
    setMostrarTodosEventos(true);
  };

  // Función para aplicar filtros avanzados
  const aplicarFiltrosAvanzados = () => {
    setCargandoEventos(true);
    
    // Simular un pequeño delay para mostrar el loading
    setTimeout(() => {
      let filtrados = [...eventosCompletos];
    
    // Filtro por término de búsqueda
    if (filtroTermino.trim()) {
      filtrados = filtrados.filter(ev =>
        containsSearchTerm(ev.responsable || '', filtroTermino) ||
        containsSearchTerm(ev.tipoEvento || '', filtroTermino) ||
        containsSearchTerm(ev.responsable || '', filtroTermino)
      );
    }
    
    // Filtro por fecha desde
    if (filtroFechaDesde) {
      filtrados = filtrados.filter(ev => {
        const fechaEv = new Date(ev.fecha);
        return fechaEv >= filtroFechaDesde;
      });
    }
    
    // Filtro por fecha hasta
    if (filtroFechaHasta) {
      filtrados = filtrados.filter(ev => {
        const fechaEv = new Date(ev.fecha);
        return fechaEv <= filtroFechaHasta;
      });
    }
    
    // Filtro por tipos de evento (multiselect)
    if (tiposEventosSeleccionados.length > 0) {
      filtrados = filtrados.filter(ev => 
        tiposEventosSeleccionados.includes(ev.tipoEvento)
      );
    }
    
      setEventos(filtrados);
      setMostrarTodosEventos(true);
      setCargandoEventos(false);
    }, 300);
  };

  // En la sección de renderizado de eventos:
  const eventosFiltrados =
    filtroFechaDesde || filtroFechaHasta || filtroTipoEvento || filtroTermino.trim()
      ? eventosFiltradosAvanzado
      : filtroEvento.trim().length === 0
        ? eventos
        : eventos.filter(ev =>
            containsSearchTerm(ev.responsable || '', filtroEvento)
          );

  // Renderizar el contenido según la vista actual
  const renderContenido = () => {
    if (loading) return <Text style={styles.emptyText}>Cargando...</Text>;

    switch (vistaActual) {
      case 'ordenes':
        // Filtrar proveedores que tienen órdenes programadas para hoy
        const hoy = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const hoyStr = `${pad(hoy.getDate())}-${pad(hoy.getMonth() + 1)}-${hoy.getFullYear()}`;
        
        const esDeHoy = (fechaStr: string): boolean => {
          if (!fechaStr) return false;
          // Soporta dd-mm-yyyy y yyyy-mm-dd
          if (/^\d{2}-\d{2}-\d{4}/.test(fechaStr)) {
            return fechaStr.startsWith(hoyStr);
          } else if (/^\d{4}-\d{2}-\d{2}/.test(fechaStr)) {
            const [y, m, d] = fechaStr.split(/[-T ]/);
            return `${d}-${m}-${y}` === hoyStr;
          }
          return false;
        };

        // Obtener órdenes de hoy
        const ordenesHoy = ordenes.filter(o => esDeHoy(o.fecha));
        
        // Obtener IDs únicos de proveedores que tienen órdenes programadas para hoy
        const proveedoresConOrdenesHoy = [...new Set(ordenesHoy.map(o => o.proveedorId))];
        
        // Filtrar proveedores que tienen órdenes programadas para hoy
        const proveedoresProgramadosHoy = proveedores.filter(p => 
          proveedoresConOrdenesHoy.includes(p.id)
        );

        console.log('🔍 Debug Proveedores Programados Hoy:', {
          totalOrdenes: ordenes.length,
          ordenesHoy: ordenesHoy.length,
          proveedoresConOrdenesHoy: proveedoresConOrdenesHoy.length,
          proveedoresProgramadosHoy: proveedoresProgramadosHoy.length,
          hoyStr: hoyStr
        });

        return (
          <FlatList
            data={proveedoresProgramadosHoy}
            keyExtractor={item => item.id}
            ListEmptyComponent={<Text style={styles.emptyText}>No hay proveedores programados para hoy</Text>}
            renderItem={({ item }) => {
              return (
                <View style={styles.itemContainer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ 
                      width: 20, 
                      height: 20, 
                      borderRadius: 10, 
                      borderWidth: 2, 
                      borderColor: '#D7263D',
                      marginRight: 12,
                      backgroundColor: 'transparent'
                    }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.nombre}</Text>
                      <Text style={{ color: '#D7263D', fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                        POR REALIZAR
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        );
      case 'productos':
        return (
          <FlatList
            data={topProductos}
            keyExtractor={item => item.id}
            ListEmptyComponent={<Text style={styles.emptyText}>No hay productos registrados.</Text>}
            renderItem={({ item, index }) => {
              const esNuncaComprado = item.nuncaComprado;
              const esFechaInvalida = !esNuncaComprado && item.diasSinComprar === -1; // Fecha inválida
              const esMuyUrgente = !esNuncaComprado && item.diasSinComprar > 30; // Más de 30 días sin comprar
              const esUrgente = !esNuncaComprado && item.diasSinComprar > 15; // Más de 15 días sin comprar
              
              let colorBadge = '#eee';
              let iconoBadge = 'cube-outline';
              
              if (esNuncaComprado) {
                colorBadge = '#ff4757'; // Rojo para nunca comprados (NO aparecen en ninguna orden)
                iconoBadge = 'alert-circle';
              } else if (esFechaInvalida) {
                colorBadge = '#9c88ff'; // Púrpura para fechas inválidas
                iconoBadge = 'help-circle';
              } else if (esMuyUrgente) {
                colorBadge = '#ff6b6b'; // Rojo claro para muy urgente
                iconoBadge = 'warning';
              } else if (esUrgente) {
                colorBadge = '#ffa502'; // Naranja para urgente
                iconoBadge = 'time';
              } else {
                colorBadge = '#2ed573'; // Verde para recientes
                iconoBadge = 'checkmark-circle';
              }

              return (
                <TouchableOpacity
                  onPress={() => {
                    console.log('🔍 Tap detectado en producto:', item.nombre);
                    
                    // Mostrar menú de opciones
                    const opciones = [];
                    
                    // Opción 1: Ver detalles del producto
                    opciones.push({
                      text: 'Ver Producto',
                      onPress: () => {
                        console.log('📦 Navegando a detalles del producto:', item.nombre);
                        console.log('📦 Navegando a detalles del producto:', item.id);
                      }
                    });
                    
                    // Opción 2: Ver última orden (solo si existe)
                    if (!esNuncaComprado && item.ultimaOrdenId) {
                      opciones.push({
                        text: 'Ver Última Orden',
                        onPress: () => {
                          const ordenEncontrada = ordenes.find(o => o.id === item.ultimaOrdenId);
                          if (ordenEncontrada) {
                            console.log('🚀 Navegando a última orden:', ordenEncontrada.id);
                            console.log('🚀 Navegando a última orden:', ordenEncontrada.id);
                          } else {
                            Alert.alert('Error', 'No se encontró la última orden');
                          }
                        }
                      });
                    }
                    
                    // Opción 3: Cancelar
                    opciones.push({
                      text: 'Cancelar',
                      style: 'cancel' as const
                    });
                    
                    Alert.alert(
                      `Producto: ${item.nombre}`,
                      `¿Qué deseas hacer con este producto?`,
                      opciones
                    );
                  }}
                  activeOpacity={0.7}
                  disabled={false}
                  style={{ 
                    opacity: 1
                  }}
                >
                  <View style={[styles.topCard]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.topBadge, { backgroundColor: colorBadge }]}>
                        <Ionicons name={iconoBadge as any} size={22} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.topTitle}>{item.nombre}</Text>
                        <Text style={styles.topSubtitle}>
                          <Text style={styles.topValue}>{item.nombreProveedor}</Text>
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          {esNuncaComprado ? (
                            <Text style={{ color: '#ff4757', fontSize: 13, fontWeight: '600' }}>
                              ⚠️ No existe en ninguna orden
                            </Text>
                          ) : esFechaInvalida ? (
                            <Text style={{ color: '#9c88ff', fontSize: 13, fontWeight: '600' }}>
                              Última compra: hace ? días (fecha inválida)
                            </Text>
                          ) : (
                            <>
                              <Text style={{ color: '#666', fontSize: 13 }}>
                                Última compra: hace{' '}
                              </Text>
                              <Text style={{ 
                                color: esMuyUrgente ? '#ff4757' : esUrgente ? '#ffa502' : '#2ed573', 
                                fontSize: 13, 
                                fontWeight: '600' 
                              }}>
                                {item.diasSinComprar} día{item.diasSinComprar !== 1 ? 's' : ''}
                              </Text>
                            </>
                          )}
                        </View>
                        {!esNuncaComprado && item.cantidadTotal > 0 && (
                          <Text style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
                            Total pedido: {item.cantidadTotal} unidades
                          </Text>
                        )}

                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        );
      case 'proveedores':
        return (
          <FlatList
            data={topProveedores}
            keyExtractor={item => item.id}
            ListEmptyComponent={<Text style={styles.emptyText}>No hay proveedores con órdenes.</Text>}
            renderItem={({ item, index }) => (
              <View style={styles.topCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[
                    styles.topBadge,
                    { backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#eee' }
                  ]}>
                    <Text style={[
                      styles.topBadgeText,
                      { color: index < 3 ? '#fff' : '#D7263D' }
                    ]}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topTitle}>{item.nombre}</Text>
                    <Text style={styles.topSubtitle}>
                      Órdenes: <Text style={styles.topValue}>{item.total}</Text>
                    </Text>
                  </View>
                </View>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        );
      case 'tareas':
        // Obtener tareas filtradas
        const tareasFiltradas = obtenerTareasFiltradas();
        const tareasActivas = tareasFiltradas.filter(t => !t.completada);
        const tareasCompletadas = tareasFiltradas.filter(t => t.completada);
        
        return (
          <>
            {/* Debug info */}
            {console.log('🔍 Renderizando tareas - Usuario:', userData?.role, 'Filtro:', filtroTareas)}
            
            
            {/* Filtro de tareas para ADMIN */}
            {userData?.role === 'ADMIN' && (
              <View style={styles.segmentedContainer}>
                
                {[
                  { key: 'mis', label: 'Mis Tareas' },
                  { key: 'todas', label: 'Todas las Tareas' },
                ].map(f => (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      styles.segmentedBtn, 
                      filtroTareas === f.key && styles.segmentedBtnActive,
                      f.key === 'mis' && styles.segmentedBtnLeft,
                      f.key === 'todas' && styles.segmentedBtnRight
                    ]}
                    onPress={() => setFiltroTareas(f.key as 'todas' | 'mis')}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.segmentedBtnText, 
                      filtroTareas === f.key && styles.segmentedBtnTextActive
                    ]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {/* Botón flotante para crear nueva tarea (solo para ADMIN) */}
            {userData?.role === 'ADMIN' && (
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
                onPress={abrirModalCrearTarea}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={28} color="#fff" />
              </TouchableOpacity>
            )}
            
            <View style={{ marginHorizontal: 2 }}>
              <FlatList
                data={tareasFiltradas}
                keyExtractor={item => item.id}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No hay tareas asignadas.</Text>
                </View>
              }
            ListHeaderComponent={
              tareasActivas.length === 0 ? (
                <View style={styles.emptyTareasActivasContainer}>
                  <View style={styles.emptyTareasActivasIcon}>
                    <Ionicons name="checkmark-circle-outline" size={48} color="#D7263D" />
                  </View>
                  <Text style={styles.emptyTareasActivasTitle}>
                    ¡Excelente trabajo!
                  </Text>
                  <Text style={styles.emptyTareasActivasText}>
                    No tienes tareas pendientes en este momento
                  </Text>
                  {tareasCompletadas.length > 0 && (
                    <Text style={styles.emptyTareasActivasSubtext}>
                      Tienes {tareasCompletadas.length} tarea{tareasCompletadas.length !== 1 ? 's' : ''} completada{tareasCompletadas.length !== 1 ? 's' : ''} más abajo
                    </Text>
                  )}
                </View>
              ) : null
            }
            renderItem={({ item, index }) => {
              // Verificar si necesitamos mostrar la línea separadora
              const mostrarSeparador = item.completada && (
                index === 0 || // Primera tarea completada
                (index > 0 && !tareas[index - 1].completada) // Transición de activa a completada
              );
              
              return (
                <>
                  {mostrarSeparador && (
                    <View style={styles.separadorTareas}>
                      <View style={styles.separadorLinea} />
                      <Text style={styles.separadorTareasText}>Tareas Completadas</Text>
                      <View style={styles.separadorLinea} />
                    </View>
                  )}
                                    <TouchableOpacity
                    onPress={() => {
                      // Mostrar opciones para la tarea
                      const opciones = [];
                      
                      // Solo permitir editar si es ADMIN o si la tarea está asignada al usuario actual
                      const puedeEditar = userData?.role === 'ADMIN' || item.asignadaA === userData?.id;
                      
                      if (puedeEditar) {
                        opciones.push({
                          text: 'Editar Tarea',
                          onPress: () => abrirModalEditarTarea(item)
                        });
                        
                        // Solo ADMIN puede eliminar tareas
                        if (userData?.role === 'ADMIN') {
                          opciones.push({
                            text: 'Eliminar Tarea',
                            style: 'destructive' as const,
                            onPress: () => eliminarTarea(item.id)
                          });
                        }
                      }
                      
                      opciones.push({
                        text: 'Cancelar',
                        style: 'cancel' as const
                      });
                      
                      if (opciones.length > 1) {
                        Alert.alert(
                          `Tarea: ${item.titulo}`,
                          '¿Qué deseas hacer?',
                          opciones
                        );
                      }
                    }}
                    onLongPress={() => {
                      if (!item.completada) {
                        // Completar tarea activa
                        setTareaCompletar(item);
                        setShowCompletarTareaModal(true);
                      } else {
                        // Reactivar tarea completada
                        Alert.alert(
                          'Reactivar Tarea',
                          `¿Deseas reactivar la tarea "${item.titulo}"?`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            { 
                              text: 'Reactivar', 
                              style: 'default',
                              onPress: () => reactivarTarea(item.id)
                            }
                          ]
                        );
                      }
                    }}
                  activeOpacity={0.85}
                  style={[styles.itemContainer, item.completada && { opacity: 0.6 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, marginRight: 6 }}>
                      <Text style={[styles.itemName, item.completada && { textDecorationLine: 'line-through' }]}>
                        {item.titulo}
                      </Text>
                      <Text style={{ color: '#666', fontSize: 12, marginTop: 1 }}>
                        {item.descripcion}
                      </Text>
                      {item.observacion && (
                        <Text style={{ color: '#34C759', fontSize: 10, marginTop: 1, fontStyle: 'italic' }}>
                          📝 {item.observacion}
                        </Text>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <View style={[
                        styles.priorityBadge,
                        { 
                          backgroundColor: item.prioridad === 'alta' ? '#ff4757' : 
                                         item.prioridad === 'media' ? '#ffa502' : '#2ed573' 
                        }
                      ]}>
                        <Text style={styles.priorityBadgeText}>
                          {item.prioridad.toUpperCase()}
                        </Text>
                      </View>
                      {userData?.role === 'ADMIN' && item.usuarioAsignado && (
                        <View style={[
                          styles.priorityBadge,
                          { backgroundColor: '#D7263D', marginLeft: 3 }
                        ]}>
                          <Text style={styles.priorityBadgeText}>
                            {item.usuarioAsignado}
                          </Text>
                        </View>
                      )}
                      {item.completada && (
                        <View style={{ marginLeft: 3 }}>
                          <Ionicons name="checkmark-circle" size={14} color="#34C759" />
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
                </>
              );
            }}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
            </View>
          </>
        );
      case 'proveedores':
        return (
          <FlatList
            data={topProveedores}
            keyExtractor={item => item.id}
            ListEmptyComponent={<Text style={styles.emptyText}>No hay proveedores con órdenes.</Text>}
            renderItem={({ item, index }) => (
              <View style={styles.topCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[
                    styles.topBadge,
                    { backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#eee' }
                  ]}>
                    <Text style={[
                      styles.topBadgeText,
                      { color: index < 3 ? '#fff' : '#D7263D' }
                    ]}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topTitle}>{item.nombre}</Text>
                    <Text style={styles.topSubtitle}>
                      Órdenes: <Text style={styles.topValue}>{item.total}</Text>
                    </Text>
                  </View>
                </View>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        );
    }
  };

  // In InicioScreen, add useEffect to load responsable from AsyncStorage when the modal opens
  useEffect(() => {
    if (vistaConfiguracion) {
      AsyncStorage.getItem('responsableApp').then(val => {
        setResponsable(val || '');
        setNombreGuardado(val || '');
      });
    }
  }, [vistaConfiguracion]);

  // Función para renderizar la vista de configuración
  const renderVistaConfiguracion = () => (
    <ScrollView style={{ flex: 1 }}>

      {/* Sección de Perfil */}
      <View style={{ backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        {/* Header del perfil */}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 12 }}>
          <View style={{ 
            width: 50, 
            height: 50, 
            borderRadius: 25, 
            backgroundColor: '#e63946', 
            justifyContent: 'center', 
            alignItems: 'center', 
            marginRight: 12 
          }}>
            <Ionicons name="person" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            {editandoNombre ? (
              <TextInput
                style={{ 
                  fontSize: 18, 
                  fontWeight: 'bold', 
                  color: '#333',
                  borderBottomWidth: 2,
                  borderBottomColor: '#e63946',
                  paddingBottom: 2,
                  marginBottom: 8
                }}
                value={responsable}
                onChangeText={setResponsable}
                autoCapitalize="words"
                autoFocus={true}
                onBlur={() => setEditandoNombre(false)}
                placeholder="Ingrese su nombre..."
                placeholderTextColor="#999"
              />
            ) : (
              <TouchableOpacity 
                onPress={() => setEditandoNombre(true)}
                style={{ marginBottom: 8 }}
              >
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>
                  {userData?.displayName || responsable || auth.currentUser?.email?.split('@')[0] || userData?.username || 'Toca para agregar nombre'}
                </Text>
                <Text style={{ fontSize: 10, color: '#999', fontStyle: 'italic' }}>
                  Toca para editar
                </Text>
              </TouchableOpacity>
            )}
            <Text style={{ fontSize: 12, color: '#999' }}>
              @{auth.currentUser?.email?.split('@')[0] || userData?.username || 'usuario'}
            </Text>
          </View>
        </View>

        {/* Información del perfil */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          {/* Rol */}
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="shield-checkmark" size={16} color="#666" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 14, color: '#333', flex: 1 }}>
                {userData?.role === USER_ROLES.ADMIN ? 'Administrador' : userData?.role === USER_ROLES.PRODUCTOR ? 'Productor' : userData?.role || 'Usuario'}
              </Text>
            </View>
          </View>

          {/* Email */}
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="mail" size={16} color="#666" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 14, color: '#333', flex: 1 }} selectable>
                {auth.currentUser?.email || userData?.email || 'No disponible'}
              </Text>
            </View>
          </View>
        </View>

        {/* Botón de guardar al final - Solo si hay cambios */}
        {responsable.trim() && nombreGuardado !== responsable.trim() && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#e63946',
                borderRadius: 8,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              onPress={async () => {
                await AsyncStorage.setItem('responsableApp', responsable.trim());
                setNombreGuardado(responsable.trim() || '');
                setEditandoNombre(false);
              }}
            >
              <Ionicons name="save" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                Guardar Cambios
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Sección de eventos - Solo para ADMIN */}
      {userData && userData.role === USER_ROLES.ADMIN && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', padding: 10, paddingTop: 8 }}>
            <TextInput
              style={{ flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 6, padding: 7, fontSize: 14, marginBottom: 0, backgroundColor: '#fafbfc' }}
              placeholder="Filtrar evento..."
              value={filtroEvento}
              onChangeText={setFiltroEvento}
            />
            <TouchableOpacity 
              onPress={() => setShowFiltroAvanzado(true)} 
              style={{ marginLeft: 8, padding: 8, backgroundColor: (filtroFechaDesde || filtroFechaHasta || tiposEventosSeleccionados.length > 0) ? '#e63946' : '#f0f0f0', borderRadius: 6 }}
            >
              <Ionicons name="options" size={20} color={(filtroFechaDesde || filtroFechaHasta || tiposEventosSeleccionados.length > 0) ? '#fff' : '#666'} />
            </TouchableOpacity>
          </View>
          
          {/* Lista de eventos filtrados */}
          <View style={{ flex: 1, padding: 10 }}>
            {cargandoEventos ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Ionicons name="sync" size={24} color="#e63946" style={{ marginBottom: 8 }} />
                <Text style={{ color: '#e63946', fontSize: 14, fontWeight: '600' }}>Obteniendo eventos...</Text>
              </View>
            ) : (
              <>
                <Text style={{ color: '#333', fontSize: 13, fontWeight: 'bold', marginBottom: 6 }}>
                  {`Mostrando ${eventosFiltrados.length} evento${eventosFiltrados.length === 1 ? '' : 's'}`}
                </Text>
                
                {eventosFiltrados.length === 0 ? (
                  <Text style={{ color: '#888', fontSize: 13, textAlign: 'center', marginTop: 10 }}>No hay eventos para mostrar.</Text>
                ) : (
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
                    {eventosFiltrados.map((item, index) => (
                      <View key={index} style={{ 
                        backgroundColor: '#f6f6f6', 
                        borderRadius: 6, 
                        padding: 7, 
                        marginBottom: 6, 
                        borderLeftWidth: 3, 
                        borderLeftColor: '#e63946',
                        shadowColor: '#000',
                        shadowOpacity: 0.02,
                        shadowRadius: 1,
                        elevation: 1
                      }}>
                        <Text style={{ fontWeight: 'bold', color: '#e63946', fontSize: 13, marginBottom: 1 }}>
                          {eventoLabels[item.tipoEvento?.toUpperCase()] || eventoLabels[item.tipoEvento] || item.tipoEvento}
                        </Text>
                        <Text style={{ color: '#333', fontSize: 12 }}>Resp: <Text style={{ fontWeight: 'bold' }}>{item.responsable}</Text></Text>
                        <Text style={{ color: '#555', fontSize: 11 }}>Fecha: {item.fecha?.replace('T', ' ').slice(0, 19)}</Text>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </>
            )}
          </View>
        </>
      )}
      
      {/* Mensaje para productores */}
      {userData && userData.role === USER_ROLES.PRODUCTOR && (
        <View style={{ flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#888', fontSize: 16, textAlign: 'center' }}>
            Configuración de eventos solo disponible para administradores
          </Text>
        </View>
      )}
    </ScrollView>
  );

  // Renderizar el contenido según la vista actual
  return (
    <View style={styles.safeArea}>
      <Header 
        title={vistaConfiguracion ? "Configuración v" + APP_CONFIG.APP_VERSION : "Inicio"} 
        onConfig={!vistaConfiguracion ? () => setVistaConfiguracion(true) : undefined}
        onBack={vistaConfiguracion ? () => setVistaConfiguracion(false) : undefined}
        onLogout={() => {
          Alert.alert('Cerrar Sesión', '¿Estás seguro de que quieres cerrar la sesión?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Cerrar Sesión', onPress: async () => {
              try {
                console.log('🔐 Cerrando sesión desde header...');
                console.log('🔍 onLogout disponible:', !!onLogout);
                if (onLogout) {
                  console.log('🔄 Usando onLogout del contexto...');
                  await onLogout();
                } else {
                  console.log('🔄 Usando logoutFromFirebase directamente...');
                  await logoutFromFirebase();
                }
                console.log('✅ Sesión cerrada exitosamente desde header');
              } catch (error) {
                console.error('❌ Error al cerrar sesión desde header:', error);
              }
            }}
          ]);
        }} 
      />
      {!vistaConfiguracion && (
        <View style={styles.tabsRow}>
          {[
            { key: 'tareas', title: 'Tareas', icon: 'checkmark-circle' },
            { key: 'ordenes', title: 'Órdenes', icon: 'list' },
            // Solo mostrar Productos y Contactos si el usuario es ADMIN
            ...(userData?.role === 'ADMIN' ? [
              { key: 'productos', title: 'Productos', icon: 'cube' },
              { key: 'proveedores', title: 'Contactos', icon: 'people' },
            ] : []),
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, vistaActual === tab.key && styles.tabActive]}
              onPress={() => setVistaActual(tab.key as any)}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={vistaActual === tab.key ? '#D7263D' : '#666'}
              />
              <Text style={[styles.tabText, vistaActual === tab.key && styles.tabTextActive]}>
                {tab.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.container}>
        {vistaConfiguracion ? renderVistaConfiguracion() : renderContenido()}
      </View>
      
      {/* Modal para completar tarea */}
      <Modal
        visible={showCompletarTareaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCompletarTareaModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 18, width: '90%', maxWidth: 400 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#D7263D', marginBottom: 16, textAlign: 'center' }}>
              Completar Tarea
            </Text>
            
            {tareaCompletar && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#222', marginBottom: 8 }}>
                  {tareaCompletar.titulo}
                </Text>
                <Text style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>
                  {tareaCompletar.descripcion}
                </Text>
              </View>
            )}
            
            <TextInput
              style={{ 
                borderWidth: 1, 
                borderColor: '#ddd', 
                borderRadius: 8, 
                padding: 12, 
                fontSize: 16, 
                marginBottom: 20,
                minHeight: 80,
                textAlignVertical: 'top'
              }}
              placeholder="Observaciones (opcional)..."
              value={observacionTarea}
              onChangeText={setObservacionTarea}
              multiline
            />
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#f0f0f0',
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: 'center',
                  marginRight: 6
                }}
                onPress={() => {
                  setShowCompletarTareaModal(false);
                  setTareaCompletar(null);
                  setObservacionTarea('');
                }}
              >
                <Text style={{ color: '#666', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#34C759',
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: 'center'
                }}
                onPress={async () => {
                  if (!tareaCompletar) return;
                  await completarTarea(tareaCompletar.id, observacionTarea);
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Completar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Overlay absoluto para acciones de orden */}
      {showActionsOverlay && ordenAccion && proveedorAccion && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 18, width: '85%', maxHeight: '60%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#D7263D', marginBottom: 16, textAlign: 'center' }}>
              Acciones para la Orden
            </Text>
            <TouchableOpacity
              style={{ marginBottom: 12, padding: 14, backgroundColor: '#25D366', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
              onPress={async () => {
                setShowActionsOverlay(false);
                let msg = `*Pedido Fecha: ${ordenAccion.fecha}*\n*Panadería Nueva Río D'or*\n*TEJAS DE LA CRUZ YOSBANY*\n\n`;
                (ordenAccion.productos || []).forEach((p: any) => {
                  // Compatibilidad con ambas estructuras: nueva (id) y antigua (productoId)
                  const productoId = p.id || p.productoId;
                  const prod = productos.find((prod) => prod.id === productoId);
                  const nombreProducto = prod?.nombre || p.nombre || 'Producto no encontrado';
                  msg += `• *${p.cantidad} ${p.unidad.toUpperCase()}* - ${nombreProducto.toUpperCase()}\n`;
                });
                msg += `\n--------------------------------\n`;
                msg += `Total Items: ${ordenAccion.productos?.length || 0}\n`;
                msg += `Total Unidades: ${(ordenAccion.productos || []).reduce((a: any, p: any) => a + Number(p.cantidad), 0)}\n`;
                const phone = proveedorAccion.celular!.toString().replace(/[^\d]/g, '');
                const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
                Linking.openURL(url);
                // Cambiar estado a ENVIADA / IMPRESA si no lo está
                if (ordenAccion.estado !== ESTADOS_ORDEN.ENVIADA_IMPRESA) {
                  const nuevaOrden = { ...ordenAccion, estado: ESTADOS_ORDEN.ENVIADA_IMPRESA };
                  await updateOrden(ordenAccion.id, nuevaOrden);
                  // Refrescar lista local
                  getOrdenes((ordenesData) => setOrdenes(ordenesData));
                }
              }}
            >
              <Ionicons name="logo-whatsapp" size={22} color="#fff" style={{ marginRight: 10 }} />
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Enviar por WhatsApp</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{ marginBottom: 12, padding: 14, backgroundColor: '#D7263D', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialCommunityIcons name="printer" size={22} color="#fff" style={{ marginRight: 10 }} />
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Imprimir Orden</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{ marginTop: 18, padding: 10, backgroundColor: '#666', borderRadius: 5, alignItems: 'center' }}
              onPress={() => setShowActionsOverlay(false)}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* Modal de filtro avanzado */}
      <Modal
        visible={showFiltroAvanzado}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFiltroAvanzado(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%', maxWidth: 400 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16, textAlign: 'center' }}>
              Filtros Avanzados
            </Text>
            
            <TouchableOpacity
              style={{ marginTop: 20, padding: 12, backgroundColor: '#666', borderRadius: 8, alignItems: 'center' }}
              onPress={() => setShowFiltroAvanzado(false)}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Modal para crear/editar tarea */}
      <Modal
        visible={showCrearTareaModal && !showSelectorUsuarios && !showSelectorSeguidores}
        transparent
        animationType="slide"
        onRequestClose={cerrarModalTarea}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 18, width: '90%', maxWidth: 400, maxHeight: '80%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#D7263D', marginBottom: 16, textAlign: 'center' }}>
              {tareaEditando ? 'Editar Tarea' : 'Crear Nueva Tarea'}
            </Text>
            
            <ScrollView style={{ maxHeight: 400 }}>
              {/* Título */}
              <Text style={{ fontWeight: '600', marginBottom: 8, color: '#333' }}>Título</Text>
              <TextInput
                style={{ 
                  borderWidth: 1, 
                  borderColor: '#ddd', 
                  borderRadius: 8, 
                  padding: 12, 
                  marginBottom: 16,
                  fontSize: 16
                }}
                value={tituloTarea}
                onChangeText={setTituloTarea}
                placeholder="Título de la tarea"
                autoCapitalize="sentences"
              />

              {/* Descripción */}
              <Text style={{ fontWeight: '600', marginBottom: 8, color: '#333' }}>Descripción</Text>
              <TextInput
                style={{ 
                  borderWidth: 1, 
                  borderColor: '#ddd', 
                  borderRadius: 8, 
                  padding: 12, 
                  marginBottom: 16,
                  fontSize: 16,
                  minHeight: 80,
                  textAlignVertical: 'top'
                }}
                value={descripcionTarea}
                onChangeText={setDescripcionTarea}
                placeholder="Descripción de la tarea"
                multiline
                numberOfLines={3}
                autoCapitalize="sentences"
              />

              {/* Prioridad */}
              <Text style={{ fontWeight: '600', marginBottom: 8, color: '#333' }}>Prioridad</Text>
              <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
                {(['alta', 'media', 'baja'] as const).map((prioridad) => (
                  <TouchableOpacity
                    key={prioridad}
                    style={{
                      flex: 1,
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor: prioridadTarea === prioridad ? 
                        (prioridad === 'alta' ? '#ff4757' : 
                         prioridad === 'media' ? '#ffa502' : '#2ed573') : '#f5f5f5',
                      alignItems: 'center'
                    }}
                    onPress={() => setPrioridadTarea(prioridad)}
                  >
                    <Text style={{
                      color: prioridadTarea === prioridad ? '#fff' : '#666',
                      fontWeight: prioridadTarea === prioridad ? 'bold' : 'normal',
                      textTransform: 'capitalize'
                    }}>
                      {prioridad}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Asignar a */}
              <Text style={{ fontWeight: '600', marginBottom: 8, color: '#333' }}>Asignar a</Text>
              <TouchableOpacity
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onPress={() => setShowSelectorUsuarios(true)}
              >
                <Text style={{ 
                  fontSize: 16, 
                  color: nombreAsignado ? '#333' : '#999' 
                }}>
                  {nombreAsignado || 'Seleccionar usuario'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#999" />
              </TouchableOpacity>

              {/* Visibilidad */}
              <Text style={{ fontWeight: '600', marginBottom: 8, color: '#333' }}>Visibilidad</Text>
              <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: tareaPublica ? '#D7263D' : '#f5f5f5',
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6
                  }}
                  onPress={() => {
                    setTareaPublica(true);
                    setSeguidoresSeleccionados([]);
                    // Abrir automáticamente el modal de seguidores cuando se selecciona "Pública"
                    setShowSelectorSeguidores(true);
                  }}
                >
                  <Ionicons 
                    name="globe-outline" 
                    size={16} 
                    color={tareaPublica ? '#fff' : '#666'} 
                  />
                  <Text style={{
                    color: tareaPublica ? '#fff' : '#666',
                    fontWeight: tareaPublica ? 'bold' : 'normal'
                  }}>
                    Con Seguidores
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: !tareaPublica ? '#D7263D' : '#f5f5f5',
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6
                  }}
                  onPress={() => setTareaPublica(false)}
                >
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={16} 
                    color={!tareaPublica ? '#fff' : '#666'} 
                  />
                  <Text style={{
                    color: !tareaPublica ? '#fff' : '#666',
                    fontWeight: !tareaPublica ? 'bold' : 'normal'
                  }}>
                    Solo Asignado
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Seguidores (solo si tiene seguidores) */}
              {tareaPublica && (
                <>
                  <Text style={{ fontWeight: '600', marginBottom: 8, color: '#333' }}>
                    Seguidores ({seguidoresSeleccionados.length})
                  </Text>
                  <TouchableOpacity
                    style={{
                      borderWidth: 1,
                      borderColor: '#ddd',
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 16,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onPress={() => setShowSelectorSeguidores(true)}
                  >
                    <Text style={{ 
                      fontSize: 16, 
                      color: seguidoresSeleccionados.length > 0 ? '#333' : '#999' 
                    }}>
                      {seguidoresSeleccionados.length > 0 
                        ? `${seguidoresSeleccionados.length} seguidor${seguidoresSeleccionados.length > 1 ? 'es' : ''} seleccionado${seguidoresSeleccionados.length > 1 ? 's' : ''}`
                        : 'Seleccionar seguidores'
                      }
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#999" />
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>

            {/* Botones */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={{ 
                  flex: 1, 
                  padding: 12, 
                  backgroundColor: '#666', 
                  borderRadius: 8, 
                  alignItems: 'center' 
                }}
                onPress={cerrarModalTarea}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{ 
                  flex: 1, 
                  padding: 12, 
                  backgroundColor: '#D7263D', 
                  borderRadius: 8, 
                  alignItems: 'center',
                  opacity: !tituloTarea.trim() || !asignadoA ? 0.5 : 1
                }}
                onPress={guardarTarea}
                disabled={!tituloTarea.trim() || !asignadoA}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>
                  {tareaEditando ? 'Actualizar' : 'Crear'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Modal para seleccionar usuario */}
      <Modal
        visible={showSelectorUsuarios && showCrearTareaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSelectorUsuarios(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%', maxWidth: 400, maxHeight: '70%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16, textAlign: 'center' }}>
              Seleccionar Usuario
            </Text>
            
            <ScrollView style={{ maxHeight: 300 }}>
              {usuariosDisponibles.map((usuario) => (
                <TouchableOpacity
                  key={usuario.id}
                  style={{
                    padding: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#eee',
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: asignadoA === usuario.id ? '#f0f8ff' : 'transparent'
                  }}
                  onPress={() => {
                    setAsignadoA(usuario.id);
                    setNombreAsignado(usuario.nombre);
                    setShowSelectorUsuarios(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ 
                      fontSize: 16, 
                      fontWeight: asignadoA === usuario.id ? 'bold' : 'normal',
                      color: '#333' 
                    }}>
                      {usuario.nombre}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
                      {usuario.role}
                    </Text>
                  </View>
                  {asignadoA === usuario.id && (
                    <Ionicons name="checkmark" size={20} color="#D7263D" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={{ marginTop: 16, padding: 12, backgroundColor: '#666', borderRadius: 8, alignItems: 'center' }}
              onPress={() => setShowSelectorUsuarios(false)}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para seleccionar seguidores */}
      <Modal
        visible={showSelectorSeguidores && showCrearTareaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSelectorSeguidores(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%', maxWidth: 400, maxHeight: '70%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16, textAlign: 'center' }}>
              Seleccionar Seguidores
            </Text>
            
            <ScrollView style={{ maxHeight: 300 }}>
              {usuariosDisponibles
                .filter(usuario => usuario.id !== asignadoA) // Excluir al usuario asignado
                .map((usuario) => {
                  const isSelected = seguidoresSeleccionados.includes(usuario.id);
                  return (
                    <TouchableOpacity
                      key={usuario.id}
                      style={{
                        padding: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: '#eee',
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: isSelected ? '#f0f8ff' : 'transparent'
                      }}
                      onPress={() => {
                        if (isSelected) {
                          // Remover de seguidores
                          setSeguidoresSeleccionados(prev => 
                            prev.filter(id => id !== usuario.id)
                          );
                        } else {
                          // Agregar a seguidores
                          setSeguidoresSeleccionados(prev => [...prev, usuario.id]);
                        }
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ 
                          fontSize: 16, 
                          fontWeight: isSelected ? 'bold' : 'normal',
                          color: '#333' 
                        }}>
                          {usuario.nombre}
                        </Text>
                        <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
                          {usuario.role}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark" size={20} color="#D7263D" />
                      )}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
            
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, backgroundColor: '#666', borderRadius: 8, alignItems: 'center' }}
                onPress={() => setShowSelectorSeguidores(false)}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{ flex: 1, padding: 12, backgroundColor: '#D7263D', borderRadius: 8, alignItems: 'center' }}
                onPress={() => setShowSelectorSeguidores(false)}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>
                  Confirmar ({seguidoresSeleccionados.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Modal de filtro avanzado */}
      <Modal
        visible={showFiltroAvanzado}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFiltroAvanzado(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.18)', paddingBottom: 40 }}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '95%', maxWidth: 500 }}
          >
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 18, maxHeight: 600 }}>
              <Text style={{ fontWeight: 'bold', color: '#e63946', fontSize: 16, marginBottom: 12, textAlign: 'center' }}>Filtros Avanzados</Text>
              
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
                <Text style={{ fontSize: 14, color: '#333', marginBottom: 4 }}>Rango de fechas:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <TouchableOpacity 
                    onPress={() => setShowDesdePicker(true)} 
                    style={{ flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 6, padding: 7, backgroundColor: '#fafbfc' }}
                  >
                    <Text style={{ color: filtroFechaDesde ? '#222' : '#aaa' }}>
                      {filtroFechaDesde ? filtroFechaDesde.toLocaleDateString() : 'Desde...'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setShowHastaPicker(true)} 
                    style={{ flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 6, padding: 7, backgroundColor: '#fafbfc' }}
                  >
                    <Text style={{ color: filtroFechaHasta ? '#222' : '#aaa' }}>
                      {filtroFechaHasta ? filtroFechaHasta.toLocaleDateString() : 'Hasta...'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={{ fontSize: 14, color: '#333', marginBottom: 4, marginTop: 8 }}>Término de búsqueda:</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 6, padding: 7, backgroundColor: '#fafbfc', marginBottom: 12 }}
                  placeholder="Buscar evento..."
                  value={filtroTermino}
                  onChangeText={setFiltroTermino}
                />
                
                <Text style={{ fontSize: 14, color: '#333', marginBottom: 4 }}>Tipos de evento:</Text>
                <View style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 6, backgroundColor: '#fafbfc', marginBottom: 16 }}>
                  <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>
                    {Object.entries(eventoLabels).map(([tipo, label]) => (
                      <TouchableOpacity 
                        key={tipo} 
                        onPress={() => {
                          if (tiposEventosSeleccionados.includes(tipo)) {
                            setTiposEventosSeleccionados(prev => prev.filter(t => t !== tipo));
                          } else {
                            setTiposEventosSeleccionados(prev => [...prev, tipo]);
                          }
                        }} 
                        style={{ 
                          padding: 7, 
                          backgroundColor: tiposEventosSeleccionados.includes(tipo) ? '#fbeaec' : 'transparent',
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}
                      >
                        <View style={{
                          width: 16,
                          height: 16,
                          borderWidth: 2,
                          borderColor: tiposEventosSeleccionados.includes(tipo) ? '#e63946' : '#ccc',
                          borderRadius: 3,
                          backgroundColor: tiposEventosSeleccionados.includes(tipo) ? '#e63946' : 'transparent',
                          marginRight: 8,
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}>
                          {tiposEventosSeleccionados.includes(tipo) && (
                            <Ionicons name="checkmark" size={10} color="#fff" />
                          )}
                        </View>
                        <Text style={{ color: tiposEventosSeleccionados.includes(tipo) ? '#e63946' : '#333', flex: 1 }}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </ScrollView>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
              <TouchableOpacity 
                onPress={() => { 
                  setFiltroFechaDesde(null); 
                  setFiltroFechaHasta(null); 
                  setFiltroTipoEvento(''); 
                  setFiltroTermino(''); 
                  setTiposEventosSeleccionados([]);
                }}
              >
                <Text style={{ color: '#888', fontWeight: 'bold' }}>Limpiar</Text>
              </TouchableOpacity>
              <Text style={{ color: '#ccc', marginHorizontal: 8 }}>|</Text>
              <TouchableOpacity onPress={() => setShowFiltroAvanzado(false)}>
                <Text style={{ color: '#666', fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={{ color: '#ccc', marginHorizontal: 8 }}>|</Text>
              <TouchableOpacity 
                onPress={() => {
                  aplicarFiltrosAvanzados();
                  setShowFiltroAvanzado(false);
                }}
              >
                <Text style={{ color: '#e63946', fontWeight: 'bold' }}>Aplicar Filtros</Text>
              </TouchableOpacity>
            </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      
      {/* DateTimePickers para filtros */}
      {showDesdePicker && (
        <DateTimePicker
          value={filtroFechaDesde || new Date()}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowDesdePicker(false);
            if (date) setFiltroFechaDesde(date);
          }}
        />
      )}
      
      {showHastaPicker && (
        <DateTimePicker
          value={filtroFechaHasta || new Date()}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowHastaPicker(false);
            if (date) setFiltroFechaHasta(date);
          }}
        />
      )}
    </View>
  );
}
