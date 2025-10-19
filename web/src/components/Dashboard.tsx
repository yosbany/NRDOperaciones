import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getOrdenes, getProductos, getProveedores, getTareas, Orden, Producto, Proveedor, Tarea } from '../services/firebase';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      // Cargar datos según el rol del usuario
      getOrdenes(setOrdenes);
      getTareas(setTareas);
      
      if (user.role === 'ADMIN') {
        getProveedores(setProveedores);
        getProductos(setProductos);
      }
      
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div>Cargando...</div>
      </div>
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

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #eee'
      }}>
        <div>
          <h1 style={{ margin: 0, color: '#333' }}>NRD Operaciones</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>
            Bienvenido, {user?.displayName || user?.username}
          </p>
          <span style={{
            background: user?.role === 'ADMIN' ? '#667eea' : '#28a745',
            color: 'white',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.8rem',
            fontWeight: '500'
          }}>
            {user?.role === 'ADMIN' ? 'Administrador' : 'Productor'}
          </span>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Cerrar Sesión
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #667eea'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Órdenes Pendientes</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>
            {ordenesPendientes.length}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #28a745'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Tareas Pendientes</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
            {tareasPendientes.length}
          </div>
        </div>

        {user?.role === 'ADMIN' && (
          <>
            <div style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              borderLeft: '4px solid #ffc107'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Proveedores</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc107' }}>
                {proveedores.length}
              </div>
            </div>

            <div style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              borderLeft: '4px solid #17a2b8'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Productos</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#17a2b8' }}>
                {productos.length}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recent Orders */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee' }}>
          <h2 style={{ margin: 0, color: '#333' }}>Órdenes Recientes</h2>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {ordenesPendientes.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center' }}>No hay órdenes pendientes</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {ordenesPendientes.slice(0, 5).map(orden => (
                <div key={orden.id} style={{
                  padding: '1rem',
                  border: '1px solid #eee',
                  borderRadius: '4px',
                  background: '#f8f9fa'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
                        {orden.proveedorNombre}
                      </h4>
                      <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                        {orden.fecha} • {orden.productos.length} productos
                      </p>
                      <span style={{
                        background: orden.estado === 'PENDIENTE' ? '#ffc107' : '#28a745',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                      }}>
                        {orden.estado}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333' }}>
                        ${orden.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Tasks */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee' }}>
          <h2 style={{ margin: 0, color: '#333' }}>Tareas Recientes</h2>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {tareasPendientes.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center' }}>No hay tareas pendientes</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {tareasPendientes.slice(0, 5).map(tarea => (
                <div key={tarea.id} style={{
                  padding: '1rem',
                  border: '1px solid #eee',
                  borderRadius: '4px',
                  background: '#f8f9fa'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
                        {tarea.titulo}
                      </h4>
                      <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                        {tarea.descripcion}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{
                          background: tarea.prioridad === 'alta' ? '#dc3545' : 
                                     tarea.prioridad === 'media' ? '#ffc107' : '#28a745',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem'
                        }}>
                          {tarea.prioridad.toUpperCase()}
                        </span>
                        <span style={{
                          background: '#6c757d',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem'
                        }}>
                          {tarea.usuarioAsignado}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
