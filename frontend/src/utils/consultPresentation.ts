import {
  encounterDisplayName,
  type EncounterDto,
  type EncounterState,
} from '@/api/encounters';
import { waitMinutesSince } from '@/utils/encounterQueuePresentation';

export type ConsultQueueStats = {
  total: number;
  abierto: number;
  enObservacion: number;
  cerrado: number;
  avgWaitMinutes: number;
};

export function computeConsultQueueStats(
  encounters: EncounterDto[],
  now = new Date(),
): ConsultQueueStats {
  let abierto = 0;
  let enObservacion = 0;
  let cerrado = 0;
  let waitSum = 0;
  let waitCount = 0;

  for (const e of encounters) {
    const state = e.state as EncounterState;
    if (state === 'abierto') {
      abierto += 1;
      waitSum += waitMinutesSince(e.arrivalAtUtc, now);
      waitCount += 1;
    } else if (state === 'en_observacion') {
      enObservacion += 1;
      waitSum += waitMinutesSince(e.arrivalAtUtc, now);
      waitCount += 1;
    } else if (state === 'cerrado') {
      cerrado += 1;
    }
  }

  return {
    total: encounters.length,
    abierto,
    enObservacion: enObservacion,
    cerrado,
    avgWaitMinutes: waitCount > 0 ? Math.round(waitSum / waitCount) : 0,
  };
}

export function filterConsultQueue(
  encounters: EncounterDto[],
  opts: { search?: string; subjectId?: string | null; openOnly?: boolean },
): EncounterDto[] {
  let rows = encounters.filter((e) => e.encounterType === 'consulta_externa');

  if (opts.subjectId) {
    rows = rows.filter((e) => e.subjectId === opts.subjectId);
  }
  if (opts.openOnly) {
    rows = rows.filter((e) => e.state !== 'cerrado');
  }
  if (opts.search?.trim()) {
    const q = opts.search.trim().toLowerCase();
    rows = rows.filter((e) => {
      const name = encounterDisplayName(e).toLowerCase();
      return (
        name.includes(q) ||
        String(e.turnNumber).includes(q) ||
        (e.operationalLabel?.toLowerCase().includes(q) ?? false)
      );
    });
  }

  return rows.sort((a, b) => {
    if (a.turnNumber !== b.turnNumber) return a.turnNumber - b.turnNumber;
    return a.arrivalAtUtc.localeCompare(b.arrivalAtUtc);
  });
}

export function formatConsultArrival(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function formatConsultDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}
