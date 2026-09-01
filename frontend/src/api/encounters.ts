/** API de episodios / urgencias (M4 / WS-E). Sin mocks en el flujo de ingreso. */

import { apiFetch, type ApiResponse } from '@/api/client';

export type EncounterState = 'abierto' | 'en_observacion' | 'cerrado';
export type EncounterType = 'urgencias' | 'consulta_externa';
export type EncounterDisposition =
  | 'alta_domicilio'
  | 'traslado'
  | 'alta_voluntaria'
  | 'defuncion'
  | 'fuga'
  | 'referencia';

export type EncounterDto = {
  encounterId: string;
  tenantId: string;
  branchId: string;
  subjectId: string;
  encounterType: EncounterType | string;
  state: EncounterState | string;
  disposition: EncounterDisposition | string | null;
  arrivalAtUtc: string;
  accessRoute: string | null;
  admissionCircumstance: string | null;
  admissionCircumstanceText: string | null;
  /** null = no valorado */
  ministerioPublicoNotified: boolean | null;
  attendingProfessionalId: string | null;
  turnNumber: number;
  closedAtUtc: string | null;
  triageLevel: string | null;
  triageScaleCode: string | null;
  /** 0 = sin clasificar. Clasificado: prioridad de escala (1+). */
  triagePriority?: number | null;
  givenName: string | null;
  firstSurname: string | null;
  secondSurname: string | null;
  preferredName: string | null;
  identificationState: string | null;
  operationalLabel: string | null;
  internalCode: string | null;
  suggestMpNoticeEvaluation: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type EncounterQueueDto = {
  branchId: string;
  items: EncounterDto[];
  total: number;
  allUnclassified: boolean;
};

export type OpenEncounterRequest = {
  branchId: string;
  subjectId: string;
  encounterType?: EncounterType | string;
  arrivalAtUtc?: string | null;
  accessRoute?: string | null;
  admissionCircumstance?: string | null;
  admissionCircumstanceText?: string | null;
};

export type MpNoticeDto = {
  noticeId: string;
  encounterId: string;
  establishmentNameSnapshot: string;
  elaboratedAtUtc: string;
  patientIdentificationText: string;
  notifiedAct: string;
  injuryReportText: string | null;
  mpAgencyName: string;
  notifyingProfessionalId: string;
  notifyingProfessionalName: string;
};

export type CareWithoutConsentDto = {
  recordId: string;
  encounterId: string;
  clinicalAssessment: string;
  urgencyRationale: string;
  noRelativeOrRepresentative: boolean;
  professionalId1: string;
  professionalId2: string;
};

/** Etiqueta operativa para cola clínica (no monitor público). */
export function encounterDisplayName(e: EncounterDto): string {
  if (e.preferredName?.trim()) return e.preferredName.trim();
  const parts = [e.givenName, e.firstSurname, e.secondSurname].filter(Boolean);
  if (parts.length) return parts.join(' ');
  if (e.operationalLabel) return e.operationalLabel;
  return `Turno ${e.turnNumber}`;
}

/** Monitor de turnos: sólo número por omisión (doc 06 #21 ratificada). */
export function encounterMonitorLabel(e: EncounterDto, showName = false): string {
  if (!showName) return String(e.turnNumber);
  return `${e.turnNumber} · ${encounterDisplayName(e)}`;
}

export const estadoConfig: Record<string, { label: string; className: string }> = {
  abierto: { label: 'Abierto', className: 'bg-amber-100 text-amber-800' },
  en_observacion: { label: 'En observación', className: 'bg-sky-100 text-sky-800' },
  cerrado: { label: 'Cerrado', className: 'bg-slate-100 text-slate-700' },
};

export const circumstanceOptions = [
  { value: '', label: 'Sin capturar' },
  { value: 'hecho_transito', label: 'Hecho de tránsito' },
  { value: 'caida', label: 'Caída' },
  { value: 'agresion', label: 'Agresión' },
  { value: 'intoxicacion', label: 'Intoxicación' },
  { value: 'quemadura', label: 'Quemadura' },
  { value: 'hallado_via_publica', label: 'Hallado en vía pública' },
  { value: 'causa_medica_no_traumatica', label: 'Causa médica no traumática' },
  { value: 'otro', label: 'Otro' },
];

export const dispositionOptions = [
  { value: '', label: 'Seleccione desenlace (obligatorio al cerrar)' },
  { value: 'alta_domicilio', label: 'Alta a domicilio' },
  { value: 'traslado', label: 'Traslado' },
  { value: 'alta_voluntaria', label: 'Alta voluntaria' },
  { value: 'defuncion', label: 'Defunción' },
  { value: 'fuga', label: 'Fuga' },
  { value: 'referencia', label: 'Referencia' },
];

export async function openEncounter(
  body: OpenEncounterRequest,
): Promise<ApiResponse<EncounterDto>> {
  return apiFetch<EncounterDto>('/api/encounters', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getEncounter(id: string): Promise<ApiResponse<EncounterDto>> {
  return apiFetch<EncounterDto>(`/api/encounters/${encodeURIComponent(id)}`);
}

export async function listEncounterQueue(
  branchId: string,
  includeClosed = false,
): Promise<ApiResponse<EncounterQueueDto>> {
  const q = new URLSearchParams({
    branchId,
    includeClosed: includeClosed ? 'true' : 'false',
  });
  return apiFetch<EncounterQueueDto>(`/api/encounters/queue?${q}`);
}

export async function updateAdmission(
  id: string,
  body: Record<string, unknown>,
): Promise<ApiResponse<EncounterDto>> {
  return apiFetch<EncounterDto>(`/api/encounters/${encodeURIComponent(id)}/admission`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function transitionEncounterState(
  id: string,
  body: { toState: string; disposition?: string | null; justification?: string | null },
): Promise<ApiResponse<EncounterDto>> {
  return apiFetch<EncounterDto>(`/api/encounters/${encodeURIComponent(id)}/state`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createMpNotice(
  id: string,
  body: Record<string, unknown>,
): Promise<ApiResponse<MpNoticeDto>> {
  return apiFetch<MpNoticeDto>(`/api/encounters/${encodeURIComponent(id)}/mp-notice`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createCareWithoutConsent(
  id: string,
  body: Record<string, unknown>,
): Promise<ApiResponse<CareWithoutConsentDto>> {
  return apiFetch<CareWithoutConsentDto>(
    `/api/encounters/${encodeURIComponent(id)}/care-without-consent`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}
