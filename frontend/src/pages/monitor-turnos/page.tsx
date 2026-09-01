import { useEffect, useState } from 'react';
import { encounterMonitorLabel } from '@/api/encounters';
import { useEncounterQueue } from '@/hooks/useEncounterQueue';
import QueueLiveBanner from '@/components/feature/QueueLiveBanner';

/**
 * Monitor de turnos de urgencias.
 * Doc 06 #21 (2026-08-30): sólo número de turno; sin nombre/PHI en pantalla pública.
 * Live = invalidación (M10).
 */
export default function MonitorTurnos() {
  const {
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
  /** Congelado en false hasta opt-in futuro explícito (doc 06 #21). */
  const showNames = false;

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const activos = items.filter((e) => e.state !== 'cerrado');

  return (
    <div
      className="min-h-[70vh] bg-slate-900 px-6 py-8 text-white"
      data-testid="page-monitor-turnos"
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl font-bold tracking-tight">Turnos</h1>
          <p className="mt-1 text-slate-400">
            Urgencias · por omisión sólo número de turno
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl tabular-nums">
            {now.toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
          <button
            type="button"
            className="mt-2 text-xs text-slate-500 underline"
            onClick={() => void refresh()}
          >
            Actualizar
          </button>
        </div>
      </div>

      <div className="mb-4">
        <QueueLiveBanner
          liveStatus={liveStatus}
          fromCache={fromCache}
          cacheAgeLabel={cacheAgeLabel}
          showStaleBanner={showStaleBanner}
          dark
        />
      </div>

      {error && !fromCache && <p className="mb-4 text-sm text-red-300">{error}</p>}
      {loading && activos.length === 0 && (
        <p className="text-slate-400">Cargando…</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {activos.map((e) => (
          <div
            key={e.encounterId}
            className="rounded-2xl border border-slate-700 bg-slate-800/80 px-6 py-8 text-center"
            data-testid={`monitor-turno-${e.turnNumber}`}
          >
            <div className="text-xs uppercase tracking-widest text-slate-400">Turno</div>
            <div className="mt-2 font-mono text-6xl font-bold tabular-nums text-white">
              {encounterMonitorLabel(e, showNames)}
            </div>
            <div className="mt-3 text-sm text-slate-400">
              {e.state === 'en_observacion' ? 'Observación' : 'En espera / atención'}
            </div>
          </div>
        ))}
      </div>

      {!loading && activos.length === 0 && (
        <p className="mt-12 text-center text-slate-500">No hay turnos activos.</p>
      )}
    </div>
  );
}
