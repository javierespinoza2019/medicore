/**
 * Presentación neutral para datos mock del prototipo (urgencias.ts).
 * No es la escala de producto (doc 06 §63): sin mapa fijo rojo/naranja/amarillo/verde.
 */

const legacyLabels: Record<string, string> = {
  rojo: 'Prioridad 1 (mock)',
  naranja: 'Prioridad 2 (mock)',
  amarillo: 'Prioridad 3 (mock)',
  verde: 'Prioridad 4 (mock)',
};

export function legacyMockTriageLabel(code: string | null | undefined): string {
  if (!code?.trim()) return 'Sin clasificar';
  const key = code.trim().toLowerCase();
  return legacyLabels[key] ?? code;
}

/** Badge neutro para mocks; no implica escala clínica de producto. */
export function legacyMockTriageBadgeClass(_code?: string | null): string {
  return 'bg-secondary-100 text-foreground-700';
}

/** Orden relativo solo para ordenar listas mock; no es prioridad clínica real. */
export function legacyMockTriageSortIndex(code: string | null | undefined): number {
  const order = ['rojo', 'naranja', 'amarillo', 'verde'];
  const key = (code ?? '').trim().toLowerCase();
  const idx = order.indexOf(key);
  return idx >= 0 ? idx : 99;
}
