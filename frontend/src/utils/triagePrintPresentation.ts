import type { EncounterDto } from '@/api/encounters';
import { encounterDisplayName } from '@/api/encounters';
import type { BranchDto } from '@/api/branches';
import type { SubjectDto } from '@/api/subjects';
import {
  VITAL_LABELS,
  type CanonicalVitalCode,
  type TriageDto,
  type TriageScaleConfigDto,
  type VitalMeasurementDto,
} from '@/api/triage';
import { displayNameOf } from '@/api/subjects';
import { accentForPriority, type LevelAccent } from '@/utils/encounterQueuePresentation';
import { findTriageScaleLevel, triageLevelLabel } from '@/utils/triageScalePresentation';

const VITAL_PRINT_ORDER: CanonicalVitalCode[] = [
  'temperatura',
  'frecuencia_cardiaca',
  'frecuencia_respiratoria',
  'tension_sistolica',
  'tension_diastolica',
  'saturacion',
  'glucosa',
  'peso',
  'talla',
];

export function formatBranchAddress(branch: BranchDto | null): string {
  if (!branch) return '';
  const parts = [
    [branch.addressStreet, branch.addressNumber].filter(Boolean).join(' '),
    branch.addressNeighborhood,
    branch.addressMunicipality,
    branch.addressState,
    branch.addressPostalCode,
  ].filter(Boolean);
  return parts.join(', ');
}

export function formatTriageLocalDateTime(iso: string): { date: string; time: string } {
  try {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('es-MX', { dateStyle: 'medium' }),
      time: d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    };
  } catch {
    return { date: iso.slice(0, 10), time: '' };
  }
}

export function triagePrintFolio(encounter: EncounterDto, triage: TriageDto): string {
  const day = (triage.occurredAtUtc ?? triage.recordedAtUtc).slice(0, 10).replace(/-/g, '');
  return `TR-${day}-${encounter.turnNumber}`;
}

export function subjectAgeLabel(subject: SubjectDto | null): string {
  if (!subject) return 'No capturado';
  if (subject.estimatedAge?.valor != null) {
    const u = subject.estimatedAge.unidad === 'meses' ? 'meses' : 'años';
    return `${subject.estimatedAge.valor} ${u} (estimada)`;
  }
  if (subject.birthDate) {
    const born = new Date(subject.birthDate);
    if (!Number.isNaN(born.getTime())) {
      const years = Math.floor((Date.now() - born.getTime()) / (365.25 * 24 * 3600 * 1000));
      return `${years} años`;
    }
  }
  return 'No capturado';
}

export function biologicalSexLabel(sex: string | null | undefined): string {
  switch (sex) {
    case 'masculino':
      return 'Masculino';
    case 'femenino':
      return 'Femenino';
    case 'no_determinado':
      return 'No determinado';
    case 'no_especificado':
      return 'No especificado';
    default:
      return 'No capturado';
  }
}

export function painEvaLabel(
  score: number | null,
  assessable: string,
): string {
  if (assessable === 'no_valorable') return 'No valorable';
  if (score == null) return 'No capturado';
  if (score <= 3) return 'Leve';
  if (score <= 6) return 'Moderado';
  if (score <= 8) return 'Intenso';
  return 'Muy intenso';
}

export function formatVitalMeasurement(m: VitalMeasurementDto): string {
  if (m.state === 'no_medido') {
    return m.notMeasuredReason?.trim() || 'No medido';
  }
  if (m.state === 'no_valorable') return 'No valorable';
  if (m.value == null) return '—';
  const unit = m.unit === 'C' ? '°C' : m.unit;
  return `${m.value} ${unit}`;
}

export function computeImcFromMeasurements(
  measurements: VitalMeasurementDto[],
): { value: number; label: string } | null {
  const peso = measurements.find((m) => m.signCode === 'peso' && m.value != null)?.value;
  const talla = measurements.find((m) => m.signCode === 'talla' && m.value != null)?.value;
  if (peso == null || talla == null || talla <= 0) return null;
  const imc = peso / (talla * talla);
  let label = 'Peso normal';
  if (imc < 18.5) label = 'Bajo peso';
  else if (imc >= 30) label = 'Obesidad';
  else if (imc >= 25) label = 'Sobrepeso';
  return { value: Math.round(imc * 10) / 10, label };
}

export function triageLevelAccent(
  scale: TriageScaleConfigDto | null,
  levelCode: string | null | undefined,
): LevelAccent {
  const level = findTriageScaleLevel(scale, levelCode);
  return accentForPriority(level?.priority ?? null);
}

export function orderedVitalsForPrint(
  measurements: VitalMeasurementDto[],
): { code: CanonicalVitalCode; label: string; display: string }[] {
  const byCode = new Map(measurements.map((m) => [m.signCode, m]));
  return VITAL_PRINT_ORDER.map((code) => {
    const m = byCode.get(code);
    return {
      code,
      label: VITAL_LABELS[code],
      display: m ? formatVitalMeasurement(m) : 'No tomado',
    };
  });
}

export function subjectDisplayForPrint(
  subject: SubjectDto | null,
  encounter: EncounterDto,
): {
  name: string;
  expediente: string;
  curp: string;
  age: string;
  sex: string;
} {
  return {
    name: subject ? displayNameOf(subject) : encounterDisplayName(encounter),
    expediente:
      subject?.recordNumber ??
      subject?.activeLabel?.operationalLabel ??
      encounter.operationalLabel ??
      '—',
    curp: subject?.curp?.trim() || 'No capturado',
    age: subjectAgeLabel(subject),
    sex: biologicalSexLabel(subject?.biologicalSex),
  };
}

export function triageLevelBannerLabel(
  scale: TriageScaleConfigDto | null,
  levelCode: string | null | undefined,
): string {
  return triageLevelLabel(scale, levelCode).toUpperCase();
}
