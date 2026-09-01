import type { ReglaBloqueo } from '@/mocks/agendaRules';
import { toMinutes } from '@/pages/agenda/components/timeGridConfig';

export interface BlockedSlot {
  start: string;
  end: string;
  label: string;
}

/**
 * Calcula los intervalos bloqueados para una fecha dada, según el contexto
 * (médicos vinculados y especialidad) de la columna del consultorio.
 */
export function getBlockedSlots(
  date: string,
  rules: ReglaBloqueo[],
  ctx: { doctorIds: string[]; especialidadId?: string },
): BlockedSlot[] {
  const slots: BlockedSlot[] = [];
  for (const r of rules) {
    if (!r.activo) continue;
    if (r.fecha !== date) continue;

    if (r.tipo === 'dia') {
      slots.push({ start: '00:00', end: '24:00', label: r.nombre });
    } else if (r.tipo === 'rango' && r.horaInicio && r.horaFin) {
      slots.push({ start: r.horaInicio, end: r.horaFin, label: r.nombre });
    } else if (r.tipo === 'medico' && r.doctorId && ctx.doctorIds.includes(r.doctorId)) {
      slots.push({ start: '00:00', end: '24:00', label: r.nombre });
    } else if (r.tipo === 'especialidad' && r.especialidadId && ctx.especialidadId === r.especialidadId) {
      slots.push({ start: '00:00', end: '24:00', label: r.nombre });
    }
  }
  return slots;
}

export function isTimeBlocked(slots: BlockedSlot[], time: string): boolean {
  const m = toMinutes(time);
  return slots.some((s) => m >= toMinutes(s.start) && m < toMinutes(s.end));
}