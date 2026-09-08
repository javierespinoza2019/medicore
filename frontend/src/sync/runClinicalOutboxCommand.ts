/**
 * Escritura clínica vía cola local (ADR-014 / doc 12).
 * Confirma UI contra IndexedDB; sync inmediato si hay enlace.
 * Sin dispositivo aprobado: no captura offline.
 */

import { obtenerEstadoEnlace } from '@/api/connectivity';
import { enqueueCommand, type OutboxCommand } from '@/sync/outboxQueue';
import { syncOutboxCommand } from '@/sync/outboxSync';
import { tryDrainOutbox } from '@/sync/outboxDrain';
import type { SyncAcceptedDto } from '@/sync/syncTypes';

export type ClinicalOutboxOk = {
  ok: true;
  queued: boolean;
  command: OutboxCommand;
  sync: SyncAcceptedDto | null;
  serverEntityId: string | null;
};

export type ClinicalOutboxErr = {
  ok: false;
  error: string;
};

export type ClinicalOutboxResult = ClinicalOutboxOk | ClinicalOutboxErr;

export type DeviceGate = {
  allowsOfflineQueue: boolean;
  isPendingApproval: boolean;
};

function offlineBlockedMessage(gate: DeviceGate): string {
  if (gate.isPendingApproval) {
    return 'Esta estación está pendiente de aprobación. Sin cola offline no se puede capturar sin enlace. Pida aprobación en Administración → Dispositivos.';
  }
  return 'Esta estación no tiene cola offline habilitada. Conéctese a la red o apruebe el dispositivo.';
}

export function isClinicalOutboxErr(
  result: ClinicalOutboxResult,
): result is ClinicalOutboxErr {
  return result.ok === false;
}

/**
 * Encola siempre; sincroniza si hay enlace.
 * `queued=true` = quedó pendiente (sin enlace o sync diferido).
 */
export async function runClinicalOutboxCommand(
  commandType: string,
  payload: unknown,
  gate: DeviceGate,
): Promise<ClinicalOutboxResult> {
  const offline = obtenerEstadoEnlace().alcanzable === false;
  if (offline && !gate.allowsOfflineQueue) {
    return { ok: false, error: offlineBlockedMessage(gate) };
  }

  const command = await enqueueCommand(commandType, payload);
  if (offline) {
    void tryDrainOutbox();
    return {
      ok: true,
      queued: true,
      command,
      sync: null,
      serverEntityId: null,
    };
  }

  const sync = await syncOutboxCommand(command);
  if (!sync) {
    // Fallo de red a mitad: queda pending; no bloquear la captura.
    void tryDrainOutbox();
    return {
      ok: true,
      queued: true,
      command,
      sync: null,
      serverEntityId: null,
    };
  }

  return {
    ok: true,
    queued: false,
    command,
    sync,
    serverEntityId: sync.serverEntityId ?? null,
  };
}
