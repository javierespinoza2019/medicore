import { useCallback, useEffect, useState } from 'react';
import {
  listEncounterQueue,
  type EncounterDto,
  type EncounterQueueDto,
} from '@/api/encounters';
import { listBranches, type BranchDto } from '@/api/branches';
import { useAuth } from '@/hooks/useAuth';
import { esFallaDeEnlace } from '@/api/errors';
import {
  formatCacheAge,
  getLiveQueueStatus,
  subscribeLiveQueue,
  subscribeLiveQueueStatus,
  type LiveQueueStatus,
} from '@/sync/liveQueue';

/** Resuelve GUID de sucursal: sesión puede traer id prototipo (suc1) o GUID real. */
const PROTO_BRANCH_CODE: Record<string, string> = {
  suc1: 'CENTRAL',
  suc2: 'NORTE',
  suc3: 'SUR',
};

/**
 * GUIDs seed demo (tenant demo) para contingencia sin catálogo de sucursales.
 * Evita bloquear ingreso (SC-19) si listBranches no alcanzó a cargar o el Core cayó.
 */
const PROTO_BRANCH_ID: Record<string, string> = {
  suc1: '22222222-2222-2222-2222-222222222222', // CENTRAL seed
  suc2: '22222222-2222-2222-2222-222222222002', // NORTE seed
  suc3: '22222222-2222-2222-2222-222222222003', // SUR seed
};

export function resolveBranchId(
  sucursalActualId: string | null,
  branches: BranchDto[],
): string | null {
  if (sucursalActualId && /^[0-9a-f-]{36}$/i.test(sucursalActualId)) {
    if (!branches.length) return sucursalActualId;
    const hit = branches.find((b) => b.branchId.toLowerCase() === sucursalActualId.toLowerCase());
    return hit?.branchId ?? sucursalActualId;
  }

  if (!branches.length) {
    return sucursalActualId ? (PROTO_BRANCH_ID[sucursalActualId] ?? null) : null;
  }

  const protoCode = sucursalActualId ? PROTO_BRANCH_CODE[sucursalActualId] : undefined;
  if (protoCode) {
    const byCode = branches.find((b) => b.code.toUpperCase() === protoCode);
    if (byCode) return byCode.branchId;
  }
  const central = branches.find((b) => b.code.toUpperCase() === 'CENTRAL');
  return central?.branchId ?? branches[0].branchId;
}

/**
 * Cola de urgencias desde API real (M4 + live M10).
 * Live = invalidación; la verdad sigue en API. Sin enlace: caché + antigüedad (SC-09).
 */
export function useEncounterQueue(includeClosed = false) {
  const { sucursalActualId } = useAuth();
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [queue, setQueue] = useState<EncounterQueueDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [liveStatus, setLiveStatus] = useState<LiveQueueStatus>(() => getLiveQueueStatus());
  const [ageTick, setAgeTick] = useState(0);

  const branchId = resolveBranchId(sucursalActualId, branches);

  useEffect(() => {
    void (async () => {
      const res = await listBranches(true);
      if (res.success && res.data) setBranches(res.data);
    })();
  }, []);

  useEffect(() => subscribeLiveQueueStatus(() => setLiveStatus(getLiveQueueStatus())), []);

  useEffect(() => {
    if (!fromCache || !fetchedAt) return;
    const id = window.setInterval(() => setAgeTick((n) => n + 1), 15_000);
    return () => window.clearInterval(id);
  }, [fromCache, fetchedAt]);

  const refresh = useCallback(async () => {
    if (!branchId) {
      setQueue(null);
      setFetchedAt(null);
      setFromCache(false);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await listEncounterQueue(branchId, includeClosed);
    setLoading(false);
    if (!res.success || !res.data) {
      const enlace = esFallaDeEnlace(res.failure);
      setError(res.message ?? 'No se pudo cargar la cola de urgencias.');
      if (enlace) {
        setFromCache(true);
      }
      return;
    }
    setQueue(res.data);
    setFetchedAt(new Date());
    setFromCache(false);
  }, [branchId, includeClosed]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Polling de respaldo: más lento si hay live; más frecuente sin empuje.
  useEffect(() => {
    const ms = liveStatus === 'conectado' ? 60_000 : 30_000;
    const id = window.setInterval(() => void refresh(), ms);
    return () => window.clearInterval(id);
  }, [refresh, liveStatus]);

  useEffect(() => {
    if (!branchId) return;
    return subscribeLiveQueue(branchId, () => {
      void refresh();
    });
  }, [branchId, refresh]);

  const upsertLocal = useCallback((item: EncounterDto) => {
    setQueue((prev) => {
      if (!prev) return prev;
      const rest = prev.items.filter((e) => e.encounterId !== item.encounterId);
      const items = [item, ...rest];
      return { ...prev, items, total: items.length };
    });
    setFetchedAt(new Date());
    setFromCache(false);
  }, []);

  // ageTick fuerza recálculo del texto de antigüedad mientras hay caché.
  const cacheAgeLabel =
    ageTick >= 0 && (fromCache || liveStatus === 'sin_enlace')
      ? formatCacheAge(fetchedAt)
      : liveStatus !== 'conectado' && fetchedAt
        ? formatCacheAge(fetchedAt)
        : null;

  const showStaleBanner =
    fromCache ||
    liveStatus === 'sin_enlace' ||
    (liveStatus !== 'conectado' && fetchedAt !== null && !loading);

  return {
    branchId,
    items: queue?.items ?? [],
    total: queue?.total ?? 0,
    allUnclassified: queue?.allUnclassified ?? true,
    loading,
    error,
    refresh,
    upsertLocal,
    fetchedAt,
    fromCache,
    liveStatus,
    cacheAgeLabel,
    showStaleBanner,
  };
}
