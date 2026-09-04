/**
 * Expediente clínico unificado — timeline de episodios reales (M4/M5/M6/M7/M8).
 * Sin mocks de consultas, urgencias, recetas ni estudios.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  estadoConfig,
  encounterDisplayName,
  listEncountersBySubject,
  type EncounterDto,
} from '@/api/encounters';
import {
  allergyStatusIsWarning,
  allergyStatusLabel,
  getClinicalRecord,
  type ClinicalRecordDto,
} from '@/api/clinicalRecord';
import { listNotesByEncounter, type ClinicalNoteDto } from '@/api/notes';
import { listPrescriptionsBySubject, type PrescriptionDto } from '@/api/prescriptions';
import {
  getEffectiveTriageScale,
  getTriage,
  type TriageDto,
  type TriageScaleConfigDto,
  VITAL_LABELS,
  type CanonicalVitalCode,
} from '@/api/triage';
import { mensajeDeFalla } from '@/api/errors';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import HistoriaClinicaReadOnly from '@/pages/consultas/components/HistoriaClinicaReadOnly';
import {
  formatPrescriptionDate,
  prescriptionStatusLabel,
  prescriptionUiStatus,
} from '@/utils/prescriptionPresentation';
import { triageLevelLabel } from '@/utils/triageScalePresentation';
import ExpedientePrintModal from './ExpedientePrintModal';

type EntryType = 'consulta' | 'urgencia';

type EncounterBundle = {
  encounter: EncounterDto;
  notes: ClinicalNoteDto[];
  triage: TriageDto | null;
  prescriptions: PrescriptionDto[];
};

type TimelineEntry = {
  id: string;
  type: EntryType;
  fecha: string;
  hora: string;
  sortKey: string;
  bundle: EncounterBundle;
};

const typeConfig: Record<
  EntryType,
  {
    label: string;
    icon: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
    badgeVariant: 'success' | 'warning' | 'info' | 'danger';
  }
> = {
  consulta: {
    label: 'Consulta',
    icon: 'ri-stethoscope-line',
    bg: 'bg-primary-50',
    text: 'text-primary-700',
    border: 'border-primary-200',
    dot: 'bg-primary-500',
    badgeVariant: 'success',
  },
  urgencia: {
    label: 'Urgencia',
    icon: 'ri-hospital-line',
    bg: 'bg-red-500/10',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
    badgeVariant: 'danger',
  },
};

function splitUtc(iso: string): { fecha: string; hora: string } {
  try {
    const d = new Date(iso);
    return {
      fecha: d.toISOString().slice(0, 10),
      hora: d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    };
  } catch {
    return { fecha: '', hora: '' };
  }
}

function formatearFecha(fecha: string): string {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${parseInt(d, 10)} ${meses[parseInt(m, 10) - 1]} ${y}`;
}

function notePreview(body: Record<string, unknown>): string {
  const parts = ['subjetivo', 'objetivo', 'analisis', 'plan']
    .map((k) => body[k])
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  return parts.join(' · ') || 'Sin texto capturado en cuerpo SOAP.';
}

function vitalLabel(code: string): string {
  if (code in VITAL_LABELS) return VITAL_LABELS[code as CanonicalVitalCode];
  return code;
}

export default function ExpedienteUnificado({ patientId }: { patientId: string }) {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<EntryType | 'todos'>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [showHistoria, setShowHistoria] = useState(false);
  const [clinicalRecord, setClinicalRecord] = useState<ClinicalRecordDto | null>(null);
  const [scale, setScale] = useState<TriageScaleConfigDto | null>(null);
  const [bundles, setBundles] = useState<EncounterBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);

      const [recordRes, encRes, rxRes] = await Promise.all([
        getClinicalRecord(patientId),
        listEncountersBySubject(patientId),
        listPrescriptionsBySubject(patientId),
      ]);

      if (cancelled) return;

      if (recordRes.success && recordRes.data) {
        setClinicalRecord(recordRes.data);
      } else {
        setClinicalRecord(null);
      }

      if (!encRes.success || !encRes.data) {
        setError(
          mensajeDeFalla(encRes.failure).titulo ||
            encRes.message ||
            'No se pudo cargar el historial de episodios.',
        );
        setBundles([]);
        setLoading(false);
        return;
      }

      const rxByEncounter = new Map<string, PrescriptionDto[]>();
      if (rxRes.success && rxRes.data) {
        for (const rx of rxRes.data) {
          const list = rxByEncounter.get(rx.encounterId) ?? [];
          list.push(rx);
          rxByEncounter.set(rx.encounterId, list);
        }
      }

      const branchId = encRes.data[0]?.branchId;
      if (branchId) {
        const scaleRes = await getEffectiveTriageScale(branchId);
        if (!cancelled && scaleRes.success && scaleRes.data) {
          setScale(scaleRes.data);
        }
      }

      const loaded = await Promise.all(
        encRes.data.map(async (enc) => {
          const [notesRes, triageRes] = await Promise.all([
            listNotesByEncounter(enc.encounterId),
            getTriage(enc.encounterId),
          ]);
          return {
            encounter: enc,
            notes: notesRes.success ? (notesRes.data ?? []) : [],
            triage: triageRes.success ? (triageRes.data ?? null) : null,
            prescriptions: rxByEncounter.get(enc.encounterId) ?? [],
          } satisfies EncounterBundle;
        }),
      );

      if (!cancelled) {
        setBundles(loaded);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const entries = useMemo((): TimelineEntry[] => {
    return bundles
      .map((bundle) => {
        const type: EntryType =
          bundle.encounter.encounterType === 'consulta_externa' ? 'consulta' : 'urgencia';
        const { fecha, hora } = splitUtc(bundle.encounter.arrivalAtUtc);
        return {
          id: bundle.encounter.encounterId,
          type,
          fecha,
          hora,
          sortKey: bundle.encounter.arrivalAtUtc,
          bundle,
        };
      })
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [bundles]);

  const filtered =
    filterType === 'todos' ? entries : entries.filter((e) => e.type === filterType);

  const counts = useMemo(
    () => ({
      consulta: entries.filter((e) => e.type === 'consulta').length,
      urgencia: entries.filter((e) => e.type === 'urgencia').length,
    }),
    [entries],
  );

  const allergyBanner = clinicalRecord ? (
    <div
      className={`rounded-xl border px-4 py-3 ${
        allergyStatusIsWarning(clinicalRecord.allergyStatus.status)
          ? 'border-amber-300 bg-amber-50 text-amber-900'
          : 'border-emerald-200 bg-emerald-50 text-emerald-900'
      }`}
      role="status"
    >
      <p className="text-sm font-semibold">
        {allergyStatusLabel(clinicalRecord.allergyStatus.status, clinicalRecord.allergies.length)}
      </p>
      {clinicalRecord.allergyStatus.status === 'no_interrogado' &&
        clinicalRecord.allergies.length === 0 && (
          <p className="mt-1 text-2xs">
            Lista vacía no significa «sin alergias». Estado explícito pendiente de captura.
          </p>
        )}
      {clinicalRecord.allergies.map((a) => (
        <p key={a.allergyId} className="mt-1 text-xs">
          {a.substance}
          {a.manifestation ? ` · ${a.manifestation}` : ''}
        </p>
      ))}
      <button
        type="button"
        onClick={() => setShowHistoria((v) => !v)}
        className="mt-2 cursor-pointer text-xs underline"
      >
        {showHistoria ? 'Ocultar historia clínica' : 'Ver historia clínica'}
      </button>
    </div>
  ) : null;

  if (loading) {
    return <p className="text-sm text-foreground-500">Cargando expediente unificado…</p>;
  }

  if (error) {
    return (
      <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
        {error}
      </p>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-4" data-testid="expediente-unificado">
        {allergyBanner}
        {showHistoria && <HistoriaClinicaReadOnly patientId={patientId} />}
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100">
            <i className="ri-folder-open-line text-2xl text-foreground-400" aria-hidden />
          </div>
          <h3 className="mb-1 font-heading text-base font-semibold text-foreground-800">
            Sin episodios clínicos
          </h3>
          <p className="max-w-sm text-center text-sm text-foreground-500">
            Este sujeto aún no tiene consultas ni urgencias registradas en la API.
          </p>
        </div>
      </div>
    );
  }

  const typeFilters: { key: EntryType | 'todos'; label: string; count: number; icon: string }[] = [
    { key: 'todos', label: 'Todos', count: entries.length, icon: 'ri-file-list-3-line' },
    { key: 'consulta', label: 'Consultas', count: counts.consulta, icon: 'ri-stethoscope-line' },
    { key: 'urgencia', label: 'Urgencias', count: counts.urgencia, icon: 'ri-hospital-line' },
  ];

  return (
    <div className="space-y-5" data-testid="expediente-unificado">
      {allergyBanner}
      {showHistoria && <HistoriaClinicaReadOnly patientId={patientId} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-sm font-semibold text-foreground-900">
          Expediente clínico unificado
        </h3>
        <button
          type="button"
          onClick={() => setShowPrint(true)}
          className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-medium text-primary-700 transition-base hover:bg-primary-100"
        >
          <i className="ri-printer-line" aria-hidden />
          Imprimir resumen
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        {typeFilters
          .filter((f) => f.key !== 'todos')
          .map((f) => {
            const cfg = typeConfig[f.key as EntryType];
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilterType(filterType === f.key ? 'todos' : f.key)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                  filterType === f.key
                    ? `${cfg.border} ${cfg.bg} ring-2 ${cfg.border}`
                    : 'border-secondary-200 bg-background-50 hover:border-secondary-300'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${cfg.bg}`}>
                  <i className={`${cfg.icon} ${cfg.text} text-lg`} aria-hidden />
                </div>
                <div className="text-left">
                  <p className="font-heading text-2xl font-bold text-foreground-900">{f.count}</p>
                  <p className="text-xs text-foreground-500">{f.label}</p>
                </div>
              </button>
            );
          })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {typeFilters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilterType(f.key)}
            className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              filterType === f.key
                ? 'bg-foreground-900 text-background-50'
                : 'bg-secondary-100 text-foreground-600 hover:bg-secondary-200'
            }`}
          >
            <i className={`${f.icon} text-[10px]`} aria-hidden />
            {f.label}
            <span
              className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                filterType === f.key
                  ? 'bg-background-50/20 text-background-50'
                  : 'bg-secondary-200 text-foreground-500'
              }`}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      <div className="relative pl-8">
        <div className="absolute bottom-2 left-[14px] top-2 w-px bg-secondary-200" />
        <div className="space-y-1">
          {filtered.map((entry, idx) => {
            const cfg = typeConfig[entry.type];
            const isExpanded = expandedId === entry.id;
            const { encounter, notes, triage, prescriptions } = entry.bundle;
            const prevEntry = idx > 0 ? filtered[idx - 1] : null;
            const showDateHeader = !prevEntry || prevEntry.fecha !== entry.fecha;
            const displayName = encounterDisplayName(encounter);
            const triageLabel = triageLevelLabel(scale, encounter.triageLevel ?? triage?.level);

            return (
              <div key={entry.id}>
                {showDateHeader && (
                  <div className="mb-2 mt-4 flex items-center gap-3 first:mt-0">
                    <div className="absolute left-0 flex w-[30px] items-center justify-center">
                      <div className="h-2.5 w-2.5 rounded-full border-2 border-background-50 bg-foreground-300" />
                    </div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground-500">
                      {formatearFecha(entry.fecha)}
                    </h4>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="group mb-2 w-full cursor-pointer text-left transition-all"
                >
                  <div
                    className={`relative rounded-xl border py-3 pr-3 transition-all ${
                      isExpanded
                        ? `${cfg.border} ${cfg.bg} shadow-sm`
                        : 'border-secondary-100 bg-background-50 hover:border-secondary-300'
                    }`}
                  >
                    <div
                      className={`absolute left-[-22px] top-4 h-3.5 w-3.5 rounded-full border-2 border-background-50 ${cfg.dot}`}
                    />
                    <div className="pl-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={cfg.badgeVariant} size="sm">
                          {cfg.label}
                        </Badge>
                        <span className="text-xs text-foreground-500">{entry.hora} hrs</span>
                        <span
                          className={`rounded px-2 py-0.5 text-2xs ${
                            estadoConfig[encounter.state]?.className ??
                            'bg-secondary-100 text-foreground-700'
                          }`}
                        >
                          {estadoConfig[encounter.state]?.label ?? encounter.state}
                        </span>
                        {entry.type === 'urgencia' && encounter.triageLevel && (
                          <span className="rounded-full bg-secondary-100 px-2 py-0.5 text-2xs font-medium text-foreground-700">
                            {triageLabel}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-foreground-800">
                        Turno {encounter.turnNumber} · {displayName}
                      </p>
                      <p className="mt-1 text-xs text-foreground-500">
                        {notes.length} nota(s) · {prescriptions.length} receta(s)
                        {triage?.chiefComplaint ? ` · ${triage.chiefComplaint.slice(0, 60)}` : ''}
                      </p>
                      <div className="mt-2 flex items-center gap-1">
                        <i
                          className={`text-xs ${cfg.text} ${isExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}
                          aria-hidden
                        />
                        <span className="text-2xs text-foreground-400">
                          {isExpanded ? 'Colapsar' : 'Ver detalles'}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 space-y-3 border-t border-secondary-200 pt-3">
                          {triage && (
                            <Card padding="sm">
                              <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-700">
                                Triage
                              </h5>
                              {triage.chiefComplaint && (
                                <p className="text-sm text-foreground-700">{triage.chiefComplaint}</p>
                              )}
                              {triage.vitals.length > 0 && (
                                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                  {triage.vitals.map((v, i) => (
                                    <div
                                      key={`${v.signCode}-${i}`}
                                      className="rounded-lg border border-secondary-100 bg-secondary-50 p-2 text-center"
                                    >
                                      <p className="text-2xs text-foreground-500">{vitalLabel(v.signCode)}</p>
                                      <p className="text-xs font-semibold text-foreground-800">
                                        {v.state === 'medido' && v.value != null
                                          ? `${v.value} ${v.unit}`
                                          : v.notMeasuredReason ?? 'no tomado'}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </Card>
                          )}

                          {notes.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="text-xs font-semibold uppercase tracking-wider text-foreground-700">
                                Notas clínicas
                              </h5>
                              {notes.map((n) => (
                                <div
                                  key={n.noteId}
                                  className="rounded-lg border border-secondary-200 bg-background-0 p-3 text-sm"
                                >
                                  <p className="font-medium text-foreground-800">
                                    {n.noteType} · {n.authorDisplayName}
                                  </p>
                                  <p className="mt-1 text-xs text-foreground-600">
                                    {notePreview(n.body)}
                                  </p>
                                  <p className="mt-1 text-2xs text-foreground-400">
                                    {n.signedAtUtc ? 'Firmada' : 'Borrador'} ·{' '}
                                    {new Date(n.occurredAtUtc).toLocaleString('es-MX')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {prescriptions.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="text-xs font-semibold uppercase tracking-wider text-foreground-700">
                                Recetas
                              </h5>
                              {prescriptions.map((rx) => (
                                <div
                                  key={rx.prescriptionId}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-secondary-200 px-3 py-2 text-xs"
                                >
                                  <span>
                                    {formatPrescriptionDate(rx)} · {rx.items.length} medicamento(s)
                                  </span>
                                  <Badge variant="secondary" size="sm">
                                    {prescriptionStatusLabel(prescriptionUiStatus(rx))}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}

                          {notes.length === 0 && prescriptions.length === 0 && !triage && (
                            <p className="text-sm text-foreground-500">
                              Sin notas, recetas ni triage capturado en este episodio.
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (entry.type === 'consulta') {
                                  navigate(`/app/consultas?encuentro=${encounter.encounterId}`);
                                } else {
                                  navigate(`/app/urgencias`);
                                }
                              }}
                            >
                              Abrir episodio
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Card padding="md" className="border-dashed border-secondary-300 bg-secondary-50/30">
        <p className="text-xs text-foreground-500">
          Estudios, certificados, consentimientos y normatividad legal se integrarán cuando exista API
          dedicada. Este timeline solo muestra episodios, notas, triage y recetas reales.
        </p>
      </Card>

      <ExpedientePrintModal
        patientId={patientId}
        isOpen={showPrint}
        onClose={() => setShowPrint(false)}
      />
    </div>
  );
}
