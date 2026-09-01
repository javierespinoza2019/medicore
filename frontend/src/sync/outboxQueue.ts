/**
 * Cola de salida durable (ADR-014).
 * - Escritura siempre local primero
 * - IdempotencyKey al capturar
 * - Logout NO borra esta cola (solo purga lecturas en otro módulo)
 */

const DB_NAME = 'medicore-outbox';
const DB_VERSION = 1;
const STORE = 'commands';

export type OutboxCommand = {
  id: string;
  idempotencyKey: string;
  commandType: string;
  payloadJson: string;
  occurredAtUtc: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  attempts: number;
  lastError?: string;
  createdAtUtc: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('idempotencyKey', 'idempotencyKey', { unique: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function ulidLike(): string {
  const t = Date.now().toString(36);
  const r = crypto.getRandomValues(new Uint8Array(10));
  const s = Array.from(r, (b) => b.toString(36).padStart(2, '0')).join('');
  return `${t}${s}`.slice(0, 26).toUpperCase();
}

export async function enqueueCommand(
  commandType: string,
  payload: unknown,
  occurredAtUtc = new Date().toISOString(),
): Promise<OutboxCommand> {
  const cmd: OutboxCommand = {
    id: ulidLike(),
    idempotencyKey: ulidLike(),
    commandType,
    payloadJson: JSON.stringify(payload),
    occurredAtUtc,
    status: 'pending',
    attempts: 0,
    createdAtUtc: new Date().toISOString(),
  };

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(cmd);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  notifyListeners();
  return cmd;
}

export async function listPending(): Promise<OutboxCommand[]> {
  const db = await openDb();
  const rows = await new Promise<OutboxCommand[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).index('status').getAll('pending');
    req.onsuccess = () => resolve(req.result as OutboxCommand[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows;
}

export async function markSynced(id: string): Promise<void> {
  await updateStatus(id, 'synced');
}

export async function markSyncing(id: string): Promise<void> {
  await updateStatus(id, 'syncing');
}

/** Vuelve a pending tras fallo de red (no es rechazo de negocio). */
export async function markPending(id: string): Promise<void> {
  await updateStatus(id, 'pending');
}

export async function markFailed(id: string, error: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const row = getReq.result as OutboxCommand | undefined;
      if (!row) {
        resolve();
        return;
      }
      row.status = 'failed';
      row.attempts += 1;
      row.lastError = error;
      store.put(row);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  notifyListeners();
}

async function updateStatus(id: string, status: OutboxCommand['status']) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const row = getReq.result as OutboxCommand | undefined;
      if (!row) {
        resolve();
        return;
      }
      row.status = status;
      store.put(row);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  notifyListeners();
}

export async function pendingCount(): Promise<number> {
  const pending = await listPending();
  return pending.length;
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeOutbox(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  listeners.forEach((l) => l());
}

/** Drena cola hacia API. Fallo de red deja pending; rechazo de negocio → failed. */
export async function drainOutbox(
  postCommand: (body: {
    idempotencyKey: string;
    commandType: string;
    payloadJson: string;
    occurredAtUtc: string;
  }) => Promise<{ success: boolean; message?: string }>,
): Promise<{ sent: number; failed: number }> {
  const pending = await listPending();
  let sent = 0;
  let failed = 0;

  for (const cmd of pending) {
    await updateStatus(cmd.id, 'syncing');
    try {
      const res = await postCommand({
        idempotencyKey: cmd.idempotencyKey,
        commandType: cmd.commandType,
        payloadJson: cmd.payloadJson,
        occurredAtUtc: cmd.occurredAtUtc,
      });
      if (res.success) {
        await markSynced(cmd.id);
        sent += 1;
      } else {
        await markFailed(cmd.id, res.message ?? 'error');
        failed += 1;
      }
    } catch {
      await markPending(cmd.id);
      failed += 1;
    }
  }

  return { sent, failed };
}
