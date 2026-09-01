/** API de sujetos / identidad progresiva (M3 / WS-D). Sin mocks. */

import { apiFetch, type ApiResponse } from '@/api/client';
import type { EdadEstimada } from '@/types/clinical';

export type IdentificationState =
  | 'no_identificado'
  | 'declarada_sin_documento'
  | 'verificada_con_documento'
  | 'rectificada'
  | 'no_recuperable';

export type BiologicalSex =
  | 'masculino'
  | 'femenino'
  | 'no_determinado'
  | 'no_especificado';

/** Códigos GIIS-B015-02-09 `genero`. Vacío/null = no capturado (no fabricar). No usar en dosis. */
export type GenderIdentity = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '88';

export type SubjectTemporaryLabelDto = {
  labelId: string;
  subjectId: string;
  branchId: string;
  internalCode: string;
  operationalLabel: string;
  configSnapshotJson: string | null;
  issuedAtUtc: string;
  isActive: boolean;
};

export type SubjectDescriptorDto = {
  descriptorId: string;
  subjectId: string;
  apparentSex: string | null;
  apparentAgeRange: string | null;
  arrivalAtUtc: string | null;
  freeText: string | null;
};

export type SubjectDistinctiveMarkDto = {
  markId: string;
  subjectId: string;
  rawText: string | null;
  markType: string | null;
  anatomicalRegion: string | null;
  laterality: string | null;
  description: string | null;
  occurredAtUtc: string;
};

export type SubjectBelongingDto = {
  belongingId: string;
  subjectId: string;
  description: string;
  category: string | null;
};

export type SubjectDto = {
  subjectId: string;
  tenantId: string;
  originBranchId: string;
  recordNumber: string | null;
  identificationState: IdentificationState | string;
  givenName: string | null;
  firstSurname: string | null;
  secondSurname: string | null;
  preferredName: string | null;
  birthDate: string | null;
  estimatedAge: EdadEstimada | null;
  biologicalSex: BiologicalSex | string | null;
  sexSource: string | null;
  /** Identidad de género / trato; opcional, nunca inventada. */
  genderIdentity: string | null;
  curp: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  /** Id solicitado en la ruta; puede diferir si hay vínculo vigente. */
  requestedSubjectId?: string | null;
  /** Identidad activa tras resolver vínculos (SC-18/22). */
  resolvedSubjectId?: string | null;
  activeLabel: SubjectTemporaryLabelDto | null;
  descriptor: SubjectDescriptorDto | null;
  marks: SubjectDistinctiveMarkDto[];
  belongings: SubjectBelongingDto[];
};

export type SubjectListItemDto = {
  subjectId: string;
  originBranchId: string;
  recordNumber: string | null;
  identificationState: string;
  givenName: string | null;
  firstSurname: string | null;
  secondSurname: string | null;
  preferredName: string | null;
  birthDate: string | null;
  biologicalSex: string | null;
  genderIdentity: string | null;
  curp: string | null;
  operationalLabel: string | null;
  internalCode: string | null;
  apparentSex: string | null;
  apparentAgeRange: string | null;
  arrivalAtUtc: string | null;
  descriptorFreeText: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type CreateSubjectRequest = {
  branchId: string;
  givenName?: string | null;
  firstSurname?: string | null;
  secondSurname?: string | null;
  preferredName?: string | null;
  birthDate?: string | null;
  estimatedAge?: EdadEstimada | null;
  biologicalSex?: BiologicalSex | string | null;
  sexSource?: string | null;
  genderIdentity?: string | null;
  curp?: string | null;
  apparentSex?: string | null;
  apparentAgeRange?: string | null;
  arrivalAtUtc?: string | null;
  descriptorFreeText?: string | null;
  markRawText?: string | null;
  asUnidentified?: boolean | null;
};

export type DescriptionSearchResultDto = {
  matchCount: number;
  matches: Array<{
    subjectId: string;
    operationalLabel: string | null;
    arrivalAtUtc: string | null;
  }>;
};

/** Nombre visible: SubjectDto (etiqueta en activeLabel) o SubjectListItemDto (operationalLabel plano). */
export function displayNameOf(s: {
  givenName?: string | null;
  firstSurname?: string | null;
  secondSurname?: string | null;
  preferredName?: string | null;
  operationalLabel?: string | null;
  activeLabel?: { operationalLabel?: string | null } | null;
}): string {
  if (s.preferredName?.trim()) return s.preferredName.trim();
  const parts = [s.givenName, s.firstSurname, s.secondSurname].filter(Boolean);
  if (parts.length) return parts.join(' ');
  const label = s.operationalLabel ?? s.activeLabel?.operationalLabel;
  if (label) return label;
  return 'Sin nombre';
}

export async function searchSubjects(
  search?: string,
  includeUnidentified = true,
): Promise<ApiResponse<SubjectListItemDto[]>> {
  const q = new URLSearchParams();
  if (search?.trim()) q.set('search', search.trim());
  q.set('includeUnidentified', includeUnidentified ? 'true' : 'false');
  return apiFetch<SubjectListItemDto[]>(`/api/subjects?${q}`);
}

export async function getSubject(id: string): Promise<ApiResponse<SubjectDto>> {
  return apiFetch<SubjectDto>(`/api/subjects/${encodeURIComponent(id)}`);
}

export async function createSubject(
  body: CreateSubjectRequest,
): Promise<ApiResponse<SubjectDto>> {
  return apiFetch<SubjectDto>('/api/subjects', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateIdentity(
  id: string,
  body: Record<string, unknown>,
): Promise<ApiResponse<SubjectDto>> {
  return apiFetch<SubjectDto>(`/api/subjects/${encodeURIComponent(id)}/identity`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function searchByDescription(
  body: Record<string, unknown>,
): Promise<ApiResponse<DescriptionSearchResultDto>> {
  return apiFetch<DescriptionSearchResultDto>('/api/subjects/search-by-description', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type SubjectLinkDto = {
  linkId: string;
  absorbedSubjectId: string;
  survivingSubjectId: string;
  linkType: string;
  justification: string;
  actorUserId?: string | null;
  occurredAtUtc: string;
  revertsLinkId?: string | null;
};

export async function linkSubjects(
  survivingId: string,
  body: {
    absorbedSubjectId: string;
    survivingSubjectId?: string;
    justification: string;
  },
): Promise<ApiResponse<SubjectLinkDto>> {
  return apiFetch<SubjectLinkDto>(`/api/subjects/${encodeURIComponent(survivingId)}/links`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function revertSubjectLink(
  subjectId: string,
  linkId: string,
  body: { justification: string },
): Promise<ApiResponse<SubjectLinkDto>> {
  return apiFetch<SubjectLinkDto>(
    `/api/subjects/${encodeURIComponent(subjectId)}/links/${encodeURIComponent(linkId)}/revert`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}
