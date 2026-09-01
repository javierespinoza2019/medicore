/**
 * Alcance clínico del médico en sesión.
 *
 * Fail closed: si el rol es médico y la sesión no trae profesional sanitario
 * (`doctorId` ausente), no se listan pacientes ni actos clínicos ajenos.
 * El `doctorId` sólo existe cuando el login/me lo trajo del servidor; el cliente
 * no lo inventa.
 */

import type { User } from '@/mocks/users';

/** `true` cuando el usuario es médico (con o sin profesional ligado). */
export function isMedico(user: User | null | undefined): boolean {
  return user?.rol === 'medico';
}

/**
 * Id del profesional sanitario en sesión, o `null` si no hay.
 * Usar para filtrar listas: si es `null` y el usuario es médico → lista vacía.
 */
export function doctorScopeId(user: User | null | undefined): string | null {
  const id = user?.doctorId?.trim();
  return id ? id : null;
}

/**
 * Aplica el filtro de médico con fail closed.
 * - No médico: no altera la lista.
 * - Médico sin profesional: lista vacía.
 * - Médico con profesional: deja sólo ítems cuyo `doctorId` coincide.
 */
export function filterByDoctorScope<T extends { doctorId?: string }>(
  items: T[],
  user: User | null | undefined,
): T[] {
  if (!isMedico(user)) return items;
  const scope = doctorScopeId(user);
  if (!scope) return [];
  return items.filter((item) => item.doctorId === scope);
}
