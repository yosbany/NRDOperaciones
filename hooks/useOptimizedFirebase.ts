import { off, onValue, ref } from 'firebase/database';
import { useCallback, useEffect, useRef, useState } from 'react';
import { database } from '../services/firebaseService';

// Cache global para evitar múltiples listeners del mismo path
const globalCache = new Map();
const activeListeners = new Map();

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  listeners: Set<(data: T) => void>;
}

/**
 * Hook optimizado para Firebase que implementa:
 * - Cache compartido entre componentes
 * - Debouncing de actualizaciones
 * - Cleanup automático de listeners
 * - Gestión eficiente de memoria
 */
export function useOptimizedFirebase<T>(
  path: string,
  options: {
    cacheTimeout?: number; // Tiempo en ms para considerar cache válido
    debounceMs?: number;   // Debounce para actualizaciones
    enabled?: boolean;     // Permite habilitar/deshabilitar el listener
  } = {}
) {
  const {
    cacheTimeout = 30000, // 30 segundos por defecto
    debounceMs = 100,
    enabled = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Callback optimizado con debouncing
  const debouncedCallback = useCallback((newData: T) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setData(newData);
      setLoading(false);
      setError(null);
    }, debounceMs);
  }, [debounceMs]);

  useEffect(() => {
    if (!enabled || !path) {
      setLoading(false);
      return;
    }

    // Verificar cache primero
    const cacheEntry = globalCache.get(path) as CacheEntry<T>;
    const now = Date.now();

    if (cacheEntry && (now - cacheEntry.timestamp < cacheTimeout)) {
      // Usar datos del cache
      setData(cacheEntry.data);
      setLoading(false);
      
      // Agregar callback al conjunto de listeners del cache
      cacheEntry.listeners.add(debouncedCallback);
      
      return () => {
        cacheEntry.listeners.delete(debouncedCallback);
      };
    }

    // Si no hay cache válido, crear nuevo listener
    const dbRef = ref(database, path);
    let listenerCount = activeListeners.get(path + '_count') || 0;

    // Solo crear listener si no existe uno activo para este path
    if (listenerCount === 0) {
      if (__DEV__) {
        console.log(`🔥 Creando nuevo listener para: ${path}`);
      }
      
      const unsubscribe = onValue(dbRef, 
        (snapshot) => {
          try {
            const newData = snapshot.exists() ? snapshot.val() : null;
            const timestamp = Date.now();

            // Actualizar cache
            const entry: CacheEntry<T> = globalCache.get(path) || {
              data: null,
              timestamp: 0,
              listeners: new Set()
            };

            entry.data = newData;
            entry.timestamp = timestamp;
            globalCache.set(path, entry);

            // Notificar a todos los listeners
            entry.listeners.forEach(callback => callback(newData));
            
          } catch (err) {
            console.error(`❌ Error en listener de ${path}:`, err);
            const entry = globalCache.get(path);
            if (entry) {
              entry.listeners.forEach(callback => {
                // Aquí podrías manejar errores si tuvieras un callback de error
              });
            }
          }
        },
        (err) => {
          console.error(`❌ Error en listener de Firebase para ${path}:`, err);
          setError(err as Error);
          setLoading(false);
        }
      );

      activeListeners.set(path, unsubscribe);
    }

    // Incrementar contador y agregar callback
    activeListeners.set(path + '_count', listenerCount + 1);
    
    const entry: CacheEntry<T> = globalCache.get(path) || {
      data: null,
      timestamp: 0,
      listeners: new Set()
    };

    entry.listeners.add(debouncedCallback);
    globalCache.set(path, entry);

    // Cleanup
    return () => {
      // Limpiar debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Remover callback del cache
      const cacheEntry = globalCache.get(path);
      if (cacheEntry) {
        cacheEntry.listeners.delete(debouncedCallback);

        // Decrementar contador
        const currentCount = activeListeners.get(path + '_count') || 0;
        const newCount = Math.max(0, currentCount - 1);
        activeListeners.set(path + '_count', newCount);

        // Si no quedan listeners, limpiar el listener de Firebase
        if (newCount === 0) {
          if (__DEV__) {
            console.log(`🧹 Limpiando listener para: ${path}`);
          }
          const unsubscribe = activeListeners.get(path);
          if (unsubscribe) {
            if (typeof unsubscribe === 'function') {
              unsubscribe();
            } else {
              off(dbRef);
            }
            activeListeners.delete(path);
            activeListeners.delete(path + '_count');
          }
          
          // Limpiar cache después de un tiempo
          setTimeout(() => {
            if (globalCache.get(path)?.listeners.size === 0) {
              globalCache.delete(path);
              if (__DEV__) {
                console.log(`🗑️ Cache limpiado para: ${path}`);
              }
            }
          }, cacheTimeout);
        }
      }
    };
  }, [path, enabled, cacheTimeout, debouncedCallback]);

  return { data, loading, error };
}

/**
 * Hook para limpiar toda la cache de Firebase
 */
export function useClearFirebaseCache() {
  return useCallback(() => {
    console.log('🧹 Limpiando toda la cache de Firebase');
    
    // Limpiar todos los listeners activos
    activeListeners.forEach((unsubscribe, key) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    
    activeListeners.clear();
    globalCache.clear();
  }, []);
}

/**
 * Hook para obtener estadísticas de la cache
 */
export function useFirebaseCacheStats() {
  const [stats, setStats] = useState({
    cacheSize: 0,
    activeListeners: 0,
    memoryUsage: 0
  });

  useEffect(() => {
    const updateStats = () => {
      const cacheSize = globalCache.size;
      const listenersCount = activeListeners.size;
      
      // Estimar uso de memoria (aproximado)
      let memoryUsage = 0;
      globalCache.forEach((entry) => {
        memoryUsage += JSON.stringify(entry.data || {}).length;
      });

      setStats({
        cacheSize,
        activeListeners: listenersCount,
        memoryUsage: memoryUsage / 1024 // KB
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Actualizar cada 5 segundos

    return () => clearInterval(interval);
  }, []);

  return stats;
}