import React, { useEffect, useState } from 'react';
import { dataAccess } from '../../../shared/services/dataAccess';
import { Proveedor } from '../../../shared/services/types';
import { useAuth } from '../contexts/AuthContext';

const ContactosList: React.FC = () => {
  const { user } = useAuth();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    celular: '',
    telefono: '',
    email: '',
    direccion: '',
    tipo: 'Proveedor'
  });

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      const loadProveedores = async () => {
        try {
          const proveedoresData = await dataAccess.getProveedores();
          setProveedores(proveedoresData);
        } catch (error) {
          console.error('Error cargando proveedores:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadProveedores();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const proveedorData = {
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingProveedor) {
        await dataAccess.updateProveedor(editingProveedor.id, { ...editingProveedor, ...proveedorData });
      } else {
        await dataAccess.saveProveedor(proveedorData);
      }

      setShowForm(false);
      setEditingProveedor(null);
      setFormData({
        nombre: '',
        celular: '',
        telefono: '',
        email: '',
        direccion: '',
        tipo: 'Proveedor'
      });
    } catch (error) {
      console.error('Error guardando proveedor:', error);
    }
  };

  const handleEdit = (proveedor: Proveedor) => {
    setEditingProveedor(proveedor);
    setFormData({
      nombre: proveedor.nombre,
      celular: proveedor.celular || '',
      telefono: proveedor.telefono || '',
      email: proveedor.email || '',
      direccion: proveedor.direccion || '',
      tipo: proveedor.tipo || 'Proveedor'
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este contacto?')) {
      try {
        await dataAccess.deleteProveedor(id);
      } catch (error) {
        console.error('Error eliminando proveedor:', error);
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
        <div>Cargando contactos...</div>
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
        <h1 style={{ margin: 0, color: '#333' }}>Gestión de Contactos</h1>
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
          + Nuevo Contacto
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
            {editingProveedor ? 'Editar Contacto' : 'Nuevo Contacto'}
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
                Celular:
              </label>
              <input
                type="tel"
                value={formData.celular}
                onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
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
                Teléfono:
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
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
                Email:
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                Dirección:
              </label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
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
                Tipo:
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              >
                <option value="Proveedor">Proveedor</option>
                <option value="Cliente">Cliente</option>
                <option value="Productor">Productor</option>
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingProveedor(null);
                  setFormData({
                    nombre: '',
                    celular: '',
                    telefono: '',
                    email: '',
                    direccion: '',
                    tipo: 'Proveedor'
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
                {editingProveedor ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de contactos */}
      {proveedores.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
          <h3 style={{ color: '#666', marginBottom: '0.5rem' }}>No hay contactos</h3>
          <p style={{ color: '#999' }}>Comienza agregando tu primer contacto</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {proveedores.map(proveedor => (
            <div key={proveedor.id} style={{
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
                    {proveedor.nombre}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    {proveedor.celular && (
                      <div>
                        <strong>Celular:</strong> {proveedor.celular}
                      </div>
                    )}
                    {proveedor.telefono && (
                      <div>
                        <strong>Teléfono:</strong> {proveedor.telefono}
                      </div>
                    )}
                    {proveedor.email && (
                      <div>
                        <strong>Email:</strong> {proveedor.email}
                      </div>
                    )}
                    {proveedor.direccion && (
                      <div>
                        <strong>Dirección:</strong> {proveedor.direccion}
                      </div>
                    )}
                    <div>
                      <strong>Tipo:</strong> 
                      <span style={{
                        background: proveedor.tipo === 'Cliente' ? '#28a745' : 
                                   proveedor.tipo === 'Productor' ? '#ffc107' : '#667eea',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        marginLeft: '0.5rem'
                      }}>
                        {proveedor.tipo}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleEdit(proveedor)}
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
                    onClick={() => handleDelete(proveedor.id)}
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

export default ContactosList;
