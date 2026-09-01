import { useParams, useNavigate } from 'react-router-dom';
import { getPatientById } from '@/mocks/patients';
import Avatar from '@/components/base/Avatar';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Tabs from '@/components/base/Tabs';
import Modal from '@/components/base/Modal';
import { useState, useRef, useEffect, useMemo } from 'react';
import ExpedienteUnificado from './components/ExpedienteUnificado';
import HistoriaClinicaReadOnly from '@/pages/consultas/components/HistoriaClinicaReadOnly';
import HistoriaClinicaForm from '@/pages/consultas/components/HistoriaClinicaForm';
import NotaEvolucionPrintModal from '@/pages/consultas/components/NotaEvolucionPrintModal';
import CertificadoMedicoPrintModal from '@/pages/consultas/components/CertificadoMedicoPrintModal';
import { getCertificadosByPatient, tipoCertificadoConfig, type CertificadoMedico } from '@/mocks/certificados';
import { getRecetasByPatient } from '@/mocks/recetas';
import { getEstudiosByPatient } from '@/mocks/estudios';
import { getNotasEvolucionByPatient, type NotaEvolucion } from '@/mocks/notasEvolucion';
import { getConsultasByPatient } from '@/mocks/consultas';
import { listDocuments, addDocument, deleteDocument, formatFileSize, type DocumentoPaciente } from '@/utils/documentStore';

function formatearFecha(fecha: string): string {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
}

const tabs = [
  { key: 'resumen', label: 'Resumen', icon: 'ri-file-text-line' },
  { key: 'expediente', label: 'Expediente Unificado', icon: 'ri-folder-history-line', count: 0 },
  { key: 'antecedentes', label: 'Antecedentes', icon: 'ri-history-line' },
  { key: 'nota_medica', label: 'Nota Médica', icon: 'ri-file-edit-line' },
  { key: 'consultas', label: 'Consultas', icon: 'ri-stethoscope-line' },
  { key: 'recetas', label: 'Recetas', icon: 'ri-capsule-line' },
  { key: 'estudios', label: 'Estudios', icon: 'ri-microscope-line' },
  { key: 'signos', label: 'Signos Vitales', icon: 'ri-heart-pulse-line' },
  { key: 'documentos', label: 'Documentos', icon: 'ri-folder-line' },
];

export default function PacienteDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('expediente');
  const [historiaDirty, setHistoriaDirty] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<string | null>(null);

  const patient = id ? getPatientById(id) : undefined;

  const handleTabChange = (key: string) => {
    if (key === activeTab) return;
    if (key !== 'antecedentes' && historiaDirty) {
      setPendingLeave(key);
      return;
    }
    setActiveTab(key);
  };

  const confirmLeave = () => {
    if (pendingLeave) setActiveTab(pendingLeave);
    setPendingLeave(null);
    setHistoriaDirty(false);
  };

  if (!patient) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
        <Card padding="lg" className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-red-100 mb-4">
            <i className="ri-error-warning-line text-2xl text-red-500"></i>
          </div>
          <h2 className="text-xl font-bold text-foreground-900 font-heading mb-2">Paciente No Encontrado</h2>
          <p className="text-sm text-foreground-500 mb-6">El expediente que buscas no existe o fue eliminado.</p>
          <Button variant="primary" size="sm" onClick={() => navigate('/app/pacientes')}>
            Volver a Pacientes
          </Button>
        </Card>
      </div>
    );
  }

  const nombreCompleto = `${patient.nombre} ${patient.apellidos}`;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => navigate('/app/pacientes')} className="text-foreground-500 hover:text-primary-600 transition-base cursor-pointer">
          Pacientes
        </button>
        <span className="text-foreground-300">/</span>
        <span className="text-foreground-700 font-medium truncate">{nombreCompleto}</span>
      </div>

      {/* Patient header */}
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar name={nombreCompleto} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-foreground-900 font-heading truncate">{nombreCompleto}</h1>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="secondary" size="md">{patient.expediente}</Badge>
                <Badge variant={patient.estado === 'activo' ? 'success' : 'secondary'} size="md" dot>
                  {patient.estado === 'activo' ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2 flex-wrap text-sm text-foreground-600">
              <span className="flex items-center gap-1">
                <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-user-line text-xs"></i></span>
                {patient.edad} años · {patient.sexo === 'F' ? 'Femenino' : 'Masculino'}
              </span>
              <span className="text-foreground-300 hidden sm:inline">|</span>
              <span className="flex items-center gap-1">
                <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-calendar-line text-xs"></i></span>
                Nacimiento: {formatearFecha(patient.fechaNacimiento)}
              </span>
              <span className="text-foreground-300 hidden sm:inline">|</span>
              <span className="flex items-center gap-1">
                <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-phone-line text-xs"></i></span>
                {patient.telefono}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="secondary" size="sm" icon={<i className="ri-calendar-event-line"></i>} onClick={() => navigate(`/app/agenda?paciente=${patient.id}`)}>
              Agendar Cita
            </Button>
            <Button variant="primary" size="sm" icon={<i className="ri-stethoscope-line"></i>} onClick={() => navigate(`/app/consultas?paciente=${patient.id}`)}>
              Nueva Consulta
            </Button>
          </div>
        </div>

        {/* Alergias y alertas */}
        {(patient.alergias.length > 0 || patient.alertas.length > 0) && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-secondary-200">
            {patient.alergias.map((a) => (
              <div key={a} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-medium">
                <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-error-warning-line text-xs"></i></span>
                Alergia: {a}
              </div>
            ))}
            {patient.alertas.map((a) => (
              <div key={a} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-medium">
                <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-alert-line text-xs"></i></span>
                {a}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tabs */}
      <Card padding="none">
        <div className="px-5">
          <Tabs id="paciente-tab" tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />
        </div>

        <div
          className="p-5"
          role="tabpanel"
          id={`paciente-tab-panel-${activeTab}`}
          aria-labelledby={`paciente-tab-tab-${activeTab}`}
          tabIndex={0}
        >
          {activeTab === 'resumen' && <ResumenTab patient={patient} />}
          {activeTab === 'expediente' && <ExpedienteUnificado patientId={patient.id} />}
          {activeTab === 'antecedentes' && <AntecedentesTab patient={patient} historiaDirty={historiaDirty} onDirtyChange={setHistoriaDirty} />}
          {activeTab === 'nota_medica' && <NotaMedicaTab patientId={patient.id} patientName={`${patient.nombre} ${patient.apellidos}`} patientExpediente={patient.expediente} />}
          {activeTab === 'consultas' && <ConsultasTab />}
          {activeTab === 'recetas' && <RecetasTab patientId={patient.id} />}
          {activeTab === 'estudios' && <EstudiosTab patientId={patient.id} />}
          {activeTab === 'signos' && <SignosTab />}
          {activeTab === 'documentos' && <DocumentosTab patientId={patient.id} />}
        </div>
      </Card>

      <Modal
        open={pendingLeave !== null}
        onClose={() => setPendingLeave(null)}
        title="Cambios sin guardar"
        size="sm"
        role="alertdialog"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setPendingLeave(null)}>Cancelar</Button>
            <Button variant="danger" size="sm" onClick={confirmLeave}>Descartar y salir</Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-100 text-amber-600 flex-shrink-0">
            <i className="ri-error-warning-line text-lg"></i>
          </span>
          <div>
            <p className="text-sm font-medium text-foreground-800">Tienes cambios sin guardar en la Historia Clínica.</p>
            <p className="text-xs text-foreground-500 mt-1">Si sales de la pestaña ahora, se perderán los cambios realizados.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ResumenTab({ patient }: { patient: ReturnType<typeof getPatientById> }) {
  if (!patient) return null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Info column */}
      <div className="lg:col-span-1 space-y-4">
        <Card padding="sm">
          <h4 className="text-sm font-semibold text-foreground-900 font-heading mb-3">Información Personal</h4>
          <div className="space-y-2.5">
            <Row label="CURP" value={patient.curp} />
            <Row label="Edad" value={`${patient.edad} años`} />
            <Row label="Fecha Nac." value={formatearFecha(patient.fechaNacimiento)} />
            <Row label="Sexo" value={patient.sexo === 'F' ? 'Femenino' : 'Masculino'} />
          </div>
        </Card>
        <Card padding="sm">
          <h4 className="text-sm font-semibold text-foreground-900 font-heading mb-3">Contacto</h4>
          <div className="space-y-2.5">
            <Row label="Teléfono" value={patient.telefono} />
            <Row label="Celular" value={patient.celular} />
            <Row label="Email" value={patient.email || '—'} />
            <Row label="Dirección" value={patient.direccion} />
          </div>
        </Card>
        <Card padding="sm">
          <h4 className="text-sm font-semibold text-foreground-900 font-heading mb-3">Emergencia / Seguro</h4>
          <div className="space-y-2.5">
            <Row label="Contacto" value={patient.contactoEmergencia} />
            <Row label="Parentesco" value={patient.parentescoEmergencia} />
            <Row label="Aseguradora" value={patient.aseguradora || 'Particular'} />
            <Row label="Póliza" value={patient.poliza || '—'} />
          </div>
        </Card>
      </div>

      {/* Timeline column */}
      <div className="lg:col-span-2 space-y-4">
        <Card padding="sm">
          <h4 className="text-sm font-semibold text-foreground-900 font-heading mb-4">Timeline Clínico</h4>
          <div className="relative pl-6 space-y-5 before:absolute before:left-[9px] before:top-1 before:bottom-1 before:w-px before:bg-secondary-200">
            {timelineEvents.map((event, i) => (
              <div key={i} className="relative">
                <div className={`absolute left-[-22px] top-1 w-3.5 h-3.5 rounded-full border-2 border-background-50 ${event.color}`}></div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground-800">{event.title}</p>
                    <p className="text-xs text-foreground-500 mt-0.5">{event.doctor}</p>
                  </div>
                  <span className="text-2xs text-foreground-400 whitespace-nowrap">{event.date}</span>
                </div>
                {event.detail && (
                  <p className="text-xs text-foreground-600 mt-1.5 ml-0">{event.detail}</p>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card padding="sm">
          <h4 className="text-sm font-semibold text-foreground-900 font-heading mb-3">Médico Asignado</h4>
          <div className="flex items-center gap-3">
            <Avatar name={patient.medicoAsignado} size="md" />
            <div>
              <p className="text-sm font-semibold text-foreground-800">{patient.medicoAsignado}</p>
              <p className="text-xs text-foreground-500">Última consulta: {formatearFecha(patient.ultimaVisita)}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function AntecedentesTab({
  patient,
  historiaDirty,
  onDirtyChange,
}: {
  patient: ReturnType<typeof getPatientById>;
  historiaDirty: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [editingHistoria, setEditingHistoria] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  if (!patient) return null;

  const handleCancelEdit = () => {
    if (historiaDirty) {
      setShowCancelConfirm(true);
    } else {
      setEditingHistoria(false);
    }
  };

  const confirmCancelEdit = () => {
    setShowCancelConfirm(false);
    setEditingHistoria(false);
    onDirtyChange(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="sm">
          <h4 className="text-sm font-semibold text-foreground-900 font-heading mb-3">Alergias</h4>
          {patient.alergias.length === 0 ? (
            <p className="text-sm text-foreground-500 italic">Sin alergias registradas</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {patient.alergias.map((a) => (
                <Badge key={a} variant="warning" size="md">{a}</Badge>
              ))}
            </div>
          )}
        </Card>

        <Card padding="sm">
          <h4 className="text-sm font-semibold text-foreground-900 font-heading mb-3">Alertas Clínicas</h4>
          {patient.alertas.length === 0 ? (
            <p className="text-sm text-foreground-500 italic">Sin alertas registradas</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {patient.alertas.map((a) => (
                <Badge key={a} variant="danger" size="md">{a}</Badge>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Historia Clínica: solo lectura o editable */}
      <div>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h3 className="text-sm font-semibold text-foreground-900 font-heading flex items-center gap-2">
            <span className="w-6 h-6 flex items-center justify-center rounded-md bg-primary-100 text-primary-600">
              <i className="ri-folder-history-line text-xs"></i>
            </span>
            Historia Clínica
          </h3>
          {!editingHistoria ? (
            <button
              onClick={() => setEditingHistoria(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-base cursor-pointer whitespace-nowrap"
            >
              <i className="ri-edit-line"></i> Editar Historia Clínica
            </button>
          ) : (
            <button
              onClick={handleCancelEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary-100 text-foreground-600 rounded-lg hover:bg-secondary-200 transition-base cursor-pointer whitespace-nowrap"
            >
              <i className="ri-close-line"></i> Cancelar edición
            </button>
          )}
        </div>

        {editingHistoria ? (
          <HistoriaClinicaForm patientId={patient.id} doctorName={patient.medicoAsignado} onDirtyChange={onDirtyChange} />
        ) : (
          <HistoriaClinicaReadOnly patientId={patient.id} />
        )}
      </div>

      <Modal
        open={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        title="Cambios sin guardar"
        size="sm"
        role="alertdialog"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCancelConfirm(false)}>Cancelar</Button>
            <Button variant="danger" size="sm" onClick={confirmCancelEdit}>Descartar cambios</Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-100 text-amber-600 flex-shrink-0">
            <i className="ri-error-warning-line text-lg"></i>
          </span>
          <div>
            <p className="text-sm font-medium text-foreground-800">Tienes cambios sin guardar en la Historia Clínica.</p>
            <p className="text-xs text-foreground-500 mt-1">Si cancelas la edición ahora, se perderán los cambios realizados.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function NotaMedicaTab({ patientId, patientName, patientExpediente }: { patientId: string; patientName: string; patientExpediente: string }) {
  const notas = useMemo(() => getNotasEvolucionByPatient(patientId), [patientId]);
  const consultas = useMemo(() => getConsultasByPatient(patientId), [patientId]);
  const [notaSeleccionada, setNotaSeleccionada] = useState<NotaEvolucion | null>(null);

  const pronosticoConfig: Record<string, { label: string; className: string }> = {
    bueno: { label: 'Bueno', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    reservado: { label: 'Reservado', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    malo: { label: 'Malo', className: 'bg-red-100 text-red-700 border-red-200' },
  };

  if (notas.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-4">
          <i className="ri-file-edit-line text-2xl text-foreground-400"></i>
        </div>
        <p className="text-sm font-semibold text-foreground-700">Sin notas médicas registradas</p>
        <p className="text-xs text-foreground-500 mt-1 max-w-sm mx-auto">
          Las notas de evolución se generan durante las consultas subsecuentes, de control o urgencia.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h3 className="text-sm font-semibold text-foreground-900 flex items-center gap-2">
          <span className="w-6 h-6 flex items-center justify-center rounded-md bg-primary-100 text-primary-600">
            <i className="ri-file-edit-line text-xs"></i>
          </span>
          Notas de Evolución
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-secondary-200 text-foreground-600 text-xs">{notas.length}</span>
        </h3>
      </div>

      {notas.map((nota) => {
        const consulta = consultas.find((c) => c.id === nota.consultaId);
        const pron = pronosticoConfig[nota.pronostico] || { label: nota.pronostico, className: 'bg-secondary-100 text-foreground-600 border-secondary-200' };
        return (
          <div
            key={nota.id}
            className="p-4 rounded-xl border border-secondary-200 bg-background-50 hover:border-secondary-300 transition-base"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600 flex-shrink-0">
                  <i className="ri-file-edit-line"></i>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground-900">Nota de Evolución</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium border ${pron.className}`}>
                      {pron.label}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-500 mt-0.5">
                    {nota.medico} · {nota.fecha} · {nota.hora} hrs
                    {consulta && <span> · {consulta.especialidad}</span>}
                  </p>
                  {nota.diagnosticoPrincipal && (
                    <p className="text-xs font-medium text-foreground-700 mt-1 flex items-center gap-1">
                      <span className="w-3.5 h-3.5 flex items-center justify-center rounded bg-amber-100 text-amber-600 flex-shrink-0">
                        <i className="ri-award-line text-[8px]"></i>
                      </span>
                      {nota.diagnosticoPrincipal}
                    </p>
                  )}
                  {nota.evolucionSubjetiva && (
                    <p className="text-xs text-foreground-500 mt-1 line-clamp-2 italic">"{nota.evolucionSubjetiva.substring(0, 120)}{nota.evolucionSubjetiva.length > 120 ? '...' : ''}"</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setNotaSeleccionada(nota)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-base cursor-pointer whitespace-nowrap flex-shrink-0"
              >
                <i className="ri-printer-line"></i> Imprimir nota
              </button>
            </div>

            {/* Signos vitales mini */}
            <div className="mt-3 pt-3 border-t border-secondary-100 flex flex-wrap gap-3 text-xs text-foreground-500">
              {nota.signosVitales.temperatura && (
                <span className="flex items-center gap-1">
                  <i className="ri-temp-hot-line text-amber-500"></i> {nota.signosVitales.temperatura}°C
                </span>
              )}
              {nota.signosVitales.presionSistolica && nota.signosVitales.presionDiastolica && (
                <span className="flex items-center gap-1">
                  <i className="ri-heart-line text-rose-500"></i> {nota.signosVitales.presionSistolica}/{nota.signosVitales.presionDiastolica} mmHg
                </span>
              )}
              {nota.signosVitales.frecuenciaCardiaca && (
                <span className="flex items-center gap-1">
                  <i className="ri-heart-pulse-line text-red-400"></i> FC {nota.signosVitales.frecuenciaCardiaca} lpm
                </span>
              )}
              {nota.signosVitales.saturacionOxigeno && (
                <span className="flex items-center gap-1">
                  <i className="ri-drop-line text-sky-500"></i> SpO₂ {nota.signosVitales.saturacionOxigeno}%
                </span>
              )}
              {nota.signosVitales.peso && nota.signosVitales.talla && (
                <span className="flex items-center gap-1">
                  <i className="ri-body-scan-line text-foreground-400"></i>
                  IMC {(parseFloat(nota.signosVitales.peso) / (parseFloat(nota.signosVitales.talla) ** 2)).toFixed(1)}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* Modal imprimir nota */}
      {notaSeleccionada && (
        <NotaEvolucionPrintModal
          nota={notaSeleccionada}
          patientName={patientName}
          patientExpediente={patientExpediente}
          isOpen={!!notaSeleccionada}
          onClose={() => setNotaSeleccionada(null)}
        />
      )}
    </div>
  );
}

function ConsultasTab() {
  const consultas = [
    { fecha: '2024-12-18', motivo: 'Control de hipertensión', medico: 'Dra. Patricia Mendoza', diagnostico: 'Hipertensión esencial (I10)', estado: 'completada' },
    { fecha: '2024-11-15', motivo: 'Dolor abdominal', medico: 'Dr. Alejandro García', diagnostico: 'Gastritis (K29.7)', estado: 'completada' },
    { fecha: '2024-10-02', motivo: 'Revisión general', medico: 'Dr. Alejandro García', diagnostico: 'Sin hallazgos', estado: 'completada' },
    { fecha: '2024-08-20', motivo: 'Dolor de cabeza persistente', medico: 'Dr. Alejandro García', diagnostico: 'Cefalea tensional (G44.2)', estado: 'completada' },
    { fecha: '2024-06-10', motivo: 'Chequeo anual', medico: 'Dra. Patricia Mendoza', diagnostico: 'Sin hallazgos', estado: 'completada' },
  ];

  return (
    <div className="space-y-0">
      {consultas.map((c, i) => (
        <div key={i} className="flex items-center gap-4 py-3 border-b border-secondary-100 last:border-0 hover:bg-secondary-50/50 px-2 -mx-2 rounded-lg transition-base cursor-pointer">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-100 flex-shrink-0">
            <i className="ri-stethoscope-line text-primary-600 text-sm"></i>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground-800">{c.motivo}</p>
            <p className="text-xs text-foreground-500">{c.medico} · {c.diagnostico}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-foreground-600">{formatearFecha(c.fecha)}</p>
            <Badge variant="success" size="sm">{c.estado}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecetasTab({ patientId }: { patientId: string }) {
  const recetas = getRecetasByPatient(patientId);

  if (recetas.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-3">
          <i className="ri-capsule-line text-xl text-foreground-400"></i>
        </div>
        <p className="text-sm font-medium text-foreground-700">Sin recetas registradas</p>
        <p className="text-xs text-foreground-500 mt-1">Las recetas generadas desde consulta apareceran aqui.</p>
      </div>
    );
  }

  const estadoRecetaConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' | 'danger' }> = {
    activa: { label: 'Activa', variant: 'success' },
    surtida: { label: 'Surtida', variant: 'secondary' },
    parcial: { label: 'Parcial', variant: 'warning' },
    vencida: { label: 'Vencida', variant: 'danger' },
    cancelada: { label: 'Cancelada', variant: 'danger' },
  };

  return (
    <div className="space-y-0">
      {recetas.map((r) => {
        const estadoCfg = estadoRecetaConfig[r.estado] || { label: r.estado, variant: 'secondary' as const };
        return (
          <div key={r.id} className="flex items-start gap-4 py-3 border-b border-secondary-100 last:border-0 hover:bg-secondary-50/50 px-2 -mx-2 rounded-lg transition-base cursor-pointer">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-accent-100 flex-shrink-0 mt-0.5">
              <i className="ri-capsule-line text-accent-600 text-sm"></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground-800">
                  {r.medicamentos.length} medicamento{r.medicamentos.length !== 1 ? 's' : ''}
                </p>
                <Badge variant={estadoCfg.variant} size="sm">{estadoCfg.label}</Badge>
              </div>
              <p className="text-xs text-foreground-500 mt-0.5">
                {r.medicamentos.map((m) => `${m.nombre} ${m.concentracion}`).join(', ')}
              </p>
              {r.diagnosticoRelacionado && (
                <p className="text-xs text-foreground-400 mt-0.5 truncate">Dx: {r.diagnosticoRelacionado}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-foreground-600">{formatearFecha(r.fecha)}</p>
              <p className="text-2xs text-foreground-400">{r.doctorName}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EstudiosTab({ patientId }: { patientId: string }) {
  const estudiosList = getEstudiosByPatient(patientId);

  const tipoEstudioIcon: Record<string, string> = {
    laboratorio: 'ri-flask-line',
    imagen: 'ri-image-line',
    gabinete: 'ri-heart-pulse-line',
    patologia: 'ri-microscope-line',
    otro: 'ri-file-text-line',
  };

  const estadoEstudioConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' | 'danger' }> = {
    solicitado: { label: 'Solicitado', variant: 'warning' },
    en_proceso: { label: 'En proceso', variant: 'secondary' },
    completado: { label: 'Completado', variant: 'success' },
    cancelado: { label: 'Cancelado', variant: 'danger' },
  };

  if (estudiosList.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-3">
          <i className="ri-microscope-line text-xl text-foreground-400"></i>
        </div>
        <p className="text-sm font-medium text-foreground-700">Sin estudios registrados</p>
        <p className="text-xs text-foreground-500 mt-1">Los estudios solicitados desde consulta apareceran aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {estudiosList.map((e) => {
        const estadoCfg = estadoEstudioConfig[e.estado] || { label: e.estado, variant: 'secondary' as const };
        const icon = tipoEstudioIcon[e.tipo] || 'ri-file-text-line';
        return (
          <div key={e.id} className="flex items-start gap-4 py-3 border-b border-secondary-100 last:border-0 hover:bg-secondary-50/50 px-2 -mx-2 rounded-lg transition-base cursor-pointer">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-amber-100 flex-shrink-0 mt-0.5">
              <i className={`${icon} text-amber-600 text-sm`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground-800">{e.nombre}</p>
                <Badge variant={estadoCfg.variant} size="sm">{estadoCfg.label}</Badge>
              </div>
              <p className="text-xs text-foreground-500 mt-0.5">{e.categoria} · Ref: {e.numeroReferencia}</p>
              {e.diagnosticoRelacionado && (
                <p className="text-xs text-foreground-400 mt-0.5 truncate">Dx: {e.diagnosticoRelacionado}</p>
              )}
              {e.resultado && e.estado === 'completado' && (
                <p className="text-xs text-foreground-600 mt-1 bg-secondary-50 rounded-lg p-2">{e.resultado}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-foreground-600">{formatearFecha(e.fechaSolicitud)}</p>
              <p className="text-2xs text-foreground-400">{e.doctorName}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SignosTab() {
  const registros = [
    { fecha: '2024-12-18', peso: '68.5 kg', talla: '1.65 m', imc: '25.2', temp: '36.5°C', pa: '130/85', fc: '72 lpm', fr: '16 rpm', spo2: '98%', glucosa: '95 mg/dL' },
    { fecha: '2024-11-15', peso: '68.0 kg', talla: '1.65 m', imc: '25.0', temp: '36.8°C', pa: '128/82', fc: '70 lpm', fr: '15 rpm', spo2: '99%', glucosa: '90 mg/dL' },
    { fecha: '2024-10-02', peso: '67.8 kg', talla: '1.65 m', imc: '24.9', temp: '36.4°C', pa: '125/80', fc: '68 lpm', fr: '14 rpm', spo2: '98%', glucosa: '88 mg/dL' },
  ];

  return (
    <div className="space-y-4">
      {registros.map((r, i) => (
        <Card key={i} padding="sm" className="hover:border-secondary-300 transition-base cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-foreground-800">{formatearFecha(r.fecha)}</h4>
            <span className="text-2xs text-foreground-400">Enfermería</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            <SignoItem label="Peso" value={r.peso} />
            <SignoItem label="Talla" value={r.talla} />
            <SignoItem label="IMC" value={r.imc} />
            <SignoItem label="Temperatura" value={r.temp} />
            <SignoItem label="P. Arterial" value={r.pa} />
            <SignoItem label="F. Cardiaca" value={r.fc} />
            <SignoItem label="F. Respiratoria" value={r.fr} />
            <SignoItem label="SpO2" value={r.spo2} />
            <SignoItem label="Glucosa" value={r.glucosa} />
          </div>
        </Card>
      ))}
    </div>
  );
}

function DocumentosTab({ patientId }: { patientId: string }) {
  const [certificadoSeleccionado, setCertificadoSeleccionado] = useState<CertificadoMedico | null>(null);
  const [certificadoAAnular, setCertificadoAAnular] = useState<CertificadoMedico | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [errorMotivo, setErrorMotivo] = useState('');
  const [certificados, setCertificados] = useState(() => getCertificadosByPatient(patientId));
  const [documentos, setDocumentos] = useState<DocumentoPaciente[]>([]);
  const [docLoading, setDocLoading] = useState(true);
  const [docError, setDocError] = useState('');
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    listDocuments(patientId)
      .then((docs) => {
        if (active) setDocumentos(docs);
      })
      .catch(() => {
        if (active) setDocError('No se pudieron cargar los documentos.');
      })
      .finally(() => {
        if (active) setDocLoading(false);
      });
    return () => {
      active = false;
    };
  }, [patientId]);

  const handleAnular = () => {
    const motivo = motivoAnulacion.trim();
    if (!motivo) {
      setErrorMotivo('El motivo de anulacion es obligatorio.');
      return;
    }
    if (motivo.length < 10) {
      setErrorMotivo('El motivo debe tener al menos 10 caracteres.');
      return;
    }
    if (certificadoAAnular) {
      // Actualizar en el mock
      const idx = certificados.findIndex((c) => c.id === certificadoAAnular.id);
      if (idx >= 0) {
        const updated = [...certificados];
        updated[idx] = {
          ...updated[idx],
          estado: 'anulado',
          anuladoPor: 'Dr. Alejandro Garcia Mendoza',
          anuladoEn: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
          motivoAnulacion: motivo,
        };
        setCertificados(updated);
      }
    }
    setCertificadoAAnular(null);
    setMotivoAnulacion('');
    setErrorMotivo('');
  };

  const handleCloseAnular = () => {
    setCertificadoAAnular(null);
    setMotivoAnulacion('');
    setErrorMotivo('');
  };

  const handleDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const doc = await addDocument(patientId, file);
      setDocumentos((prev) => [doc, ...prev]);
      setDocError('');
    } catch {
      setDocError('No se pudo subir el documento.');
    } finally {
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const handleDownloadDoc = (doc: DocumentoPaciente) => {
    const url = URL.createObjectURL(doc.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const handleDeleteDoc = async (doc: DocumentoPaciente) => {
    try {
      await deleteDocument(doc.id);
      setDocumentos((prev) => prev.filter((d) => d.id !== doc.id));
    } catch {
      setDocError('No se pudo eliminar el documento.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Certificados medicos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground-900 font-heading flex items-center gap-2">
            <span className="w-6 h-6 flex items-center justify-center rounded-md bg-accent-100 text-accent-600">
              <i className="ri-file-shield-line text-xs"></i>
            </span>
            Certificados Medicos
          </h3>
          <span className="text-xs text-foreground-500">{certificados.length} emitido{certificados.length !== 1 ? 's' : ''}</span>
        </div>

        {certificados.length === 0 ? (
          <div className="text-center py-8 rounded-xl border border-dashed border-secondary-200 bg-background-50">
            <div className="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-2">
              <i className="ri-file-shield-line text-lg text-foreground-400"></i>
            </div>
            <p className="text-sm text-foreground-600">Sin certificados medicos registrados</p>
            <p className="text-xs text-foreground-400 mt-1">Los certificados generados desde consulta apareceran aqui.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {certificados.map((cert) => {
              const tipoCfg = tipoCertificadoConfig[cert.tipo];
              const isAnulado = cert.estado === 'anulado';
              return (
                <div
                  key={cert.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                    isAnulado
                      ? 'border-red-200 bg-red-50/40'
                      : 'border-secondary-200 bg-background-50 hover:border-secondary-300'
                  }`}
                >
                  <div className={`w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0 ${isAnulado ? 'bg-red-100' : 'bg-accent-100'}`}>
                    <i className={`${tipoCfg.icon} ${isAnulado ? 'text-red-500' : 'text-accent-600'} text-sm`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-medium truncate ${isAnulado ? 'text-foreground-400 line-through' : 'text-foreground-800'}`}>
                        {tipoCfg.label}
                      </p>
                      <Badge
                        variant={isAnulado ? 'danger' : 'success'}
                        size="sm"
                      >
                        {isAnulado ? 'Anulado' : 'Activo'}
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground-500 mt-0.5">
                      Folio: <span className={`font-medium ${isAnulado ? 'text-foreground-400' : 'text-foreground-700'}`}>{cert.folio}</span>
                      {' · '}
                      {formatearFecha(cert.fecha)}
                      {' · '}
                      {cert.doctorName}
                    </p>
                    {cert.diagnostico && (
                      <p className={`text-xs mt-0.5 truncate ${isAnulado ? 'text-foreground-400' : 'text-foreground-500'}`}>
                        Diagnostico: {cert.diagnostico}
                      </p>
                    )}
                    {/* Trazabilidad de anulacion */}
                    {isAnulado && cert.anuladoPor && (
                      <div className="mt-2 p-2.5 rounded-lg bg-red-100/60 border border-red-200">
                        <p className="text-xs font-semibold text-red-700">Anulacion registrada</p>
                        <p className="text-xs text-red-600 mt-0.5">
                          Por: {cert.anuladoPor} · {cert.anuladoEn}
                        </p>
                        {cert.motivoAnulacion && (
                          <p className="text-xs text-red-600 mt-1">
                            Motivo: {cert.motivoAnulacion}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setCertificadoSeleccionado(cert)}
                      disabled={isAnulado}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                        isAnulado
                          ? 'bg-secondary-100 text-foreground-400 cursor-not-allowed'
                          : 'bg-primary-500 text-background-50 hover:bg-primary-600'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 flex items-center justify-center">
                        <i className="ri-eye-line text-[10px]"></i>
                      </span>
                      Ver
                    </button>
                    {!isAnulado && (
                      <button
                        onClick={() => setCertificadoAAnular(cert)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-all cursor-pointer whitespace-nowrap"
                      >
                        <span className="w-3.5 h-3.5 flex items-center justify-center">
                          <i className="ri-close-circle-line text-[10px]"></i>
                        </span>
                        Anular
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Documentos adjuntos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground-900 font-heading flex items-center gap-2">
            <span className="w-6 h-6 flex items-center justify-center rounded-md bg-secondary-100 text-secondary-600">
              <i className="ri-folder-open-line text-xs"></i>
            </span>
            Documentos Adjuntos
            {!docLoading && <span className="text-xs text-foreground-500 font-normal">({documentos.length})</span>}
          </h3>
          <input ref={docInputRef} type="file" onChange={handleDocSelect} className="hidden" />
          <Button variant="secondary" size="sm" icon={<i className="ri-upload-cloud-line"></i>} onClick={() => docInputRef.current?.click()}>
            Subir Documento
          </Button>
        </div>

        {docError && <p className="text-xs text-red-500 mb-3">{docError}</p>}

        {docLoading ? (
          <div className="text-center py-10 rounded-xl border border-dashed border-secondary-200 bg-background-50">
            <p className="text-sm text-foreground-500">Cargando documentos...</p>
          </div>
        ) : documentos.length === 0 ? (
          <div className="text-center py-10 rounded-xl border border-dashed border-secondary-200 bg-background-50">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-3">
              <i className="ri-upload-cloud-line text-xl text-foreground-400"></i>
            </div>
            <p className="text-sm font-medium text-foreground-700">Sin documentos adjuntos</p>
            <p className="text-xs text-foreground-500 mt-1 max-w-sm mx-auto">
              Sube resultados de laboratorio, estudios de imagen, consentimientos informados y más.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {documentos.map((doc) => {
              const isImage = doc.tipo.startsWith('image/');
              return (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-secondary-200 bg-background-50 hover:border-secondary-300 transition-base">
                  <div className={`w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0 ${isImage ? 'bg-sky-100 text-sky-600' : 'bg-secondary-100 text-secondary-600'}`}>
                    <i className={`${isImage ? 'ri-image-line' : 'ri-file-text-line'} text-sm`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground-800 truncate">{doc.nombre}</p>
                    <p className="text-2xs text-foreground-400">
                      {formatFileSize(doc.tamanio)} · {new Date(doc.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleDownloadDoc(doc)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer"
                      aria-label={`Descargar ${doc.nombre}`}
                      title="Descargar"
                    >
                      <i className="ri-download-line text-sm"></i>
                    </button>
                    <button
                      onClick={() => handleDeleteDoc(doc)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-red-600 hover:bg-red-500/10 transition-base cursor-pointer"
                      aria-label={`Eliminar ${doc.nombre}`}
                      title="Eliminar"
                    >
                      <i className="ri-delete-bin-line text-sm"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de impresion */}
      {certificadoSeleccionado && (
        <CertificadoMedicoPrintModal
          isOpen={!!certificadoSeleccionado}
          onClose={() => setCertificadoSeleccionado(null)}
          certificado={certificadoSeleccionado}
        />
      )}

      {/* Modal de anulacion */}
      <Modal
        open={certificadoAAnular !== null}
        onClose={handleCloseAnular}
        title="Anular certificado medico"
        size="md"
        role="alertdialog"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={handleCloseAnular}>Cancelar</Button>
            <Button variant="danger" size="sm" onClick={handleAnular}>Confirmar anulacion</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 flex items-center justify-center rounded-full bg-red-100 text-red-500 flex-shrink-0">
              <i className="ri-error-warning-line text-lg"></i>
            </span>
            <div>
              <p className="text-sm font-medium text-foreground-800">
                Vas a anular el certificado <span className="font-semibold">{certificadoAAnular?.folio}</span>
              </p>
              <p className="text-xs text-foreground-500 mt-1">
                Esta accion no se puede deshacer. El certificado quedara marcado como Anulado y no podra volver a imprimirse.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-700 mb-1.5">
              Motivo de anulacion <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivoAnulacion}
              onChange={(e) => {
                setMotivoAnulacion(e.target.value);
                if (errorMotivo) setErrorMotivo('');
              }}
              placeholder="Describe el motivo por el cual se anula este certificado (ej: error en diagnostico, duplicado, solicitud del paciente...)"
              className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 resize-none"
              rows={3}
              maxLength={500}
            />
            {errorMotivo && (
              <p className="text-xs text-red-500 mt-1">{errorMotivo}</p>
            )}
            <p className="text-2xs text-foreground-400 mt-1">Minimo 10 caracteres. Maximo 500.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-foreground-500">{label}</span>
      <span className="text-sm font-medium text-foreground-800">{value}</span>
    </div>
  );
}

function SignoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-2 rounded-lg bg-secondary-50">
      <p className="text-xs text-foreground-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground-800">{value}</p>
    </div>
  );
}

const timelineEvents = [
  { title: 'Consulta — Control de hipertensión', doctor: 'Dra. Patricia Mendoza', date: '18 Dic 2024', color: 'bg-primary-500', detail: 'Paciente refiere mareos ocasionales. Se ajusta dosis de Losartán.' },
  { title: 'Receta — Losartán 50mg', doctor: 'Dra. Patricia Mendoza', date: '18 Dic 2024', color: 'bg-accent-500' },
  { title: 'Consulta — Dolor abdominal', doctor: 'Dr. Alejandro García', date: '15 Nov 2024', color: 'bg-primary-500', detail: 'Dolor epigástrico de 3 días. Diagnóstico: Gastritis.' },
  { title: 'Receta — Omeprazol 20mg', doctor: 'Dr. Alejandro García', date: '15 Nov 2024', color: 'bg-accent-500' },
  { title: 'Consulta — Revisión general', doctor: 'Dr. Alejandro García', date: '02 Oct 2024', color: 'bg-primary-500', detail: 'Chequeo de rutina. Sin hallazgos relevantes.' },
  { title: 'Consulta — Cefalea tensional', doctor: 'Dr. Alejandro García', date: '20 Ago 2024', color: 'bg-primary-500' },
  { title: 'Consulta — Chequeo anual', doctor: 'Dra. Patricia Mendoza', date: '10 Jun 2024', color: 'bg-primary-500', detail: 'Primera consulta en la clínica. Alta de expediente.' },
];