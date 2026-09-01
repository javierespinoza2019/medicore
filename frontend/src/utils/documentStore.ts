// Almacenamiento local de documentos adjuntos de pacientes usando IndexedDB.
// Permite subir, listar, descargar y eliminar archivos sin necesidad de backend.

export interface DocumentoPaciente {
  id: string;
  patientId: string;
  nombre: string;
  tipo: string;
  tamanio: number;
  fecha: string;
  blob: Blob;
}

const DB_NAME = 'medicore_documentos';
const STORE = 'documentos';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listDocuments(patientId: string): Promise<DocumentoPaciente[]> {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readonly');
  const store = tx.objectStore(STORE);
  const all = await requestToPromise(store.getAll() as IDBRequest<DocumentoPaciente[]>);
  return all
    .filter((d) => d.patientId === patientId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export async function addDocument(patientId: string, file: File): Promise<DocumentoPaciente> {
  const db = await openDB();
  const doc: DocumentoPaciente = {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    patientId,
    nombre: file.name,
    tipo: file.type || 'application/octet-stream',
    tamanio: file.size,
    fecha: new Date().toISOString(),
    blob: file,
  };
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  await requestToPromise(store.put(doc));
  return doc;
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  await requestToPromise(store.delete(id));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}