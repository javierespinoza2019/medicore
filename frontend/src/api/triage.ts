/** API de triage y signos vitales (M5 / WS-F). Sin mocks. */

import { apiFetch } from '@/api/client';

export type TriageScaleLevel = {
  code: string;
  label: string;
  priority: number;
  icon?: string | null;
  sortHint?: string | null;
};

export type TriageScaleConfigDto = {
  configId: string;
  tenantId: string;
  branchId: string | null;
  scaleCode: string;
  displayName: string;
  levelsJson: string;
  levels: TriageScaleLevel[];
  isActive: boolean;
  resolvedFrom: 'tenant' | 'branch' | string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type VitalMeasurementState = 'medido' | 'no_medido' | 'no_valorable';
export type VitalMeasurementSource = 'medido' | 'estimado' | 'declarado';

export type VitalMeasurementDto = {
  measurementId?: string | null;
  vitalSetId?: string | null;
  signCode: string;
  value: number | null;
  unit: string;
  state: VitalMeasurementState | string;
  source: VitalMeasurementSource | string;
  notMeasuredReason?: string | null;
};

export type VitalSetDto = {
  vitalSetId: string;
  encounterId: string;
  triageId: string | null;
  sourceContext: string;
  occurredAtUtc: string;
  recordedAtUtc: string;
  measurements: VitalMeasurementDto[];
};

export type TriageDto = {
  triageId: string;
  encounterId: string;
  level: string | null;
  scaleCode: string;
  scaleConfigId: string | null;
  levelPriority: number | null;
  chiefComplaint: string | null;
  painScore: number | null;
  painAssessable: 'valorable' | 'no_valorable' | string;
  classifiedByProfessionalId: string | null;
  actorUserId: string;
  actorProfessionalId: string | null;
  actorDisplayName: string;
  occurredAtUtc: string;
  recordedAtUtc: string;
  vitalSetId: string | null;
  vitals: VitalMeasurementDto[];
};

export type SaveTriageRequest = {
  level?: string | null;
  chiefComplaint?: string | null;
  painScore?: number | null;
  painAssessable?: 'valorable' | 'no_valorable' | string;
  vitals?: VitalMeasurementDto[];
  occurredAtUtc?: string | null;
};

export type ReclassifyTriageRequest = {
  level: string;
  chiefComplaint?: string | null;
  painScore?: number | null;
  painAssessable?: 'valorable' | 'no_valorable' | string;
  vitals?: VitalMeasurementDto[];
  occurredAtUtc?: string | null;
};

export type UpsertTriageScaleRequest = {
  scaleCode: string;
  displayName: string;
  levels: TriageScaleLevel[];
  note?: string | null;
};

export type AppendVitalsRequest = {
  vitals: VitalMeasurementDto[];
  sourceContext?: string | null;
  occurredAtUtc?: string | null;
};

/** Códigos canónicos (alineados al backend). Ninguno obligatorio. */
export const CANONICAL_VITAL_CODES = [
  'temperatura',
  'tension_sistolica',
  'tension_diastolica',
  'frecuencia_cardiaca',
  'frecuencia_respiratoria',
  'saturacion',
  'glucosa',
  'peso',
  'talla',
] as const;

export type CanonicalVitalCode = (typeof CANONICAL_VITAL_CODES)[number];

export const VITAL_DEFAULT_UNITS: Record<CanonicalVitalCode, string> = {
  temperatura: 'C',
  tension_sistolica: 'mmHg',
  tension_diastolica: 'mmHg',
  frecuencia_cardiaca: 'lpm',
  frecuencia_respiratoria: 'rpm',
  saturacion: '%',
  glucosa: 'mg/dL',
  peso: 'kg',
  talla: 'm',
};

export const VITAL_LABELS: Record<CanonicalVitalCode, string> = {
  temperatura: 'Temperatura',
  tension_sistolica: 'Tensión sistólica',
  tension_diastolica: 'Tensión diastólica',
  frecuencia_cardiaca: 'Frecuencia cardiaca',
  frecuencia_respiratoria: 'Frecuencia respiratoria',
  saturacion: 'Saturación O₂',
  glucosa: 'Glucosa',
  peso: 'Peso',
  talla: 'Talla',
};

/** Offline Full: SyncService despacha triage/vitals en la misma TX de idempotencia. */
export const TRIAGE_OFFLINE_COMMAND_TYPES = [
  'triage.save',
  'triage.reclassify',
  'vitals.append',
] as const;

export async function getEffectiveTriageScale(branchId: string) {
  return apiFetch<TriageScaleConfigDto>(
    `/api/branches/${branchId}/triage-scale`,
  );
}

export async function upsertTenantTriageScale(body: UpsertTriageScaleRequest) {
  return apiFetch<TriageScaleConfigDto>('/api/tenant/triage-scale', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function upsertBranchTriageScale(
  branchId: string,
  body: UpsertTriageScaleRequest,
) {
  return apiFetch<TriageScaleConfigDto>(
    `/api/branches/${branchId}/triage-scale`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
}

export async function saveTriage(encounterId: string, body: SaveTriageRequest) {
  return apiFetch<TriageDto>(`/api/encounters/${encounterId}/triage`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getTriage(encounterId: string) {
  return apiFetch<TriageDto>(`/api/encounters/${encounterId}/triage`);
}

export async function reclassifyTriage(
  encounterId: string,
  body: ReclassifyTriageRequest,
) {
  return apiFetch<TriageDto>(
    `/api/encounters/${encounterId}/triage/reclassify`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function appendVitals(encounterId: string, body: AppendVitalsRequest) {
  return apiFetch<VitalSetDto>(`/api/encounters/${encounterId}/vitals`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function listVitals(encounterId: string) {
  return apiFetch<VitalSetDto[]>(`/api/encounters/${encounterId}/vitals`);
}

/**
 * Construye mediciones para guardar. Vacío → no_medido «no tomado».
 * Prohibido fabricar 0: string vacío no se convierte a 0.
 */
export function buildVitalsFromForm(
  values: Partial<Record<CanonicalVitalCode, string>>,
  options?: { notMeasuredReason?: string },
): VitalMeasurementDto[] {
  const reason = options?.notMeasuredReason?.trim() || 'no tomado';
  return CANONICAL_VITAL_CODES.map((code) => {
    const raw = values[code]?.trim() ?? '';
    if (!raw) {
      return {
        signCode: code,
        value: null,
        unit: VITAL_DEFAULT_UNITS[code],
        state: 'no_medido',
        source: 'medido',
        notMeasuredReason: reason,
      };
    }
    const num = Number(raw);
    if (Number.isNaN(num)) {
      return {
        signCode: code,
        value: null,
        unit: VITAL_DEFAULT_UNITS[code],
        state: 'no_medido',
        source: 'medido',
        notMeasuredReason: reason,
      };
    }
    return {
      signCode: code,
      value: num,
      unit: VITAL_DEFAULT_UNITS[code],
      state: 'medido',
      source: 'medido',
      notMeasuredReason: null,
    };
  });
}
