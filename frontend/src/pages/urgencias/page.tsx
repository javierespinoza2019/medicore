import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  encounterDisplayName,
  estadoConfig,
  getEncounter,
  type EncounterDto,
} from '@/api/encounters';
import { useAuth } from '@/hooks/useAuth';
import { getEffectiveTriageScale, type TriageScaleConfigDto } from '@/api/triage';
import { useEncounterQueue } from '@/hooks/useEncounterQueue';
import { usePagination } from '@/hooks/usePagination';
import {
  accentForEncounter,
  computeQueueStats,
  filterEncounters,
  formatArrivalLocal,
  formatWaitLabel,
  levelIcon,
  triageBadgeLabel,
  waitMinutesSince,
  waitTimeTextClass,
  type EncounterFilterState,
} from '@/utils/encounterQueuePresentation';
import { exportToExcel } from '@/utils/exportUtils';
import Card from '@/components/base/Card';
import Button from '@/components/base/Button';
import EncounterQueueStatsBar from '@/components/feature/EncounterQueueStatsBar';
import PaginationControls from '@/components/feature/PaginationControls';
import QueueLiveBanner from '@/components/feature/QueueLiveBanner';
import AtencionUrgenciaPanel from './components/AtencionUrgenciaPanel';
import NuevoIngresoModal from './components/NuevoIngresoModal';

const STATE_FILTERS = [
  { value: 'todos' as const, label: 'Todos' },
  { value: 'abierto', label: 'Abierto' },
  { value: 'en_observacion', label: 'Observación' },
];

/**
 * Cola e ingreso de urgencias (M4). Layout alineado al prototipo; datos vía API.
 * Escala de triage configurable (doc 06 §63).
 */
export default function Urgencias() {
  const [searchParams, setSearchParams] = useSearchParams();
  const encuentroParam = searchParams.get('encuentro') || '';

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
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const [scale, setScale] = useState<TriageScaleConfigDto | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [selectedFallback, setSelectedFallback] = useState<EncounterDto | null>(null);
  const [showNuevo, setShowNuevo] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [filters, setFilters] = useState<EncounterFilterState>({
    search: '',
    levelCode: 'todos',
    state: 'todos',
  });

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!branchId) return;
    void (async () => {
      const res = await getEffectiveTriageScale(branchId);
      setScale(res.success && res.data ? res.data : null);
    })();
  }, [branchId]);

  const stats = useMemo(
    () => computeQueueStats(items, scale, now),
    [items, scale, now],
  );

  const filtered = useMemo(
    () => filterEncounters(items, filters),
    [items, filters],
  );

  const pagination = usePagination(filtered, 10);
  const { setCurrentPage, ...paginationProps } = pagination;

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.levelCode, filters.state, setCurrentPage]);

  const selected = useMemo(() => {
    const fromQueue = items.find((e) => e.encounterId === selectedId);
    if (fromQueue) return fromQueue;
    if (selectedFallback?.encounterId === selectedId) return selectedFallback;
    return null;
  }, [items, selectedId, selectedFallback]);

  useEffect(() => {
    if (!selectedId || authLoading || !isAuthenticated) {
      setSelectedFallback(null);
      return;
    }
    if (items.some((e) => e.encounterId === selectedId)) {
      setSelectedFallback(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await getEncounter(selectedId);
      if (!cancelled && res.success && res.data) setSelectedFallback(res.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, items, authLoading, isAuthenticated]);

  useEffect(() => {
    if (encuentroParam) setSelectedId(encuentroParam);
  }, [encuentroParam]);

  useEffect(() => {
    if (!selectedId) return;
    const hit = items.some((e) => e.encounterId === selectedId);
    if (!hit && !loading && items.length > 0 && !encuentroParam) {
      setSelectedId('');
    }
  }, [items, selectedId, loading, encuentroParam]);

  const selectEncounter = (encounterId: string) => {
    setSelectedId(encounterId);
    if (encounterId) {
      const next = new URLSearchParams(searchParams);
      next.set('encuentro', encounterId);
      setSearchParams(next, { replace: true });
    } else {
      const next = new URLSearchParams(searchParams);
      next.delete('encuentro');
      setSearchParams(next, { replace: true });
    }
  };

  function onCreated(e: EncounterDto) {
    upsertLocal(e);
    selectEncounter(e.encounterId);
    void refresh();
  }

  function handleExportExcel() {
    const rows = items.map((e) => ({
      Turno: e.turnNumber,
      Paciente: encounterDisplayName(e),
      Estado: estadoConfig[e.state]?.label ?? e.state,
      Triage: triageBadgeLabel(scale, e),
      Llegada: formatArrivalLocal(e.arrivalAtUtc),
      Espera: `${waitMinutesSince(e.arrivalAtUtc, now)} min`,
    }));
    const dateStr = new Date().toISOString().split('T')[0];
    exportToExcel(rows, `Urgencias_MediCore_${dateStr}`, 'Urgencias');
  }

  return (
    <div className="space-y-5 p-4 md:p-6" data-testid="page-urgencias">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleExportExcel}
          className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-secondary-200 bg-background-50 px-4 py-2 text-sm font-medium text-foreground-600 transition-base hover:bg-secondary-100"
        >
          <i className="ri-file-excel-line" aria-hidden />
          Exportar Excel
        </button>
        <Button type="button" variant="ghost" size="sm" onClick={() => void refresh()}>
          Actualizar
        </Button>
        <button
          type="button"
          aria-label="Registrar nuevo ingreso de urgencias"
          onClick={() => setShowNuevo(true)}
          data-testid="btn-nuevo-ingreso"
          className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg bg-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-base hover:bg-red-600"
        >
          <i className="ri-add-line" aria-hidden />
          Nuevo ingreso
        </button>
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

      {allUnclassified && (
        <p className="text-xs text-foreground-500">
          Cola sin clasificar: todos pendientes de triage (M5).
        </p>
      )}

      <EncounterQueueStatsBar stats={stats} scale={scale} />

      <div className="flex flex-col items-start gap-5 lg:flex-row">
        <Card className="w-full flex-shrink-0 lg:w-[420px]" padding="none">
          <div className="border-b border-secondary-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground-800">Pacientes en urgencias</h2>
              <span className="text-2xs text-foreground-400">{filtered.length} registros</span>
            </div>
            <div className="relative mb-2">
              <span className="pointer-events-none absolute left-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-foreground-400">
                <i className="ri-search-line text-sm" aria-hidden />
              </span>
              <input
                type="search"
                placeholder="Buscar turno, etiqueta o nombre…"
                aria-label="Buscar urgencia por paciente o turno"
                data-testid="urgencias-buscar-cola"
                value={filters.search}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, search: e.target.value }))
                }
                maxLength={100}
                className="w-full rounded-lg border border-secondary-200 bg-background-50 py-1.5 pl-10 pr-3 text-sm text-foreground-900 outline-none transition-base placeholder:text-foreground-400 focus:border-primary-400"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              <FilterChip
                active={filters.levelCode === 'todos'}
                onClick={() => setFilters((f) => ({ ...f, levelCode: 'todos' }))}
              >
                Todos
              </FilterChip>
              <FilterChip
                active={filters.levelCode === 'sin_clasificar'}
                onClick={() =>
                  setFilters((f) => ({ ...f, levelCode: 'sin_clasificar' }))
                }
              >
                Sin clasificar
              </FilterChip>
              {(scale?.levels ?? []).map((level) => (
                <FilterChip
                  key={level.code}
                  active={filters.levelCode === level.code}
                  onClick={() =>
                    setFilters((f) => ({ ...f, levelCode: level.code }))
                  }
                >
                  <i className={`${level.icon ?? 'ri-flag-line'} mr-0.5`} aria-hidden />
                  {level.label}
                </FilterChip>
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {STATE_FILTERS.map((sf) => (
                <FilterChip
                  key={sf.value}
                  active={filters.state === sf.value}
                  onClick={() => setFilters((f) => ({ ...f, state: sf.value }))}
                >
                  {sf.label}
                </FilterChip>
              ))}
            </div>
          </div>

          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            {loading && items.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-foreground-500">Cargando cola…</p>
            )}
            {!loading && paginationProps.paginatedData.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-100 text-foreground-400">
                  <i className="ri-inbox-line text-xl" aria-hidden />
                </span>
                <p className="text-sm font-medium text-foreground-600">Sin registros</p>
                <p className="text-xs text-foreground-400">
                  No hay urgencias que coincidan con los filtros.
                </p>
              </div>
            )}
            {paginationProps.paginatedData.map((e) => {
              const isSelected = selectedId === e.encounterId;
              const accent = accentForEncounter(scale, e);
              const st = estadoConfig[e.state] ?? estadoConfig.abierto;
              const waitMin = waitMinutesSince(e.arrivalAtUtc, now);
              const triageLabel = triageBadgeLabel(scale, e);

              return (
                <button
                  key={e.encounterId}
                  type="button"
                  onClick={() =>
                    selectEncounter(isSelected ? '' : e.encounterId)
                  }
                  data-testid={`fila-encuentro-${e.turnNumber}`}
                  className={`w-full cursor-pointer border-b border-secondary-100 text-left transition-base last:border-b-0 ${
                    isSelected ? 'bg-primary-50/60' : 'hover:bg-secondary-50/40'
                  }`}
                >
                  <div className="px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-shrink-0 flex-col items-center gap-1 pt-0.5">
                        <span
                          className={`h-3 w-3 rounded-full ${accent.dot} ${
                            e.state === 'abierto' ? 'animate-pulse' : ''
                          }`}
                        />
                        <span className="font-mono text-[10px] font-bold tabular-nums text-foreground-500">
                          {e.turnNumber}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground-900">
                            {encounterDisplayName(e)}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium ${st.className}`}
                          >
                            {st.label}
                          </span>
                        </div>
                        <p className="text-2xs text-foreground-500">
                          {e.identificationState ?? 'identidad en progreso'}
                        </p>
                        <p
                          className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium ${accent.badge} ${accent.text}`}
                        >
                          <i
                            className={`${levelIcon(scale, e)} ${accent.iconColor}`}
                            aria-hidden
                          />
                          {triageLabel}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="flex items-center gap-1 text-2xs text-foreground-400">
                            <i className="ri-time-line" aria-hidden />
                            {formatArrivalLocal(e.arrivalAtUtc)}
                          </span>
                          {e.state !== 'cerrado' && (
                            <span className={`text-2xs ${waitTimeTextClass(waitMin)}`}>
                              <i className="ri-hourglass-line mr-0.5" aria-hidden />
                              {formatWaitLabel(waitMin)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <PaginationControls {...paginationProps} setCurrentPage={setCurrentPage} />
        </Card>

        <div className="min-w-0 w-full flex-1">
          {selected ? (
            <AtencionUrgenciaPanel
              key={selected.encounterId}
              encounter={selected}
              triageScale={scale}
              onUpdated={(e) => {
                upsertLocal(e);
                if (e.encounterId === selectedId) setSelectedFallback(e);
                void refresh();
              }}
            />
          ) : (
            <Card>
              <div className="flex flex-col items-center gap-4 py-20 text-foreground-400">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100">
                  <i className="ri-heart-pulse-line text-3xl" aria-hidden />
                </span>
                <div className="max-w-sm text-center">
                  <p className="mb-1 text-base font-medium text-foreground-600">
                    Selecciona una urgencia
                  </p>
                  <p className="text-sm">
                    Elige un episodio del panel izquierdo o registra un nuevo ingreso.
                  </p>
                </div>
              </div>
            </Card>
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

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] transition-base ${
        active
          ? 'border-primary-300 bg-primary-100 text-primary-700'
          : 'border-secondary-200 bg-secondary-100 text-foreground-600 hover:border-secondary-300'
      }`}
    >
      {children}
    </button>
  );
}
