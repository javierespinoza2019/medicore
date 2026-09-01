import { useState, useMemo, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface UseSortResult<T> {
  sortedData: T[];
  sortKey: string | null;
  direction: SortDirection;
  toggleSort: (key: string) => void;
}

/**
 * Hook reutilizable para ordenar una lista por columnas.
 * Recibe los datos y un mapa de comparadores por columna.
 */
export function useSort<T>(
  data: T[],
  sorters: Record<string, (a: T, b: T) => number>,
  initialKey?: string,
  initialDirection: SortDirection = 'asc',
): UseSortResult<T> {
  const [sortKey, setSortKey] = useState<string | null>(initialKey ?? null);
  const [direction, setDirection] = useState<SortDirection>(initialDirection);

  const toggleSort = useCallback((key: string) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        return key;
      }
      setDirection('asc');
      return key;
    });
  }, []);

  const sortedData = useMemo(() => {
    if (!sortKey || !sorters[sortKey]) return data;
    const sorted = [...data].sort(sorters[sortKey]);
    return direction === 'desc' ? sorted.reverse() : sorted;
  }, [data, sortKey, direction, sorters]);

  return { sortedData, sortKey, direction, toggleSort };
}