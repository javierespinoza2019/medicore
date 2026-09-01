/**
 * Empuje en vivo de colas (M10 / WS-K).
 * El live **no** es fuente de verdad: solo invalida; la UI vuelve a leer por API.
 * Sin enlace: no hay conexión al hub; la pantalla debe mostrar antigüedad (SC-09).
 */

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { apiBaseUrl } from '@/config/environment';
import { getAccessToken } from '@/api/client';

export type LiveQueueStatus = 'desconectado' | 'conectando' | 'conectado' | 'sin_enlace';

export type LiveQueueEventName =
  | 'queueChanged'
  | 'triageChanged'
  | 'appointmentChanged'
  | 'encounterStateChanged';

export type LiveQueueListener = (event: LiveQueueEventName, payload: unknown) => void;

type BranchSubscription = {
  branchId: string;
  listeners: Set<LiveQueueListener>;
};

let connection: HubConnection | null = null;
let status: LiveQueueStatus = 'desconectado';
const statusListeners = new Set<() => void>();
const subscriptions = new Map<string, BranchSubscription>();
let startPromise: Promise<void> | null = null;

function hubUrl(): string {
  const base = (apiBaseUrl || '').replace(/\/$/, '');
  return `${base}/hubs/clinical-queue`;
}

function emitStatus(next: LiveQueueStatus) {
  if (status === next) return;
  status = next;
  statusListeners.forEach((l) => l());
}

export function getLiveQueueStatus(): LiveQueueStatus {
  return status;
}

export function subscribeLiveQueueStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

function notifyBranch(branchId: string, event: LiveQueueEventName, payload: unknown) {
  const sub = subscriptions.get(branchId.toLowerCase());
  if (!sub) return;
  sub.listeners.forEach((l) => {
    try {
      l(event, payload);
    } catch {
      /* listener no debe tumbar el hub */
    }
  });
}

function wireHandlers(conn: HubConnection) {
  const events: LiveQueueEventName[] = [
    'queueChanged',
    'triageChanged',
    'appointmentChanged',
    'encounterStateChanged',
  ];
  for (const ev of events) {
    conn.on(ev, (payload: { branchId?: string }) => {
      const branchId = payload?.branchId;
      if (typeof branchId === 'string' && branchId.length > 0) {
        notifyBranch(branchId, ev, payload);
        return;
      }
      // Sin branchId en payload: avisar a todas las suscripciones locales.
      for (const key of subscriptions.keys()) {
        notifyBranch(key, ev, payload);
      }
    });
  }

  conn.onreconnecting(() => emitStatus('conectando'));
  conn.onreconnected(async () => {
    emitStatus('conectado');
    for (const sub of subscriptions.values()) {
      try {
        await conn.invoke('JoinBranch', sub.branchId);
      } catch {
        emitStatus('sin_enlace');
      }
    }
  });
  conn.onclose(() => {
    emitStatus('desconectado');
  });
}

async function ensureConnection(): Promise<HubConnection | null> {
  const token = getAccessToken();
  if (!token) {
    emitStatus('desconectado');
    return null;
  }

  if (connection && connection.state === HubConnectionState.Connected) {
    return connection;
  }

  if (startPromise) {
    await startPromise;
    return connection?.state === HubConnectionState.Connected ? connection : null;
  }

  emitStatus('conectando');
  const conn =
    connection ??
    new HubConnectionBuilder()
      .withUrl(hubUrl(), {
        accessTokenFactory: () => getAccessToken() ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 15000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

  if (!connection) {
    wireHandlers(conn);
    connection = conn;
  }

  startPromise = (async () => {
    try {
      if (conn.state === HubConnectionState.Disconnected) {
        await conn.start();
      }
      emitStatus('conectado');
    } catch {
      emitStatus('sin_enlace');
      throw new Error('No se pudo conectar al hub de cola.');
    } finally {
      startPromise = null;
    }
  })();

  try {
    await startPromise;
    return connection;
  } catch {
    return null;
  }
}

/**
 * Suscribe a invalidaciones de una sucursal. Devuelve unsubscribe.
 * Al recibir evento, el consumidor debe refrescar desde la API.
 */
export function subscribeLiveQueue(
  branchId: string,
  listener: LiveQueueListener,
): () => void {
  const key = branchId.toLowerCase();
  let sub = subscriptions.get(key);
  if (!sub) {
    sub = { branchId, listeners: new Set() };
    subscriptions.set(key, sub);
  }
  sub.listeners.add(listener);

  void (async () => {
    const conn = await ensureConnection();
    if (!conn) return;
    try {
      await conn.invoke('JoinBranch', branchId);
    } catch {
      emitStatus('sin_enlace');
    }
  })();

  return () => {
    const current = subscriptions.get(key);
    if (!current) return;
    current.listeners.delete(listener);
    if (current.listeners.size > 0) return;
    subscriptions.delete(key);
    const conn = connection;
    if (conn && conn.state === HubConnectionState.Connected) {
      void conn.invoke('LeaveBranch', branchId).catch(() => undefined);
    }
    if (subscriptions.size === 0) {
      void stopLiveQueue();
    }
  };
}

export async function stopLiveQueue(): Promise<void> {
  const conn = connection;
  connection = null;
  subscriptions.clear();
  if (!conn) {
    emitStatus('desconectado');
    return;
  }
  try {
    await conn.stop();
  } catch {
    /* ignore */
  }
  emitStatus('desconectado');
}

/** Texto corto para UI (SC-09): antigüedad explícita al leer sin enlace fresco. */
export function formatCacheAge(fetchedAt: Date | null, now = new Date()): string | null {
  if (!fetchedAt) return null;
  const secs = Math.max(0, Math.floor((now.getTime() - fetchedAt.getTime()) / 1000));
  if (secs < 60) return `hace ${secs} s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  return `hace ${hours} h`;
}
