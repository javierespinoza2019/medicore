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
} as const;
