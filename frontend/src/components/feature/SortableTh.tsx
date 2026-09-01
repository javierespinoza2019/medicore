import type { SortDirection } from '@/hooks/useSort';

interface SortableThProps {
  label: string;
  sortKey: string;
  activeKey: string | null;
  direction: SortDirection | null;
  onSort: (key: string) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

/**
 * Encabezado de columna de tabla clickeable para ordenar.
 * Muestra una flecha indicando el estado del ordenamiento.
 */
export default function SortableTh({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = 'left',
  className = '',
}: SortableThProps) {
  const isActive = activeKey === sortKey;
  const icon = !isActive
    ? 'ri-arrow-up-down-line'
    : direction === 'asc'
      ? 'ri-arrow-up-line'
      : 'ri-arrow-down-line';

  const justifyClass =
    align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';

  return (
    <th className={`px-5 py-2 ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-sort={!isActive ? 'none' : direction === 'asc' ? 'ascending' : 'descending'}
        className={`w-full flex items-center gap-1 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-base text-xs font-semibold ${justifyClass} ${
          isActive ? 'text-foreground-900' : 'text-foreground-500 hover:text-foreground-700'
        }`}
      >
        <span>{label}</span>
        <span className="w-3 h-3 flex items-center justify-center shrink-0" aria-hidden="true">
          <i className={`${icon} text-2xs`}></i>
        </span>
      </button>
    </th>
  );
}