import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
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
  BIOLOGICAL_SEX_FILTER_OPTS,
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
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import PaginationControls from '@/components/feature/PaginationControls';
import SortableTh from '@/components/feature/SortableTh';

const SORTERS: Record<string, (a: SubjectListItemDto, b: SubjectListItemDto) => number> = {
  nombre: (a, b) => displayNameOf(a).localeCompare(displayNameOf(b), 'es'),
  expediente: (a, b) => (a.recordNumber ?? '').localeCompare(b.recordNumber ?? '', 'es'),
  alta: (a, b) => a.createdAtUtc.localeCompare(b.createdAtUtc),
};

/**
 * Padrón de sujetos (M3). Layout alineado al prototipo; datos vía API real.
 */
export default function Pacientes() {
  const navigate = useNavigate();
  const { sucursalActualId } = useAuth();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
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
    const res = await searchSubjects(search, includeUnidentified);
    if (!res.success || !res.data) {
      setError(mensajeDeFalla(res.failure).titulo || res.message || 'No se pudo cargar el padrón.');
      setItems([]);
    } else {
      setItems(res.data);
    }
    setLoading(false);
  }, [search, includeUnidentified]);

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

  const filtered = useMemo(
    () =>
      filterSubjectList(items, {
        sex: filtroSexo,
        identification: filtroIdentidad,
        branchId: filtroSucursal,
      }),
    [items, filtroSexo, filtroIdentidad, filtroSucursal],
  );

  const stats = useMemo(() => computeSubjectListStats(items), [items]);

  const { sortedData, sortKey, direction, toggleSort } = useSort(filtered, SORTERS, 'alta', 'desc');

  const pagination = usePagination(sortedData, 20);
  const { setCurrentPage, ...paginationProps } = pagination;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filtroSexo, filtroIdentidad, filtroSucursal, setCurrentPage]);

  function onBuscar(e?: FormEvent) {
    e?.preventDefault();
    setSearch(searchInput.trim());
  }

  function handleExport() {
    const rows = sortedData.map((s) => ({
      Expediente: s.recordNumber ?? '—',
      Nombre: displayNameOf(s),
      Identificación: identificationStateLabel(s.identificationState),
      CURP: s.curp ?? '—',
      Sexo: s.biologicalSex ?? 'no capturado',
      Sucursal: branchName(s.originBranchId),
      Alta: formatSubjectDate(s.createdAtUtc),
    }));
    exportToExcel(rows, `Pacientes_MediCore_${new Date().toISOString().split('T')[0]}`, 'Pacientes');
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground-900">Pacientes</h1>
          <p className="text-sm text-foreground-500">
            Padrón de sujetos · identidad progresiva (API M3)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={handleExport}>
            <i className="ri-file-excel-line mr-1" aria-hidden />
            Exportar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/pacientes/nuevo')}
            data-testid="btn-nuevo-paciente"
          >
            Nuevo paciente
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="ri-group-line" label="En resultados" value={stats.total} />
        <StatCard icon="ri-user-unfollow-line" label="No identificados" value={stats.noIdentificados} />
        <StatCard icon="ri-user-follow-line" label="Identificados" value={stats.identificados} />
        <StatCard icon="ri-id-card-line" label="Con CURP" value={stats.conCurp} />
      </div>

      <Card padding="md">
        <form onSubmit={(e) => onBuscar(e)} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Input
              label="Buscar"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Nombre, CURP, etiqueta, expediente…"
              data-testid="search-pacientes"
            />
          </div>
          <Select
            label="Sexo biológico"
            value={filtroSexo}
            onChange={(e) => setFiltroSexo(e.target.value)}
            options={BIOLOGICAL_SEX_FILTER_OPTS}
          />
          <Select
            label="Identidad"
            value={filtroIdentidad}
            onChange={(e) => setFiltroIdentidad(e.target.value as IdentificationStateFilter)}
            options={IDENTIFICATION_FILTER_OPTS}
          />
          <Select
            label="Sucursal"
            value={filtroSucursal}
            onChange={(e) => setFiltroSucursal(e.target.value)}
            options={[
              { value: '', label: 'Todas' },
              ...branches.map((b) => ({ value: b.branchId, label: b.name })),
            ]}
          />
          <label className="flex items-center gap-2 pb-2 text-sm text-foreground-600">
            <input
              type="checkbox"
              checked={includeUnidentified}
              onChange={(e) => setIncludeUnidentified(e.target.checked)}
            />
            Incluir no identificados
          </label>
          <Button type="submit" variant="secondary" size="sm">
            Buscar
          </Button>
        </form>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card padding="none">
        {loading ? (
          <p className="p-6 text-sm text-foreground-500">Cargando…</p>
        ) : paginationProps.paginatedData.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-foreground-600">No hay sujetos que coincidan.</p>
            <p className="mt-1 text-sm text-foreground-500">
              Sucursal sesión: {sucursalActualId ? branchName(sucursalActualId) : '—'}
            </p>
            <Button
              className="mt-4"
              variant="primary"
              size="sm"
              onClick={() => navigate('/app/pacientes/nuevo')}
            >
              Registrar sujeto
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto" data-testid="lista-pacientes">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-secondary-200 bg-secondary-50/80">
                  <tr>
                    <th className="px-5 py-2 text-xs font-semibold uppercase text-foreground-500">
                      Paciente
                    </th>
                    <SortableTh
                      label="Expediente"
                      sortKey="expediente"
                      activeKey={sortKey}
                      direction={direction}
                      onSort={toggleSort}
                    />
                    <th className="px-5 py-2 text-xs font-semibold uppercase text-foreground-500">
                      Identidad
                    </th>
                    <th className="px-5 py-2 text-xs font-semibold uppercase text-foreground-500">
                      Sucursal
                    </th>
                    <SortableTh
                      label="Alta"
                      sortKey="alta"
                      activeKey={sortKey}
                      direction={direction}
                      onSort={toggleSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {paginationProps.paginatedData.map((s) => {
                    const name = displayNameOf(s);
                    return (
                      <tr
                        key={s.subjectId}
                        className="cursor-pointer border-b border-secondary-100 transition-base hover:bg-secondary-50/60"
                        onClick={() => navigate(`/app/pacientes/${s.subjectId}`)}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={name} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground-900">{name}</p>
                              <p className="truncate text-xs text-foreground-500">
                                {s.curp ? `CURP ${s.curp}` : s.operationalLabel ?? '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 tabular-nums text-foreground-700">
                          {s.recordNumber ?? '—'}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            variant={
                              s.identificationState === 'no_identificado' ? 'warning' : 'success'
                            }
                            size="sm"
                          >
                            {identificationStateLabel(s.identificationState)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-foreground-600">
                          {branchName(s.originBranchId)}
                        </td>
                        <td className="px-5 py-3 text-foreground-600">
                          {formatSubjectDate(s.createdAtUtc)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-secondary-200 px-4 py-2">
              <PaginationControls {...paginationProps} setCurrentPage={setCurrentPage} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <Card padding="md" className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
        <i className={`${icon} text-lg`} aria-hidden />
      </span>
      <div>
        <p className="text-xl font-bold tabular-nums text-foreground-900">{value}</p>
        <p className="text-xs uppercase tracking-wide text-foreground-500">{label}</p>
      </div>
    </Card>
  );
}
