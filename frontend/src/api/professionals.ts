/** API de profesionales sanitarios y especialidades (M1). Sin mocks. */

import { apiFetch, type ApiResponse } from '@/api/client';

export type ProfessionalDto = {
  healthcareProfessionalId: string;
  tenantId: string;
  userId: string | null;
  fullName: string;
  professionalLicense: string | null;
  specialtyId: string | null;
  specialtyName: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
};

export type CreateProfessionalRequest = {
  healthcareProfessionalId?: string;
  userId?: string | null;
  fullName: string;
  professionalLicense?: string | null;
  specialtyId?: string | null;
  isActive?: boolean;
};

export type UpdateProfessionalRequest = {
  userId?: string | null;
  clearUserId?: boolean;
  fullName: string;
  professionalLicense?: string | null;
  clearProfessionalLicense?: boolean;
  specialtyId?: string | null;
  clearSpecialtyId?: boolean;
  isActive: boolean;
};

export type SpecialtyDto = {
  specialtyId: string;
  tenantId: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
};

export type UpsertSpecialtyRequest = {
  code: string;
  name: string;
  isActive: boolean;
};

export async function listProfessionals(
  onlyActive = false,
  search?: string,
): Promise<ApiResponse<ProfessionalDto[]>> {
  const params = new URLSearchParams();
  params.set('onlyActive', onlyActive ? 'true' : 'false');
  if (search?.trim()) params.set('search', search.trim());
  return apiFetch<ProfessionalDto[]>(`/api/professionals?${params}`);
}

export async function createProfessional(
  body: CreateProfessionalRequest,
): Promise<ApiResponse<ProfessionalDto>> {
  return apiFetch<ProfessionalDto>('/api/professionals', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateProfessional(
  id: string,
  body: UpdateProfessionalRequest,
): Promise<ApiResponse<ProfessionalDto>> {
  return apiFetch<ProfessionalDto>(`/api/professionals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/** Baja lógica (HTTP DELETE ≠ DELETE SQL). */
export async function softDeleteProfessional(id: string): Promise<ApiResponse<unknown>> {
  return apiFetch<unknown>(`/api/professionals/${id}`, { method: 'DELETE' });
}

export async function listSpecialties(onlyActive = false): Promise<ApiResponse<SpecialtyDto[]>> {
  const q = onlyActive ? '?onlyActive=true' : '?onlyActive=false';
  return apiFetch<SpecialtyDto[]>(`/api/specialties${q}`);
}

export async function upsertSpecialty(
  specialtyId: string,
  body: UpsertSpecialtyRequest,
): Promise<ApiResponse<SpecialtyDto>> {
  return apiFetch<SpecialtyDto>(`/api/specialties/${specialtyId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function softDeleteSpecialty(id: string): Promise<ApiResponse<unknown>> {
  return apiFetch<unknown>(`/api/specialties/${id}`, { method: 'DELETE' });
}
