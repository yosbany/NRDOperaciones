import React, { useEffect, useState } from 'react';
import { Producto } from '../../../shared/models';
import { dataAccess } from '../../../shared/services/dataAccess';
import { useAuth } from '../contexts/AuthContext';

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
          const productosData = await dataAccess.getProductos();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const productoData = {
        ...formData,
        precio: parseFloat(formData.precio),
        stock: parseFloat(formData.stock),
        orden: productos.length + 1
      };

      if (editingProducto) {
        await dataAccess.updateProducto(editingProducto.id, { ...editingProducto, ...productoData });
      } else {
        await dataAccess.saveProducto(productoData);
      }

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
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      try {
        await dataAccess.deleteProducto(id);
      } catch (error) {
        console.error('Error eliminando producto:', error);
      }
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h2>Acceso Denegado</h2>
        <p>No tienes permisos para acceder a esta sección.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div>Cargando productos...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{ margin: 0, color: '#333' }}>Gestión de Productos</h1>
        <button
          onClick={() => setShowForm(true)}
          style={{
            background: '#667eea',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          + Nuevo Producto
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ margin: '0 0 1.5rem 0', color: '#333' }}>
            {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Nombre:
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Precio:
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.precio}
                onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Stock:
              </label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Unidad:
              </label>
              <input
                type="text"
                value={formData.unidad}
                onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Proveedor ID:
              </label>
              <input
                type="text"
                value={formData.proveedorId}
                onChange={(e) => setFormData({ ...formData, proveedorId: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>


            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
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
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {editingProducto ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de productos */}
      {productos.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h3 style={{ color: '#666', marginBottom: '0.5rem' }}>No hay productos</h3>
          <p style={{ color: '#999' }}>Comienza agregando tu primer producto</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {productos.map(producto => (
            <div key={producto.id} style={{
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              border: '1px solid #eee'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start'
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
                    {producto.nombre}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <strong>Precio:</strong> ${producto.precio.toFixed(2)}
                    </div>
                    <div>
                      <strong>Stock:</strong> {producto.stock} {producto.unidad}
                    </div>
                    <div>
                      <strong>Proveedor ID:</strong> {producto.proveedorId || 'Sin proveedor'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleEdit(producto)}
                    style={{
                      background: '#ffc107',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(producto.id)}
                    style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductosList;
