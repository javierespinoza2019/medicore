/** API de reglas de bloqueo de agenda (ScheduleBlock). Sin mocks. */

import { apiFetch, type ApiResponse } from '@/api/client';

export type ScheduleBlockKind = 'rango' | 'dia' | 'medico' | 'especialidad';

export type ScheduleBlockDto = {
  blockId: string;
  tenantId: string;
  branchId: string;
  kind: ScheduleBlockKind | string;
  name: string;
  localDate: string;
  startUtc: string;
  endUtc: string;
  professionalId: string | null;
  professionalFullName: string | null;
  specialtyId: string | null;
  specialtyName: string | null;
  isActive: boolean;
  createdByUserId: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type UpsertScheduleBlockRequest = {
  branchId: string;
  kind: ScheduleBlockKind;
  name: string;
  localDate: string;
  startUtc: string;
  endUtc: string;
  professionalId?: string | null;
  specialtyId?: string | null;
  isActive: boolean;
};

export async function listScheduleBlocks(
  branchId: string,
  fromUtc: string,
  toUtc: string,
): Promise<ApiResponse<ScheduleBlockDto[]>> {
  const q = new URLSearchParams({
    branchId,
    from: fromUtc,
    to: toUtc,
  });
  return apiFetch<ScheduleBlockDto[]>(`/api/schedule-blocks?${q}`);
}

export async function upsertScheduleBlock(
  blockId: string,
  body: UpsertScheduleBlockRequest,
): Promise<ApiResponse<ScheduleBlockDto>> {
  return apiFetch<ScheduleBlockDto>(`/api/schedule-blocks/${blockId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function softDeleteScheduleBlock(
  blockId: string,
): Promise<ApiResponse<null>> {
  return apiFetch<null>(`/api/schedule-blocks/${blockId}`, { method: 'DELETE' });
}

/** Convierte fecha local + horas a UTC ISO (mismo criterio que citas). */
export function localRangeToUtc(
  fecha: string,
  horaInicio: string,
  horaFin: string,
): { startUtc: string; endUtc: string } {
  const start = new Date(`${fecha}T${horaInicio}:00`);
  const end = new Date(`${fecha}T${horaFin}:00`);
  return { startUtc: start.toISOString(), endUtc: end.toISOString() };
}

export function fullDayLocalToUtc(fecha: string): { startUtc: string; endUtc: string } {
  const start = new Date(`${fecha}T00:00:00`);
  const end = new Date(`${fecha}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return { startUtc: start.toISOString(), endUtc: end.toISOString() };
}
