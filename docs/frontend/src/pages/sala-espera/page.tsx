import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointments as mockAppointments, statusConfig, type Appointment } from '@/mocks/appointments';
import { getPatientById } from '@/mocks/patients';
import { getTriagePatientById } from '@/mocks/triage';
import { addUrgenciaGlobal } from '@/hooks/useUrgenciasState';
import { useAppointmentsState } from '@/hooks/useAppointmentsState';
import type { Urgencia } from '@/mocks/urgencias';
import { doctors } from '@/mocks/doctors';
import Avatar from '@/components/base/Avatar';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import Modal from '@/components/base/Modal';

const today = new Date().toISOString().split('T')[0];

function getNowTime(): Date {
  return new Date();
}

function getMinutesFromMidnight(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function formatWaitTime(arrivedTime: string, now: Date): { minutes: number; label: string } {
  const [h, m] = arrivedTime.split(':').map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const arrivedMinutes = h * 60 + m;
  const diff = nowMinutes - arrivedMinutes;
  if (diff < 0) return { minutes: 0, label: 'Recién llegado' };
  if (diff < 1) return { minutes: 0, label: 'Recién llegado' };
  if (diff < 60) return { minutes: diff, label: `${diff} min` };
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return { minutes: diff, label: `${hours}h ${mins}m` };
}

function getWaitColor(minutes: number): string {
  if (minutes < 10) return 'text-emerald-600';
  if (minutes < 20) return 'text-amber-600';
  return 'text-red-600';
}

function getWaitBg(minutes: number): string {
  if (minutes < 10) return 'bg-emerald-50';
  if (minutes < 20) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}

function formatTimeNow(now: Date): string {
  return now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

type UndoAction = {
  id: string;
  prevEstado: Appointment['estado'];
  label: string;
} | null;

export default function SalaEspera() {
  const navigate = useNavigate();
  const { appointments, updateAppointment: updateAppointmentShared } = useAppointmentsState();
  const todayApps = useMemo(() => appointments.filter(a => a.fecha === today), [appointments]);
  const [now, setNow] = useState<Date>(getNowTime());
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [undoAction, setUndoAction] = useState<UndoAction>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(getNowTime()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-clear undo after 5 seconds
  useEffect(() => {
    if (!undoAction) return;
    const timer = setTimeout(() => setUndoAction(null), 5000);
    return () => clearTimeout(timer);
  }, [undoAction]);

  // Auto-clear feedback after 2 seconds
  useEffect(() => {
    if (!actionFeedback) return;
    const timer = setTimeout(() => setActionFeedback(null), 2000);
    return () => clearTimeout(timer);
  }, [actionFeedback]);

  // Auto-promote "llamando" → "en_consulta" after 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const calling = todayApps.filter(a => a.estado === 'llamando' && a.llamadoAt);
      calling.forEach(app => {
        const elapsed = Date.now() - (app.llamadoAt || 0);
        if (elapsed > 30000) {
          updateAppointmentShared(app.id, { estado: 'en_consulta', llamadoAt: undefined });
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [todayApps, updateAppointmentShared]);

  const executeWithUndo = useCallback((app: Appointment, newEstado: Appointment['estado'], label: string, extra?: Partial<Appointment>) => {
    const prevEstado = app.estado;
    setUndoAction({ id: app.id, prevEstado, label });
    const updates: Partial<Appointment> = { estado: newEstado, ...extra };
    if (newEstado === 'llego' && !app.horaLlegada) {
      updates.horaLlegada = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    updateAppointmentShared(app.id, updates);
    setActionFeedback(label);
  }, [now, updateAppointmentShared]);

  const handleUndo = useCallback(() => {
    if (!undoAction) return;
    updateAppointmentShared(undoAction.id, { estado: undoAction.prevEstado });
    setUndoAction(null);
  }, [undoAction, updateAppointmentShared]);

  const waitingPatients = useMemo(() =>
    todayApps.filter(a => a.estado === 'en_espera' || a.estado === 'llego')
      .sort((a, b) => {
        if (!a.horaLlegada || !b.horaLlegada) return 0;
        return getMinutesFromMidnight(a.horaLlegada) - getMinutesFromMidnight(b.horaLlegada);
      }),
    [todayApps]
  );

  const inTriage = useMemo(() =>
    todayApps.filter(a => a.estado === 'en_triage'),
    [todayApps]
  );

  const inConsultation = useMemo(() =>
    todayApps.filter(a => a.estado === 'en_consulta'),
    [todayApps]
  );

  const llamandoPatients = useMemo(() =>
    todayApps.filter(a => a.estado === 'llamando')
      .sort((a, b) => (a.llamadoAt || 0) - (b.llamadoAt || 0)),
    [todayApps]
  );

  const fullQueue = useMemo(() =>
    [...todayApps].sort((a, b) => getMinutesFromMidnight(a.horaInicio) - getMinutesFromMidnight(b.horaInicio)),
    [todayApps]
  );

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const stats = useMemo(() => ({
    enSala: waitingPatients.length + llamandoPatients.length,
    esperando: todayApps.filter(a => a.estado === 'en_espera').length,
    llegaron: todayApps.filter(a => a.estado === 'llego').length,
    enConsulta: inConsultation.length,
    enTriage: inTriage.length,
    llamando: llamandoPatients.length,
    confirmadas: todayApps.filter(a => a.estado === 'confirmada').length,
    atendidas: todayApps.filter(a => a.estado === 'atendida').length,
    promedioEspera: (() => {
      const waiting = waitingPatients.filter(p => p.horaLlegada);
      if (waiting.length === 0) return 0;
      const total = waiting.reduce((sum, p) => {
        return sum + Math.max(0, nowMinutes - getMinutesFromMidnight(p.horaLlegada!));
      }, 0);
      return Math.round(total / waiting.length);
    })(),
  }), [waitingPatients, inConsultation, inTriage, llamandoPatients, todayApps, nowMinutes]);

  const handleOpenExpediente = useCallback((patientId: string) => {
    navigate(`/app/pacientes/${patientId}`);
  }, [navigate]);

  const handleDerivarUrgencias = useCallback((app: Appointment) => {
    const patient = getPatientById(app.patientId);
    const triagePatient = getTriagePatientById(app.patientId);
    const triage = triagePatient?.ultimoTriage || null;

    const now = new Date();
    const idNum = Math.floor(Math.random() * 900) + 100;

    const nuevaUrgencia: Urgencia = {
      id: `urg-der-${idNum}`,
      patientId: app.patientId,
      patientName: app.patientName,
      patientExpediente: patient?.expediente || app.patientId,
      fecha: now.toISOString().split('T')[0],
      horaLlegada: now.toTimeString().slice(0, 5),
      nivelUrgencia: triage?.nivelUrgencia || 'amarillo',
      estado: 'esperando',
      motivo: triage?.notas || app.motivo,
      areaUrgencia: triage?.nivelUrgencia === 'rojo' ? 'Shock Room' : 'Área de Urgencias',
      signosVitales: triage,
      notaMedica: '',
      destinoAlta: null,
      contactoEmergencia: patient?.contactoEmergencia || 'No registrado',
      genero: patient?.sexo || 'M',
      edad: patient?.edad || 0,
      viaAcceso: 'caminando',
    };

    addUrgenciaGlobal(nuevaUrgencia);
    updateAppointmentShared(app.id, { estado: 'atendida' });
    setActionFeedback(`${app.patientName} derivado a urgencias`);
    navigate('/app/urgencias');
  }, [updateAppointmentShared, navigate]);

  const statusDot = (estado: Appointment['estado']) => {
    const map: Record<string, string> = {
      atendida: 'bg-emerald-400',
      en_consulta: 'bg-accent-500',
      llamando: 'bg-accent-500',
      en_triage: 'bg-sky-400',
      en_espera: 'bg-amber-400',
      llego: 'bg-emerald-500',
      confirmada: 'bg-sky-400',
      reservada: 'bg-primary-400',
      cancelada: 'bg-red-400',
      no_acudio: 'bg-red-500',
      disponible: 'bg-secondary-300',
    };
    return map[estado] || 'bg-secondary-300';
  };

  return (
    <div className="space-y-5">
      {/* ── Undo Banner ── */}
      {undoAction && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 flex items-center justify-center text-amber-600">
              <i className="ri-information-line text-sm"></i>
            </span>
            <p className="text-sm text-amber-800">
              <strong>{undoAction.label}</strong> —{' '}
              <button onClick={handleUndo} className="font-semibold underline cursor-pointer hover:text-amber-900 transition-colors">
                Deshacer
              </button>
            </p>
          </div>
          <button onClick={() => setUndoAction(null)} className="w-6 h-6 flex items-center justify-center text-amber-400 hover:text-amber-600 cursor-pointer transition-colors">
            <i className="ri-close-line"></i>
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-foreground-500">{new Date(today).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-mono font-medium text-foreground-600">{formatTimeNow(now)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/agenda')}>
            <i className="ri-calendar-line"></i> Agenda
          </Button>
        </div>
      </div>

      {/* ── Stats Ribbon ── */}
      <div className="flex items-center gap-3 sm:gap-6 px-4 py-3 bg-background-50 border border-secondary-200/70 rounded-xl overflow-x-auto">
        <StatItem icon="ri-group-line" label="En sala" value={stats.enSala} color="text-foreground-900" />
        <div className="w-px h-7 bg-secondary-200/70 flex-shrink-0"></div>
        <StatItem icon="ri-time-line" label="Esperando" value={stats.esperando} color="text-amber-600" />
        <div className="w-px h-7 bg-secondary-200/70 flex-shrink-0"></div>
        <StatItem icon="ri-user-star-line" label="Llegaron" value={stats.llegaron} color="text-emerald-600" />
        <div className="w-px h-7 bg-secondary-200/70 flex-shrink-0"></div>
        <StatItem icon="ri-stethoscope-line" label="En consulta" value={stats.enConsulta} color="text-accent-600" />
        <div className="w-px h-7 bg-secondary-200/70 flex-shrink-0"></div>
        <StatItem icon="ri-heart-pulse-line" label="En triage" value={stats.enTriage} color="text-sky-600" />
        <div className="w-px h-7 bg-secondary-200/70 flex-shrink-0"></div>
        <StatItem icon="ri-volume-up-line" label="Llamando" value={stats.llamando} color="text-accent-600" />
        <div className="w-px h-7 bg-secondary-200/70 flex-shrink-0"></div>
        <StatItem icon="ri-timer-line" label="Promedio espera" value={`${stats.promedioEspera}m`} color="text-foreground-600" />
        <div className="w-px h-7 bg-secondary-200/70 flex-shrink-0"></div>
        <StatItem icon="ri-calendar-check-line" label="Confirmadas" value={stats.confirmadas} color="text-sky-600" />
      </div>

      {/* ── Main Content: Two Columns ── */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left Panel — Waiting + In Consultation */}
        <div className="w-full lg:w-[58%] space-y-5">
          {/* Llamando a consulta — ALERTA VIVA */}
          {llamandoPatients.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground-900 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-500"></span>
                  </span>
                  Llamando a consulta
                  <span className="text-xs font-normal text-foreground-400">({llamandoPatients.length})</span>
                </h2>
              </div>
              <div className="space-y-2">
                {llamandoPatients.map((app, idx) => {
                  const elapsed = Math.floor((Date.now() - (app.llamadoAt || 0)) / 1000);
                  const remaining = Math.max(0, 30 - elapsed);
                  return (
                    <div
                      key={app.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-accent-400 bg-accent-50/40 animate-pulse"
                    >
                      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-accent-500 text-white text-sm font-bold flex-shrink-0">
                        {idx + 1}
                      </span>
                      <Avatar name={app.patientName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground-900">{app.patientName}</p>
                        <p className="text-xs text-foreground-500">{app.doctorName} · {app.consultorio}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="text-xs text-foreground-400 block">Pasando en</span>
                        <span className="text-sm font-mono font-bold text-accent-600">{remaining}s</span>
                      </div>
                      <Badge variant="accent" size="sm">
                        <span className="flex items-center gap-1">
                          <i className="ri-volume-up-line text-xs"></i> Llamando
                        </span>
                      </Badge>
                      <Button
                        variant="accent"
                        size="xs"
                        onClick={() => updateAppointmentShared(app.id, { estado: 'en_consulta', llamadoAt: undefined })}
                      >
                        <i className="ri-stethoscope-line"></i> Ir ahora
                      </Button>
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-600 hover:bg-secondary-100 transition-colors cursor-pointer"
                        onClick={() => handleOpenExpediente(app.patientId)}
                        title="Abrir expediente"
                      >
                        <i className="ri-folder-open-line text-sm"></i>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Waiting Patients */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground-900 flex items-center gap-2">
                <i className="ri-hourglass-line text-amber-500"></i>
                Pacientes en Sala
                <span className="text-xs font-normal text-foreground-400">({waitingPatients.length})</span>
              </h2>
            </div>

            {waitingPatients.length === 0 ? (
              <div className="py-10 text-center bg-background-50 border border-secondary-200/70 rounded-xl">
                <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center text-foreground-300">
                  <i className="ri-check-double-line text-3xl"></i>
                </div>
                <p className="text-sm font-medium text-foreground-500">No hay pacientes en sala</p>
                <p className="text-xs text-foreground-400 mt-1">Todos los pacientes han sido atendidos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {waitingPatients.map((app, idx) => {
                  const patient = getPatientById(app.patientId);
                  const triagePatient = getTriagePatientById(app.patientId);
                  const hasTriage = triagePatient && triagePatient.historialTriage && triagePatient.historialTriage.length > 0;
                  const triageHoy = hasTriage && triagePatient.historialTriage.some(t => t.fecha === today);
                  const triageUrgenciaNivel = triageHoy && triagePatient
                    ? triagePatient.historialTriage.find(t => t.fecha === today)?.nivelUrgencia
                    : null;
                  const esDerivable = triageUrgenciaNivel === 'rojo' || triageUrgenciaNivel === 'naranja';
                  const wait = app.horaLlegada ? formatWaitTime(app.horaLlegada, now) : { minutes: 0, label: '—' };

                  return (
                    <div
                      key={app.id}
                      className={`flex flex-col gap-2.5 px-4 py-3 rounded-xl border transition-all duration-200 ${
                        actionFeedback?.includes(app.patientName) ? 'ring-2 ring-primary-300 scale-[1.01]' : ''
                      } ${app.estado === 'llego' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}
                    >
                      {/* ── Row 1: Identity, Wait, Status ── */}
                      <div className="flex items-center gap-3">
                        {/* Position */}
                        <span className="w-7 h-7 flex items-center justify-center rounded-full bg-background-50 border border-secondary-200/70 text-xs font-bold text-foreground-400 flex-shrink-0">
                          {idx + 1}
                        </span>

                        {/* Avatar */}
                        <Avatar name={app.patientName} size="sm" />

                        {/* Name + Triage Badge */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground-900 truncate">{app.patientName}</p>
                            {patient?.alertas && patient.alertas.length > 0 && (
                              <span className="w-4 h-4 flex items-center justify-center text-red-500 flex-shrink-0" title={patient.alertas.join(', ')}>
                                <i className="ri-alert-fill text-xs"></i>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Wait Time */}
                        <div className={`flex-shrink-0 px-2.5 py-1 rounded-md ${getWaitBg(wait.minutes)}`}>
                          <span className={`text-xs font-mono font-bold ${getWaitColor(wait.minutes)}`}>{wait.label}</span>
                        </div>

                        {/* Status Badge */}
                        <Badge variant={app.estado === 'llego' ? 'success' : 'warning'} size="sm">
                          {statusConfig[app.estado].label}
                        </Badge>
                      </div>

                      {/* ── Row 2: Doctor info + Triage indicator + Actions ── */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                        {/* Left: Doctor info + Triage badge */}
                        <div className="flex items-center gap-2 flex-1 min-w-0 text-xs text-foreground-500">
                          {hasTriage && (
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium cursor-default flex-shrink-0 ${
                                triageHoy
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-secondary-100 text-foreground-500 border border-secondary-200'
                              }`}
                              title={triageHoy ? 'Triage realizado hoy. Listo para consulta.' : `Último triage: ${triagePatient.historialTriage[triagePatient.historialTriage.length - 1].fecha}`}
                            >
                              <i className={`${triageHoy ? 'ri-check-double-line text-emerald-500' : 'ri-check-line text-foreground-400'} text-xs`}></i>
                              Triage{triageHoy ? ' hoy' : ''}
                            </span>
                          )}
                          {!hasTriage && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium bg-amber-50 text-amber-600 border border-amber-200 cursor-default flex-shrink-0"
                              title="Pendiente de triage"
                            >
                              <i className="ri-time-line text-amber-400 text-xs"></i>
                              Pendiente
                            </span>
                          )}
                          <span className="truncate">{app.doctorName}</span>
                          <span className="flex-shrink-0">·</span>
                          <span className="truncate">{app.consultorio}</span>
                          <span className="flex-shrink-0">·</span>
                          <span className="flex-shrink-0">{app.horaInicio} – {app.horaFin}</span>
                        </div>

                        {/* Right: Action Buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
                          {app.estado === 'llego' && (
                            <Button variant="secondary" size="xs" onClick={() => executeWithUndo(app, 'en_espera', `${app.patientName} movido a sala de espera`)}>
                              A sala
                            </Button>
                          )}
                          {!triageHoy && (
                            <Button
                              variant={!hasTriage ? 'primary' : 'info'}
                              size="xs"
                              onClick={() => {
                                executeWithUndo(app, 'en_triage', `${app.patientName} enviado a triage`);
                                navigate(`/app/triage?paciente=${app.patientId}`);
                              }}
                            >
                              <i className="ri-heart-pulse-line"></i> Triage
                            </Button>
                          )}
                          {esDerivable && (
                            <Button
                              variant={triageUrgenciaNivel === 'rojo' ? 'danger' : 'warning'}
                              size="xs"
                              onClick={() => handleDerivarUrgencias(app)}
                            >
                              <i className="ri-first-aid-kit-line"></i> Derivar a Urgencias
                            </Button>
                          )}
                          <Button
                            variant={triageHoy ? 'primary' : 'accent'}
                            size="xs"
                            onClick={() => {
                              if (triageHoy && triagePatient) {
                                const triajeHoyRecord = triagePatient.historialTriage.find(t => t.fecha === today);
                                navigate(`/app/consultas?paciente=${app.patientId}&triage=${triajeHoyRecord?.id}`);
                              } else {
                                executeWithUndo(app, 'llamando', `${app.patientName} llamando a consulta`, { llamadoAt: Date.now() });
                              }
                            }}
                          >
                            <i className="ri-stethoscope-line"></i>
                            {triageHoy ? 'Consulta' : 'Llamar'}
                          </Button>
                          <button
                            type="button"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-600 hover:bg-secondary-100 transition-colors cursor-pointer"
                            onClick={() => handleOpenExpediente(app.patientId)}
                            aria-label={`Abrir expediente de ${app.patientName}`}
                          >
                            <i className="ri-folder-open-line text-sm" aria-hidden="true"></i>
                          </button>
                          <button
                            type="button"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            onClick={() => setCancelTarget(app)}
                            aria-label={`Cancelar cita de ${app.patientName}`}
                          >
                            <i className="ri-close-line text-sm" aria-hidden="true"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* In Triage */}
          {inTriage.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-foreground-900 flex items-center gap-2">
                  <i className="ri-heart-pulse-fill text-sky-500"></i>
                  En Triage
                </h2>
              </div>

              <div className="space-y-2">
                {inTriage.map(app => {
                  const wait = app.horaLlegada ? formatWaitTime(app.horaLlegada, now) : { minutes: 0, label: '—' };
                  return (
                    <div
                      key={app.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 bg-sky-50/30 border-sky-200/60"
                    >
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse flex-shrink-0"></span>
                      <Avatar name={app.patientName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground-900">{app.patientName}</p>
                        <p className="text-xs text-foreground-500">{app.doctorName} · {app.consultorio} · {app.horaInicio} – {app.horaFin}</p>
                      </div>
                      <span className="text-xs text-foreground-400">Triage {app.horaLlegada || ''}</span>
                      <Badge variant="info" size="sm">En triage</Badge>
                      <Button
                        variant="info"
                        size="xs"
                        onClick={() => navigate(`/app/triage?paciente=${app.patientId}`)}
                      >
                        <i className="ri-heart-pulse-line"></i> Ir a triage
                      </Button>
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-600 hover:bg-secondary-100 transition-colors cursor-pointer"
                        onClick={() => handleOpenExpediente(app.patientId)}
                        title="Abrir expediente"
                      >
                        <i className="ri-folder-open-line text-sm"></i>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* In Consultation */}
          {inConsultation.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-foreground-900 flex items-center gap-2">
                  <i className="ri-stethoscope-fill text-accent-500"></i>
                  En Consulta
                </h2>
              </div>

              <div className="space-y-2">
                {inConsultation.map(app => {
                  const wait = app.horaLlegada ? formatWaitTime(app.horaLlegada, now) : { minutes: 0, label: '—' };
                  return (
                    <div
                      key={app.id}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
                        actionFeedback?.includes(app.patientName) ? 'ring-2 ring-emerald-300 scale-[1.01]' : ''
                      } bg-accent-50/30 border-accent-200/60`}
                    >
                      <span className="w-2 h-2 rounded-full bg-accent-500 flex-shrink-0"></span>
                      <Avatar name={app.patientName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground-900">{app.patientName}</p>
                        <p className="text-xs text-foreground-500">{app.doctorName} · {app.consultorio} · {app.horaInicio} – {app.horaFin}</p>
                      </div>
                      <span className="text-xs text-foreground-400">Inició {wait.label}</span>
                      <Badge variant="accent" size="sm">En consulta</Badge>
                      <Button
                        variant="accent"
                        size="xs"
                        onClick={() => navigate(`/app/consultas?paciente=${app.patientId}`)}
                      >
                        <i className="ri-stethoscope-line"></i> Ir a consulta
                      </Button>
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-600 hover:bg-secondary-100 transition-colors cursor-pointer"
                        onClick={() => handleOpenExpediente(app.patientId)}
                        title="Abrir expediente"
                      >
                        <i className="ri-folder-open-line text-sm"></i>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel — Day Queue Timeline */}
        <div className="w-full lg:w-[42%]">
          <div className="sticky top-20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground-900 flex items-center gap-2">
                <i className="ri-list-check-2 text-foreground-500"></i>
                Cola del Día
              </h2>
              <span className="text-xs text-foreground-400">{fullQueue.length} citas</span>
            </div>

            <div className="bg-background-50 border border-secondary-200/70 rounded-xl overflow-hidden max-h-[calc(100vh-320px)] overflow-y-auto">
              <div className="divide-y divide-secondary-100/60">
                {fullQueue.map((app) => {
                  const isActive = app.estado === 'en_consulta' || app.estado === 'en_espera' || app.estado === 'en_triage' || app.estado === 'llego' || app.estado === 'llamando';
                  const isPast = nowMinutes > getMinutesFromMidnight(app.horaFin) && app.estado !== 'en_consulta';
                  const isCancelled = app.estado === 'cancelada' || app.estado === 'no_acudio';
                  const config = statusConfig[app.estado];

                  return (
                    <div
                      key={app.id}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors group ${
                        isActive ? 'bg-accent-50/50' :
                        isCancelled ? 'bg-red-500/10' :
                        isPast ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Time */}
                      <span className="w-14 flex-shrink-0 text-xs font-mono font-semibold text-foreground-500">
                        {app.horaInicio}
                      </span>

                      {/* Status Dot */}
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(app.estado)} ${app.estado === 'en_consulta' || app.estado === 'llamando' ? 'animate-pulse' : ''}`}></span>

                      {/* Patient / State */}
                      <div className="flex-1 min-w-0">
                        {app.estado === 'disponible' ? (
                          <span className="text-xs text-foreground-400 italic">Disponible</span>
                        ) : (
                          <>
                            <p className={`text-xs font-medium truncate ${isCancelled ? 'text-red-500 line-through' : 'text-foreground-900'}`}>
                              {app.patientName}
                            </p>
                            <p className="text-2xs text-foreground-400 truncate">{app.doctorName.split(' ').slice(0, 2).join(' ')} · {app.consultorio}</p>
                          </>
                        )}
                      </div>

                      {/* Status Badge or Quick Action */}
                      {app.estado === 'confirmada' ? (
                        <Button
                          variant="success"
                          size="xs"
                          onClick={() => executeWithUndo(app, 'llego', `${app.patientName} marcado como llegado`)}
                        >
                          Llegó
                        </Button>
                      ) : isCancelled ? (
                        <Badge variant="danger" size="sm">{config.label}</Badge>
                      ) : isPast ? null : (
                        <Badge variant={config.variant === 'info' ? 'info' : config.variant === 'accent' ? 'accent' : config.variant === 'primary' ? 'primary' : 'secondary'} size="sm">
                          {config.label}
                        </Badge>
                      )}

                      {/* Hover: quick go to patient */}
                      {app.patientId && (
                        <button
                          onClick={() => handleOpenExpediente(app.patientId)}
                          className="w-6 h-6 flex items-center justify-center rounded-md text-foreground-300 hover:text-foreground-600 hover:bg-secondary-100 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 flex-shrink-0"
                          title="Ver expediente"
                        >
                          <i className="ri-external-link-line text-xs"></i>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"></span>
                <span className="text-2xs text-foreground-400">En espera</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent-500 flex-shrink-0"></span>
                <span className="text-2xs text-foreground-400">Llamando</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0"></span>
                <span className="text-2xs text-foreground-400">En triage</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent-500 flex-shrink-0"></span>
                <span className="text-2xs text-foreground-400">En consulta</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"></span>
                <span className="text-2xs text-foreground-400">Atendida</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0"></span>
                <span className="text-2xs text-foreground-400">Cancelada</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cancel Modal (only for destructive action) ── */}
      <Modal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        title="Cancelar cita"
        size="sm"
        role="alertdialog"
        ariaDescribedBy="cancelar-cita-desc"
      >
        {cancelTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-secondary-50 rounded-lg">
              <Avatar name={cancelTarget.patientName} size="md" />
              <div>
                <p className="text-sm font-semibold text-foreground-900">{cancelTarget.patientName}</p>
                <p className="text-xs text-foreground-500">
                  {cancelTarget.doctorName} · {cancelTarget.horaInicio} – {cancelTarget.horaFin}
                </p>
              </div>
            </div>
            <p id="cancelar-cita-desc" className="text-sm text-foreground-600">
              ¿Estás seguro de cancelar esta cita? Esta acción no se puede deshacer.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="sm"
                type="button"
                aria-label="Cancelar cita"
                onClick={() => {
                  updateAppointmentShared(cancelTarget.id, { estado: 'cancelada' });
                  setCancelTarget(null);
                }}
              >
                <i className="ri-close-line" aria-hidden="true"></i> Cancelar cita
              </Button>
              <Button
                variant="warning"
                size="sm"
                type="button"
                aria-label="Marcar como no acudió"
                onClick={() => {
                  updateAppointmentShared(cancelTarget.id, { estado: 'no_acudio' });
                  setCancelTarget(null);
                }}
              >
                <i className="ri-user-unfollow-line" aria-hidden="true"></i> No acudió
              </Button>
            </div>
            <div className="flex justify-end pt-2 border-t border-secondary-200">
              <Button variant="ghost" size="sm" type="button" onClick={() => setCancelTarget(null)}>
                Volver
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatItem({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <div className={`w-7 h-7 flex items-center justify-center ${color}`}>
        <i className={`${icon} text-lg`}></i>
      </div>
      <div>
        <p className="text-2xs text-foreground-400 uppercase tracking-wide">{label}</p>
        <p className={`text-sm font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}