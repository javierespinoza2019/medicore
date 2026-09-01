/** Auth extendido: break-glass, cambio de contraseña. */

import { apiFetch, type ApiResponse } from '@/api/client';
import type { LoginResult } from '@/api/client';
import type { PermissionKey } from '@/utils/permissions';

export type BreakGlassGrant = {
  grantId: string;
  permissionKey: PermissionKey;
  expiresAtUtc: string;
};

export type SessionSnapshot = LoginResult;

export async function fetchSessionSnapshot(): Promise<ApiResponse<SessionSnapshot>> {
  return apiFetch<SessionSnapshot>('/api/auth/me');
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ApiResponse<null>> {
  return apiFetch<null>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function startBreakGlass(
  justification: string,
  permissionKeys: PermissionKey[],
): Promise<ApiResponse<SessionSnapshot>> {
  return apiFetch<SessionSnapshot>('/api/auth/break-glass', {
    method: 'POST',
    body: JSON.stringify({ justification, permissionKeys }),
  });
}

/** Roles que pueden solicitar break-glass (alineado con backend). */
export const breakGlassEligibleRoles = new Set([
  'medico',
  'enfermeria',
  'recepcion',
  'farmacia',
  'caja',
  'laboratorio',
  'trabajo_social',
]);

/** Permisos concedibles por break-glass (excluye admin/auditoría). */
export const breakGlassGrantablePermissions: { key: PermissionKey; label: string }[] = [
  { key: 'canCreatePatient', label: 'Crear pacientes' },
  { key: 'canEditPatient', label: 'Editar pacientes' },
  { key: 'canCreateConsulta', label: 'Crear consultas' },
  { key: 'canEditConsulta', label: 'Editar consultas' },
  { key: 'canCreateReceta', label: 'Crear recetas' },
  { key: 'canDispensar', label: 'Dispensar' },
  { key: 'canCobrar', label: 'Cobrar' },
  { key: 'canEditTriage', label: 'Registrar triage' },
  { key: 'canAtenderUrgencia', label: 'Atender urgencias' },
  { key: 'canExportar', label: 'Exportar' },
];
