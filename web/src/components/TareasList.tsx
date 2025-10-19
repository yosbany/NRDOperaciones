import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTareasByUserRole, saveTarea, updateTarea, deleteTarea, Tarea } from '../services/firebase';

const TareasList: React.FC = () => {
  const { user } = useAuth();
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'mis' | 'todas'>('mis');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'media' as 'alta' | 'media' | 'baja',
    asignadaA: '',
    usuarioAsignado: ''
  });

  useEffect(() => {
    if (user) {
      getTareasByUserRole(user, filter, (tareasData) => {
        setTareas(tareasData);
        setLoading(false);
      });
    }
  }, [user, filter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tareaData = {
        ...formData,
        completada: false,
        publica: true,
        seguidores: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveTarea(tareaData);
      setShowForm(false);
      setFormData({
        titulo: '',
        descripcion: '',
        prioridad: 'media',
        asignadaA: '',
        usuarioAsignado: ''
      });
    } catch (error) {
      console.error('Error guardando tarea:', error);
    }
  };

  const handleToggleCompletada = async (tareaId: string, completada: boolean) => {
    try {
      const updates: Partial<Tarea> = {
        completada: !completada,
        updatedAt: new Date().toISOString()
      };
      
      if (!completada) {
        updates.fechaCompletada = new Date().toISOString();
      } else {
        updates.fechaCompletada = undefined;
      }
      
      await updateTarea(tareaId, updates);
    } catch (error) {
      console.error('Error actualizando tarea:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
      try {
        await deleteTarea(id);
      } catch (error) {
        console.error('Error eliminando tarea:', error);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div>Cargando tareas...</div>
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
        <h1 style={{ margin: 0, color: '#333' }}>Gestión de Tareas</h1>
        
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
            <option value="mis">Mis Tareas</option>
            <option value="todas">Todas las Tareas</option>
          </select>
          
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
            + Nueva Tarea
          </button>
        </div>
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
          <h2 style={{ margin: '0 0 1.5rem 0', color: '#333' }}>Nueva Tarea</h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Título:
              </label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
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
                Descripción:
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                required
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Prioridad:
                </label>
                <select
                  value={formData.prioridad}
                  onChange={(e) => setFormData({ ...formData, prioridad: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Asignada a (ID):
                </label>
                <input
                  type="text"
                  value={formData.asignadaA}
                  onChange={(e) => setFormData({ ...formData, asignadaA: e.target.value })}
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
                  Usuario Asignado:
                </label>
                <input
                  type="text"
                  value={formData.usuarioAsignado}
                  onChange={(e) => setFormData({ ...formData, usuarioAsignado: e.target.value })}
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
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    titulo: '',
                    descripcion: '',
                    prioridad: 'media',
                    asignadaA: '',
                    usuarioAsignado: ''
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
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de tareas */}
      {tareas.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h3 style={{ color: '#666', marginBottom: '0.5rem' }}>No hay tareas</h3>
          <p style={{ color: '#999' }}>No se encontraron tareas con los filtros seleccionados</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {tareas.map(tarea => (
            <div key={tarea.id} style={{
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              border: '1px solid #eee',
              opacity: tarea.completada ? 0.7 : 1
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                marginBottom: '1rem'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, color: '#333' }}>
                      {tarea.titulo}
                    </h3>
                    <span style={{
                      background: tarea.prioridad === 'alta' ? '#dc3545' : 
                                 tarea.prioridad === 'media' ? '#ffc107' : '#28a745',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: '500'
                    }}>
                      {tarea.prioridad.toUpperCase()}
                    </span>
                    {tarea.completada && (
                      <span style={{
                        background: '#28a745',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: '500'
                      }}>
                        COMPLETADA
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#666' }}>
                    {tarea.descripcion}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#666' }}>
                    <span><strong>Asignada a:</strong> {tarea.usuarioAsignado}</span>
                    <span><strong>Creada:</strong> {new Date(tarea.createdAt).toLocaleDateString()}</span>
                    {tarea.fechaCompletada && (
                      <span><strong>Completada:</strong> {new Date(tarea.fechaCompletada).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleToggleCompletada(tarea.id, tarea.completada)}
                    style={{
                      background: tarea.completada ? '#ffc107' : '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    {tarea.completada ? 'Reactivar' : 'Completar'}
                  </button>
                  <button
                    onClick={() => handleDelete(tarea.id)}
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

export default TareasList;
