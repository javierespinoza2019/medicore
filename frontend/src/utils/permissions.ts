import type { UserRole } from '@/types/session';

export type RoutePath = string;

/** Claves de permiso de feature usadas por `PermissionGate` y controles de UI. */
export type PermissionKey =
  | 'canCreatePatient'
  | 'canEditPatient'
  | 'canDeletePatient'
  | 'canCreateConsulta'
  | 'canEditConsulta'
  | 'canCreateReceta'
  | 'canDispensar'
  | 'canCobrar'
  | 'canCerrarCaja'
  | 'canAdminUsers'
  | 'canAdminMedicos'
  | 'canAdminCatalogos'
  | 'canVerAuditoria'
  | 'canEditTriage'
  | 'canAtenderUrgencia'
  | 'canVerEstadisticas'
  | 'canExportar';

// Routes each role can access
export const roleRoutes: Record<UserRole, string[]> = {
  admin: [
    '/app/hl7-fhir',
    '/app/dashboard',
    '/app/reportes',
    '/app/agenda',
    '/app/sala-espera',
    '/app/monitor-turnos',
    '/app/triage',
    '/app/urgencias',
    '/app/pacientes',
    '/app/pacientes/nuevo',
    '/app/pacientes/',
    '/app/consultas',
    '/app/recetas',
    '/app/estudios',
    '/app/farmacia',
    '/app/caja',
    '/app/caja/cortes',
    '/app/facturacion',
    '/app/administracion/usuarios',
    '/app/administracion/medicos',
    '/app/administracion/especialidades',
    '/app/administracion/sucursales',
    '/app/administracion/servicios',
    '/app/administracion/catalogos',
    '/app/seguridad/roles',
    '/app/seguridad/auditoria',
    '/app/normatividad/',
  ],
  medico: [
    '/app/dashboard',
    '/app/agenda',
    '/app/sala-espera',
    '/app/monitor-turnos',
    '/app/triage',
    '/app/urgencias',
    '/app/pacientes',
    '/app/pacientes/nuevo',
    '/app/pacientes/',
    '/app/consultas',
    '/app/recetas',
    '/app/estudios',
    '/app/farmacia',
    '/app/normatividad/consentimientos',
    '/app/normatividad/referencias',
    '/app/normatividad/egresos',
    '/app/normatividad/notas-enfermeria',
    '/app/normatividad/vigilancia',
    '/app/normatividad/profesionales',
  ],
  recepcion: [
    '/app/dashboard',
    '/app/agenda',
    '/app/sala-espera',
    '/app/monitor-turnos',
    '/app/triage',
    '/app/pacientes',
    '/app/pacientes/nuevo',
    '/app/pacientes/',
    '/app/caja',
    '/app/caja/cortes',
  ],
  enfermeria: [
    '/app/dashboard',
    '/app/sala-espera',
    '/app/monitor-turnos',
    '/app/triage',
    '/app/urgencias',
    '/app/pacientes',
    '/app/pacientes/',
    '/app/normatividad/notas-enfermeria',
    '/app/normatividad/consentimientos',
    '/app/normatividad/profesionales',
  ],
  caja: [
    '/app/dashboard',
    '/app/caja',
    '/app/caja/cortes',
    '/app/facturacion',
    '/app/pacientes',
    '/app/pacientes/',
    '/app/farmacia',
    '/app/recetas',
    '/app/estudios',
  ],
  farmacia: [
    '/app/dashboard',
    '/app/farmacia',
    '/app/recetas',
    '/app/estudios',
    '/app/pacientes',
    '/app/pacientes/',
  ],
  laboratorio: [
    '/app/dashboard',
    '/app/estudios',
    '/app/recetas',
    '/app/pacientes',
    '/app/pacientes/',
  ],
  directivo: [
    '/app/hl7-fhir',
    '/app/dashboard',
    '/app/reportes',
    '/app/agenda',
    '/app/sala-espera',
    '/app/monitor-turnos',
    '/app/triage',
    '/app/urgencias',
    '/app/pacientes',
    '/app/pacientes/',
    '/app/consultas',
    '/app/recetas',
    '/app/estudios',
    '/app/farmacia',
    '/app/caja',
    '/app/caja/cortes',
    '/app/facturacion',
    '/app/administracion/usuarios',
    '/app/administracion/medicos',
    '/app/administracion/especialidades',
    '/app/administracion/sucursales',
    '/app/administracion/servicios',
    '/app/administracion/catalogos',
    '/app/seguridad/roles',
    '/app/seguridad/auditoria',
    '/app/normatividad/',
  ],
  // Plantilla inicial (doc 06 §19): identificación / seguimiento; sin caja ni actos clínicos.
  // La matriz por tenant podrá ampliar o reducir estas rutas.
  trabajo_social: [
    '/app/dashboard',
    '/app/sala-espera',
    '/app/monitor-turnos',
    '/app/pacientes',
    '/app/pacientes/',
  ],
};

export function canAccessRoute(
  role: UserRole | null,
  path: string,
  sessionPermissions?: Record<PermissionKey, boolean> | null,
): boolean {
  if (!role) return false;

  if (path === '/app' || path === '/app/dashboard') return true;

  if (sessionPermissions) {
    const rule = matchRoutePermissionRule(path);
    if (rule) {
      return rule.keys.some((k) => sessionPermissions[k]);
    }
    return false;
  }

  const routes = roleRoutes[role];
  return routes.some((r) => {
    if (r.endsWith('/')) {
      return path.startsWith(r);
    }
    return path === r || path.startsWith(`${r}/`);
  });
}

/** Prefijos de ruta → al menos uno de estos permisos (sesión del servidor). */
const routePermissionRules: ReadonlyArray<{ prefix: string; keys: PermissionKey[] }> = [
  { prefix: '/app/pacientes', keys: ['canCreatePatient', 'canEditPatient'] },
  { prefix: '/app/consultas', keys: ['canCreateConsulta', 'canEditConsulta'] },
  { prefix: '/app/recetas', keys: ['canCreateReceta', 'canDispensar'] },
  { prefix: '/app/farmacia', keys: ['canDispensar'] },
  { prefix: '/app/caja', keys: ['canCobrar', 'canCerrarCaja'] },
  { prefix: '/app/facturacion', keys: ['canCobrar', 'canCerrarCaja'] },
  { prefix: '/app/triage', keys: ['canEditTriage', 'canAtenderUrgencia', 'canCreatePatient', 'canEditPatient'] },
  { prefix: '/app/urgencias', keys: ['canAtenderUrgencia', 'canEditTriage', 'canCreateConsulta', 'canEditConsulta'] },
  { prefix: '/app/agenda', keys: ['canCreateConsulta', 'canEditConsulta', 'canCreatePatient', 'canAdminUsers'] },
  {
    prefix: '/app/sala-espera',
    keys: [
      'canCreatePatient', 'canEditPatient', 'canEditTriage', 'canAtenderUrgencia',
      'canCreateConsulta', 'canEditConsulta', 'canAdminUsers',
    ],
  },
  {
    prefix: '/app/monitor-turnos',
    keys: [
      'canCreatePatient', 'canEditPatient', 'canEditTriage', 'canAtenderUrgencia',
      'canCreateConsulta', 'canEditConsulta', 'canAdminUsers',
    ],
  },
  { prefix: '/app/estudios', keys: ['canDispensar', 'canCreateReceta', 'canCreateConsulta', 'canEditConsulta'] },
  { prefix: '/app/administracion/usuarios', keys: ['canAdminUsers'] },
  { prefix: '/app/administracion/medicos', keys: ['canAdminMedicos'] },
  { prefix: '/app/administracion/especialidades', keys: ['canAdminMedicos'] },
  { prefix: '/app/administracion/sucursales', keys: ['canAdminCatalogos', 'canAdminUsers'] },
  { prefix: '/app/administracion/servicios', keys: ['canAdminCatalogos', 'canAdminUsers'] },
  { prefix: '/app/administracion/catalogos', keys: ['canAdminCatalogos'] },
  { prefix: '/app/seguridad/roles', keys: ['canAdminUsers'] },
  { prefix: '/app/seguridad/auditoria', keys: ['canVerAuditoria'] },
  { prefix: '/app/reportes', keys: ['canVerEstadisticas'] },
  { prefix: '/app/hl7-fhir', keys: ['canAdminCatalogos', 'canVerEstadisticas'] },
  { prefix: '/app/normatividad', keys: ['canCreateConsulta', 'canEditConsulta', 'canEditTriage'] },
];

function matchRoutePermissionRule(path: string) {
  let best: (typeof routePermissionRules)[number] | null = null;
  for (const rule of routePermissionRules) {
    if (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) {
      if (!best || rule.prefix.length > best.prefix.length) best = rule;
    }
  }
  return best;
}

// Feature-level permissions for UI controls
export const rolePermissions: Record<UserRole, Record<PermissionKey, boolean>> = {
  admin: {
    canCreatePatient: true,
    canEditPatient: true,
    canDeletePatient: true,
    canCreateConsulta: true,
    canEditConsulta: true,
    canCreateReceta: true,
    canDispensar: true,
    canCobrar: true,
    canCerrarCaja: true,
    canAdminUsers: true,
    canAdminMedicos: true,
    canAdminCatalogos: true,
    canVerAuditoria: true,
    canEditTriage: true,
    canAtenderUrgencia: true,
    canVerEstadisticas: true,
    canExportar: true,
  },
  medico: {
    canCreatePatient: true,
    canEditPatient: true,
    canDeletePatient: false,
    canCreateConsulta: true,
    canEditConsulta: true,
    canCreateReceta: true,
    canDispensar: false,
    canCobrar: false,
    canCerrarCaja: false,
    canAdminUsers: false,
    canAdminMedicos: false,
    canAdminCatalogos: false,
    canVerAuditoria: false,
    canEditTriage: true,
    canAtenderUrgencia: true,
    canVerEstadisticas: false,
    canExportar: true,
  },
  recepcion: {
    canCreatePatient: true,
    canEditPatient: true,
    canDeletePatient: false,
    canCreateConsulta: false,
    canEditConsulta: false,
    canCreateReceta: false,
    canDispensar: false,
    canCobrar: false,
    canCerrarCaja: false,
    canAdminUsers: false,
    canAdminMedicos: false,
    canAdminCatalogos: false,
    canVerAuditoria: false,
    canEditTriage: false,
    canAtenderUrgencia: false,
    canVerEstadisticas: false,
    canExportar: false,
  },
  enfermeria: {
    canCreatePatient: false,
    canEditPatient: false,
    canDeletePatient: false,
    canCreateConsulta: false,
    canEditConsulta: false,
    canCreateReceta: false,
    canDispensar: false,
    canCobrar: false,
    canCerrarCaja: false,
    canAdminUsers: false,
    canAdminMedicos: false,
    canAdminCatalogos: false,
    canVerAuditoria: false,
    canEditTriage: true,
    canAtenderUrgencia: false,
    canVerEstadisticas: false,
    canExportar: false,
  },
  caja: {
    canCreatePatient: false,
    canEditPatient: false,
    canDeletePatient: false,
    canCreateConsulta: false,
    canEditConsulta: false,
    canCreateReceta: false,
    canDispensar: false,
    canCobrar: true,
    canCerrarCaja: true,
    canAdminUsers: false,
    canAdminMedicos: false,
    canAdminCatalogos: false,
    canVerAuditoria: false,
    canEditTriage: false,
    canAtenderUrgencia: false,
    canVerEstadisticas: false,
    canExportar: true,
  },
  farmacia: {
    canCreatePatient: false,
    canEditPatient: false,
    canDeletePatient: false,
    canCreateConsulta: false,
    canEditConsulta: false,
    canCreateReceta: false,
    canDispensar: true,
    canCobrar: false,
    canCerrarCaja: false,
    canAdminUsers: false,
    canAdminMedicos: false,
    canAdminCatalogos: false,
    canVerAuditoria: false,
    canEditTriage: false,
    canAtenderUrgencia: false,
    canVerEstadisticas: false,
    canExportar: false,
  },
  laboratorio: {
    canCreatePatient: false,
    canEditPatient: false,
    canDeletePatient: false,
    canCreateConsulta: false,
    canEditConsulta: false,
    canCreateReceta: false,
    canDispensar: false,
    canCobrar: false,
    canCerrarCaja: false,
    canAdminUsers: false,
    canAdminMedicos: false,
    canAdminCatalogos: false,
    canVerAuditoria: false,
    canEditTriage: false,
    canAtenderUrgencia: false,
    canVerEstadisticas: false,
    canExportar: false,
  },
  directivo: {
    canCreatePatient: false,
    canEditPatient: false,
    canDeletePatient: false,
    canCreateConsulta: false,
    canEditConsulta: false,
    canCreateReceta: false,
    canDispensar: false,
    canCobrar: false,
    canCerrarCaja: false,
    canAdminUsers: true,
    canAdminMedicos: true,
    canAdminCatalogos: true,
    canVerAuditoria: true,
    canEditTriage: false,
    canAtenderUrgencia: false,
    canVerEstadisticas: true,
    canExportar: true,
  },
  trabajo_social: {
    canCreatePatient: false,
    canEditPatient: true,
    canDeletePatient: false,
    canCreateConsulta: false,
    canEditConsulta: false,
    canCreateReceta: false,
    canDispensar: false,
    canCobrar: false,
    canCerrarCaja: false,
    canAdminUsers: false,
    canAdminMedicos: false,
    canAdminCatalogos: false,
    canVerAuditoria: false,
    canEditTriage: false,
    canAtenderUrgencia: false,
    canVerEstadisticas: false,
    canExportar: false,
  },
};

const deniedPermissions: Record<PermissionKey, boolean> = {
  canCreatePatient: false,
  canEditPatient: false,
  canDeletePatient: false,
  canCreateConsulta: false,
  canEditConsulta: false,
  canCreateReceta: false,
  canDispensar: false,
  canCobrar: false,
  canCerrarCaja: false,
  canAdminUsers: false,
  canAdminMedicos: false,
  canAdminCatalogos: false,
  canVerAuditoria: false,
  canEditTriage: false,
  canAtenderUrgencia: false,
  canVerEstadisticas: false,
  canExportar: false,
};

export function getPermissions(
  role: UserRole | null,
  sessionPermissions?: Record<PermissionKey, boolean> | null,
): Record<PermissionKey, boolean> {
  if (sessionPermissions) return sessionPermissions;
  if (!role) return { ...deniedPermissions };
  return rolePermissions[role];
}

export function hasPermission(
  role: UserRole | null,
  key: PermissionKey,
  sessionPermissions?: Record<PermissionKey, boolean> | null,
): boolean {
  return getPermissions(role, sessionPermissions)[key];
}

export function normalizeSessionPermissions(
  raw?: Partial<Record<string, boolean>> | null,
): Record<PermissionKey, boolean> | null {
  if (!raw) return null;
  const result = { ...deniedPermissions };
  for (const key of Object.keys(rolePermissions.admin) as PermissionKey[]) {
    if (raw[key] === true) result[key] = true;
  }
  return result;
}