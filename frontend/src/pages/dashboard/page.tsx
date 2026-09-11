/**
 * Panel operativo — KPIs de cola y agenda desde API real (M4/M9/M10).
 * Sin mocks clínicos ni tendencias inventadas. Agregados BI/finanzas: pendiente de API.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  encounterDisplayName,
  estadoConfig,
  type EncounterDto,
} from '@/api/encounters';
import {
  appointmentStateLabels,
  listAppointments,
  type AppointmentDto,
} from '@/api/appointments';
import { getEffectiveTriageScale, type TriageScaleConfigDto } from '@/api/triage';
import { useEncounterQueue } from '@/hooks/useEncounterQueue';
import { computeConsultQueueStats } from '@/utils/consultPresentation';
import {
  accentForEncounter,
  computeQueueStats,
  formatArrivalLocal,
  formatWaitLabel,
  levelIcon,
  triageBadgeLabel,
  waitMinutesSince,
} from '@/utils/encounterQueuePresentation';
import Badge from '@/components/base/Badge';
import Card from '@/components/base/Card';
import QueueLiveBanner from '@/components/feature/QueueLiveBanner';

function dayBoundsUtc(now: Date): { from: string; to: string } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

function appointmentDisplayName(a: AppointmentDto): string {
  if (a.subjectDisplayLabel?.trim()) return a.subjectDisplayLabel.trim();
  const parts = [
    a.subjectPreferredName,
    a.subjectGivenName,
    a.subjectFirstSurname,
    a.subjectSecondSurname,
  ].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return a.subjectOperationalLabel?.trim() || 'Sin asignar';
}

function formatAppointmentTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

const appointmentBadge: Record<string, 'success' | 'warning' | 'primary' | 'danger' | 'secondary' | 'info'> = {
  confirmada: 'success',
  agendada: 'secondary',
  atendida: 'success',
  cancelada: 'danger',
  no_asistio: 'danger',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const [scale, setScale] = useState<TriageScaleConfigDto | null>(null);
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  const {
    branchId,
    items,
    loading,
    error,
    refresh,
    liveStatus,
    fromCache,
    cacheAgeLabel,
    showStaleBanner,
  } = useEncounterQueue(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!branchId) return;
    void (async () => {
      const res = await getEffectiveTriageScale(branchId);
      setScale(res.success && res.data ? res.data : null);
    })();
  }, [branchId]);

  const calendarDay = now.getDate();
  useEffect(() => {
    if (!branchId) {
      setAppointments([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      setAppointmentsLoading(true);
      const bounds = dayBoundsUtc(new Date());
      const res = await listAppointments({
        branchId,
        from: bounds.from,
        to: bounds.to,
      });
      if (!cancelled) {
        setAppointments(res.success && res.data ? res.data : []);
        setAppointmentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId, calendarDay]);

  const urgencias = useMemo(
    () => items.filter((e) => e.encounterType === 'urgencias'),
    [items],
  );
  const consultas = useMemo(
    () => items.filter((e) => e.encounterType === 'consulta_externa'),
    [items],
  );

  const urgenciasActivas = useMemo(
    () => urgencias.filter((e) => e.state !== 'cerrado'),
    [urgencias],
  );

  const queueStats = useMemo(
    () => computeQueueStats(urgencias, scale, now),
    [urgencias, scale, now],
  );
  const consultStats = useMemo(
    () => computeConsultQueueStats(consultas, now),
    [consultas, now],
  );

  const topPriority = scale?.levels?.slice().sort((a, b) => a.priority - b.priority)[0];
  const urgenciasCriticas = useMemo(() => {
    if (!topPriority) {
      return urgenciasActivas.filter((e) => (e.triagePriority ?? 99) <= 1).length;
    }
    return urgenciasActivas.filter((e) => e.triageLevel === topPriority.code).length;
  }, [urgenciasActivas, topPriority]);

  const consultasActivas = consultStats.abierto + consultStats.enObservacion;

  const proximasCitas = useMemo(
    () =>
      [...appointments]
        .filter((a) => a.state === 'agendada' || a.state === 'confirmada')
        .sort((a, b) => a.scheduledStartUtc.localeCompare(b.scheduledStartUtc))
        .slice(0, 6),
    [appointments],
  );

  const citasHoy = appointments.length;
  const citasCompletadas = appointments.filter((a) => a.state === 'atendida').length;
  const citasCanceladas = appointments.filter((a) => a.state === 'cancelada').length;
  const noShows = appointments.filter((a) => a.state === 'no_asistio').length;
  const ocupacionAgenda =
    citasHoy > 0 ? Math.round(((citasCompletadas + citasCanceladas + noShows) / citasHoy) * 100) : 0;

  const triageDist = queueStats.byLevel.filter((row) => row.count > 0 || (scale?.levels?.length ?? 0) <= 6);

  const todayLabel = now.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6" data-testid="page-dashboard">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground-900">Panel operativo</h1>
        <p className="text-sm capitalize text-foreground-500">{todayLabel}</p>
        <p className="mt-1 text-xs text-foreground-400">
          Indicadores en vivo desde cola clínica y agenda. Agregados financieros/BI: pendiente de API.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Sin tendencias inventadas («vs ayer», ingresos del día del prototipo Readdy). KPIs =
        cola M4/M10 + citas M9 del día. BI = módulo futuro en la app (doc 12); ruta Reportes oculta
        en menú.
      </div>

      <QueueLiveBanner
        liveStatus={liveStatus}
        fromCache={fromCache}
        cacheAgeLabel={cacheAgeLabel}
        showStaleBanner={showStaleBanner}
      />

      {error && (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => navigate('/app/sala-espera')}
          className="group cursor-pointer rounded-xl border border-secondary-200 bg-background-50 p-4 text-left transition-all hover:border-amber-300"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
              <i className="ri-time-line text-amber-600" aria-hidden />
            </span>
            <span className="text-2xs uppercase tracking-wider text-foreground-400">Sala espera</span>
          </div>
          <p className="font-heading text-[28px] font-bold leading-tight text-foreground-900">
            {loading ? '…' : urgenciasActivas.length}
          </p>
          <span className="mt-1.5 block text-xs text-foreground-500">urgencias activas</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/app/consultas')}
          className="group cursor-pointer rounded-xl border border-secondary-200 bg-background-50 p-4 text-left transition-all hover:border-primary-300"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100">
              <i className="ri-stethoscope-line text-primary-600" aria-hidden />
            </span>
            <span className="text-2xs uppercase tracking-wider text-foreground-400">Consultas</span>
          </div>
          <p className="font-heading text-[28px] font-bold leading-tight text-foreground-900">
            {loading ? '…' : consultasActivas}
          </p>
          <span className="mt-1.5 block text-xs text-foreground-500">en curso</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/app/urgencias')}
          className={`group cursor-pointer rounded-xl border p-4 text-left transition-all ${
            urgenciasCriticas > 0
              ? 'border-red-500/20 bg-red-500/10 hover:border-red-500/40'
              : 'border-secondary-200 bg-background-50 hover:border-secondary-300'
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                urgenciasCriticas > 0 ? 'bg-red-100' : 'bg-secondary-100'
              }`}
            >
              <i
                className={
                  urgenciasCriticas > 0
                    ? 'ri-heart-pulse-fill text-red-500'
                    : 'ri-hospital-line text-foreground-400'
                }
                aria-hidden
              />
            </span>
            <span className="text-2xs uppercase tracking-wider text-foreground-400">Urgencias</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="font-heading text-[28px] font-bold leading-tight text-foreground-900">
              {loading ? '…' : urgenciasActivas.length}
            </p>
            {urgenciasCriticas > 0 && (
              <span className="text-xs font-semibold text-red-600">
                {urgenciasCriticas} prioridad alta
              </span>
            )}
          </div>
        </button>

        <Card padding="md" className="border-secondary-200 bg-background-50">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100">
              <i className="ri-hourglass-line text-sky-600" aria-hidden />
            </span>
            <span className="text-2xs uppercase tracking-wider text-foreground-400">Espera prom.</span>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="font-heading text-[28px] font-bold leading-tight text-foreground-900">
              {loading ? '…' : queueStats.avgWaitMinutes}
            </p>
            <span className="text-sm text-foreground-500">min</span>
          </div>
          <span className="mt-1.5 block text-xs text-foreground-500">cola urgencias</span>
        </Card>

        <Card padding="md" className="border-dashed border-secondary-300 bg-secondary-50/40">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-100">
              <i className="ri-bar-chart-grouped-line text-foreground-400" aria-hidden />
            </span>
            <span className="text-2xs uppercase tracking-wider text-foreground-400">BI / ingresos</span>
          </div>
          <p className="text-sm font-medium text-foreground-700">Pendiente</p>
          <p className="mt-1 text-xs text-foreground-500">
            Sin monto inventado. Agregados = Fase 3 / `features/bi` (solo lectura).
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" padding="none">
          <div className="flex items-center justify-between border-b border-secondary-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <i className="ri-heart-pulse-line text-red-500" aria-hidden />
              <h2 className="font-heading text-base font-semibold text-foreground-900">Urgencias activas</h2>
              <Badge variant="danger" size="sm">
                {urgenciasActivas.length}
              </Badge>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/urgencias')}
              className="flex cursor-pointer items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              Ver todas <i className="ri-arrow-right-line text-[10px]" aria-hidden />
            </button>
          </div>
          {loading ? (
            <p className="px-5 py-8 text-center text-sm text-foreground-500">Cargando cola…</p>
          ) : urgenciasActivas.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-foreground-600">Sin urgencias activas</p>
              <p className="mt-0.5 text-xs text-foreground-400">Cola vacía en esta sucursal</p>
            </div>
          ) : (
            <ul className="divide-y divide-secondary-50">
              {urgenciasActivas.slice(0, 8).map((u) => (
                <UrgenciaRow
                  key={u.encounterId}
                  encounter={u}
                  scale={scale}
                  now={now}
                  onClick={() => navigate('/app/urgencias')}
                />
              ))}
            </ul>
          )}
        </Card>

        <Card padding="none">
          <div className="flex items-center justify-between border-b border-secondary-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <i className="ri-calendar-check-line text-primary-600" aria-hidden />
              <h2 className="font-heading text-base font-semibold text-foreground-900">Próximas citas</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/agenda')}
              className="flex cursor-pointer items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              Agenda <i className="ri-arrow-right-line text-[10px]" aria-hidden />
            </button>
          </div>
          {appointmentsLoading ? (
            <p className="px-5 py-8 text-center text-sm text-foreground-500">Cargando agenda…</p>
          ) : proximasCitas.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-foreground-500">No hay más citas programadas para hoy</p>
            </div>
          ) : (
            <ul className="divide-y divide-secondary-50">
              {proximasCitas.map((apt) => (
                <li
                  key={apt.appointmentId}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-secondary-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground-800">
                      {appointmentDisplayName(apt)}
                    </p>
                    <p className="text-xs text-foreground-500">
                      {apt.professionalFullName || 'Profesional por asignar'}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs font-semibold text-foreground-700">
                      {formatAppointmentTime(apt.scheduledStartUtc)}
                    </p>
                    <Badge variant={appointmentBadge[apt.state] ?? 'secondary'} size="sm">
                      {appointmentStateLabels[apt.state] ?? apt.state}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {scale && triageDist.length > 0 && (
        <Card padding="lg">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-foreground-900">
              Cola de urgencias por nivel ({scale.displayName})
            </h2>
            <Badge variant="secondary" size="sm">
              Total: {urgencias.length}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {triageDist.map((row) => {
              const total = urgencias.length || 1;
              const pct = Math.round((row.count / total) * 100);
              return (
                <button
                  key={row.level.code}
                  type="button"
                  onClick={() => navigate('/app/sala-espera')}
                  className="cursor-pointer rounded-xl border border-secondary-200 bg-background-50 p-4 text-left transition-all hover:shadow-sm"
                >
                  <span
                    className={`mb-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold ${row.accent.badge} ${row.accent.text}`}
                  >
                    <i className={row.level.icon || 'ri-flag-line'} aria-hidden />
                    {row.level.label}
                  </span>
                  <p className="font-heading text-2xl font-bold text-foreground-900">{row.count}</p>
                  <p className="mt-1 text-2xs text-foreground-400">{pct}%</p>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card padding="md">
          <p className="text-xs text-foreground-500">Citas hoy</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground-900">
            {appointmentsLoading ? '…' : citasHoy}
          </p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-foreground-500">Atendidas</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground-900">
            {appointmentsLoading ? '…' : citasCompletadas}
          </p>
          <p className="mt-1 text-2xs text-foreground-400">
            {citasHoy > 0 ? `${Math.round((citasCompletadas / citasHoy) * 100)}% del día` : '—'}
          </p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-foreground-500">Canceladas / no asistió</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground-900">
            {appointmentsLoading ? '…' : citasCanceladas + noShows}
          </p>
        </Card>
        <Card padding="md" className="border-dashed border-secondary-300">
          <p className="text-xs text-foreground-500">Avance del día</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground-900">
            {appointmentsLoading ? '…' : `${ocupacionAgenda}%`}
          </p>
          <p className="mt-1 text-2xs text-foreground-400">citas con desenlace registrado</p>
        </Card>
      </div>
    </div>
  );
}

function UrgenciaRow({
  encounter,
  scale,
  now,
  onClick,
}: {
  encounter: EncounterDto;
  scale: TriageScaleConfigDto | null;
  now: Date;
  onClick: () => void;
}) {
  const accent = accentForEncounter(scale, encounter);
  const waitMin = waitMinutesSince(encounter.arrivalAtUtc, now);
  const stateCfg = estadoConfig[encounter.state] ?? {
    label: encounter.state,
    className: 'bg-secondary-100 text-foreground-700',
  };

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full cursor-pointer items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-secondary-50"
      >
        <span className={`h-3 w-3 flex-shrink-0 rounded-full ${accent.dot}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground-800">
            {encounterDisplayName(encounter)}
          </p>
          <p className="text-xs text-foreground-500">
            Turno {encounter.turnNumber} · llegada {formatArrivalLocal(encounter.arrivalAtUtc)}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <span className={`text-2xs font-semibold ${stateCfg.className} rounded px-1.5 py-0.5`}>
            {stateCfg.label}
          </span>
          <p className="mt-0.5 text-2xs text-foreground-500">
            <i className={`${levelIcon(scale, encounter)} mr-0.5`} aria-hidden />
            {triageBadgeLabel(scale, encounter)} · {formatWaitLabel(waitMin)}
          </p>
        </div>
      </button>
    </li>
  );
}
