import { useEffect, useMemo, useState } from 'react';
import {
  getClinicalRecord,
  setAllergyStatus,
  allergyStatusLabel,
  allergyStatusIsWarning,
  type AllergyStatusCode,
  type ClinicalRecordDto,
} from '@/api/clinicalRecord';
import {
  searchMedications,
  getPrescription,
  frequencyLabel,
  doseLabel,
  CONTROLLED_BLOCKED_MESSAGE,
  type MedicationDto,
  type PrescriptionDto,
  type FrequencyKind,
} from '@/api/prescriptions';
import { mensajeDeFalla } from '@/api/errors';
import Badge from '@/components/base/Badge';
import { useDevice } from '@/hooks/DeviceProvider';
import { runClinicalOutboxCommand, isClinicalOutboxErr } from '@/sync/runClinicalOutboxCommand';

function failMsg(res: { message?: string; failure?: import('@/api/errors').ApiFailure }): string {
  if (res.failure?.apiMessage?.trim()) return res.failure.apiMessage;
  if (res.message?.trim()) return res.message;
  return mensajeDeFalla(res.failure).titulo;
}

const ALLERGY_OPTIONS: { value: AllergyStatusCode; label: string }[] = [
  { value: 'niega', label: 'Niega alergias conocidas' },
  { value: 'refiere', label: 'Refiere alergias' },
  { value: 'se_desconoce', label: 'Se desconoce' },
  { value: 'no_interrogado', label: 'No interrogado (registro explícito)' },
  { value: 'paciente_no_puede_responder', label: 'Paciente no puede responder' },
];

const FREQ_OPTIONS: { kind: FrequencyKind; n: number; label: string }[] = [
  { kind: 'every_n_hours', n: 6, label: 'cada 6 h' },
  { kind: 'every_n_hours', n: 8, label: 'cada 8 h' },
  { kind: 'every_n_hours', n: 12, label: 'cada 12 h' },
  { kind: 'every_n_hours', n: 24, label: 'cada 24 h' },
  { kind: 'n_times_per_day', n: 1, label: '1 vez al día' },
  { kind: 'n_times_per_day', n: 2, label: '2 veces al día' },
  { kind: 'n_times_per_day', n: 3, label: '3 veces al día' },
];

type DraftItem = {
  key: string;
  medication: MedicationDto;
  doseValor: number;
  doseUnidad: string;
  route: string;
  freqKind: FrequencyKind;
  freqN: number;
  durationDays: number;
  instructions: string;
};

interface Props {
  /** EncounterId del episodio (consulta). */
  consultaId: string;
  patientId: string;
  patientName: string;
  patientExpediente: string;
  doctorId: string;
  doctorName: string;
  doctorCedula: string;
  diagnosticoRelacionado: string;
  onRecetaCreada: (rx: PrescriptionDto) => void;
  onCancel: () => void;
}

export default function RecetaInlineCreator({
  consultaId, patientId, patientName, patientExpediente,
  doctorId, doctorName, doctorCedula, diagnosticoRelacionado,
  onRecetaCreada, onCancel,
}: Props) {
  const { allowsClinicalCache, isPendingApproval } = useDevice();
  const gate = { allowsOfflineQueue: allowsClinicalCache, isPendingApproval };
  const [record, setRecord] = useState<ClinicalRecordDto | null>(null);
  /** Sin preselección clínica: hasta cargar el expediente o captura explícita. */
  const [allergyChoice, setAllergyChoice] = useState<AllergyStatusCode>('no_interrogado');
  const [captureEventId, setCaptureEventId] = useState<string | null>(null);
  const [allergyConfirmed, setAllergyConfirmed] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(true);

  const [medSearch, setMedSearch] = useState('');
  const [medResults, setMedResults] = useState<MedicationDto[]>([]);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [selectedMed, setSelectedMed] = useState<MedicationDto | null>(null);
  const [doseValor, setDoseValor] = useState(500);
  const [doseUnidad, setDoseUnidad] = useState('mg');
  const [route, setRoute] = useState('oral');
  const [freqIdx, setFreqIdx] = useState(1);
  const [durationDays, setDurationDays] = useState(7);
  const [itemInstructions, setItemInstructions] = useState('');
  const [generalInstructions, setGeneralInstructions] = useState('');
  const [overrideJustification, setOverrideJustification] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingRecord(true);
      try {
        const res = await getClinicalRecord(patientId);
        if (cancelled) return;
        if (!res.success || !res.data) {
          setError(failMsg(res));
          return;
        }
        setRecord(res.data);
        const st = (res.data.allergyStatus.status || 'no_interrogado') as AllergyStatusCode;
        setAllergyChoice(st);
      } finally {
        if (!cancelled) setLoadingRecord(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  const allergyTone = useMemo(() => {
    const st = record?.allergyStatus.status ?? 'no_interrogado';
    return allergyStatusIsWarning(st) ? 'warning' : 'info';
  }, [record]);

  const handleConfirmAllergy = async () => {
    setError(null);
    const res = await setAllergyStatus(patientId, allergyChoice);
    if (!res.success || !res.data) {
      setError(failMsg(res));
      return;
    }
    setCaptureEventId(res.data.statusEventId);
    setAllergyConfirmed(Boolean(res.data.statusEventId));
    if (!res.data.statusEventId) {
      setError('El servidor no devolvió el evento de captura alérgica.');
      return;
    }
    setRecord((prev) => (prev ? { ...prev, allergyStatus: res.data! } : prev));
  };

  const handleMedSearch = async (value: string) => {
    setMedSearch(value);
    if (value.trim().length < 2) {
      setMedResults([]);
      return;
    }
    try {
      const res = await searchMedications(value, false);
      setMedResults(res.data ?? []);
    } catch {
      setMedResults([]);
    }
  };

  const handleSelectMed = (med: MedicationDto) => {
    if (med.isControlledSubstance) {
      setError(CONTROLLED_BLOCKED_MESSAGE);
      return;
    }
    setSelectedMed(med);
    setRoute(med.defaultRoute || 'oral');
    const conc = med.concentration?.match(/([\d.]+)\s*(\w+)/);
    if (conc) {
      setDoseValor(Number(conc[1]));
      setDoseUnidad(conc[2]);
    }
    setMedSearch('');
    setMedResults([]);
    setError(null);
  };

  const handleAddMed = () => {
    if (!selectedMed) return;
    if (selectedMed.isControlledSubstance) {
      setError(CONTROLLED_BLOCKED_MESSAGE);
      return;
    }
    const freq = FREQ_OPTIONS[freqIdx] ?? FREQ_OPTIONS[0];
    setDraftItems((prev) => [
      ...prev,
      {
        key: `d-${Date.now()}`,
        medication: selectedMed,
        doseValor,
        doseUnidad,
        route,
        freqKind: freq.kind,
        freqN: freq.n,
        durationDays,
        instructions: itemInstructions,
      },
    ]);
    setSelectedMed(null);
    setItemInstructions('');
  };

  const handleSave = async () => {
    if (!allergyConfirmed || !captureEventId) {
      setError('Confirme el estado alérgico antes de prescritir (captura explícita con rastro).');
      return;
    }
    if (draftItems.length === 0) {
      setError('Agregue al menos un medicamento.');
      return;
    }
    setSaving(true);
    setError(null);
    const createPayload = {
      encounterId: consultaId,
      allergyStatusCaptureEventId: captureEventId,
      allergyOverrideJustification: overrideJustification.trim() || null,
      generalInstructions: generalInstructions.trim() || null,
      items: draftItems.map((d) => ({
        medicationId: d.medication.medicationId,
        dose: { valor: d.doseValor, unidad: d.doseUnidad, estado: 'medido', origen: 'medido' },
        route: d.route,
        frequency: { kind: d.freqKind, n: d.freqN },
        durationDays: d.durationDays,
        quantity: d.durationDays * (d.freqKind === 'n_times_per_day' ? d.freqN : Math.round(24 / d.freqN)),
        refillsAllowed: 0,
        instructions: d.instructions || null,
      })),
    };
    const created = await runClinicalOutboxCommand('prescription.create', createPayload, gate);
    if (isClinicalOutboxErr(created)) {
      setError(created.error);
      setSaving(false);
      return;
    }
    if (created.queued || !created.serverEntityId) {
      setError(
        'Receta en cola local (borrador). Al recuperar enlace se creará en el servidor; fírmela después desde la lista.',
      );
      setDraftItems([]);
      setSaving(false);
      return;
    }
    const signed = await runClinicalOutboxCommand(
      'prescription.sign',
      { prescriptionId: created.serverEntityId, contentHash: null },
      gate,
    );
    if (isClinicalOutboxErr(signed)) {
      setError(signed.error || 'Receta creada pero no firmada.');
      const draft = await getPrescription(created.serverEntityId);
      if (draft.success && draft.data) onRecetaCreada(draft.data);
      setSaving(false);
      return;
    }
    if (signed.queued) {
      setError('Firma en cola local. La receta ya existe; se firmará al sincronizar.');
      const draft = await getPrescription(created.serverEntityId);
      if (draft.success && draft.data) onRecetaCreada(draft.data);
      setSaving(false);
      return;
    }
    const finalRx = await getPrescription(created.serverEntityId);
    if (!finalRx.success || !finalRx.data) {
      setError('Receta sincronizada. Actualice para ver el detalle.');
      setSaving(false);
      return;
    }
    onRecetaCreada(finalRx.data);
    setSaving(false);
  };

  return (
    <div className="space-y-4 rounded-lg border border-secondary-200 bg-white p-4" data-testid="receta-inline-creator">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Nueva receta</h3>
          <p className="text-sm text-foreground-600">{patientName} · {patientExpediente}</p>
        </div>
        <button type="button" className="text-sm text-foreground-500 hover:underline" onClick={onCancel}>
          Cancelar
        </button>
      </div>

      {loadingRecord ? (
        <p className="text-sm text-foreground-500">Cargando estado alérgico…</p>
      ) : (
        <section className="space-y-2 rounded border border-amber-200 bg-amber-50/60 p-3">
          <div className="flex items-center gap-2">
            <Badge variant={allergyTone === 'warning' ? 'warning' : 'info'}>Alergias</Badge>
            <span className="text-sm font-medium">
              {allergyStatusLabel(
                record?.allergyStatus.status ?? 'no_interrogado',
                record?.allergies.length ?? 0,
              )}
            </span>
          </div>
          {(record?.allergies.length ?? 0) > 0 && (
            <ul className="list-inside list-disc text-sm text-foreground-700">
              {record!.allergies.map((a) => (
                <li key={a.allergyId}>{a.substance} ({a.severity})</li>
              ))}
            </ul>
          )}
          {!allergyConfirmed ? (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-foreground-600">
                Antes de prescritir debe capturar el estado de forma explícita (puede ser «no interrogado»
                o «paciente no puede responder»). No se bloquea hasta conocer las alergias.
              </p>
              <div className="flex flex-wrap gap-2">
                {ALLERGY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAllergyChoice(opt.value)}
                    className={`rounded border px-2 py-1 text-xs ${
                      allergyChoice === opt.value
                        ? 'border-sky-600 bg-sky-100 text-sky-900'
                        : 'border-secondary-200 bg-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleConfirmAllergy}
                data-testid="receta-confirmar-alergia"
                className="rounded bg-sky-700 px-3 py-1.5 text-sm text-white"
              >
                Registrar estado alérgico
              </button>
            </div>
          ) : (
            <p className="text-xs text-emerald-700">Estado alérgico capturado con rastro. Puede continuar.</p>
          )}
        </section>
      )}

      {allergyConfirmed && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar medicamento (genérico)</label>
            <input
              data-testid="receta-buscar-med"
              className="w-full rounded border border-secondary-200 px-3 py-2 text-sm"
              value={medSearch}
              onChange={(e) => handleMedSearch(e.target.value)}
              placeholder="Mínimo 2 caracteres…"
            />
            {medResults.length > 0 && (
              <ul className="max-h-40 overflow-auto rounded border border-secondary-200 bg-white text-sm">
                {medResults.map((m) => (
                  <li key={m.medicationId}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-secondary-50"
                      onClick={() => handleSelectMed(m)}
                    >
                      {m.genericName}
                      {m.concentration ? ` · ${m.concentration}` : ''}
                      {m.presentation ? ` · ${m.presentation}` : ''}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedMed && (
            <div className="grid gap-2 rounded border border-secondary-200 p-3 sm:grid-cols-2">
              <p className="sm:col-span-2 text-sm font-medium">{selectedMed.genericName}</p>
              <label className="text-xs">
                Dosis
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    className="w-24 rounded border px-2 py-1"
                    value={doseValor}
                    onChange={(e) => setDoseValor(Number(e.target.value))}
                  />
                  <input
                    className="w-20 rounded border px-2 py-1"
                    value={doseUnidad}
                    onChange={(e) => setDoseUnidad(e.target.value)}
                  />
                </div>
              </label>
              <label className="text-xs">
                Vía
                <input
                  className="mt-1 w-full rounded border px-2 py-1"
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                />
              </label>
              <label className="text-xs">
                Frecuencia (estructurada)
                <select
                  className="mt-1 w-full rounded border px-2 py-1"
                  value={freqIdx}
                  onChange={(e) => setFreqIdx(Number(e.target.value))}
                >
                  {FREQ_OPTIONS.map((f, i) => (
                    <option key={f.label} value={i}>{f.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                Duración (días)
                <input
                  type="number"
                  className="mt-1 w-full rounded border px-2 py-1"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                />
              </label>
              <label className="sm:col-span-2 text-xs">
                Indicaciones del ítem
                <input
                  className="mt-1 w-full rounded border px-2 py-1"
                  value={itemInstructions}
                  onChange={(e) => setItemInstructions(e.target.value)}
                />
              </label>
              <button
                type="button"
                onClick={handleAddMed}
                className="sm:col-span-2 rounded bg-emerald-700 px-3 py-1.5 text-sm text-white"
              >
                Agregar a la receta
              </button>
            </div>
          )}

          {draftItems.length > 0 && (
            <ul className="space-y-1 text-sm">
              {draftItems.map((d) => (
                <li key={d.key} className="flex items-center justify-between rounded border px-2 py-1">
                  <span>
                    {d.medication.genericName} · {d.doseValor} {d.doseUnidad} · {d.route} ·{' '}
                    {frequencyLabel({ kind: d.freqKind, n: d.freqN })} · {d.durationDays} d
                  </span>
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={() => setDraftItems((prev) => prev.filter((x) => x.key !== d.key))}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}

          {(record?.allergies.length ?? 0) > 0 && (
            <label className="block text-xs">
              Justificación si prescribe sustancia con alergia conocida (SC-02)
              <textarea
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                rows={2}
                value={overrideJustification}
                onChange={(e) => setOverrideJustification(e.target.value)}
                data-testid="receta-justificacion-sc02"
                placeholder="Obligatoria si el medicamento coincide con alergia registrada"
              />
            </label>
          )}

          <label className="block text-xs">
            Indicaciones generales
            <textarea
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              rows={2}
              value={generalInstructions}
              onChange={(e) => setGeneralInstructions(e.target.value)}
            />
          </label>

          <button
            type="button"
            disabled={saving || draftItems.length === 0}
            onClick={handleSave}
            data-testid="receta-crear-firmar"
            className="rounded bg-sky-800 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving ? 'Emitiendo…' : 'Crear y firmar receta'}
          </button>
        </>
      )}

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
