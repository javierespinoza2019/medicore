import type { EncounterDto } from '@/api/encounters';
import type { TriageScaleConfigDto } from '@/api/triage';
import { findTriageScaleLevel, triageLevelLabel } from '@/utils/triageScalePresentation';

/** Estilo visual por prioridad de escala (no mapa fijo rojo/amarillo/verde del prototipo). */
const priorityAccent: Record<number, { border: string; dot: string; badge: string; text: string }> = {
  1: {
    border: 'border-red-500',
    dot: 'bg-red-500',
    badge: 'bg-red-50',
    text: 'text-red-800',
  },
  2: {
    border: 'border-orange-500',
    dot: 'bg-orange-500',
    badge: 'bg-orange-50',
    text: 'text-orange-800',
  },
  3: {
    border: 'border-amber-400',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50',
    text: 'text-amber-800',
  },
  4: {
    border: 'border-emerald-500',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50',
    text: 'text-emerald-800',
  },
  5: {
    border: 'border-sky-500',
    dot: 'bg-sky-500',
    badge: 'bg-sky-50',
    text: 'text-sky-800',
  },
};

const neutralAccent = {
  border: 'border-secondary-300',
  dot: 'bg-secondary-400',
  badge: 'bg-secondary-100',
  text: 'text-foreground-700',
};

const nextAccent = {
  border: 'border-accent-500',
  dot: 'bg-accent-500',
  badge: 'bg-accent-100',
  text: 'text-accent-800',
};

export type MonitorTurnoRow = {
  encounter: EncounterDto;
  position: number;
  waitMinutes: number;
  isNext: boolean;
  triageLabel: string;
  accent: typeof neutralAccent;
  stateLabel: string;
};

export function formatMonitorClock(date: Date): string {
  return date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
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
  return `${hours}h ${mins}m`;
}

function accentForPriority(priority: number | null | undefined) {
  if (priority == null || priority < 1) return neutralAccent;
  return priorityAccent[Math.min(priority, 5)] ?? neutralAccent;
}

export function buildMonitorRows(
  encounters: EncounterDto[],
  scale: TriageScaleConfigDto | null,
  now: Date,
): MonitorTurnoRow[] {
  const activos = encounters.filter((e) => e.state !== 'cerrado');
  return activos.map((encounter, index) => {
    const level = findTriageScaleLevel(scale, encounter.triageLevel);
    const priority = level?.priority ?? encounter.triagePriority ?? null;
    const isNext = index === 0;
    const accent = isNext ? nextAccent : accentForPriority(priority);
    const stateLabel =
      encounter.state === 'en_observacion' ? 'En observación' : 'En espera';

    return {
      encounter,
      position: index + 1,
      waitMinutes: waitMinutesSince(encounter.arrivalAtUtc, now),
      isNext,
      triageLabel: triageLevelLabel(scale, encounter.triageLevel),
      accent,
      stateLabel,
    };
  });
}

export function legendLevels(scale: TriageScaleConfigDto | null) {
  if (!scale?.levels?.length) {
    return [{ label: 'Sin clasificar', accent: neutralAccent }];
  }
  const sorted = [...scale.levels].sort((a, b) => a.priority - b.priority);
  return sorted.map((level) => ({
    label: level.label,
    accent: accentForPriority(level.priority),
  }));
}
