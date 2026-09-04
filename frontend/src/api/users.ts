/** API de usuarios del tenant. Sin mocks. AuthZ: canAdminUsers. */

import { apiFetch, type ApiResponse } from '@/api/client';

export type TenantUserDto = {
  userId: string;
  tenantId: string;
  userName: string;
  displayName: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  roleCodes: string[];
  branchIds: string[];
  healthcareProfessionalId: string | null;
  professionalDisplayName: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
};

export type CreateTenantUserRequest = {
  userId?: string;
  userName: string;
  displayName: string;
  password: string;
  isActive?: boolean;
  roleCodes: string[];
  branchIds: string[];
};

export type UpdateTenantUserRequest = {
  displayName: string;
  isActive: boolean;
  roleCodes: string[];
  branchIds: string[];
};

export function listUsers(onlyActive = false, search?: string): Promise<ApiResponse<TenantUserDto[]>> {
  const q = new URLSearchParams();
  q.set('onlyActive', String(onlyActive));
  if (search?.trim()) q.set('search', search.trim());
  return apiFetch<TenantUserDto[]>(`/api/users?${q.toString()}`);
}

export function getUser(userId: string): Promise<ApiResponse<TenantUserDto>> {
  return apiFetch<TenantUserDto>(`/api/users/${userId}`);
}

export function createUser(body: CreateTenantUserRequest): Promise<ApiResponse<TenantUserDto>> {
  return apiFetch<TenantUserDto>('/api/users', { method: 'POST', body: JSON.stringify(body) });
}

export function updateUser(
  userId: string,
  body: UpdateTenantUserRequest,
): Promise<ApiResponse<TenantUserDto>> {
  return apiFetch<TenantUserDto>(`/api/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function softDeleteUser(userId: string): Promise<ApiResponse<null>> {
  return apiFetch<null>(`/api/users/${userId}`, { method: 'DELETE' });
}

export function setUserPassword(userId: string, newPassword: string): Promise<ApiResponse<null>> {
  return apiFetch<null>(`/api/users/${userId}/password`, {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  });
}
