import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  encounterDisplayName,
  getEncounter,
  type EncounterDto,
} from '@/api/encounters';
import { listBranches, type BranchDto } from '@/api/branches';
import { getSubject, type SubjectDto } from '@/api/subjects';
import {
  buildVitalsFromForm,
  CANONICAL_VITAL_CODES,
  getEffectiveTriageScale,
  getTriage,
  VITAL_DEFAULT_UNITS,
  VITAL_LABELS,
  type CanonicalVitalCode,
  type TriageDto,
  type TriageScaleConfigDto,
  type TriageScaleLevel,
} from '@/api/triage';
import { useEncounterQueue } from '@/hooks/useEncounterQueue';
import { useDevice } from '@/hooks/DeviceProvider';
import { runClinicalOutboxCommand, isClinicalOutboxErr } from '@/sync/runClinicalOutboxCommand';
import {
  accentForEncounter,
  computeQueueStats,
  formatArrivalLocal,
  formatWaitLabel,
  waitMinutesSince,
} from '@/utils/encounterQueuePresentation';
import { findTriageScaleLevel } from '@/utils/triageScalePresentation';
import {
  parseVitalNumber,
  validatePresionPar,
  validateVital,
} from '@/utils/vitalValidation';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Input from '@/components/base/Input';
import EncounterQueueStatsBar from '@/components/feature/EncounterQueueStatsBar';
import IdentityHeader from '@/components/feature/IdentityHeader';
import QueueLiveBanner from '@/components/feature/QueueLiveBanner';
import TriagePrintModal from '@/pages/triage/components/TriagePrintModal';

type VitalForm = Record<CanonicalVitalCode, string>;

const emptyVitals = (): VitalForm =>
  Object.fromEntries(CANONICAL_VITAL_CODES.map((c) => [c, ''])) as VitalForm;

function levelPresentation(
  scale: TriageScaleConfigDto | null,
  code: string | null | undefined,
): TriageScaleLevel | null {
  return findTriageScaleLevel(scale, code);
}

function computeImc(peso: string, talla: string): { value: number; label: string } | null {
  const p = parseVitalNumber(peso);
  const t = parseVitalNumber(talla);
  if (p == null || t == null || t <= 0) return null;
  const imc = p / (t * t);
  let label = 'Peso normal';
  if (imc < 18.5) label = 'Bajo peso';
  else if (imc >= 30) label = 'Obesidad';
  else if (imc >= 25) label = 'Sobrepeso';
  return { value: Math.round(imc * 10) / 10, label };
}

type QueueFilter = 'todos' | 'sin_clasificar' | string;

function hasPrintableTriageContent(
  level: string | null,
  chiefComplaint: string,
  vitals: VitalForm,
): boolean {
  if (level) return true;
  if (chiefComplaint.trim()) return true;
  return CANONICAL_VITAL_CODES.some((c) => vitals[c]?.trim());
}

function buildDraftTriageSnapshot(
  encounter: EncounterDto,
  scale: TriageScaleConfigDto,
  existing: TriageDto | null,
  form: {
    level: string | null;
    chiefComplaint: string;
    vitals: VitalForm;
    notMeasuredReason: string;
    painScore: string;
    painAssessable: 'valorable' | 'no_valorable';
  },
): TriageDto {
  const levelMeta = findTriageScaleLevel(scale, form.level);
  return {
    triageId: existing?.triageId ?? '',
    encounterId: encounter.encounterId,
    level: form.level,
    scaleCode: scale.scaleCode,
    scaleConfigId: scale.configId,
    levelPriority: levelMeta?.priority ?? null,
    chiefComplaint: form.chiefComplaint.trim() || null,
    painAssessable: form.painAssessable,
    painScore:
      form.painAssessable === 'valorable' ? parseVitalNumber(form.painScore) : null,
    classifiedByProfessionalId: existing?.classifiedByProfessionalId ?? null,
    actorUserId: existing?.actorUserId ?? '',
    actorProfessionalId: existing?.actorProfessionalId ?? null,
    actorDisplayName: existing?.actorDisplayName ?? '—',
    occurredAtUtc: existing?.occurredAtUtc ?? new Date().toISOString(),
    recordedAtUtc: existing?.recordedAtUtc ?? new Date().toISOString(),
    vitalSetId: existing?.vitalSetId ?? null,
    vitals: buildVitalsFromForm(form.vitals, { notMeasuredReason: form.notMeasuredReason }),
  };
}

/**
 * Triage (M5). Layout enriquecido alineado al prototipo; escala vía API (doc 06 §63).
 */
export default function TriagePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const encuentroParam = searchParams.get('encuentro') || '';

  const {
    branchId,
    items,
    loading,
    error,
    refresh,
    allUnclassified,
    liveStatus,
    fromCache,
    cacheAgeLabel,
    showStaleBanner,
  } = useEncounterQueue(false);
  const { allowsClinicalCache, isPendingApproval } = useDevice();

  const [scale, setScale] = useState<TriageScaleConfigDto | null>(null);
  const [scaleError, setScaleError] = useState<string | null>(null);
  const [branch, setBranch] = useState<BranchDto | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [selectedFallback, setSelectedFallback] = useState<EncounterDto | null>(null);
  const [subject, setSubject] = useState<SubjectDto | null>(null);
  const [existing, setExisting] = useState<TriageDto | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [level, setLevel] = useState<string | null>(null);
  const [vitals, setVitals] = useState<VitalForm>(emptyVitals);
  const [notMeasuredReason, setNotMeasuredReason] = useState('no tomado');
  const [painScore, setPainScore] = useState('');
  const [painAssessable, setPainAssessable] = useState<'valorable' | 'no_valorable'>(
    'valorable',
  );
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [queueSearch, setQueueSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('todos');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const selected = useMemo(() => {
    const fromQueue = items.find((e) => e.encounterId === selectedId);
    if (fromQueue) return fromQueue;
    if (selectedFallback?.encounterId === selectedId) return selectedFallback;
    return null;
  }, [items, selectedId, selectedFallback]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedFallback(null);
      return;
    }
    if (items.some((e) => e.encounterId === selectedId)) {
      setSelectedFallback(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await getEncounter(selectedId);
      if (!cancelled && res.success && res.data) setSelectedFallback(res.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, items]);

  const biologicalSex = subject?.biologicalSex ?? null;

  useEffect(() => {
    if (encuentroParam) setSelectedId(encuentroParam);
  }, [encuentroParam]);

  const selectEncounter = (encounterId: string) => {
    setSelectedId(encounterId);
    setShowPrint(false);
    const next = new URLSearchParams(searchParams);
    if (encounterId) next.set('encuentro', encounterId);
    else next.delete('encuentro');
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (!branchId) return;
    void (async () => {
      const res = await getEffectiveTriageScale(branchId);
      if (!res.success || !res.data) {
        setScale(null);
        setScaleError(res.message ?? 'Sin escala de triage configurada.');
        return;
      }
      setScale(res.data);
      setScaleError(null);
    })();
    void (async () => {
      const res = await listBranches(true);
      if (res.success && res.data) {
        const hit =
          res.data.find((b) => b.branchId.toLowerCase() === branchId.toLowerCase()) ??
          res.data.find((b) => b.code.toUpperCase() === 'CENTRAL') ??
          res.data[0] ??
          null;
        setBranch(hit);
      }
    })();
  }, [branchId]);

  const stats = useMemo(
    () => computeQueueStats(items, scale, now),
    [items, scale, now],
  );

  const filteredQueue = useMemo(() => {
    let list = [...items];
    const q = queueSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => encounterDisplayName(e).toLowerCase().includes(q));
    }
    if (queueFilter === 'sin_clasificar') {
      list = list.filter((e) => !e.triageLevel);
    } else if (queueFilter !== 'todos') {
      list = list.filter((e) => e.triageLevel === queueFilter);
    }
    return list;
  }, [items, queueSearch, queueFilter]);

  const loadEncounterTriage = useCallback(async (encounter: EncounterDto) => {
    setSaveMsg(null);
    setSaveErr(null);
    setVitals(emptyVitals());
    setChiefComplaint('');
    setLevel(null);
    setPainScore('');
    setPainAssessable('valorable');
    setNotMeasuredReason('no tomado');
    setExisting(null);
    setSubject(null);

    const [subjRes, triageRes] = await Promise.all([
      getSubject(encounter.subjectId),
      getTriage(encounter.encounterId),
    ]);
    if (subjRes.success && subjRes.data) setSubject(subjRes.data);

    if (triageRes.success && triageRes.data) {
      const t = triageRes.data;
      setExisting(t);
      setLevel(t.level);
      setChiefComplaint(t.chiefComplaint ?? '');
      setPainAssessable(
        t.painAssessable === 'no_valorable' ? 'no_valorable' : 'valorable',
      );
      setPainScore(t.painScore != null ? String(t.painScore) : '');
      const next = emptyVitals();
      for (const m of t.vitals ?? []) {
        const code = m.signCode as CanonicalVitalCode;
        if (CANONICAL_VITAL_CODES.includes(code) && m.state === 'medido' && m.value != null) {
          next[code] = String(m.value);
        }
      }
      setVitals(next);
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    void loadEncounterTriage(selected);
  }, [selected, loadEncounterTriage]);

  function updateVital(code: CanonicalVitalCode, value: string) {
    setVitals((prev) => ({ ...prev, [code]: value }));
  }

  const imc = useMemo(
    () => computeImc(vitals.peso, vitals.talla),
    [vitals.peso, vitals.talla],
  );

  const vitalHints = useMemo(() => {
    const hints: Partial<Record<CanonicalVitalCode, string>> = {};
    for (const code of CANONICAL_VITAL_CODES) {
      const r = validateVital(code, vitals[code], {
        allowEmpty: true,
        biologicalSex,
      });
      if (r.message) hints[code] = r.message;
    }
    const par = validatePresionPar(vitals.tension_sistolica, vitals.tension_diastolica);
    if (par.message) hints.tension_diastolica = par.message;
    return hints;
  }, [vitals, biologicalSex]);

  async function handleSave() {
    if (!selected) return;
    if (!scale) {
      setSaveErr('Configure la escala de triage antes de guardar.');
      return;
    }
    setSaving(true);
    setSaveErr(null);
    setSaveMsg(null);

    const body = {
      level,
      chiefComplaint: chiefComplaint.trim() || null,
      painAssessable,
      painScore:
        painAssessable === 'valorable' ? parseVitalNumber(painScore) : null,
      vitals: buildVitalsFromForm(vitals, { notMeasuredReason }),
    };

    const out = await runClinicalOutboxCommand(
      'triage.save',
      { encounterId: selected.encounterId, ...body },
      { allowsOfflineQueue: allowsClinicalCache, isPendingApproval },
    );
    if (isClinicalOutboxErr(out)) {
      setSaving(false);
      setSaveErr(out.error);
      return;
    }
    if (out.queued) {
      setSaving(false);
      setSaveMsg(
        'Triage guardado en cola local. Se sincronizará al recuperar el enlace (sin bloquear la atención).',
      );
      void refresh();
      return;
    }

    const res = await getTriage(selected.encounterId);
    setSaving(false);
    if (!res.success || !res.data) {
      // Sync OK pero lectura falló: no inventar DTO; avisar y refrescar cola.
      setSaveMsg('Triage sincronizado. Actualice para ver el detalle.');
      void refresh();
      return;
    }
    setExisting(res.data);
    setSaveMsg(
      res.data.level
        ? `Triage guardado · nivel ${res.data.level}`
        : 'Triage guardado sin clasificar (signos/motivo registrados).',
    );
    void refresh();
  }

  const printTriage = useMemo((): TriageDto | null => {
    if (!selected || !scale) return null;
    const hasContent = existing || hasPrintableTriageContent(level, chiefComplaint, vitals);
    if (!hasContent) return null;
    return buildDraftTriageSnapshot(selected, scale, existing, {
      level,
      chiefComplaint,
      vitals,
      notMeasuredReason,
      painScore,
      painAssessable,
    });
  }, [
    selected,
    scale,
    existing,
    level,
    chiefComplaint,
    vitals,
    notMeasuredReason,
    painScore,
    painAssessable,
  ]);

  const canPrint = Boolean(printTriage);

  return (
    <div className="space-y-5" data-testid="page-triage">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground-900">Triage</h1>
          <p className="text-sm text-foreground-500">
            Escala configurable · sin nivel por omisión · signos opcionales («no tomado»).
            {scale ? ` ${scale.displayName} (${scale.resolvedFrom}).` : ''}
            {allUnclassified ? ' Cola: todos sin clasificar.' : ''}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => void refresh()}>
          Actualizar cola
        </Button>
      </div>

      <div className="rounded-lg border border-secondary-200 bg-secondary-50/60 px-4 py-2.5 text-xs text-foreground-600">
        Escala <strong>configurable</strong> (doc 06 §63). El prototipo hardcodeaba 4 colores
        (rojo/naranja/amarillo/verde): aquí se usan niveles de la escala efectiva. Sin nivel por
        omisión; signos vitales opcionales.
      </div>

      <QueueLiveBanner
        liveStatus={liveStatus}
        fromCache={fromCache}
        cacheAgeLabel={cacheAgeLabel}
        showStaleBanner={showStaleBanner}
      />

      {(error || scaleError) && (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error ?? scaleError}
        </div>
      )}

      <EncounterQueueStatsBar stats={stats} scale={scale} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <section className="overflow-hidden rounded-xl border border-secondary-200 bg-background-50">
          <header className="space-y-2 border-b border-secondary-100 p-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground-800">
                Cola de urgencias {loading ? '…' : `(${filteredQueue.length})`}
              </h2>
            </div>
            <input
              type="search"
              placeholder="Buscar en cola…"
              data-testid="triage-buscar-cola"
              value={queueSearch}
              onChange={(e) => setQueueSearch(e.target.value)}
              className="w-full rounded-lg border border-secondary-200 px-3 py-1.5 text-sm outline-none focus:border-primary-400"
            />
            <div className="flex flex-wrap gap-1">
              {(['todos', 'sin_clasificar'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setQueueFilter(f)}
                  className={`rounded-full border px-2 py-0.5 text-[10px] ${
                    queueFilter === f
                      ? 'border-primary-300 bg-primary-100 text-primary-700'
                      : 'border-secondary-200 bg-secondary-100 text-foreground-600'
                  }`}
                >
                  {f === 'todos' ? 'Todos' : 'Sin clasificar'}
                </button>
              ))}
              {(scale?.levels ?? []).map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setQueueFilter(l.code)}
                  className={`rounded-full border px-2 py-0.5 text-[10px] ${
                    queueFilter === l.code
                      ? 'border-primary-300 bg-primary-100 text-primary-700'
                      : 'border-secondary-200 bg-secondary-100 text-foreground-600'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </header>
          <ul className="max-h-[70vh] divide-y divide-secondary-100 overflow-y-auto">
            {filteredQueue.map((e) => {
              const lvl = levelPresentation(scale, e.triageLevel);
              const unclassified = !e.triageLevel;
              const accent = accentForEncounter(scale, e);
              const waitMin = waitMinutesSince(e.arrivalAtUtc, now);

              return (
                <li key={e.encounterId}>
                  <button
                    type="button"
                    className={`flex w-full flex-col gap-1 px-3 py-2.5 text-left text-sm transition-base hover:bg-secondary-50/60 ${
                      selectedId === e.encounterId ? 'bg-primary-50/80' : ''
                    }`}
                    onClick={() => selectEncounter(e.encounterId)}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${accent.dot}`} />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-foreground-900">
                          #{e.turnNumber} · {encounterDisplayName(e)}
                        </span>
                        <span className="mt-0.5 block text-xs text-foreground-500">
                          {formatArrivalLocal(e.arrivalAtUtc)} · {e.state} ·{' '}
                          {formatWaitLabel(waitMin)}
                        </span>
                        <span className="mt-1 inline-flex items-center gap-1 text-xs">
                          {unclassified ? (
                            <span className="font-semibold text-foreground-800">
                              Sin clasificar
                            </span>
                          ) : (
                            <>
                              <i className={`${lvl?.icon ?? 'ri-flag-line'} ${accent.iconColor}`} aria-hidden />
                              {lvl?.label ?? e.triageLevel}
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
            {!loading && filteredQueue.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-foreground-500">
                No hay episodios en la cola.
              </li>
            )}
          </ul>
        </section>

        <Card className="p-4 md:p-5">
          {!selected ? (
            <p className="text-sm text-foreground-500">
              Selecciona un episodio. La identidad incompleta no bloquea el triage.
            </p>
          ) : (
            <div className="space-y-5">
              {subject ? (
                <IdentityHeader subject={subject} />
              ) : (
                <div>
                  <h2 className="text-lg font-semibold text-foreground-900">
                    {encounterDisplayName(selected)}
                  </h2>
                  <p className="text-xs text-foreground-500">Cargando identidad…</p>
                </div>
              )}
              <p className="text-xs text-foreground-500">
                Turno {selected.turnNumber}
                {existing ? ` · Triage previo: ${existing.level ?? 'sin clasificar'}` : ''}
              </p>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-foreground-700">
                  Motivo / padecimiento
                </span>
                <textarea
                  className="w-full rounded-lg border border-secondary-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
                  rows={2}
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="Opcional al guardar; no bloquea atención"
                />
              </label>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-foreground-700">
                  Nivel de triage
                  <span className="ml-2 font-normal text-foreground-500">
                    (ninguno por omisión — SC-03)
                  </span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-pressed={level === null}
                    className={`rounded-lg border px-3 py-2 text-sm transition-base ${
                      level === null
                        ? 'border-foreground-800 bg-foreground-800 text-white'
                        : 'border-secondary-200 bg-background-50 text-foreground-700 hover:border-secondary-300'
                    }`}
                    onClick={() => setLevel(null)}
                  >
                    Sin clasificar
                  </button>
                  {(scale?.levels ?? []).map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      aria-pressed={level === l.code}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-base ${
                        level === l.code
                          ? 'border-primary-400 bg-primary-50 font-semibold text-foreground-900'
                          : 'border-secondary-200 bg-background-50 text-foreground-700 hover:border-secondary-300'
                      }`}
                      onClick={() => setLevel(l.code)}
                    >
                      <i className={l.icon ?? 'ri-flag-line'} aria-hidden />
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
                {!scale && (
                  <p className="mt-2 text-xs text-amber-700">
                    Sin escala efectiva no se puede interpretar un nivel. Configure tenant/sucursal.
                  </p>
                )}
              </fieldset>

              {imc && (
                <div className="rounded-lg border border-secondary-200 bg-secondary-50 px-3 py-2 text-sm">
                  <span className="font-medium text-foreground-800">IMC calculado: </span>
                  <span className="tabular-nums">{imc.value}</span>
                  <span className="ml-2 text-foreground-600">({imc.label})</span>
                </div>
              )}

              <div>
                <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                  <h3 className="text-sm font-medium text-foreground-700">
                    Signos vitales
                    <span className="ml-2 font-normal text-foreground-500">
                      (ninguno obligatorio)
                    </span>
                  </h3>
                  <label className="flex items-center gap-2 text-xs text-foreground-600">
                    Razón si no tomado
                    <input
                      className="rounded border border-secondary-200 px-2 py-1"
                      value={notMeasuredReason}
                      onChange={(e) => setNotMeasuredReason(e.target.value || 'no tomado')}
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {CANONICAL_VITAL_CODES.map((code) => (
                    <label key={code} className="block space-y-1">
                      <span className="text-xs font-medium text-foreground-600">
                        {VITAL_LABELS[code]} ({VITAL_DEFAULT_UNITS[code]})
                      </span>
                      <Input
                        value={vitals[code]}
                        onChange={(e) => updateVital(code, e.target.value)}
                        placeholder="vacío = no tomado"
                        inputMode="decimal"
                      />
                      {vitalHints[code] && (
                        <span
                          className={`block text-xs ${
                            vitalHints[code]?.includes('Fuera')
                              ? 'font-medium text-amber-700'
                              : 'text-red-600'
                          }`}
                        >
                          {vitalHints[code]}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-4">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-foreground-700">Dolor valorable</span>
                  <select
                    className="block rounded-lg border border-secondary-200 px-2 py-1.5"
                    value={painAssessable}
                    onChange={(e) =>
                      setPainAssessable(e.target.value as 'valorable' | 'no_valorable')
                    }
                  >
                    <option value="valorable">Valorable</option>
                    <option value="no_valorable">No valorable</option>
                  </select>
                </label>
                {painAssessable === 'valorable' && (
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-foreground-700">EVA (0–10)</span>
                    <Input
                      value={painScore}
                      onChange={(e) => setPainScore(e.target.value)}
                      placeholder="opcional"
                      inputMode="numeric"
                      className="w-24"
                    />
                  </label>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || !scale}
                >
                  {saving ? 'Guardando…' : 'Guardar triage'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!canPrint}
                  onClick={() => setShowPrint(true)}
                  data-testid="btn-imprimir-triage"
                >
                  Imprimir hoja
                </Button>
                {saveMsg && <span className="text-sm text-emerald-700">{saveMsg}</span>}
                {saveErr && <span className="text-sm text-red-600">{saveErr}</span>}
              </div>
            </div>
          )}
        </Card>
      </div>

      {showPrint && selected && printTriage && (
        <TriagePrintModal
          encounter={selected}
          subject={subject}
          triage={printTriage}
          scale={scale}
          branch={branch}
          isDraft={!existing?.triageId}
          isOpen={showPrint}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}
