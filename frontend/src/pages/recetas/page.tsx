import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  listPrescriptionsBySubject,
  cancelPrescription,
  doseLabel,
  frequencyLabel,
  type PrescriptionDto,
} from '@/api/prescriptions';
import { displayNameOf, getSubject } from '@/api/subjects';
import { useAuth } from '@/hooks/useAuth';
import { usePagination } from '@/hooks/usePagination';
import { mensajeDeFalla } from '@/api/errors';
import { exportToExcel } from '@/utils/exportUtils';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import PaginationControls from '@/components/feature/PaginationControls';
import RecetaPrintModal from './components/RecetaPrintModal';
import {
  computePrescriptionStats,
  filterPrescriptions,
  formatPrescriptionDate,
  prescriptionStatusBadge,
  prescriptionStatusLabel,
  prescriptionToRecetaView,
  prescriptionUiStatus,
  type PrescriptionFilterStatus,
} from '@/utils/prescriptionPresentation';

const STATUS_OPTS: { value: PrescriptionFilterStatus; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'firmada', label: 'Firmadas' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'cancelada', label: 'Canceladas' },
];

export default function Recetas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const pacienteParam = searchParams.get('paciente') || '';
  const recetaParam = searchParams.get('receta') || '';
  const { user } = useAuth();
  const isDoctor = user?.rol === 'medico';
  const myDoctorId = user?.doctorId?.trim() || null;

  const [list, setList] = useState<PrescriptionDto[]>([]);
  const [patientName, setPatientName] = useState('');
  const [patientExpediente, setPatientExpediente] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PrescriptionDto | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<PrescriptionFilterStatus>('todas');

  useEffect(() => {
    if (!pacienteParam) {
      setList([]);
      setPatientName('');
      setPatientExpediente('');
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      const [rxRes, subRes] = await Promise.all([
        listPrescriptionsBySubject(pacienteParam),
        getSubject(pacienteParam),
      ]);
      if (cancelled) return;
      if (!rxRes.success || !rxRes.data) {
        setError(mensajeDeFalla(rxRes.failure).titulo || rxRes.message || 'No se pudieron cargar las recetas.');
        setList([]);
      } else {
        setList(rxRes.data);
      }
      if (subRes.success && subRes.data) {
        setPatientName(displayNameOf(subRes.data));
        setPatientExpediente(
          subRes.data.recordNumber || subRes.data.activeLabel?.operationalLabel || '',
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pacienteParam]);

  useEffect(() => {
    if (!recetaParam || !list.length) return;
    const found = list.find((r) => r.prescriptionId === recetaParam);
    if (found) setSelected(found);
  }, [recetaParam, list]);

  const filtered = useMemo(
    () =>
      filterPrescriptions(list, {
        search,
        status: filterEstado,
        professionalId: isDoctor ? myDoctorId : null,
      }),
    [list, search, filterEstado, isDoctor, myDoctorId],
  );

  const stats = useMemo(() => computePrescriptionStats(list), [list]);
  const pagination = usePagination(filtered, 10);
  const { setCurrentPage, ...paginationProps } = pagination;

  const handleExportExcel = () => {
    const rows = filtered.map((r) => ({
      Folio: r.prescriptionId.slice(0, 8),
      Paciente: patientName,
      Medico: r.authorDisplayName,
      Fecha: formatPrescriptionDate(r),
      Estado: prescriptionStatusLabel(prescriptionUiStatus(r)),
      Medicamentos: r.items.length,
    }));
    exportToExcel(rows, `recetas-${pacienteParam || 'listado'}`);
  };

  const handleSelect = (rx: PrescriptionDto) => {
    if (selected?.prescriptionId === rx.prescriptionId) {
      setSelected(null);
      setShowCancelForm(false);
      setCancelReason('');
      if (recetaParam) {
        const next = new URLSearchParams(searchParams);
        next.delete('receta');
        setSearchParams(next, { replace: true });
      }
      return;
    }
    setSelected(rx);
    setShowCancelForm(false);
    setCancelReason('');
    setCancelError(null);
    const next = new URLSearchParams(searchParams);
    next.set('receta', rx.prescriptionId);
    if (pacienteParam) next.set('paciente', pacienteParam);
    setSearchParams(next, { replace: true });
  };

  const handleCancelSelected = async () => {
    if (!selected) return;
    if (!cancelReason.trim()) {
      setCancelError('Indique el motivo de cancelación.');
      return;
    }
    setCancelBusy(true);
    setCancelError(null);
    const res = await cancelPrescription(selected.prescriptionId, cancelReason.trim());
    if (!res.success || !res.data) {
      setCancelError(mensajeDeFalla(res.failure).titulo || res.message || 'No se pudo cancelar.');
      setCancelBusy(false);
      return;
    }
    setList((prev) =>
      prev.map((p) => (p.prescriptionId === res.data!.prescriptionId ? res.data! : p)),
    );
    setSelected(res.data);
    setShowCancelForm(false);
    setCancelReason('');
    setCancelBusy(false);
  };

  const canCancelSelected =
    selected && selected.signedAtUtc && !selected.cancelledAtUtc;

  return (
    <div className="space-y-4 p-4 md:p-6" data-testid="page-recetas">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground-900">Recetas</h1>
          <p className="text-sm text-foreground-500">
            Emisión vía API (M8). Estupefacientes/psicotrópicos impedidos.
            {patientName ? ` · ${patientName}` : ''}
          </p>
        </div>
        {pacienteParam && filtered.length > 0 && (
          <Button variant="secondary" size="sm" onClick={handleExportExcel}>
            Exportar Excel
          </Button>
        )}
      </div>

      {!pacienteParam && (
        <Card padding="md">
          <p className="text-sm text-foreground-600">
            Indique el sujeto en la URL (`?paciente={'{subjectId}'}`) o emita desde consulta/urgencias.
          </p>
        </Card>
      )}

      {pacienteParam && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card padding="sm">
              <p className="text-lg font-bold tabular-nums text-foreground-900">{stats.total}</p>
              <p className="text-[10px] uppercase tracking-wide text-foreground-500">Total</p>
            </Card>
            <Card padding="sm">
              <p className="text-lg font-bold tabular-nums text-emerald-600">{stats.firmadas}</p>
              <p className="text-[10px] uppercase tracking-wide text-foreground-500">Firmadas</p>
            </Card>
            <Card padding="sm">
              <p className="text-lg font-bold tabular-nums text-foreground-700">{stats.todayCount}</p>
              <p className="text-[10px] uppercase tracking-wide text-foreground-500">Hoy</p>
            </Card>
            <Card padding="sm">
              <p className="text-lg font-bold tabular-nums text-foreground-700">{stats.totalItems}</p>
              <p className="text-[10px] uppercase tracking-wide text-foreground-500">Medicamentos</p>
            </Card>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              type="search"
              aria-label="Buscar recetas"
              placeholder="Buscar por médico o medicamento…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="recetas-buscar"
              className="min-w-[200px] flex-1 rounded-lg border border-secondary-200 bg-background-0 px-3 py-2 text-sm"
            />
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value as PrescriptionFilterStatus)}
              className="rounded-lg border border-secondary-200 bg-background-0 px-3 py-2 text-sm"
              aria-label="Filtrar por estado"
            >
              {STATUS_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {loading && <p className="text-sm text-foreground-500">Cargando…</p>}
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {!loading && pacienteParam && filtered.length === 0 && (
        <p className="text-sm text-foreground-500">Sin recetas que coincidan con los filtros.</p>
      )}

      <ul className="space-y-2" data-testid="lista-recetas">
        {paginationProps.paginatedData.map((rx) => {
          const status = prescriptionUiStatus(rx);
          const badge = prescriptionStatusBadge[status];
          return (
            <li key={rx.prescriptionId}>
              <button
                type="button"
                className={`w-full rounded-lg border px-3 py-2 text-left transition-base hover:bg-secondary-50/50 ${
                  selected?.prescriptionId === rx.prescriptionId
                    ? 'border-primary-300 bg-primary-50/30'
                    : 'border-secondary-200 bg-background-0'
                }`}
                onClick={() => handleSelect(rx)}
                data-testid={`receta-row-${rx.prescriptionId}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground-900">
                    {formatPrescriptionDate(rx)} · {rx.authorDisplayName}
                  </span>
                  <Badge variant={badge.variant}>{prescriptionStatusLabel(status)}</Badge>
                </div>
                <p className="text-xs text-foreground-600">
                  Alergias al emitir: {rx.allergyStatusAtIssue} · {rx.items.length} ítem(s)
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      {pacienteParam && filtered.length > 0 && (
        <PaginationControls
          {...paginationProps}
          setCurrentPage={setCurrentPage}
        />
      )}

      {selected && (
        <Card padding="md" data-testid="receta-detalle">
          <h2 className="font-medium text-foreground-900">Detalle</h2>
          <p className="mt-1 text-xs text-foreground-600">{selected.firmaDescripcionLegible}</p>
          <ul className="mt-3 list-inside list-disc text-sm text-foreground-700">
            {selected.items.map((it) => (
              <li key={it.prescriptionItemId}>
                {it.genericNameSnapshot} · {doseLabel(it.dose)} · {it.route} ·{' '}
                {frequencyLabel(it.frequency)}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPrintOpen(true)}>
              Vista de impresión
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/app/consultas?encuentro=${selected.encounterId}`)}
            >
              Ver consulta
            </Button>
            {canCancelSelected && !showCancelForm && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCancelForm(true)}
                data-testid="receta-cancelar-detalle"
              >
                Cancelar receta
              </Button>
            )}
          </div>
          {showCancelForm && canCancelSelected && (
            <div className="mt-4 space-y-2 border-t border-secondary-100 pt-4">
              <label className="block text-xs text-foreground-600">
                Motivo de cancelación
                <textarea
                  className="mt-1 w-full rounded border border-secondary-200 px-2 py-1 text-sm"
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  data-testid="receta-motivo-cancelacion"
                />
              </label>
              {cancelError && (
                <p className="text-sm text-red-700" role="alert">{cancelError}</p>
              )}
              <Button
                variant="primary"
                size="sm"
                disabled={cancelBusy}
                onClick={() => void handleCancelSelected()}
                data-testid="receta-confirmar-cancelacion"
              >
                Confirmar cancelación
              </Button>
            </div>
          )}
        </Card>
      )}

      {printOpen && selected && (
        <RecetaPrintModal
          receta={prescriptionToRecetaView(selected, {
            patientName,
            patientExpediente,
            doctorName: selected.authorDisplayName,
          })}
          isOpen={printOpen}
          onClose={() => setPrintOpen(false)}
          sucursalNombre={user?.sucursales?.[0] ?? ''}
        />
      )}
    </div>
  );
}
