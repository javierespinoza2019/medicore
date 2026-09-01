/** Espejo exacto de backend/Models/Clinical/CommonTypes.cs (M2). Sin defaults clínicos. */

export type Autoria = {
  userId: string;
  professionalId: string | null;
  displayName: string;
  professionalLicense: string | null;
  occurredAtUtc: string;
  recordedAtUtc: string;
};

export type SelloEstado = 'pendiente' | 'sellado';

export type Firma = {
  algoritmo: string;
  contentHash: string;
  firmadoAtUtc: string;
  selloAtUtc: string | null;
  selloEstado: SelloEstado;
};

export type EstadoMedicion = 'medido' | 'no_medido' | 'no_valorable';
export type OrigenMedicion = 'medido' | 'estimado' | 'declarado';

/**
 * Medición con unidad y estado explícitos. Sin valor exige estado distinto de medido.
 * Prohibido `?? 0` / `|| 0` sobre magnitudes clínicas al consumir este tipo.
 */
export type Medicion<TUnidad extends string> = {
  valor: number | null;
  unidad: TUnidad;
  estado: EstadoMedicion;
  origen: OrigenMedicion;
  razonNoMedido: string | null;
};

export type EstadoInterrogatorioCodigo =
  | 'no_interrogado'
  | 'se_desconoce'
  | 'no_aplica'
  | 'conocido';

export type EstadoInterrogatorio<T> = {
  estado: EstadoInterrogatorioCodigo;
  /** Sólo presente cuando estado === 'conocido'. Lista vacía ≠ no_interrogado. */
  valor: T | null;
};

export type UnidadEdad = 'anios' | 'meses' | 'dias';
export type OrigenEdad = 'calculada' | 'estimada' | 'declarada';

export type EdadEstimada = {
  valor: number;
  unidad: UnidadEdad;
  rangoMin: number | null;
  rangoMax: number | null;
  origen: OrigenEdad;
};

export type Dinero = {
  monto: number;
  moneda: string;
};

export function medicionMedida<TUnidad extends string>(
  valor: number,
  unidad: TUnidad,
  origen: OrigenMedicion = 'medido',
): Medicion<TUnidad> {
  return { valor, unidad, estado: 'medido', origen, razonNoMedido: null };
}

export function medicionNoMedida<TUnidad extends string>(
  unidad: TUnidad,
  razon: string,
  origen: OrigenMedicion = 'medido',
): Medicion<TUnidad> {
  if (!razon.trim()) throw new Error('Medición sin valor exige razón explícita.');
  return { valor: null, unidad, estado: 'no_medido', origen, razonNoMedido: razon.trim() };
}

export function interrogatorioNoInterrogado<T>(): EstadoInterrogatorio<T> {
  return { estado: 'no_interrogado', valor: null };
}

export function interrogatorioConocido<T>(valor: T): EstadoInterrogatorio<T> {
  return { estado: 'conocido', valor };
}
