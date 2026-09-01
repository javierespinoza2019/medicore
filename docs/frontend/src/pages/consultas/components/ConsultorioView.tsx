import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Consultation } from '@/mocks/consultas';
import { consultas } from '@/mocks/consultas';
import { getRecetaById } from '@/mocks/recetas';
import { doctors } from '@/mocks/doctors';
import type { Receta } from '@/mocks/recetas';
import type { EstudioSolicitado } from '@/mocks/estudios';
import type { NotaEvolucion } from '@/mocks/notasEvolucion';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import DiagnosticoCIE10Search from './DiagnosticoCIE10Search';
import RecetaInlineCreator from './RecetaInlineCreator';
import EstudioInlineSolicitor from './EstudioInlineSolicitor';
import RecetaPrintModal from '@/pages/recetas/components/RecetaPrintModal';
import HistoriaClinicaForm from './HistoriaClinicaForm';
import HistoriaClinicaPrintModal from './HistoriaClinicaPrintModal';
import NotaEvolucionForm from './NotaEvolucionForm';
import { tipoCertificadoConfig, type CertificadoMedico } from '@/mocks/certificados';
import CertificadoMedicoCreator from './CertificadoMedicoCreator';
import CertificadoMedicoPrintModal from './CertificadoMedicoPrintModal';

const estadoConfig: Record<Consultation['estado'], { label: string; variant: 'success' | 'warning' | 'info' | 'secondary'; color: string }> = {
  pendiente: { label: 'Pendiente', variant: 'warning', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  en_curso: { label: 'En curso', variant: 'info', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  completada: { label: 'Completada', variant: 'success', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  cancelada: { label: 'Cancelada', variant: 'secondary', color: 'bg-secondary-100 text-foreground-600 border-secondary-200' },
};

const tipoConfig: Record<Consultation['tipo'], string> = {
  primera_vez: 'Primera vez',
  subsecuente: 'Subsecuente',
  urgencia: 'Urgencia',
  control: 'Control',
};

type SoapState = {
  padecimientoActual: string;
  exploracionFisica: string;
  diagnosticoPrincipal: string;
  diagnosticosSecundarios: string[];
  planTratamiento: string;
  notas: string;
  motivo: string;
};

interface ConsultorioViewProps {
  consultaActiva: Consultation;
  soapTab: 'subjetivo' | 'objetivo' | 'analisis' | 'plan';
  setSoapTab: (tab: 'subjetivo' | 'objetivo' | 'analisis' | 'plan') => void;
  hasUnsavedChanges: boolean;
  saveStatus: 'idle' | 'saved' | 'saving';
  currentSoapDisplay: SoapState;
  isEditable: boolean;
  recetasRelacionadas: { id: string; estado: string; medicamentos: { id: string }[] }[];
  estudiosRelacionados: { id: string; nombre: string; estado: string }[];
  recetaParam: string;
  estudioParam: string;
  onFinalizar: () => void;
  onVolver: () => void;
  onSave: () => void;
  updateSoapField: <K extends keyof SoapState>(field: K, value: SoapState[K]) => void;
  addDiagnosticoSecundario: () => void;
  removeDiagnosticoSecundario: (idx: number) => void;
  updateDiagnosticoSecundario: (idx: number, value: string) => void;
  onSelectHistorial: (c: Consultation) => void;
  recetasExtras: Receta[];
  estudiosExtras: EstudioSolicitado[];
  onRecetaCreada: (receta: Receta) => void;
  onEstudioCreado: (estudios: EstudioSolicitado[]) => void;
  certificadosRelacionados: CertificadoMedico[];
  certificadosExtras: CertificadoMedico[];
  onCertificadoCreado: (certificado: CertificadoMedico) => void;
  notaEvolucionDirty?: boolean;
  onNotaEvolucionDirtyChange?: (dirty: boolean) => void;
  onNotaEvolucionDraftChange?: (draft: NotaEvolucion) => void;
}

function VitalBadge({ icon, label, value, alert }: { icon: string; label: string; value: string; alert: boolean }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border ${alert ? 'bg-red-500/10 border-red-500/20' : 'bg-background-50 border-secondary-100'}`}>
      <span className={`w-7 h-7 flex items-center justify-center rounded ${alert ? 'bg-red-100 text-red-500' : 'bg-secondary-100 text-foreground-500'}`}>
        <i className={`${icon} text-xs`}></i>
      </span>
      <div>
        <p className="text-2xs text-foreground-400">{label}</p>
        <p className={`text-sm font-bold ${alert ? 'text-red-700' : 'text-foreground-900'}`}>{value}</p>
      </div>
    </div>
  );
}

function HistorialMini({ patientId, currentConsultaId, onSelect }: { patientId: string; currentConsultaId: string; onSelect: (c: Consultation) => void }) {
  const historial = consultas.filter((c: Consultation) => c.patientId === patientId && c.id !== currentConsultaId)
    .sort((a: Consultation, b: Consultation) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora));
  if (historial.length === 0) return null;

  return (
    <Card padding="none">
      <div className="px-5 py-3 border-b border-secondary-200">
        <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2">
          <i className="ri-history-line text-foreground-400"></i>
          Historial de Consultas ({historial.length})
        </h4>
      </div>
      <div className="divide-y divide-secondary-100">
        {historial.map((c: Consultation) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="w-full text-left px-5 py-3 hover:bg-secondary-50/50 transition-base cursor-pointer"
          >
            <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground-700">{c.fecha}</span>
                <span className="text-xs text-foreground-400">{c.hora}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium ${estadoConfig[c.estado].color}`}>
                  {estadoConfig[c.estado].label}
                </span>
                <Badge variant="secondary" size="sm">{tipoConfig[c.tipo]}</Badge>
              </div>
              <span className="text-2xs text-foreground-400">{c.doctorName} · {c.especialidad}</span>
            </div>
            <p className="text-xs text-foreground-600 line-clamp-2">{c.motivo}</p>
            {c.diagnosticoPrincipal && (
              <p className="text-xs text-foreground-700 mt-1.5 flex items-center gap-1">
                <span className="w-4 h-4 flex items-center justify-center rounded bg-amber-100 text-amber-600 flex-shrink-0">
                  <i className="ri-award-line text-[10px]"></i>
                </span>
                <span className="font-medium">{c.diagnosticoPrincipal}</span>
              </p>
            )}
          </button>
        ))}
      </div>
    </Card>
  );
}

export default function ConsultorioView({
  consultaActiva, soapTab, setSoapTab, hasUnsavedChanges, saveStatus,
  currentSoapDisplay, isEditable, recetasRelacionadas, estudiosRelacionados,
  recetaParam, estudioParam, onFinalizar, onVolver, onSave,
  updateSoapField, addDiagnosticoSecundario, removeDiagnosticoSecundario,
  updateDiagnosticoSecundario, onSelectHistorial,
  recetasExtras, estudiosExtras, onRecetaCreada, onEstudioCreado,
  certificadosRelacionados, certificadosExtras, onCertificadoCreado,
  onNotaEvolucionDirtyChange,
  onNotaEvolucionDraftChange,
}: ConsultorioViewProps) {
  const navigate = useNavigate();
  const [showRecetaCreator, setShowRecetaCreator] = useState(false);
  const [showEstudioSolicitor, setShowEstudioSolicitor] = useState(false);
  const [showCertificadoCreator, setShowCertificadoCreator] = useState(false);
  const [recetaParaImprimir, setRecetaParaImprimir] = useState<Receta | null>(null);
  const [certificadoParaImprimir, setCertificadoParaImprimir] = useState<CertificadoMedico | null>(null);
  const [viewMode, setViewMode] = useState<'soap' | 'historia'>('soap');
  const [showHistoriaPrintModal, setShowHistoriaPrintModal] = useState(false);

  const allRecetas = [...recetasRelacionadas, ...recetasExtras];
  const allEstudios = [...estudiosRelacionados, ...estudiosExtras];
  const allCertificados = [...certificadosRelacionados, ...certificadosExtras];
  const doctorCedula = doctors.find((d) => d.id === consultaActiva.doctorId)?.cedula || '';

  const findRecetaCompleta = (id: string): Receta | undefined => {
    const extra = recetasExtras.find((r) => r.id === id);
    if (extra) return extra;
    return getRecetaById(id);
  };

  const handlePrintReceta = (recetaId: string) => {
    const receta = findRecetaCompleta(recetaId);
    if (receta) {
      setRecetaParaImprimir(receta);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, tabs: ('subjetivo' | 'objetivo' | 'analisis' | 'plan')[]) => {
    const currentIndex = tabs.indexOf(soapTab);
    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = tabs.length - 1;
    }
    if (nextIndex !== currentIndex) {
      setSoapTab(tabs[nextIndex]);
    }
  };

  const MAX_MOTIVO = 500;
  const MAX_PADECIMIENTO = 2000;
  const MAX_EXPLORACION = 3000;
  const MAX_DIAGNOSTICO = 300;
  const MAX_PLAN = 2000;
  const MAX_NOTAS = 1000;

  const soapTabs = [
    { key: 'subjetivo' as const, icon: 'ri-chat-3-line', label: 'Subjetivo', desc: 'Motivo y padecimiento' },
    { key: 'objetivo' as const, icon: 'ri-search-eye-line', label: 'Objetivo', desc: 'Exploración física' },
    { key: 'analisis' as const, icon: 'ri-lightbulb-line', label: 'Análisis', desc: 'Diagnóstico' },
    { key: 'plan' as const, icon: 'ri-file-list-line', label: 'Plan', desc: 'Tratamiento' },
  ];

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-background-50 border border-secondary-200/70 rounded-xl">
        <button
          onClick={onVolver}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap"
        >
          <i className="ri-arrow-left-line"></i> Volver a sala de espera
        </button>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Sin guardar
            </span>
          )}
          <button
            onClick={onFinalizar}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-base cursor-pointer whitespace-nowrap shadow-sm"
          >
            <i className="ri-check-double-line"></i> Finalizar consulta
          </button>
        </div>
      </div>

      {/* Save bar */}
      {consultaActiva.tipo === 'primera_vez' && (hasUnsavedChanges || saveStatus === 'saved') && (
        <div className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border ${
          saveStatus === 'saved' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'
        }`}>
          <div className="flex items-center gap-2">
            {saveStatus === 'saved' ? (
              <>
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <i className="ri-check-line text-xs"></i>
                </span>
                <span className="text-xs font-medium text-emerald-700">Nota SOAP guardada correctamente</span>
              </>
            ) : saveStatus === 'saving' ? (
              <>
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-loader-4-line text-sm text-amber-600 animate-spin"></i>
                </span>
                <span className="text-xs font-medium text-amber-700">Guardando...</span>
              </>
            ) : (
              <>
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <i className="ri-edit-line text-xs"></i>
                </span>
                <span className="text-xs font-medium text-amber-700">Tienes cambios sin guardar</span>
              </>
            )}
          </div>
          {saveStatus !== 'saving' && (
            <div className="flex items-center gap-2">
              <button
                onClick={onSave}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-base whitespace-nowrap flex items-center gap-1.5 ${
                  saveStatus === 'saved'
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                <i className={saveStatus === 'saved' ? 'ri-check-line' : 'ri-save-line'}></i>
                {saveStatus === 'saved' ? 'Guardado' : 'Guardar cambios'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Patient Header */}
      <Card padding="md">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 text-xl font-bold flex-shrink-0">
              {consultaActiva.patientName.charAt(0)}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-foreground-900">{consultaActiva.patientName}</h2>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${estadoConfig[consultaActiva.estado].color}`}>
                  <span className={`w-2 h-2 rounded-full ${consultaActiva.estado === 'en_curso' ? 'bg-sky-500 animate-pulse' : consultaActiva.estado === 'pendiente' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                  {estadoConfig[consultaActiva.estado].label}
                </span>
                <Badge variant="secondary" size="sm">{tipoConfig[consultaActiva.tipo]}</Badge>
              </div>
              <p className="text-sm text-foreground-500 mt-1">
                {consultaActiva.patientExpediente} · {consultaActiva.especialidad} · {consultaActiva.doctorName}
              </p>
              <p className="text-xs text-foreground-400 mt-0.5">{consultaActiva.fecha} · {consultaActiva.hora} hrs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {consultaActiva.signosVitales && (
              <span className="inline-flex items-center gap-1.5 text-2xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">
                <i className="ri-heart-pulse-line"></i>
                Signos vitales registrados
              </span>
            )}
            {consultaActiva.tieneReceta && (
              <span className="inline-flex items-center gap-1.5 text-2xs bg-secondary-100 text-foreground-600 px-2 py-1 rounded-full border border-secondary-200">
                <i className="ri-capsule-line"></i>
                Receta
              </span>
            )}
            {consultaActiva.tieneEstudios && (
              <span className="inline-flex items-center gap-1.5 text-2xs bg-secondary-100 text-foreground-600 px-2 py-1 rounded-full border border-secondary-200">
                <i className="ri-microscope-line"></i>
                Estudios
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Signos Vitales */}
      {consultaActiva.signosVitales && (
        <Card padding="md">
          <h4 className="text-xs font-semibold text-foreground-700 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center rounded bg-emerald-100 text-emerald-600">
              <i className="ri-heart-pulse-line text-2xs"></i>
            </span>
            Signos Vitales registrados en Triage
            <span className="text-2xs font-normal text-foreground-400 ml-2">{consultaActiva.signosVitales.hora} hrs</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <VitalBadge icon="ri-temp-hot-line" label="Temperatura" value={`${consultaActiva.signosVitales.temperatura}°C`} alert={consultaActiva.signosVitales.temperatura > 37.5} />
            <VitalBadge icon="ri-heart-line" label="Presión" value={`${consultaActiva.signosVitales.presionSistolica}/${consultaActiva.signosVitales.presionDiastolica}`} alert={consultaActiva.signosVitales.presionSistolica > 139 || consultaActiva.signosVitales.presionSistolica < 90} />
            <VitalBadge icon="ri-heart-pulse-line" label="FC" value={`${consultaActiva.signosVitales.frecuenciaCardiaca} lpm`} alert={consultaActiva.signosVitales.frecuenciaCardiaca > 100} />
            <VitalBadge icon="ri-lungs-line" label="FR" value={`${consultaActiva.signosVitales.frecuenciaRespiratoria} rpm`} alert={consultaActiva.signosVitales.frecuenciaRespiratoria > 20} />
            <VitalBadge icon="ri-drop-line" label="SpO₂" value={`${consultaActiva.signosVitales.saturacionOxigeno}%`} alert={consultaActiva.signosVitales.saturacionOxigeno < 95} />
            <VitalBadge icon="ri-body-scan-line" label="IMC" value={consultaActiva.signosVitales.imc.toFixed(1)} alert={consultaActiva.signosVitales.imc >= 30} />
          </div>
          {consultaActiva.signosVitales.glucosa && (
            <div className="mt-2 pt-2 border-t border-secondary-100 flex items-center gap-4 text-xs text-foreground-500 flex-wrap">
              <span className="flex items-center gap-1"><i className="ri-test-tube-line"></i> Glucosa: <strong>{consultaActiva.signosVitales.glucosa} mg/dL</strong></span>
              <span className="flex items-center gap-1"><i className="ri-emotion-line"></i> Dolor (EVA): <strong>{consultaActiva.signosVitales.dolor}/10</strong></span>
              <span className="flex items-center gap-1">Realizado por: <strong>{consultaActiva.signosVitales.realizadoPor}</strong></span>
            </div>
          )}
        </Card>
      )}

      {/* Selector de vista: Nota SOAP / Historia Clínica (solo primera vez) */}
      {consultaActiva.tipo === 'primera_vez' && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-2xs text-foreground-400 font-medium mr-1">Vista:</span>
          <button
            onClick={() => setViewMode('soap')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-base whitespace-nowrap ${viewMode === 'soap' ? 'bg-foreground-900 text-background-50 border-foreground-900' : 'bg-background-50 text-foreground-600 border-secondary-200 hover:border-secondary-300'}`}
          >
            <i className="ri-file-list-line mr-1"></i>Nota de Evolución (SOAP)
          </button>
          <button
            onClick={() => setViewMode('historia')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-base whitespace-nowrap ${viewMode === 'historia' ? 'bg-foreground-900 text-background-50 border-foreground-900' : 'bg-background-50 text-foreground-600 border-secondary-200 hover:border-secondary-300'}`}
          >
            <i className="ri-folder-history-line mr-1"></i>Historia Clínica
          </button>
          {viewMode === 'historia' && (
            <button
              onClick={() => setShowHistoriaPrintModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-background-50 border border-secondary-200 text-foreground-600 rounded-full hover:bg-secondary-100 transition-base cursor-pointer whitespace-nowrap"
            >
              <i className="ri-printer-line"></i> Imprimir Historia
            </button>
          )}
        </div>
      )}

      {consultaActiva.tipo !== 'primera_vez' ? (
        <NotaEvolucionForm
          key={consultaActiva.id}
          consultaId={consultaActiva.id}
          patientId={consultaActiva.patientId}
          patientName={consultaActiva.patientName}
          patientExpediente={consultaActiva.patientExpediente}
          doctorId={consultaActiva.doctorId}
          doctorName={consultaActiva.doctorName}
          doctorCedula={doctorCedula}
          signosVitalesTriage={consultaActiva.signosVitales}
          onDirtyChange={onNotaEvolucionDirtyChange}
          onDraftChange={onNotaEvolucionDraftChange}
          recetasRelacionadas={[...recetasRelacionadas, ...recetasExtras]}
          estudiosRelacionados={[...estudiosRelacionados, ...estudiosExtras]}
          onRecetaCreada={onRecetaCreada}
          onEstudioCreado={onEstudioCreado}
          certificadosRelacionados={[...certificadosRelacionados, ...certificadosExtras]}
          onCertificadoCreado={onCertificadoCreado}
        />
      ) : (
      <>
        <div className={viewMode === 'historia' ? '' : 'hidden'}>
          <HistoriaClinicaForm key={consultaActiva.id} patientId={consultaActiva.patientId} doctorName={consultaActiva.doctorName} />
        </div>
        <div className={viewMode === 'historia' ? 'hidden' : ''}>
      {/* SOAP Tabs */}
      {/* SOAP Tabs */}
      <div className="bg-background-50 rounded-lg border border-secondary-200 p-1 flex gap-1" role="tablist" aria-label="Secciones SOAP de la consulta" onKeyDown={(e) => handleKeyDown(e, soapTabs.map((t) => t.key))}>
        {soapTabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={soapTab === tab.key}
            aria-controls={`cv-soap-panel-${tab.key}`}
            id={`cv-soap-tab-${tab.key}`}
            tabIndex={soapTab === tab.key ? 0 : -1}
            onClick={() => setSoapTab(tab.key)}
            className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer transition-base ${
              soapTab === tab.key
                ? 'bg-background-50 text-foreground-900 shadow-sm'
                : 'text-foreground-500 hover:text-foreground-700'
            }`}
          >
            <span className={`w-7 h-7 flex items-center justify-center rounded-md ${
              soapTab === tab.key ? 'bg-primary-100 text-primary-600' : 'bg-secondary-100 text-foreground-400'
            }`} aria-hidden="true">
              <i className={`${tab.icon} text-sm`}></i>
            </span>
            <div className="text-left">
              <p className="text-xs font-semibold">{tab.label}</p>
              <p className="text-2xs">{tab.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* SOAP Content */}
      <Card padding="lg">
        {soapTab === 'subjetivo' && (
          <div id="cv-soap-panel-subjetivo" role="tabpanel" aria-labelledby="cv-soap-tab-subjetivo" className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2 mb-2">
                <span className="w-5 h-5 flex items-center justify-center rounded bg-sky-100 text-sky-600" aria-hidden="true">
                  <i className="ri-question-answer-line text-2xs"></i>
                </span>
                Motivo de Consulta
              </h4>
              {isEditable ? (
                <textarea
                  id="cv-consulta-motivo"
                  value={currentSoapDisplay.motivo}
                  onChange={(e) => updateSoapField('motivo', e.target.value)}
                  placeholder="Describe el motivo de la consulta..."
                  rows={3}
                  maxLength={MAX_MOTIVO}
                  aria-label="Motivo de consulta"
                  className="w-full p-3 bg-background-50 rounded-lg border border-secondary-200 text-sm text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
                />
              ) : (
                <div className="p-3 bg-background-50 rounded-lg border border-secondary-100 text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap">
                  {currentSoapDisplay.motivo || 'Sin registro'}
                </div>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2 mb-2">
                <span className="w-5 h-5 flex items-center justify-center rounded bg-sky-100 text-sky-600" aria-hidden="true">
                  <i className="ri-file-text-line text-2xs"></i>
                </span>
                Padecimiento Actual
              </h4>
              {isEditable ? (
                <textarea
                  id="cv-consulta-padecimiento"
                  value={currentSoapDisplay.padecimientoActual}
                  onChange={(e) => updateSoapField('padecimientoActual', e.target.value)}
                  placeholder="Describe el padecimiento actual del paciente..."
                  rows={5}
                  maxLength={MAX_PADECIMIENTO}
                  aria-label="Padecimiento actual"
                  className="w-full p-3 bg-background-50 rounded-lg border border-secondary-200 text-sm text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
                />
              ) : (
                <div className="p-3 bg-background-50 rounded-lg border border-secondary-100 text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap min-h-[80px]">
                  {currentSoapDisplay.padecimientoActual || 'Pendiente de registro en consulta'}
                </div>
              )}
            </div>
          </div>
        )}

        {soapTab === 'objetivo' && (
          <div id="cv-soap-panel-objetivo" role="tabpanel" aria-labelledby="cv-soap-tab-objetivo">
            <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2 mb-2">
              <span className="w-5 h-5 flex items-center justify-center rounded bg-emerald-100 text-emerald-600" aria-hidden="true">
                <i className="ri-search-eye-line text-2xs"></i>
              </span>
              Exploración Física
            </h4>
            {isEditable ? (
              <textarea
                id="cv-consulta-exploracion"
                value={currentSoapDisplay.exploracionFisica}
                onChange={(e) => updateSoapField('exploracionFisica', e.target.value)}
                placeholder="Registra hallazgos de la exploración física..."
                rows={8}
                maxLength={MAX_EXPLORACION}
                aria-label="Exploración física"
                className="w-full p-3 bg-background-50 rounded-lg border border-secondary-200 text-sm text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
              />
            ) : (
              <div className="p-3 bg-background-50 rounded-lg border border-secondary-100 text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap min-h-[200px]">
                {currentSoapDisplay.exploracionFisica || 'Pendiente de registro en consulta'}
              </div>
            )}
          </div>
        )}

        {soapTab === 'analisis' && (
          <div id="cv-soap-panel-analisis" role="tabpanel" aria-labelledby="cv-soap-tab-analisis" className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2 mb-2">
                <span className="w-5 h-5 flex items-center justify-center rounded bg-amber-100 text-amber-600" aria-hidden="true">
                  <i className="ri-award-line text-2xs"></i>
                </span>
                Diagnóstico Principal
              </h4>
              {isEditable ? (
                <div className="space-y-2">
                  <textarea
                    id="cv-consulta-diagnostico"
                    value={currentSoapDisplay.diagnosticoPrincipal}
                    onChange={(e) => updateSoapField('diagnosticoPrincipal', e.target.value)}
                    placeholder="Escribe el diagnóstico principal..."
                    rows={2}
                    maxLength={MAX_DIAGNOSTICO}
                    aria-label="Diagnóstico principal"
                    className="w-full p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-sm text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-base resize-none font-medium"
                  />
                  <div className="mt-2">
                    <p className="text-2xs font-medium text-foreground-500 mb-1" id="cv-cie10-label">Buscar diagnóstico en catálogo CIE-10</p>
                    <DiagnosticoCIE10Search
                      onSelect={(_codigo, descripcion) => updateSoapField('diagnosticoPrincipal', descripcion)}
                      size="sm"
                    />
                  </div>
                </div>
              ) : (
                <div className={`p-3 rounded-lg border text-sm font-medium leading-relaxed ${
                  currentSoapDisplay.diagnosticoPrincipal
                    ? 'bg-amber-500/10 border-amber-500/20 text-foreground-900'
                    : 'bg-background-50 border-secondary-100 text-foreground-400'
                }`}>
                  {currentSoapDisplay.diagnosticoPrincipal || 'Sin diagnóstico registrado'}
                </div>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2 mb-2">
                <span className="w-5 h-5 flex items-center justify-center rounded bg-secondary-100 text-foreground-500" aria-hidden="true">
                  <i className="ri-list-check text-2xs"></i>
                </span>
                Diagnósticos Secundarios
              </h4>
              <div className="space-y-1.5">
                {currentSoapDisplay.diagnosticosSecundarios.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {isEditable ? (
                      <>
                        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-secondary-100 text-foreground-500 text-2xs font-bold flex-shrink-0" aria-hidden="true">{i + 1}</span>
                        <input
                          type="text"
                          value={d}
                          onChange={(e) => updateDiagnosticoSecundario(i, e.target.value)}
                          placeholder="Diagnóstico secundario..."
                          maxLength={MAX_DIAGNOSTICO}
                          aria-label={`Diagnóstico secundario ${i + 1}`}
                          className="flex-1 p-2 bg-background-50 rounded-lg border border-secondary-200 text-sm text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
                        />
                        <button
                          onClick={() => removeDiagnosticoSecundario(i)}
                          className="w-6 h-6 flex items-center justify-center rounded-full text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-base cursor-pointer"
                          aria-label={`Eliminar diagnóstico secundario ${i + 1}`}
                        >
                          <i className="ri-close-line text-xs"></i>
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 bg-background-50 rounded-lg border border-secondary-100 text-sm text-foreground-700 w-full">
                        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-secondary-100 text-foreground-500 text-2xs font-bold flex-shrink-0" aria-hidden="true">{i + 1}</span>
                        {d}
                      </div>
                    )}
                  </div>
                ))}
                {isEditable && (
                  <>
                    <button
                      onClick={addDiagnosticoSecundario}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg cursor-pointer transition-base"
                    >
                      <i className="ri-add-line"></i> Agregar diagnóstico secundario
                    </button>
                    <div className="mt-2">
                      <p className="text-2xs font-medium text-foreground-500 mb-1" id="cv-cie10-label-sec">O buscar en catálogo CIE-10</p>
                      <DiagnosticoCIE10Search
                        onSelect={(_codigo, descripcion) => {
                          updateSoapField('diagnosticosSecundarios', [...currentSoapDisplay.diagnosticosSecundarios, descripcion]);
                        }}
                        size="sm"
                      />
                    </div>
                  </>
                )}
                {!isEditable && currentSoapDisplay.diagnosticosSecundarios.length === 0 && (
                  <p className="text-xs text-foreground-400 p-2">Sin diagnósticos secundarios</p>
                )}
              </div>
            </div>
          </div>
        )}

        {soapTab === 'plan' && (
          <div id="cv-soap-panel-plan" role="tabpanel" aria-labelledby="cv-soap-tab-plan" className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2 mb-2">
                <span className="w-5 h-5 flex items-center justify-center rounded bg-primary-100 text-primary-600" aria-hidden="true">
                  <i className="ri-file-list-line text-2xs"></i>
                </span>
                Plan de Tratamiento
              </h4>
              {isEditable ? (
                <textarea
                  id="cv-consulta-plan"
                  value={currentSoapDisplay.planTratamiento}
                  onChange={(e) => updateSoapField('planTratamiento', e.target.value)}
                  placeholder="Describe el plan de tratamiento, indicaciones y seguimiento..."
                  rows={5}
                  maxLength={MAX_PLAN}
                  aria-label="Plan de tratamiento"
                  className="w-full p-3 bg-background-50 rounded-lg border border-secondary-200 text-sm text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
                />
              ) : (
                <div className="p-3 bg-background-50 rounded-lg border border-secondary-100 text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap min-h-[120px]">
                  {currentSoapDisplay.planTratamiento || 'Pendiente de registro en consulta'}
                </div>
              )}
            </div>

            {/* Inline action buttons */}
            {isEditable && (
              <div className="flex flex-wrap items-center gap-2">
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
            )}

            {/* Inline Receta Creator */}
            {showRecetaCreator && (
              <RecetaInlineCreator
                consultaId={consultaActiva.id}
                patientId={consultaActiva.patientId}
                patientName={consultaActiva.patientName}
                patientExpediente={consultaActiva.patientExpediente}
                doctorId={consultaActiva.doctorId}
                doctorName={consultaActiva.doctorName}
                doctorCedula={doctorCedula}
                diagnosticoRelacionado={currentSoapDisplay.diagnosticoPrincipal || 'Sin diagnóstico'}
                onRecetaCreada={(r) => { onRecetaCreada(r); setShowRecetaCreator(false); }}
                onCancel={() => setShowRecetaCreator(false)}
              />
            )}

            {/* Inline Estudio Solicitor */}
            {showEstudioSolicitor && (
              <EstudioInlineSolicitor
                consultaId={consultaActiva.id}
                patientId={consultaActiva.patientId}
                patientName={consultaActiva.patientName}
                patientExpediente={consultaActiva.patientExpediente}
                doctorId={consultaActiva.doctorId}
                doctorName={consultaActiva.doctorName}
                diagnosticoRelacionado={currentSoapDisplay.diagnosticoPrincipal || 'Sin diagnóstico'}
                onEstudioCreado={(e) => { onEstudioCreado(e); setShowEstudioSolicitor(false); }}
                onCancel={() => setShowEstudioSolicitor(false)}
              />
            )}

            {/* Inline Certificado Médico Creator */}
            {showCertificadoCreator && (
              <CertificadoMedicoCreator
                consultaId={consultaActiva.id}
                patientId={consultaActiva.patientId}
                patientName={consultaActiva.patientName}
                patientExpediente={consultaActiva.patientExpediente}
                doctorId={consultaActiva.doctorId}
                doctorName={consultaActiva.doctorName}
                doctorCedula={doctorCedula}
                doctorEspecialidad={consultaActiva.especialidad}
                diagnosticoRelacionado={currentSoapDisplay.diagnosticoPrincipal || 'Sin diagnóstico'}
                onCertificadoCreado={(c) => { onCertificadoCreado(c); setShowCertificadoCreator(false); }}
                onCancel={() => setShowCertificadoCreator(false)}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-3 bg-background-50 rounded-lg border border-secondary-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground-700 flex items-center gap-1.5">
                    <i className="ri-capsule-line text-primary-600"></i>
                    Recetas
                  </span>
                  {allRecetas.length > 0 && (
                    <Badge variant="success" size="sm">{allRecetas.length}</Badge>
                  )}
                </div>
                {allRecetas.length > 0 ? (
                  <div className="space-y-1.5">
                    {allRecetas.map((r) => {
                      const isHighlighted = recetaParam === r.id;
                      return (
                        <div
                          key={r.id}
                          className={`p-2 bg-background-50 rounded border text-xs transition-base ${
                            isHighlighted ? 'border-primary-400 bg-primary-50/50 ring-1 ring-primary-200' : 'border-secondary-100'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1 min-w-0">
                              {isHighlighted && <i className="ri-arrow-right-circle-line text-primary-500 text-xs flex-shrink-0"></i>}
                              <span className="font-medium truncate">Receta #{r.id.replace('r', '')}</span>
                              <span className="text-foreground-400 flex-shrink-0">· {r.estado} · {r.medicamentos.length} medicamentos</span>
                            </span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => handlePrintReceta(r.id)}
                                className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-base cursor-pointer"
                                title="Imprimir receta"
                              >
                                <i className="ri-printer-line text-xs"></i>
                              </button>
                              <button
                                onClick={() => navigate(`/app/recetas?receta=${r.id}`)}
                                className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-base cursor-pointer"
                                title="Ver receta completa"
                              >
                                <i className="ri-external-link-line text-xs"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-2xs text-foreground-400 mb-2">Sin recetas vinculadas</p>
                    {!isEditable && (
                      <p className="text-2xs text-foreground-400">Consulta completada. No se pueden agregar recetas.</p>
                    )}
                  </div>
                )}
              </div>
              <div className="p-3 bg-background-50 rounded-lg border border-secondary-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground-700 flex items-center gap-1.5">
                    <i className="ri-microscope-line text-accent-600"></i>
                    Estudios
                  </span>
                  {allEstudios.length > 0 && (
                    <Badge variant="info" size="sm">{allEstudios.length}</Badge>
                  )}
                </div>
                {allEstudios.length > 0 ? (
                  <div className="space-y-1.5">
                    {allEstudios.map((e) => {
                      const isHighlighted = estudioParam === e.id;
                      return (
                        <button
                          key={e.id}
                          onClick={() => navigate(`/app/estudios?estudio=${e.id}`)}
                          className={`w-full text-left block p-2 bg-background-50 rounded border text-xs text-foreground-600 hover:border-accent-300 transition-base cursor-pointer ${
                            isHighlighted ? 'border-accent-400 bg-accent-50/50 ring-1 ring-accent-200' : 'border-secondary-100'
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            {isHighlighted && <i className="ri-arrow-right-circle-line text-accent-500 text-xs"></i>}
                            <span className="font-medium">{e.nombre}</span>
                            <span className={e.estado === 'completado' ? 'text-emerald-600' : 'text-amber-600'}>· {e.estado}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-2xs text-foreground-400 mb-2">Sin estudios vinculados</p>
                    {!isEditable && (
                      <p className="text-2xs text-foreground-400">Consulta completada. No se pueden solicitar estudios.</p>
                    )}
                  </div>
                )}
              </div>
              <div className="p-3 bg-background-50 rounded-lg border border-secondary-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground-700 flex items-center gap-1.5">
                    <i className="ri-shield-check-line text-emerald-600"></i>
                    Certificados
                  </span>
                  {allCertificados.length > 0 && (
                    <Badge variant="success" size="sm">{allCertificados.length}</Badge>
                  )}
                </div>
                {allCertificados.length > 0 ? (
                  <div className="space-y-1.5">
                    {allCertificados.map((cert) => (
                      <div key={cert.id} className={`p-2 bg-background-50 rounded border text-xs transition-base ${cert.estado === 'anulado' ? 'opacity-60 border-secondary-100' : 'border-secondary-100'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1 min-w-0">
                            <i className="ri-shield-check-line text-emerald-500 text-xs flex-shrink-0"></i>
                            <span className="font-medium truncate">{tipoCertificadoConfig[cert.tipo].shortLabel}</span>
                            <span className="text-foreground-400 flex-shrink-0">· {cert.folio}</span>
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {cert.estado === 'activo' && (
                              <button
                                onClick={() => setCertificadoParaImprimir(cert)}
                                className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-emerald-600 hover:bg-emerald-50 transition-base cursor-pointer"
                                title="Imprimir certificado"
                              >
                                <i className="ri-printer-line text-xs"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-2xs text-foreground-400 mb-2">Sin certificados generados</p>
                    {!isEditable && (
                      <p className="text-2xs text-foreground-400">Consulta completada. No se pueden generar certificados.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Notas adicionales */}
      {(currentSoapDisplay.notas || isEditable) && (
        <Card padding="md">
          <h4 className="text-xs font-semibold text-foreground-700 mb-2 flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center rounded bg-secondary-100 text-foreground-500" aria-hidden="true">
              <i className="ri-sticky-note-line text-2xs"></i>
            </span>
            Notas de la Consulta
          </h4>
          {isEditable ? (
            <textarea
              id="cv-consulta-notas"
              value={currentSoapDisplay.notas}
              onChange={(e) => updateSoapField('notas', e.target.value)}
              placeholder="Notas adicionales, observaciones..."
              rows={3}
              maxLength={MAX_NOTAS}
              aria-label="Notas de la consulta"
              className="w-full p-3 bg-background-50 rounded-lg border border-secondary-200 text-sm text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
            />
          ) : (
            <p className="text-sm text-foreground-600 leading-relaxed whitespace-pre-wrap">{currentSoapDisplay.notas}</p>
          )}
        </Card>
      )}

      </div>
      </>
      )}

      {/* Historial */}
      <HistorialMini
        patientId={consultaActiva.patientId}
        currentConsultaId={consultaActiva.id}
        onSelect={onSelectHistorial}
      />

      {/* Print Modal */}
      {recetaParaImprimir && (
        <RecetaPrintModal
          receta={recetaParaImprimir}
          isOpen={!!recetaParaImprimir}
          onClose={() => setRecetaParaImprimir(null)}
        />
      )}

      {/* Certificado Print Modal */}
      {certificadoParaImprimir && (
        <CertificadoMedicoPrintModal
          certificado={certificadoParaImprimir}
          isOpen={!!certificadoParaImprimir}
          onClose={() => setCertificadoParaImprimir(null)}
        />
      )}

      {/* Historia Clínica Print Modal */}
      {showHistoriaPrintModal && (
        <HistoriaClinicaPrintModal
          patientId={consultaActiva.patientId}
          isOpen={showHistoriaPrintModal}
          onClose={() => setShowHistoriaPrintModal(false)}
        />
      )}
    </div>
  );
}