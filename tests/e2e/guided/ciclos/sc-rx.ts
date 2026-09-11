/**
 * Ciclo guiado QA — Seguridad clinica Rx (CP-MC-SC-RX).
 * SC-01/02/04/05 en UI; veredicto = expects reales (sin mocks).
 */

export const CICLO_SC_RX = {
  code: 'SC-RX',
  label: 'Seguridad clinica Rx',
  total: 6,
} as const;

export type PasoScRx = {
  id: string;
  index: number;
  title: string;
  detail: string;
};

export const PASOS_SC_RX: readonly PasoScRx[] = [
  {
    id: 'CP-MC-SC-RX-01',
    index: 1,
    title: 'Login medico seed',
    detail: 'Sesion alejandro.garcia (Admin123!); profesional ligado para firmar/prescribir.',
  },
  {
    id: 'CP-MC-SC-RX-02',
    index: 2,
    title: 'Consulta + cabecera identidad',
    detail: 'SC-05: IdentityHeader visible con etiqueta operativa antes de recetar.',
  },
  {
    id: 'CP-MC-SC-RX-03',
    index: 3,
    title: 'Captura alergica y emision Rx',
    detail: 'SC-01: niega alergias explicitamente; emite Paracetamol firmado en consulta.',
  },
  {
    id: 'CP-MC-SC-RX-04',
    index: 4,
    title: 'SC-02 justificacion con alergia',
    detail: 'Alergia conocida a Paracetamol exige campo de justificacion antes de emitir.',
  },
  {
    id: 'CP-MC-SC-RX-05',
    index: 5,
    title: 'Receta en urgencias',
    detail: 'Mismo flujo de captura alergica + Rx en panel de atencion de urgencias.',
  },
  {
    id: 'CP-MC-SC-RX-06',
    index: 6,
    title: 'SC-04 cierre con Rx pendiente',
    detail: 'Bloquea alta con Rx sin firmar; override con motivo deja episodio cerrado.',
  },
] as const;
