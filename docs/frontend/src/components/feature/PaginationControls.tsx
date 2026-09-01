import { useState } from 'react';

interface PaginationControlsProps {
  pageSize: number;
  setPageSize: (size: number) => void;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  from: number;
  to: number;
  goToNext: () => void;
  goToPrev: () => void;
  setCurrentPage: (page: number) => void;
}

export default function PaginationControls({
  pageSize,
  setPageSize,
  currentPage,
  totalPages,
  totalItems,
  from,
  to,
  goToNext,
  goToPrev,
  setCurrentPage,
}: PaginationControlsProps) {
  const [inputPage, setInputPage] = useState('');

  if (totalItems === 0) return null;

  const handlePageInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const p = Number(inputPage);
      if (p >= 1 && p <= totalPages) {
        setCurrentPage(p);
      }
      setInputPage('');
    }
  };

  const pageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-secondary-200 bg-secondary-50/50">
      <div className="flex items-center gap-2">
        <span className="text-2xs text-foreground-500">Renglones:</span>
        <div className="flex items-center gap-0.5 bg-secondary-100 rounded-lg p-0.5">
          {[10, 25, 50].map((size) => (
            <button
              key={size}
              onClick={() => setPageSize(size)}
              className={`px-2 py-1 text-2xs font-medium rounded-md cursor-pointer transition-base whitespace-nowrap ${
                pageSize === size
                  ? 'bg-background-50 text-foreground-900 shadow-sm'
                  : 'text-foreground-500 hover:text-foreground-700'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
        <span className="text-2xs text-foreground-400 ml-1">
          {from}-{to} de {totalItems}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={goToPrev}
          disabled={currentPage === 1}
          className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-500 hover:text-foreground-900 hover:bg-secondary-200 disabled:opacity-40 disabled:cursor-not-allowed transition-base cursor-pointer"
          aria-label="Página anterior"
        >
          <i className="ri-arrow-left-s-line"></i>
        </button>

        {pageNumbers().map((p, idx) =>
          p === '...' ? (
            <span key={`dots-${idx}`} className="px-1 text-2xs text-foreground-400">...</span>
          ) : (
            <button
              key={p}
              onClick={() => setCurrentPage(p as number)}
              className={`min-w-[28px] h-7 flex items-center justify-center rounded-md text-2xs font-medium cursor-pointer transition-base ${
                currentPage === p
                  ? 'bg-primary-500 text-white'
                  : 'text-foreground-600 hover:bg-secondary-200'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={goToNext}
          disabled={currentPage === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-500 hover:text-foreground-900 hover:bg-secondary-200 disabled:opacity-40 disabled:cursor-not-allowed transition-base cursor-pointer"
          aria-label="Página siguiente"
        >
          <i className="ri-arrow-right-s-line"></i>
        </button>

        <div className="flex items-center gap-1 ml-2">
          <input
            type="number"
            min={1}
            max={totalPages}
            placeholder="#"
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            onKeyDown={handlePageInput}
            className="w-9 h-7 text-center text-2xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
            aria-label="Ir a página"
          />
          <span className="text-2xs text-foreground-400">/ {totalPages}</span>
        </div>
      </div>
    </div>
  );
}