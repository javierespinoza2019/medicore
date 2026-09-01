/**
 * Vocabulario de etiquetas y utilidades de trazabilidad.
 *
 * Las etiquetas van en el título de la prueba, no en `test.describe`, porque
 * `--grep` filtra sobre el título completo y los reportes se leen por prueba.
 */

export const ETIQUETAS = {
  bloqueante: '@bloqueante',
  offline: '@offline',
  a11y: '@a11y',
  tenant: '@tenant',
  pendienteBackend: '@pendiente-backend',
  defectoPrototipo: '@defecto-prototipo',
} as const;

/** `@sc-01` … `@sc-26`. El número se conserva tal como lo fija doc 05 §4. */
export function sc(numero: number): string {
  return `@sc-${String(numero).padStart(2, '0')}`;
}

/** `@ss-01` … `@ss-10`, casos propios de la operación por dispositivo (doc 05 §4 suite 8). */
export function ss(numero: number): string {
  return `@ss-${String(numero).padStart(2, '0')}`;
}

/**
 * Compone el título de un caso de seguridad clínica conservando la numeración y
 * el título literal del documento 05, que es el activo que no se reinventa.
 */
export function tituloSC(numero: number, titulo: string, ...etiquetas: string[]): string {
  return `SC-${String(numero).padStart(2, '0')} — ${titulo} ${[ETIQUETAS.bloqueante, sc(numero), ...etiquetas].join(' ')}`;
}
