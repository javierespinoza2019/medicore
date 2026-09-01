import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  encounterDisplayName,
  type EncounterDto,
} from '@/api/encounters';
import { getSubject, type SubjectDto } from '@/api/subjects';
import {
  buildVitalsFromForm,
  CANONICAL_VITAL_CODES,
  getEffectiveTriageScale,
  getTriage,
  saveTriage,
  VITAL_DEFAULT_UNITS,
  VITAL_LABELS,
  type CanonicalVitalCode,
  type TriageDto,
  type TriageScaleConfigDto,
  type TriageScaleLevel,
} from '@/api/triage';
import { useEncounterQueue } from '@/hooks/useEncounterQueue';
import { findTriageScaleLevel } from '@/utils/triageScalePresentation';
import {
  parseVitalNumber,
  validatePresionPar,
  validateVital,
} from '@/utils/vitalValidation';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';
import IdentityHeader from '@/components/feature/IdentityHeader';

type VitalForm = Record<CanonicalVitalCode, string>;

const emptyVitals = (): VitalForm =>
  Object.fromEntries(CANONICAL_VITAL_CODES.map((c) => [c, ''])) as VitalForm;

function formatArrival(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function levelPresentation(
  scale: TriageScaleConfigDto | null,
  code: string | null | undefined,
): TriageScaleLevel | null {
  return findTriageScaleLevel(scale, code);
}

/**
 * Triage contra API real (M5 / WS-F).
 * - Escala desde config (cascada sucursal > tenant); sin escala fija hardcodeada.
 * - Ningún nivel por omisión (SC-03).
 * - Signos opcionales; vacíos = «no tomado» (no_medido). Sin botón de valores normales.
 * - Rangos con BiologicalSex del sujeto (opción B).
 */
export default function TriagePage() {
  const { branchId, items, loading, error, refresh, allUnclassified } =
    useEncounterQueue(false);

  const [scale, setScale] = useState<TriageScaleConfigDto | null>(null);
  const [scaleError, setScaleError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState('');
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

  const selected = useMemo(
    () => items.find((e) => e.encounterId === selectedId) ?? null,
    [items, selectedId],
  );

  const biologicalSex = subject?.biologicalSex ?? null;

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
  }, [branchId]);

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
    if (par.message) {
      hints.tension_diastolica = par.message;
    }
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

    const res = await saveTriage(selected.encounterId, body);
    setSaving(false);
    if (!res.success || !res.data) {
      setSaveErr(res.message ?? 'No se pudo guardar el triage.');
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

  return (
    <div className="space-y-4 p-4 md:p-6" data-testid="page-triage">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Triage</h1>
          <p className="text-sm text-slate-500">
            Escala configurable · sin nivel por omisión · signos opcionales («no tomado»).
            {scale
              ? ` Escala: ${scale.displayName} (${scale.resolvedFrom}).`
              : ''}
            {allUnclassified ? ' Cola: todos sin clasificar.' : ''}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => void refresh()}>
          Actualizar cola
        </Button>
      </div>

      {(error || scaleError) && (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error ?? scaleError}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
            Cola de urgencias {loading ? '…' : `(${items.length})`}
          </header>
          <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
            {items.map((e) => {
              const lvl = levelPresentation(scale, e.triageLevel);
              const unclassified = !e.triageLevel;
              return (
                <li key={e.encounterId}>
                  <button
                    type="button"
                    className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-slate-50 ${
                      selectedId === e.encounterId ? 'bg-slate-100' : ''
                    }`}
                    onClick={() => setSelectedId(e.encounterId)}
                  >
                    <span className="font-medium text-slate-900">
                      #{e.turnNumber} · {encounterDisplayName(e)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatArrival(e.arrivalAtUtc)} · {e.state}
                      {' · '}
                      {unclassified ? (
                        <span className="font-semibold text-slate-800">Sin clasificar</span>
                      ) : (
                        <span>
                          <i className={`${lvl?.icon ?? 'ri-flag-line'} mr-1`} aria-hidden />
                          {lvl?.label ?? e.triageLevel}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
            {!loading && items.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-slate-500">
                No hay episodios abiertos en la cola.
              </li>
            )}
          </ul>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          {!selected ? (
            <p className="text-sm text-slate-500">
              Selecciona un episodio. La identidad incompleta no bloquea el triage.
            </p>
          ) : (
            <div className="space-y-5">
              {subject ? (
                <IdentityHeader subject={subject} />
              ) : (
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {encounterDisplayName(selected)}
                  </h2>
                  <p className="text-xs text-slate-500">Cargando identidad…</p>
                </div>
              )}
              <p className="text-xs text-slate-500">
                Turno {selected.turnNumber}
                {existing ? ` · Triage previo: ${existing.level ?? 'sin clasificar'}` : ''}
              </p>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Motivo / padecimiento</span>
                <textarea
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="Opcional al guardar; no bloquea atención"
                />
              </label>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-slate-700">
                  Nivel de triage
                  <span className="ml-2 font-normal text-slate-500">
                    (ninguno por omisión — SC-03)
                  </span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-pressed={level === null}
                    className={`rounded border px-3 py-2 text-sm ${
                      level === null
                        ? 'border-slate-800 bg-slate-800 text-white'
                        : 'border-slate-300 bg-white text-slate-700'
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
                      className={`inline-flex items-center gap-1.5 rounded border px-3 py-2 text-sm ${
                        level === l.code
                          ? 'border-slate-800 bg-slate-100 font-semibold text-slate-900'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                      onClick={() => setLevel(l.code)}
                    >
                      <i className={l.icon ?? 'ri-flag-line'} aria-hidden />
                      <span>{l.label}</span>
                      <span className="text-xs text-slate-500">({l.code})</span>
                    </button>
                  ))}
                </div>
                {!scale && (
                  <p className="mt-2 text-xs text-amber-700">
                    Sin escala efectiva no se puede interpretar un nivel. Configure tenant/sucursal.
                  </p>
                )}
              </fieldset>

              <div>
                <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                  <h3 className="text-sm font-medium text-slate-700">
                    Signos vitales
                    <span className="ml-2 font-normal text-slate-500">
                      (ninguno obligatorio)
                    </span>
                  </h3>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    Razón si no tomado
                    <input
                      className="rounded border border-slate-300 px-2 py-1"
                      value={notMeasuredReason}
                      onChange={(e) => setNotMeasuredReason(e.target.value || 'no tomado')}
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {CANONICAL_VITAL_CODES.map((code) => (
                    <label key={code} className="block space-y-1">
                      <span className="text-xs font-medium text-slate-600">
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
                  <span className="font-medium text-slate-700">Dolor valorable</span>
                  <select
                    className="block rounded border border-slate-300 px-2 py-1.5"
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
                    <span className="font-medium text-slate-700">EVA (0–10)</span>
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
                {saveMsg && <span className="text-sm text-emerald-700">{saveMsg}</span>}
                {saveErr && <span className="text-sm text-red-600">{saveErr}</span>}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
