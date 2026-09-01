/**
 * Sincroniza un comando de outbox ya encolado (un shot).
 * Si no hay enlace o no hay token, deja el comando pending y devuelve null.
 * Fallo de red → pending (reintento); rechazo de negocio → failed.
 */

import { apiFetch, getAccessToken } from '@/api/client';
import { obtenerEstadoEnlace } from '@/api/connectivity';
import { esFallaDeEnlace } from '@/api/errors';
import {
  markFailed,
  markPending,
  markSynced,
  markSyncing,
  type OutboxCommand,
} from '@/sync/outboxQueue';
import type { SyncAcceptedDto } from '@/sync/syncTypes';

/** Marca syncing → posta → synced|failed|pending. Expone serverEntityId. */
export async function syncOutboxCommand(
  cmd: OutboxCommand,
): Promise<SyncAcceptedDto | null> {
  if (!getAccessToken()) return null;
  if (obtenerEstadoEnlace().alcanzable === false) return null;

  await markSyncing(cmd.id);
  try {
    const res = await apiFetch<SyncAcceptedDto>('/api/sync/commands', {
      method: 'POST',
      body: JSON.stringify({
        idempotencyKey: cmd.idempotencyKey,
        commandType: cmd.commandType,
        payloadJson: cmd.payloadJson,
        occurredAtUtc: cmd.occurredAtUtc,
      }),
    });
    if (!res.success || !res.data) {
      if (esFallaDeEnlace(res.failure)) {
        await markPending(cmd.id);
        return null;
      }
      await markFailed(cmd.id, res.message ?? res.failure?.kind ?? 'error');
      return null;
    }
    await markSynced(cmd.id);
    return res.data;
  } catch {
    // Red / Core caído: no quemar el comando; el drenado reintenta.
    await markPending(cmd.id);
    return null;
  }
}
