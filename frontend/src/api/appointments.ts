/** API de agenda (M9 / WS-J). Sin mocks. Escritura online por API.
 * Offline Full: `appointment.create` / `appointment.state` despachan SP en SyncService.
 */

import { apiFetch, type ApiResponse } from '@/api/client';

export const APPOINTMENT_OFFLINE_COMMAND_TYPES = [
  'appointment.create',
  'appointment.state',
] as const;

export type AppointmentState =
  | 'agendada'
  | 'confirmada'
  | 'llego'
  | 'en_espera'
  | 'en_consulta'
  | 'atendida'
  | 'no_asistio'
  | 'cancelada';

export type ConsultingRoomDto = {
  roomId: string;
  tenantId: string;
  branchId: string;
  code: string;
  name: string;
  isActive: boolean;
  specialtyId: string | null;
  specialtyName: string | null;
  professionalIds: string[];
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type AppointmentDto = {
  appointmentId: string;
  tenantId: string;
  branchId: string;
  subjectId: string;
  professionalId: string;
  roomId: string | null;
  scheduledStartUtc: string;
  scheduledEndUtc: string;
  state: AppointmentState | string;
  serviceCode: string | null;
  notes: string | null;
  createdByUserId: string;
  createdByProfessionalId: string | null;
  createdByDisplayName: string;
  occurredAtUtc: string;
  recordedAtUtc: string;
  updatedAtUtc: string;
  subjectGivenName: string | null;
  subjectFirstSurname: string | null;
  subjectSecondSurname: string | null;
  subjectPreferredName: string | null;
  subjectIdentificationState: string | null;
  subjectOperationalLabel: string | null;
  subjectDisplayLabel: string;
  professionalFullName: string | null;
  professionalLicense: string | null;
  roomCode: string | null;
  roomName: string | null;
};

export type CreateAppointmentRequest = {
  branchId: string;
  subjectId: string;
  professionalId: string;
  roomId?: string | null;
  scheduledStartUtc: string;
  scheduledEndUtc: string;
  serviceCode?: string | null;
  notes?: string | null;
};

export type RescheduleAppointmentRequest = {
  scheduledStartUtc: string;
  scheduledEndUtc: string;
  professionalId?: string | null;
  roomId?: string | null;
  serviceCode?: string | null;
  notes?: string | null;
};

export type ChangeAppointmentStateRequest = {
  toState: AppointmentState | string;
  reason?: string | null;
};

export type UpsertConsultingRoomRequest = {
  branchId: string;
  code: string;
  name: string;
  isActive: boolean;
  specialtyId?: string | null;
  professionalIds?: string[];
};

export async function listConsultingRooms(
  branchId?: string,
  onlyActive = true,
): Promise<ApiResponse<ConsultingRoomDto[]>> {
  const params = new URLSearchParams();
  if (branchId) params.set('branchId', branchId);
  params.set('onlyActive', String(onlyActive));
  return apiFetch<ConsultingRoomDto[]>(`/api/consulting-rooms?${params}`);
}

export async function upsertConsultingRoom(
  roomId: string,
  body: UpsertConsultingRoomRequest,
): Promise<ApiResponse<ConsultingRoomDto>> {
  return apiFetch<ConsultingRoomDto>(`/api/consulting-rooms/${roomId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function listAppointments(params: {
  branchId: string;
  from: string;
  to: string;
  professionalId?: string;
  roomId?: string;
  /** Fail closed: sin profesional en sesión el API devuelve []. */
  mine?: boolean;
}): Promise<ApiResponse<AppointmentDto[]>> {
  const q = new URLSearchParams({
    branchId: params.branchId,
    from: params.from,
    to: params.to,
  });
  if (params.professionalId) q.set('professionalId', params.professionalId);
  if (params.roomId) q.set('roomId', params.roomId);
  if (params.mine) q.set('mine', 'true');
  return apiFetch<AppointmentDto[]>(`/api/appointments?${q}`);
}

export async function createAppointment(
  body: CreateAppointmentRequest,
): Promise<ApiResponse<AppointmentDto>> {
  return apiFetch<AppointmentDto>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function rescheduleAppointment(
  id: string,
  body: RescheduleAppointmentRequest,
): Promise<ApiResponse<AppointmentDto>> {
  return apiFetch<AppointmentDto>(`/api/appointments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function changeAppointmentState(
  id: string,
  body: ChangeAppointmentStateRequest,
): Promise<ApiResponse<AppointmentDto>> {
  return apiFetch<AppointmentDto>(`/api/appointments/${id}/state`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export const appointmentStateLabels: Record<string, string> = {
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  atendida: 'Atendida',
  no_asistio: 'No asistió',
  cancelada: 'Cancelada',
};
