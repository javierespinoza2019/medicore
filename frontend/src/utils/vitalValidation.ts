/**
 * Validación de signos vitales (M5).
 * Destaca fuera de rango; NO rellena ni marca «normal» ante vacío.
 * Sexo para rangos: sólo BiologicalSex (opción B). Prohibido GenderIdentity.
 * Prohibido parseFloat(x) || 0.
 */

export interface VitalValidationResult {
  valid: boolean;
  /** true cuando el valor medido está fuera del rango de referencia (destacar, no bloquear silencio). */
  outOfRange: boolean;
  message: string;
}

export type BiologicalSexForRanges =
  | 'masculino'
  | 'femenino'
  | 'no_determinado'
  | 'no_especificado'
  | string
  | null
  | undefined;

/** Rangos de referencia (destacar). Sin sexo → banda genérica; nunca asume M/F. */
const REFERENCE: Record<
  string,
  { min: number; max: number; unit: string } | ((sex: BiologicalSexForRanges) => { min: number; max: number; unit: string })
> = {
  temperatura: { min: 35, max: 38, unit: '°C' },
  tension_sistolica: { min: 90, max: 140, unit: 'mmHg' },
  tension_diastolica: { min: 60, max: 90, unit: 'mmHg' },
  presionSistolica: { min: 90, max: 140, unit: 'mmHg' },
  presionDiastolica: { min: 60, max: 90, unit: 'mmHg' },
  frecuencia_cardiaca: (sex) => {
    const s = (sex ?? '').toLowerCase();
    if (s === 'femenino') return { min: 60, max: 100, unit: 'lpm' };
    if (s === 'masculino') return { min: 55, max: 95, unit: 'lpm' };
    return { min: 50, max: 110, unit: 'lpm' };
  },
  frecuenciaCardiaca: (sex) => {
    const s = (sex ?? '').toLowerCase();
    if (s === 'femenino') return { min: 60, max: 100, unit: 'lpm' };
    if (s === 'masculino') return { min: 55, max: 95, unit: 'lpm' };
    return { min: 50, max: 110, unit: 'lpm' };
  },
  frecuencia_respiratoria: { min: 12, max: 20, unit: 'rpm' },
  frecuenciaRespiratoria: { min: 12, max: 20, unit: 'rpm' },
  saturacion: { min: 94, max: 100, unit: '%' },
  saturacionOxigeno: { min: 94, max: 100, unit: '%' },
  glucosa: { min: 70, max: 140, unit: 'mg/dL' },
  peso: { min: 0.5, max: 300, unit: 'kg' },
  talla: { min: 0.3, max: 2.5, unit: 'm' },
};

/** Límites de plausibilidad (entrada inválida). Más amplios que el rango de referencia. */
const PLAUSIBILITY: Record<string, { min: number; max: number; unit: string }> = {
  temperatura: { min: 30, max: 44, unit: '°C' },
  tension_sistolica: { min: 40, max: 250, unit: 'mmHg' },
  tension_diastolica: { min: 20, max: 150, unit: 'mmHg' },
  presionSistolica: { min: 40, max: 250, unit: 'mmHg' },
  presionDiastolica: { min: 20, max: 150, unit: 'mmHg' },
  frecuencia_cardiaca: { min: 20, max: 220, unit: 'lpm' },
  frecuenciaCardiaca: { min: 20, max: 220, unit: 'lpm' },
  frecuencia_respiratoria: { min: 4, max: 60, unit: 'rpm' },
  frecuenciaRespiratoria: { min: 4, max: 60, unit: 'rpm' },
  saturacion: { min: 50, max: 100, unit: '%' },
  saturacionOxigeno: { min: 50, max: 100, unit: '%' },
  glucosa: { min: 20, max: 600, unit: 'mg/dL' },
  peso: { min: 0.5, max: 300, unit: 'kg' },
  talla: { min: 0.3, max: 2.5, unit: 'm' },
};

function resolveRange(
  field: string,
  biologicalSex?: BiologicalSexForRanges,
): { min: number; max: number; unit: string } | null {
  const entry = REFERENCE[field];
  if (!entry) return null;
  return typeof entry === 'function' ? entry(biologicalSex) : entry;
}

/**
 * Valida un signo. Vacío: válido (no medido) salvo required=true.
 * Nunca interpreta vacío como «normal».
 */
export function validateVital(
  field: string,
  rawValue: string,
  options?: {
    required?: boolean;
    allowEmpty?: boolean;
    biologicalSex?: BiologicalSexForRanges;
  },
): VitalValidationResult {
  const { required = false, allowEmpty = true, biologicalSex } = options || {};
  const trimmed = rawValue.trim();

  if (!trimmed) {
    if (required) {
      return { valid: false, outOfRange: false, message: 'Este campo es obligatorio' };
    }
    if (allowEmpty) {
      // Ausente ≠ normal. El caller marca no_medido / «no tomado».
      return { valid: true, outOfRange: false, message: '' };
    }
    return { valid: false, outOfRange: false, message: 'Este campo es obligatorio' };
  }

  const num = Number(trimmed);
  if (Number.isNaN(num)) {
    return { valid: false, outOfRange: false, message: 'Ingresa un valor numérico válido' };
  }

  const plausibility = PLAUSIBILITY[field];
  if (plausibility) {
    if (num < plausibility.min) {
      return {
        valid: false,
        outOfRange: true,
        message: `Mínimo ${plausibility.min} ${plausibility.unit} (valor ingresado: ${num})`,
      };
    }
    if (num > plausibility.max) {
      return {
        valid: false,
        outOfRange: true,
        message: `Máximo ${plausibility.max} ${plausibility.unit} (valor ingresado: ${num})`,
      };
    }
  }

  const ref = resolveRange(field, biologicalSex);
  if (ref && (num < ref.min || num > ref.max)) {
    return {
      valid: true,
      outOfRange: true,
      message: `Fuera de rango de referencia (${ref.min}–${ref.max} ${ref.unit})`,
    };
  }

  return { valid: true, outOfRange: false, message: '' };
}

export function validatePresionPar(
  sistolicaRaw: string,
  diastolicaRaw: string,
): VitalValidationResult {
  const sisTrim = sistolicaRaw.trim();
  const diaTrim = diastolicaRaw.trim();
  if (!sisTrim || !diaTrim) {
    return { valid: true, outOfRange: false, message: '' };
  }

  const sis = Number(sisTrim);
  const dia = Number(diaTrim);
  if (Number.isNaN(sis) || Number.isNaN(dia)) {
    return { valid: true, outOfRange: false, message: '' };
  }

  if (dia >= sis) {
    return {
      valid: false,
      outOfRange: false,
      message: `La presión diastólica (${dia}) debe ser menor que la sistólica (${sis})`,
    };
  }

  return { valid: true, outOfRange: false, message: '' };
}

export function validateMotivoUrgencia(motivo: string): VitalValidationResult {
  const trimmed = motivo.trim();
  if (!trimmed) {
    // Motivo no bloquea iniciar triage (SC-14); UI puede pedir descripción sin impedir guardar.
    return { valid: true, outOfRange: false, message: '' };
  }
  if (trimmed.length > 1000) {
    return { valid: false, outOfRange: false, message: 'Máximo 1000 caracteres' };
  }
  return { valid: true, outOfRange: false, message: '' };
}

export function validateNotasTriage(notas: string): VitalValidationResult {
  if (notas.length > 500) {
    return { valid: false, outOfRange: false, message: 'Máximo 500 caracteres' };
  }
  return { valid: true, outOfRange: false, message: '' };
}

export function validateIMC(pesoRaw: string, tallaRaw: string): VitalValidationResult {
  const pesoTrim = pesoRaw.trim();
  const tallaTrim = tallaRaw.trim();
  if (!pesoTrim || !tallaTrim) {
    return { valid: true, outOfRange: false, message: '' };
  }
  const peso = Number(pesoTrim);
  const talla = Number(tallaTrim);
  if (Number.isNaN(peso) || Number.isNaN(talla)) {
    return { valid: true, outOfRange: false, message: '' };
  }
  if (peso <= 0 || talla <= 0) {
    return { valid: false, outOfRange: false, message: 'Peso y talla deben ser mayores a 0' };
  }
  const imc = peso / (talla * talla);
  if (imc > 80) {
    return {
      valid: false,
      outOfRange: true,
      message: `IMC calculado (${imc.toFixed(1)}) excede el máximo clínico de 80 kg/m². Verifica peso y talla.`,
    };
  }
  if (imc < 5) {
    return {
      valid: false,
      outOfRange: true,
      message: `IMC calculado (${imc.toFixed(1)}) es menor al mínimo clínico de 5 kg/m². Verifica peso y talla.`,
    };
  }
  return { valid: true, outOfRange: false, message: '' };
}

/** Parseo seguro: vacío → null (nunca 0 fabricado). */
export function parseVitalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isNaN(num) ? null : num;
}
