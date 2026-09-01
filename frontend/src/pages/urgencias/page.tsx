import { useEffect, useMemo, useState } from 'react';
import {
  encounterDisplayName,
  estadoConfig,
  type EncounterDto,
} from '@/api/encounters';
import { getEffectiveTriageScale, type TriageScaleConfigDto } from '@/api/triage';
import { useEncounterQueue } from '@/hooks/useEncounterQueue';
import { triageLevelLabel } from '@/utils/triageScalePresentation';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';
import QueueLiveBanner from '@/components/feature/QueueLiveBanner';
import AtencionUrgenciaPanel from './components/AtencionUrgenciaPanel';
import NuevoIngresoModal from './components/NuevoIngresoModal';

function formatArrival(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function waitMinutes(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 60_000));
}

/**
 * Cola e ingreso de urgencias contra API real (M4 / WS-E).
 * Sin mocks en el flujo de ingreso. Niveles de triage = escala efectiva (doc 06 §63).
 */
export default function Urgencias() {
  const {
    items,
    loading,
    error,
    refresh,
    upsertLocal,
    branchId,
    allUnclassified,
    liveStatus,
    fromCache,
    cacheAgeLabel,
    showStaleBanner,
  } = useEncounterQueue(false);

  const [scale, setScale] = useState<TriageScaleConfigDto | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [showNuevo, setShowNuevo] = useState(false);

  useEffect(() => {
    if (!branchId) return;
    void (async () => {
      const res = await getEffectiveTriageScale(branchId);
      setScale(res.success && res.data ? res.data : null);
    })();
  }, [branchId]);

  const selected = useMemo(
    () => items.find((e) => e.encounterId === selectedId) ?? null,
    [items, selectedId],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((e) => {
      const name = encounterDisplayName(e).toLowerCase();
      return (
        name.includes(q) ||
        String(e.turnNumber).includes(q) ||
        (e.operationalLabel?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, search]);

  function onCreated(e: EncounterDto) {
    upsertLocal(e);
    setSelectedId(e.encounterId);
    void refresh();
  }

  return (
    <div className="space-y-4 p-4 md:p-6" data-testid="page-urgencias">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Urgencias</h1>
          <p className="text-sm text-slate-500">
            Cola ordenada: sin clasificar → estado → llegada.
            {allUnclassified ? ' (todos sin clasificar hasta M5)' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => void refresh()}>
            Actualizar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowNuevo(true)}
            data-testid="btn-nuevo-ingreso"
          >
            Nuevo ingreso
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
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <Input
        label="Buscar en cola"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Turno, etiqueta o nombre"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Turno</th>
                <th className="px-3 py-2">Paciente</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Llegada</th>
                <th className="px-3 py-2">Espera</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    Cargando cola…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    Sin episodios abiertos en esta sucursal.
                  </td>
                </tr>
              )}
              {filtered.map((e) => {
                const st = estadoConfig[e.state] ?? estadoConfig.abierto;
                return (
                  <tr
                    key={e.encounterId}
                    className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${
                      selectedId === e.encounterId ? 'bg-slate-50' : ''
                    }`}
                    onClick={() => setSelectedId(e.encounterId)}
                    data-testid={`fila-encuentro-${e.turnNumber}`}
                  >
                    <td className="px-3 py-2 font-semibold tabular-nums">{e.turnNumber}</td>
                    <td className="px-3 py-2">
                      <div>{encounterDisplayName(e)}</div>
                      <div className="text-xs text-slate-400">
                        {triageLevelLabel(scale, e.triageLevel)}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs ${st.className}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{formatArrival(e.arrivalAtUtc)}</td>
                    <td className="px-3 py-2 tabular-nums">{waitMinutes(e.arrivalAtUtc)} min</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div>
          {selected ? (
            <AtencionUrgenciaPanel
              key={selected.encounterId}
              encounter={selected}
              triageScale={scale}
              onUpdated={(e) => {
                upsertLocal(e);
                void refresh();
              }}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Seleccione un episodio o registre un nuevo ingreso.
            </div>
          )}
        </div>
      </div>

      <NuevoIngresoModal
        open={showNuevo}
        onClose={() => setShowNuevo(false)}
        onCreated={onCreated}
      />
    </div>
  );
}
