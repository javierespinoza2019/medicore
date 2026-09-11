/**
 * Padrón de sujetos (M3). Layout alineado a Readdy (ribbon + toolbar + filas grid);
 * datos vía API real — sin inventar contacto, última visita, médico ni alergias.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  displayNameOf,
  searchSubjects,
  type SubjectListItemDto,
} from '@/api/subjects';
import { listBranches, type BranchDto } from '@/api/branches';
import { useAuth } from '@/hooks/useAuth';
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { mensajeDeFalla } from '@/api/errors';
import { exportToExcel } from '@/utils/exportUtils';
import {
  ageFromBirthDate,
  BIOLOGICAL_SEX_FILTER_OPTS,
  biologicalSexShortLabel,
  computeSubjectListStats,
  filterSubjectList,
  formatSubjectDate,
  IDENTIFICATION_FILTER_OPTS,
  identificationStateLabel,
  type IdentificationStateFilter,
} from '@/utils/subjectPresentation';
import Avatar from '@/components/base/Avatar';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Select from '@/components/base/Select';
import PaginationControls from '@/components/feature/PaginationControls';

const NO_CAPTURADO = 'No capturado';

const DISABLED_FILTER_TITLE =
  'Sin dato en el padrón API (M3). No se inventa filtro del prototipo.';

const SORTERS: Record<string, (a: SubjectListItemDto, b: SubjectListItemDto) => number> = {
  nombre: (a, b) => displayNameOf(a).localeCompare(displayNameOf(b), 'es'),
  expediente: (a, b) => (a.recordNumber ?? '').localeCompare(b.recordNumber ?? '', 'es'),
  edad: (a, b) => (ageFromBirthDate(a.birthDate) ?? -1) - (ageFromBirthDate(b.birthDate) ?? -1),
  alta: (a, b) => a.createdAtUtc.localeCompare(b.createdAtUtc),
};

export default function Pacientes() {
  const navigate = useNavigate();
  const { sucursalActualId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [apiQuery, setApiQuery] = useState('');
  const [items, setItems] = useState<SubjectListItemDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeUnidentified, setIncludeUnidentified] = useState(true);
  const [filtroSexo, setFiltroSexo] = useState('');
  const [filtroIdentidad, setFiltroIdentidad] = useState<IdentificationStateFilter>('');
  const [filtroSucursal, setFiltroSucursal] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await searchSubjects(apiQuery, includeUnidentified);
    if (!res.success || !res.data) {
      setError(mensajeDeFalla(res.failure).titulo || res.message || 'No se pudo cargar el padrón.');
      setItems([]);
    } else {
      setItems(res.data);
    }
    setLoading(false);
  }, [apiQuery, includeUnidentified]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    void (async () => {
      const res = await listBranches(true);
      if (res.success && res.data) setBranches(res.data);
    })();
  }, []);

  const branchName = (id: string) =>
    branches.find((b) => b.branchId.toLowerCase() === id.toLowerCase())?.name ?? id.slice(0, 8);

  const filtered = useMemo(() => {
    const base = filterSubjectList(items, {
      sex: filtroSexo,
      identification: filtroIdentidad,
      branchId: filtroSucursal,
    });
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((s) => {
      const name = displayNameOf(s).toLowerCase();
      return (
        name.includes(q) ||
        (s.recordNumber ?? '').toLowerCase().includes(q) ||
        (s.curp ?? '').toLowerCase().includes(q) ||
        (s.operationalLabel ?? '').toLowerCase().includes(q)
      );
    });
  }, [items, filtroSexo, filtroIdentidad, filtroSucursal, searchQuery]);

  const stats = useMemo(() => computeSubjectListStats(items), [items]);

  const { sortedData, sortKey, direction, toggleSort } = useSort(filtered, SORTERS, 'alta', 'desc');

  const pagination = usePagination(sortedData, 20);
  const { setCurrentPage, ...paginationProps } = pagination;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filtroSexo, filtroIdentidad, filtroSucursal, setCurrentPage]);

  const hasActiveFilters =
    !!filtroSexo ||
    !!filtroIdentidad ||
    !!filtroSucursal ||
    !!searchQuery.trim() ||
    !!apiQuery.trim();

  function clearFilters() {
    setSearchQuery('');
    setApiQuery('');
    setFiltroSexo('');
    setFiltroIdentidad('');
    setFiltroSucursal('');
  }

  function commitApiSearch() {
    setApiQuery(searchQuery.trim());
  }

  function handleExport() {
    const rows = sortedData.map((s) => ({
      Expediente: s.recordNumber ?? '—',
      Nombre: displayNameOf(s),
      Identificación: identificationStateLabel(s.identificationState),
      CURP: s.curp ?? '—',
      Sexo: s.biologicalSex ?? 'no capturado',
      Edad: ageFromBirthDate(s.birthDate) ?? 'no capturado',
      Sucursal: branchName(s.originBranchId),
      Alta: formatSubjectDate(s.createdAtUtc),
    }));
    exportToExcel(rows, `Pacientes_MediCore_${new Date().toISOString().split('T')[0]}`, 'Pacientes');
  }

  const sortIcon = (key: string) => {
    if (sortKey !== key) return 'ri-arrow-up-down-line';
    return direction === 'asc' ? 'ri-arrow-up-line' : 'ri-arrow-down-line';
  };

  const sortAria = (key: string): 'none' | 'ascending' | 'descending' => {
    if (sortKey !== key) return 'none';
    return direction === 'asc' ? 'ascending' : 'descending';
  };

  return (
    <div className="space-y-3" data-testid="page-pacientes">
      {/* Actions — estilo Readdy: sin H1 hero */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          icon={<i className="ri-download-2-line" />}
          onClick={handleExport}
        >
          Exportar
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={<i className="ri-user-add-line" />}
          onClick={() => navigate('/app/pacientes/nuevo')}
          data-testid="btn-nuevo-paciente"
        >
          Nuevo Paciente
        </Button>
      </div>

      {/* Stats ribbon */}
      <div className="flex items-center gap-0 overflow-hidden rounded-lg border border-secondary-200/70 bg-background-50">
        <StatItem icon="ri-group-line" value={stats.total} label="Total" />
        <StatItem
          icon="ri-user-follow-line"
          value={stats.identificados}
          label="Identificados"
          color="text-emerald-600"
        />
        <StatItem
          icon="ri-user-unfollow-line"
          value={stats.noIdentificados}
          label="No ident."
          color="text-amber-600"
        />
        <StatItem
          icon="ri-id-card-line"
          value={stats.conCurp}
          label="Con CURP"
          color="text-accent-600"
          last
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 lg:flex-row">
        <div className="relative min-w-0 flex-1 lg:max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-foreground-400">
            <i className="ri-search-line text-sm" />
          </span>
          <input
            type="search"
            aria-label="Buscar pacientes"
            placeholder="Buscar por nombre, expediente, CURP o etiqueta…"
            value={searchQuery}
            data-testid="search-pacientes"
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitApiSearch();
              }
            }}
            className="w-full rounded-lg border border-secondary-200/70 bg-background-50 py-2 pl-10 pr-8 text-sm text-foreground-900 outline-none transition-base placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setApiQuery('');
              }}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 flex h-4 w-4 -translate-y-1/2 cursor-pointer items-center justify-center text-foreground-400 transition-base hover:text-foreground-600"
            >
              <i className="ri-close-line text-sm" aria-hidden />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="min-w-[130px]" title={DISABLED_FILTER_TITLE}>
            <Select
              options={[{ value: '', label: 'Estado (N/D)' }]}
              value=""
              onChange={() => undefined}
              disabled
            />
          </div>
          <div className="min-w-[130px]">
            <Select
              options={BIOLOGICAL_SEX_FILTER_OPTS}
              value={filtroSexo}
              onChange={(e) => setFiltroSexo(e.target.value)}
              aria-label="Filtrar por sexo biológico"
            />
          </div>
          <div className="min-w-[140px]" title={DISABLED_FILTER_TITLE}>
            <Select
              options={[{ value: '', label: 'Últ. visita (N/D)' }]}
              value=""
              onChange={() => undefined}
              disabled
            />
          </div>
          <div className="min-w-[150px]">
            <Select
              options={IDENTIFICATION_FILTER_OPTS}
              value={filtroIdentidad}
              onChange={(e) => setFiltroIdentidad(e.target.value as IdentificationStateFilter)}
              aria-label="Filtrar por identidad"
            />
          </div>
          <div className="min-w-[170px]">
            <Select
              options={[
                { value: '', label: 'Todas las sucursales' },
                ...branches.map((b) => ({ value: b.branchId, label: b.name })),
              ]}
              value={filtroSucursal}
              onChange={(e) => setFiltroSucursal(e.target.value)}
              aria-label="Filtrar por sucursal"
            />
          </div>
          <label className="flex items-center gap-1.5 whitespace-nowrap px-1 text-xs text-foreground-600">
            <input
              type="checkbox"
              checked={includeUnidentified}
              onChange={(e) => setIncludeUnidentified(e.target.checked)}
            />
            No ident.
          </label>
          <Button variant="secondary" size="sm" onClick={commitApiSearch}>
            Buscar API
          </Button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border border-red-200 px-2.5 py-2 text-xs font-medium text-red-500 transition-base hover:bg-red-500/10"
            >
              <i className="ri-filter-off-line text-2xs" aria-hidden />
              Limpiar
            </button>
          )}
        </div>
      </div>

      <p className="text-2xs text-foreground-400">
        Layout Readdy · contacto / última visita / médico / alergias / estado activo = sin campo en
        padrón (no inventados). Enter o «Buscar API» consulta el servidor.
        {sucursalActualId ? ` · Sesión: ${branchName(sucursalActualId)}` : ''}
      </p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card padding="none">
        <div className="hidden items-center gap-3 border-b border-secondary-200 bg-secondary-50/60 px-4 py-2 text-2xs font-semibold uppercase tracking-wider text-foreground-500 md:grid md:grid-cols-12">
          <SortHeader
            className="col-span-3"
            label="Paciente"
            sortKey="nombre"
            activeKey={sortKey}
            ariaSort={sortAria('nombre')}
            icon={sortIcon('nombre')}
            onSort={toggleSort}
          />
          <SortHeader
            className="col-span-1"
            label="Exp."
            sortKey="expediente"
            activeKey={sortKey}
            ariaSort={sortAria('expediente')}
            icon={sortIcon('expediente')}
            onSort={toggleSort}
          />
          <SortHeader
            className="col-span-1"
            label="Edad"
            sortKey="edad"
            activeKey={sortKey}
            ariaSort={sortAria('edad')}
            icon={sortIcon('edad')}
            onSort={toggleSort}
          />
          <div className="col-span-2">Contacto</div>
          <SortHeader
            className="col-span-1"
            label="Alta"
            sortKey="alta"
            activeKey={sortKey}
            ariaSort={sortAria('alta')}
            icon={sortIcon('alta')}
            onSort={toggleSort}
          />
          <div className="col-span-2">Sucursal</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-foreground-500">Cargando…</p>
        ) : paginationProps.paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-secondary-100">
              <i className="ri-user-search-line text-xl text-foreground-400" aria-hidden />
            </div>
            <h3 className="mb-1 text-base font-semibold text-foreground-800">Sin resultados</h3>
            <p className="max-w-sm text-center text-sm text-foreground-500">
              {hasActiveFilters
                ? 'No se encontraron sujetos con los filtros actuales.'
                : 'Aún no hay sujetos registrados. Crea el primero para comenzar.'}
            </p>
            {hasActiveFilters ? (
              <Button variant="ghost" size="sm" className="mt-4" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                icon={<i className="ri-user-add-line" />}
                onClick={() => navigate('/app/pacientes/nuevo')}
              >
                Nuevo Paciente
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-secondary-100" data-testid="lista-pacientes">
            {paginationProps.paginatedData.map((s) => {
              const name = displayNameOf(s);
              const sexShort = biologicalSexShortLabel(s.biologicalSex);
              const age = ageFromBirthDate(s.birthDate);
              const unidentified = s.identificationState === 'no_identificado';

              return (
                <div
                  key={s.subjectId}
                  className="group grid cursor-pointer grid-cols-1 items-center gap-3 px-4 py-1.5 transition-base hover:bg-secondary-50/50 md:grid-cols-12"
                  onClick={() => navigate(`/app/pacientes/${s.subjectId}`)}
                >
                  <div className="flex min-w-0 items-center gap-3 md:col-span-3">
                    <Avatar name={name} size="md" />
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground-900 transition-base group-hover:text-primary-600">
                        {name}
                      </span>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {sexShort ? (
                          <Badge
                            variant={sexShort === 'F' ? 'accent' : sexShort === 'M' ? 'info' : 'secondary'}
                            size="sm"
                          >
                            {sexShort}
                          </Badge>
                        ) : (
                          <span className="text-2xs text-foreground-400">Sexo {NO_CAPTURADO.toLowerCase()}</span>
                        )}
                        <Badge variant={unidentified ? 'warning' : 'success'} size="sm" dot>
                          {identificationStateLabel(s.identificationState)}
                        </Badge>
                        <span className="ml-1 text-2xs text-foreground-400 md:hidden">
                          {s.recordNumber ?? '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="hidden items-center md:col-span-1 md:flex">
                    <span className="font-mono text-sm text-foreground-500">
                      {s.recordNumber ?? '—'}
                    </span>
                  </div>

                  <div className="hidden items-center md:col-span-1 md:flex">
                    <span className="text-sm text-foreground-600">
                      {age != null ? `${age} a.` : '—'}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-col justify-center md:col-span-2">
                    <span className="truncate text-sm text-foreground-400">{NO_CAPTURADO}</span>
                    <span className="truncate text-2xs text-foreground-400">
                      {s.curp ? `CURP ${s.curp}` : s.operationalLabel ?? 'Sin CURP/etiqueta'}
                    </span>
                  </div>

                  <div className="hidden items-center md:col-span-1 md:flex">
                    <span className="whitespace-nowrap text-sm text-foreground-600">
                      {formatSubjectDate(s.createdAtUtc)}
                    </span>
                  </div>

                  <div className="hidden min-w-0 flex-col justify-center md:col-span-2 md:flex">
                    <span className="truncate text-sm text-foreground-400">
                      Médico: {NO_CAPTURADO.toLowerCase()}
                    </span>
                    <span className="truncate text-2xs text-foreground-500">
                      {branchName(s.originBranchId)}
                    </span>
                  </div>

                  <div className="hidden items-center justify-end gap-1 md:col-span-2 md:flex">
                    <button
                      type="button"
                      title="Abrir expediente"
                      aria-label="Abrir expediente"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/app/pacientes/${s.subjectId}`);
                      }}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-foreground-400 transition-base hover:bg-primary-50 hover:text-primary-600"
                    >
                      <i className="ri-folder-open-line text-sm" aria-hidden />
                    </button>
                    <button
                      type="button"
                      title="Agendar cita"
                      aria-label="Agendar cita"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/app/agenda?paciente=${s.subjectId}`);
                      }}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-foreground-400 transition-base hover:bg-accent-50 hover:text-accent-600"
                    >
                      <i className="ri-calendar-event-line text-sm" aria-hidden />
                    </button>
                    <button
                      type="button"
                      title="Editar en detalle (sin modal mock)"
                      aria-label="Ir a identidad del sujeto"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/app/pacientes/${s.subjectId}`);
                      }}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-foreground-400 transition-base hover:bg-secondary-100 hover:text-foreground-700"
                    >
                      <i className="ri-edit-line text-sm" aria-hidden />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && paginationProps.paginatedData.length > 0 && (
          <div className="border-t border-secondary-200 px-4 py-2">
            <PaginationControls {...paginationProps} setCurrentPage={setCurrentPage} />
          </div>
        )}
      </Card>
    </div>
  );
}

function StatItem({
  icon,
  value,
  label,
  color = 'text-foreground-900',
  last = false,
}: {
  icon: string;
  value: number;
  label: string;
  color?: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2.5 px-4 py-2.5 ${
        last ? '' : 'border-r border-secondary-200/70'
      }`}
    >
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-secondary-100 text-foreground-500">
        <i className={`${icon} text-base`} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className={`text-lg font-bold tabular-nums leading-tight ${color}`}>{value}</p>
        <p className="truncate text-2xs uppercase tracking-wide text-foreground-500">{label}</p>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  ariaSort,
  icon,
  onSort,
  className = '',
}: {
  label: string;
  sortKey: string;
  activeKey: string;
  ariaSort: 'none' | 'ascending' | 'descending';
  icon: string;
  onSort: (key: string) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`flex cursor-pointer select-none items-center gap-1 ${className}`}
      aria-sort={ariaSort}
      onClick={() => onSort(sortKey)}
    >
      {label}
      <span className="flex h-3 w-3 items-center justify-center" aria-hidden>
        <i className={`${icon} text-2xs ${activeKey === sortKey ? 'text-primary-600' : ''}`} />
      </span>
    </button>
  );
}
