import { useState, useMemo, useEffect } from 'react';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import {
  allergyStatusIsWarning,
  allergyStatusLabel,
  getClinicalRecord,
  type ClinicalRecordDto,
} from '@/api/clinicalRecord';
import { getConsultasByPatient, type Consultation } from '@/mocks/consultas';
import { triagePacientes, type TriageRecord } from '@/mocks/triage';
import { urgenciasMock, estadoUrgenciaConfig, destinoAltaConfig, type Urgencia } from '@/mocks/urgencias';
import { legacyMockTriageLabel, legacyMockTriageBadgeClass } from '@/utils/legacyMockTriagePresentation';
import { getRecetasByConsulta } from '@/mocks/recetas';
import { getEstudiosByConsulta, type EstudioSolicitado, type ParametroResultado } from '@/mocks/estudios';
import { getCertificadosByConsulta, tipoCertificadoConfig } from '@/mocks/certificados';
import { getConsentimientosByPatient, tipoConsentimientoConfig } from '@/mocks/consentimientos';
import { getSolicitudesByPatient, tipoARCOConfig, estadoARCOConfig } from '@/mocks/derechosARCO';
import { getReferenciasByPatient, urgenciaConfigRef, estadoRefConfig } from '@/mocks/referencias';
import { getEgresosByPatient, estadoAltaConfig, destinoAltaConfigEgreso, type HojaEgreso } from '@/mocks/egresos';
import { notasEnfermeriaMock, turnoConfig, type NotaEnfermeria } from '@/mocks/notasEnfermeria';
import { updateEstudioGlobal } from '@/hooks/useEstudiosState';
import ResultadoModal from '@/pages/estudios/components/ResultadoModal';
import ExpedientePrintModal from './ExpedientePrintModal';
import HistoriaClinicaReadOnly from '@/pages/consultas/components/HistoriaClinicaReadOnly';

function formatearFecha(fecha: string): string {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
}

function formatearFechaHora(fecha: string, hora: string): string {
  return `${formatearFecha(fecha)} · ${hora} hrs`;
}

type EntryType = 'triage' | 'consulta' | 'urgencia' | 'egreso';

interface TimelineEntry {
  id: string;
  type: EntryType;
  fecha: string;
  hora: string;
  sortKey: string;
  // Triage specific
  triage?: TriageRecord;
  // Consulta specific
  consulta?: Consultation;
  // Urgencia specific
  urgencia?: Urgencia;
  // Egreso specific
  egreso?: import('@/mocks/egresos').HojaEgreso;
}

const typeConfig: Record<EntryType, {
  label: string;
  icon: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  badgeVariant: 'success' | 'warning' | 'info' | 'danger';
}> = {
  triage: {
    label: 'Triage',
    icon: 'ri-heart-pulse-line',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
    badgeVariant: 'info',
  },
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
  egreso: {
    label: 'Egreso',
    icon: 'ri-logout-box-line',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    dot: 'bg-violet-500',
    badgeVariant: 'warning',
  },
};

export default function ExpedienteUnificado({ patientId }: { patientId: string }) {
  const [filterType, setFilterType] = useState<EntryType | 'todos'>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [showResultadoModal, setShowResultadoModal] = useState(false);
  const [estudioParaResultado, setEstudioParaResultado] = useState<EstudioSolicitado | null>(null);
  const [clinicalRecord, setClinicalRecord] = useState<ClinicalRecordDto | null>(null);
  const [showHistoria, setShowHistoria] = useState(false);

  const looksLikeGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    patientId,
  );

  useEffect(() => {
    if (!looksLikeGuid) {
      setClinicalRecord(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await getClinicalRecord(patientId);
      if (cancelled || !res.success || !res.data) return;
      setClinicalRecord(res.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, looksLikeGuid]);

  const allergyBanner = clinicalRecord ? (
    <div
      className={`px-4 py-3 rounded-xl border ${
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
          <p className="text-2xs mt-1">
            Lista vacía no significa «sin alergias». Estado explícito pendiente de captura.
          </p>
        )}
      {clinicalRecord.allergies.map((a) => (
        <p key={a.allergyId} className="text-xs mt-1">
          {a.substance} · {a.reactionType}
          {a.severity ? ` · ${a.severity}` : ''}
        </p>
      ))}
      <button
        type="button"
        onClick={() => setShowHistoria((v) => !v)}
        className="mt-2 text-xs underline cursor-pointer"
      >
        {showHistoria ? 'Ocultar historia clínica' : 'Ver historia clínica'}
      </button>
    </div>
  ) : null;

  const entries = useMemo(() => {
    const all: TimelineEntry[] = [];

    // Triage records
    const triagePatient = triagePacientes.find((tp) => tp.id === patientId);
    if (triagePatient) {
      triagePatient.historialTriage.forEach((t) => {
        all.push({
          id: t.id,
          type: 'triage',
          fecha: t.fecha,
          hora: t.hora,
          sortKey: `${t.fecha}T${t.hora}`,
          triage: t,
        });
      });
    }

    // Consultas
    const consultas = getConsultasByPatient(patientId);
    consultas.forEach((c) => {
      all.push({
        id: c.id,
        type: 'consulta',
        fecha: c.fecha,
        hora: c.hora,
        sortKey: `${c.fecha}T${c.hora}`,
        consulta: c,
      });
    });

    // Urgencias
    const urgencias = urgenciasMock.filter((u) => u.patientId === patientId);
    urgencias.forEach((u) => {
      all.push({
        id: u.id,
        type: 'urgencia',
        fecha: u.fecha,
        hora: u.horaLlegada,
        sortKey: `${u.fecha}T${u.horaLlegada}`,
        urgencia: u,
      });
    });

    // Egresos / Hojas de Alta
    const egresosList = getEgresosByPatient(patientId);
    egresosList.forEach((e) => {
      all.push({
        id: e.id,
        type: 'egreso',
        fecha: e.fechaEgreso,
        hora: e.horaEgreso,
        sortKey: `${e.fechaEgreso}T${e.horaEgreso}`,
        egreso: e,
      });
    });

    // Sort by date descending (newest first)
    all.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    return all;
  }, [patientId]);

  const filtered = filterType === 'todos' ? entries : entries.filter((e) => e.type === filterType);

  // Stats
  const counts = useMemo(() => {
    const triage = entries.filter((e) => e.type === 'triage').length;
    const consulta = entries.filter((e) => e.type === 'consulta').length;
    const urgencia = entries.filter((e) => e.type === 'urgencia').length;
    const egreso = entries.filter((e) => e.type === 'egreso').length;
    return { triage, consulta, urgencia, egreso };
  }, [entries]);

  // Normatividad data
  const consentimientos = useMemo(() => getConsentimientosByPatient(patientId), [patientId]);
  const solicitudesARCO = useMemo(() => getSolicitudesByPatient(patientId), [patientId]);
  const referencias = useMemo(() => getReferenciasByPatient(patientId), [patientId]);
  const egresos = useMemo(() => getEgresosByPatient(patientId), [patientId]);
  const notasEnfermeria = useMemo(() => notasEnfermeriaMock.filter((n) => n.patientId === patientId), [patientId]);

  const handleGuardarResultado = (resultado: string, parametros: ParametroResultado[]) => {
    if (!estudioParaResultado) return;
    const updated = {
      ...estudioParaResultado,
      estado: 'completado' as const,
      fechaResultado: new Date().toISOString().split('T')[0],
      resultado,
      parametros,
    };
    updateEstudioGlobal(updated);
    setShowResultadoModal(false);
    setEstudioParaResultado(null);
  };

  if (entries.length === 0) {
    return (
      <div className="space-y-4">
        {allergyBanner}
        {showHistoria && looksLikeGuid && <HistoriaClinicaReadOnly patientId={patientId} />}
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-secondary-100 mb-4">
            <i className="ri-folder-open-line text-2xl text-foreground-400"></i>
          </div>
          <h3 className="text-base font-semibold text-foreground-800 font-heading mb-1">Sin registros clínicos</h3>
          <p className="text-sm text-foreground-500 text-center max-w-sm">
            Este paciente aún no tiene registros de triage, consultas ni atenciones de urgencias.
          </p>
        </div>
      </div>
    );
  }

  const typeFilters: { key: EntryType | 'todos'; label: string; count: number; icon: string }[] = [
    { key: 'todos', label: 'Todos', count: entries.length, icon: 'ri-file-list-3-line' },
    { key: 'triage', label: 'Triage', count: counts.triage, icon: 'ri-heart-pulse-line' },
    { key: 'consulta', label: 'Consultas', count: counts.consulta, icon: 'ri-stethoscope-line' },
    { key: 'urgencia', label: 'Urgencias', count: counts.urgencia, icon: 'ri-hospital-line' },
    { key: 'egreso', label: 'Egresos', count: counts.egreso, icon: 'ri-logout-box-line' },
  ];

  return (
    <div className="space-y-5">
      {allergyBanner}
      {showHistoria && looksLikeGuid && <HistoriaClinicaReadOnly patientId={patientId} />}

      {/* Header con acción de impresión */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-foreground-900 font-heading">Expediente Clínico Unificado</h3>
        <button
          onClick={() => setShowPrint(true)}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-base cursor-pointer whitespace-nowrap"
        >
          <i className="ri-printer-line"></i> Imprimir expediente completo
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {typeFilters.filter((f) => f.key !== 'todos').map((f) => {
          const cfg = typeConfig[f.key as EntryType];
          return (
            <button
              key={f.key}
              onClick={() => setFilterType(filterType === f.key ? 'todos' : f.key)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                filterType === f.key
                  ? `${cfg.border} ${cfg.bg} ring-2 ${cfg.border}`
                  : 'border-secondary-200 bg-background-50 hover:border-secondary-300'
              }`}
            >
              <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${cfg.bg}`}>
                <i className={`${cfg.icon} ${cfg.text} text-lg`}></i>
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-foreground-900 font-heading">{f.count}</p>
                <p className="text-xs text-foreground-500">{f.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Type filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {typeFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterType(f.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              filterType === f.key
                ? 'bg-foreground-900 text-background-50'
                : 'bg-secondary-100 text-foreground-600 hover:bg-secondary-200'
            }`}
          >
            <span className="w-3 h-3 flex items-center justify-center">
              <i className={`${f.icon} text-[10px]`}></i>
            </span>
            {f.label}
            <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
              filterType === f.key ? 'bg-background-50/20 text-background-50' : 'bg-secondary-200 text-foreground-500'
            }`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="absolute left-[14px] top-2 bottom-2 w-px bg-secondary-200"></div>

        <div className="space-y-1">
          {filtered.map((entry, idx) => {
            const cfg = typeConfig[entry.type];
            const isExpanded = expandedId === entry.id;

            // Determine if this date is different from the previous entry
            const prevEntry = idx > 0 ? filtered[idx - 1] : null;
            const showDateHeader = !prevEntry || prevEntry.fecha !== entry.fecha;

            return (
              <div key={entry.id}>
                {/* Date header */}
                {showDateHeader && (
                  <div className="flex items-center gap-3 mb-2 mt-4 first:mt-0">
                    <div className="absolute left-0 w-[30px] flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-foreground-300 border-2 border-background-50"></div>
                    </div>
                    <h4 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider">
                      {formatearFecha(entry.fecha)}
                    </h4>
                  </div>
                )}

                {/* Entry card */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className={`w-full text-left mb-2 transition-all cursor-pointer group`}
                >
                  <div className={`relative pl-0 pr-3 py-3 rounded-xl border transition-all ${
                    isExpanded
                      ? `${cfg.border} ${cfg.bg} shadow-sm`
                      : 'border-secondary-100 bg-background-50 hover:border-secondary-300'
                  }`}>
                    {/* Timeline dot */}
                    <div className={`absolute left-[-22px] top-4 w-3.5 h-3.5 rounded-full border-2 border-background-50 ${cfg.dot}`}></div>

                    <div className="pl-1">
                      {/* Header row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={cfg.badgeVariant} size="sm">{cfg.label}</Badge>
                        <span className="text-xs text-foreground-500">
                          {entry.triage && `${entry.triage.hora} hrs`}
                          {entry.consulta && `${entry.consulta.hora} hrs`}
                          {entry.urgencia && `${entry.urgencia.horaLlegada} hrs`}
                        </span>

                        {/* Triage level badge */}
                        {entry.triage && (
                          <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full ${legacyMockTriageBadgeClass(entry.triage.nivelUrgencia)}`}>
                            {legacyMockTriageLabel(entry.triage.nivelUrgencia)}
                          </span>
                        )}

                        {/* Urgencia level */}
                        {entry.urgencia && (
                          <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full ${legacyMockTriageBadgeClass(entry.urgencia.nivelUrgencia)}`}>
                            {legacyMockTriageLabel(entry.urgencia.nivelUrgencia)}
                          </span>
                        )}

                        {/* Estado for urgencia */}
                        {entry.urgencia && (
                          <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full ${
                            estadoUrgenciaConfig[entry.urgencia.estado].bg
                          } ${estadoUrgenciaConfig[entry.urgencia.estado].color}`}>
                            {estadoUrgenciaConfig[entry.urgencia.estado].label}
                          </span>
                        )}

                        {/* Egreso estado */}
                        {entry.egreso && (
                          <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full ${estadoAltaConfig[entry.egreso.estadoAlta].bg} ${estadoAltaConfig[entry.egreso.estadoAlta].text}`}>
                            {estadoAltaConfig[entry.egreso.estadoAlta].label}
                          </span>
                        )}
                        {/* Consulta estado */}
                        {entry.consulta && (
                          <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full ${
                            entry.consulta.estado === 'completada' ? 'bg-emerald-100 text-emerald-700' :
                            entry.consulta.estado === 'en_curso' ? 'bg-amber-100 text-amber-700' :
                            entry.consulta.estado === 'cancelada' ? 'bg-red-100 text-red-700' :
                            'bg-secondary-100 text-foreground-600'
                          }`}>
                            {entry.consulta.estado === 'completada' ? 'Completada' :
                             entry.consulta.estado === 'en_curso' ? 'En curso' :
                             entry.consulta.estado === 'cancelada' ? 'Cancelada' : 'Pendiente'}
                          </span>
                        )}
                      </div>

                      {/* Title row */}
                      <div className="mt-1.5">
                        {entry.egreso && (
                          <p className="text-sm font-semibold text-foreground-800">
                            Alta — {entry.egreso.diagnosticoEgreso.length > 70 ? entry.egreso.diagnosticoEgreso.substring(0, 70) + '...' : entry.egreso.diagnosticoEgreso}
                          </p>
                        )}
                        {entry.triage && (
                          <p className="text-sm font-semibold text-foreground-800">
                            Triage: {entry.triage.notas.substring(0, 60)}{entry.triage.notas.length > 60 ? '...' : ''}
                          </p>
                        )}
                        {entry.consulta && (
                          <p className="text-sm font-semibold text-foreground-800">
                            {entry.consulta.especialidad} — {entry.consulta.motivo}
                          </p>
                        )}
                        {entry.urgencia && (
                          <p className="text-sm font-semibold text-foreground-800">
                            {entry.urgencia.motivo.substring(0, 70)}{entry.urgencia.motivo.length > 70 ? '...' : ''}
                          </p>
                        )}
                      </div>

                      {/* Subtitle row */}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {entry.triage && (
                          <span className="text-xs text-foreground-500">
                            Realizado por: {entry.triage.realizadoPor}
                          </span>
                        )}
                        {entry.consulta && (
                          <span className="text-xs text-foreground-500">
                            {entry.consulta.doctorName}
                          </span>
                        )}
                        {entry.urgencia && entry.urgencia.doctorName && (
                          <span className="text-xs text-foreground-500">
                            {entry.urgencia.doctorName}
                          </span>
                        )}
                        {entry.urgencia && !entry.urgencia.doctorName && (
                          <span className="text-xs text-foreground-400 italic">Sin médico asignado</span>
                        )}
                        {entry.egreso && (
                          <span className="text-xs text-foreground-500">{entry.egreso.medicoTratante}</span>
                        )}
                      </div>

                      {/* Expand icon hint */}
                      <div className="flex items-center gap-1 mt-2">
                        <span className={`w-3.5 h-3.5 flex items-center justify-center ${cfg.text}`}>
                          <i className={`text-xs ${isExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></i>
                        </span>
                        <span className="text-2xs text-foreground-400">
                          {isExpanded ? 'Colapsar' : 'Ver detalles'}
                        </span>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-secondary-200 space-y-3">
                          {/* TRIAGE DETAILS */}
                          {entry.triage && (
                            <div className="space-y-3">
                              <h5 className="text-xs font-semibold text-foreground-700 uppercase tracking-wider">Signos Vitales</h5>
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                <VitalChip label="Peso" value={`${entry.triage.peso} kg`} />
                                <VitalChip label="Talla" value={`${entry.triage.talla} m`} />
                                <VitalChip label="IMC" value={entry.triage.imc.toFixed(1)} />
                                <VitalChip label="Temp" value={`${entry.triage.temperatura}°C`} />
                                <VitalChip label="P. Arterial" value={`${entry.triage.presionSistolica}/${entry.triage.presionDiastolica}`} />
                                <VitalChip label="F. Cardiaca" value={`${entry.triage.frecuenciaCardiaca} lpm`} />
                                <VitalChip label="F. Resp." value={`${entry.triage.frecuenciaRespiratoria} rpm`} />
                                <VitalChip label="SpO2" value={`${entry.triage.saturacionOxigeno}%`} />
                                {entry.triage.glucosa && <VitalChip label="Glucosa" value={`${entry.triage.glucosa} mg/dL`} />}
                                <VitalChip label="Dolor (EVA)" value={`${entry.triage.dolor}/10`} />
                              </div>
                              {entry.triage.notas && (
                                <div>
                                  <h5 className="text-xs font-semibold text-foreground-700 mb-1">Notas de Triage</h5>
                                  <p className="text-sm text-foreground-600 bg-secondary-50 rounded-lg p-3">{entry.triage.notas}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* CONSULTA DETAILS */}
                          {entry.consulta && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <InfoRow label="Especialidad" value={entry.consulta.especialidad} />
                                <InfoRow label="Tipo" value={
                                  entry.consulta.tipo === 'primera_vez' ? 'Primera vez' :
                                  entry.consulta.tipo === 'subsecuente' ? 'Subsecuente' :
                                  entry.consulta.tipo === 'urgencia' ? 'Urgencia' : 'Control'
                                } />
                              </div>
                              {entry.consulta.padecimientoActual && (
                                <div>
                                  <h5 className="text-xs font-semibold text-foreground-700 mb-1">Padecimiento Actual</h5>
                                  <p className="text-sm text-foreground-600 bg-secondary-50 rounded-lg p-3">{entry.consulta.padecimientoActual}</p>
                                </div>
                              )}
                              {entry.consulta.exploracionFisica && (
                                <div>
                                  <h5 className="text-xs font-semibold text-foreground-700 mb-1">Exploración Física</h5>
                                  <p className="text-sm text-foreground-600 bg-secondary-50 rounded-lg p-3">{entry.consulta.exploracionFisica}</p>
                                </div>
                              )}
                              <div className="grid grid-cols-1 gap-2">
                                <InfoRow label="Diagnóstico Principal" value={entry.consulta.diagnosticoPrincipal} highlight />
                                {entry.consulta.diagnosticosSecundarios.length > 0 && (
                                  <InfoRow label="Diagnósticos Secundarios" value={entry.consulta.diagnosticosSecundarios.join(', ')} />
                                )}
                              </div>
                              {entry.consulta.planTratamiento && (
                                <div>
                                  <h5 className="text-xs font-semibold text-foreground-700 mb-1">Plan de Tratamiento</h5>
                                  <p className="text-sm text-foreground-600 bg-secondary-50 rounded-lg p-3 whitespace-pre-line">{entry.consulta.planTratamiento}</p>
                                </div>
                              )}
                              {entry.consulta.notas && (
                                <div>
                                  <h5 className="text-xs font-semibold text-foreground-700 mb-1">Notas</h5>
                                  <p className="text-sm text-foreground-600 bg-secondary-50 rounded-lg p-3">{entry.consulta.notas}</p>
                                </div>
                              )}
                              {entry.consulta.signosVitales && (
                                <div>
                                  <h5 className="text-xs font-semibold text-foreground-700 mb-2">Signos Vitales</h5>
                                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    <VitalChip label="Peso" value={`${entry.consulta.signosVitales.peso} kg`} />
                                    <VitalChip label="Talla" value={`${entry.consulta.signosVitales.talla} m`} />
                                    <VitalChip label="IMC" value={entry.consulta.signosVitales.imc.toFixed(1)} />
                                    <VitalChip label="Temp" value={`${entry.consulta.signosVitales.temperatura}°C`} />
                                    <VitalChip label="TA" value={`${entry.consulta.signosVitales.presionSistolica}/${entry.consulta.signosVitales.presionDiastolica}`} />
                                    <VitalChip label="FC" value={`${entry.consulta.signosVitales.frecuenciaCardiaca} lpm`} />
                                    <VitalChip label="FR" value={`${entry.consulta.signosVitales.frecuenciaRespiratoria} rpm`} />
                                    <VitalChip label="SpO2" value={`${entry.consulta.signosVitales.saturacionOxigeno}%`} />
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center gap-3">
                                {entry.consulta.tieneReceta && (
                                  <span className="inline-flex items-center gap-1 text-xs text-accent-700 bg-accent-50 px-2 py-1 rounded-md">
                                    <span className="w-3 h-3 flex items-center justify-center"><i className="ri-capsule-line text-[10px]"></i></span>
                                    Tiene receta
                                  </span>
                                )}
                                {entry.consulta.tieneEstudios && (
                                  <span className="inline-flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                                    <span className="w-3 h-3 flex items-center justify-center"><i className="ri-microscope-line text-[10px]"></i></span>
                                    Tiene estudios
                                  </span>
                                )}
                              </div>

                              {/* Documentos generados en esta consulta */}
                              <ConsultaDocsSection
                                consultaId={entry.consulta.id}
                                onCapturarResultado={(estudio) => {
                                  setEstudioParaResultado(estudio);
                                  setShowResultadoModal(true);
                                }}
                              />
                            </div>
                          )}

                          {/* EGRESO DETAILS */}
                          {entry.egreso && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <InfoRow label="Médico tratante" value={entry.egreso.medicoTratante} />
                                <InfoRow label="Especialidad" value={entry.egreso.especialidad} />
                                <InfoRow label="Ingreso" value={`${entry.egreso.fechaIngreso} · ${entry.egreso.horaIngreso} hrs`} />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xs text-foreground-400 uppercase tracking-wider">Estado alta</span>
                                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${estadoAltaConfig[entry.egreso.estadoAlta].bg} ${estadoAltaConfig[entry.egreso.estadoAlta].text}`}>
                                    <i className={`${estadoAltaConfig[entry.egreso.estadoAlta].icon} text-[10px]`}></i>
                                    {estadoAltaConfig[entry.egreso.estadoAlta].label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-2xs text-foreground-400 uppercase tracking-wider">Destino</span>
                                  <span className="inline-flex items-center gap-1 text-xs text-foreground-700">
                                    <i className={`${destinoAltaConfigEgreso[entry.egreso.destinoAlta].icon} text-[10px]`}></i>
                                    {destinoAltaConfigEgreso[entry.egreso.destinoAlta].label}
                                  </span>
                                </div>
                              </div>
                              {entry.egreso.motivoIngreso && (
                                <div>
                                  <h5 className="text-xs font-semibold text-foreground-700 mb-1">Motivo de ingreso</h5>
                                  <p className="text-sm text-foreground-600 bg-secondary-50 rounded-lg p-3">{entry.egreso.motivoIngreso}</p>
                                </div>
                              )}
                              <InfoRow label="Diagnóstico de egreso" value={entry.egreso.diagnosticoEgreso} highlight />
                              {entry.egreso.recomendaciones && (
                                <div>
                                  <h5 className="text-xs font-semibold text-foreground-700 mb-1">Recomendaciones al alta</h5>
                                  <p className="text-sm text-foreground-600 bg-secondary-50 rounded-lg p-3 whitespace-pre-line">{entry.egreso.recomendaciones}</p>
                                </div>
                              )}
                              {entry.egreso.medicamentosAlta.length > 0 && (
                                <div>
                                  <h5 className="text-xs font-semibold text-foreground-700 mb-2">Medicamentos al alta</h5>
                                  <div className="flex flex-wrap gap-2">
                                    {entry.egreso.medicamentosAlta.map((m, i) => (
                                      <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background-50 border border-secondary-200 text-xs">
                                        <i className="ri-capsule-line text-accent-600"></i>
                                        <span className="font-medium text-foreground-700">{m.nombre} {m.dosis}</span>
                                        <span className="text-foreground-400">{m.frecuencia} · {m.duracion}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {entry.egreso.citaControl && (
                                <div className="flex items-center gap-2 p-2.5 bg-primary-50 border border-primary-200 rounded-lg">
                                  <i className="ri-calendar-check-line text-primary-600"></i>
                                  <span className="text-xs font-medium text-primary-700">Cita control: {entry.egreso.citaControl}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* URGENCIA DETAILS */}
                          {entry.urgencia && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <InfoRow label="Área" value={entry.urgencia.areaUrgencia} />
                                <InfoRow label="Vía de acceso" value={
                                  entry.urgencia.viaAcceso === 'caminando' ? 'Caminando' :
                                  entry.urgencia.viaAcceso === 'ambulancia' ? 'Ambulancia' :
                                  entry.urgencia.viaAcceso === 'referencia' ? 'Referencia' : 'Policía'
                                } />
                                <InfoRow label="Contacto emergencia" value={entry.urgencia.contactoEmergencia} />
                              </div>
                              {entry.urgencia.horaAtencion && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <InfoRow label="Llegada" value={entry.urgencia.horaLlegada} />
                                  <InfoRow label="Atención" value={entry.urgencia.horaAtencion} />
                                  {entry.urgencia.horaAlta && <InfoRow label="Alta" value={entry.urgencia.horaAlta} />}
                                </div>
                              )}
                              {entry.urgencia.signosVitales && (
                                <div>
                                  <h5 className="text-xs font-semibold text-foreground-700 mb-2">Signos Vitales al Ingreso</h5>
                                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    <VitalChip label="Peso" value={`${entry.urgencia.signosVitales.peso} kg`} />
                                    <VitalChip label="IMC" value={entry.urgencia.signosVitales.imc.toFixed(1)} />
                                    <VitalChip label="Temp" value={`${entry.urgencia.signosVitales.temperatura}°C`} />
                                    <VitalChip label="TA" value={`${entry.urgencia.signosVitales.presionSistolica}/${entry.urgencia.signosVitales.presionDiastolica}`} />
                                    <VitalChip label="FC" value={`${entry.urgencia.signosVitales.frecuenciaCardiaca} lpm`} />
                                    <VitalChip label="FR" value={`${entry.urgencia.signosVitales.frecuenciaRespiratoria} rpm`} />
                                    <VitalChip label="SpO2" value={`${entry.urgencia.signosVitales.saturacionOxigeno}%`} />
                                    {entry.urgencia.signosVitales.glucosa && <VitalChip label="Glucosa" value={`${entry.urgencia.signosVitales.glucosa} mg/dL`} />}
                                    <VitalChip label="Dolor" value={`${entry.urgencia.signosVitales.dolor}/10`} />
                                  </div>
                                </div>
                              )}
                              {entry.urgencia.notaMedica && (
                                <div>
                                  <h5 className="text-xs font-semibold text-foreground-700 mb-1">Nota Médica</h5>
                                  <p className="text-sm text-foreground-600 bg-secondary-50 rounded-lg p-3 whitespace-pre-line">{entry.urgencia.notaMedica}</p>
                                </div>
                              )}
                              {entry.urgencia.destinoAlta && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-foreground-700">Destino de alta:</span>
                                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${destinoAltaConfig[entry.urgencia.destinoAlta].color} bg-background-50 border border-secondary-200`}>
                                    <span className="w-3 h-3 flex items-center justify-center">
                                      <i className={`${destinoAltaConfig[entry.urgencia.destinoAlta].icon} text-[10px]`}></i>
                                    </span>
                                    {destinoAltaConfig[entry.urgencia.destinoAlta].label}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
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
      {/* Normatividad section below timeline */}
      <NormatividadSection
        consentimientos={consentimientos}
        solicitudesARCO={solicitudesARCO}
        referencias={referencias}
        egresos={egresos}
        notasEnfermeria={notasEnfermeria}
      />

      <ExpedientePrintModal
        patientId={patientId}
        isOpen={showPrint}
        onClose={() => setShowPrint(false)}
      />

      {showResultadoModal && estudioParaResultado && (
        <ResultadoModal
          estudio={estudioParaResultado}
          onGuardar={handleGuardarResultado}
          onClose={() => { setShowResultadoModal(false); setEstudioParaResultado(null); }}
        />
      )}
    </div>
  );
}

function NormatividadSection({ consentimientos, solicitudesARCO, referencias, egresos, notasEnfermeria }: {
  consentimientos: ReturnType<typeof getConsentimientosByPatient>;
  solicitudesARCO: ReturnType<typeof getSolicitudesByPatient>;
  referencias: ReturnType<typeof getReferenciasByPatient>;
  egresos: ReturnType<typeof getEgresosByPatient>;
  notasEnfermeria: NotaEnfermeria[];
}) {
  const total = consentimientos.length + solicitudesARCO.length + referencias.length + egresos.length + notasEnfermeria.length;
  if (total === 0) return null;

  return (
    <div className="space-y-3 pt-4 mt-4 border-t-2 border-dashed border-secondary-200">
      <h4 className="text-xs font-bold text-foreground-700 uppercase tracking-wider flex items-center gap-2">
        <span className="w-5 h-5 flex items-center justify-center rounded bg-emerald-100 text-emerald-700">
          <i className="ri-government-line text-2xs"></i>
        </span>
        Normatividad y Gestión Legal
        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-secondary-200 text-foreground-500 text-[10px]">{total}</span>
      </h4>

      {/* Consentimientos */}
      {consentimientos.length > 0 && (
        <div className="p-3 rounded-xl border border-secondary-200 bg-secondary-50/50 space-y-2">
          <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider flex items-center gap-1">
            <span className="w-3 h-3 flex items-center justify-center"><i className="ri-file-shield-line text-[10px]"></i></span>
            Consentimientos Informados ({consentimientos.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {consentimientos.map((c) => {
              const tipoCfg = tipoConsentimientoConfig[c.tipo];
              const isOk = c.estado === 'firmado';
              return (
                <div key={c.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs border ${isOk ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <span className={`w-3.5 h-3.5 flex items-center justify-center ${isOk ? 'text-emerald-600' : 'text-amber-600'}`}>
                    <i className={`${tipoCfg.icon} text-[10px]`}></i>
                  </span>
                  <span className={`font-medium ${isOk ? 'text-emerald-800' : 'text-amber-800'}`}>{tipoCfg.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${isOk ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {c.estado === 'firmado' ? 'Firmado' : 'Pendiente'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ARCO */}
      {solicitudesARCO.length > 0 && (
        <div className="p-3 rounded-xl border border-secondary-200 bg-secondary-50/50 space-y-2">
          <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider flex items-center gap-1">
            <span className="w-3 h-3 flex items-center justify-center"><i className="ri-shield-keyhole-line text-[10px]"></i></span>
            Derechos ARCO ({solicitudesARCO.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {solicitudesARCO.map((s) => {
              const tipoCfg = tipoARCOConfig[s.tipo];
              const estCfg = estadoARCOConfig[s.estado];
              return (
                <div key={s.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-background-50 border border-secondary-200">
                  <span className={`w-3.5 h-3.5 flex items-center justify-center ${tipoCfg.text}`}>
                    <i className={`${tipoCfg.icon} text-[10px]`}></i>
                  </span>
                  <span className="font-medium text-foreground-700">{tipoCfg.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${estCfg.bg} ${estCfg.text}`}>{estCfg.label}</span>
                  <span className="text-[10px] text-foreground-400">{s.fechaSolicitud}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Referencias */}
      {referencias.length > 0 && (
        <div className="p-3 rounded-xl border border-secondary-200 bg-secondary-50/50 space-y-2">
          <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider flex items-center gap-1">
            <span className="w-3 h-3 flex items-center justify-center"><i className="ri-arrow-left-right-line text-[10px]"></i></span>
            Referencias / Contrarreferencias ({referencias.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {referencias.map((r) => {
              const urgCfg = urgenciaConfigRef[r.urgencia];
              const estCfg = estadoRefConfig[r.estado];
              return (
                <div key={r.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-background-50 border border-secondary-200">
                  <span className={`w-3.5 h-3.5 flex items-center justify-center ${r.tipo === 'referencia' ? 'text-primary-600' : 'text-accent-600'}`}>
                    <i className={`${r.tipo === 'referencia' ? 'ri-arrow-right-line' : 'ri-arrow-left-line'} text-[10px]`}></i>
                  </span>
                  <span className="font-medium text-foreground-700">{r.tipo === 'referencia' ? 'Referencia' : 'Contrarreferencia'}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${urgCfg.bg} ${urgCfg.text}`}>{urgCfg.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${estCfg.bg} ${estCfg.text}`}>{estCfg.label}</span>
                  <span className="text-[10px] text-foreground-400">{r.fecha}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Egresos */}
      {egresos.length > 0 && (
        <div className="p-3 rounded-xl border border-secondary-200 bg-secondary-50/50 space-y-2">
          <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider flex items-center gap-1">
            <span className="w-3 h-3 flex items-center justify-center"><i className="ri-logout-box-line text-[10px]"></i></span>
            Hojas de Egreso ({egresos.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {egresos.map((e) => {
              const estCfg = estadoAltaConfig[e.estadoAlta];
              const destCfg = destinoAltaConfigEgreso[e.destinoAlta];
              return (
                <div key={e.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-background-50 border border-secondary-200">
                  <span className={`w-3.5 h-3.5 flex items-center justify-center ${estCfg.text}`}>
                    <i className={`${estCfg.icon} text-[10px]`}></i>
                  </span>
                  <span className="font-medium text-foreground-700">{e.fechaEgreso}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${estCfg.bg} ${estCfg.text}`}>{estCfg.label}</span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-foreground-500">
                    <i className={`${destCfg.icon} text-[8px]`}></i>{destCfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notas de Enfermería */}
      {notasEnfermeria.length > 0 && (
        <div className="p-3 rounded-xl border border-secondary-200 bg-secondary-50/50 space-y-2">
          <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider flex items-center gap-1">
            <span className="w-3 h-3 flex items-center justify-center"><i className="ri-nurse-line text-[10px]"></i></span>
            Notas de Enfermería ({notasEnfermeria.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {notasEnfermeria.map((n) => {
              const turnoCfg = turnoConfig[n.turno];
              return (
                <div key={n.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-background-50 border border-secondary-200">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${turnoCfg.color}`}>
                    <i className={`${turnoCfg.icon} text-[8px]`}></i>{turnoCfg.label}
                  </span>
                  <span className="font-medium text-foreground-700">{n.fecha}</span>
                  <span className="text-foreground-400">{n.horaInicio}–{n.horaFin}</span>
                  <span className="text-[10px] text-foreground-500 truncate max-w-[120px]">{n.enfermera}</span>
                  {n.firmaEnfermera && <i className="ri-check-line text-emerald-500 text-[10px]"></i>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ConsultaDocsSection({ consultaId, onCapturarResultado }: { consultaId: string; onCapturarResultado?: (estudio: EstudioSolicitado) => void }) {
  const recetas = useMemo(() => getRecetasByConsulta(consultaId), [consultaId]);
  const estudios = useMemo(() => getEstudiosByConsulta(consultaId), [consultaId]);
  const certificados = useMemo(() => getCertificadosByConsulta(consultaId), [consultaId]);

  const totalDocs = recetas.length + estudios.length + certificados.length;
  if (totalDocs === 0) {
    return (
      <div className="p-3 rounded-lg border border-dashed border-secondary-200 bg-background-50">
        <p className="text-2xs text-foreground-400">Sin recetas, estudios ni certificados generados en esta consulta.</p>
      </div>
    );
  }

  const estadoRecetaCfg: Record<string, { label: string; bg: string; text: string }> = {
    activa: { label: 'Activa', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    surtida: { label: 'Surtida', bg: 'bg-sky-100', text: 'text-sky-700' },
    parcial: { label: 'Parcial', bg: 'bg-amber-100', text: 'text-amber-700' },
    vencida: { label: 'Vencida', bg: 'bg-secondary-100', text: 'text-foreground-600' },
    cancelada: { label: 'Cancelada', bg: 'bg-red-100', text: 'text-red-700' },
  };

  const estadoEstudioCfg: Record<string, { label: string; bg: string; text: string }> = {
    solicitado: { label: 'Solicitado', bg: 'bg-amber-100', text: 'text-amber-700' },
    en_proceso: { label: 'En proceso', bg: 'bg-secondary-100', text: 'text-foreground-600' },
    completado: { label: 'Completado', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    cancelado: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-700' },
  };

  const tipoEstudioIcon: Record<string, string> = {
    laboratorio: 'ri-flask-line',
    imagen: 'ri-image-line',
    gabinete: 'ri-heart-pulse-line',
    patologia: 'ri-microscope-line',
    otro: 'ri-file-text-line',
  };

  return (
    <div className="p-3 rounded-xl border border-secondary-200 bg-secondary-50/50 space-y-3">
      <h5 className="text-[10px] font-semibold text-foreground-500 uppercase tracking-wider">
        Documentos generados en esta consulta
        <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-secondary-200 text-foreground-600 text-[10px]">{totalDocs}</span>
      </h5>

      {/* Recetas */}
      {recetas.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-2xs font-medium text-foreground-500 flex items-center gap-1">
            <span className="w-3 h-3 flex items-center justify-center"><i className="ri-capsule-line text-[10px]"></i></span>
            Recetas ({recetas.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {recetas.map((r) => {
              const cfg = estadoRecetaCfg[r.estado] || { label: r.estado, bg: 'bg-secondary-100', text: 'text-foreground-600' };
              const medsText = r.medicamentos.map((m) => `${m.nombre} ${m.concentracion}`).join(', ');
              return (
                <div key={r.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background-50 border border-secondary-200 text-xs">
                  <span className="w-3.5 h-3.5 flex items-center justify-center text-accent-600">
                    <i className="ri-capsule-line text-[10px]"></i>
                  </span>
                  <span className="text-foreground-700 font-medium truncate max-w-[200px]">{medsText}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Estudios */}
      {estudios.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-2xs font-medium text-foreground-500 flex items-center gap-1">
            <span className="w-3 h-3 flex items-center justify-center"><i className="ri-microscope-line text-[10px]"></i></span>
            Estudios ({estudios.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {estudios.map((e) => {
              const cfg = estadoEstudioCfg[e.estado] || { label: e.estado, bg: 'bg-secondary-100', text: 'text-foreground-600' };
              const icon = tipoEstudioIcon[e.tipo] || 'ri-file-text-line';
              const puedeCapturar = e.estado === 'solicitado' || e.estado === 'en_proceso';
              return (
                <div key={e.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background-50 border border-secondary-200 text-xs">
                  <span className="w-3.5 h-3.5 flex items-center justify-center text-amber-600">
                    <i className={`${icon} text-[10px]`}></i>
                  </span>
                  <span className="text-foreground-700 font-medium truncate max-w-[200px]">{e.nombre}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                  {e.resultado && e.estado === 'completado' && (
                    <span className="text-[10px] text-foreground-500 truncate max-w-[180px]">{e.resultado}</span>
                  )}
                  {puedeCapturar && onCapturarResultado && (
                    <button
                      onClick={(evt) => { evt.stopPropagation(); onCapturarResultado(e); }}
                      className="ml-auto flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-base cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-test-tube-line"></i> Capturar
                    </button>
                  )}
                  {e.estado === 'completado' && e.parametros && e.parametros.length > 0 && onCapturarResultado && (
                    <button
                      onClick={(evt) => { evt.stopPropagation(); onCapturarResultado(e); }}
                      className="ml-auto flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-sky-50 text-sky-600 border border-sky-200 rounded-md hover:bg-sky-100 transition-base cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-eye-line"></i> Ver
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Certificados */}
      {certificados.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-2xs font-medium text-foreground-500 flex items-center gap-1">
            <span className="w-3 h-3 flex items-center justify-center"><i className="ri-file-shield-line text-[10px]"></i></span>
            Certificados ({certificados.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {certificados.map((c) => {
              const tipoCfg = tipoCertificadoConfig[c.tipo];
              const isAnulado = c.estado === 'anulado';
              return (
                <div key={c.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs border ${isAnulado ? 'bg-red-50 border-red-200' : 'bg-background-50 border-secondary-200'}`}>
                  <span className={`w-3.5 h-3.5 flex items-center justify-center ${isAnulado ? 'text-red-500' : 'text-accent-600'}`}>
                    <i className={`${tipoCfg.icon} text-[10px]`}></i>
                  </span>
                  <span className={`font-medium truncate max-w-[180px] ${isAnulado ? 'text-foreground-400 line-through' : 'text-foreground-700'}`}>
                    {tipoCfg.shortLabel}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${isAnulado ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {isAnulado ? 'Anulado' : 'Activo'}
                  </span>
                  <span className="text-[10px] text-foreground-400 font-mono">{c.folio}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function VitalChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-2 rounded-lg bg-secondary-50 border border-secondary-100">
      <p className="text-2xs text-foreground-500 mb-0.5">{label}</p>
      <p className="text-xs font-semibold text-foreground-800 whitespace-nowrap">{value}</p>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <span className="text-2xs text-foreground-400 uppercase tracking-wider">{label}</span>
      <p className={`text-sm ${highlight ? 'font-semibold text-foreground-900' : 'text-foreground-700'} mt-0.5`}>{value}</p>
    </div>
  );
}