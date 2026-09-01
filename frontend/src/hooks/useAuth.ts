import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '@/hooks/authContext';

export type { AuthContextType };

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export function useAuthSafe(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      sessionFailure: null,
      login: async () => ({ ok: false, failure: { kind: 'error_servidor' } }),
      logout: async () => {},
      hasRole: () => false,
      role: null,
      sucursalActualId: null,
      setSucursalActual: () => {},
      permissions: null,
      breakGlassGrants: [],
      canRequestBreakGlass: false,
      applySessionPermissions: () => {},
    };
  }
  return ctx;
}
