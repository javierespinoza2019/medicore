/**
 * Caché mínima de lecturas clínicas (doc 12 / SC-09).
 * Solo se escribe si el dispositivo está aprobado con AllowsOfflineQueue.
 * Logout debe purgar (no la cola de salida).
 */

const DB_NAME = 'medicore-clinical-cache';
const DB_VERSION = 1;
const STORE = 'entries';

type CacheRow = {
  key: string;
  fetchedAtUtc: string;
  payloadJson: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putClinicalCache(key: string, payload: unknown): Promise<void> {
  const row: CacheRow = {
    key,
    fetchedAtUtc: new Date().toISOString(),
    payloadJson: JSON.stringify(payload),
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(row);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getClinicalCache<T>(
  key: string,
): Promise<{ data: T; fetchedAt: Date } | null> {
  const db = await openDb();
  const row = await new Promise<CacheRow | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as CacheRow | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  if (!row) return null;
  try {
    return {
      data: JSON.parse(row.payloadJson) as T,
      fetchedAt: new Date(row.fetchedAtUtc),
    };
  } catch {
    return null;
  }
}

export async function clearClinicalCache(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export function encounterQueueCacheKey(branchId: string, includeClosed: boolean): string {
  return `encounter-queue:${branchId}:${includeClosed ? 'all' : 'open'}`;
}
