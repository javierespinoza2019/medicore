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
import type { User, UserRole } from '@/mocks/users';
import { roleLabels } from '@/mocks/users';

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

/**
 * Puente transitorio entre el código de sucursal del servidor y el id que aún usan
 * los catálogos del prototipo. Desaparece cuando los módulos lean sucursales del API.
 */
const branchByCode: Record<string, { id: string; nombre: string }> = {
  CENTRAL: { id: 'suc1', nombre: 'Clínica Central - CDMX' },
  NORTE: { id: 'suc2', nombre: 'Sucursal Norte - CDMX' },
  SUR: { id: 'suc3', nombre: 'Sucursal Sur - CDMX' },
};

export function resolveRole(roles: string[]): UserRole | null {
  // SuperAdmin del seed base opera con los permisos de administrador.
  if (roles.some((r) => r.toLowerCase() === 'superadmin')) return 'admin';
  return knownRoles.find((known) => roles.includes(known)) ?? null;
}

export function toSessionUser(result: LoginResult): User | null {
  const rol = resolveRole(result.roles);
  if (!rol) return null;

  const branches = result.branchCodes
    .map((code) => branchByCode[code.toUpperCase()])
    .filter((b): b is { id: string; nombre: string } => Boolean(b));

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
    sucursalIds: branches.map((b) => b.id),
    sucursales: branches.map((b) => b.nombre),
    doctorId,
    cedulaProfesional,
    especialidad,
    ultimoAcceso: '',
    status: 'activo',
    fechaCreacion: '',
  };
}
