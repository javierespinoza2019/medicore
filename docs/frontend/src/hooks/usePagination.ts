import { useState, useMemo } from 'react';

export interface UsePaginationResult<T> {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  paginatedData: T[];
  totalItems: number;
  totalPages: number;
  from: number;
  to: number;
  goToNext: () => void;
  goToPrev: () => void;
}

export function usePagination<T>(data: T[], defaultPageSize = 10): UsePaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  const goToNext = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const goToPrev = () => setCurrentPage((p) => Math.max(p - 1, 1));

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    paginatedData,
    totalItems,
    totalPages,
    from,
    to,
    goToNext,
    goToPrev,
  };
}