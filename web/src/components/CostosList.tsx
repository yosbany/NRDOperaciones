import React, { useEffect, useState } from 'react';
import { dataAccess } from '../../../shared/services/dataAccess';
import { RecetaCosto } from '../../../shared/services/types';
import { useAuth } from '../contexts/AuthContext';

const CostosList: React.FC = () => {
  const { user } = useAuth();
  const [recetas, setRecetas] = useState<RecetaCosto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReceta, setEditingReceta] = useState<RecetaCosto | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    ingredientes: [{ nombre: '', cantidad: '', unidad: '', precio: '' }]
  });

  useEffect(() => {
    if (user) {
      const loadRecetas = async () => {
        try {
          const recetasData = await dataAccess.getRecetasCostos();
          setRecetas(recetasData);
        } catch (error) {
          console.error('Error cargando recetas de costos:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadRecetas();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const recetaData = {
        ...formData,
        ingredientes: formData.ingredientes.map(ing => ({
          ...ing,
          cantidad: parseFloat(ing.cantidad) || 0,
          precio: parseFloat(ing.precio) || 0
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingReceta) {
        await dataAccess.updateRecetaCosto(editingReceta.id, { ...editingReceta, ...recetaData });
      } else {
        await dataAccess.saveRecetaCosto(recetaData);
      }

      setShowForm(false);
      setEditingReceta(null);
      setFormData({
        nombre: '',
        descripcion: '',
        ingredientes: [{ nombre: '', cantidad: '', unidad: '', precio: '' }]
      });
    } catch (error) {
      console.error('Error guardando receta:', error);
    }
  };

  const handleEdit = (receta: RecetaCosto) => {
    setEditingReceta(receta);
    setFormData({
      nombre: receta.nombre,
      descripcion: receta.descripcion || '',
      ingredientes: receta.ingredientes.length > 0 ? receta.ingredientes.map(ing => ({
        nombre: ing.nombre,
        cantidad: ing.cantidad.toString(),
        unidad: ing.unidad,
        precio: ing.precio.toString()
      })) : [{ nombre: '', cantidad: '', unidad: '', precio: '' }]
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta receta?')) {
      try {
        await dataAccess.deleteRecetaCosto(id);
      } catch (error) {
        console.error('Error eliminando receta:', error);
      }
    }
  };

  const addIngrediente = () => {
    setFormData({
      ...formData,
      ingredientes: [...formData.ingredientes, { nombre: '', cantidad: '', unidad: '', precio: '' }]
    });
  };

  const removeIngrediente = (index: number) => {
    const newIngredientes = formData.ingredientes.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredientes: newIngredientes });
  };

  const updateIngrediente = (index: number, field: string, value: string) => {
    const newIngredientes = [...formData.ingredientes];
    newIngredientes[index] = { ...newIngredientes[index], [field]: value };
    setFormData({ ...formData, ingredientes: newIngredientes });
  };

  const calculateTotalCost = (receta: RecetaCosto) => {
    return receta.ingredientes.reduce((total, ing) => total + (ing.cantidad * ing.precio), 0);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div>Cargando recetas de costos...</div>
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
        <h1 style={{ margin: 0, color: '#333' }}>Gestión de Costos</h1>
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
          + Nueva Receta
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
            {editingReceta ? 'Editar Receta' : 'Nueva Receta'}
          </h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                  Descripción:
                </label>
                <input
                  type="text"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
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

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Ingredientes:
              </label>
              {formData.ingredientes.map((ingrediente, index) => (
                <div key={index} style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                  gap: '0.5rem',
                  alignItems: 'end',
                  marginBottom: '0.5rem'
                }}>
                  <input
                    type="text"
                    placeholder="Nombre del ingrediente"
                    value={ingrediente.nombre}
                    onChange={(e) => updateIngrediente(index, 'nombre', e.target.value)}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Cantidad"
                    value={ingrediente.cantidad}
                    onChange={(e) => updateIngrediente(index, 'cantidad', e.target.value)}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Unidad"
                    value={ingrediente.unidad}
                    onChange={(e) => updateIngrediente(index, 'unidad', e.target.value)}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Precio"
                    value={ingrediente.precio}
                    onChange={(e) => updateIngrediente(index, 'precio', e.target.value)}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  />
                  {formData.ingredientes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngrediente(index)}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addIngrediente}
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
                + Agregar Ingrediente
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingReceta(null);
                  setFormData({
                    nombre: '',
                    descripcion: '',
                    ingredientes: [{ nombre: '', cantidad: '', unidad: '', precio: '' }]
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
                {editingReceta ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de recetas */}
      {recetas.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
          <h3 style={{ color: '#666', marginBottom: '0.5rem' }}>No hay recetas de costos</h3>
          <p style={{ color: '#999' }}>Comienza agregando tu primera receta</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {recetas.map(receta => (
            <div key={receta.id} style={{
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
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
                    {receta.nombre}
                  </h3>
                  {receta.descripcion && (
                    <p style={{ margin: '0 0 1rem 0', color: '#666' }}>
                      {receta.descripcion}
                    </p>
                  )}
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>Costo Total: ${calculateTotalCost(receta).toFixed(2)}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleEdit(receta)}
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
                    onClick={() => handleDelete(receta.id)}
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

              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Ingredientes:</h4>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {receta.ingredientes.map((ingrediente, index) => (
                    <div key={index} style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr',
                      gap: '1rem',
                      padding: '0.5rem',
                      background: '#f8f9fa',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}>
                      <span><strong>{ingrediente.nombre}</strong></span>
                      <span>{ingrediente.cantidad} {ingrediente.unidad}</span>
                      <span>${ingrediente.precio.toFixed(2)}</span>
                      <span><strong>${(ingrediente.cantidad * ingrediente.precio).toFixed(2)}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CostosList;
