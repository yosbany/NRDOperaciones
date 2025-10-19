/**
 * Normaliza un texto para búsquedas en español, eliminando:
 * - Diferencias entre mayúsculas y minúsculas
 * - Acentos y diacríticos
 * - Diferencias entre v/b, c/s/z, etc.
 * @param text Texto a normalizar
 * @returns Texto normalizado para búsqueda
 */
export function normalizeSearchTerm(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/[vb]/g, 'b')           // Normaliza v/b
    .replace(/[csz]/g, 's')          // Normaliza c/s/z
    .replace(/[h]/g, '')             // Elimina h muda
    .replace(/[y]/g, 'i')            // Normaliza y/i
    .replace(/[k]/g, 'c')            // Normaliza k/c
    .replace(/[w]/g, 'u')            // Normaliza w/u
    .replace(/[ñ]/g, 'ni')           // Normaliza ñ/ni
    .trim();
}

/**
 * Verifica si un texto contiene un término de búsqueda normalizado
 * @param text Texto a buscar
 * @param searchTerm Término de búsqueda
 * @returns true si el texto contiene el término de búsqueda
 */
export function containsSearchTerm(text: string, searchTerm: string): boolean {
  if (!text || !searchTerm) return false;
  return normalizeSearchTerm(text).includes(normalizeSearchTerm(searchTerm));
}

/**
 * Filtra un array de objetos por un término de búsqueda
 * @param items Array de objetos a filtrar
 * @param searchTerm Término de búsqueda
 * @param searchFields Campos del objeto en los que buscar
 * @returns Array filtrado
 */
export function filterBySearchTerm<T>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
): T[] {
  if (!searchTerm) return items;
  
  const normalizedSearchTerm = normalizeSearchTerm(searchTerm);
  
  return items.filter(item => 
    searchFields.some(field => {
      const fieldValue = item[field];
      return fieldValue && containsSearchTerm(String(fieldValue), normalizedSearchTerm);
    })
  );
} 