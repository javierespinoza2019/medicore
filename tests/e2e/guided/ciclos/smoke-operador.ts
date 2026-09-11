/**
 * Ciclo guiado QA — Smoke operador (CP-MC-SMOKE).
 * Fuente de veredicto: mismos expects que la suite; el overlay solo narra.
 */

export const CICLO_SMOKE = {
  code: 'SMOKE',
  label: 'Smoke operador',
  total: 6,
} as const;

export type PasoSmoke = {
  id: string;
  index: number;
  title: string;
  detail: string;
};

export const PASOS_SMOKE: readonly PasoSmoke[] = [
  {
    id: 'CP-MC-SMOKE-01',
    index: 1,
    title: 'Login administrador seed',
    detail: 'Credenciales sintéticas Dev (admin/Demo123!); llega a /app/ sin mocks de sesión.',
  },
  {
    id: 'CP-MC-SMOKE-02',
    index: 2,
    title: 'Dashboard operativo',
    detail: 'Panel operativo API: sin KPIs inventados; urgencias y próximas citas visibles.',
  },
  {
    id: 'CP-MC-SMOKE-03',
    index: 3,
    title: 'Padrón / pacientes',
    detail: 'Listado pacientes cableado a API (page-pacientes); sin mocks de padrón.',
  },
  {
    id: 'CP-MC-SMOKE-04',
    index: 4,
    title: 'Urgencias / ingreso',
    detail: 'Pantalla M4: ingreso no bloqueado por CURP; botón Nuevo ingreso disponible.',
  },
  {
    id: 'CP-MC-SMOKE-05',
    index: 5,
    title: 'Monitor solo número',
    detail: 'Decisión #21: monitor de turnos sin nombre/CURP en tarjetas visibles.',
  },
  {
    id: 'CP-MC-SMOKE-06',
    index: 6,
    title: 'Sala de espera honesta',
    detail: 'Cola urgencias M4/M10; nota de honestidad (sin citas ambulatorias inventadas).',
  },
] as const;
