/** API de expediente / historia clínica (M7 / WS-G). Sin mocks. */

import { apiFetch, type ApiResponse } from '@/api/client';
import type { EstadoInterrogatorio } from '@/types/clinical';
import { interrogatorioNoInterrogado } from '@/types/clinical';

export type AllergyStatusCode =
  | 'no_interrogado'
  | 'niega'
  | 'refiere'
  | 'se_desconoce'
  | 'paciente_no_puede_responder';

export type InterrogatorioCampoJson = EstadoInterrogatorio<unknown>;

export type MedicalHistoryBody = {
  heredoFamiliares: InterrogatorioCampoJson;
  personalesPatologicos: InterrogatorioCampoJson;
  personalesNoPatologicos: InterrogatorioCampoJson;
  ginecoObstetricos: InterrogatorioCampoJson;
  aparatosYSistemas: InterrogatorioCampoJson;
  habitusExterior: InterrogatorioCampoJson;
  padecimientoActual: InterrogatorioCampoJson;
  observaciones: string | null;
};

export type AmendmentDto = {
  amendmentId: string;
  historyId: string;
  reasonText: string;
  bodyJson: string | null;
  actorDisplayName: string;
  occurredAtUtc: string;
  recordedAtUtc: string;
};

export type MedicalHistoryDto = {
  historyId: string;
  recordId: string;
  subjectId: string;
  version: number;
  body: MedicalHistoryBody;
  origin: 'capturado' | 'prellenado_por_sistema' | string;
  actorDisplayName: string;
  occurredAtUtc: string;
  recordedAtUtc: string;
  amendments: AmendmentDto[];
};

export type AllergyStatusDto = {
  statusEventId: string | null;
  status: AllergyStatusCode | string;
  actorDisplayName: string | null;
  occurredAtUtc: string | null;
};

export type AllergyDto = {
  allergyId: string;
  substance: string;
  reactionType: string;
  category: string | null;
  manifestation: string | null;
  severity: string | null;
  certainty: string | null;
  dataOrigin: string | null;
  actorDisplayName: string;
  occurredAtUtc: string;
};

export type SubjectFlagDto = {
  flagId: string;
  flagType: string;
  payloadJson: string | null;
  isActive: boolean;
  actorDisplayName: string;
  occurredAtUtc: string;
};

export type ClinicalRecordDto = {
  recordId: string;
  subjectId: string;
  openedAtUtc: string;
  /** Nullable: pregunta H — qué actos cuentan está pendiente. */
  lastMedicalActAtUtc: string | null;
  lastMedicalActType: string | null;
  currentHistory: MedicalHistoryDto | null;
  allergyStatus: AllergyStatusDto;
  allergies: AllergyDto[];
  flags: SubjectFlagDto[];
};

/** Fábrica segura: todo no_interrogado. Prohibido negado/normal. */
export function createEmptyMedicalHistoryBody(): MedicalHistoryBody {
  return {
    heredoFamiliares: interrogatorioNoInterrogado(),
    personalesPatologicos: interrogatorioNoInterrogado(),
    personalesNoPatologicos: interrogatorioNoInterrogado(),
    ginecoObstetricos: interrogatorioNoInterrogado(),
    aparatosYSistemas: interrogatorioNoInterrogado(),
    habitusExterior: interrogatorioNoInterrogado(),
    padecimientoActual: interrogatorioNoInterrogado(),
    observaciones: null,
  };
}

/** Etiqueta UI: nunca «sin alergias» si estado es no_interrogado (BM-PAC-01). */
export function allergyStatusLabel(status: string, allergyCount: number): string {
  switch (status) {
    case 'no_interrogado':
      return 'Alergias no interrogadas';
    case 'paciente_no_puede_responder':
      return 'Paciente no puede responder sobre alergias';
    case 'se_desconoce':
      return 'Se desconoce estado alérgico';
    case 'niega':
      return 'Niega alergias conocidas';
    case 'refiere':
      return allergyCount > 0
        ? `Refiere alergias (${allergyCount})`
        : 'Refiere alergias (detalle pendiente)';
    default:
      return 'Estado alérgico no disponible';
  }
}

export function allergyStatusIsWarning(status: string): boolean {
  return (
    status === 'no_interrogado' ||
    status === 'se_desconoce' ||
    status === 'paciente_no_puede_responder' ||
    status === 'refiere'
  );
}

export async function getClinicalRecord(
  subjectId: string,
): Promise<ApiResponse<ClinicalRecordDto>> {
  return apiFetch<ClinicalRecordDto>(`/api/subjects/${subjectId}/record`);
}

export async function saveMedicalHistory(
  subjectId: string,
  body: MedicalHistoryBody,
  origin: 'capturado' | 'prellenado_por_sistema' = 'capturado',
): Promise<ApiResponse<MedicalHistoryDto>> {
  return apiFetch<MedicalHistoryDto>(`/api/subjects/${subjectId}/history`, {
    method: 'POST',
    body: JSON.stringify({ body, origin }),
  });
}

export async function addHistoryAmendment(
  subjectId: string,
  reasonText: string,
  historyId?: string,
  bodyJson?: string,
): Promise<ApiResponse<AmendmentDto>> {
  return apiFetch<AmendmentDto>(`/api/subjects/${subjectId}/history/amendments`, {
    method: 'POST',
    body: JSON.stringify({ historyId, reasonText, bodyJson }),
  });
}

export async function setAllergyStatus(
  subjectId: string,
  status: AllergyStatusCode,
): Promise<ApiResponse<AllergyStatusDto>> {
  return apiFetch<AllergyStatusDto>(`/api/subjects/${subjectId}/allergy-status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function addAllergy(
  subjectId: string,
  payload: {
    substance: string;
    reactionType?: string;
    category?: string;
    manifestation?: string;
    severity?: string;
    certainty?: string;
    dataOrigin?: string;
  },
): Promise<ApiResponse<AllergyDto>> {
  return apiFetch<AllergyDto>(`/api/subjects/${subjectId}/allergies`, {
    method: 'POST',
    body: JSON.stringify({
      substance: payload.substance,
      reactionType: payload.reactionType ?? 'alergia',
      category: payload.category ?? null,
      manifestation: payload.manifestation ?? null,
      severity: payload.severity ?? null,
      certainty: payload.certainty ?? null,
      dataOrigin: payload.dataOrigin ?? null,
    }),
  });
}

export async function softDeleteAllergy(
  subjectId: string,
  allergyId: string,
): Promise<ApiResponse<{ softDeleted: boolean }>> {
  return apiFetch<{ softDeleted: boolean }>(
    `/api/subjects/${subjectId}/allergies/${allergyId}`,
    { method: 'DELETE' },
  );
}
