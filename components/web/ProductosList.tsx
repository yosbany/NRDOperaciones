import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
// Interfaces simples para los modelos
interface Producto {
  id: string;
  nombre: string;
  orden: number;
  precio: number;
  proveedorId: string;
  stock: number;
  unidad: string;
}

const ProductosList: React.FC = () => {
  const { user } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    precio: '',
    stock: '',
    unidad: '',
    proveedorId: ''
  });

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      const loadProductos = async () => {
        try {
          // Por ahora retornar array vacío - se puede implementar después
        const productosData: Producto[] = [];
          setProductos(productosData);
        } catch (error) {
          console.error('Error cargando productos:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadProductos();
    }
  }, [user]);

  const handleSubmit = async () => {
    try {
      const productoData = {
        ...formData,
        precio: parseFloat(formData.precio),
        stock: parseFloat(formData.stock),
        orden: productos.length + 1
      };

      if (editingProducto) {
        await dataAccess.updateProducto(editingProducto.id, productoData);
      } else {
        await dataAccess.saveProducto(productoData);
      }

      // Recargar productos
      const productosData = await dataAccess.getProductos();
      setProductos(productosData);

      setShowForm(false);
      setEditingProducto(null);
      setFormData({
        nombre: '',
        precio: '',
        stock: '',
        unidad: '',
        proveedorId: ''
      });
    } catch (error) {
      console.error('Error guardando producto:', error);
    }
  };

  const handleEdit = (producto: Producto) => {
    setEditingProducto(producto);
    setFormData({
      nombre: producto.nombre,
      precio: producto.precio.toString(),
      stock: producto.stock.toString(),
      unidad: producto.unidad,
      proveedorId: producto.proveedorId || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar este producto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await dataAccess.deleteProducto(id);
              // Por ahora retornar array vacío - se puede implementar después
        const productosData: Producto[] = [];
              setProductos(productosData);
            } catch (error) {
              console.error('Error eliminando producto:', error);
            }
          }
        }
      ]
    );
  };

  if (user?.role !== 'ADMIN') {
    return (
      <View style={styles.accessDeniedContainer}>
        <Text style={styles.accessDeniedTitle}>Acceso Denegado</Text>
        <Text style={styles.accessDeniedText}>No tienes permisos para acceder a esta sección.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando productos...</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <ScrollView style={styles.webContainer}>
        <View style={styles.webHeader}>
          <Text style={styles.webTitle}>Gestión de Productos</Text>
          <TouchableOpacity
            onPress={() => setShowForm(true)}
            style={styles.webAddButton}
          >
            <Text style={styles.webAddButtonText}>+ Nuevo Producto</Text>
          </TouchableOpacity>
        </View>

        {/* Formulario */}
        {showForm && (
          <View style={styles.webFormContainer}>
            <Text style={styles.webFormTitle}>
              {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
            </Text>
            
            <View style={styles.webFormGrid}>
              <View style={styles.webFormField}>
                <Text style={styles.webFormLabel}>Nombre:</Text>
                <TextInput
                  style={styles.webFormInput}
                  value={formData.nombre}
                  onChangeText={(text) => setFormData({ ...formData, nombre: text })}
                  placeholder="Nombre del producto"
                />
              </View>

              <View style={styles.webFormField}>
                <Text style={styles.webFormLabel}>Precio:</Text>
                <TextInput
                  style={styles.webFormInput}
                  value={formData.precio}
                  onChangeText={(text) => setFormData({ ...formData, precio: text })}
                  placeholder="0.00"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.webFormField}>
                <Text style={styles.webFormLabel}>Stock:</Text>
                <TextInput
                  style={styles.webFormInput}
                  value={formData.stock}
                  onChangeText={(text) => setFormData({ ...formData, stock: text })}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.webFormField}>
                <Text style={styles.webFormLabel}>Unidad:</Text>
                <TextInput
                  style={styles.webFormInput}
                  value={formData.unidad}
                  onChangeText={(text) => setFormData({ ...formData, unidad: text })}
                  placeholder="kg, litros, etc."
                />
              </View>

              <View style={styles.webFormField}>
                <Text style={styles.webFormLabel}>Proveedor ID:</Text>
                <TextInput
                  style={styles.webFormInput}
                  value={formData.proveedorId}
                  onChangeText={(text) => setFormData({ ...formData, proveedorId: text })}
                  placeholder="ID del proveedor"
                />
              </View>
            </View>

            <View style={styles.webFormActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowForm(false);
                  setEditingProducto(null);
                  setFormData({
                    nombre: '',
                    precio: '',
                    stock: '',
                    unidad: '',
                    proveedorId: ''
                  });
                }}
                style={styles.webCancelButton}
              >
                <Text style={styles.webCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                style={styles.webSaveButton}
              >
                <Text style={styles.webSaveButtonText}>
                  {editingProducto ? 'Actualizar' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Lista de productos */}
        {productos.length === 0 ? (
          <View style={styles.webEmptyContainer}>
            <Text style={styles.webEmptyIcon}>📦</Text>
            <Text style={styles.webEmptyTitle}>No hay productos</Text>
            <Text style={styles.webEmptySubtitle}>Comienza agregando tu primer producto</Text>
          </View>
        ) : (
          <View style={styles.webListContainer}>
            {productos.map(producto => (
              <View key={producto.id} style={styles.webProductCard}>
                <View style={styles.webProductHeader}>
                  <View style={styles.webProductInfo}>
                    <Text style={styles.webProductName}>{producto.nombre}</Text>
                    <View style={styles.webProductDetails}>
                      <Text style={styles.webProductDetail}>
                        <Text style={styles.webProductDetailLabel}>Precio:</Text> ${producto.precio.toFixed(2)}
                      </Text>
                      <Text style={styles.webProductDetail}>
                        <Text style={styles.webProductDetailLabel}>Stock:</Text> {producto.stock} {producto.unidad}
                      </Text>
                      <Text style={styles.webProductDetail}>
                        <Text style={styles.webProductDetailLabel}>Proveedor ID:</Text> {producto.proveedorId || 'Sin proveedor'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.webProductActions}>
                    <TouchableOpacity
                      onPress={() => handleEdit(producto)}
                      style={styles.webEditButton}
                    >
                      <Text style={styles.webEditButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(producto.id)}
                      style={styles.webDeleteButton}
                    >
                      <Text style={styles.webDeleteButtonText}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
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
        <Text style={styles.mobileTitle}>Gestión de Productos</Text>
        <TouchableOpacity
          onPress={() => setShowForm(true)}
          style={styles.mobileAddButton}
        >
          <Text style={styles.mobileAddButtonText}>+ Nuevo Producto</Text>
        </TouchableOpacity>
      </View>

      {productos.length === 0 ? (
        <View style={styles.mobileEmptyContainer}>
          <Text style={styles.mobileEmptyIcon}>📦</Text>
          <Text style={styles.mobileEmptyTitle}>No hay productos</Text>
          <Text style={styles.mobileEmptySubtitle}>Comienza agregando tu primer producto</Text>
        </View>
      ) : (
        <View style={styles.mobileListContainer}>
          {productos.map(producto => (
            <View key={producto.id} style={styles.mobileProductCard}>
              <Text style={styles.mobileProductName}>{producto.nombre}</Text>
              <Text style={styles.mobileProductPrice}>${producto.precio.toFixed(2)}</Text>
              <Text style={styles.mobileProductStock}>
                Stock: {producto.stock} {producto.unidad}
              </Text>
              <View style={styles.mobileProductActions}>
                <TouchableOpacity
                  onPress={() => handleEdit(producto)}
                  style={styles.mobileEditButton}
                >
                  <Text style={styles.mobileEditButtonText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(producto.id)}
                  style={styles.mobileDeleteButton}
                >
                  <Text style={styles.mobileDeleteButtonText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
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
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
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
  webAddButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  webAddButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  webFormContainer: {
    backgroundColor: 'white',
    margin: 32,
    padding: 32,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  webFormTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  webFormGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  webFormField: {
    flex: 1,
    minWidth: 250,
  },
  webFormLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  webFormInput: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    fontSize: 16,
    backgroundColor: 'white',
  },
  webFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  webCancelButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  webCancelButtonText: {
    color: 'white',
    fontSize: 16,
  },
  webSaveButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  webSaveButtonText: {
    color: 'white',
    fontSize: 16,
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
  webProductCard: {
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
  webProductHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  webProductInfo: {
    flex: 1,
  },
  webProductName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  webProductDetails: {
    gap: 8,
  },
  webProductDetail: {
    fontSize: 14,
    color: '#666',
  },
  webProductDetailLabel: {
    fontWeight: 'bold',
  },
  webProductActions: {
    flexDirection: 'row',
    gap: 8,
  },
  webEditButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  webEditButtonText: {
    color: 'white',
    fontSize: 14,
  },
  webDeleteButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  webDeleteButtonText: {
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  mobileAddButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mobileAddButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
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
  mobileProductCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mobileProductName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  mobileProductPrice: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  mobileProductStock: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  mobileProductActions: {
    flexDirection: 'row',
    gap: 8,
  },
  mobileEditButton: {
    flex: 1,
    backgroundColor: '#ffc107',
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  mobileEditButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  mobileDeleteButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  mobileDeleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ProductosList;
