/** API de usuarios del tenant. Sin mocks. AuthZ: canAdminUsers. */

import { apiFetch, type ApiResponse } from '@/api/client';

export type TenantUserStatus = 'activo' | 'inactivo' | 'bloqueado';

export type TenantUserDto = {
  userId: string;
  tenantId: string;
  userName: string;
  displayName: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  isLockedOut: boolean;
  status: TenantUserStatus;
  roleCodes: string[];
  branchIds: string[];
  healthcareProfessionalId: string | null;
  professionalDisplayName: string | null;
  professionalLicense: string | null;
  specialtyName: string | null;
  lastAccessUtc: string | null;
  lockoutUntilUtc: string | null;
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
  /** Preferido sobre isActive cuando se envía. */
  status?: TenantUserStatus;
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

export function userInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export function formatLastAccess(utc: string | null | undefined): string {
  if (!utc) return '—';
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
