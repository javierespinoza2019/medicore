/** API de auditoría (M2). Consulta sólo con enlace; no se cachea offline. */

import { apiFetch, type ApiResponse } from '@/api/client';

/** Espejo camelCase de MediCore.Models.Audit.AuditEventDto */
export type AuditEventDto = {
  auditEventId: string;
  tenantId: string;
  actorUserId: string;
  actorProfessionalId: string | null;
  branchId: string | null;
  eventType: string;
  entityName: string;
  entityId: string;
  subjectId: string | null;
  detailJson: string | null;
  occurredAtUtc: string;
  recordedAtUtc: string;
  deviceId: string | null;
  ipAddress: string | null;
  actorDisplayName: string | null;
  actorUserName: string | null;
};

export async function listAuditBySubject(
  subjectId: string,
  fromUtc?: string,
  toUtc?: string,
): Promise<ApiResponse<AuditEventDto[]>> {
  const q = new URLSearchParams();
  if (fromUtc) q.set('fromUtc', fromUtc);
  if (toUtc) q.set('toUtc', toUtc);
  const qs = q.toString();
  return apiFetch<AuditEventDto[]>(
    `/api/audit/subject/${encodeURIComponent(subjectId)}${qs ? `?${qs}` : ''}`,
  );
}

export async function listAuditByActor(
  userId: string,
  fromUtc?: string,
  toUtc?: string,
): Promise<ApiResponse<AuditEventDto[]>> {
  const q = new URLSearchParams();
  if (fromUtc) q.set('fromUtc', fromUtc);
  if (toUtc) q.set('toUtc', toUtc);
  const qs = q.toString();
  return apiFetch<AuditEventDto[]>(
    `/api/audit/actor/${encodeURIComponent(userId)}${qs ? `?${qs}` : ''}`,
  );
}

/** Etiqueta corta para eventType conocidos. */
export function labelEventType(eventType: string): string {
  const map: Record<string, string> = {
    'record.read': 'Lectura de expediente',
    'clinical_exception.discharge_with_pending_prescriptions': 'Alta con Rx pendiente',
    'security.break_glass.started': 'Break-glass',
  };
  return map[eventType] ?? eventType;
}
