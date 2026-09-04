import { defaultAgendaConfig } from '@/pages/agenda/agendaConfig';

export const START_HOUR = defaultAgendaConfig.startHour;
export const END_HOUR = defaultAgendaConfig.endHour;
export const TOTAL_HOURS = END_HOUR - START_HOUR;

export type TimeGranularity = '15' | '30' | '60';

export interface GranularityConfig {
  HOUR_HEIGHT: number;
  SNAP_MINUTES: number;
  showHalfLines: boolean;
  showQuarterLines: boolean;
  label: string;
}

export function getGranularityConfig(granularity: TimeGranularity): GranularityConfig {
  switch (granularity) {
    case '15':
      return {
        HOUR_HEIGHT: 60,
        SNAP_MINUTES: 15,
        showHalfLines: true,
        showQuarterLines: true,
        label: '15 min',
      };
    case '30':
      return {
        HOUR_HEIGHT: 72,
        SNAP_MINUTES: 30,
        showHalfLines: true,
        showQuarterLines: false,
        label: '30 min',
      };
    case '60':
      return {
        HOUR_HEIGHT: 96,
        SNAP_MINUTES: 60,
        showHalfLines: false,
        showQuarterLines: false,
        label: '1 hr',
      };
    default:
      return {
        HOUR_HEIGHT: 60,
        SNAP_MINUTES: 15,
        showHalfLines: true,
        showQuarterLines: true,
        label: '15 min',
      };
  }
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getTimeFromY(
  y: number,
  containerTop: number,
  granularity: TimeGranularity,
): string {
  const { HOUR_HEIGHT, SNAP_MINUTES } = getGranularityConfig(granularity);
  const relativeY = y - containerTop;
  const minutesFromStart = (relativeY / HOUR_HEIGHT) * 60;
  const totalMinutes = START_HOUR * 60 + Math.max(0, minutesFromStart);
  const rounded = Math.round(totalMinutes / SNAP_MINUTES) * SNAP_MINUTES;
  const clamped = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, rounded));
  return minutesToTime(clamped);
}