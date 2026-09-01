/**
 * Drenado de la cola de salida cuando hay sesión y el API es alcanzable.
 * No usa `navigator.onLine` como prueba de enlace: dispara intento en el evento
 * `online` y en intervalo corto, pero evita martillar si connectivity ya vio falla.
 */

import { apiFetch, getAccessToken } from '@/api/client';
import {
  obtenerEstadoEnlace,
  suscribirEstadoEnlace,
} from '@/api/connectivity';
import { esFallaDeEnlace } from '@/api/errors';
import { drainOutbox, pendingCount } from '@/sync/outboxQueue';
import type { SyncAcceptedDto } from '@/sync/syncTypes';

const INTERVAL_MS = 12_000;

let draining = false;
let consumers = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let unsubEnlace: (() => void) | null = null;
let onOnline: (() => void) | null = null;

/**
 * true = sync OK; false = rechazo de negocio (marca failed);
 * throw = red/Core (drainOutbox deja pending).
 */
async function postSyncCommand(body: {
  idempotencyKey: string;
  commandType: string;
  payloadJson: string;
  occurredAtUtc: string;
}): Promise<{ success: boolean; message?: string }> {
  const res = await apiFetch<SyncAcceptedDto>('/api/sync/commands', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (res.success) {
    return { success: true };
  }

  if (esFallaDeEnlace(res.failure)) {
    throw new Error(res.message ?? res.failure?.kind ?? 'sin_enlace');
  }

  return { success: false, message: res.message ?? res.failure?.kind ?? 'error' };
}

/** Intenta drenar si hay token. Si no hay enlace, no martilla; el intervalo reintenta. */
export async function tryDrainOutbox(): Promise<{ sent: number; failed: number } | null> {
  if (!getAccessToken()) return null;
  if (draining) return null;

  const pending = await pendingCount();
  if (pending === 0) return { sent: 0, failed: 0 };

  if (obtenerEstadoEnlace().alcanzable === false) return null;

  draining = true;
  try {
    return await drainOutbox(postSyncCommand);
  } finally {
    draining = false;
  }
}

function ensureRuntime() {
  if (timer) return;

  unsubEnlace = suscribirEstadoEnlace(() => {
    if (obtenerEstadoEnlace().alcanzable === true) void tryDrainOutbox();
  });

  onOnline = () => {
    void tryDrainOutbox();
  };
  window.addEventListener('online', onOnline);

  timer = setInterval(() => {
    void tryDrainOutbox();
  }, INTERVAL_MS);
}

function tearDownRuntime() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (onOnline) {
    window.removeEventListener('online', onOnline);
    onOnline = null;
  }
  unsubEnlace?.();
  unsubEnlace = null;
}

/**
 * Arranca drenado mientras haya al menos un consumidor (sesión autenticada).
 * Cleanup al logout / desmontar AuthProvider.
 */
export function startOutboxDrain(): () => void {
  consumers += 1;
  ensureRuntime();
  void tryDrainOutbox();

  return () => {
    consumers = Math.max(0, consumers - 1);
    if (consumers === 0) {
      tearDownRuntime();
    }
  };
}
