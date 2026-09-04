/**
 * Traduce la respuesta de `/api/auth/login` al modelo de sesión que consume la app.
 *
 * Identidad, rol, sucursales y profesional sanitario vienen del servidor. Lo que el
 * backend no envía (teléfono, o profesional ausente) se deja vacío: no se inventa.
 *
 * `doctorId` sólo se rellena con `healthcareProfessional.healthcareProfessionalId`
 * cuando el servidor lo trae. Si no hay profesional, queda `undefined` y los filtros
 * clínicos deben fallar cerrado (lista vacía), no mostrar pacientes ajenos.
 */

import type { LoginResult } from '@/api/client';
import type { User, UserRole } from '@/types/session';
import { roleLabels } from '@/types/session';
import { branchIdsFromCodes } from '@/utils/branchResolution';

const knownRoles: UserRole[] = [
  'admin',
  'medico',
  'recepcion',
  'enfermeria',
  'caja',
  'farmacia',
  'laboratorio',
  'directivo',
  'trabajo_social',
];

/** Etiqueta provisional mientras el catálogo de sucursales carga en la UI. */
function branchLabelFromCode(code: string): string {
  const labels: Record<string, string> = {
    CENTRAL: 'Clínica Central - CDMX',
    NORTE: 'Sucursal Norte - CDMX',
    SUR: 'Sucursal Sur - CDMX',
  };
  return labels[code.toUpperCase()] ?? code;
}

export function resolveRole(roles: string[]): UserRole | null {
  // SuperAdmin del seed base opera con los permisos de administrador.
  if (roles.some((r) => r.toLowerCase() === 'superadmin')) return 'admin';
  return knownRoles.find((known) => roles.includes(known)) ?? null;
}

export function toSessionUser(result: LoginResult): User | null {
  const rol = resolveRole(result.roles);
  if (!rol) return null;

  const branchIds = (result.branchIds ?? []).filter((id) =>
    /^[0-9a-f-]{36}$/i.test(id),
  );
  const branchCodes = (result.branchCodes ?? []).map((c) => c.toUpperCase());
  const sucursalIds =
    branchIds.length > 0 ? branchIds : branchIdsFromCodes(branchCodes);
  const sucursales = branchCodes.map(branchLabelFromCode);

  const profesional = result.healthcareProfessional ?? null;
  // Sólo el id que mandó el servidor. Sin profesional → sin doctorId (fail closed).
  const doctorId = profesional?.healthcareProfessionalId || undefined;
  const cedulaProfesional = profesional?.professionalLicense ?? undefined;
  const especialidad = profesional?.specialty ?? undefined;

  return {
    id: result.userId,
    nombre: result.displayName,
    apellidos: '',
    email: '',
    password: '',
    telefono: '',
    rol,
    rolLabel: roleLabels[rol],
    sucursalIds,
    sucursales,
    doctorId,
    cedulaProfesional,
    especialidad,
    ultimoAcceso: '',
    status: 'activo',
    fechaCreacion: '',
  };
}
