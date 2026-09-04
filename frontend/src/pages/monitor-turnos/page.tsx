import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEffectiveTriageScale, type TriageScaleConfigDto } from '@/api/triage';
import { useEncounterQueue } from '@/hooks/useEncounterQueue';
import { useUserBranches } from '@/hooks/useUserBranches';
import QueueLiveBanner from '@/components/feature/QueueLiveBanner';
import {
  buildMonitorRows,
  formatMonitorClock,
  formatWaitLabel,
  legendLevels,
} from '@/pages/monitor-turnos/monitorPresentation';

/**
 * Monitor de turnos (pantalla pública / sala de espera).
 * Doc 06 #21: sólo número de turno; sin nombre ni otra PHI.
 * Layout alineado al prototipo `docs/frontend` con datos reales (M4/M10).
 */
export default function MonitorTurnos() {
  const navigate = useNavigate();
  const { currentBranch } = useUserBranches();
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
  const [now, setNow] = useState(() => new Date());
  const [scale, setScale] = useState<TriageScaleConfigDto | null>(null);

  const branchName = currentBranch?.nombre ?? 'Sucursal';
  const branchPhone = currentBranch?.telefono ?? '';

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!branchId) return;
    void (async () => {
      const res = await getEffectiveTriageScale(branchId);
      if (res.success && res.data) setScale(res.data);
    })();
  }, [branchId]);

  const turnos = useMemo(
    () => buildMonitorRows(items, scale, now),
    [items, scale, now],
  );

  const stats = useMemo(() => {
    const sinClasificar = turnos.filter((t) => !t.encounter.triageLevel).length;
    const observacion = turnos.filter(
      (t) => t.encounter.state === 'en_observacion',
    ).length;
    const promedio =
      turnos.length > 0
        ? Math.round(
            turnos.reduce((sum, t) => sum + t.waitMinutes, 0) / turnos.length,
          )
        : 0;
    return {
      total: turnos.length,
      sinClasificar,
      observacion,
      promedio,
    };
  }, [turnos]);

  const visible = turnos.slice(0, 4);
  const legend = legendLevels(scale);

  return (
    <div
      className="flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden bg-background-50"
      data-testid="page-monitor-turnos"
    >
      {/* Header */}
      <div className="flex w-full flex-shrink-0 items-center justify-between bg-foreground-900 px-6 py-3 text-background-50">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center">
            <i className="ri-hospital-line text-3xl text-primary-400" aria-hidden />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-wide">{branchName}</h1>
            <p className="text-sm text-foreground-400">
              Sala de espera — turnos en pantalla (sin datos personales)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <button
            type="button"
            aria-label="Ir a Agenda"
            onClick={() => navigate('/app/agenda')}
            className="flex items-center gap-2 rounded-lg bg-foreground-800 px-3 py-1.5 text-sm text-foreground-300 opacity-60 transition-colors hover:bg-foreground-700 hover:opacity-100"
          >
            <i className="ri-calendar-line text-base" aria-hidden />
            <span className="whitespace-nowrap">Agenda</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
            </span>
            <span
              className="font-mono text-2xl font-bold tracking-wider text-background-50"
              data-testid="monitor-clock"
            >
              {formatMonitorClock(now)}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex w-full flex-shrink-0 items-center gap-8 border-b border-secondary-200/70 bg-background-50 px-6 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-sm uppercase tracking-wide text-foreground-500">En sala</span>
          <span className="text-xl font-bold text-foreground-900" aria-live="polite">
            {stats.total}
          </span>
        </div>
        <div className="h-7 w-px flex-shrink-0 bg-secondary-200/70" />
        <div className="flex items-center gap-2.5">
          <span className="text-sm uppercase tracking-wide text-foreground-500">
            Sin clasificar
          </span>
          <span className="text-xl font-bold text-orange-600">{stats.sinClasificar}</span>
        </div>
        <div className="h-7 w-px flex-shrink-0 bg-secondary-200/70" />
        <div className="flex items-center gap-2.5">
          <span className="text-sm uppercase tracking-wide text-foreground-500">
            Observación
          </span>
          <span className="text-xl font-bold text-primary-600">{stats.observacion}</span>
        </div>
        <div className="h-7 w-px flex-shrink-0 bg-secondary-200/70" />
        <div className="flex items-center gap-2.5">
          <span className="text-sm uppercase tracking-wide text-foreground-500">
            Promedio espera
          </span>
          <span className="text-xl font-bold text-foreground-700">{stats.promedio} min</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Turnos */}
        <div className="flex flex-1 flex-col overflow-hidden px-6 py-4">
          <div className="mb-4">
            <QueueLiveBanner
              liveStatus={liveStatus}
              fromCache={fromCache}
              cacheAgeLabel={cacheAgeLabel}
              showStaleBanner={showStaleBanner}
            />
          </div>

          {error && !fromCache && (
            <p className="mb-4 text-sm text-red-600">{error}</p>
          )}
          {loading && turnos.length === 0 && (
            <p className="text-foreground-500">Cargando cola…</p>
          )}

          {turnos.length === 0 && !loading ? (
            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50">
                <i className="ri-check-double-line text-5xl text-emerald-400" aria-hidden />
              </div>
              <p className="text-2xl font-bold text-foreground-700">
                No hay pacientes en espera
              </p>
              <p className="mt-2 text-lg text-foreground-400">
                Todos los turnos activos han sido atendidos
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-4">
              {visible.map((turno) => (
                <div
                  key={turno.encounter.encounterId}
                  data-testid={`monitor-turno-${turno.encounter.turnNumber}`}
                  className={`flex flex-1 items-center gap-6 rounded-2xl border-l-[6px] bg-background-50 px-6 py-5 shadow-sm transition-all duration-300 ${turno.accent.border} ${
                    turno.isNext ? 'animate-pulse ring-2 ring-accent-300' : ''
                  }`}
                  style={{ minHeight: 0 }}
                >
                  <div
                    className={`flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                      turno.isNext
                        ? 'border-accent-300 bg-accent-500'
                        : 'border-secondary-200 bg-background-50'
                    }`}
                  >
                    <span
                      className={`font-mono text-3xl font-bold tabular-nums ${
                        turno.isNext ? 'text-white' : 'text-foreground-700'
                      }`}
                    >
                      {turno.encounter.turnNumber}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <p
                        className={`text-2xl font-bold leading-tight ${
                          turno.isNext ? 'text-accent-700' : 'text-foreground-900'
                        }`}
                      >
                        Turno {turno.encounter.turnNumber}
                      </p>
                      {turno.isNext && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-accent-100 px-3 py-1 text-sm font-bold text-accent-800">
                          <i className="ri-volume-up-fill animate-bounce" aria-hidden />
                          SIGUIENTE
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-lg text-foreground-500">
                      Urgencias · {turno.stateLabel}
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${turno.accent.badge} ${turno.accent.text}`}
                    >
                      <span className={`h-3 w-3 rounded-full ${turno.accent.dot}`} />
                      {turno.triageLabel}
                    </span>
                  </div>

                  <div className="min-w-[100px] flex-shrink-0 text-right">
                    <span className="block text-base text-foreground-400">Espera</span>
                    <span
                      className={`font-mono text-2xl font-bold tabular-nums ${
                        turno.isNext ? 'text-accent-600' : 'text-foreground-800'
                      }`}
                    >
                      {formatWaitLabel(turno.waitMinutes)}
                    </span>
                  </div>
                </div>
              ))}

              {turnos.length > 4 && (
                <div className="py-2 text-center">
                  <span className="text-base font-medium text-foreground-400">
                    +{turnos.length - 4} turnos adicionales en espera
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-shrink-0 flex-wrap items-center justify-between gap-4 text-sm text-foreground-400">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-accent-500 animate-pulse" />
                Siguiente turno
              </span>
              {legend.map((item) => (
                <span key={item.label} className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${item.accent.dot}`} />
                  {item.label}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="text-foreground-500 underline hover:text-foreground-700"
              onClick={() => void refresh()}
            >
              Actualizar · {formatMonitorClock(now)}
            </button>
          </div>
        </div>

        {/* Publicidad (estática, sin PHI) */}
        <aside className="flex w-[420px] flex-shrink-0 flex-col overflow-y-auto border-l border-secondary-200/70 bg-background-50">
          <div className="flex-shrink-0 p-5">
            <div className="relative overflow-hidden rounded-2xl bg-primary-100">
              <div className="flex h-52 items-center justify-center bg-gradient-to-br from-primary-200 to-primary-400">
                <i className="ri-stethoscope-line text-6xl text-primary-700/40" aria-hidden />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-primary-900/80 via-primary-900/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <span className="mb-2 inline-block rounded-full bg-accent-500 px-3 py-1 text-sm font-bold text-white">
                  PROMOCIÓN
                </span>
                <h3 className="text-lg font-bold leading-tight text-white">
                  Consulta de control familiar
                </h3>
                <p className="mt-1 text-sm text-white/80">
                  Examen físico y plan nutricional
                </p>
              </div>
            </div>
          </div>

          <div className="mx-5 border-t border-secondary-200/70" />

          <div className="flex-shrink-0 p-5">
            <div className="rounded-2xl bg-secondary-100 p-5">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground-900 text-background-50">
                  <i className="ri-time-line text-2xl" aria-hidden />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground-900">Servicio 24/7</h3>
                  <p className="text-sm text-foreground-500">Emergencias y urgencias</p>
                </div>
              </div>
              <p className="text-center text-sm text-foreground-500">
                Disponibles todos los días del año
              </p>
            </div>
          </div>

          <div className="mt-auto border-t border-secondary-200/70 p-5">
            <p className="text-center text-sm text-foreground-400">
              {branchName}
              {branchPhone ? ` · Consultas: ${branchPhone}` : ''}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
