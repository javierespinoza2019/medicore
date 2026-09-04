import type { EncounterDto } from '@/api/encounters';
import type { TriageScaleConfigDto, TriageScaleLevel } from '@/api/triage';
import { findTriageScaleLevel, triageLevelLabel } from '@/utils/triageScalePresentation';

export type LevelAccent = {
  border: string;
  dot: string;
  badge: string;
  text: string;
  iconColor: string;
};

const priorityAccent: Record<number, LevelAccent> = {
  1: {
    border: 'border-red-500/30',
    dot: 'bg-red-500',
    badge: 'bg-red-50',
    text: 'text-red-800',
    iconColor: 'text-red-500',
  },
  2: {
    border: 'border-orange-500/30',
    dot: 'bg-orange-500',
    badge: 'bg-orange-50',
    text: 'text-orange-800',
    iconColor: 'text-orange-500',
  },
  3: {
    border: 'border-amber-400/30',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50',
    text: 'text-amber-800',
    iconColor: 'text-amber-500',
  },
  4: {
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50',
    text: 'text-emerald-800',
    iconColor: 'text-emerald-500',
  },
  5: {
    border: 'border-sky-500/30',
    dot: 'bg-sky-500',
    badge: 'bg-sky-50',
    text: 'text-sky-800',
    iconColor: 'text-sky-500',
  },
};

export const neutralAccent: LevelAccent = {
  border: 'border-secondary-300',
  dot: 'bg-secondary-400',
  badge: 'bg-secondary-100',
  text: 'text-foreground-700',
  iconColor: 'text-foreground-500',
};

export function accentForPriority(priority: number | null | undefined): LevelAccent {
  if (priority == null || priority < 1) return neutralAccent;
  return priorityAccent[Math.min(priority, 5)] ?? neutralAccent;
}

export function accentForEncounter(
  scale: TriageScaleConfigDto | null,
  encounter: EncounterDto,
): LevelAccent {
  const level = findTriageScaleLevel(scale, encounter.triageLevel);
  const priority = level?.priority ?? encounter.triagePriority ?? null;
  return accentForPriority(priority);
}

export function waitMinutesSince(arrivalAtUtc: string, now: Date): number {
  const arrived = new Date(arrivalAtUtc).getTime();
  if (Number.isNaN(arrived)) return 0;
  return Math.max(0, Math.floor((now.getTime() - arrived) / 60_000));
}

export function formatWaitLabel(minutes: number): string {
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatArrivalLocal(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function waitTimeTextClass(minutes: number): string {
  if (minutes < 10) return 'text-emerald-600';
  if (minutes < 30) return 'text-amber-600 font-semibold';
  return 'text-red-600 font-bold';
}

export function waitTimeBgClass(minutes: number): string {
  if (minutes < 10) return 'bg-emerald-50';
  if (minutes < 30) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}

export type QueueStats = {
  total: number;
  unclassified: number;
  abierto: number;
  enObservacion: number;
  cerrado: number;
  avgWaitMinutes: number;
  byLevel: { level: TriageScaleLevel; count: number; accent: LevelAccent }[];
};

export function computeQueueStats(
  items: EncounterDto[],
  scale: TriageScaleConfigDto | null,
  now: Date,
): QueueStats {
  const activos = items.filter((e) => e.state !== 'cerrado');
  const waits = activos.map((e) => waitMinutesSince(e.arrivalAtUtc, now));
  const avgWaitMinutes =
    waits.length > 0 ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0;

  const byLevel = (scale?.levels ?? [])
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .map((level) => ({
      level,
      count: items.filter((e) => e.triageLevel === level.code).length,
      accent: accentForPriority(level.priority),
    }));

  return {
    total: items.length,
    unclassified: items.filter((e) => !e.triageLevel).length,
    abierto: items.filter((e) => e.state === 'abierto').length,
    enObservacion: items.filter((e) => e.state === 'en_observacion').length,
    cerrado: items.filter((e) => e.state === 'cerrado').length,
    avgWaitMinutes,
    byLevel,
  };
}

export type EncounterFilterState = {
  search: string;
  levelCode: string | 'todos' | 'sin_clasificar';
  state: string | 'todos';
};

export function filterEncounters(
  items: EncounterDto[],
  filters: EncounterFilterState,
): EncounterDto[] {
  let list = [...items];
  const q = filters.search.trim().toLowerCase();
  if (q) {
    list = list.filter((e) => {
      const name = [
        e.preferredName,
        e.givenName,
        e.firstSurname,
        e.secondSurname,
        e.operationalLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return (
        name.includes(q) ||
        String(e.turnNumber).includes(q) ||
        (e.triageLevel?.toLowerCase().includes(q) ?? false)
      );
    });
  }
  if (filters.levelCode === 'sin_clasificar') {
    list = list.filter((e) => !e.triageLevel);
  } else if (filters.levelCode !== 'todos') {
    list = list.filter((e) => e.triageLevel === filters.levelCode);
  }
  if (filters.state !== 'todos') {
    list = list.filter((e) => e.state === filters.state);
  }
  return list;
}

export function triageBadgeLabel(
  scale: TriageScaleConfigDto | null,
  encounter: EncounterDto,
): string {
  return triageLevelLabel(scale, encounter.triageLevel);
}

export function levelIcon(
  scale: TriageScaleConfigDto | null,
  encounter: EncounterDto,
): string {
  return findTriageScaleLevel(scale, encounter.triageLevel)?.icon ?? 'ri-flag-line';
}
