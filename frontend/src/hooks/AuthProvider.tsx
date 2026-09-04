import { useState, useCallback, useEffect } from 'react';
import type { User, UserRole } from '@/types/session';
import { login as apiLogin, logout as apiLogout, restoreSession } from '@/api/client';
import type { LoginResult } from '@/api/client';
import { toSessionUser } from '@/auth/session';
import { tenantCode } from '@/config/environment';
import { AuthContext, type AuthContextType, type LoginOutcome } from '@/hooks/authContext';
import type { ApiFailure } from '@/api/errors';
import { startOutboxDrain, tryDrainOutbox } from '@/sync/outboxDrain';
import { normalizeSessionPermissions, type PermissionKey } from '@/utils/permissions';
import { breakGlassEligibleRoles, type BreakGlassGrant } from '@/api/auth';
import { resolveStoredBranchId } from '@/utils/branchResolution';

const BRANCH_STORAGE_KEY = 'medicore_auth_branch';

function resolveInitialBranch(sessionUser: User | null): string | null {
  if (!sessionUser || sessionUser.sucursalIds.length === 0) return null;
  try {
    const saved = localStorage.getItem(BRANCH_STORAGE_KEY);
    if (saved) {
      const resolved = resolveStoredBranchId(saved, sessionUser.sucursalIds);
      if (resolved) return resolved;
    }
  } catch {
    // almacenamiento no disponible
  }
  return sessionUser.sucursalIds[0];
}

function mapBreakGlassGrants(
  grants: LoginResult['breakGlassGrants'],
): BreakGlassGrant[] {
  return (grants ?? []).map((g) => ({
    grantId: g.grantId,
    permissionKey: g.permissionKey as PermissionKey,
    expiresAtUtc: g.expiresAtUtc,
  }));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionFailure, setSessionFailure] = useState<ApiFailure | null>(null);
  const [sucursalActualId, setSucursalActualIdState] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<PermissionKey, boolean> | null>(null);
  const [breakGlassGrants, setBreakGlassGrants] = useState<BreakGlassGrant[]>([]);

  const isAuthenticated = user !== null;
  const role = user?.rol ?? null;
  const canRequestBreakGlass = role !== null && breakGlassEligibleRoles.has(role);

  const applySession = useCallback((sessionUser: User | null) => {
    setUser(sessionUser);
    const branch = resolveInitialBranch(sessionUser);
    setSucursalActualIdState(branch);
    if (branch) {
      try {
        localStorage.setItem(BRANCH_STORAGE_KEY, branch);
      } catch {
        // almacenamiento no disponible
      }
    }
    if (!sessionUser) {
      setPermissions(null);
      setBreakGlassGrants([]);
    }
  }, []);

  const applyLoginResult = useCallback(
    (result: LoginResult) => {
      const sessionUser = toSessionUser(result);
      applySession(sessionUser);
      setPermissions(normalizeSessionPermissions(result.permissions));
      setBreakGlassGrants(mapBreakGlassGrants(result.breakGlassGrants));
    },
    [applySession],
  );

  const applySessionPermissions = useCallback(
    (raw: Partial<Record<string, boolean>> | undefined, grants?: BreakGlassGrant[]) => {
      setPermissions(normalizeSessionPermissions(raw));
      if (grants) setBreakGlassGrants(grants);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { user: restored, failure } = await restoreSession();
        if (!cancelled) {
          if (restored) applyLoginResult(restored);
          else applySession(null);
          setSessionFailure(failure ?? null);
        }
      } catch {
        if (!cancelled) applySession(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyLoginResult, applySession]);

  useEffect(() => {
    if (!user) return;
    return startOutboxDrain();
  }, [user]);

  const setSucursalActual = useCallback((id: string) => {
    setSucursalActualIdState(id);
    try {
      localStorage.setItem(BRANCH_STORAGE_KEY, id);
    } catch {
      // almacenamiento no disponible
    }
  }, []);

  const login = useCallback(
    async (userName: string, password: string): Promise<LoginOutcome> => {
      const response = await apiLogin(tenantCode, userName, password);
      if (!response.success || !response.data) {
        return {
          ok: false,
          failure: response.failure ?? { kind: 'error_servidor' },
        };
      }

      applyLoginResult(response.data);
      setSessionFailure(null);
      void tryDrainOutbox();
      const sessionUser = toSessionUser(response.data);
      return { ok: true, user: sessionUser! };
    },
    [applyLoginResult],
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      applySession(null);
      try {
        localStorage.removeItem(BRANCH_STORAGE_KEY);
      } catch {
        // almacenamiento no disponible
      }
    }
  }, [applySession]);

  const hasRole = useCallback(
    (roles: UserRole[]) => (user ? roles.includes(user.rol) : false),
    [user],
  );

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    sessionFailure,
    login,
    logout,
    hasRole,
    role,
    sucursalActualId,
    setSucursalActual,
    permissions,
    breakGlassGrants,
    canRequestBreakGlass,
    applySessionPermissions,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
