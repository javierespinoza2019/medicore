import { useCallback, useEffect, useState } from 'react';
import {
  listEncounterQueue,
  type EncounterDto,
  type EncounterQueueDto,
} from '@/api/encounters';
import { listBranches, type BranchDto } from '@/api/branches';
import { useAuth } from '@/hooks/useAuth';
import { useDevice } from '@/hooks/DeviceProvider';
import { esFallaDeEnlace } from '@/api/errors';
import { resolveBranchId } from '@/utils/branchResolution';

export { resolveBranchId };
import {
  formatCacheAge,
  getLiveQueueStatus,
  subscribeLiveQueue,
  subscribeLiveQueueStatus,
  type LiveQueueStatus,
} from '@/sync/liveQueue';
import {
  encounterQueueCacheKey,
  getClinicalCache,
  putClinicalCache,
} from '@/sync/clinicalReadCache';

/**
 * Cola de urgencias desde API real (M4 + live M10).
 * Live = invalidación; la verdad sigue en API. Sin enlace: caché + antigüedad (SC-09).
 * Caché solo en dispositivo aprobado con AllowsOfflineQueue (doc 13 §3.4).
 */
export function useEncounterQueue(includeClosed = false) {
  const { sucursalActualId } = useAuth();
  const { allowsClinicalCache } = useDevice();
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
    const cacheKey = encounterQueueCacheKey(branchId, includeClosed);
    const res = await listEncounterQueue(branchId, includeClosed);
    setLoading(false);
    if (!res.success || !res.data) {
      const enlace = esFallaDeEnlace(res.failure);
      setError(res.message ?? 'No se pudo cargar la cola de urgencias.');
      if (enlace && allowsClinicalCache) {
        const cached = await getClinicalCache<EncounterQueueDto>(cacheKey);
        if (cached) {
          setQueue(cached.data);
          setFetchedAt(cached.fetchedAt);
          setFromCache(true);
          setError(null);
          return;
        }
        setFromCache(true);
      }
      return;
    }
    setQueue(res.data);
    setFetchedAt(new Date());
    setFromCache(false);
    if (allowsClinicalCache) {
      void putClinicalCache(cacheKey, res.data);
    }
  }, [allowsClinicalCache, branchId, includeClosed]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
