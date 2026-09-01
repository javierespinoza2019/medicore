import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, UserRole } from '@/mocks/users';
import { usuarios } from '@/mocks/users';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => User | null;
  loginAs: (userId: string) => boolean;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  role: UserRole | null;
  sucursalActualId: string | null;
  setSucursalActual: (id: string) => void;
}

const AUTH_STORAGE_KEY = 'medicore_auth_user';
const BRANCH_STORAGE_KEY = 'medicore_auth_branch';

const AuthContext = createContext<AuthContextType | null>(null);

function resolveInitialBranch(storedUser: User | null): string | null {
  if (!storedUser || !storedUser.sucursalIds || storedUser.sucursalIds.length === 0) {
    return null;
  }
  try {
    const saved = localStorage.getItem(BRANCH_STORAGE_KEY);
    if (saved && storedUser.sucursalIds.includes(saved)) {
      return saved;
    }
  } catch {
    // ignore
  }
  return storedUser.sucursalIds[0];
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as User;
        const found = usuarios.find((u) => u.id === parsed.id && u.status === 'activo');
        return found || null;
      }
    } catch {
      // ignore parse errors
    }
    return null;
  });

  const [sucursalActualId, setSucursalActualIdState] = useState<string | null>(() =>
    resolveInitialBranch(user)
  );

  const isAuthenticated = user !== null;
  const role = user?.rol || null;

  const setSucursalActual = useCallback((id: string) => {
    setSucursalActualIdState(id);
    try {
      localStorage.setItem(BRANCH_STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const login = useCallback((email: string, password: string): User | null => {
    const found = usuarios.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.status === 'activo'
    );
    if (found && found.password === password) {
      setUser(found);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(found));
      const branch = resolveInitialBranch(found);
      if (branch) {
        setSucursalActualIdState(branch);
        try {
          localStorage.setItem(BRANCH_STORAGE_KEY, branch);
        } catch {
          // ignore
        }
      }
      return found;
    }
    return null;
  }, []);

  const loginAs = useCallback((userId: string): boolean => {
    const found = usuarios.find((u) => u.id === userId && u.status === 'activo');
    if (found) {
      setUser(found);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(found));
      const branch = resolveInitialBranch(found);
      if (branch) {
        setSucursalActualIdState(branch);
        try {
          localStorage.setItem(BRANCH_STORAGE_KEY, branch);
        } catch {
          // ignore
        }
      }
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setSucursalActualIdState(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(BRANCH_STORAGE_KEY);
  }, []);

  const hasRole = useCallback(
    (roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.rol);
    },
    [user]
  );

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === AUTH_STORAGE_KEY) {
        try {
          const stored = e.newValue ? (JSON.parse(e.newValue) as User) : null;
          const found = stored ? usuarios.find((u) => u.id === stored.id) : null;
          setUser(found || null);
          if (!found) {
            setSucursalActualIdState(null);
          }
        } catch {
          setUser(null);
          setSucursalActualIdState(null);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Sync sucursalActualId when user changes (e.g. loginAs)
  useEffect(() => {
    if (user) {
      const valid = resolveInitialBranch(user);
      if (valid && valid !== sucursalActualId) {
        setSucursalActualIdState(valid);
      }
    } else {
      setSucursalActualIdState(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    login,
    loginAs,
    logout,
    hasRole,
    role,
    sucursalActualId,
    setSucursalActual,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

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
      login: () => null,
      loginAs: () => false,
      logout: () => {},
      hasRole: () => false,
      role: null,
      sucursalActualId: null,
      setSucursalActual: () => {},
    };
  }
  return ctx;
}