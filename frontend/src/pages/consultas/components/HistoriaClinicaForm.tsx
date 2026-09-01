/**
 * Formulario de historia clínica (M7 / WS-G).
 * Estado inicial: todo no_interrogado. Sin mocks. Sin fabricar negado/normal.
 * Opción B: el género no alimenta este formulario clínico.
 */
import { useEffect, useState } from 'react';
import {
  allergyStatusLabel,
  allergyStatusIsWarning,
  createEmptyMedicalHistoryBody,
  getClinicalRecord,
  saveMedicalHistory,
  setAllergyStatus,
  type AllergyStatusCode,
  type ClinicalRecordDto,
  type MedicalHistoryBody,
} from '@/api/clinicalRecord';
import { mensajeDeFalla } from '@/api/errors';
import type { EstadoInterrogatorioCodigo } from '@/types/clinical';
import HistoriaClinicaPrintModal from './HistoriaClinicaPrintModal';

interface Props {
  patientId: string;
  doctorName: string;
  onDirtyChange?: (dirty: boolean) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const ESTADOS: { value: EstadoInterrogatorioCodigo; label: string }[] = [
  { value: 'no_interrogado', label: 'No interrogado' },
  { value: 'se_desconoce', label: 'Se desconoce' },
  { value: 'no_aplica', label: 'No aplica' },
  { value: 'conocido', label: 'Conocido' },
];

const ALERGIA_ESTADOS: { value: AllergyStatusCode; label: string }[] = [
  { value: 'no_interrogado', label: 'No interrogado' },
  { value: 'niega', label: 'Niega alergias' },
  { value: 'refiere', label: 'Refiere alergias' },
  { value: 'se_desconoce', label: 'Se desconoce' },
  { value: 'paciente_no_puede_responder', label: 'Paciente no puede responder' },
];

function SectionHeader({ icon, title, tone }: { icon: string; title: string; tone: string }) {
  return (
    <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2 mb-3">
      <span className={`w-6 h-6 flex items-center justify-center rounded-md ${tone}`} aria-hidden="true">
        <i className={`${icon} text-xs`}></i>
      </span>
      {title}
    </h4>
  );
}

function EstadoSelect({
  value,
  onChange,
}: {
  value: EstadoInterrogatorioCodigo;
  onChange: (v: EstadoInterrogatorioCodigo) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as EstadoInterrogatorioCodigo)}
      className="px-2 py-1.5 text-xs border border-secondary-200 rounded-lg bg-background-50 text-foreground-800 outline-none focus:border-primary-400"
    >
      {ESTADOS.map((e) => (
        <option key={e.value} value={e.value}>
          {e.label}
        </option>
      ))}
    </select>
  );
}

function CampoInterrogatorio({
  label,
  estado,
  detalle,
  onEstado,
  onDetalle,
}: {
  label: string;
  estado: EstadoInterrogatorioCodigo;
  detalle: string;
  onEstado: (e: EstadoInterrogatorioCodigo) => void;
  onDetalle: (t: string) => void;
}) {
  return (
    <div className="p-3 rounded-lg border border-secondary-200 bg-background-50 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-medium text-foreground-800">{label}</p>
        <EstadoSelect value={estado} onChange={onEstado} />
      </div>
      {estado === 'conocido' && (
        <textarea
          value={detalle}
          onChange={(e) => onDetalle(e.target.value)}
          placeholder="Detalle capturado (no se prellena)"
          rows={2}
          className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg outline-none focus:border-primary-400 resize-none"
        />
      )}
      {estado === 'no_interrogado' && (
        <p className="text-2xs text-amber-700">Sin afirmar: aún no se interrogó esta sección.</p>
      )}
    </div>
  );
}

function textoDeValor(valor: unknown): string {
  if (valor == null) return '';
  if (typeof valor === 'string') return valor;
  try {
    return JSON.stringify(valor);
  } catch {
    return String(valor);
  }
}

function valorDesdeTexto(texto: string): unknown {
  const t = texto.trim();
  if (!t) return [];
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

export default function HistoriaClinicaForm({ patientId, doctorName, onDirtyChange }: Props) {
  const [record, setRecord] = useState<ClinicalRecordDto | null>(null);
  const [body, setBody] = useState<MedicalHistoryBody>(() => createEmptyMedicalHistoryBody());
  const [allergyStatus, setAllergyStatusLocal] = useState<AllergyStatusCode>('no_interrogado');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await getClinicalRecord(patientId);
      if (cancelled) return;
      if (!res.success || !res.data) {
        setError(mensajeDeFalla(res.failure).titulo || res.message || 'No se pudo cargar el expediente.');
        setBody(createEmptyMedicalHistoryBody());
        setLoading(false);
        return;
      }
      setRecord(res.data);
      setBody(res.data.currentHistory?.body ?? createEmptyMedicalHistoryBody());
      setAllergyStatusLocal((res.data.allergyStatus.status as AllergyStatusCode) || 'no_interrogado');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const markDirty = () => {
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const setCampo = (
    key: keyof MedicalHistoryBody,
    estado: EstadoInterrogatorioCodigo,
    detalle: string,
  ) => {
    setBody((prev) => {
      if (key === 'observaciones') return prev;
      const nextValor = estado === 'conocido' ? valorDesdeTexto(detalle) : null;
      return {
        ...prev,
        [key]: { estado, valor: nextValor },
      };
    });
    markDirty();
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    const hist = await saveMedicalHistory(patientId, body, 'capturado');
    if (!hist.success) {
      setSaveStatus('error');
      setError(mensajeDeFalla(hist.failure).titulo || hist.message || 'Error al guardar historia.');
      return;
    }
    const al = await setAllergyStatus(patientId, allergyStatus);
    if (!al.success) {
      setSaveStatus('error');
      setError(mensajeDeFalla(al.failure).titulo || al.message || 'Error al guardar estado alérgico.');
      return;
    }
    setIsDirty(false);
    setSaveStatus('saved');
    setRecord((prev) =>
      prev
        ? {
            ...prev,
            currentHistory: hist.data ?? prev.currentHistory,
            allergyStatus: al.data ?? prev.allergyStatus,
          }
        : prev,
    );
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-foreground-500">
        Cargando expediente…
      </div>
    );
  }

  const allergyCount = record?.allergies?.length ?? 0;
  const allergyTone = allergyStatusIsWarning(allergyStatus)
    ? 'bg-amber-50 border-amber-300 text-amber-900'
    : 'bg-emerald-50 border-emerald-200 text-emerald-900';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 bg-background-50 rounded-xl border border-secondary-200">
        <div>
          <p className="text-sm font-semibold text-foreground-900">Historia clínica</p>
          <p className="text-2xs text-foreground-500">
            Captura: {doctorName}. Sin valores clínicos por omisión.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="px-3 py-1.5 text-xs border border-secondary-200 rounded-lg hover:bg-secondary-100 cursor-pointer"
          >
            Imprimir
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 cursor-pointer"
          >
            {saveStatus === 'saving' ? 'Guardando…' : 'Guardar'}
          </button>
          {saveStatus === 'saved' && (
            <span className="text-2xs text-emerald-700">Guardado</span>
          )}
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 text-sm rounded-lg border border-red-200 bg-red-50 text-red-800">
          {error}
        </div>
      )}

      <div className={`px-4 py-3 rounded-xl border ${allergyTone}`}>
        <SectionHeader icon="ri-allergy-line" title="Estado alérgico" tone="bg-amber-100 text-amber-700" />
        <p className="text-sm font-medium mb-2" role="status">
          {allergyStatusLabel(allergyStatus, allergyCount)}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ALERGIA_ESTADOS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setAllergyStatusLocal(opt.value);
                markDirty();
              }}
              className={`px-2.5 py-1 rounded-full text-xs border cursor-pointer ${
                allergyStatus === opt.value
                  ? 'bg-foreground-900 text-background-50 border-foreground-900'
                  : 'bg-background-50 border-secondary-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {allergyStatus === 'no_interrogado' && allergyCount === 0 && (
          <p className="text-2xs mt-2">
            Lista vacía no significa «sin alergias». Debe capturarse un estado explícito antes de
            prescribir.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <CampoInterrogatorio
          label="Antecedentes heredo-familiares"
          estado={body.heredoFamiliares.estado}
          detalle={textoDeValor(body.heredoFamiliares.valor)}
          onEstado={(e) => setCampo('heredoFamiliares', e, textoDeValor(body.heredoFamiliares.valor))}
          onDetalle={(t) => setCampo('heredoFamiliares', 'conocido', t)}
        />
        <CampoInterrogatorio
          label="Antecedentes personales patológicos"
          estado={body.personalesPatologicos.estado}
          detalle={textoDeValor(body.personalesPatologicos.valor)}
          onEstado={(e) =>
            setCampo('personalesPatologicos', e, textoDeValor(body.personalesPatologicos.valor))
          }
          onDetalle={(t) => setCampo('personalesPatologicos', 'conocido', t)}
        />
        <CampoInterrogatorio
          label="Antecedentes personales no patológicos"
          estado={body.personalesNoPatologicos.estado}
          detalle={textoDeValor(body.personalesNoPatologicos.valor)}
          onEstado={(e) =>
            setCampo('personalesNoPatologicos', e, textoDeValor(body.personalesNoPatologicos.valor))
          }
          onDetalle={(t) => setCampo('personalesNoPatologicos', 'conocido', t)}
        />
        <CampoInterrogatorio
          label="Gineco-obstétricos"
          estado={body.ginecoObstetricos.estado}
          detalle={textoDeValor(body.ginecoObstetricos.valor)}
          onEstado={(e) => setCampo('ginecoObstetricos', e, textoDeValor(body.ginecoObstetricos.valor))}
          onDetalle={(t) => setCampo('ginecoObstetricos', 'conocido', t)}
        />
        <CampoInterrogatorio
          label="Aparatos y sistemas"
          estado={body.aparatosYSistemas.estado}
          detalle={textoDeValor(body.aparatosYSistemas.valor)}
          onEstado={(e) => setCampo('aparatosYSistemas', e, textoDeValor(body.aparatosYSistemas.valor))}
          onDetalle={(t) => setCampo('aparatosYSistemas', 'conocido', t)}
        />
        <CampoInterrogatorio
          label="Habitus exterior"
          estado={body.habitusExterior.estado}
          detalle={textoDeValor(body.habitusExterior.valor)}
          onEstado={(e) => setCampo('habitusExterior', e, textoDeValor(body.habitusExterior.valor))}
          onDetalle={(t) => setCampo('habitusExterior', 'conocido', t)}
        />
        <CampoInterrogatorio
          label="Padecimiento actual"
          estado={body.padecimientoActual.estado}
          detalle={textoDeValor(body.padecimientoActual.valor)}
          onEstado={(e) => setCampo('padecimientoActual', e, textoDeValor(body.padecimientoActual.valor))}
          onDetalle={(t) => setCampo('padecimientoActual', 'conocido', t)}
        />
        <div>
          <label className="text-2xs font-medium text-foreground-500 mb-1 block">Observaciones</label>
          <textarea
            value={body.observaciones ?? ''}
            onChange={(e) => {
              setBody((prev) => ({ ...prev, observaciones: e.target.value || null }));
              markDirty();
            }}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg outline-none focus:border-primary-400 resize-none"
            placeholder="Sin texto por omisión"
          />
        </div>
      </div>

      {showPrintModal && (
        <HistoriaClinicaPrintModal
          patientId={patientId}
          onClose={() => setShowPrintModal(false)}
          record={record}
          body={body}
        />
      )}
    </div>
  );
}
