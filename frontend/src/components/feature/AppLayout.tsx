import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { navigationItems } from '@/mocks/navigation';
import { sucursales } from '@/mocks/branches';
import type { NavItem } from '@/mocks/navigation';
import type { UserRole } from '@/mocks/users';
import Avatar from '@/components/base/Avatar';
import Dropdown, { DropdownItem, DropdownDivider } from '@/components/base/Dropdown';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { canAccessRoute, type PermissionKey } from '@/utils/permissions';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';
import { IndicadorDeEnlace } from '@/components/feature/EstadoEnlace';
import { PermissionGate } from '@/components/feature/PermissionGate';
import BreakGlassModal from '@/components/feature/BreakGlassModal';
import ChangePasswordModal from '@/components/feature/ChangePasswordModal';

interface AppLayoutProps {
  children: React.ReactNode;
}

interface FlyoutPosition {
  top: number;
  left: number;
}

function filterNavByRole(
  items: NavItem[],
  role: UserRole | null,
  sessionPermissions?: Record<PermissionKey, boolean> | null,
): NavItem[] {
  if (!role) return [];
  return items
    .map((item) => {
      if (item.children && item.children.length > 0) {
        const filteredChildren = item.children.filter((child) =>
          canAccessRoute(role, child.path, sessionPermissions)
        );
        if (filteredChildren.length === 0) return null;
        return { ...item, children: filteredChildren };
      }
      if (item.path && canAccessRoute(role, item.path, sessionPermissions)) {
        return item;
      }
      return null;
    })
    .filter(Boolean) as NavItem[];
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['operacion', 'pacientes']));
  const [flyoutGroup, setFlyoutGroup] = useState<string | null>(null);
  const [flyoutPos, setFlyoutPos] = useState<FlyoutPosition>({ top: 0, left: 0 });
  const groupButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const flyoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, isLoading, logout, sucursalActualId, setSucursalActual, canRequestBreakGlass, permissions } = useAuth();
  const [breakGlassOpen, setBreakGlassOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const role = user?.rol || null;
  const userName = user
    ? `${user.nombre} ${user.apellidos}`.trim()
    : isLoading
      ? ''
      : 'Invitado';
  const userEmail = user?.email || '';
  const userRoleLabel = user?.rolLabel || '';
  const especialidadLabel = user?.especialidad || '';

  // Sucursales asignadas al usuario actual
  const userBranches = sucursales.filter((s) => user?.sucursalIds?.includes(s.id));
  const currentBranchName = sucursales.find((s) => s.id === sucursalActualId)?.nombre || 'Sin sucursal';
  const canSwitchBranch = userBranches.length > 1;

  const visibleNavItems = filterNavByRole(navigationItems, role, permissions);

  // Redirect to login if not authenticated.
  // Mientras el servidor resuelve la sesión no se decide nada: el usuario aún no es "no autenticado".
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [isLoading, user, navigate]);

  // Deep-link: si el rol no tiene la ruta, ir al dashboard (PermissionGate solo oculta el menú).
  useEffect(() => {
    if (isLoading || !user || !role) return;
    const path = location.pathname;
    if (path === '/app' || path === '/app/dashboard') return;
    if (!canAccessRoute(role, path, permissions)) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [isLoading, user, role, permissions, location.pathname, navigate]);

  // Redirect if current route not allowed
  useEffect(() => {
    if (role && !canAccessRoute(role, location.pathname, permissions)) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [role, permissions, location.pathname, navigate]);

  // Close flyout on route change
  useEffect(() => {
    setFlyoutGroup(null);
  }, [location.pathname]);

  const clearFlyoutTimeout = () => {
    if (flyoutTimeoutRef.current) {
      clearTimeout(flyoutTimeoutRef.current);
      flyoutTimeoutRef.current = null;
    }
  };

  const openFlyout = useCallback((key: string) => {
    clearFlyoutTimeout();
    const btn = groupButtonRefs.current[key];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setFlyoutPos({
        top: rect.top,
        left: rect.right + 8,
      });
    }
    setFlyoutGroup(key);
  }, []);

  const closeFlyout = (delay = 150) => {
    clearFlyoutTimeout();
    flyoutTimeoutRef.current = setTimeout(() => {
      setFlyoutGroup(null);
    }, delay);
  };

  useEffect(() => {
    return () => {
      clearFlyoutTimeout();
    };
  }, []);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isActive = (path: string) => location.pathname === path;
  const isGroupActive = (item: NavItem) => {
    if (item.children) {
      return item.children.some((child) => location.pathname.startsWith(child.path));
    }
    return false;
  };

  const getPageInfo = (): { title: string; subtitle: string } => {
    const leaves: NavItem[] = [];
    visibleNavItems.forEach((item) => {
      if (item.path) leaves.push(item);
      if (item.children) leaves.push(...item.children);
    });
    let match = leaves.find((l) => l.path && location.pathname === l.path);
    if (!match) {
      const candidates = leaves.filter(
        (l) => l.path && l.path !== '/app' && location.pathname.startsWith(l.path)
      );
      match = candidates.sort((a, b) => b.path.length - a.path.length)[0];
    }
    if (match) return { title: match.label, subtitle: match.subtitle || '' };
    return { title: 'Dashboard', subtitle: 'Resumen general y métricas del día' };
  };

  const pageInfo = getPageInfo();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRevokeAllSessions = async () => {
    const { revokeAllSessions } = await import('@/api/client');
    await revokeAllSessions();
    navigate('/login');
  };

  const handleNavClick = (item: NavItem) => {
    if (item.children && item.children.length > 0) {
      if (!collapsed) {
        toggleGroup(item.key);
      }
      return;
    }
    if (item.path) {
      navigate(item.path);
      setMobileOpen(false);
      setFlyoutGroup(null);
    }
  };

  const flyoutItem = flyoutGroup
    ? visibleNavItems.find((i) => i.key === flyoutGroup)
    : null;

  return (
    <div className="h-screen flex overflow-hidden bg-background-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-background-50 border-r border-secondary-200 flex flex-col transition-all duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-secondary-100 flex-shrink-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <InstitucionalLogo
            fallbackClassName="w-9 h-9 rounded-lg bg-primary-500 text-white flex items-center justify-center flex-shrink-0"
            iconClassName="text-lg"
            imgClassName="w-9 h-9 object-contain flex-shrink-0"
          />
          {!collapsed && (
            <span className="text-lg font-bold text-foreground-900 font-heading whitespace-nowrap">MediCore</span>
          )}
        </div>

        {/* Navigation — filtrada por rol (PermissionGate + canAccessRoute) */}
        <nav
          className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1"
          data-testid="nav-sidebar"
          aria-label="Menú principal"
        >
          {visibleNavItems.map((item) => {
            if (item.children && item.children.length > 0) {
              const isExpanded = expandedGroups.has(item.key);
              const isActiveGroup = isGroupActive(item);
              const flyoutOpen = collapsed && flyoutGroup === item.key;

              return (
                <div
                  key={item.key}
                  className="relative"
                  data-testid={`nav-group-${item.key}`}
                  onMouseEnter={() => {
                    if (collapsed) openFlyout(item.key);
                  }}
                  onMouseLeave={() => {
                    if (collapsed) closeFlyout();
                  }}
                >
                  <button
                    ref={(el) => { groupButtonRefs.current[item.key] = el; }}
                    onClick={() => handleNavClick(item)}
                    data-testid={`nav-group-btn-${item.key}`}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-base cursor-pointer group ${
                      isActiveGroup
                        ? 'text-primary-700 bg-primary-50'
                        : 'text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100'
                    } ${flyoutOpen ? 'bg-secondary-100' : ''}`}
                  >
                    <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      <i className={`${item.icon} text-base`}></i>
                    </span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
                        <span className={`w-4 h-4 flex items-center justify-center transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          <i className="ri-arrow-down-s-line text-sm"></i>
                        </span>
                      </>
                    )}
                  </button>

                  {!collapsed && isExpanded && (
                    <div className="ml-4 mt-1 mb-1 border-l-2 border-secondary-200 pl-3 space-y-0.5">
                      {item.children.map((child) => (
                        <PermissionGate key={child.key} route={child.path}>
                          <button
                            onClick={() => {
                              navigate(child.path);
                              setMobileOpen(false);
                            }}
                            data-testid={`nav-item-${child.key}`}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-base cursor-pointer ${
                              isActive(child.path)
                                ? 'text-primary-700 bg-primary-50'
                                : 'text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100'
                            }`}
                          >
                            <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                              <i className={`${child.icon} text-sm`}></i>
                            </span>
                            <span className="flex-1 text-left whitespace-nowrap">{child.label}</span>
                            {child.badge && (
                              <span className="px-1.5 py-0.5 text-2xs font-bold rounded-full bg-red-500 text-white">
                                {child.badge}
                              </span>
                            )}
                          </button>
                        </PermissionGate>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <PermissionGate key={item.key} route={item.path}>
                <div
                  className="relative group/item"
                  data-testid={`nav-item-wrap-${item.key}`}
                  onMouseEnter={() => {
                    if (collapsed) openFlyout(item.key);
                  }}
                  onMouseLeave={() => {
                    if (collapsed) closeFlyout();
                  }}
                >
                  <button
                    ref={(el) => { groupButtonRefs.current[item.key] = el; }}
                    onClick={() => handleNavClick(item)}
                    data-testid={`nav-item-${item.key}`}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-base cursor-pointer group ${
                      isActive(item.path)
                        ? 'text-primary-700 bg-primary-50'
                        : 'text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100'
                    }`}
                  >
                    <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 relative">
                      <i className={`${item.icon} text-base`}></i>
                      {item.badge && collapsed && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-2xs font-bold">
                          {item.badge}
                        </span>
                      )}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 text-2xs font-bold rounded-full bg-red-500 text-white">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                </div>
              </PermissionGate>
            );
          })}
        </nav>

        {/* Collapse button */}
        <div className="px-3 py-3 border-t border-secondary-100">
          <button
            onClick={() => { setCollapsed(!collapsed); setFlyoutGroup(null); }}
            data-testid="nav-toggle-collapse"
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-foreground-500 hover:text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer"
          >
            <span className="w-4 h-4 flex items-center justify-center">
              <i className={`${collapsed ? 'ri-menu-unfold-line' : 'ri-menu-fold-line'} text-sm`}></i>
            </span>
          </button>
        </div>
      </aside>

      {/* Flyout panel */}
      {flyoutItem && collapsed && (
        <div
          className="fixed z-[60] w-64 bg-background-50 border border-secondary-200 rounded-xl shadow-2xl py-3 animate-fade-in"
          style={{
            top: flyoutPos.top,
            left: flyoutPos.left,
            maxHeight: 'calc(100vh - 40px)',
            overflowY: 'auto',
          }}
          onMouseEnter={() => {
            clearFlyoutTimeout();
          }}
          onMouseLeave={() => {
            closeFlyout();
          }}
        >
          <div className="flex items-center gap-2 px-3 pb-2 mb-2 border-b border-secondary-100">
            <span className="w-6 h-6 flex items-center justify-center rounded-md bg-primary-100 text-primary-600">
              <i className={`${flyoutItem.icon} text-sm`}></i>
            </span>
            <span className="text-sm font-semibold text-foreground-800">{flyoutItem.label}</span>
          </div>

          <div className="space-y-0.5 px-1.5" data-testid="nav-flyout">
            {flyoutItem.children ? (
              flyoutItem.children.map((child) => (
                <PermissionGate key={child.key} route={child.path}>
                  <button
                    onClick={() => {
                      navigate(child.path);
                      setFlyoutGroup(null);
                      setMobileOpen(false);
                    }}
                    data-testid={`nav-flyout-${child.key}`}
                    className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm transition-base cursor-pointer ${
                      isActive(child.path)
                        ? 'text-primary-700 bg-primary-50 font-medium'
                        : 'text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100'
                    }`}
                  >
                    <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 rounded-md bg-secondary-100">
                      <i className={`${child.icon} text-sm`}></i>
                    </span>
                    <span className="text-left whitespace-nowrap flex-1">{child.label}</span>
                    {child.badge && (
                      <span className="px-1.5 py-0.5 text-2xs font-bold rounded-full bg-red-500 text-white">
                        {child.badge}
                      </span>
                    )}
                  </button>
                </PermissionGate>
              ))
            ) : (
              <button
                onClick={() => {
                  navigate(flyoutItem.path || '/app/dashboard');
                  setFlyoutGroup(null);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm transition-base cursor-pointer ${
                  isActive(flyoutItem.path || '')
                    ? 'text-primary-700 bg-primary-50 font-medium'
                    : 'text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100'
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 rounded-md bg-secondary-100">
                  <i className={`${flyoutItem.icon} text-sm`}></i>
                </span>
                <span className="text-left whitespace-nowrap flex-1">{flyoutItem.label}</span>
                {flyoutItem.badge && (
                  <span className="px-1.5 py-0.5 text-2xs font-bold rounded-full bg-red-500 text-white">
                    {flyoutItem.badge}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center gap-4 px-4 md:px-6 border-b border-secondary-200 bg-background-50 flex-shrink-0">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-foreground-600 hover:bg-secondary-100 transition-base cursor-pointer flex-shrink-0"
          >
            <i className="ri-menu-line text-lg"></i>
          </button>

          {/* Page title + subtitle */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground-900 font-heading leading-tight truncate">{pageInfo.title}</h1>
            {pageInfo.subtitle && (
              <p className="text-xs text-foreground-500 leading-tight truncate">{pageInfo.subtitle}</p>
            )}
          </div>

          {/* Estado observado del enlace con el API (pasivo, no bloquea) */}
          <IndicadorDeEnlace />

          {/* Specialty badge for doctors */}
          {role === 'medico' && especialidadLabel && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-100 text-accent-700 text-xs font-medium">
              <span className="w-3.5 h-3.5 flex items-center justify-center">
                <i className="ri-stethoscope-line text-xs"></i>
              </span>
              {especialidadLabel}
            </span>
          )}

          {/* Theme Selector */}
          <Dropdown
            trigger={
              <button
                className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground-500 hover:text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer"
                title="Selector de apariencia"
              >
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className={`${theme === 'dark' ? 'ri-moon-line' : theme === 'futurist' ? 'ri-flashlight-line' : 'ri-sun-line'} text-lg`}></i>
                </span>
              </button>
            }
            align="right"
            className="w-[190px]"
          >
            <div className="px-3.5 py-2.5 border-b border-secondary-100">
              <p className="text-sm font-semibold text-foreground-900">Apariencia</p>
            </div>
            <DropdownItem icon={theme === 'light' ? 'ri-check-line' : 'ri-sun-line'} onClick={() => setTheme('light')}>
              Claro
            </DropdownItem>
            <DropdownItem icon={theme === 'dark' ? 'ri-check-line' : 'ri-moon-line'} onClick={() => setTheme('dark')}>
              Oscuro
            </DropdownItem>
            <DropdownItem icon={theme === 'futurist' ? 'ri-check-line' : 'ri-flashlight-line'} onClick={() => setTheme('futurist')}>
              Futurista
            </DropdownItem>
          </Dropdown>

          {/* Branch Selector — filtrado por sucursales del usuario */}
          {canSwitchBranch ? (
            <Dropdown
              trigger={
                <button className="hidden lg:flex items-center gap-2 px-3 py-2 text-sm text-foreground-600 bg-secondary-100 rounded-lg hover:bg-secondary-200 transition-base cursor-pointer whitespace-nowrap">
                  <span className="w-4 h-4 flex items-center justify-center text-foreground-400">
                    <i className="ri-building-line text-sm"></i>
                  </span>
                  <span className="max-w-[140px] truncate">{currentBranchName}</span>
                  <span className="w-3 h-3 flex items-center justify-center">
                    <i className="ri-arrow-down-s-line text-xs"></i>
                  </span>
                </button>
              }
              align="right"
            >
              {userBranches.map((branch) => (
                <DropdownItem
                  key={branch.id}
                  onClick={() => setSucursalActual(branch.id)}
                  icon={sucursalActualId === branch.id ? 'ri-check-line' : 'ri-building-line'}
                >
                  {branch.nombre}
                </DropdownItem>
              ))}
            </Dropdown>
          ) : (
            <span
              className="hidden lg:flex items-center gap-2 px-3 py-2 text-sm text-foreground-500 bg-secondary-100/60 rounded-lg whitespace-nowrap"
              title="Sucursal asignada"
            >
              <span className="w-4 h-4 flex items-center justify-center text-foreground-400">
                <i className="ri-building-line text-sm"></i>
              </span>
              <span className="max-w-[140px] truncate">{currentBranchName}</span>
            </span>
          )}

          {/* User Profile */}
          <Dropdown
            trigger={
              <button className="flex items-center gap-2.5 cursor-pointer flex-shrink-0">
                <Avatar name={userName} size="sm" />
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-foreground-800 leading-tight whitespace-nowrap">{userName}</p>
                  <p className="text-2xs text-foreground-400 leading-tight whitespace-nowrap">
                    {userRoleLabel}{especialidadLabel ? ` · ${especialidadLabel}` : ''}
                  </p>
                </div>
              </button>
            }
            align="right"
          >
            <div className="px-3.5 py-3 border-b border-secondary-100">
              <div className="flex items-center gap-3">
                <Avatar name={userName} size="md" />
                <div>
                  <p className="text-sm font-semibold text-foreground-900">{userName}</p>
                  <p className="text-xs text-foreground-500">{userEmail}</p>
                  {especialidadLabel && (
                    <p className="text-2xs text-accent-600 mt-0.5">{especialidadLabel}</p>
                  )}
                </div>
              </div>
            </div>
            <DropdownDivider />
            <DropdownItem icon="ri-lock-password-line" onClick={() => setChangePasswordOpen(true)}>
              Cambiar contraseña
            </DropdownItem>
            {canRequestBreakGlass && (
              <DropdownItem icon="ri-shield-flash-line" onClick={() => setBreakGlassOpen(true)}>
                Acceso de emergencia
              </DropdownItem>
            )}
            <DropdownItem icon="ri-shut-down-line" onClick={handleRevokeAllSessions}>
              Cerrar en todos mis dispositivos
            </DropdownItem>
            <DropdownItem icon="ri-logout-box-r-line" onClick={handleLogout} danger>
              Cerrar Sesión
            </DropdownItem>
          </Dropdown>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin bg-background-100/50">
          {children}
        </main>
      </div>
      <BreakGlassModal open={breakGlassOpen} onClose={() => setBreakGlassOpen(false)} />
      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        onSuccess={handleLogout}
      />
    </div>
  );
}