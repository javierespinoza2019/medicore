import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  listPrescriptionsBySubject,
  frequencyLabel,
  doseLabel,
  type PrescriptionDto,
} from '@/api/prescriptions';
import { useAuth } from '@/hooks/useAuth';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import RecetaPrintModal from './components/RecetaPrintModal';
import type { Receta } from '@/mocks/recetas';

function toPrintReceta(rx: PrescriptionDto): Receta {
  const issued = rx.issuedAtUtc ?? rx.occurredAtUtc;
  const d = new Date(issued);
  let cedula = '';
  try {
    if (rx.authorLicenseSnapshot) {
      const snap = JSON.parse(rx.authorLicenseSnapshot) as { professionalLicense?: string };
      cedula = snap.professionalLicense ?? '';
    }
  } catch {
    cedula = '';
  }
  return {
    id: rx.prescriptionId,
    patientId: rx.subjectId,
    patientName: '',
    patientExpediente: '',
    doctorId: rx.professionalId ?? '',
    doctorName: rx.authorDisplayName,
    doctorCedula: cedula,
    consultaId: rx.encounterId,
    fecha: d.toISOString().slice(0, 10),
    hora: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    medicamentos: rx.items.map((it) => ({
      id: it.prescriptionItemId,
      medicamentoId: it.medicationId,
      nombre: it.genericNameSnapshot,
      presentacion: '',
      concentracion: doseLabel(it.dose),
      dosis: doseLabel(it.dose),
      frecuencia: frequencyLabel(it.frequency),
      via: it.route,
      duracion: it.durationDays != null ? `${it.durationDays} días` : '',
      indicaciones: it.instructions ?? '',
    })),
    indicacionesGenerales: rx.generalInstructions ?? '',
    estado: rx.cancelledAtUtc ? 'cancelada' : 'activa',
    diagnosticoRelacionado: '',
  };
}

export default function Recetas() {
  const [searchParams] = useSearchParams();
  const pacienteParam = searchParams.get('paciente') || '';
  const { user } = useAuth();
  const isDoctor = user?.rol === 'medico';
  const myDoctorId = user?.doctorId?.trim() || null;

  const [list, setList] = useState<PrescriptionDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PrescriptionDto | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    if (!pacienteParam) {
      setList([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await listPrescriptionsBySubject(pacienteParam);
      if (cancelled) return;
      if (!res.success || !res.data) {
        setError(res.message || 'No se pudieron cargar las recetas.');
        setList([]);
      } else {
        setList(res.data);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [pacienteParam]);

  const filtered = useMemo(() => {
    let rows = [...list];
    if (isDoctor) {
      rows = myDoctorId ? rows.filter((r) => r.professionalId === myDoctorId) : [];
    }
    return rows;
  }, [list, isDoctor, myDoctorId]);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Recetas</h1>
        <p className="text-sm text-foreground-600">
          Emisión vía API (M8). Estupefacientes/psicotrópicos impedidos. Seleccione un paciente
          (`?paciente=`) para listar.
        </p>
      </div>

      {!pacienteParam && (
        <p className="rounded border border-secondary-200 bg-secondary-50 px-3 py-2 text-sm">
          Indique el sujeto en la URL (`?paciente={'{subjectId}'}`) o emita desde consulta/urgencias.
        </p>
      )}

      {loading && <p className="text-sm">Cargando…</p>}
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}

      <ul className="space-y-2">
        {filtered.map((rx) => (
          <li key={rx.prescriptionId}>
            <button
              type="button"
              className="w-full rounded border border-secondary-200 bg-white px-3 py-2 text-left hover:bg-secondary-50"
              onClick={() => setSelected(rx)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {new Date(rx.issuedAtUtc ?? rx.occurredAtUtc).toLocaleString('es-MX')} ·{' '}
                  {rx.authorDisplayName}
                </span>
                <Badge variant={rx.cancelledAtUtc ? 'warning' : rx.signedAtUtc ? 'success' : 'secondary'}>
                  {rx.cancelledAtUtc ? 'Cancelada' : rx.signedAtUtc ? 'Firmada' : 'Borrador'}
                </Badge>
              </div>
              <p className="text-xs text-foreground-600">
                Alergias al emitir: {rx.allergyStatusAtIssue} · {rx.items.length} ítem(s)
              </p>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="rounded border border-secondary-200 bg-white p-4 space-y-2">
          <h2 className="font-medium">Detalle</h2>
          <p className="text-xs text-foreground-600">{selected.firmaDescripcionLegible}</p>
          <ul className="text-sm list-disc list-inside">
            {selected.items.map((it) => (
              <li key={it.prescriptionItemId}>
                {it.genericNameSnapshot} · {doseLabel(it.dose)} · {it.route} · {frequencyLabel(it.frequency)}
              </li>
            ))}
          </ul>
          <Button variant="secondary" onClick={() => setPrintOpen(true)}>Vista de impresión</Button>
        </div>
      )}

      {printOpen && selected && (
        <RecetaPrintModal
          receta={toPrintReceta(selected)}
          isOpen={printOpen}
          onClose={() => setPrintOpen(false)}
        />
      )}
    </div>
  );
}
