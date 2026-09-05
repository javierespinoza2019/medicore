/** API de recetas y catálogo de medicamentos (M8 / WS-I). Sin mocks. */

import { apiFetch, type ApiResponse } from '@/api/client';
import type { AllergyStatusCode } from '@/api/clinicalRecord';

export type SaleClassification = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

export type FrequencyKind = 'every_n_hours' | 'n_times_per_day';

export type DoseDto = {
  valor?: number | null;
  unidad: string;
  estado: 'medido' | 'no_medido' | 'no_valorable' | string;
  origen?: string;
  razonNoMedido?: string | null;
};

export type FrequencyDto = {
  kind: FrequencyKind | string;
  n: number;
};

export type MedicationDto = {
  medicationId: string;
  tenantId: string;
  genericName: string;
  brandName: string | null;
  presentation: string | null;
  concentration: string | null;
  defaultRoute: string | null;
  saleClassification: SaleClassification | string;
  isControlledSubstance: boolean;
  isActive: boolean;
};

export type PrescriptionItemDto = {
  prescriptionItemId: string;
  prescriptionId: string;
  lineNumber: number;
  medicationId: string;
  genericNameSnapshot: string;
  brandNameSnapshot: string | null;
  dose: DoseDto;
  route: string;
  frequency: FrequencyDto;
  durationDays: number | null;
  quantity: number | null;
  refillsAllowed: number;
  instructions: string | null;
};

export type PrescriptionDto = {
  prescriptionId: string;
  tenantId: string;
  branchId: string;
  encounterId: string;
  subjectId: string;
  professionalId: string | null;
  authorUserId: string;
  authorDisplayName: string;
  authorLicenseSnapshot: string | null;
  facilitySnapshotJson: string | null;
  issuedAtUtc: string | null;
  validUntilUtc: string | null;
  allergyStatusAtIssue: AllergyStatusCode | string;
  allergyStatusCaptureEventId: string | null;
  allergyOverrideJustification: string | null;
  contentHash: string | null;
  signedAtUtc: string | null;
  sealedAtUtc: string | null;
  sealState: string;
  cancelledAtUtc: string | null;
  cancelReason: string | null;
  generalInstructions: string | null;
  occurredAtUtc: string;
  recordedAtUtc: string;
  items: PrescriptionItemDto[];
  firmaDescripcionLegible: string;
};

export type CreatePrescriptionItemPayload = {
  medicationId: string;
  dose: DoseDto;
  route: string;
  frequency: FrequencyDto;
  durationDays?: number | null;
  quantity?: number | null;
  refillsAllowed?: number;
  instructions?: string | null;
  brandNameSnapshot?: string | null;
};

export type CreatePrescriptionPayload = {
  items: CreatePrescriptionItemPayload[];
  generalInstructions?: string | null;
  allergyOverrideJustification?: string | null;
  allergyStatusCaptureEventId?: string | null;
  occurredAtUtc?: string | null;
};

/** Mensaje canónico de controlados (debe coincidir con backend). */
export const CONTROLLED_BLOCKED_MESSAGE =
  'Medicamento controlado (estupefaciente/psicotrópico) impedido: fuera del alcance de Fase 1. Su suministro requiere recetario especial con código de barras asignado por la autoridad (LGS arts. 240–241). No se implementan recetarios de controlados hasta decisión + Reglamento de Insumos.';

/**
 * commandTypes offline Full (cola local → SyncService despacha SP en la misma TX):
 * - allergyStatus.set (antes de crear, si hace falta captura)
 * - prescription.create
 * - prescription.sign
 */
export const PRESCRIPTION_OFFLINE_COMMAND_TYPES = [
  'allergyStatus.set',
  'prescription.create',
  'prescription.sign',
] as const;

export function frequencyLabel(freq: FrequencyDto): string {
  if (freq.kind === 'every_n_hours') return `cada ${freq.n} h`;
  if (freq.kind === 'n_times_per_day') return `${freq.n} veces al día`;
  return `${freq.kind} (${freq.n})`;
}

export function doseLabel(dose: DoseDto): string {
  if (dose.estado === 'medido' && dose.valor != null) return `${dose.valor} ${dose.unidad}`;
  return dose.razonNoMedido || dose.estado;
}

export async function searchMedications(
  query: string,
  includeControlled = false,
): Promise<ApiResponse<MedicationDto[]>> {
  const q = new URLSearchParams();
  if (query.trim()) q.set('query', query.trim());
  if (includeControlled) q.set('includeControlled', 'true');
  const qs = q.toString();
  return apiFetch<MedicationDto[]>(`/api/medications${qs ? `?${qs}` : ''}`);
}

/** Listado admin: incluye inactivos y controlados (requiere canAdminCatalogos). */
export async function listMedicationsAdmin(
  query = '',
): Promise<ApiResponse<MedicationDto[]>> {
  const q = new URLSearchParams({
    includeControlled: 'true',
    onlyActive: 'false',
    maxRows: '200',
  });
  if (query.trim()) q.set('query', query.trim());
  return apiFetch<MedicationDto[]>(`/api/medications?${q}`);
}

export type UpsertMedicationPayload = {
  genericName: string;
  brandName?: string | null;
  presentation?: string | null;
  concentration?: string | null;
  defaultRoute?: string | null;
  saleClassification: SaleClassification;
  isControlledSubstance: boolean;
  isActive: boolean;
};

export async function upsertMedication(
  payload: UpsertMedicationPayload,
  medicationId?: string | null,
): Promise<ApiResponse<MedicationDto>> {
  const q = medicationId ? `?medicationId=${encodeURIComponent(medicationId)}` : '';
  return apiFetch<MedicationDto>(`/api/medications${q}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createPrescription(
  encounterId: string,
  payload: CreatePrescriptionPayload,
): Promise<ApiResponse<PrescriptionDto>> {
  return apiFetch<PrescriptionDto>(`/api/encounters/${encounterId}/prescriptions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getPrescription(id: string): Promise<ApiResponse<PrescriptionDto>> {
  return apiFetch<PrescriptionDto>(`/api/prescriptions/${id}`);
}

export async function listPrescriptionsBySubject(
  subjectId: string,
): Promise<ApiResponse<PrescriptionDto[]>> {
  return apiFetch<PrescriptionDto[]>(`/api/subjects/${subjectId}/prescriptions`);
}

export async function signPrescription(id: string): Promise<ApiResponse<PrescriptionDto>> {
  return apiFetch<PrescriptionDto>(`/api/prescriptions/${id}/sign`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function cancelPrescription(
  id: string,
  reason: string,
): Promise<ApiResponse<PrescriptionDto>> {
  return apiFetch<PrescriptionDto>(`/api/prescriptions/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
