import { createContext } from 'react';
import type { User, UserRole } from '@/mocks/users';
import type { ApiFailure } from '@/api/errors';
import type { PermissionKey } from '@/utils/permissions';
import type { BreakGlassGrant } from '@/api/auth';

/**
 * Resultado del inicio de sesión. La pantalla no infiere el motivo del fallo:
 * lo recibe clasificado para no confundir credenciales con falta de enlace.
 */
export type LoginOutcome = {
  ok: boolean;
  user?: User;
  failure?: ApiFailure;
};

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  /** Resuelve la sesión inicial contra el servidor (cookie de refresh). */
  isLoading: boolean;
  /**
   * Falla al preguntar por la sesión al arrancar. Si es de enlace, el usuario no está
   * "no autenticado": no se pudo preguntar.
   */
  sessionFailure: ApiFailure | null;
  login: (userName: string, password: string) => Promise<LoginOutcome>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
  role: UserRole | null;
  sucursalActualId: string | null;
  setSucursalActual: (id: string) => void;
  /** Permisos efectivos del servidor (tenant + break-glass). */
  permissions: Record<PermissionKey, boolean> | null;
  breakGlassGrants: BreakGlassGrant[];
  canRequestBreakGlass: boolean;
  applySessionPermissions: (permissions: Partial<Record<string, boolean>> | undefined, grants?: BreakGlassGrant[]) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);
