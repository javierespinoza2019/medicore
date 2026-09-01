/** API de notas clínicas (M6 / WS-H). Sin mocks. Firma local + sello sin afirmar validez jurídica. */

import { apiFetch, type ApiResponse } from '@/api/client';

export type NoteType =
  | 'urgencias_inicial'
  | 'evolucion'
  | 'interconsulta'
  | 'referencia_traslado'
  | 'egreso'
  | 'enfermeria'
  | 'certificado';

export type SealState = 'pendiente' | 'sellado';

export type NoteAddendumDto = {
  addendumId: string;
  noteId: string;
  reasonText: string;
  bodyJson: string | null;
  actorDisplayName: string;
  occurredAtUtc: string;
  recordedAtUtc: string;
};

export type NoteCoAuthorDto = {
  coAuthorId: string;
  professionalId: string;
  professionalLicenseSnapshot: string | null;
  fullNameSnapshot: string;
  addedAtUtc: string;
};

export type ClinicalNoteDto = {
  noteId: string;
  tenantId: string;
  encounterId: string;
  subjectId: string;
  noteType: NoteType | string;
  body: Record<string, unknown>;
  prognosis: string | null;
  authorProfessionalId: string | null;
  authorUserId: string;
  authorDisplayName: string;
  authorLicenseSnapshot: string | null;
  facilitySnapshotJson: string | null;
  contentHash: string | null;
  signedAtUtc: string | null;
  sealedAtUtc: string | null;
  sealState: SealState | string;
  occurredAtUtc: string;
  recordedAtUtc: string;
  addenda: NoteAddendumDto[];
  coAuthors: NoteCoAuthorDto[];
  /** Texto legible; no afirma e.firma SAT ni NOM-004 5.10 (pregunta G). */
  firmaDescripcionLegible: string;
};

export type PendingEvolutionDto = {
  encounterId: string;
  subjectId: string;
  branchId: string;
  turnNumber: number;
  encounterState: string;
  lastEvolUtc: string;
  dueAtUtc: string;
  hoursThreshold: number;
};

export type CreateNotePayload = {
  noteType: NoteType | string;
  body: Record<string, unknown>;
  prognosis?: string | null;
  occurredAtUtc?: string | null;
};

/** Etiqueta de sello para UI. Nunca «válida jurídicamente». */
export function sealStateLabel(sealState: string, signedAtUtc: string | null): string {
  if (!signedAtUtc) return 'Borrador sin firma';
  if (sealState === 'sellado') return 'Firmada · sello aplicado';
  return 'Firmada · sello pendiente';
}

export async function listNotesByEncounter(
  encounterId: string,
): Promise<ApiResponse<ClinicalNoteDto[]>> {
  return apiFetch<ClinicalNoteDto[]>(`/api/encounters/${encounterId}/notes`);
}

export async function createNote(
  encounterId: string,
  payload: CreateNotePayload,
): Promise<ApiResponse<ClinicalNoteDto>> {
  return apiFetch<ClinicalNoteDto>(`/api/encounters/${encounterId}/notes`, {
    method: 'POST',
    body: JSON.stringify({
      noteType: payload.noteType,
      body: payload.body,
      prognosis: payload.prognosis ?? null,
      occurredAtUtc: payload.occurredAtUtc ?? null,
    }),
  });
}

export async function getNote(noteId: string): Promise<ApiResponse<ClinicalNoteDto>> {
  return apiFetch<ClinicalNoteDto>(`/api/notes/${noteId}`);
}

export async function signNote(
  noteId: string,
  contentHash?: string | null,
): Promise<ApiResponse<ClinicalNoteDto>> {
  return apiFetch<ClinicalNoteDto>(`/api/notes/${noteId}/sign`, {
    method: 'POST',
    body: JSON.stringify({ contentHash: contentHash ?? null }),
  });
}

export async function addNoteAddendum(
  noteId: string,
  reasonText: string,
  bodyJson?: string | null,
): Promise<ApiResponse<NoteAddendumDto>> {
  return apiFetch<NoteAddendumDto>(`/api/notes/${noteId}/addenda`, {
    method: 'POST',
    body: JSON.stringify({ reasonText, bodyJson: bodyJson ?? null }),
  });
}

export async function addNoteCoAuthor(
  noteId: string,
  professionalId: string,
): Promise<ApiResponse<ClinicalNoteDto>> {
  return apiFetch<ClinicalNoteDto>(`/api/notes/${noteId}/co-authors`, {
    method: 'POST',
    body: JSON.stringify({ professionalId }),
  });
}

export async function listPendingEvolution(
  branchId: string,
  hoursThreshold = 8,
): Promise<ApiResponse<PendingEvolutionDto[]>> {
  const q = new URLSearchParams({
    branchId,
    hoursThreshold: String(hoursThreshold),
  });
  return apiFetch<PendingEvolutionDto[]>(`/api/notes/pending-evolution?${q}`);
}
