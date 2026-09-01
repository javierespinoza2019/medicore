import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppointmentsState } from '@/hooks/useAppointmentsState';
import { useUrgenciasState } from '@/hooks/useUrgenciasState';
import { getTriagePatientById } from '@/mocks/triage';
import type { NivelUrgencia } from '@/mocks/urgencias';
import type { Appointment } from '@/mocks/appointments';

const today = new Date().toISOString().split('T')[0];

function getNowTime(): Date {
  return new Date();
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

function getMinutesFromMidnight(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function formatWaitTime(arrivedTime: string, now: Date): string {
  const [h, m] = arrivedTime.split(':').map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const arrivedMinutes = h * 60 + m;
  const diff = nowMinutes - arrivedMinutes;
  if (diff < 0) return '0 min';
  if (diff < 1) return 'Ahora';
  if (diff < 60) return `${diff} min`;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hours}h ${mins}m`;
}

const priorityOrder: Record<string, number> = {
  rojo: 0,
  naranja: 1,
  amarillo: 2,
  verde: 3,
};

const urgenciaConfig: Record<NivelUrgencia, { label: string; border: string; color: string; bg: string; text: string }> = {
  rojo: { label: 'Emergencia', border: 'border-red-500', color: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
  naranja: { label: 'Urgencia', border: 'border-orange-500', color: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700' },
  amarillo: { label: 'Preferente', border: 'border-amber-400', color: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' },
  verde: { label: 'No urgente', border: 'border-emerald-500', color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

interface TurnoEntry {
  id: string;
  name: string;
  consultorio: string;
  doctorName: string;
  llegada: string;
  prioridad: number;
  nivelUrgencia: NivelUrgencia | null;
  origen: 'consulta' | 'urgencia';
  minWait: number;
  llamando: boolean;
  llamadoAt?: number;
}

export default function MonitorTurnos() {
  const navigate = useNavigate();
  const { appointments } = useAppointmentsState();
  const { urgencias } = useUrgenciasState();
  const [now, setNow] = useState<Date>(getNowTime());

  useEffect(() => {
    const interval = setInterval(() => setNow(getNowTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  const turnos: TurnoEntry[] = useMemo(() => {
    const entries: TurnoEntry[] = [];

    // Pacientes de consulta en sala de espera
    const waitingApps = appointments.filter(
      (a: Appointment) => a.fecha === today && (a.estado === 'en_espera' || a.estado === 'llego' || a.estado === 'llamando')
    );

    waitingApps.forEach((app: Appointment) => {
      const triagePatient = getTriagePatientById(app.patientId);
      let triageNivel: NivelUrgencia | null = null;

      if (triagePatient && triagePatient.historialTriage && triagePatient.historialTriage.length > 0) {
        const triageHoy = triagePatient.historialTriage.find(t => t.fecha === today);
        if (triageHoy) {
          triageNivel = triageHoy.nivelUrgencia;
        }
      }

      const llegada = app.horaLlegada || app.horaInicio;
      const minWait = Math.max(0, now.getHours() * 60 + now.getMinutes() - getMinutesFromMidnight(llegada));

      entries.push({
        id: app.id,
        name: app.patientName,
        consultorio: app.consultorio,
        doctorName: app.doctorName,
        llegada,
        prioridad: triageNivel ? (priorityOrder[triageNivel] ?? 4) : 4,
        nivelUrgencia: triageNivel,
        origen: 'consulta',
        minWait,
        llamando: app.estado === 'llamando',
        llamadoAt: app.llamadoAt,
      });
    });

    // Pacientes de urgencias esperando
    const waitingUrgencias = urgencias.filter(u => u.estado === 'esperando' && u.fecha === today);

    waitingUrgencias.forEach((u) => {
      const minWait = Math.max(0, now.getHours() * 60 + now.getMinutes() - getMinutesFromMidnight(u.horaLlegada));

      entries.push({
        id: u.id,
        name: u.patientName,
        consultorio: u.areaUrgencia,
        doctorName: u.doctorName || 'Pendiente asignar',
        llegada: u.horaLlegada,
        prioridad: priorityOrder[u.nivelUrgencia] ?? 4,
        nivelUrgencia: u.nivelUrgencia,
        origen: 'urgencia',
        minWait,
        llamando: false,
      });
    });

    // Orden: llamando primero → prioridad (triage) → tiempo de espera
    entries.sort((a, b) => {
      if (a.llamando !== b.llamando) return a.llamando ? -1 : 1;
      if (a.prioridad !== b.prioridad) return a.prioridad - b.prioridad;
      return a.minWait - b.minWait;
    });

    return entries;
  }, [appointments, urgencias, now]);

  const stats = useMemo(() => ({
    total: turnos.length,
    consultas: turnos.filter(t => t.origen === 'consulta').length,
    urgencias: turnos.filter(t => t.origen === 'urgencia').length,
    promedioEspera: turnos.length > 0
      ? Math.round(turnos.reduce((sum, t) => sum + t.minWait, 0) / turnos.length)
      : 0,
  }), [turnos]);

  return (
    <div className="h-screen bg-background-50 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="w-full bg-foreground-900 text-background-50 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 flex items-center justify-center">
            <i className="ri-hospital-line text-3xl text-primary-400"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide font-heading">Clínica Central</h1>
            <p className="text-sm text-foreground-400">Sala de Espera — Turnos en Pantalla</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          {/* Botón discreto a agenda */}
          <button
            type="button"
            aria-label="Ir a Agenda"
            onClick={() => navigate('/app/agenda')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-foreground-800 hover:bg-foreground-700 text-foreground-300 text-sm transition-colors opacity-60 hover:opacity-100"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-calendar-line text-base" aria-hidden="true"></i>
            </div>
            <span className="whitespace-nowrap">Agenda</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
            </span>
            <span className="text-2xl font-mono font-bold tracking-wider text-background-50">{formatClock(now)}</span>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="w-full bg-background-50 border-b border-secondary-200/70 px-6 py-3 flex items-center gap-8 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-foreground-500 uppercase tracking-wide">En sala</span>
          <span className="text-xl font-bold text-foreground-900" aria-live="polite">{stats.total}</span>
        </div>
        <div className="w-px h-7 bg-secondary-200/70 flex-shrink-0"></div>
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-foreground-500 uppercase tracking-wide">Consultas</span>
          <span className="text-xl font-bold text-primary-600">{stats.consultas}</span>
        </div>
        <div className="w-px h-7 bg-secondary-200/70 flex-shrink-0"></div>
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-foreground-500 uppercase tracking-wide">Urgencias</span>
          <span className="text-xl font-bold text-orange-600">{stats.urgencias}</span>
        </div>
        <div className="w-px h-7 bg-secondary-200/70 flex-shrink-0"></div>
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-foreground-500 uppercase tracking-wide">Promedio espera</span>
          <span className="text-xl font-bold text-foreground-700">{stats.promedioEspera} min</span>
        </div>
      </div>

      {/* ── Main Content: Turnos + Publicidad ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Columna Izquierda: Turnos ── */}
        <div className="flex-1 flex flex-col px-6 py-4 overflow-hidden">
          {turnos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-24 h-24 mb-6 flex items-center justify-center rounded-full bg-emerald-50">
                <i className="ri-check-double-line text-5xl text-emerald-400"></i>
              </div>
              <p className="text-2xl font-bold text-foreground-700">No hay pacientes en espera</p>
              <p className="text-lg text-foreground-400 mt-2">Todos los pacientes han sido atendidos</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4">
              {turnos.slice(0, 4).map((turno, idx) => {
                const config = turno.nivelUrgencia ? urgenciaConfig[turno.nivelUrgencia] : null;
                const borderColor = turno.llamando ? 'border-accent-500' : (config ? config.border : 'border-secondary-300');
                const dotColor = config ? config.color : 'bg-secondary-400';
                const badgeBg = turno.llamando ? 'bg-accent-100' : (config ? config.bg : 'bg-secondary-100');
                const badgeText = turno.llamando ? 'text-accent-800' : (config ? config.text : 'text-foreground-700');
                const badgeLabel = turno.llamando ? 'LLAMANDO' : (config ? config.label : 'Sin triage');
                const waitLabel = formatWaitTime(turno.llegada, now);

                return (
                  <div
                    key={turno.id}
                    className={`flex items-center gap-6 px-6 py-5 bg-background-50 rounded-2xl border-l-6 ${borderColor} shadow-sm transition-all duration-300 flex-1 ${turno.llamando ? 'animate-pulse ring-2 ring-accent-300' : ''}`}
                    style={{ minHeight: '0' }}
                  >
                    {/* Turno Number */}
                    <div className={`flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-full ${turno.llamando ? 'bg-accent-500 border-2 border-accent-300' : 'bg-background-50 border-2 border-secondary-200'}`}>
                      <span className={`text-2xl font-bold ${turno.llamando ? 'text-white' : 'text-foreground-500'}`}>{idx + 1}</span>
                    </div>

                    {/* Patient Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <p className={`text-2xl font-bold truncate leading-tight ${turno.llamando ? 'text-accent-700' : 'text-foreground-900'}`}>{turno.name}</p>
                        {turno.origen === 'urgencia' && (
                          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-orange-500 rounded-full bg-orange-50" title="Urgencias">
                            <i className="ri-alert-fill text-xl"></i>
                          </div>
                        )}
                        {turno.llamando && (
                          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-accent-500 rounded-full bg-accent-100 animate-bounce" title="Llamando a consulta">
                            <i className="ri-volume-up-fill text-xl"></i>
                          </div>
                        )}
                      </div>
                      <p className="text-lg text-foreground-500 truncate mt-1">
                        {turno.doctorName}
                        {turno.origen === 'consulta' && <span> · {turno.consultorio}</span>}
                      </p>
                      {turno.llamando && (
                        <p className="text-base font-bold text-accent-600 mt-1">
                          <i className="ri-arrow-right-line"></i> Pasar a {turno.consultorio}
                        </p>
                      )}
                    </div>

                    {/* Priority Badge */}
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${badgeBg} ${badgeText}`}>
                        <span className={`w-3 h-3 rounded-full ${dotColor}`}></span>
                        {badgeLabel}
                      </span>
                    </div>

                    {/* Wait Time */}
                    <div className="flex-shrink-0 text-right min-w-[100px]">
                      <span className="text-base text-foreground-400 block">Espera</span>
                      <span className={`text-2xl font-mono font-bold ${turno.llamando ? 'text-accent-600' : 'text-foreground-800'}`}>
                        {waitLabel}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Si hay más de 4, muestra un indicador */}
              {turnos.length > 4 && (
                <div className="text-center py-2">
                  <span className="text-base text-foreground-400 font-medium">
                    +{turnos.length - 4} pacientes adicionales en espera
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Footer ── */}
          <div className="mt-4 flex items-center justify-between text-sm text-foreground-400 flex-shrink-0">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-accent-500 animate-pulse"></span>Llamando
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>Emergencia
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500"></span>Urgencia
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>Preferente
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>No urgente
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-secondary-400"></span>Sin triage
              </span>
            </div>
            <span>
              Actualizado: {formatClock(now)}
            </span>
          </div>
        </div>

        {/* ── Columna Derecha: Publicidad ── */}
        <div className="w-[420px] flex-shrink-0 border-l border-secondary-200/70 bg-background-50 flex flex-col overflow-y-auto">
          {/* Promo 1: Consulta de Control */}
          <div className="p-5 flex-shrink-0">
            <div className="relative rounded-2xl overflow-hidden bg-primary-100">
              <img
                src="https://readdy.ai/api/search-image?query=Happy%20hispanic%20family%20at%20modern%20medical%20clinic%20consultation%2C%20bright%20warm%20lighting%2C%20clean%20white%20interior%2C%20doctor%20checking%20child%20patient%2C%20soft%20professional%20healthcare%20atmosphere%2C%20warm%20neutral%20tones%2C%20editorial%20photography%20style&width=420&height=300&seq=monitor-promo-1&orientation=landscape"
                alt="Consulta de control"
                className="w-full h-52 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary-900/80 via-primary-900/20 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <span className="inline-block px-3 py-1 rounded-full bg-accent-500 text-white text-sm font-bold mb-2">PROMOCIÓN</span>
                <h3 className="text-white text-lg font-bold leading-tight">Consulta de Control Familiar</h3>
                <p className="text-white/80 text-sm mt-1">Incluye examen físico completo y plan nutricional</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <span className="text-foreground-400 text-sm line-through">$350</span>
                <span className="text-primary-700 text-2xl font-bold ml-2">$250</span>
              </div>
              <span className="text-sm text-foreground-500">Agenda hoy · Módulo Agenda</span>
            </div>
          </div>

          <div className="border-t border-secondary-200/70 mx-5"></div>

          {/* Promo 2: Check-up Preventivo */}
          <div className="p-5 flex-shrink-0">
            <div className="relative rounded-2xl overflow-hidden bg-accent-100">
              <img
                src="https://readdy.ai/api/search-image?query=Professional%20senior%20woman%20receiving%20cheerful%20health%20checkup%20at%20bright%20modern%20clinic%2C%20doctor%20with%20stethoscope%20smiling%2C%20clean%20minimal%20medical%20office%2C%20warm%20natural%20lighting%2C%20peaceful%20healthcare%20environment%2C%20editorial%20style&width=420&height=300&seq=monitor-promo-2&orientation=landscape"
                alt="Check-up preventivo"
                className="w-full h-52 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-accent-900/80 via-accent-900/20 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <span className="inline-block px-3 py-1 rounded-full bg-primary-500 text-white text-sm font-bold mb-2">NUEVO</span>
                <h3 className="text-white text-lg font-bold leading-tight">Check-up Preventivo Anual</h3>
                <p className="text-white/80 text-sm mt-1">Perfil de laboratorio + electro + consulta</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <span className="text-foreground-400 text-sm line-through">$950</span>
                <span className="text-accent-700 text-2xl font-bold ml-2">$599</span>
              </div>
              <span className="text-sm text-foreground-500">Pregunta en recepción</span>
            </div>
          </div>

          <div className="border-t border-secondary-200/70 mx-5"></div>

          {/* Promo 3: Servicio 24/7 */}
          <div className="p-5 flex-shrink-0">
            <div className="rounded-2xl overflow-hidden bg-secondary-100 p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 flex items-center justify-center rounded-full bg-foreground-900 text-background-50">
                  <i className="ri-time-line text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground-900">Servicio 24/7</h3>
                  <p className="text-sm text-foreground-500">Emergencias y urgencias</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-background-50 p-3 text-center">
                  <i className="ri-stethoscope-line text-2xl text-primary-500"></i>
                  <p className="text-sm font-bold text-foreground-900 mt-1">Medicina General</p>
                </div>
                <div className="rounded-xl bg-background-50 p-3 text-center">
                  <i className="ri-flask-line text-2xl text-accent-500"></i>
                  <p className="text-sm font-bold text-foreground-900 mt-1">Laboratorio</p>
                </div>
                <div className="rounded-xl bg-background-50 p-3 text-center">
                  <i className="ri-heart-pulse-line text-2xl text-orange-500"></i>
                  <p className="text-sm font-bold text-foreground-900 mt-1">Cardiología</p>
                </div>
                <div className="rounded-xl bg-background-50 p-3 text-center">
                  <i className="ri-capsule-line text-2xl text-emerald-500"></i>
                  <p className="text-sm font-bold text-foreground-900 mt-1">Farmacia</p>
                </div>
              </div>
              <p className="text-center text-sm text-foreground-500 mt-4">Disponibles todos los días del año</p>
            </div>
          </div>

          {/* Footer de publicidad */}
          <div className="mt-auto p-5 border-t border-secondary-200/70">
            <p className="text-center text-sm text-foreground-400">
              Clínica Central · Consultas: (55) 1234-5678
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}