import {
  doseLabel,
  frequencyLabel,
  type PrescriptionDto,
} from '@/api/prescriptions';
import type { RecetaView } from '@/pages/consultas/types';

export type PrescriptionUiStatus = 'borrador' | 'firmada' | 'cancelada';

export type PrescriptionFilterStatus = PrescriptionUiStatus | 'todas';

export function prescriptionUiStatus(rx: PrescriptionDto): PrescriptionUiStatus {
  if (rx.cancelledAtUtc) return 'cancelada';
  if (rx.signedAtUtc) return 'firmada';
  return 'borrador';
}

/** SC-04: receta emitida pero sin firmar. */
export function isPrescriptionPending(rx: PrescriptionDto): boolean {
  return !rx.signedAtUtc && !rx.cancelledAtUtc;
}

export function hasPendingPrescriptions(list: PrescriptionDto[]): boolean {
  return list.some(isPrescriptionPending);
}

export function prescriptionStatusLabel(status: PrescriptionUiStatus): string {
  switch (status) {
    case 'cancelada':
      return 'Cancelada';
    case 'firmada':
      return 'Firmada';
    default:
      return 'Borrador';
  }
}

export const prescriptionStatusBadge: Record<
  PrescriptionUiStatus,
  { variant: 'success' | 'warning' | 'secondary'; color: string }
> = {
  firmada: {
    variant: 'success',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  borrador: {
    variant: 'secondary',
    color: 'bg-secondary-100 text-foreground-600 border-secondary-200',
  },
  cancelada: {
    variant: 'warning',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
  },
};

export type PrescriptionStats = {
  total: number;
  firmadas: number;
  canceladas: number;
  borradores: number;
  todayCount: number;
  totalItems: number;
};

export function computePrescriptionStats(list: PrescriptionDto[]): PrescriptionStats {
  const today = new Date().toISOString().slice(0, 10);
  let firmadas = 0;
  let canceladas = 0;
  let borradores = 0;
  let todayCount = 0;
  let totalItems = 0;

  for (const rx of list) {
    const status = prescriptionUiStatus(rx);
    if (status === 'firmada') firmadas += 1;
    else if (status === 'cancelada') canceladas += 1;
    else borradores += 1;

    const issued = rx.issuedAtUtc ?? rx.occurredAtUtc;
    if (issued.slice(0, 10) === today) todayCount += 1;
    totalItems += rx.items.length;
  }

  return {
    total: list.length,
    firmadas,
    canceladas,
    borradores,
    todayCount,
    totalItems,
  };
}

export function filterPrescriptions(
  list: PrescriptionDto[],
  opts: {
    search?: string;
    status?: PrescriptionFilterStatus;
    professionalId?: string | null;
    encounterId?: string | null;
  },
): PrescriptionDto[] {
  let rows = [...list];

  if (opts.professionalId) {
    rows = rows.filter((r) => r.professionalId === opts.professionalId);
  }
  if (opts.encounterId) {
    rows = rows.filter((r) => r.encounterId === opts.encounterId);
  }
  if (opts.status && opts.status !== 'todas') {
    rows = rows.filter((r) => prescriptionUiStatus(r) === opts.status);
  }
  if (opts.search?.trim()) {
    const q = opts.search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.authorDisplayName.toLowerCase().includes(q) ||
        r.prescriptionId.toLowerCase().includes(q) ||
        r.items.some((it) => it.genericNameSnapshot.toLowerCase().includes(q)),
    );
  }

  return rows.sort((a, b) => {
    const da = a.issuedAtUtc ?? a.occurredAtUtc;
    const db = b.issuedAtUtc ?? b.occurredAtUtc;
    return db.localeCompare(da);
  });
}

function parseLicenseSnapshot(raw: string | null): string {
  if (!raw?.trim()) return '';
  try {
    const snap = JSON.parse(raw) as { professionalLicense?: string };
    return snap.professionalLicense ?? raw;
  } catch {
    return raw;
  }
}

/** Mapea PrescriptionDto a vista de impresión/listado. */
export function prescriptionToRecetaView(
  rx: PrescriptionDto,
  meta: {
    patientName?: string;
    patientExpediente?: string;
    doctorName?: string;
    doctorCedula?: string;
  } = {},
): RecetaView {
  const issued = rx.issuedAtUtc ?? rx.occurredAtUtc;
  const d = new Date(issued);
  const uiStatus = prescriptionUiStatus(rx);

  return {
    id: rx.prescriptionId,
    patientId: rx.subjectId,
    patientName: meta.patientName ?? '',
    patientExpediente: meta.patientExpediente ?? '',
    doctorId: rx.professionalId ?? '',
    doctorName: meta.doctorName || rx.authorDisplayName,
    doctorCedula: meta.doctorCedula || parseLicenseSnapshot(rx.authorLicenseSnapshot),
    consultaId: rx.encounterId,
    fecha: d.toISOString().slice(0, 10),
    hora: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    medicamentos: rx.items.map((it) => ({
      id: it.prescriptionItemId,
      medicamentoId: it.medicationId,
      nombre: it.genericNameSnapshot,
      presentacion: it.brandNameSnapshot ?? '',
      concentracion: doseLabel(it.dose),
      dosis: doseLabel(it.dose),
      frecuencia: frequencyLabel(it.frequency),
      via: it.route,
      duracion: it.durationDays != null ? `${it.durationDays} días` : '',
      indicaciones: it.instructions ?? '',
    })),
    indicacionesGenerales: rx.generalInstructions ?? '',
    estado: uiStatus === 'cancelada' ? 'cancelada' : uiStatus === 'firmada' ? 'activa' : 'activa',
    diagnosticoRelacionado: '',
  };
}

export function formatPrescriptionDate(rx: PrescriptionDto): string {
  const issued = rx.issuedAtUtc ?? rx.occurredAtUtc;
  try {
    return new Date(issued).toLocaleString('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return issued;
  }
}
