/** API de sucursales y perfil de tenant (M11 / WS-C). Sin mocks. */

import { apiFetch, type ApiResponse } from '@/api/client';

export type BranchDto = {
  branchId: string;
  tenantId: string;
  code: string;
  name: string;
  /** null = pendiente pregunta abierta L (tipo de establecimiento). */
  facilityType: string | null;
  legalName: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressNeighborhood: string | null;
  addressMunicipality: string | null;
  addressState: string | null;
  addressPostalCode: string | null;
  phoneNumber: string | null;
  healthLicense: string | null;
  responsiblePhysicianProfessionalId: string | null;
  timeZoneId: string | null;
  /** null = pendiente pregunta abierta L (servicios activos). */
  hasEmergencyService: boolean | null;
  /** Ruta relativa bajo files/. null = hereda logo del tenant. */
  logoRelativePath: string | null;
  isActive: boolean;
};

export type UpsertBranchRequest = {
  code: string;
  name: string;
  facilityType?: string | null;
  legalName?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressNeighborhood?: string | null;
  addressMunicipality?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  phoneNumber?: string | null;
  healthLicense?: string | null;
  responsiblePhysicianProfessionalId?: string | null;
  timeZoneId?: string | null;
  hasEmergencyService?: boolean | null;
  isActive: boolean;
};

export type TenantProfileDto = {
  tenantId: string;
  code: string;
  name: string;
  legalName: string | null;
  rfc: string | null;
  primaryColorToken: string | null;
  /** Ruta relativa bajo files/. null = sin logo de organización. */
  logoRelativePath: string | null;
  isActive: boolean;
};

export async function listBranches(onlyActive = true): Promise<ApiResponse<BranchDto[]>> {
  const q = onlyActive ? '?onlyActive=true' : '?onlyActive=false';
  return apiFetch<BranchDto[]>(`/api/branches${q}`);
}

export async function getBranch(branchId: string): Promise<ApiResponse<BranchDto>> {
  return apiFetch<BranchDto>(`/api/branches/${branchId}`);
}

export async function upsertBranch(
  branchId: string,
  body: UpsertBranchRequest,
): Promise<ApiResponse<BranchDto>> {
  return apiFetch<BranchDto>(`/api/branches/${branchId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export type UpdateTenantProfileRequest = {
  name?: string | null;
  legalName?: string | null;
  rfc?: string | null;
  primaryColorToken?: string | null;
};

export async function updateTenantProfile(
  body: UpdateTenantProfileRequest,
): Promise<ApiResponse<TenantProfileDto>> {
  return apiFetch<TenantProfileDto>('/api/tenant/profile', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function getTenantProfile(): Promise<ApiResponse<TenantProfileDto>> {
  return apiFetch<TenantProfileDto>('/api/tenant/profile');
}

export async function uploadTenantLogo(file: File): Promise<ApiResponse<TenantProfileDto>> {
  const body = new FormData();
  body.append('file', file);
  return apiFetch<TenantProfileDto>('/api/tenant/logo', { method: 'PUT', body });
}

export async function clearTenantLogo(): Promise<ApiResponse<TenantProfileDto>> {
  return apiFetch<TenantProfileDto>('/api/tenant/logo', { method: 'DELETE' });
}

export async function uploadBranchLogo(
  branchId: string,
  file: File,
): Promise<ApiResponse<BranchDto>> {
  const body = new FormData();
  body.append('file', file);
  return apiFetch<BranchDto>(`/api/branches/${branchId}/logo`, { method: 'PUT', body });
}

export async function clearBranchLogo(branchId: string): Promise<ApiResponse<BranchDto>> {
  return apiFetch<BranchDto>(`/api/branches/${branchId}/logo`, { method: 'DELETE' });
}
