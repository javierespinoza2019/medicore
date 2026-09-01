/** API de matriz de permisos por tenant (doc 06 §19). Sin mocks. */

import { apiFetch, type ApiResponse } from '@/api/client';

export type PermissionKey =
  | 'canCreatePatient'
  | 'canEditPatient'
  | 'canDeletePatient'
  | 'canCreateConsulta'
  | 'canEditConsulta'
  | 'canCreateReceta'
  | 'canDispensar'
  | 'canCobrar'
  | 'canCerrarCaja'
  | 'canAdminUsers'
  | 'canAdminMedicos'
  | 'canAdminCatalogos'
  | 'canVerAuditoria'
  | 'canEditTriage'
  | 'canAtenderUrgencia'
  | 'canVerEstadisticas'
  | 'canExportar';

export type RoleTemplateDto = {
  roleId: string;
  roleCode: string;
  name: string;
  userCount: number;
};

export type PermissionCatalogItemDto = {
  code: PermissionKey;
  label: string;
  module: string;
};

export type RolePermissionMatrixDto = {
  templates: RoleTemplateDto[];
  catalog: PermissionCatalogItemDto[];
  permissionsByRole: Record<string, Record<PermissionKey, boolean>>;
  rolesWithTenantOverrides: string[];
};

export type SaveRolePermissionsRequest = {
  permissions: Record<PermissionKey, boolean>;
};

export async function getPermissionMatrix(): Promise<ApiResponse<RolePermissionMatrixDto>> {
  return apiFetch<RolePermissionMatrixDto>('/api/roles/permission-matrix');
}

export async function saveRolePermissions(
  roleCode: string,
  body: SaveRolePermissionsRequest,
): Promise<ApiResponse<RolePermissionMatrixDto>> {
  return apiFetch<RolePermissionMatrixDto>(`/api/roles/${encodeURIComponent(roleCode)}/permissions`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
