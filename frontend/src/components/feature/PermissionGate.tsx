import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { canAccessRoute, getPermissions, type PermissionKey } from '@/utils/permissions';

export type { PermissionKey };

export interface PermissionGateProps {
  children: ReactNode;
  /**
   * Ruta de menú/pantalla. Si el rol no la tiene en `roleRoutes`, no se renderiza.
   */
  route?: string;
  /**
   * Permiso de feature (`canAdminUsers`, `canCreateReceta`, …).
   * Independiente de la ruta: útil para botones dentro de una pantalla ya accesible.
   */
  permission?: PermissionKey;
  /** Contenido alterno cuando no hay permiso (por omisión: nada). */
  fallback?: ReactNode;
}

/**
 * Gate de UI por rol. Fail closed: sin `route` ni `permission`, no renderiza hijos.
 * La API sigue siendo fuente de verdad de AuthZ; esto solo oculta controles.
 */
export function PermissionGate({
  children,
  route,
  permission,
  fallback = null,
}: PermissionGateProps) {
  const { role, permissions } = useAuth();

  if (!route && !permission) {
    return <>{fallback}</>;
  }

  if (route && !canAccessRoute(role, route, permissions)) {
    return <>{fallback}</>;
  }

  if (permission && !getPermissions(role, permissions)[permission]) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default PermissionGate;
