/**
 * Selectores estables del prototipo docs/frontend.
 * Preferir roles/labels sobre clases Tailwind.
 */

export const sel = {
  login: {
    heading: 'heading',
    email: 'input[autocomplete="username"]',
    password: 'input[autocomplete="current-password"]',
    submit: 'button[type="submit"]',
    error: 'text=/incorrectos|Por favor ingresa/i',
  },
  app: {
    brand: 'text=MediCore',
    dashboardPath: /\/app\/dashboard/,
  },
  nav: {
    sidebar: 'nav-sidebar',
    toggleCollapse: 'nav-toggle-collapse',
    /** `data-testid` de grupo PermissionGate/AppLayout (`nav-group-{key}`). */
    group: (key: string) => `nav-group-${key}`,
    groupBtn: (key: string) => `nav-group-btn-${key}`,
    /** `data-testid` de ítem hoja (`nav-item-{key}`). */
    item: (key: string) => `nav-item-${key}`,
  },
  pacientes: {
    path: '/app/pacientes',
    nuevoPath: '/app/pacientes/nuevo',
  },
  triage: {
    path: '/app/triage',
  },
  urgencias: {
    path: '/app/urgencias',
  },
  caja: {
    path: '/app/caja',
  },
  consultas: {
    path: '/app/consultas',
  },
  agenda: {
    path: '/app/agenda',
  },
  admin: {
    medicosPath: '/app/administracion/medicos',
    especialidadesPath: '/app/administracion/especialidades',
  },
} as const;
