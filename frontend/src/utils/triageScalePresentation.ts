import type { TriageScaleConfigDto, TriageScaleLevel } from '@/api/triage';

/**
 * Presentación de nivel desde la escala efectiva (doc 06 §63).
 * No usa el mapa fijo rojo/naranja/amarillo/verde del prototipo.
 */
export function findTriageScaleLevel(
  scale: TriageScaleConfigDto | null | undefined,
  code: string | null | undefined,
): TriageScaleLevel | null {
  if (!scale || !code) return null;
  const needle = code.trim().toLowerCase();
  if (!needle) return null;
  return scale.levels.find((l) => l.code.toLowerCase() === needle) ?? null;
}

/** Etiqueta visible: label de la escala, o el código crudo, o «Sin clasificar». */
export function triageLevelLabel(
  scale: TriageScaleConfigDto | null | undefined,
  code: string | null | undefined,
): string {
  if (!code || !code.trim()) return 'Sin clasificar';
  const level = findTriageScaleLevel(scale, code);
  return level?.label?.trim() || code;
}
