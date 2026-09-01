import { useMemo } from 'react';
import { encounterDisplayName, estadoConfig } from '@/api/encounters';
import { useEncounterQueue } from '@/hooks/useEncounterQueue';
import Button from '@/components/base/Button';
import QueueLiveBanner from '@/components/feature/QueueLiveBanner';

/**
 * Sala de espera — segmento urgencias desde API real (M4 + live M10).
 * La agenda ambulatoria (M9) puede engancharse en paralelo sin pisar este listado.
 */
export default function SalaEspera() {
  const {
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

  const activos = useMemo(
    () => items.filter((e) => e.state !== 'cerrado'),
    [items],
  );

  return (
    <div className="space-y-4 p-4 md:p-6" data-testid="page-sala-espera">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Sala de espera</h1>
          <p className="text-sm text-slate-500">
            Cola de urgencias (API). Orden: sin clasificar → estado → llegada.
            {allUnclassified ? ' Todos sin clasificar hasta triage (M5).' : ''}
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={() => void refresh()}>
          Actualizar
        </Button>
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Turno</th>
              <th className="px-3 py-2">Identificación operativa</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Triage</th>
              <th className="px-3 py-2">Llegada</th>
            </tr>
          </thead>
          <tbody>
            {loading && activos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && activos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  Sin pacientes de urgencias en cola.
                </td>
              </tr>
            )}
            {activos.map((e) => {
              const st = estadoConfig[e.state] ?? estadoConfig.abierto;
              return (
                <tr key={e.encounterId} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-semibold tabular-nums">{e.turnNumber}</td>
                  <td className="px-3 py-2">{encounterDisplayName(e)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs ${st.className}`}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {e.triageLevel ?? 'Sin clasificar'}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {new Date(e.arrivalAtUtc).toLocaleTimeString('es-MX', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
