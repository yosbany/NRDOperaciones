import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
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

const OrdenesList: React.FC = () => {
  const { user } = useAuth();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todas' | 'pendientes' | 'completadas'>('todas');

  useEffect(() => {
    const loadOrdenes = async () => {
      if (user) {
        try {
          // Por ahora retornar array vacío - se puede implementar después
          const ordenesData: Orden[] = [];
          setOrdenes(ordenesData);
        } catch (error) {
          console.error('Error cargando órdenes:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadOrdenes();
  }, [user]);

  const handleUpdateEstado = async (ordenId: string, nuevoEstado: string) => {
    try {
      // Obtener la orden actual
      const ordenActual = ordenes.find(o => o.id === ordenId);
      if (!ordenActual) return;
      
      // Crear una nueva instancia de Orden con el estado actualizado
      const ordenActualizada = new Orden(
        ordenActual.id,
        nuevoEstado,
        ordenActual.fecha,
        ordenActual.hecha,
        ordenActual.proveedorId,
        ordenActual.getProductos(),
        ordenActual.tipo
      );
      
      await dataAccess.updateOrden(ordenId, ordenActualizada);
      
      // Actualizar el estado local
      setOrdenes(prevOrdenes => 
        prevOrdenes.map(orden => 
          orden.id === ordenId ? ordenActualizada : orden
        )
      );
    } catch (error) {
      console.error('Error actualizando orden:', error);
    }
  };

  const filteredOrdenes = ordenes.filter(orden => {
    if (filter === 'pendientes') return orden.estado === 'PENDIENTE';
    if (filter === 'completadas') return orden.estado === 'COMPLETADA';
    return true;
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando órdenes...</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <ScrollView style={styles.webContainer}>
        <View style={styles.webHeader}>
          <Text style={styles.webTitle}>Gestión de Órdenes</Text>
          
          <View style={styles.webFilterContainer}>
            <TouchableOpacity
              style={[styles.webFilterButton, filter === 'todas' && styles.webFilterButtonActive]}
              onPress={() => setFilter('todas')}
            >
              <Text style={[styles.webFilterText, filter === 'todas' && styles.webFilterTextActive]}>
                Todas
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.webFilterButton, filter === 'pendientes' && styles.webFilterButtonActive]}
              onPress={() => setFilter('pendientes')}
            >
              <Text style={[styles.webFilterText, filter === 'pendientes' && styles.webFilterTextActive]}>
                Pendientes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.webFilterButton, filter === 'completadas' && styles.webFilterButtonActive]}
              onPress={() => setFilter('completadas')}
            >
              <Text style={[styles.webFilterText, filter === 'completadas' && styles.webFilterTextActive]}>
                Completadas
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {filteredOrdenes.length === 0 ? (
          <View style={styles.webEmptyContainer}>
            <Text style={styles.webEmptyIcon}>📋</Text>
            <Text style={styles.webEmptyTitle}>No hay órdenes</Text>
            <Text style={styles.webEmptySubtitle}>No se encontraron órdenes con los filtros seleccionados</Text>
          </View>
        ) : (
          <View style={styles.webListContainer}>
            {filteredOrdenes.map(orden => (
              <View key={orden.id} style={styles.webOrderCard}>
                <View style={styles.webOrderHeader}>
                  <View>
                    <Text style={styles.webOrderTitle}>Orden #{orden.id}</Text>
                    <Text style={styles.webOrderSubtitle}>
                      {orden.fecha} • {orden.getProductos().length} productos
                    </Text>
                    <Text style={styles.webOrderProvider}>
                      Proveedor ID: {orden.proveedorId}
                    </Text>
                  </View>
                  <View style={styles.webOrderRight}>
                    <Text style={styles.webOrderTotal}>
                      ${orden.calcularTotal().toFixed(2)}
                    </Text>
                    <View style={[styles.webStatusBadge, { 
                      backgroundColor: orden.estado === 'PENDIENTE' ? '#ffc107' : 
                                     orden.estado === 'COMPLETADA' ? '#28a745' : '#6c757d'
                    }]}>
                      <Text style={styles.webStatusText}>{orden.estado}</Text>
                    </View>
                  </View>
                </View>

                {/* Productos */}
                <View style={styles.webProductsContainer}>
                  <Text style={styles.webProductsTitle}>Productos:</Text>
                  <View style={styles.webProductsList}>
                    {orden.getProductos().map((producto, index) => (
                      <View key={index} style={styles.webProductItem}>
                        <Text style={styles.webProductName}>{producto.nombre}</Text>
                        <Text style={styles.webProductDetails}>
                          {producto.cantidad} {producto.unidad} - ${((producto.precio || 0) * parseFloat(producto.cantidad)).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Acciones */}
                {orden.estado === 'PENDIENTE' && (
                  <View style={styles.webActionsContainer}>
                    <TouchableOpacity
                      onPress={() => handleUpdateEstado(orden.id, 'COMPLETADA')}
                      style={styles.webCompleteButton}
                    >
                      <Text style={styles.webCompleteButtonText}>
                        Marcar como Completada
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  // Mobile version
  return (
    <ScrollView style={styles.mobileContainer}>
      <View style={styles.mobileHeader}>
        <Text style={styles.mobileTitle}>Gestión de Órdenes</Text>
        
        <View style={styles.mobileFilterContainer}>
          <TouchableOpacity
            style={[styles.mobileFilterButton, filter === 'todas' && styles.mobileFilterButtonActive]}
            onPress={() => setFilter('todas')}
          >
            <Text style={[styles.mobileFilterText, filter === 'todas' && styles.mobileFilterTextActive]}>
              Todas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mobileFilterButton, filter === 'pendientes' && styles.mobileFilterButtonActive]}
            onPress={() => setFilter('pendientes')}
          >
            <Text style={[styles.mobileFilterText, filter === 'pendientes' && styles.mobileFilterTextActive]}>
              Pendientes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mobileFilterButton, filter === 'completadas' && styles.mobileFilterButtonActive]}
            onPress={() => setFilter('completadas')}
          >
            <Text style={[styles.mobileFilterText, filter === 'completadas' && styles.mobileFilterTextActive]}>
              Completadas
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {filteredOrdenes.length === 0 ? (
        <View style={styles.mobileEmptyContainer}>
          <Text style={styles.mobileEmptyIcon}>📋</Text>
          <Text style={styles.mobileEmptyTitle}>No hay órdenes</Text>
          <Text style={styles.mobileEmptySubtitle}>No se encontraron órdenes con los filtros seleccionados</Text>
        </View>
      ) : (
        <View style={styles.mobileListContainer}>
          {filteredOrdenes.map(orden => (
            <View key={orden.id} style={styles.mobileOrderCard}>
              <View style={styles.mobileOrderHeader}>
                <Text style={styles.mobileOrderTitle}>Orden #{orden.id}</Text>
                <Text style={styles.mobileOrderSubtitle}>
                  {orden.fecha} • {orden.getProductos().length} productos
                </Text>
                <Text style={styles.mobileOrderProvider}>
                  Proveedor ID: {orden.proveedorId}
                </Text>
              </View>

              <View style={styles.mobileOrderFooter}>
                <Text style={styles.mobileOrderTotal}>
                  ${orden.calcularTotal().toFixed(2)}
                </Text>
                <View style={[styles.mobileStatusBadge, { 
                  backgroundColor: orden.estado === 'PENDIENTE' ? '#ffc107' : 
                                 orden.estado === 'COMPLETADA' ? '#28a745' : '#6c757d'
                }]}>
                  <Text style={styles.mobileStatusText}>{orden.estado}</Text>
                </View>
              </View>

              {orden.estado === 'PENDIENTE' && (
                <TouchableOpacity
                  onPress={() => handleUpdateEstado(orden.id, 'COMPLETADA')}
                  style={styles.mobileCompleteButton}
                >
                  <Text style={styles.mobileCompleteButtonText}>
                    Marcar como Completada
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}
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
  },
  webFilterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  webFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  webFilterButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  webFilterText: {
    fontSize: 14,
    color: '#666',
  },
  webFilterTextActive: {
    color: 'white',
  },
  webEmptyContainer: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: 'white',
    margin: 32,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  webEmptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  webEmptyTitle: {
    fontSize: 20,
    color: '#666',
    marginBottom: 8,
  },
  webEmptySubtitle: {
    fontSize: 16,
    color: '#999',
  },
  webListContainer: {
    padding: 32,
    gap: 16,
  },
  webOrderCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eee',
  },
  webOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  webOrderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  webOrderSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  webOrderProvider: {
    fontSize: 12,
    color: '#888',
  },
  webOrderRight: {
    alignItems: 'flex-end',
  },
  webOrderTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  webStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  webStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  webProductsContainer: {
    marginBottom: 16,
  },
  webProductsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  webProductsList: {
    gap: 8,
  },
  webProductItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
  },
  webProductName: {
    fontSize: 14,
    color: '#333',
  },
  webProductDetails: {
    fontSize: 14,
    color: '#666',
  },
  webActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  webCompleteButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  webCompleteButtonText: {
    color: 'white',
    fontSize: 14,
  },

  // Mobile styles
  mobileContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mobileHeader: {
    padding: 20,
    backgroundColor: 'white',
  },
  mobileTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  mobileFilterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  mobileFilterButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  mobileFilterButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  mobileFilterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  mobileFilterTextActive: {
    color: 'white',
  },
  mobileEmptyContainer: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mobileEmptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  mobileEmptyTitle: {
    fontSize: 20,
    color: '#666',
    marginBottom: 8,
  },
  mobileEmptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  mobileListContainer: {
    padding: 20,
    gap: 16,
  },
  mobileOrderCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mobileOrderHeader: {
    marginBottom: 12,
  },
  mobileOrderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  mobileOrderSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  mobileOrderProvider: {
    fontSize: 12,
    color: '#888',
  },
  mobileOrderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mobileOrderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  mobileStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  mobileStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  mobileCompleteButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  mobileCompleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default OrdenesList;
