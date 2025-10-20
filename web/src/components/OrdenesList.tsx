import React, { useEffect, useState } from 'react';
import { Orden } from '../../../shared/models';
import { dataAccess } from '../../../shared/services/dataAccess';
import { useAuth } from '../contexts/AuthContext';

const OrdenesList: React.FC = () => {
  const { user } = useAuth();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todas' | 'pendientes' | 'completadas'>('todas');

  useEffect(() => {
    const loadOrdenes = async () => {
      if (user) {
        try {
          const ordenesData = await dataAccess.getOrdenes();
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
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div>Cargando órdenes...</div>
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
        <h1 style={{ margin: 0, color: '#333' }}>Gestión de Órdenes</h1>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            style={{
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          >
            <option value="todas">Todas</option>
            <option value="pendientes">Pendientes</option>
            <option value="completadas">Completadas</option>
          </select>
        </div>
      </div>

      {filteredOrdenes.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h3 style={{ color: '#666', marginBottom: '0.5rem' }}>No hay órdenes</h3>
          <p style={{ color: '#999' }}>No se encontraron órdenes con los filtros seleccionados</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredOrdenes.map(orden => (
            <div key={orden.id} style={{
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              border: '1px solid #eee'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                marginBottom: '1rem'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
                    Orden #{orden.id}
                  </h3>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#666' }}>
                    {orden.fecha} • {orden.getProductos().length} productos
                  </p>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#888', fontSize: '0.9rem' }}>
                    Proveedor ID: {orden.proveedorId}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>
                    ${orden.calcularTotal().toFixed(2)}
                  </div>
                  <span style={{
                    background: orden.estado === 'PENDIENTE' ? '#ffc107' : 
                               orden.estado === 'COMPLETADA' ? '#28a745' : '#6c757d',
                    color: 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: '500'
                  }}>
                    {orden.estado}
                  </span>
                </div>
              </div>

              {/* Productos */}
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#333', fontSize: '1rem' }}>Productos:</h4>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {orden.getProductos().map((producto, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.5rem',
                      background: '#f8f9fa',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}>
                      <span>{producto.nombre}</span>
                      <span>{producto.cantidad} {producto.unidad} - ${((producto.precio || 0) * parseFloat(producto.cantidad)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Acciones */}
              {orden.estado === 'PENDIENTE' && (
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleUpdateEstado(orden.id, 'COMPLETADA')}
                    style={{
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Marcar como Completada
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdenesList;
