import { databaseSchema, type Database } from './domain';
import { createDemo } from './demo';
export const STORAGE_KEY = 'universo-vivo:v1';
export function loadDatabase(storage: Pick<Storage, 'getItem'>): {
  db: Database;
  error: string | null;
} {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return { db: raw ? databaseSchema.parse(JSON.parse(raw)) : createDemo(), error: null };
  } catch {
    return {
      db: { version: 1, records: [], resolutions: {} },
      error:
        'No se pudieron leer los datos guardados. Pueden estar dañados o el navegador bloquea el almacenamiento. No se han sobrescrito. Exporta el archivo almacenado para recuperarlo o importa un respaldo válido.',
    };
  }
}
export function saveDatabase(storage: Pick<Storage, 'setItem'>, db: Database) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(databaseSchema.parse(db)));
  } catch {
    throw new Error(
      'No se pudo guardar. El almacenamiento puede estar lleno o bloqueado. La operación no se ha aplicado; exporta un respaldo y libera espacio.',
    );
  }
}
