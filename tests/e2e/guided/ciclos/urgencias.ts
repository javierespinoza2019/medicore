/**
 * Ciclo guiado QA — Urgencias / triage / monitor (CP-MC-URG).
 * Continuidad M4/M5 + #21 + honestidad sala; sin mocks.
 */

export const CICLO_URG = {
  code: 'URG',
  label: 'Urgencias y triage',
  total: 6,
} as const;

export type PasoUrg = {
  id: string;
  index: number;
  title: string;
  detail: string;
};

export const PASOS_URG: readonly PasoUrg[] = [
  {
    id: 'CP-MC-URG-01',
    index: 1,
    title: 'Login admin + estacion',
    detail: 'Sesion admin seed; estacion aprobada para cola en vivo (sin contingencia falsa).',
  },
  {
    id: 'CP-MC-URG-02',
    index: 2,
    title: 'Ingreso sin bloqueo CURP',
    detail: 'UI Nuevo ingreso → confirmar; la atencion no exige identidad completa (doc 08).',
  },
  {
    id: 'CP-MC-URG-03',
    index: 3,
    title: 'Cola urgencias + identidad',
    detail: 'SC-05: panel de atencion con IdentityHeader y etiqueta operativa.',
  },
  {
    id: 'CP-MC-URG-04',
    index: 4,
    title: 'Triage texto + icono',
    detail: 'SC-10: niveles con etiqueta e icono (no solo color); SC-08 destaca vital extremo.',
  },
  {
    id: 'CP-MC-URG-05',
    index: 5,
    title: 'Monitor solo numero',
    detail: 'Decision #21: tarjetas por turno; sin CURP/email en DOM visible.',
  },
  {
    id: 'CP-MC-URG-06',
    index: 6,
    title: 'Sala de espera honesta',
    detail: 'Cola urgencias M4/M10; nota sin citas ambulatorias inventadas (Readdy).',
  },
] as const;
