import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { encounterDisplayName, estadoConfig } from '@/api/encounters';
import { getEffectiveTriageScale, type TriageScaleConfigDto } from '@/api/triage';
import { useEncounterQueue } from '@/hooks/useEncounterQueue';
import {
  accentForEncounter,
  computeQueueStats,
  formatArrivalLocal,
  formatWaitLabel,
  levelIcon,
  triageBadgeLabel,
  waitMinutesSince,
  waitTimeBgClass,
  waitTimeTextClass,
} from '@/utils/encounterQueuePresentation';
import Avatar from '@/components/base/Avatar';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import EncounterQueueStatsBar from '@/components/feature/EncounterQueueStatsBar';
import QueueLiveBanner from '@/components/feature/QueueLiveBanner';

function formatClock(now: Date): string {
  return now.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Sala de espera — cola de urgencias (M4 + live M10).
 * Layout alineado al prototipo; segmento ambulatorio (M9) se integrará sin pisar este listado.
 */
export default function SalaEspera() {
  const navigate = useNavigate();
  const {
    branchId,
    items,
    loading,
    error,
    refresh,
    allUnclassified,
    liveStatus,
    fromCache,
    cacheAgeLabel,
    showStaleBanner,
  } = useEncounterQueue(false);

  const [scale, setScale] = useState<TriageScaleConfigDto | null>(null);
  const [now, setNow] = useState(() => new Date());

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

  const activos = useMemo(
    () => items.filter((e) => e.state !== 'cerrado'),
    [items],
  );

  const stats = useMemo(
    () => computeQueueStats(items, scale, now),
    [items, scale, now],
  );

  const ribbon = useMemo(
    () => ({
      enSala: activos.length,
      sinClasificar: activos.filter((e) => !e.triageLevel).length,
      abierto: activos.filter((e) => e.state === 'abierto').length,
      observacion: activos.filter((e) => e.state === 'en_observacion').length,
      promedio: stats.avgWaitMinutes,
    }),
    [activos, stats.avgWaitMinutes],
  );

  const todayLabel = now.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-5" data-testid="page-sala-espera">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground-900">Sala de espera</h1>
            <p className="text-xs capitalize text-foreground-500">{todayLabel}</p>
          </div>
          <div className="ml-2 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="font-mono text-xs font-medium text-foreground-600">
              {formatClock(now)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => void refresh()}>
            Actualizar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/app/agenda')}>
            <i className="ri-calendar-line" aria-hidden /> Agenda
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/app/triage')}>
            <i className="ri-heart-pulse-line" aria-hidden /> Triage
          </Button>
        </div>
      </div>

      <QueueLiveBanner
        liveStatus={liveStatus}
        fromCache={fromCache}
        cacheAgeLabel={cacheAgeLabel}
        showStaleBanner={showStaleBanner}
      />

      {error && !fromCache && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {allUnclassified && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Todos los episodios activos están sin clasificar hasta triage (M5).
        </p>
      )}

      <div className="flex items-center gap-3 overflow-x-auto rounded-xl border border-secondary-200/70 bg-background-50 px-4 py-3 sm:gap-6">
        <RibbonStat icon="ri-group-line" label="En sala" value={ribbon.enSala} />
        <Divider />
        <RibbonStat
          icon="ri-question-line"
          label="Sin clasificar"
          value={ribbon.sinClasificar}
          valueClass="text-amber-600"
        />
        <Divider />
        <RibbonStat
          icon="ri-time-line"
          label="Abierto"
          value={ribbon.abierto}
          valueClass="text-amber-600"
        />
        <Divider />
        <RibbonStat
          icon="ri-stethoscope-line"
          label="Observación"
          value={ribbon.observacion}
          valueClass="text-sky-600"
        />
        <Divider />
        <RibbonStat
          icon="ri-timer-line"
          label="Promedio espera"
          value={`${ribbon.promedio}m`}
          valueClass="text-foreground-600"
        />
      </div>

      <EncounterQueueStatsBar stats={stats} scale={scale} showLevelBreakdown={false} />

      <div className="rounded-xl border border-secondary-200/70 bg-background-50 p-3 text-xs text-foreground-500">
        <i className="ri-information-line mr-1" aria-hidden />
        Vista de <strong>urgencias</strong> en vivo (M4/M10). El prototipo Readdy mezclaba citas
        ambulatorias «en sala» con mocks de agenda; esa mezcla <strong>no</strong> se inventa aquí.
        Llamar/promover desde agenda (M9) se conecta en oleada posterior.
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground-900">
            <i className="ri-hourglass-line text-amber-500" aria-hidden />
            Pacientes en sala (urgencias)
            <span className="text-xs font-normal text-foreground-400">({activos.length})</span>
          </h2>
        </div>

        {loading && activos.length === 0 && (
          <p className="py-10 text-center text-sm text-foreground-500">Cargando cola…</p>
        )}

        {!loading && activos.length === 0 && (
          <div className="rounded-xl border border-secondary-200/70 bg-background-50 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center text-foreground-300">
              <i className="ri-check-double-line text-3xl" aria-hidden />
            </div>
            <p className="text-sm font-medium text-foreground-500">No hay pacientes en sala</p>
            <p className="mt-1 text-xs text-foreground-400">
              Todos los turnos activos han sido atendidos o cerrados
            </p>
          </div>
        )}

        <div className="space-y-2">
          {activos.map((e, idx) => {
            const name = encounterDisplayName(e);
            const waitMin = waitMinutesSince(e.arrivalAtUtc, now);
            const accent = accentForEncounter(scale, e);
            const st = estadoConfig[e.state] ?? estadoConfig.abierto;
            const isNext = idx === 0;

            return (
              <div
                key={e.encounterId}
                data-testid={`sala-espera-turno-${e.turnNumber}`}
                className={`flex flex-col gap-2.5 rounded-xl border px-4 py-3 transition-all duration-200 ${
                  isNext
                    ? 'border-accent-400 bg-accent-50/40 ring-2 ring-accent-200'
                    : `${accent.border} bg-background-50`
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-secondary-200/70 bg-background-50 text-xs font-bold text-foreground-400">
                    {idx + 1}
                  </span>
                  <Avatar name={name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground-900">{name}</p>
                      <span className="font-mono text-2xs text-foreground-400">
                        Turno {e.turnNumber}
                      </span>
                      {isNext && (
                        <Badge variant="accent" size="sm">
                          Siguiente
                        </Badge>
                      )}
                    </div>
                    <p className="text-2xs text-foreground-500">
                      Llegada {formatArrivalLocal(e.arrivalAtUtc)}
                    </p>
                  </div>
                  <div className={`flex-shrink-0 rounded-md px-2.5 py-1 ${waitTimeBgClass(waitMin)}`}>
                    <span className={`font-mono text-xs font-bold ${waitTimeTextClass(waitMin)}`}>
                      {formatWaitLabel(waitMin)}
                    </span>
                  </div>
                  <Badge variant="secondary" size="sm">
                    {st.label}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-2xs font-medium ${accent.badge} ${accent.text} ${accent.border}`}
                  >
                    <i className={`${levelIcon(scale, e)} text-xs`} aria-hidden />
                    {triageBadgeLabel(scale, e)}
                  </span>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <Link
                      to="/app/triage"
                      className="inline-flex items-center gap-1 rounded-md border border-secondary-200 px-2 py-1 text-2xs font-medium text-foreground-600 hover:bg-secondary-50"
                    >
                      <i className="ri-heart-pulse-line" aria-hidden /> Triage
                    </Link>
                    <Link
                      to="/app/urgencias"
                      className="inline-flex items-center gap-1 rounded-md border border-secondary-200 px-2 py-1 text-2xs font-medium text-foreground-600 hover:bg-secondary-50"
                    >
                      <i className="ri-hospital-line" aria-hidden /> Urgencias
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RibbonStat({
  icon,
  label,
  value,
  valueClass = 'text-foreground-900',
}: {
  icon: string;
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-shrink-0 items-center gap-2">
      <i className={`${icon} text-foreground-400`} aria-hidden />
      <div>
        <p className={`text-sm font-bold tabular-nums ${valueClass}`}>{value}</p>
        <p className="text-[10px] uppercase tracking-wide text-foreground-500">{label}</p>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="hidden h-7 w-px flex-shrink-0 bg-secondary-200/70 sm:block" />;
}
