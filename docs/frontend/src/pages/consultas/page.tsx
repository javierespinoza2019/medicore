import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { patients } from '@/mocks/patients';
import { useAuth } from '@/hooks/useAuth';
import { doctors } from '@/mocks/doctors';
import { consultas as consultasMock, getConsultasByPatient, type Consultation } from '@/mocks/consultas';
import { getRecetasByConsulta, type Receta } from '@/mocks/recetas';
import { getEstudiosByConsulta, type EstudioSolicitado } from '@/mocks/estudios';
import { addEstudiosGlobal } from '@/hooks/useEstudiosState';
import { getCertificadosByConsulta, tipoCertificadoConfig, type CertificadoMedico } from '@/mocks/certificados';
import { getTriageRecordById, triagePacientes, type TriageRecord, type TriagePatient } from '@/mocks/triage';
import type { NotaEvolucion } from '@/mocks/notasEvolucion';
import ConsultorioView from '@/pages/consultas/components/ConsultorioView';
import DiagnosticoCIE10Search from '@/pages/consultas/components/DiagnosticoCIE10Search';
import NotaEvolucionReadOnly from '@/pages/consultas/components/NotaEvolucionReadOnly';
import NotaEvolucionForm from '@/pages/consultas/components/NotaEvolucionForm';
import RecetaInlineCreator from '@/pages/consultas/components/RecetaInlineCreator';
import EstudioInlineSolicitor from '@/pages/consultas/components/EstudioInlineSolicitor';
import HistoriaClinicaForm from '@/pages/consultas/components/HistoriaClinicaForm';
import HistoriaClinicaReadOnly from '@/pages/consultas/components/HistoriaClinicaReadOnly';
import HistoriaClinicaPrintModal from '@/pages/consultas/components/HistoriaClinicaPrintModal';
import CertificadoMedicoCreator from '@/pages/consultas/components/CertificadoMedicoCreator';
import CertificadoMedicoPrintModal from '@/pages/consultas/components/CertificadoMedicoPrintModal';
import RecetaPrintModal from '@/pages/recetas/components/RecetaPrintModal';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import { exportToExcel } from '@/utils/exportUtils';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/feature/PaginationControls';

const estadoConfig: Record<Consultation['estado'], { label: string; variant: 'success' | 'warning' | 'info' | 'secondary'; color: string }> = {
  pendiente: { label: 'Pendiente', variant: 'warning', color: 'bg-amber-500/15 text-amber-500 border-amber-500/20' },
  en_curso: { label: 'En curso', variant: 'info', color: 'bg-sky-500/15 text-sky-500 border-sky-500/20' },
  completada: { label: 'Completada', variant: 'success', color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20' },
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

export default function Consultas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const pacienteParam = searchParams.get('paciente') || '';
  const recetaParam = searchParams.get('receta') || '';
  const estudioParam = searchParams.get('estudio') || '';
  const triageParam = searchParams.get('triage') || '';

  const [searchTerm, setSearchTerm] = useState('');
  const [consultaActiva, setConsultaActiva] = useState<Consultation | null>(null);
  const [filterEstado, setFilterEstado] = useState<Consultation['estado'] | 'todas'>('todas');
  const [expandedConsultaId, setExpandedConsultaId] = useState<string | null>(null);
  const [soapTab, setSoapTab] = useState<'subjetivo' | 'objetivo' | 'analisis' | 'plan'>('subjetivo');
  const [nuevaConsultaTriage, setNuevaConsultaTriage] = useState<Consultation | null>(null);
  const [triageRecordActivo, setTriageRecordActivo] = useState<TriageRecord | null>(null);
  const [soapDraft, setSoapDraft] = useState<SoapState>({
    padecimientoActual: '',
    exploracionFisica: '',
    diagnosticoPrincipal: '',
    diagnosticosSecundarios: [],
    planTratamiento: '',
    notas: '',
    motivo: '',
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'saving'>('idle');
  const [showEstadoMenu, setShowEstadoMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [recetasExtras, setRecetasExtras] = useState<Receta[]>([]);
  const [estudiosExtras, setEstudiosExtras] = useState<EstudioSolicitado[]>([]);
  const [certificadosExtras, setCertificadosExtras] = useState<CertificadoMedico[]>([]);
  const [showRecetaCreator, setShowRecetaCreator] = useState(false);
  const [showEstudioSolicitor, setShowEstudioSolicitor] = useState(false);
  const [showCertificadoCreator, setShowCertificadoCreator] = useState(false);
  const [certificadoParaImprimir, setCertificadoParaImprimir] = useState<CertificadoMedico | null>(null);
  const [recetaParaImprimir, setRecetaParaImprimir] = useState<Receta | null>(null);
  const [showHistoriaClinica, setShowHistoriaClinica] = useState(false);
  const [showHistoriaPrintModal, setShowHistoriaPrintModal] = useState(false);
  // Nota de Evolución – estado sucio y borrador actuales (mantenidos en el padre)
  const [notaEvolucionDirty, setNotaEvolucionDirty] = useState(false);
  const [notaEvolucionDraft, setNotaEvolucionDraft] = useState<NotaEvolucion | null>(null);
  // Diálogos de guardia para Nota de Evolución
  const [showFinalizarConfirm, setShowFinalizarConfirm] = useState(false);
  const [showVolverConfirm, setShowVolverConfirm] = useState(false);
  const [nom004Errors, setNom004Errors] = useState<string[]>([]);
  const [showNom004Modal, setShowNom004Modal] = useState(false);

  const isModoConsultorio = (pacienteParam !== '' && consultaActiva !== null && (consultaActiva.estado === 'en_curso' || consultaActiva.estado === 'pendiente')) || nuevaConsultaTriage !== null;

  // Validación de campos obligatorios antes de finalizar la consulta
  const validarCamposObligatorios = (): string[] => {
    if (!consultaActiva) return [];
    const errors: string[] = [];
    if (consultaActiva.tipo === 'primera_vez') {
      if (!soapDraft.motivo.trim()) errors.push('Motivo de consulta (campo obligatorio)');
      if (!soapDraft.padecimientoActual.trim()) errors.push('Padecimiento actual (campo obligatorio)');
      if (!soapDraft.exploracionFisica.trim()) errors.push('Exploración física (campo obligatorio)');
      if (!soapDraft.diagnosticoPrincipal.trim()) errors.push('Diagnóstico principal (campo obligatorio)');
      if (!soapDraft.planTratamiento.trim()) errors.push('Plan de tratamiento (campo obligatorio)');
    } else {
      const draft = notaEvolucionDraft;
      if (!draft?.diagnosticoPrincipal?.trim()) errors.push('Diagnóstico principal (campo obligatorio NOM-004)');
      if (!draft?.pronostico) errors.push('Pronóstico (campo obligatorio NOM-004)');
    }
    return errors;
  };

  const handleFinalizarConsulta = () => {
    if (!consultaActiva) return;
    const errors = validarCamposObligatorios();
    if (errors.length > 0) {
      setNom004Errors(errors);
      setShowNom004Modal(true);
      return;
    }
    setShowFinalizarConfirm(true);
  };

  const doFinalizar = () => {
    if (!consultaActiva) return;
    if (hasUnsavedChanges) handleSave();
    // Update the consultation in the global mock array so the list reflects 'completada'
    const mockIdx = consultasMock.findIndex((c) => c.id === consultaActiva.id);
    if (mockIdx >= 0) {
      consultasMock[mockIdx] = { ...consultasMock[mockIdx], ...soapDraft, estado: 'completada' };
    }
    setConsultaActiva({ ...consultaActiva, estado: 'completada' });
    setNotaEvolucionDirty(false);
    setHasUnsavedChanges(false);
    navigate('/app/sala-espera');
  };

  const handleVolverSalaEspera = () => {
    if (notaEvolucionDirty) {
      setShowVolverConfirm(true);
      return;
    }
    navigate('/app/sala-espera');
  };

  const handleVolverListado = () => {
    setConsultaActiva(null);
    setExpandedConsultaId(null);
    setHasUnsavedChanges(false);
    setShowQuickActions(false);
    setShowEstadoMenu(false);
    setShowHistoriaClinica(false);
  };

  const handleExportExcel = () => {
    const data = [...consultasFiltradas];
    const rows = data.map((c) => ({
      ID: c.id,
      Paciente: c.patientName,
      Expediente: c.patientExpediente,
      Médico: c.doctorName,
      Especialidad: c.especialidad,
      Fecha: c.fecha,
      Hora: c.hora,
      Tipo: tipoConfig[c.tipo],
      Estado: estadoConfig[c.estado].label,
      Motivo: c.motivo,
      'Diagnóstico Principal': c.diagnosticoPrincipal || '—',
      'Tiene Receta': c.tieneReceta ? 'Sí' : 'No',
      'Tiene Estudios': c.tieneEstudios ? 'Sí' : 'No',
    }));
    const dateStr = new Date().toISOString().split('T')[0];
    exportToExcel(rows, `Consultas_MediCore_${dateStr}`, 'Consultas');
  };

  const handleEstudiosCreados = (nuevos: EstudioSolicitado[]) => {
    setEstudiosExtras((prev) => [...prev, ...nuevos]);
    addEstudiosGlobal(nuevos);
  };

  const [pendingNavigation, setPendingNavigation] = useState<{ id: string } | null>(null);

  // Manejar llegada desde Triage
  useEffect(() => {
    if (!triageParam || !pacienteParam) return;

    const triageRecord = getTriageRecordById(triageParam);
    if (!triageRecord) return;

    setTriageRecordActivo(triageRecord);

    // Buscar consulta activa existente para este paciente
    const consultaExistente = consultasMock.find(
      (c) => c.patientId === pacienteParam && (c.estado === 'pendiente' || c.estado === 'en_curso')
    );

    if (consultaExistente) {
      // Actualizar la consulta existente con los signos vitales del triage
      const consultaActualizada = { ...consultaExistente, signosVitales: triageRecord, estado: 'en_curso' as const };
      setConsultaActiva(consultaActualizada);
      setExpandedConsultaId(consultaActualizada.id);
      setSoapDraft({
        padecimientoActual: consultaExistente.padecimientoActual || '',
        exploracionFisica: consultaExistente.exploracionFisica || '',
        diagnosticoPrincipal: consultaExistente.diagnosticoPrincipal || '',
        diagnosticosSecundarios: [...consultaExistente.diagnosticosSecundarios],
        planTratamiento: consultaExistente.planTratamiento || '',
        notas: consultaExistente.notas || '',
        motivo: consultaExistente.motivo || '',
      });
      setHasUnsavedChanges(false);
      setSaveStatus('idle');
      setShowQuickActions(false);
      setSoapTab('subjetivo');
      setShowEstadoMenu(false);
      setNuevaConsultaTriage(null);
    } else {
      // Buscar datos del paciente para crear nueva consulta
      const patient = patients.find((p) => p.id === pacienteParam);

      // Crear consulta nueva desde triage
      const nuevaConsulta: Consultation = {
        id: `c-triage-${Date.now()}`,
        sucursalId: patient?.sucursalId || '',
        patientId: pacienteParam,
        patientName: patient ? `${patient.nombre} ${patient.apellidos}` : 'Paciente de Triage',
        patientExpediente: patient?.expediente || '',
        doctorId: doctors[0]?.id || 'd1',
        doctorName: doctors[0]?.nombre || 'Dr. Asignado',
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toTimeString().slice(0, 5),
        especialidad: doctors[0]?.especialidad || 'Medicina General',
        tipo: 'primera_vez',
        estado: 'en_curso',
        motivo: triageRecord.notas || 'Paciente referido desde Triage',
        padecimientoActual: '',
        exploracionFisica: '',
        diagnosticoPrincipal: '',
        diagnosticosSecundarios: [],
        planTratamiento: '',
        notas: '',
        signosVitales: triageRecord,
        tieneReceta: false,
        tieneEstudios: false,
      };

      setNuevaConsultaTriage(nuevaConsulta);
      setConsultaActiva(nuevaConsulta);
      setExpandedConsultaId(nuevaConsulta.id);
      setSoapDraft({
        padecimientoActual: '',
        exploracionFisica: '',
        diagnosticoPrincipal: '',
        diagnosticosSecundarios: [],
        planTratamiento: '',
        notas: '',
        motivo: '',
      });
      setHasUnsavedChanges(false);
      setSaveStatus('idle');
      setShowQuickActions(false);
      setSoapTab('subjetivo');
      setShowEstadoMenu(false);
    }
  }, [triageParam, pacienteParam]);

  // Manejar llegada desde Sala de Espera / navegación directa
  useEffect(() => {
    if (!pacienteParam || triageParam) return;

    // If there's already an active consultation for this patient, open it
    const existingActive = consultasMock.find(
      (c) => c.patientId === pacienteParam && (c.estado === 'pendiente' || c.estado === 'en_curso')
    );
    if (existingActive) {
      selectConsulta(existingActive);
      return;
    }

    const patientConsults = consultasMock
      .filter((c) => c.patientId === pacienteParam)
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora));

    if (patientConsults.length > 0) {
      const latest = patientConsults[0];
      selectConsulta(latest);
    } else {
      // No consulta exists — create one on the fly for this patient
      const patient = patients.find((p) => p.id === pacienteParam);
      if (!patient) return;

      const triagePatient = triagePacientes.find((tp) => tp.id === pacienteParam);
      const triageRecord = triagePatient?.ultimoTriage || null;

      const newConsulta: Consultation = {
        id: `c-auto-${Date.now()}`,
        sucursalId: patient.sucursalId,
        patientId: pacienteParam,
        patientName: `${patient.nombre} ${patient.apellidos}`,
        patientExpediente: patient.expediente,
        doctorId: doctors[0]?.id || 'd1',
        doctorName: doctors[0]?.nombre || 'Dr. Asignado',
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toTimeString().slice(0, 5),
        especialidad: doctors[0]?.especialidad || 'Medicina General',
        tipo: 'primera_vez',
        estado: 'en_curso',
        motivo: patient.alertas?.[0] || 'Consulta general',
        padecimientoActual: '',
        exploracionFisica: '',
        diagnosticoPrincipal: '',
        diagnosticosSecundarios: [],
        planTratamiento: '',
        notas: '',
        signosVitales: triageRecord,
        tieneReceta: false,
        tieneEstudios: false,
      };

      consultasMock.push(newConsulta);
      setNuevaConsultaTriage(newConsulta);
      setConsultaActiva(newConsulta);
      setExpandedConsultaId(newConsulta.id);
      setSoapDraft({
        padecimientoActual: '',
        exploracionFisica: '',
        diagnosticoPrincipal: '',
        diagnosticosSecundarios: [],
        planTratamiento: '',
        notas: '',
        motivo: '',
      });
      setHasUnsavedChanges(false);
      setSaveStatus('idle');
      setShowQuickActions(false);
      setSoapTab('subjetivo');
      setShowEstadoMenu(false);
    }
  }, [pacienteParam, triageParam]);

  useEffect(() => {
    if (recetaParam && consultaActiva) {
      setSoapTab('plan');
    }
    if (estudioParam && consultaActiva) {
      setSoapTab('plan');
    }
  }, [recetaParam, estudioParam, consultaActiva]);

  const selectConsulta = (c: Consultation) => {
    if (hasUnsavedChanges && consultaActiva && consultaActiva.id !== c.id) {
      setPendingNavigation({ id: c.id });
      return;
    }
    setConsultaActiva(c);
    setExpandedConsultaId(c.id);
    setSoapDraft({
      padecimientoActual: c.padecimientoActual || '',
      exploracionFisica: c.exploracionFisica || '',
      diagnosticoPrincipal: c.diagnosticoPrincipal || '',
      diagnosticosSecundarios: [...c.diagnosticosSecundarios],
      planTratamiento: c.planTratamiento || '',
      notas: c.notas || '',
      motivo: c.motivo || '',
    });
    setHasUnsavedChanges(false);
    setSaveStatus('idle');
    setShowQuickActions(c.estado === 'completada');
    setSoapTab('subjetivo');
    setShowEstadoMenu(false);
    setShowHistoriaClinica(false);
  };

  const handleUnsavedConfirm = (action: 'discard' | 'save') => {
    if (action === 'save') {
      handleSave();
    }
    setHasUnsavedChanges(false);
    if (pendingNavigation) {
      const c = consultasMock.find((x) => x.id === pendingNavigation.id);
      if (c) {
        setConsultaActiva(c);
        setExpandedConsultaId(c.id);
        setSoapDraft({
          padecimientoActual: c.padecimientoActual || '',
          exploracionFisica: c.exploracionFisica || '',
          diagnosticoPrincipal: c.diagnosticoPrincipal || '',
          diagnosticosSecundarios: [...c.diagnosticosSecundarios],
          planTratamiento: c.planTratamiento || '',
          notas: c.notas || '',
          motivo: c.motivo || '',
        });
        setHasUnsavedChanges(false);
        setSaveStatus('idle');
        setShowQuickActions(c.estado === 'completada');
        setSoapTab('subjetivo');
        setShowEstadoMenu(false);
        setShowHistoriaClinica(false);
      }
      setPendingNavigation(null);
    }
  };

  const expandConsulta = (c: Consultation) => {
    if (expandedConsultaId === c.id) {
      setExpandedConsultaId(null);
      setConsultaActiva(null);
      setHasUnsavedChanges(false);
      setShowQuickActions(false);
      return;
    }
    selectConsulta(c);
  };

  const updateSoapField = <K extends keyof SoapState>(field: K, value: SoapState[K]) => {
    if (consultaActiva?.estado === 'completada' || consultaActiva?.estado === 'cancelada') return;
    setSoapDraft((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    setSaveStatus('idle');
  };

  const addDiagnosticoSecundario = () => {
    if (consultaActiva?.estado === 'completada' || consultaActiva?.estado === 'cancelada') return;
    setSoapDraft((prev) => ({
      ...prev,
      diagnosticosSecundarios: [...prev.diagnosticosSecundarios, ''],
    }));
    setHasUnsavedChanges(true);
    setSaveStatus('idle');
  };

  const removeDiagnosticoSecundario = (idx: number) => {
    setSoapDraft((prev) => ({
      ...prev,
      diagnosticosSecundarios: prev.diagnosticosSecundarios.filter((_, i) => i !== idx),
    }));
    setHasUnsavedChanges(true);
    setSaveStatus('idle');
  };

  const updateDiagnosticoSecundario = (idx: number, value: string) => {
    setSoapDraft((prev) => {
      const newDiags = [...prev.diagnosticosSecundarios];
      newDiags[idx] = value;
      return { ...prev, diagnosticosSecundarios: newDiags };
    });
    setHasUnsavedChanges(true);
    setSaveStatus('idle');
  };

  const handleSave = () => {
    setSaveStatus('saving');
    // Persist SOAP draft into the global mock so other views see the updates
    if (consultaActiva) {
      const mockIdx = consultasMock.findIndex((c) => c.id === consultaActiva.id);
      if (mockIdx >= 0) {
        consultasMock[mockIdx] = { ...consultasMock[mockIdx], ...soapDraft };
      }
      setConsultaActiva((prev) => prev ? { ...prev, ...soapDraft } : prev);
    }
    setTimeout(() => {
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      setShowQuickActions(true);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 400);
  };

  const changeEstado = (newEstado: Consultation['estado']) => {
    if (!consultaActiva) return;
    if (consultaActiva.estado === newEstado) return;
    setConsultaActiva({ ...consultaActiva, estado: newEstado });
    setShowEstadoMenu(false);
    if (newEstado === 'completada') {
      setShowQuickActions(true);
      if (saveStatus !== 'saved') handleSave();
    }
    if (newEstado === 'en_curso') {
      setShowQuickActions(false);
    }
  };

  const todayDate = new Date().toISOString().split('T')[0];
  const { user, sucursalActualId } = useAuth();
  const isDoctor = user?.rol === 'medico';
  const myDoctorId = user?.doctorId;

  const pacientesHoy = useMemo(() => {
    const todaysConsultas = consultasMock.filter((c) => c.fecha === todayDate);
    return todaysConsultas;
  }, []);

  const consultasFiltradas = useMemo(() => {
    let list = [...consultasMock];
    // Filtrar por sucursal actual
    if (sucursalActualId) list = list.filter((c) => c.sucursalId === sucursalActualId);
    // Médicos solo ven sus propias consultas
    if (isDoctor && myDoctorId) {
      list = list.filter((c) => c.doctorId === myDoctorId);
    }
    if (pacienteParam) {
      list = list.filter((c) => c.patientId === pacienteParam);
    }
    if (filterEstado !== 'todas') {
      list = list.filter((c) => c.estado === filterEstado);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.patientName.toLowerCase().includes(q) ||
          c.patientExpediente.toLowerCase().includes(q) ||
          c.motivo.toLowerCase().includes(q) ||
          c.doctorName.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
      return b.hora.localeCompare(a.hora);
    });
  }, [searchTerm, filterEstado, pacienteParam, sucursalActualId, isDoctor, myDoctorId]);

  const stats = useMemo(() => {
    const base = sucursalActualId ? consultasMock.filter((c) => c.sucursalId === sucursalActualId) : consultasMock;
    const total = base.filter((c) => c.fecha === todayDate).length;
    const pendientes = base.filter((c) => c.fecha === todayDate && c.estado === 'pendiente').length;
    const enCurso = base.filter((c) => c.fecha === todayDate && c.estado === 'en_curso').length;
    const completadas = base.filter((c) => c.fecha === todayDate && c.estado === 'completada').length;
    return { total, pendientes, enCurso, completadas };
  }, [sucursalActualId]);

  const pacientesTriageEsperando = useMemo(() => {
    return triagePacientes.filter((tp) => {
      if (tp.estado !== 'completado' || !tp.ultimoTriage) return false;
      const tieneConsultaHoy = consultasMock.some(
        (c) => c.patientId === tp.id && c.fecha === todayDate
      );
      return !tieneConsultaHoy;
    });
  }, []);

  const recetasRelacionadas = consultaActiva ? getRecetasByConsulta(consultaActiva.id) : [];
  const estudiosRelacionados = consultaActiva ? getEstudiosByConsulta(consultaActiva.id) : [];
  const certificadosRelacionados = consultaActiva ? getCertificadosByConsulta(consultaActiva.id) : [];

  const isEditable = consultaActiva && consultaActiva.estado !== 'completada' && consultaActiva.estado !== 'cancelada';

  const currentSoapDisplay = hasUnsavedChanges ? soapDraft : {
    padecimientoActual: consultaActiva?.padecimientoActual || '',
    exploracionFisica: consultaActiva?.exploracionFisica || '',
    diagnosticoPrincipal: consultaActiva?.diagnosticoPrincipal || '',
    diagnosticosSecundarios: consultaActiva?.diagnosticosSecundarios || [],
    planTratamiento: consultaActiva?.planTratamiento || '',
    notas: consultaActiva?.notas || '',
    motivo: consultaActiva?.motivo || '',
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

  const soapTabs = [
    { key: 'subjetivo' as const, icon: 'ri-chat-3-line', label: 'Subjetivo', desc: 'Motivo y padecimiento' },
    { key: 'objetivo' as const, icon: 'ri-search-eye-line', label: 'Objetivo', desc: 'Exploración física' },
    { key: 'analisis' as const, icon: 'ri-lightbulb-line', label: 'Análisis', desc: 'Diagnóstico' },
    { key: 'plan' as const, icon: 'ri-file-list-line', label: 'Plan', desc: 'Tratamiento' },
  ];

  const MAX_MOTIVO = 500;
  const MAX_PADECIMIENTO = 2000;
  const MAX_EXPLORACION = 3000;
  const MAX_DIAGNOSTICO = 300;
  const MAX_PLAN = 2000;
  const MAX_NOTAS = 1000;

  return (
    <div className="space-y-5">
      {pendingNavigation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-dialog-title"
        >
          <div className="bg-background-50 rounded-xl shadow-lg p-6 max-w-md w-full mx-4" role="document">
            <div className="flex items-start gap-3 mb-4">
              <span className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-500/15 text-amber-500 flex-shrink-0" aria-hidden="true">
                <i className="ri-alert-line text-lg"></i>
              </span>
              <div>
                <h3 id="unsaved-dialog-title" className="text-base font-semibold text-foreground-900">Cambios sin guardar</h3>
                <p className="text-sm text-foreground-500 mt-1">Tienes cambios no guardados en la consulta de <strong>{consultaActiva?.patientName}</strong>. ¿Qué deseas hacer?</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button type="button" onClick={() => setPendingNavigation(null)} className="px-4 py-2 text-sm font-medium bg-secondary-100 text-foreground-700 rounded-lg hover:bg-secondary-200 transition-base cursor-pointer whitespace-nowrap">Cancelar</button>
              <button type="button" onClick={() => handleUnsavedConfirm('discard')} className="px-4 py-2 text-sm font-medium bg-red-500/10 text-red-700 border border-red-500/20 rounded-lg hover:bg-red-100 transition-base cursor-pointer whitespace-nowrap">Descartar cambios</button>
              <button type="button" onClick={() => handleUnsavedConfirm('save')} className="px-4 py-2 text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-base cursor-pointer whitespace-nowrap">Guardar y cambiar</button>
            </div>
          </div>
        </div>
      )}

      {isModoConsultorio && consultaActiva ? (
        <>
          {/* Triage arrival banner */}
          {triageRecordActivo && (
            <div className="mb-4 px-4 py-3 bg-gradient-to-r from-emerald-500/10 to-sky-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 flex-shrink-0">
                  <i className="ri-heart-pulse-line text-lg"></i>
                </span>
                <div>
                  <p className="text-sm font-semibold text-emerald-500 flex items-center gap-2">
                    Signos vitales recibidos desde Triage
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-emerald-200 text-emerald-500">
                      <i className="ri-check-double-line text-[10px]"></i>
                      {triageRecordActivo.hora} hrs
                    </span>
                  </p>
                  <p className="text-xs text-emerald-500">
                    Realizado por {triageRecordActivo.realizadoPor} · 
                    PA: {triageRecordActivo.presionSistolica}/{triageRecordActivo.presionDiastolica} mmHg · 
                    FC: {triageRecordActivo.frecuenciaCardiaca} lpm · 
                    Temp: {triageRecordActivo.temperatura}°C · 
                    SpO₂: {triageRecordActivo.saturacionOxigeno}%
                    {triageRecordActivo.glucosa && ` · Glucosa: ${triageRecordActivo.glucosa} mg/dL`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  searchParams.delete('triage');
                  setSearchParams(searchParams, { replace: true });
                  setTriageRecordActivo(null);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-500 hover:text-emerald-500 hover:bg-emerald-500/15 rounded-lg transition-base cursor-pointer whitespace-nowrap"
              >
                <i className="ri-close-line"></i> Ocultar
              </button>
            </div>
          )}
          <ConsultorioView
          consultaActiva={consultaActiva}
          soapTab={soapTab}
          setSoapTab={setSoapTab}
          hasUnsavedChanges={hasUnsavedChanges}
          saveStatus={saveStatus}
          currentSoapDisplay={currentSoapDisplay}
          isEditable={isEditable}
          recetasRelacionadas={recetasRelacionadas}
          estudiosRelacionados={estudiosRelacionados}
          recetaParam={recetaParam}
          estudioParam={estudioParam}
          onFinalizar={handleFinalizarConsulta}
          onVolver={handleVolverSalaEspera}
          onSave={handleSave}
          updateSoapField={updateSoapField}
          addDiagnosticoSecundario={addDiagnosticoSecundario}
          removeDiagnosticoSecundario={removeDiagnosticoSecundario}
          updateDiagnosticoSecundario={updateDiagnosticoSecundario}
          onSelectHistorial={expandConsulta}
          recetasExtras={recetasExtras}
          estudiosExtras={estudiosExtras}
          onRecetaCreada={(r) => setRecetasExtras((prev) => [...prev, r])}
          onEstudioCreado={handleEstudiosCreados}
          certificadosRelacionados={certificadosRelacionados}
          certificadosExtras={certificadosExtras}
          onCertificadoCreado={(c) => setCertificadosExtras((prev) => [...prev, c])}
          notaEvolucionDirty={notaEvolucionDirty}
          onNotaEvolucionDirtyChange={setNotaEvolucionDirty}
          onNotaEvolucionDraftChange={setNotaEvolucionDraft}
        />
        {/* Modal: Volver con Nota sin guardar */}
        {showVolverConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="volver-confirm-title">
            <div className="bg-background-50 rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-start gap-3 mb-4">
                <span className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-500/15 text-amber-500 flex-shrink-0" aria-hidden="true"><i className="ri-alert-line text-lg"></i></span>
                <div>
                  <h3 id="volver-confirm-title" className="text-base font-semibold text-foreground-900">Cambios sin guardar en la Nota de Evolución</h3>
                  <p className="text-sm text-foreground-500 mt-1">Si vuelves a Sala de Espera ahora, los cambios no guardados en la Nota de Evolución se perderán.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button type="button" onClick={() => setShowVolverConfirm(false)} className="px-4 py-2 text-sm font-medium bg-secondary-100 text-foreground-700 rounded-lg hover:bg-secondary-200 transition-base cursor-pointer whitespace-nowrap">Cancelar</button>
                <button type="button" onClick={() => { setShowVolverConfirm(false); setNotaEvolucionDirty(false); navigate('/app/sala-espera'); }} className="px-4 py-2 text-sm font-medium bg-red-500/10 text-red-700 border border-red-500/20 rounded-lg hover:bg-red-100 transition-base cursor-pointer whitespace-nowrap">Descartar y volver</button>
              </div>
            </div>
          </div>
        )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap justify-end">
              {hasUnsavedChanges && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium rounded-full whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500/100 animate-pulse"></span>
                  Cambios sin guardar
                </span>
              )}
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground-600 bg-background-50 border border-secondary-200 rounded-lg hover:bg-secondary-100 transition-base cursor-pointer whitespace-nowrap"
              >
                <i className="ri-file-excel-line"></i>
                Exportar Excel
              </button>
            </div>

          {/* Stats Row */}
          <div className="flex items-center gap-0 rounded-lg border border-secondary-200/70 bg-background-50 overflow-hidden">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
              <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-primary-600"><i className="ri-stethoscope-line"></i></span>
              <div>
                <p className="text-sm font-bold text-foreground-900">{stats.total}</p>
                <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Consultas hoy</p>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
              <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-amber-500"><i className="ri-time-line"></i></span>
              <div>
                <p className="text-sm font-bold text-foreground-900">{stats.pendientes}</p>
                <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Pendientes</p>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
              <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-sky-500"><i className="ri-user-voice-line"></i></span>
              <div>
                <p className="text-sm font-bold text-foreground-900">{stats.enCurso}</p>
                <p className="text-[10px] text-foreground-500 uppercase tracking-wide">En curso</p>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-2 px-3 py-2">
              <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-emerald-500"><i className="ri-check-double-line"></i></span>
              <div>
                <p className="text-sm font-bold text-foreground-900">{stats.completadas}</p>
                <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Completadas</p>
              </div>
            </div>
          </div>

          {/* Main Layout */}
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            <Card className="w-full lg:w-80 flex-shrink-0" padding="none">
              <div className="p-3 border-b border-secondary-200">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-foreground-800">Consulta del día</h2>
                  <span className="text-2xs text-foreground-400">{consultasFiltradas.length} registros</span>
                </div>
                <div className="relative mb-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none" aria-hidden="true"><i className="ri-search-line text-sm"></i></span>
                  <input
                    type="search"
                    aria-label="Buscar paciente o médico"
                    placeholder="Buscar paciente o médico..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-1.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
                  />
                </div>
                <div className="flex gap-1 flex-wrap">
                  {(['todas', 'pendiente', 'en_curso', 'completada'] as const).map((f) => (
                    <button key={f} onClick={() => setFilterEstado(f)} className={`px-2 py-0.5 text-[10px] rounded-full cursor-pointer transition-base whitespace-nowrap ${filterEstado === f ? 'bg-primary-100 text-primary-700 border border-primary-300' : 'bg-secondary-100 text-foreground-600 border border-secondary-200 hover:border-secondary-300'}`}>{f === 'todas' ? 'Todas' : estadoConfig[f].label}</button>
                  ))}
                </div>
              </div>
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                {consultasFiltradas.map((c) => {
                  const isExpanded = expandedConsultaId === c.id;
                  return (
                    <button key={c.id} onClick={() => expandConsulta(c)} className={`w-full text-left px-4 py-3 border-b border-secondary-100 transition-base cursor-pointer hover:bg-secondary-50/50 ${isExpanded ? 'bg-primary-50/50 border-l-2 border-l-primary-500' : ''} ${c.estado === 'completada' ? 'opacity-80' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium text-foreground-900 truncate">{c.patientName}</p>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium ${estadoConfig[c.estado].color}`}>{estadoConfig[c.estado].label}</span>
                          </div>
                          <p className="text-2xs text-foreground-500 mt-0.5">{c.patientExpediente} · {c.especialidad}</p>
                          <p className="text-xs text-foreground-600 mt-1 line-clamp-2">{c.motivo}</p>
                          <div className="flex items-center gap-2 mt-1.5 text-2xs text-foreground-400"><span>{c.hora}</span><span>·</span><span>{c.doctorName}</span><span>·</span><span className="bg-secondary-100 px-1 py-0.5 rounded">{tipoConfig[c.tipo]}</span></div>
                        </div>
                        <span className="w-5 h-5 flex items-center justify-center flex-shrink-0"><i className={`text-sm text-foreground-400 ${isExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></i></span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <div className="flex-1 min-w-0 w-full">
              {/* Pacientes triageados esperando consulta */}
              {!consultaActiva && pacientesTriageEsperando.length > 0 && (
                <Card padding="none" className="mb-4 border-emerald-500/20">
                  <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
                        <i className="ri-heart-pulse-line"></i>
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-emerald-500">
                          Pacientes triageados esperando consulta
                        </h3>
                        <p className="text-2xs text-emerald-500">
                          {pacientesTriageEsperando.length} paciente{pacientesTriageEsperando.length > 1 ? 's' : ''} con signos vitales listos
                        </p>
                      </div>
                    </div>
                    <Badge variant="success" size="sm">{pacientesTriageEsperando.length}</Badge>
                  </div>
                  <div className="divide-y divide-secondary-100">
                    {pacientesTriageEsperando.map((tp) => {
                      const urg = tp.ultimoTriage!;
                      const urgConfigMap: Record<string, { label: string; color: string; bg: string }> = {
                        verde: { label: 'No urgente', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                        amarillo: { label: 'Urgencia menor', color: 'text-amber-500', bg: 'bg-amber-500/10' },
                        naranja: { label: 'Urgencia', color: 'text-orange-600', bg: 'bg-orange-50' },
                        rojo: { label: 'Emergencia', color: 'text-red-600', bg: 'bg-red-500/10' },
                      };
                      const urgInfo = urgConfigMap[urg.nivelUrgencia];
                      return (
                        <div key={tp.id} className="px-5 py-3.5 hover:bg-secondary-50/30 transition-base">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-start gap-3 min-w-0">
                              <span className={`w-9 h-9 flex items-center justify-center rounded-full text-white text-xs font-bold flex-shrink-0 ${tp.genero === 'F' ? 'bg-rose-400' : 'bg-sky-500/100'}`}>
                                {tp.nombre.charAt(0)}{tp.apellidos.charAt(0)}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold text-foreground-900">{tp.nombre} {tp.apellidos}</p>
                                  <span className="text-2xs text-foreground-400">{tp.expediente} · {tp.edad} años</span>
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium ${urgInfo.color} ${urgInfo.bg}`}>
                                    {urgInfo.label}
                                  </span>
                                </div>
                                <p className="text-xs text-foreground-500 mt-1 italic">"{tp.motivo}"</p>
                                <div className="flex items-center gap-3 mt-2 text-2xs text-foreground-500 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <i className="ri-heart-line text-emerald-500"></i>
                                    PA: <strong>{urg.presionSistolica}/{urg.presionDiastolica}</strong>
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <i className="ri-temp-hot-line text-amber-500"></i>
                                    {urg.temperatura}°C
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <i className="ri-heart-pulse-line text-red-400"></i>
                                    FC: {urg.frecuenciaCardiaca}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <i className="ri-drop-line text-sky-500"></i>
                                    SpO₂: {urg.saturacionOxigeno}%
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <i className="ri-body-scan-line text-foreground-400"></i>
                                    IMC: {urg.imc.toFixed(1)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <i className="ri-user-line text-foreground-400"></i>
                                    {urg.realizadoPor}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                navigate(`/app/consultas?paciente=${tp.id}&triage=${urg.id}`);
                              }}
                              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-base cursor-pointer whitespace-nowrap flex-shrink-0"
                            >
                              <i className="ri-stethoscope-line"></i>
                              Iniciar consulta
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {!consultaActiva ? (
                <Card><div className="flex flex-col items-center gap-4 py-20 text-foreground-400"><span className="w-16 h-16 flex items-center justify-center rounded-full bg-secondary-100"><i className="ri-file-list-3-line text-3xl"></i></span><div className="text-center max-w-sm"><p className="text-base font-medium text-foreground-600 mb-1">Selecciona una consulta</p><p className="text-sm">Elige una consulta del panel izquierdo para ver el detalle clínico, notas SOAP y acciones relacionadas.</p></div></div></Card>
              ) : (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleVolverListado}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap w-fit"
                  >
                    <i className="ri-arrow-left-line"></i> Volver al listado
                  </button>
                  <Card padding="md">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className="w-12 h-12 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 text-lg font-bold flex-shrink-0">{consultaActiva.patientName.charAt(0)}</span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-semibold text-foreground-900">{consultaActiva.patientName}</h3>
                            <div className="relative">
                              <button onClick={() => setShowEstadoMenu(!showEstadoMenu)} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium cursor-pointer transition-base ${estadoConfig[consultaActiva.estado].color}`}>{estadoConfig[consultaActiva.estado].label}<i className="ri-arrow-down-s-line text-[10px]"></i></button>
                              {showEstadoMenu && (
                                <div className="absolute top-full left-0 mt-1 bg-background-50 border border-secondary-200 rounded-lg shadow-lg z-30 py-1 min-w-[140px]">
                                  {(['pendiente', 'en_curso', 'completada', 'cancelada'] as const).map((e) => (
                                    <button key={e} onClick={() => changeEstado(e)} className={`w-full text-left px-3 py-2 text-xs cursor-pointer transition-base hover:bg-secondary-50 flex items-center gap-2 ${consultaActiva.estado === e ? 'bg-primary-50 text-primary-700 font-medium' : 'text-foreground-700'}`}><span className={`w-2 h-2 rounded-full ${e === 'pendiente' ? 'bg-amber-500/100' : e === 'en_curso' ? 'bg-sky-500/100' : e === 'completada' ? 'bg-emerald-500/100' : 'bg-secondary-400'}`}></span>{estadoConfig[e].label}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Badge variant="secondary" size="sm">{tipoConfig[consultaActiva.tipo]}</Badge>
                          </div>
                          <p className="text-xs text-foreground-500">{consultaActiva.patientExpediente} · {consultaActiva.especialidad} · {consultaActiva.doctorName}</p>
                          <p className="text-xs text-foreground-500">{consultaActiva.fecha} · {consultaActiva.hora} hrs</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {isEditable && (
                          <button
                            onClick={handleFinalizarConsulta}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-base cursor-pointer whitespace-nowrap shadow-sm"
                          >
                            <i className="ri-check-double-line"></i> Finalizar consulta
                          </button>
                        )}
                        {consultaActiva.signosVitales && <span className="inline-flex items-center gap-1.5 text-2xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full border border-emerald-500/20"><i className="ri-heart-pulse-line"></i>Signos vitales registrados</span>}
                        {consultaActiva.tieneReceta && <span className="inline-flex items-center gap-1.5 text-2xs bg-secondary-100 text-foreground-600 px-2 py-1 rounded-full border border-secondary-200"><i className="ri-capsule-line"></i>Receta</span>}
                        {consultaActiva.tieneEstudios && <span className="inline-flex items-center gap-1.5 text-2xs bg-secondary-100 text-foreground-600 px-2 py-1 rounded-full border border-secondary-200"><i className="ri-microscope-line"></i>Estudios</span>}
                      </div>
                    </div>
                  </Card>

                  {(hasUnsavedChanges || saveStatus === 'saved') && (
                    <div className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border ${saveStatus === 'saved' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                      <div className="flex items-center gap-2">
                        {saveStatus === 'saved' ? (<><span className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500"><i className="ri-check-line text-xs"></i></span><span className="text-xs font-medium text-emerald-500">Nota SOAP guardada correctamente</span></>) : saveStatus === 'saving' ? (<><span className="w-5 h-5 flex items-center justify-center"><i className="ri-loader-4-line text-sm text-amber-500 animate-spin"></i></span><span className="text-xs font-medium text-amber-500">Guardando...</span></>) : (<><span className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-500/15 text-amber-500"><i className="ri-edit-line text-xs"></i></span><span className="text-xs font-medium text-amber-500">Tienes cambios sin guardar</span></>)}
                      </div>
                      {saveStatus !== 'saving' && (
                        <div className="flex items-center gap-2">
                          <button onClick={handleSave} className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-base whitespace-nowrap flex items-center gap-1.5 ${saveStatus === 'saved' ? 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-200' : 'bg-amber-600 text-white hover:bg-amber-700'}`}><i className={saveStatus === 'saved' ? 'ri-check-line' : 'ri-save-line'}></i>{saveStatus === 'saved' ? 'Guardado' : 'Guardar cambios'}</button>
                        </div>
                      )}
                    </div>
                  )}

                  {showQuickActions && consultaActiva.estado === 'completada' && (
                    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-background-50 rounded-lg border border-secondary-200">
                      <span className="text-xs font-medium text-foreground-600 mr-1">Acciones rápidas:</span>
                      <button onClick={() => window.print()} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-background-50 border border-secondary-200 text-foreground-600 rounded-lg hover:border-secondary-300 hover:text-foreground-800 transition-base cursor-pointer whitespace-nowrap"><i className="ri-printer-line"></i> Imprimir nota</button>
                      <button onClick={() => { setShowRecetaCreator(true); setSoapTab('plan'); }} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-primary-50 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-100 transition-base cursor-pointer whitespace-nowrap"><i className="ri-capsule-line"></i> Nueva receta</button>
                      <button onClick={() => { setShowEstudioSolicitor(true); setSoapTab('plan'); }} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-accent-50 border border-accent-200 text-accent-700 rounded-lg hover:bg-accent-100 transition-base cursor-pointer whitespace-nowrap"><i className="ri-microscope-line"></i> Solicitar estudio</button>
                      <button onClick={() => setShowQuickActions(false)} className="flex items-center gap-1 px-2 py-1.5 text-xs text-foreground-400 hover:text-foreground-600 transition-base cursor-pointer ml-auto"><i className="ri-close-line"></i></button>
                    </div>
                  )}

                  {consultaActiva.signosVitales && (
                    <Card padding="md">
                      <h4 className="text-xs font-semibold text-foreground-700 mb-3 flex items-center gap-2"><span className="w-5 h-5 flex items-center justify-center rounded bg-emerald-500/15 text-emerald-500"><i className="ri-heart-pulse-line text-2xs"></i></span>Signos Vitales registrados en Triage<span className="text-2xs font-normal text-foreground-400 ml-2">{consultaActiva.signosVitales.hora} hrs</span></h4>
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

                  {/* Selector de vista: Nota de Evolución / Historia Clínica */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-2xs text-foreground-400 font-medium mr-1">Vista:</span>
                    <button
                      onClick={() => setShowHistoriaClinica(false)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-base whitespace-nowrap ${!showHistoriaClinica ? 'bg-foreground-900 text-background-50 border-foreground-900' : 'bg-background-50 text-foreground-600 border-secondary-200 hover:border-secondary-300'}`}
                    >
                      <i className="ri-file-list-line mr-1"></i>Nota de Evolución
                    </button>
                    <button
                      onClick={() => setShowHistoriaClinica(true)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-base whitespace-nowrap ${showHistoriaClinica ? 'bg-foreground-900 text-background-50 border-foreground-900' : 'bg-background-50 text-foreground-600 border-secondary-200 hover:border-secondary-300'}`}
                    >
                      <i className="ri-folder-history-line mr-1"></i>Historia Clínica
                    </button>
                    {showHistoriaClinica && (
                      <button
                        onClick={() => setShowHistoriaPrintModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-background-50 border border-secondary-200 text-foreground-600 rounded-full hover:bg-secondary-100 transition-base cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-printer-line"></i> Imprimir Historia
                      </button>
                    )}
                  </div>

                  <div className={showHistoriaClinica ? '' : 'hidden'}>
                    {consultaActiva.estado === 'completada' || consultaActiva.estado === 'cancelada' ? (
                      <HistoriaClinicaReadOnly patientId={consultaActiva.patientId} />
                    ) : (
                      <HistoriaClinicaForm key={consultaActiva.id} patientId={consultaActiva.patientId} doctorName={consultaActiva.doctorName} />
                    )}
                  </div>
                  <div className={showHistoriaClinica ? 'hidden' : ''}>
                  {consultaActiva.tipo === 'primera_vez' ? (
                  <>
                  <div className="bg-background-50 rounded-lg border border-secondary-200 p-1 flex gap-1" role="tablist" aria-label="Secciones SOAP de la consulta" onKeyDown={(e) => handleKeyDown(e, soapTabs.map((t) => t.key))}>
                    {soapTabs.map((tab) => (
                      <button
                        key={tab.key}
                        role="tab"
                        aria-selected={soapTab === tab.key}
                        aria-controls={`soap-panel-${tab.key}`}
                        id={`soap-tab-${tab.key}`}
                        tabIndex={soapTab === tab.key ? 0 : -1}
                        onClick={() => setSoapTab(tab.key)}
                        className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer transition-base ${soapTab === tab.key ? 'bg-background-50 text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'}`}
                      >
                        <span className={`w-7 h-7 flex items-center justify-center rounded-md ${soapTab === tab.key ? 'bg-primary-100 text-primary-600' : 'bg-secondary-100 text-foreground-400'}`} aria-hidden="true"><i className={`${tab.icon} text-sm`}></i></span>
                        <div className="text-left"><p className="text-xs font-semibold">{tab.label}</p><p className="text-2xs">{tab.desc}</p></div>
                      </button>
                    ))}
                  </div>

                  <Card padding="lg">
                    {soapTab === 'subjetivo' && (
                      <div id="soap-panel-subjetivo" role="tabpanel" aria-labelledby="soap-tab-subjetivo" className="space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2 mb-2"><span className="w-5 h-5 flex items-center justify-center rounded bg-sky-500/15 text-sky-500" aria-hidden="true"><i className="ri-question-answer-line text-2xs"></i></span>Motivo de Consulta</h4>
                          {isEditable ? (
                            <textarea
                              id="consulta-motivo"
                              value={currentSoapDisplay.motivo}
                              onChange={(e) => updateSoapField('motivo', e.target.value)}
                              placeholder="Describe el motivo de la consulta..."
                              rows={3}
                              maxLength={MAX_MOTIVO}
                              aria-label="Motivo de consulta"
                              className="w-full p-3 bg-background-50 rounded-lg border border-secondary-200 text-sm text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
                            />
                          ) : (
                            <div className="p-3 bg-background-50 rounded-lg border border-secondary-100 text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap">{currentSoapDisplay.motivo || 'Sin registro'}</div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2 mb-2"><span className="w-5 h-5 flex items-center justify-center rounded bg-sky-500/15 text-sky-500" aria-hidden="true"><i className="ri-file-text-line text-2xs"></i></span>Padecimiento Actual</h4>
                          {isEditable ? (
                            <textarea
                              id="consulta-padecimiento"
                              value={currentSoapDisplay.padecimientoActual}
                              onChange={(e) => updateSoapField('padecimientoActual', e.target.value)}
                              placeholder="Describe el padecimiento actual del paciente..."
                              rows={5}
                              maxLength={MAX_PADECIMIENTO}
                              aria-label="Padecimiento actual"
                              className="w-full p-3 bg-background-50 rounded-lg border border-secondary-200 text-sm text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
                            />
                          ) : (
                            <div className="p-3 bg-background-50 rounded-lg border border-secondary-100 text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap min-h-[80px]">{currentSoapDisplay.padecimientoActual || 'Pendiente de registro en consulta'}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {soapTab === 'objetivo' && (
                      <div id="soap-panel-objetivo" role="tabpanel" aria-labelledby="soap-tab-objetivo">
                        <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2 mb-2"><span className="w-5 h-5 flex items-center justify-center rounded bg-emerald-500/15 text-emerald-500" aria-hidden="true"><i className="ri-search-eye-line text-2xs"></i></span>Exploración Física</h4>
                        {isEditable ? (
                          <textarea
                            id="consulta-exploracion"
                            value={currentSoapDisplay.exploracionFisica}
                            onChange={(e) => updateSoapField('exploracionFisica', e.target.value)}
                            placeholder="Registra hallazgos de la exploración física..."
                            rows={8}
                            maxLength={MAX_EXPLORACION}
                            aria-label="Exploración física"
                            className="w-full p-3 bg-background-50 rounded-lg border border-secondary-200 text-sm text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
                          />
                        ) : (
                          <div className="p-3 bg-background-50 rounded-lg border border-secondary-100 text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap min-h-[200px]">{currentSoapDisplay.exploracionFisica || 'Pendiente de registro en consulta'}</div>
                        )}
                      </div>
                    )}

                    {soapTab === 'analisis' && (
                      <div id="soap-panel-analisis" role="tabpanel" aria-labelledby="soap-tab-analisis" className="space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2 mb-2"><span className="w-5 h-5 flex items-center justify-center rounded bg-amber-500/15 text-amber-500" aria-hidden="true"><i className="ri-award-line text-2xs"></i></span>Diagnóstico Principal</h4>
                          {isEditable ? (
                            <div className="space-y-2">
                              <textarea
                                id="consulta-diagnostico"
                                value={currentSoapDisplay.diagnosticoPrincipal}
                                onChange={(e) => updateSoapField('diagnosticoPrincipal', e.target.value)}
                                placeholder="Escribe el diagnóstico principal..."
                                rows={2}
                                maxLength={MAX_DIAGNOSTICO}
                                aria-label="Diagnóstico principal"
                                className="w-full p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-sm text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-base resize-none font-medium"
                              />
                              <div className="mt-1">
                                <p className="text-2xs font-medium text-foreground-500 mb-1" id="cie10-label">Buscar diagnóstico en catálogo CIE-10</p>
                                <DiagnosticoCIE10Search onSelect={(_codigo, descripcion) => updateSoapField('diagnosticoPrincipal', descripcion)} size="sm" />
                              </div>
                            </div>
                          ) : (
                            <div className={`p-3 rounded-lg border text-sm font-medium leading-relaxed ${currentSoapDisplay.diagnosticoPrincipal ? 'bg-amber-500/10 border-amber-500/20 text-foreground-900' : 'bg-background-50 border-secondary-100 text-foreground-400'}`}>{currentSoapDisplay.diagnosticoPrincipal || 'Sin diagnóstico registrado'}</div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2 mb-2"><span className="w-5 h-5 flex items-center justify-center rounded bg-secondary-100 text-foreground-500" aria-hidden="true"><i className="ri-list-check text-2xs"></i></span>Diagnósticos Secundarios</h4>
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
                                    <button onClick={() => removeDiagnosticoSecundario(i)} className="w-6 h-6 flex items-center justify-center rounded-full text-foreground-400 hover:text-red-500 hover:bg-red-500/10 transition-base cursor-pointer" aria-label={`Eliminar diagnóstico secundario ${i + 1}`}><i className="ri-close-line text-xs"></i></button>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-2 p-2.5 bg-background-50 rounded-lg border border-secondary-100 text-sm text-foreground-700 w-full"><span className="w-5 h-5 flex items-center justify-center rounded-full bg-secondary-100 text-foreground-500 text-2xs font-bold flex-shrink-0" aria-hidden="true">{i + 1}</span>{d}</div>
                                )}
                              </div>
                            ))}
                            {isEditable && (
                              <>
                                <button onClick={addDiagnosticoSecundario} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg cursor-pointer transition-base"><i className="ri-add-line"></i> Agregar diagnóstico secundario</button>
                                <div className="mt-2">
                                  <p className="text-2xs font-medium text-foreground-500 mb-1" id="cie10-label-sec">O buscar en catálogo CIE-10</p>
                                  <DiagnosticoCIE10Search onSelect={(_codigo, descripcion) => updateSoapField('diagnosticosSecundarios', [...currentSoapDisplay.diagnosticosSecundarios, descripcion])} size="sm" />
                                </div>
                              </>
                            )}
                            {!isEditable && currentSoapDisplay.diagnosticosSecundarios.length === 0 && <p className="text-xs text-foreground-400 p-2">Sin diagnósticos secundarios</p>}
                          </div>
                        </div>
                      </div>
                    )}

                    {soapTab === 'plan' && (
                      <div id="soap-panel-plan" role="tabpanel" aria-labelledby="soap-tab-plan" className="space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2 mb-2"><span className="w-5 h-5 flex items-center justify-center rounded bg-primary-100 text-primary-600" aria-hidden="true"><i className="ri-file-list-line text-2xs"></i></span>Plan de Tratamiento</h4>
                          {isEditable ? (
                            <textarea
                              id="consulta-plan"
                              value={currentSoapDisplay.planTratamiento}
                              onChange={(e) => updateSoapField('planTratamiento', e.target.value)}
                              placeholder="Describe el plan de tratamiento, indicaciones y seguimiento..."
                              rows={5}
                              maxLength={MAX_PLAN}
                              aria-label="Plan de tratamiento"
                              className="w-full p-3 bg-background-50 rounded-lg border border-secondary-200 text-sm text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
                            />
                          ) : (
                            <div className="p-3 bg-background-50 rounded-lg border border-secondary-100 text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap min-h-[120px]">{currentSoapDisplay.planTratamiento || 'Pendiente de registro en consulta'}</div>
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
                        {showRecetaCreator && consultaActiva && (
                          <RecetaInlineCreator
                            consultaId={consultaActiva.id}
                            patientId={consultaActiva.patientId}
                            patientName={consultaActiva.patientName}
                            patientExpediente={consultaActiva.patientExpediente}
                            doctorId={consultaActiva.doctorId}
                            doctorName={consultaActiva.doctorName}
                            doctorCedula={doctors.find((d) => d.id === consultaActiva.doctorId)?.cedula || ''}
                            diagnosticoRelacionado={currentSoapDisplay.diagnosticoPrincipal || 'Sin diagnóstico'}
                            onRecetaCreada={(r) => { setRecetasExtras((prev) => [...prev, r]); setShowRecetaCreator(false); }}
                            onCancel={() => setShowRecetaCreator(false)}
                          />
                        )}

                        {/* Inline Estudio Solicitor */}
                        {showEstudioSolicitor && consultaActiva && (
                          <EstudioInlineSolicitor
                            consultaId={consultaActiva.id}
                            patientId={consultaActiva.patientId}
                            patientName={consultaActiva.patientName}
                            patientExpediente={consultaActiva.patientExpediente}
                            doctorId={consultaActiva.doctorId}
                            doctorName={consultaActiva.doctorName}
                            diagnosticoRelacionado={currentSoapDisplay.diagnosticoPrincipal || 'Sin diagnóstico'}
                            onEstudioCreado={(e) => { handleEstudiosCreados(e); setShowEstudioSolicitor(false); }}
                            onCancel={() => setShowEstudioSolicitor(false)}
                          />
                        )}

                        {showCertificadoCreator && consultaActiva && (
                          <CertificadoMedicoCreator
                            consultaId={consultaActiva.id}
                            patientId={consultaActiva.patientId}
                            patientName={consultaActiva.patientName}
                            patientExpediente={consultaActiva.patientExpediente}
                            doctorId={consultaActiva.doctorId}
                            doctorName={consultaActiva.doctorName}
                            doctorCedula={doctors.find((d) => d.id === consultaActiva.doctorId)?.cedula || ''}
                            doctorEspecialidad={consultaActiva.especialidad}
                            diagnosticoRelacionado={currentSoapDisplay.diagnosticoPrincipal || 'Sin diagnóstico'}
                            onCertificadoCreado={(c) => { setCertificadosExtras((prev) => [...prev, c]); setShowCertificadoCreator(false); }}
                            onCancel={() => setShowCertificadoCreator(false)}
                          />
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div className="p-3 bg-background-50 rounded-lg border border-secondary-200">
                            <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-foreground-700 flex items-center gap-1.5"><i className="ri-capsule-line text-primary-600"></i>Recetas</span>{([...recetasRelacionadas, ...recetasExtras].length > 0) && <Badge variant="success" size="sm">{[...recetasRelacionadas, ...recetasExtras].length}</Badge>}</div>
                            {[...recetasRelacionadas, ...recetasExtras].length > 0 ? (
                              <div className="space-y-1.5">
                                {[...recetasRelacionadas, ...recetasExtras].map((r) => {
                                  const isHighlighted = recetaParam === r.id;
                                  return (
                                    <div key={r.id} className={`p-2 bg-background-50 rounded border text-xs transition-base ${isHighlighted ? 'border-primary-400 bg-primary-50/50 ring-1 ring-primary-200' : 'border-secondary-100'}`}>
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-1 min-w-0">
                                          {isHighlighted && <i className="ri-arrow-right-circle-line text-primary-500 text-xs flex-shrink-0"></i>}
                                          <span className="font-medium truncate">Receta #{r.id.replace('r', '')}</span>
                                          <span className="text-foreground-400 flex-shrink-0">· {r.estado} · {r.medicamentos.length} medicamentos</span>
                                        </span>
                                        <button
                                          onClick={() => setRecetaParaImprimir(r)}
                                          className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-base cursor-pointer flex-shrink-0"
                                          title="Imprimir receta"
                                        >
                                          <i className="ri-printer-line text-xs"></i>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-3"><p className="text-2xs text-foreground-400 mb-2">Sin recetas vinculadas</p>{isEditable && !showRecetaCreator && <button onClick={() => setShowRecetaCreator(true)} className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 cursor-pointer transition-base"><i className="ri-add-line"></i> Crear receta</button>}</div>
                            )}
                          </div>
                          <div className="p-3 bg-background-50 rounded-lg border border-secondary-200">
                            <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-foreground-700 flex items-center gap-1.5"><i className="ri-microscope-line text-accent-600"></i>Estudios</span>{([...estudiosRelacionados, ...estudiosExtras].length > 0) && <Badge variant="info" size="sm">{[...estudiosRelacionados, ...estudiosExtras].length}</Badge>}</div>
                            {[...estudiosRelacionados, ...estudiosExtras].length > 0 ? (
                              <div className="space-y-1.5">
                                {[...estudiosRelacionados, ...estudiosExtras].map((e) => {
                                  const isHighlighted = estudioParam === e.id;
                                  return (
                                    <button
                                      key={e.id}
                                      onClick={() => navigate(`/app/estudios?estudio=${e.id}`)}
                                      className={`w-full text-left block p-2 bg-background-50 rounded border text-xs text-foreground-600 hover:border-accent-300 transition-base cursor-pointer ${isHighlighted ? 'border-accent-400 bg-accent-50/50 ring-1 ring-accent-200' : 'border-secondary-100'}`}
                                    >
                                      <span className="flex items-center gap-1">
                                        {isHighlighted && <i className="ri-arrow-right-circle-line text-accent-500 text-xs"></i>}
                                        <span className="font-medium">{e.nombre}</span>
                                        <span className={e.estado === 'completado' ? 'text-emerald-500' : 'text-amber-500'}>· {e.estado}</span>
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-3"><p className="text-2xs text-foreground-400 mb-2">Sin estudios vinculados</p>{isEditable && !showEstudioSolicitor && <button onClick={() => setShowEstudioSolicitor(true)} className="inline-flex items-center gap-1 text-xs text-accent-600 hover:text-accent-700 cursor-pointer transition-base"><i className="ri-add-line"></i> Solicitar estudio</button>}</div>
                            )}
                          </div>
                          <div className="p-3 bg-background-50 rounded-lg border border-secondary-200">
                            <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-foreground-700 flex items-center gap-1.5"><i className="ri-shield-check-line text-emerald-600"></i>Certificados</span>{([...certificadosRelacionados, ...certificadosExtras].length > 0) && <Badge variant="success" size="sm">{[...certificadosRelacionados, ...certificadosExtras].length}</Badge>}</div>
                            {[...certificadosRelacionados, ...certificadosExtras].length > 0 ? (
                              <div className="space-y-1.5">
                                {[...certificadosRelacionados, ...certificadosExtras].map((cert) => (
                                  <div key={cert.id} className={`p-2 bg-background-50 rounded border text-xs transition-base ${cert.estado === 'anulado' ? 'opacity-60 border-secondary-100' : 'border-secondary-100'}`}>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="flex items-center gap-1 min-w-0">
                                        <i className="ri-shield-check-line text-emerald-500 text-xs flex-shrink-0"></i>
                                        <span className="font-medium truncate">{tipoCertificadoConfig[cert.tipo].shortLabel}</span>
                                        <span className="text-foreground-400 flex-shrink-0">· {cert.folio}</span>
                                      </span>
                                      {cert.estado === 'activo' && (
                                        <button onClick={() => setCertificadoParaImprimir(cert)} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-emerald-600 hover:bg-emerald-50 transition-base cursor-pointer" title="Imprimir certificado"><i className="ri-printer-line text-xs"></i></button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-3"><p className="text-2xs text-foreground-400 mb-2">Sin certificados generados</p>{isEditable && !showCertificadoCreator && <button onClick={() => setShowCertificadoCreator(true)} className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 cursor-pointer transition-base"><i className="ri-add-line"></i> Generar certificado</button>}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>

                  {(currentSoapDisplay.notas || isEditable) && (
                    <Card padding="md">
                      <h4 className="text-xs font-semibold text-foreground-700 mb-2 flex items-center gap-2"><span className="w-5 h-5 flex items-center justify-center rounded bg-secondary-100 text-foreground-500"><i className="ri-sticky-note-line text-2xs"></i></span>Notas de la Consulta</h4>
                      {isEditable ? (
                        <textarea value={currentSoapDisplay.notas} onChange={(e) => updateSoapField('notas', e.target.value)} placeholder="Notas adicionales, observaciones..." rows={3} className="w-full p-3 bg-background-50 rounded-lg border border-secondary-200 text-sm text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none" />
                      ) : (
                        <p className="text-sm text-foreground-600 leading-relaxed whitespace-pre-wrap">{currentSoapDisplay.notas}</p>
                      )}
                    </Card>
                  )}
                  </>
                  ) : consultaActiva.estado === 'completada' || consultaActiva.estado === 'cancelada' ? (
                    <NotaEvolucionReadOnly
                      consultaId={consultaActiva.id}
                      patientName={consultaActiva.patientName}
                      patientExpediente={consultaActiva.patientExpediente}
                    />
                  ) : (
                    <NotaEvolucionForm
                      key={consultaActiva.id}
                      consultaId={consultaActiva.id}
                      patientId={consultaActiva.patientId}
                      patientName={consultaActiva.patientName}
                      patientExpediente={consultaActiva.patientExpediente}
                      doctorId={consultaActiva.doctorId}
                      doctorName={consultaActiva.doctorName}
                      doctorCedula={doctors.find((d) => d.id === consultaActiva.doctorId)?.cedula || ''}
                      signosVitalesTriage={consultaActiva.signosVitales}
                      onDirtyChange={setNotaEvolucionDirty}
                      onDraftChange={setNotaEvolucionDraft}
                      recetasRelacionadas={[...recetasRelacionadas, ...recetasExtras]}
                      estudiosRelacionados={[...estudiosRelacionados, ...estudiosExtras]}
                      onRecetaCreada={(r) => setRecetasExtras((prev) => [...prev, r])}
                      onEstudioCreado={handleEstudiosCreados}
                      certificadosRelacionados={[...certificadosRelacionados, ...certificadosExtras]}
                      onCertificadoCreado={(c) => setCertificadosExtras((prev) => [...prev, c])}
                    />
                  )}
                  </div>

                  <ConsultaHistorial patientId={consultaActiva.patientId} currentConsultaId={consultaActiva.id} onSelect={(c) => expandConsulta(c)} />
                </div>
              )}
            </div>
          </div>

          {pacienteParam && consultasFiltradas.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 px-4 bg-background-50 border border-secondary-200/70 rounded-xl text-center">
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-secondary-100 text-foreground-400"><i className="ri-file-search-line text-2xl"></i></div>
              <div><p className="text-sm font-semibold text-foreground-700">Sin consultas registradas</p><p className="text-xs text-foreground-500 mt-1 max-w-sm">Este paciente no tiene consultas en el sistema. Puedes iniciar una nueva consulta desde la agenda o desde el expediente del paciente.</p></div>
              <div className="flex items-center gap-2"><button onClick={() => { searchParams.delete('paciente'); setSearchParams(searchParams, { replace: true }); }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-secondary-100 text-foreground-600 hover:bg-secondary-200 rounded-lg transition-base cursor-pointer"><i className="ri-arrow-left-line"></i> Ver todas las consultas</button></div>
            </div>
          )}

          {pacienteParam && consultasFiltradas.length > 0 && (
            <div className="flex items-center justify-between px-3 py-2 bg-accent-50 border border-accent-200/50 rounded-lg">
              <div className="flex items-center gap-2.5 min-w-0"><div className="w-7 h-7 flex items-center justify-center rounded-full bg-accent-100 text-accent-600 shrink-0"><i className="ri-user-search-line text-sm"></i></div><div className="min-w-0"><p className="text-xs font-semibold text-accent-800 truncate">Viendo consultas de {consultasFiltradas[0]?.patientName}</p><p className="text-[10px] text-accent-500">{consultasFiltradas.length} consulta(s) encontrada(s)</p></div></div>
              <button onClick={() => { searchParams.delete('paciente'); searchParams.delete('receta'); searchParams.delete('estudio'); setSearchParams(searchParams, { replace: true }); setConsultaActiva(null); setExpandedConsultaId(null); }} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-accent-600 hover:text-accent-700 hover:bg-accent-100 rounded-md transition-base cursor-pointer whitespace-nowrap shrink-0"><i className="ri-close-line"></i> Quitar filtro</button>
            </div>
          )}

          {(recetaParam || estudioParam) && consultaActiva && (
            <div className="flex items-center justify-between px-3 py-2 bg-primary-50 border border-primary-200/50 rounded-lg">
              <div className="flex items-center gap-2.5 min-w-0"><div className="w-7 h-7 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 shrink-0"><i className={recetaParam ? 'ri-capsule-line' : 'ri-microscope-line'}></i></div><div className="min-w-0"><p className="text-xs font-semibold text-primary-800 truncate">{recetaParam ? 'Receta vinculada destacada' : 'Estudio vinculado destacado'}</p><p className="text-[10px] text-primary-500">Revisa la pestaña Plan para ver los detalles</p></div></div>
              <button onClick={() => { if (recetaParam) searchParams.delete('receta'); if (estudioParam) searchParams.delete('estudio'); setSearchParams(searchParams, { replace: true }); }} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-100 rounded-md transition-base cursor-pointer whitespace-nowrap shrink-0"><i className="ri-close-line"></i> Ocultar</button>
            </div>
          )}
        </>
      )}

      {/* Modal: Confirmar finalización de consulta */}
      {showFinalizarConfirm && consultaActiva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="fin-confirm-title">
          <div className="bg-background-50 rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <span className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 flex-shrink-0" aria-hidden="true"><i className="ri-check-double-line text-lg"></i></span>
              <div>
                <h3 id="fin-confirm-title" className="text-base font-semibold text-foreground-900">Finalizar consulta</h3>
                <p className="text-sm text-foreground-500 mt-1">¿Deseas finalizar la consulta de <strong>{consultaActiva.patientName}</strong>? Se marcará como <strong>Completada</strong> y regresarás a la sala de espera.</p>
                {(notaEvolucionDirty || hasUnsavedChanges) && (
                  <p className="flex items-start gap-1.5 mt-2 text-xs text-amber-600">
                    <i className="ri-information-line text-sm flex-shrink-0"></i>
                    Tienes cambios sin guardar que se conservarán antes de finalizar.
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button type="button" onClick={() => setShowFinalizarConfirm(false)} className="px-4 py-2 text-sm font-medium bg-secondary-100 text-foreground-700 rounded-lg hover:bg-secondary-200 transition-base cursor-pointer whitespace-nowrap">Cancelar</button>
              <button type="button" onClick={() => { setShowFinalizarConfirm(false); doFinalizar(); }} className="px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-base cursor-pointer whitespace-nowrap">Sí, finalizar consulta</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Validación de campos obligatorios */}
      {showNom004Modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="nom004-title">
          <div className="bg-background-50 rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <span className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500/15 text-red-500 flex-shrink-0" aria-hidden="true"><i className="ri-error-warning-line text-lg"></i></span>
              <div>
                <h3 id="nom004-title" className="text-base font-semibold text-foreground-900">Campos obligatorios incompletos</h3>
                <p className="text-sm text-foreground-500 mt-1">Para finalizar la consulta debes completar los siguientes campos:</p>
                <ul className="mt-2 space-y-1">
                  {nom004Errors.map((e, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-red-700">
                      <span className="w-4 h-4 flex items-center justify-center rounded-full bg-red-100 flex-shrink-0"><i className="ri-close-line text-xs"></i></span>
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button type="button" onClick={() => setShowNom004Modal(false)} className="w-full px-4 py-2 text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-base cursor-pointer">Entendido, completar campos</button>
          </div>
        </div>
      )}

      {/* Modal: Imprimir Certificado Médico */}
      {certificadoParaImprimir && (
        <CertificadoMedicoPrintModal
          certificado={certificadoParaImprimir}
          isOpen={!!certificadoParaImprimir}
          onClose={() => setCertificadoParaImprimir(null)}
        />
      )}

      {/* Modal: Imprimir Receta */}
      {recetaParaImprimir && (
        <RecetaPrintModal
          receta={recetaParaImprimir}
          isOpen={!!recetaParaImprimir}
          onClose={() => setRecetaParaImprimir(null)}
        />
      )}

      {/* Modal: Imprimir Historia Clínica */}
      {showHistoriaPrintModal && consultaActiva && (
        <HistoriaClinicaPrintModal
          patientId={consultaActiva.patientId}
          isOpen={showHistoriaPrintModal}
          onClose={() => setShowHistoriaPrintModal(false)}
        />
      )}
    </div>
  );
}

function VitalBadge({ icon, label, value, alert }: { icon: string; label: string; value: string; alert: boolean }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border ${alert ? 'bg-red-500/10 border-red-500/20' : 'bg-background-50 border-secondary-100'}`}>
      <span className={`w-7 h-7 flex items-center justify-center rounded ${alert ? 'bg-red-100 text-red-500' : 'bg-secondary-100 text-foreground-500'}`}><i className={`${icon} text-xs`}></i></span>
      <div><p className="text-2xs text-foreground-400">{label}</p><p className={`text-sm font-bold ${alert ? 'text-red-700' : 'text-foreground-900'}`}>{value}</p></div>
    </div>
  );
}

function ConsultaHistorial({ patientId, currentConsultaId, onSelect }: { patientId: string; currentConsultaId: string; onSelect: (c: Consultation) => void }) {
  const historial = getConsultasByPatient(patientId).filter((c) => c.id !== currentConsultaId);
  if (historial.length === 0) return null;

  return (
    <Card padding="none">
      <div className="px-5 py-3 border-b border-secondary-200"><h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2"><i className="ri-history-line text-foreground-400"></i>Historial de Consultas ({historial.length})</h4></div>
      <div className="divide-y divide-secondary-100">
        {historial.map((c) => (
          <button key={c.id} onClick={() => onSelect(c)} className="w-full text-left px-5 py-3 hover:bg-secondary-50/50 transition-base cursor-pointer">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
              <div className="flex items-center gap-2"><span className="text-xs font-medium text-foreground-700">{c.fecha}</span><span className="text-xs text-foreground-400">{c.hora}</span><span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium ${estadoConfig[c.estado].color}`}>{estadoConfig[c.estado].label}</span><Badge variant="secondary" size="sm">{tipoConfig[c.tipo]}</Badge></div>
              <span className="text-2xs text-foreground-400">{c.doctorName} · {c.especialidad}</span>
            </div>
            <p className="text-xs text-foreground-600 line-clamp-2">{c.motivo}</p>
            {c.diagnosticoPrincipal && (
              <p className="text-xs text-foreground-700 mt-1.5 flex items-center gap-1"><span className="w-4 h-4 flex items-center justify-center rounded bg-amber-500/15 text-amber-500 flex-shrink-0"><i className="ri-award-line text-[10px]"></i></span><span className="font-medium">{c.diagnosticoPrincipal}</span></p>
            )}
          </button>
        ))}
      </div>
    </Card>
  );
}