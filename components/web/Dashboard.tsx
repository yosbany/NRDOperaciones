import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getOrdenesByUserRole, getProductos, getProveedores, getTareasByUserRole } from '../../services/firebaseService';
// Interfaces simples para los modelos
interface Orden {
  id: string;
  estado: string;
  fecha: string;
  hecha: boolean;
  proveedorId: string;
  productos: any[];
  tipo: string;
}

interface Producto {
  id: string;
  nombre: string;
  orden: number;
  precio: number;
  proveedorId: string;
  stock: number;
  unidad: string;
}

interface Proveedor {
  id: string;
  nombre: string;
  tipo: string;
  celular: string;
  salarioPorDia: number;
  frecuencia: string;
  productosDefault: string[];
  updatedAt: string;
}

interface Tarea {
  id: string;
  titulo: string;
  completada: boolean;
  descripcion: string;
  asignadaA: string;
  usuarioAsignado: string;
  prioridad: string;
  publica: boolean;
  seguidores: string[];
  observacion: string;
  createdAt: string;
  updatedAt: string;
  fechaCompletada?: string;
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        try {
          // Cargar órdenes y tareas usando callbacks
          getOrdenesByUserRole(user, (ordenesData) => {
            setOrdenes(ordenesData);
          });
          
          getTareasByUserRole(user, (tareasData) => {
            setTareas(tareasData);
          });
          
          if (user.role === 'ADMIN') {
            getProveedores((proveedoresData) => {
              setProveedores(proveedoresData);
            });
            
            getProductos((productosData) => {
              setProductos(productosData);
            });
          }
        } catch (error) {
          console.error('Error cargando datos del dashboard:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadData();
    }
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const ordenesPendientes = ordenes.filter(orden => orden.estado === 'PENDIENTE');
  const tareasPendientes = tareas.filter(tarea => !tarea.completada);

  if (Platform.OS === 'web') {
    return (
      <ScrollView style={styles.webContainer}>
        {/* Header */}
        <View style={styles.webHeader}>
          <View>
            <Text style={styles.webTitle}>NRD Operaciones</Text>
            <Text style={styles.webSubtitle}>
              Bienvenido, {user?.displayName || user?.username}
            </Text>
            <View style={[styles.webBadge, { backgroundColor: user?.role === 'ADMIN' ? '#667eea' : '#28a745' }]}>
              <Text style={styles.webBadgeText}>
                {user?.role === 'ADMIN' ? 'Administrador' : 'Productor'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.webLogoutButton}>
            <Text style={styles.webLogoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.webStatsGrid}>
          <View style={[styles.webStatCard, { borderLeftColor: '#667eea' }]}>
            <Text style={styles.webStatTitle}>Órdenes Pendientes</Text>
            <Text style={[styles.webStatNumber, { color: '#667eea' }]}>
              {ordenesPendientes.length}
            </Text>
          </View>

          <View style={[styles.webStatCard, { borderLeftColor: '#28a745' }]}>
            <Text style={styles.webStatTitle}>Tareas Pendientes</Text>
            <Text style={[styles.webStatNumber, { color: '#28a745' }]}>
              {tareasPendientes.length}
            </Text>
          </View>

          {user?.role === 'ADMIN' && (
            <>
              <View style={[styles.webStatCard, { borderLeftColor: '#ffc107' }]}>
                <Text style={styles.webStatTitle}>Proveedores</Text>
                <Text style={[styles.webStatNumber, { color: '#ffc107' }]}>
                  {proveedores.length}
                </Text>
              </View>

              <View style={[styles.webStatCard, { borderLeftColor: '#17a2b8' }]}>
                <Text style={styles.webStatTitle}>Productos</Text>
                <Text style={[styles.webStatNumber, { color: '#17a2b8' }]}>
                  {productos.length}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Recent Orders */}
        <View style={styles.webCard}>
          <View style={styles.webCardHeader}>
            <Text style={styles.webCardTitle}>Órdenes Recientes</Text>
          </View>
          <View style={styles.webCardContent}>
            {ordenesPendientes.length === 0 ? (
              <Text style={styles.webEmptyText}>No hay órdenes pendientes</Text>
            ) : (
              <View style={styles.webListContainer}>
                {ordenesPendientes.slice(0, 5).map(orden => (
                  <View key={orden.id} style={styles.webListItem}>
                    <View style={styles.webListItemContent}>
                      <View>
                        <Text style={styles.webListItemTitle}>
                          Orden #{orden.id}
                        </Text>
                        <Text style={styles.webListItemSubtitle}>
                          {orden.fecha} • {orden.productos?.length || 0} productos
                        </Text>
                        <View style={[styles.webStatusBadge, { 
                          backgroundColor: orden.estado === 'PENDIENTE' ? '#ffc107' : '#28a745' 
                        }]}>
                          <Text style={styles.webStatusText}>{orden.estado}</Text>
                        </View>
                      </View>
                      <View style={styles.webListItemRight}>
                        <Text style={styles.webListItemPrice}>
                          ${orden.total || 0}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Recent Tasks */}
        <View style={styles.webCard}>
          <View style={styles.webCardHeader}>
            <Text style={styles.webCardTitle}>Tareas Recientes</Text>
          </View>
          <View style={styles.webCardContent}>
            {tareasPendientes.length === 0 ? (
              <Text style={styles.webEmptyText}>No hay tareas pendientes</Text>
            ) : (
              <View style={styles.webListContainer}>
                {tareasPendientes.slice(0, 5).map(tarea => (
                  <View key={tarea.id} style={styles.webListItem}>
                    <View style={styles.webListItemContent}>
                      <View>
                        <Text style={styles.webListItemTitle}>
                          {tarea.titulo}
                        </Text>
                        <Text style={styles.webListItemSubtitle}>
                          {tarea.descripcion}
                        </Text>
                        <View style={styles.webBadgesContainer}>
                          <View style={[styles.webPriorityBadge, { 
                            backgroundColor: tarea.prioridad === 'alta' ? '#dc3545' : 
                                           tarea.prioridad === 'media' ? '#ffc107' : '#28a745'
                          }]}>
                            <Text style={styles.webPriorityText}>
                              {tarea.prioridad?.toUpperCase() || 'SIN PRIORIDAD'}
                            </Text>
                          </View>
                          <View style={styles.webUserBadge}>
                            <Text style={styles.webUserText}>
                              {tarea.usuarioAsignado}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    );
  }

  // Mobile version
  return (
    <ScrollView style={styles.mobileContainer}>
      <View style={styles.mobileHeader}>
        <Text style={styles.mobileTitle}>NRD Operaciones</Text>
        <Text style={styles.mobileSubtitle}>
          Bienvenido, {user?.displayName || user?.username}
        </Text>
        <View style={[styles.mobileBadge, { backgroundColor: user?.role === 'ADMIN' ? '#667eea' : '#28a745' }]}>
          <Text style={styles.mobileBadgeText}>
            {user?.role === 'ADMIN' ? 'Administrador' : 'Productor'}
          </Text>
        </View>
      </View>

      <View style={styles.mobileStatsContainer}>
        <View style={[styles.mobileStatCard, { borderLeftColor: '#667eea' }]}>
          <Text style={styles.mobileStatTitle}>Órdenes Pendientes</Text>
          <Text style={[styles.mobileStatNumber, { color: '#667eea' }]}>
            {ordenesPendientes.length}
          </Text>
        </View>

        <View style={[styles.mobileStatCard, { borderLeftColor: '#28a745' }]}>
          <Text style={styles.mobileStatTitle}>Tareas Pendientes</Text>
          <Text style={[styles.mobileStatNumber, { color: '#28a745' }]}>
            {tareasPendientes.length}
          </Text>
        </View>
      </View>

      <TouchableOpacity onPress={handleLogout} style={styles.mobileLogoutButton}>
        <Text style={styles.mobileLogoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  
  // Web styles
  webContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  webTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  webSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  webBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  webBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  webLogoutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  webLogoutText: {
    color: 'white',
    fontWeight: '500',
  },
  webStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  webStatCard: {
    flex: 1,
    minWidth: 250,
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  webStatTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  webStatNumber: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  webCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  webCardHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  webCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  webCardContent: {
    padding: 24,
  },
  webEmptyText: {
    color: '#666',
    textAlign: 'center',
  },
  webListContainer: {
    gap: 16,
  },
  webListItem: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 4,
    backgroundColor: '#f8f9fa',
  },
  webListItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  webListItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  webListItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  webStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  webStatusText: {
    color: 'white',
    fontSize: 12,
  },
  webListItemRight: {
    alignItems: 'flex-end',
  },
  webListItemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  webBadgesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  webPriorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  webPriorityText: {
    color: 'white',
    fontSize: 12,
  },
  webUserBadge: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  webUserText: {
    color: 'white',
    fontSize: 12,
  },

  // Mobile styles
  mobileContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mobileHeader: {
    padding: 20,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  mobileTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  mobileSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  mobileBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  mobileBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  mobileStatsContainer: {
    padding: 16,
    gap: 16,
  },
  mobileStatCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mobileStatTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  mobileStatNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  mobileLogoutButton: {
    backgroundColor: '#dc3545',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  mobileLogoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default Dashboard;
