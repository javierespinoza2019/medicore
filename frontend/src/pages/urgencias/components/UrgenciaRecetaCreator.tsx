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
  createPrescription,
  signPrescription,
  frequencyLabel,
  doseLabel,
  CONTROLLED_BLOCKED_MESSAGE,
  type MedicationDto,
  type PrescriptionDto,
  type FrequencyKind,
} from '@/api/prescriptions';
import { mensajeDeFalla } from '@/api/errors';
import type { Receta } from '@/mocks/recetas';

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
  { kind: 'n_times_per_day', n: 1, label: 'Dosis única / 1 vez' },
  { kind: 'every_n_hours', n: 6, label: 'cada 6 h' },
  { kind: 'every_n_hours', n: 8, label: 'cada 8 h' },
  { kind: 'every_n_hours', n: 12, label: 'cada 12 h' },
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
  urgenciaId: string;
  patientId: string;
  patientName: string;
  patientExpediente: string;
  doctorId: string;
  doctorName: string;
  doctorCedula: string;
  diagnosticoRelacionado: string;
  onRecetaCreada: (receta: Receta) => void;
  onCancel: () => void;
}

function toLegacyReceta(
  rx: PrescriptionDto,
  meta: {
    patientName: string;
    patientExpediente: string;
    doctorId: string;
    doctorName: string;
    doctorCedula: string;
    diagnosticoRelacionado: string;
  },
): Receta {
  const issued = rx.issuedAtUtc ?? rx.occurredAtUtc;
  const d = new Date(issued);
  return {
    id: rx.prescriptionId,
    patientId: rx.subjectId,
    patientName: meta.patientName,
    patientExpediente: meta.patientExpediente,
    doctorId: rx.professionalId ?? meta.doctorId,
    doctorName: meta.doctorName,
    doctorCedula: meta.doctorCedula,
    consultaId: rx.encounterId,
    urgenciaId: rx.encounterId,
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
      duracion: it.durationDays != null ? `${it.durationDays} días` : 'Dosis única',
      indicaciones: it.instructions ?? '',
    })),
    indicacionesGenerales: rx.generalInstructions ?? '',
    estado: rx.cancelledAtUtc ? 'cancelada' : 'activa',
    diagnosticoRelacionado: meta.diagnosticoRelacionado,
  };
}

export default function UrgenciaRecetaCreator({
  urgenciaId, patientId, patientName, patientExpediente,
  doctorId, doctorName, doctorCedula, diagnosticoRelacionado,
  onRecetaCreada, onCancel,
}: Props) {
  const [record, setRecord] = useState<ClinicalRecordDto | null>(null);
  const [allergyChoice, setAllergyChoice] = useState<AllergyStatusCode>('niega');
  const [captureEventId, setCaptureEventId] = useState<string | null>(null);
  const [allergyConfirmed, setAllergyConfirmed] = useState(false);
  const [prioridad, setPrioridad] = useState<'inmediata' | 'urgente' | 'normal'>('inmediata');
  const [medSearch, setMedSearch] = useState('');
  const [medResults, setMedResults] = useState<MedicationDto[]>([]);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [selectedMed, setSelectedMed] = useState<MedicationDto | null>(null);
  const [doseValor, setDoseValor] = useState(500);
  const [doseUnidad, setDoseUnidad] = useState('mg');
  const [route, setRoute] = useState('oral');
  const [freqIdx, setFreqIdx] = useState(0);
  const [durationDays, setDurationDays] = useState(1);
  const [itemInstructions, setItemInstructions] = useState('');
  const [generalInstructions, setGeneralInstructions] = useState('');
  const [overrideJustification, setOverrideJustification] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getClinicalRecord(patientId);
      if (cancelled) return;
      if (!res.success || !res.data) {
        setError(failMsg(res));
        return;
      }
      setRecord(res.data);
      setAllergyChoice((res.data.allergyStatus.status || 'no_interrogado') as AllergyStatusCode);
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  const allergyTone = useMemo(() => {
    const st = record?.allergyStatus.status ?? 'no_interrogado';
    return allergyStatusIsWarning(st) ? 'text-amber-800' : 'text-sky-800';
  }, [record]);

  const handleConfirmAllergy = async () => {
    setError(null);
    const res = await setAllergyStatus(patientId, allergyChoice);
    if (!res.success || !res.data?.statusEventId) {
      setError(failMsg(res) || 'El servidor no devolvió el evento de captura.');
      return;
    }
    setCaptureEventId(res.data.statusEventId);
    setAllergyConfirmed(true);
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
        key: `u-${Date.now()}`,
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
      setError('Confirme el estado alérgico antes de prescritir.');
      return;
    }
    if (draftItems.length === 0) {
      setError('Agregue al menos un medicamento.');
      return;
    }
    setSaving(true);
    setError(null);
    const prioridadNota = `Prioridad urgencias: ${prioridad}.`;
    const generales = [prioridadNota, generalInstructions.trim()].filter(Boolean).join(' ');
    const created = await createPrescription(urgenciaId, {
      allergyStatusCaptureEventId: captureEventId,
      allergyOverrideJustification: overrideJustification.trim() || null,
      generalInstructions: generales || null,
      items: draftItems.map((d) => ({
        medicationId: d.medication.medicationId,
        dose: { valor: d.doseValor, unidad: d.doseUnidad, estado: 'medido', origen: 'medido' },
        route: d.route,
        frequency: { kind: d.freqKind, n: d.freqN },
        durationDays: d.durationDays,
        quantity: 1,
        refillsAllowed: 0,
        instructions: d.instructions || null,
      })),
    });
    if (!created.success || !created.data) {
      setError(failMsg(created));
      setSaving(false);
      return;
    }
    const signed = await signPrescription(created.data.prescriptionId);
    const finalRx = signed.data ?? created.data;
    if (!signed.success && !signed.data) {
      setError(failMsg(signed));
    }
    onRecetaCreada(toLegacyReceta(finalRx, {
      patientName, patientExpediente, doctorId, doctorName, doctorCedula, diagnosticoRelacionado,
    }));
    setSaving(false);
  };

  return (
    <div className="space-y-3 rounded-lg border border-red-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-red-900">Receta de urgencias</h3>
          <p className="text-sm text-foreground-600">{patientName}</p>
        </div>
        <button type="button" className="text-sm text-foreground-500" onClick={onCancel}>Cerrar</button>
      </div>

      <section className={`space-y-2 rounded border p-3 ${allergyTone}`}>
        <p className="text-sm font-medium">
          {allergyStatusLabel(record?.allergyStatus.status ?? 'no_interrogado', record?.allergies.length ?? 0)}
        </p>
        {(record?.allergies.length ?? 0) > 0 && (
          <ul className="list-inside list-disc text-sm">
            {record!.allergies.map((a) => (
              <li key={a.allergyId}>{a.substance}</li>
            ))}
          </ul>
        )}
        {!allergyConfirmed ? (
          <>
            <p className="text-xs">
              Captura explícita obligatoria antes de prescritir (incluye «no sé»).
            </p>
            <div className="flex flex-wrap gap-1">
              {ALLERGY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAllergyChoice(opt.value)}
                  className={`rounded border px-2 py-1 text-xs ${
                    allergyChoice === opt.value ? 'border-red-700 bg-red-100' : 'border-secondary-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={handleConfirmAllergy} className="rounded bg-red-800 px-3 py-1.5 text-sm text-white">
              Registrar estado alérgico
            </button>
          </>
        ) : (
          <p className="text-xs text-emerald-700">Estado capturado. Continúe con la receta.</p>
        )}
      </section>

      {allergyConfirmed && (
        <>
          <div className="flex gap-2 text-xs">
            {(['inmediata', 'urgente', 'normal'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPrioridad(p)}
                className={`rounded border px-2 py-1 ${prioridad === p ? 'border-red-700 bg-red-50' : ''}`}
              >
                {p}
              </button>
            ))}
          </div>

          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Buscar medicamento…"
            value={medSearch}
            onChange={(e) => handleMedSearch(e.target.value)}
          />
          {medResults.length > 0 && (
            <ul className="max-h-36 overflow-auto rounded border text-sm">
              {medResults.map((m) => (
                <li key={m.medicationId}>
                  <button type="button" className="w-full px-3 py-2 text-left hover:bg-secondary-50" onClick={() => handleSelectMed(m)}>
                    {m.genericName}{m.concentration ? ` · ${m.concentration}` : ''}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selectedMed && (
            <div className="grid gap-2 rounded border p-3 sm:grid-cols-2">
              <p className="sm:col-span-2 text-sm font-medium">{selectedMed.genericName}</p>
              <label className="text-xs">
                Dosis
                <div className="mt-1 flex gap-2">
                  <input type="number" className="w-24 rounded border px-2 py-1" value={doseValor} onChange={(e) => setDoseValor(Number(e.target.value))} />
                  <input className="w-20 rounded border px-2 py-1" value={doseUnidad} onChange={(e) => setDoseUnidad(e.target.value)} />
                </div>
              </label>
              <label className="text-xs">
                Vía
                <input className="mt-1 w-full rounded border px-2 py-1" value={route} onChange={(e) => setRoute(e.target.value)} />
              </label>
              <label className="text-xs">
                Frecuencia
                <select className="mt-1 w-full rounded border px-2 py-1" value={freqIdx} onChange={(e) => setFreqIdx(Number(e.target.value))}>
                  {FREQ_OPTIONS.map((f, i) => (
                    <option key={f.label} value={i}>{f.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                Días
                <input type="number" className="mt-1 w-full rounded border px-2 py-1" value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))} />
              </label>
              <button type="button" onClick={handleAddMed} className="sm:col-span-2 rounded bg-emerald-700 px-3 py-1.5 text-sm text-white">
                Agregar
              </button>
            </div>
          )}

          {draftItems.length > 0 && (
            <ul className="space-y-1 text-sm">
              {draftItems.map((d) => (
                <li key={d.key} className="flex justify-between rounded border px-2 py-1">
                  <span>{d.medication.genericName} · {d.doseValor} {d.doseUnidad}</span>
                  <button type="button" className="text-xs text-red-600" onClick={() => setDraftItems((p) => p.filter((x) => x.key !== d.key))}>Quitar</button>
                </li>
              ))}
            </ul>
          )}

          {(record?.allergies.length ?? 0) > 0 && (
            <textarea
              className="w-full rounded border px-2 py-1 text-sm"
              rows={2}
              placeholder="Justificación SC-02 si aplica alergia conocida"
              value={overrideJustification}
              onChange={(e) => setOverrideJustification(e.target.value)}
            />
          )}

          <textarea
            className="w-full rounded border px-2 py-1 text-sm"
            rows={2}
            placeholder="Indicaciones generales"
            value={generalInstructions}
            onChange={(e) => setGeneralInstructions(e.target.value)}
          />

          <button
            type="button"
            disabled={saving || draftItems.length === 0}
            onClick={handleSave}
            className="rounded bg-red-800 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving ? 'Emitiendo…' : 'Crear y firmar receta'}
          </button>
        </>
      )}

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</p>
      )}
    </div>
  );
}
