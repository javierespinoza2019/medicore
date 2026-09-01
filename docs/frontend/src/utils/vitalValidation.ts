export interface VitalValidationResult {
  valid: boolean;
  message: string;
}

const RANGE_MESSAGES: Record<string, { min: number; max: number; unit: string }> = {
  temperatura: { min: 30, max: 44, unit: '°C' },
  presionSistolica: { min: 40, max: 250, unit: 'mmHg' },
  presionDiastolica: { min: 20, max: 150, unit: 'mmHg' },
  frecuenciaCardiaca: { min: 20, max: 220, unit: 'lpm' },
  frecuenciaRespiratoria: { min: 4, max: 60, unit: 'rpm' },
  saturacionOxigeno: { min: 50, max: 100, unit: '%' },
  glucosa: { min: 20, max: 600, unit: 'mg/dL' },
  peso: { min: 0.5, max: 300, unit: 'kg' },
  talla: { min: 0.3, max: 2.5, unit: 'm' },
  edad: { min: 0, max: 120, unit: 'años' },
};

export function validateVital(
  field: string,
  rawValue: string,
  options?: { required?: boolean; allowEmpty?: boolean }
): VitalValidationResult {
  const { required = false, allowEmpty = true } = options || {};
  const trimmed = rawValue.trim();

  if (!trimmed) {
    if (required) {
      return { valid: false, message: 'Este campo es obligatorio' };
    }
    if (allowEmpty) {
      return { valid: true, message: '' };
    }
    return { valid: false, message: 'Este campo es obligatorio' };
  }

  const num = parseFloat(trimmed);
  if (Number.isNaN(num)) {
    return { valid: false, message: 'Ingresa un valor numérico válido' };
  }

  const range = RANGE_MESSAGES[field];
  if (!range) {
    return { valid: true, message: '' };
  }

  if (num < range.min) {
    return { valid: false, message: `Mínimo ${range.min} ${range.unit} (valor ingresado: ${num})` };
  }
  if (num > range.max) {
    return { valid: false, message: `Máximo ${range.max} ${range.unit} (valor ingresado: ${num})` };
  }

  return { valid: true, message: '' };
}

export function validatePresionPar(
  sistolicaRaw: string,
  diastolicaRaw: string
): VitalValidationResult {
  const sis = parseFloat(sistolicaRaw.trim());
  const dia = parseFloat(diastolicaRaw.trim());

  if (Number.isNaN(sis) || Number.isNaN(dia)) {
    return { valid: true, message: '' };
  }

  if (dia >= sis) {
    return {
      valid: false,
      message: `La presión diastólica (${dia}) debe ser menor que la sistólica (${sis})`,
    };
  }

  const diff = sis - dia;
  if (diff < 20) {
    return {
      valid: false,
      message: `La diferencia entre sistólica y diastólica es muy pequeña (${diff} mmHg). Mínimo 20 mmHg.`,
    };
  }

  return { valid: true, message: '' };
}

export function validateMotivoUrgencia(motivo: string): VitalValidationResult {
  const trimmed = motivo.trim();
  if (!trimmed) {
    return { valid: false, message: 'El motivo de urgencia es obligatorio' };
  }
  if (trimmed.length < 5) {
    return { valid: false, message: 'Describe el motivo con al menos 5 caracteres' };
  }
  if (/^\d+$/.test(trimmed)) {
    return { valid: false, message: 'El motivo no puede ser solo números. Describe el síntoma o padecimiento.' };
  }
  if (trimmed.length > 500) {
    return { valid: false, message: 'Máximo 500 caracteres' };
  }
  return { valid: true, message: '' };
}

export function validateNombrePersona(nombre: string, label = 'Nombre'): VitalValidationResult {
  const trimmed = nombre.trim();
  if (!trimmed) {
    return { valid: false, message: `${label} es obligatorio` };
  }
  if (trimmed.length < 2) {
    return { valid: false, message: `${label} debe tener al menos 2 caracteres` };
  }
  if (trimmed.length > 60) {
    return { valid: false, message: `${label} máximo 60 caracteres` };
  }
  if (/\d/.test(trimmed)) {
    return { valid: false, message: `${label} no debe contener números` };
  }
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/.test(trimmed)) {
    return { valid: false, message: `${label} solo puede contener letras, espacios, apóstrofos y guiones` };
  }
  return { valid: true, message: '' };
}

export function validateEdad(edadRaw: string | number): VitalValidationResult {
  const num = typeof edadRaw === 'string' ? parseInt(edadRaw.trim(), 10) : edadRaw;
  if (Number.isNaN(num)) {
    return { valid: false, message: 'Ingresa una edad válida' };
  }
  if (num < 0) {
    return { valid: false, message: 'La edad no puede ser negativa' };
  }
  if (num > 120) {
    return { valid: false, message: 'La edad máxima permitida es 120 años' };
  }
  return { valid: true, message: '' };
}

export function validateTelefonoContacto(contacto: string): VitalValidationResult {
  if (!contacto.trim()) {
    return { valid: true, message: '' }; // opcional
  }
  const digits = contacto.replace(/\D/g, '');
  if (digits.length < 7) {
    return { valid: false, message: 'El teléfono debe tener al menos 7 dígitos' };
  }
  if (digits.length > 15) {
    return { valid: false, message: 'El teléfono no debe exceder 15 dígitos' };
  }
  return { valid: true, message: '' };
}

export function validateNotasTriage(notas: string): VitalValidationResult {
  if (notas.length > 500) {
    return { valid: false, message: 'Máximo 500 caracteres' };
  }
  return { valid: true, message: '' };
}

export function validateIMC(pesoRaw: string, tallaRaw: string): VitalValidationResult {
  const peso = parseFloat(pesoRaw.trim());
  const talla = parseFloat(tallaRaw.trim());
  if (Number.isNaN(peso) || Number.isNaN(talla)) {
    return { valid: true, message: '' };
  }
  if (peso <= 0 || talla <= 0) {
    return { valid: false, message: 'Peso y talla deben ser mayores a 0' };
  }
  const imc = peso / (talla * talla);
  if (imc > 80) {
    return { valid: false, message: `IMC calculado (${imc.toFixed(1)}) excede el máximo clínico de 80 kg/m². Verifica peso y talla.` };
  }
  if (imc < 5) {
    return { valid: false, message: `IMC calculado (${imc.toFixed(1)}) es menor al mínimo clínico de 5 kg/m². Verifica peso y talla.` };
  }
  return { valid: true, message: '' };
}