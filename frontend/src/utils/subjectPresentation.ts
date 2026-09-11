import type { SubjectListItemDto } from '@/api/subjects';

export type IdentificationStateFilter = '' | 'no_identificado' | 'identificado';

/** Validación estructural de CURP (no sustituye RENAPO; evita envío obvio inválido). */
export function validateCurpFormat(curp: string): string | null {
  const valor = curp.trim().toUpperCase();
  if (!valor) return null;
  if (valor.length !== 18) {
    return 'La CURP debe tener exactamente 18 caracteres';
  }
  const re =
    /^[A-Z][AEIOUX][A-Z]{2}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[HM](AS|BC|BS|CC|CS|CH|CL|CM|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z][0-9]$/;
  if (!re.test(valor)) {
    return 'La CURP no tiene un formato válido';
  }
  return null;
}

export function identificationStateLabel(state: string): string {
  switch (state) {
    case 'no_identificado':
      return 'No identificado';
    case 'declarada_sin_documento':
      return 'Declarada sin documento';
    case 'verificada_con_documento':
      return 'Verificada';
    case 'rectificada':
      return 'Rectificada';
    case 'no_recuperable':
      return 'No recuperable';
    default:
      return state.replaceAll('_', ' ');
  }
}

export function isIdentifiedState(state: string): boolean {
  return state !== 'no_identificado';
}

export function formatSubjectDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

/** Edad en años cumplidos a partir de fecha de nacimiento; null si no capturada. */
export function ageFromBirthDate(birthDate: string | null | undefined): number | null {
  if (!birthDate?.trim()) return null;
  try {
    const born = new Date(birthDate.includes('T') ? birthDate : `${birthDate}T12:00:00`);
    if (Number.isNaN(born.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - born.getFullYear();
    const m = now.getMonth() - born.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age -= 1;
    return age >= 0 && age < 140 ? age : null;
  } catch {
    return null;
  }
}

/** Etiqueta corta de sexo biológico para badge; null = no capturado (no inventar F/M). */
export function biologicalSexShortLabel(sex: string | null | undefined): string | null {
  switch (sex) {
    case 'femenino':
      return 'F';
    case 'masculino':
      return 'M';
    case 'no_determinado':
      return 'ND';
    case 'no_especificado':
      return 'NE';
    default:
      return null;
  }
}

export function computeSubjectListStats(items: SubjectListItemDto[]) {
  const noIdentificados = items.filter((s) => s.identificationState === 'no_identificado').length;
  const conCurp = items.filter((s) => s.curp?.trim()).length;
  const verificados = items.filter((s) => s.identificationState === 'verificada_con_documento').length;
  return {
    total: items.length,
    noIdentificados,
    identificados: items.length - noIdentificados,
    conCurp,
    verificados,
  };
}

export function filterSubjectList(
  items: SubjectListItemDto[],
  filters: {
    sex: string;
    identification: IdentificationStateFilter;
    branchId: string;
  },
): SubjectListItemDto[] {
  return items.filter((s) => {
    if (filters.sex && s.biologicalSex !== filters.sex) return false;
    if (filters.branchId && s.originBranchId !== filters.branchId) return false;
    if (filters.identification === 'no_identificado' && s.identificationState !== 'no_identificado') {
      return false;
    }
    if (filters.identification === 'identificado' && s.identificationState === 'no_identificado') {
      return false;
    }
    return true;
  });
}

export const BIOLOGICAL_SEX_FILTER_OPTS = [
  { value: '', label: 'Todos los sexos' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'no_determinado', label: 'No determinado' },
  { value: 'no_especificado', label: 'No especificado' },
];

export const IDENTIFICATION_FILTER_OPTS = [
  { value: '' as IdentificationStateFilter, label: 'Toda identidad' },
  { value: 'no_identificado' as IdentificationStateFilter, label: 'No identificados' },
  { value: 'identificado' as IdentificationStateFilter, label: 'Identificados' },
];
