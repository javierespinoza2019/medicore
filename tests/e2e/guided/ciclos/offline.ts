/**
 * Ciclo guiado QA — Offline / estacion (CP-MC-OFF).
 * SC-19: Core caido no bloquea ingreso; cola local + sync idempotente.
 */

export const CICLO_OFF = {
  code: 'OFF',
  label: 'Offline y estacion',
  total: 6,
} as const;

export type PasoOff = {
  id: string;
  index: number;
  title: string;
  detail: string;
};

export const PASOS_OFF: readonly PasoOff[] = [
  {
    id: 'CP-MC-OFF-01',
    index: 1,
    title: 'Login + estacion con cola',
    detail: 'Admin seed; dispositivo registrado y aprobado con allowsOfflineQueue.',
  },
  {
    id: 'CP-MC-OFF-02',
    index: 2,
    title: 'Precarga online (sucursal)',
    detail: 'Abrir modal de ingreso online hasta confirmar habilitado; luego cancelar.',
  },
  {
    id: 'CP-MC-OFF-03',
    index: 3,
    title: 'Core caido: banner, sin modal',
    detail: 'SC-19: Sin enlace / indicador; no alertdialog que obligue a esperar al Core.',
  },
  {
    id: 'CP-MC-OFF-04',
    index: 4,
    title: 'Ingreso a cola local',
    detail: 'Confirmar ingreso offline: outbox subject.create + encounter.open (urgencias).',
  },
  {
    id: 'CP-MC-OFF-05',
    index: 5,
    title: 'Sync al recuperar enlace',
    detail: 'goOnline + POST /api/sync/commands; accepted o duplicate; mismos client IDs.',
  },
  {
    id: 'CP-MC-OFF-06',
    index: 6,
    title: 'Idempotencia (duplicate)',
    detail: 'Reintento del mismo encounter.open → status duplicate; SPA sigue en urgencias.',
  },
] as const;
