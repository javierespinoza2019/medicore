import { useState, useEffect } from 'react';
import type { TriageRecord } from '@/mocks/triage';
import { type Receta } from '@/mocks/recetas';
import type { EstudioSolicitado } from '@/mocks/estudios';
import {
  getNotaEvolucionByConsulta,
  createEmptyNotaEvolucion,
  type NotaEvolucion,
  type ResultadoEstudioEvolucion,
  type Pronostico,
} from '@/mocks/notasEvolucion';
import DiagnosticoCIE10Search from './DiagnosticoCIE10Search';
import RecetaInlineCreator from './RecetaInlineCreator';
import EstudioInlineSolicitor from './EstudioInlineSolicitor';
import RecetaPrintModal from '@/pages/recetas/components/RecetaPrintModal';
import NotaEvolucionPrintModal from './NotaEvolucionPrintModal';
import { doctors } from '@/mocks/doctors';
import { tipoCertificadoConfig, type CertificadoMedico } from '@/mocks/certificados';
import CertificadoMedicoCreator from './CertificadoMedicoCreator';
import CertificadoMedicoPrintModal from './CertificadoMedicoPrintModal';
import { usePlantillas } from '@/hooks/usePlantillas';
import type { PlantillaMedica } from '@/mocks/plantillas';
import PlantillasManagerModal from './PlantillasManagerModal';

interface Props {
  consultaId: string;
  patientId: string;
  patientName: string;
  patientExpediente: string;
  doctorId: string;
  doctorName: string;
  doctorCedula: string;
  signosVitalesTriage?: TriageRecord | null;
  onDirtyChange?: (dirty: boolean) => void;
  onDraftChange?: (draft: NotaEvolucion) => void;
  recetasRelacionadas?: Receta[];
  estudiosRelacionados?: { id: string; nombre: string; estado: string }[];
  onRecetaCreada?: (receta: Receta) => void;
  onEstudioCreado?: (estudios: EstudioSolicitado[]) => void;
  certificadosRelacionados?: CertificadoMedico[];
  onCertificadoCreado?: (certificado: CertificadoMedico) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

function formatearFecha(fecha: string): string {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
}

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

function SignoInput({
  label,
  unit,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-2xs font-medium text-foreground-500 mb-1 block">
        {label} <span className="text-foreground-400">({unit})</span>
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
      />
    </div>
  );
}

export default function NotaEvolucionForm({
  consultaId,
  patientId,
  patientName,
  patientExpediente,
  doctorId,
  doctorName,
  doctorCedula,
  signosVitalesTriage,
  onDirtyChange,
  onDraftChange,
  recetasRelacionadas = [],
  estudiosRelacionados = [],
  onRecetaCreada,
  onEstudioCreado,
  certificadosRelacionados = [],
  onCertificadoCreado,
}: Props) {
  const existing = getNotaEvolucionByConsulta(consultaId);

  const [draft, setDraft] = useState<NotaEvolucion>(() => {
    if (existing) return JSON.parse(JSON.stringify(existing));
    const empty = createEmptyNotaEvolucion(consultaId, patientId, doctorName, doctorCedula);
    if (signosVitalesTriage) {
      empty.signosVitales = {
        temperatura: signosVitalesTriage.temperatura != null ? String(signosVitalesTriage.temperatura) : '',
        presionSistolica: signosVitalesTriage.presionSistolica != null ? String(signosVitalesTriage.presionSistolica) : '',
        presionDiastolica: signosVitalesTriage.presionDiastolica != null ? String(signosVitalesTriage.presionDiastolica) : '',
        frecuenciaCardiaca: signosVitalesTriage.frecuenciaCardiaca != null ? String(signosVitalesTriage.frecuenciaCardiaca) : '',
        frecuenciaRespiratoria: signosVitalesTriage.frecuenciaRespiratoria != null ? String(signosVitalesTriage.frecuenciaRespiratoria) : '',
        saturacionOxigeno: signosVitalesTriage.saturacionOxigeno != null ? String(signosVitalesTriage.saturacionOxigeno) : '',
        peso: signosVitalesTriage.peso != null ? String(signosVitalesTriage.peso) : '',
        talla: signosVitalesTriage.talla != null ? String(signosVitalesTriage.talla) : '',
        glucosa: signosVitalesTriage.glucosa != null ? String(signosVitalesTriage.glucosa) : '',
      };
    }
    return empty;
  });

  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showRecetaCreator, setShowRecetaCreator] = useState(false);
  const [showEstudioSolicitor, setShowEstudioSolicitor] = useState(false);
  const [showCertificadoCreator, setShowCertificadoCreator] = useState(false);
  const [recetaParaImprimir, setRecetaParaImprimir] = useState<Receta | null>(null);
  const [certificadoParaImprimir, setCertificadoParaImprimir] = useState<CertificadoMedico | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [nuevoSecundarioManual, setNuevoSecundarioManual] = useState('');

  // Plantillas por médico
  const { plantillas, addPlantilla, updatePlantilla, removePlantilla } = usePlantillas();
  const [showPlantillasManager, setShowPlantillasManager] = useState(false);

  useEffect(() => {
    onDirtyChange?.(isDirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  useEffect(() => {
    onDraftChange?.(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const updateDraft = (updater: (prev: NotaEvolucion) => NotaEvolucion) => {
    setDraft((prev) => updater(prev));
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const setSigno = (key: keyof NotaEvolucion['signosVitales'], value: string) => {
    updateDraft((prev) => ({ ...prev, signosVitales: { ...prev.signosVitales, [key]: value } }));
  };

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setIsDirty(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 400);
  };

  const allRecetas = recetasRelacionadas;
  const allEstudios = estudiosRelacionados;
  const allCertificados = certificadosRelacionados;
  const doctorEspecialidad = doctors.find((d) => d.id === doctorId)?.especialidad || 'Medicina General';

  const diagnosticoRelacionado = draft.diagnosticoPrincipal || 'Sin diagnóstico';

  const addResultado = () => {
    const nuevo: ResultadoEstudioEvolucion = { id: `re-${Date.now()}`, nombre: '', resultado: '', fecha: '' };
    updateDraft((prev) => ({ ...prev, resultadosEstudios: [...prev.resultadosEstudios, nuevo] }));
  };

  const removeResultado = (id: string) => {
    updateDraft((prev) => ({ ...prev, resultadosEstudios: prev.resultadosEstudios.filter((r) => r.id !== id) }));
  };

  const updateResultado = (id: string, field: keyof ResultadoEstudioEvolucion, value: string) => {
    updateDraft((prev) => ({
      ...prev,
      resultadosEstudios: prev.resultadosEstudios.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }));
  };

  const removeDiagnosticoSecundario = (idx: number) => {
    updateDraft((prev) => ({
      ...prev,
      diagnosticosSecundarios: prev.diagnosticosSecundarios.filter((_, i) => i !== idx),
    }));
  };

  const aplicarPlantilla = (p: PlantillaMedica) => {
    updateDraft((prev) => ({
      ...prev,
      evolucionSubjetiva: p.evolucionSubjetiva,
      evolucionObjetiva: p.evolucionObjetiva,
      tratamientoIndicaciones: p.tratamiento,
      diagnosticoPrincipal: p.diagnosticoPrincipal,
      diagnosticosSecundarios: [...p.diagnosticosSecundarios],
      pronostico: p.pronostico,
      observaciones: p.observaciones,
    }));
    setShowPlantillasManager(false);
  };

  const pronosticoOptions: { value: Pronostico; label: string; active: string }[] = [
    { value: 'bueno', label: 'Bueno', active: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
    { value: 'reservado', label: 'Reservado', active: 'bg-amber-100 text-amber-700 border-amber-300' },
    { value: 'malo', label: 'Malo', active: 'bg-red-100 text-red-700 border-red-300' },
  ];

  return (
    <div className="space-y-4">
      {/* Save bar */}
      {(isDirty || saveStatus === 'saved') && (
        <div className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border ${saveStatus === 'saved' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
          <div className="flex items-center gap-2">
            {saveStatus === 'saved' ? (
              <>
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><i className="ri-check-line text-xs"></i></span>
                <span className="text-xs font-medium text-emerald-700">Nota de Evolución guardada correctamente</span>
              </>
            ) : saveStatus === 'saving' ? (
              <>
                <span className="w-5 h-5 flex items-center justify-center"><i className="ri-loader-4-line text-sm text-amber-600 animate-spin"></i></span>
                <span className="text-xs font-medium text-amber-700">Guardando...</span>
              </>
            ) : (
              <>
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-100 text-amber-600"><i className="ri-edit-line text-xs"></i></span>
                <span className="text-xs font-medium text-amber-700">Tienes cambios sin guardar</span>
              </>
            )}
          </div>
          {saveStatus !== 'saving' && (
            <button
              onClick={handleSave}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-base whitespace-nowrap flex items-center gap-1.5 ${saveStatus === 'saved' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
            >
              <i className={saveStatus === 'saved' ? 'ri-check-line' : 'ri-save-line'}></i>
              {saveStatus === 'saved' ? 'Guardado' : 'Guardar cambios'}
            </button>
          )}
        </div>
      )}

      {/* Metadata bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 bg-background-50 rounded-xl border border-secondary-200">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600">
            <i className="ri-file-edit-line"></i>
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground-900">Nota de Evolución</p>
            <p className="text-2xs text-foreground-400">NOM-004-SSA3-2012 · Documento de seguimiento clínico</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-foreground-500 flex-wrap">
          <span className="flex items-center gap-1"><i className="ri-calendar-line"></i> {formatearFecha(draft.fecha)}</span>
          <span className="flex items-center gap-1"><i className="ri-time-line"></i> {draft.hora} hrs</span>
          <span className="flex items-center gap-1"><i className="ri-user-star-line"></i> {doctorName}</span>
          <button
            onClick={() => setShowPlantillasManager(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-primary-50 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-100 transition-base cursor-pointer whitespace-nowrap"
          >
            <i className="ri-file-copy-line"></i> Plantillas
          </button>
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-background-50 border border-secondary-200 text-foreground-600 rounded-lg hover:bg-secondary-100 transition-base cursor-pointer whitespace-nowrap"
          >
            <i className="ri-printer-line"></i> Imprimir nota
          </button>
        </div>
      </div>

      {/* Signos vitales */}
      <div className="p-4 bg-background-50 rounded-xl border border-secondary-200">
        <SectionHeader icon="ri-heart-pulse-line" title="Signos Vitales" tone="bg-emerald-100 text-emerald-600" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <SignoInput label="Temperatura" unit="°C" value={draft.signosVitales.temperatura} onChange={(v) => setSigno('temperatura', v)} placeholder="36.5" />
          <SignoInput label="P. sistólica" unit="mmHg" value={draft.signosVitales.presionSistolica} onChange={(v) => setSigno('presionSistolica', v)} placeholder="120" />
          <SignoInput label="P. diastólica" unit="mmHg" value={draft.signosVitales.presionDiastolica} onChange={(v) => setSigno('presionDiastolica', v)} placeholder="80" />
          <SignoInput label="F. cardiaca" unit="lpm" value={draft.signosVitales.frecuenciaCardiaca} onChange={(v) => setSigno('frecuenciaCardiaca', v)} placeholder="72" />
          <SignoInput label="F. respiratoria" unit="rpm" value={draft.signosVitales.frecuenciaRespiratoria} onChange={(v) => setSigno('frecuenciaRespiratoria', v)} placeholder="16" />
          <SignoInput label="SpO₂" unit="%" value={draft.signosVitales.saturacionOxigeno} onChange={(v) => setSigno('saturacionOxigeno', v)} placeholder="98" />
          <SignoInput label="Peso" unit="kg" value={draft.signosVitales.peso} onChange={(v) => setSigno('peso', v)} placeholder="70" />
          <SignoInput label="Talla" unit="m" value={draft.signosVitales.talla} onChange={(v) => setSigno('talla', v)} placeholder="1.65" />
          <SignoInput label="Glucosa" unit="mg/dL" value={draft.signosVitales.glucosa} onChange={(v) => setSigno('glucosa', v)} placeholder="—" />
        </div>
        {signosVitalesTriage && (
          <p className="text-2xs text-foreground-400 mt-2 flex items-center gap-1">
            <i className="ri-information-line"></i> Signos vitales precargados desde Triage ({signosVitalesTriage.hora} hrs). Puedes ajustarlos según la medición actual.
          </p>
        )}
      </div>

      {/* Evolución subjetiva */}
      <div className="p-4 bg-background-50 rounded-xl border border-secondary-200">
        <SectionHeader icon="ri-chat-3-line" title="Evolución Subjetiva" tone="bg-sky-100 text-sky-600" />
        <textarea
          value={draft.evolucionSubjetiva}
          onChange={(e) => updateDraft((prev) => ({ ...prev, evolucionSubjetiva: e.target.value }))}
          placeholder="Describe cómo ha evolucionado el paciente desde la última consulta: síntomas, respuesta al tratamiento, cambios relevantes..."
          rows={5}
          maxLength={2000}
          className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
        />
      </div>

      {/* Evolución objetiva */}
      <div className="p-4 bg-background-50 rounded-xl border border-secondary-200">
        <SectionHeader icon="ri-search-eye-line" title="Evolución Objetiva / Exploración Física" tone="bg-emerald-100 text-emerald-600" />
        <textarea
          value={draft.evolucionObjetiva}
          onChange={(e) => updateDraft((prev) => ({ ...prev, evolucionObjetiva: e.target.value }))}
          placeholder="Registra los hallazgos de la exploración física actual..."
          rows={5}
          maxLength={3000}
          className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
        />
      </div>

      {/* Resultados de estudios */}
      <div className="p-4 bg-background-50 rounded-xl border border-secondary-200">
        <SectionHeader icon="ri-microscope-line" title="Resultados de Estudios Relevantes" tone="bg-amber-100 text-amber-600" />
        {draft.resultadosEstudios.length === 0 ? (
          <p className="text-xs text-foreground-400 mb-2">Sin resultados de estudios registrados.</p>
        ) : (
          <div className="space-y-2 mb-2">
            {draft.resultadosEstudios.map((r) => (
              <div key={r.id} className="flex items-start gap-2 p-2.5 rounded-lg border border-secondary-100 bg-background-50">
                <input
                  type="text"
                  value={r.nombre}
                  onChange={(e) => updateResultado(r.id, 'nombre', e.target.value)}
                  placeholder="Estudio"
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
                />
                <input
                  type="text"
                  value={r.resultado}
                  onChange={(e) => updateResultado(r.id, 'resultado', e.target.value)}
                  placeholder="Resultado"
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
                />
                <input
                  type="date"
                  value={r.fecha}
                  onChange={(e) => updateResultado(r.id, 'fecha', e.target.value)}
                  className="px-2 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 outline-none focus:border-primary-400 transition-base flex-shrink-0"
                />
                <button
                  onClick={() => removeResultado(r.id)}
                  className="w-6 h-6 flex items-center justify-center rounded-full text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-base cursor-pointer flex-shrink-0"
                  aria-label="Eliminar resultado"
                >
                  <i className="ri-close-line text-xs"></i>
                </button>
              </div>
            ))}
          </div>
        )}
        <button onClick={addResultado} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg cursor-pointer transition-base">
          <i className="ri-add-line"></i> Agregar resultado
        </button>
      </div>

      {/* Diagnóstico (motivo de consulta) */}
      <div className="p-4 bg-background-50 rounded-xl border border-secondary-200">
        <SectionHeader icon="ri-award-line" title="Diagnóstico (Lo que motivó la consulta)" tone="bg-amber-100 text-amber-600" />
        {draft.diagnosticoPrincipal ? (
          <div className="flex items-start gap-2 mb-2">
            <div className="flex-1 inline-flex items-center gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-500 flex-shrink-0">
                <i className="ri-check-line text-xs"></i>
              </span>
              <span className="text-sm font-medium text-foreground-900 break-all">{draft.diagnosticoPrincipal}</span>
            </div>
            <button
              onClick={() => updateDraft((prev) => ({ ...prev, diagnosticoPrincipal: '' }))}
              className="w-7 h-7 flex items-center justify-center rounded-full text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-base cursor-pointer flex-shrink-0 mt-0.5"
              title="Cambiar diagnóstico"
            >
              <i className="ri-close-line text-sm"></i>
            </button>
          </div>
        ) : (
          <div className="mb-1">
            <p className="text-2xs font-medium text-foreground-500 mb-1.5">Busca el diagnóstico en el catálogo CIE-10:</p>
            <DiagnosticoCIE10Search
              onSelect={(codigo, descripcion) => updateDraft((prev) => ({ ...prev, diagnosticoPrincipal: `${descripcion} (${codigo})` }))}
            />
          </div>
        )}
      </div>

      {/* Tratamiento */}
      <div className="p-4 bg-background-50 rounded-xl border border-secondary-200">
        <SectionHeader icon="ri-file-list-line" title="Tratamiento / Indicaciones" tone="bg-primary-100 text-primary-600" />
        <textarea
          value={draft.tratamientoIndicaciones}
          onChange={(e) => updateDraft((prev) => ({ ...prev, tratamientoIndicaciones: e.target.value }))}
          placeholder="Describe el tratamiento e indicaciones médicas..."
          rows={4}
          maxLength={2000}
          className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
        />

        {/* Inline action buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-secondary-100">
          <button
            onClick={() => setShowRecetaCreator(true)}
            disabled={showRecetaCreator}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100 transition-base cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <i className="ri-capsule-line"></i> Generar receta
          </button>
          <button
            onClick={() => setShowEstudioSolicitor(true)}
            disabled={showEstudioSolicitor}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-accent-50 text-accent-700 border border-accent-200 rounded-lg hover:bg-accent-100 transition-base cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <i className="ri-microscope-line"></i> Solicitar estudio
          </button>
          <button
            onClick={() => setShowCertificadoCreator(true)}
            disabled={showCertificadoCreator}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-base cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <i className="ri-shield-check-line"></i> Generar certificado
          </button>
        </div>

        {/* Inline Receta Creator */}
        {showRecetaCreator && (
          <RecetaInlineCreator
            consultaId={consultaId}
            patientId={patientId}
            patientName={patientName}
            patientExpediente={patientExpediente}
            doctorId={doctorId}
            doctorName={doctorName}
            doctorCedula={doctorCedula}
            diagnosticoRelacionado={diagnosticoRelacionado}
            onRecetaCreada={(r) => { onRecetaCreada?.(r); setShowRecetaCreator(false); }}
            onCancel={() => setShowRecetaCreator(false)}
          />
        )}

        {/* Inline Estudio Solicitor */}
        {showEstudioSolicitor && (
          <EstudioInlineSolicitor
            consultaId={consultaId}
            patientId={patientId}
            patientName={patientName}
            patientExpediente={patientExpediente}
            doctorId={doctorId}
            doctorName={doctorName}
            diagnosticoRelacionado={diagnosticoRelacionado}
            onEstudioCreado={(e) => { onEstudioCreado?.(e); setShowEstudioSolicitor(false); }}
            onCancel={() => setShowEstudioSolicitor(false)}
          />
        )}

        {/* Inline Certificado Médico Creator */}
        {showCertificadoCreator && (
          <CertificadoMedicoCreator
            consultaId={consultaId}
            patientId={patientId}
            patientName={patientName}
            patientExpediente={patientExpediente}
            doctorId={doctorId}
            doctorName={doctorName}
            doctorCedula={doctorCedula}
            doctorEspecialidad={doctorEspecialidad}
            diagnosticoRelacionado={diagnosticoRelacionado}
            onCertificadoCreado={(c) => { onCertificadoCreado?.(c); setShowCertificadoCreator(false); }}
            onCancel={() => setShowCertificadoCreator(false)}
          />
        )}

        {/* Recetas y estudios ya vinculados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          <div className="p-3 bg-background-50 rounded-lg border border-secondary-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground-700 flex items-center gap-1.5">
                <i className="ri-capsule-line text-primary-600"></i> Recetas
              </span>
              {allRecetas.length > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">{allRecetas.length}</span>
              )}
            </div>
            {allRecetas.length > 0 ? (
              <div className="space-y-1.5">
                {allRecetas.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 p-2 bg-background-50 rounded border border-secondary-100 text-xs">
                    <span className="flex items-center gap-1 min-w-0">
                      <span className="font-medium truncate">Receta #{r.id.replace('r', '')}</span>
                      <span className="text-foreground-400 flex-shrink-0">· {r.estado} · {r.medicamentos.length} medicamentos</span>
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setRecetaParaImprimir(r)}
                        className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-base cursor-pointer"
                        title="Imprimir receta"
                      >
                        <i className="ri-printer-line text-xs"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-2xs text-foreground-400">Sin recetas vinculadas</p>
              </div>
            )}
          </div>
          <div className="p-3 bg-background-50 rounded-lg border border-secondary-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground-700 flex items-center gap-1.5">
                <i className="ri-microscope-line text-accent-600"></i> Estudios
              </span>
              {allEstudios.length > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium bg-sky-100 text-sky-700 border border-sky-200">{allEstudios.length}</span>
              )}
            </div>
            {allEstudios.length > 0 ? (
              <div className="space-y-1.5">
                {allEstudios.map((e) => (
                  <div key={e.id} className="p-2 bg-background-50 rounded border border-secondary-100 text-xs text-foreground-600">
                    <span className="font-medium">{e.nombre}</span>
                    <span className={e.estado === 'completado' ? 'text-emerald-600' : 'text-amber-600'}> · {e.estado}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-2xs text-foreground-400">Sin estudios vinculados</p>
              </div>
            )}
          </div>
          <div className="p-3 bg-background-50 rounded-lg border border-secondary-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground-700 flex items-center gap-1.5">
                <i className="ri-shield-check-line text-emerald-600"></i> Certificados
              </span>
              {allCertificados.length > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">{allCertificados.length}</span>
              )}
            </div>
            {allCertificados.length > 0 ? (
              <div className="space-y-1.5">
                {allCertificados.map((cert) => (
                  <div key={cert.id} className={`flex items-center justify-between gap-2 p-2 bg-background-50 rounded border text-xs ${cert.estado === 'anulado' ? 'opacity-60 border-secondary-100' : 'border-secondary-100'}`}>
                    <span className="flex items-center gap-1 min-w-0">
                      <i className="ri-shield-check-line text-emerald-500 text-xs flex-shrink-0"></i>
                      <span className="font-medium truncate">{tipoCertificadoConfig[cert.tipo].shortLabel}</span>
                      <span className="text-foreground-400 flex-shrink-0">· {cert.folio}</span>
                    </span>
                    {cert.estado === 'activo' && (
                      <button onClick={() => setCertificadoParaImprimir(cert)} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-emerald-600 hover:bg-emerald-50 transition-base cursor-pointer" title="Imprimir certificado"><i className="ri-printer-line text-xs"></i></button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-2xs text-foreground-400">Sin certificados generados</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pronóstico */}
      <div className="p-4 bg-background-50 rounded-xl border border-secondary-200">
        <SectionHeader icon="ri-bar-chart-box-line" title="Pronóstico" tone="bg-rose-100 text-rose-600" />
        <div className="flex flex-wrap gap-1.5">
          {pronosticoOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateDraft((prev) => ({ ...prev, pronostico: opt.value }))}
              className={`px-4 py-2 rounded-full text-xs font-medium border transition-base cursor-pointer whitespace-nowrap ${draft.pronostico === opt.value ? opt.active : 'bg-background-50 text-foreground-600 border-secondary-200 hover:border-secondary-300'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Observaciones */}
      <div className="p-4 bg-background-50 rounded-xl border border-secondary-200">
        <SectionHeader icon="ri-sticky-note-line" title="Observaciones" tone="bg-secondary-100 text-foreground-500" />
        <textarea
          value={draft.observaciones}
          onChange={(e) => updateDraft((prev) => ({ ...prev, observaciones: e.target.value }))}
          placeholder="Observaciones adicionales..."
          rows={3}
          maxLength={1000}
          className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
        />
      </div>

      {/* Diagnósticos Secundarios */}
      <div className="p-4 bg-background-50 rounded-xl border border-secondary-200">
        <SectionHeader icon="ri-list-check" title="Diagnósticos Secundarios" tone="bg-secondary-100 text-foreground-500" />
        {draft.diagnosticosSecundarios.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {draft.diagnosticosSecundarios.map((d, i) => (
              <div key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary-50 border border-secondary-200 rounded-lg text-xs text-foreground-700">
                <span className="font-medium">{d}</span>
                <button
                  onClick={() => removeDiagnosticoSecundario(i)}
                  className="w-4 h-4 flex items-center justify-center rounded-full text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-base cursor-pointer"
                  aria-label={`Eliminar diagnóstico secundario ${i + 1}`}
                >
                  <i className="ri-close-line text-xs"></i>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-foreground-400 mb-3">Sin diagnósticos secundarios registrados.</p>
        )}
        <div className="space-y-2">
          <p className="text-2xs font-medium text-foreground-500">Buscar en catálogo CIE-10:</p>
          <DiagnosticoCIE10Search
            onSelect={(codigo, descripcion) => {
              const nuevo = `${descripcion} (${codigo})`;
              if (!draft.diagnosticosSecundarios.includes(nuevo)) {
                updateDraft((prev) => ({ ...prev, diagnosticosSecundarios: [...prev.diagnosticosSecundarios, nuevo] }));
              }
            }}
            size="sm"
          />
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={nuevoSecundarioManual}
              onChange={(e) => setNuevoSecundarioManual(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const val = nuevoSecundarioManual.trim();
                  if (!val) return;
                  if (!draft.diagnosticosSecundarios.includes(val)) {
                    updateDraft((prev) => ({ ...prev, diagnosticosSecundarios: [...prev.diagnosticosSecundarios, val] }));
                  }
                  setNuevoSecundarioManual('');
                }
              }}
              placeholder="O escribe un diagnóstico manualmente y presiona Enter..."
              className="flex-1 px-3 py-2 text-xs bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
            />
            <button
              onClick={() => {
                const val = nuevoSecundarioManual.trim();
                if (!val) return;
                if (!draft.diagnosticosSecundarios.includes(val)) {
                  updateDraft((prev) => ({ ...prev, diagnosticosSecundarios: [...prev.diagnosticosSecundarios, val] }));
                }
                setNuevoSecundarioManual('');
              }}
              className="px-3 py-2 text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100 transition-base cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line"></i> Agregar
            </button>
          </div>
        </div>
      </div>

      {/* Firma */}
      <div className="flex items-end justify-between gap-4 px-4 py-4 bg-background-50 rounded-xl border border-secondary-200">
        <div className="text-xs text-foreground-400 flex items-center gap-1.5">
          <i className="ri-lock-line"></i> Firma electrónica registrada automáticamente al guardar.
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground-900">{doctorName}</p>
          <p className="text-2xs text-foreground-500">Cédula Profesional: {doctorCedula || '—'}</p>
          <p className="text-2xs text-foreground-400 mt-1">{formatearFecha(draft.fecha)} · {draft.hora} hrs</p>
        </div>
      </div>

      {/* Print Modal: Nota de Evolución */}
      {showPrintModal && (
        <NotaEvolucionPrintModal
          nota={draft}
          patientName={patientName}
          patientExpediente={patientExpediente}
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Print Modal: Receta */}
      {recetaParaImprimir && (
        <RecetaPrintModal
          receta={recetaParaImprimir}
          isOpen={!!recetaParaImprimir}
          onClose={() => setRecetaParaImprimir(null)}
        />
      )}

      {/* Print Modal: Certificado Médico */}
      {certificadoParaImprimir && (
        <CertificadoMedicoPrintModal
          certificado={certificadoParaImprimir}
          isOpen={!!certificadoParaImprimir}
          onClose={() => setCertificadoParaImprimir(null)}
        />
      )}

      {/* Modal: Plantillas por médico */}
      {showPlantillasManager && (
        <PlantillasManagerModal
          isOpen={showPlantillasManager}
          onClose={() => setShowPlantillasManager(false)}
          doctorId={doctorId}
          doctorName={doctorName}
          plantillas={plantillas}
          onAdd={addPlantilla}
          onUpdate={updatePlantilla}
          onRemove={removePlantilla}
          onApply={aplicarPlantilla}
        />
      )}
    </div>
  );
}