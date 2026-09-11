/**
 * Auditoría — layout Readdy (toolbar + tabla) sobre consulta real por actor/sujeto.
 * Sin bitácora global ni campo «resultado» inventado.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  labelEventType,
  listAuditByActor,
  listAuditBySubject,
  type AuditEventDto,
} from '@/api/audit';
import { mensajeDeFalla, type ApiFailure } from '@/api/errors';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import SortableTh from '@/components/feature/SortableTh';
import { useSort } from '@/hooks/useSort';

type ModoConsulta = 'actor' | 'sujeto';

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultFromLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  d.setHours(0, 0, 0, 0);
  return toLocalInputValue(d);
}

function defaultToLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 1);
  return toLocalInputValue(d);
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function detailPreview(json: string | null): string {
  if (!json?.trim()) return '—';
  try {
    const o = JSON.parse(json) as unknown;
    if (o && typeof o === 'object') {
      const entries = Object.entries(o as Record<string, unknown>).slice(0, 3);
      return entries.map(([k, v]) => `${k}: ${String(v)}`).join(' · ') || json;
    }
  } catch {
    /* texto plano */
  }
  return json.length > 80 ? `${json.slice(0, 80)}…` : json;
}

export default function Auditoria() {
  const { user } = useAuth();
  const [modo, setModo] = useState<ModoConsulta>('actor');
  const [idConsulta, setIdConsulta] = useState('');
  const [fromLocal, setFromLocal] = useState(defaultFromLocal);
  const [toLocal, setToLocal] = useState(defaultToLocal);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('todos');
  const [filterEntity, setFilterEntity] = useState('todas');
  const [eventos, setEventos] = useState<AuditEventDto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [buscado, setBuscado] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 12;
  const [autoTried, setAutoTried] = useState(false);

  useEffect(() => {
    if (user?.id && !idConsulta) {
      setIdConsulta(user.id);
    }
  }, [user?.id, idConsulta]);

  const consultar = useCallback(async () => {
    const id = idConsulta.trim();
    if (!id) {
      setFailure({ kind: 'solicitud_invalida', apiMessage: 'Indica un identificador GUID.' });
      return;
    }

    const fromUtc = new Date(fromLocal).toISOString();
    const toUtc = new Date(toLocal).toISOString();
    if (Number.isNaN(Date.parse(fromUtc)) || Number.isNaN(Date.parse(toUtc))) {
      setFailure({ kind: 'solicitud_invalida', apiMessage: 'Rango de fechas inválido.' });
      return;
    }
    if (fromUtc > toUtc) {
      setFailure({
        kind: 'solicitud_invalida',
        apiMessage: 'La fecha inicial no puede ser posterior a la final.',
      });
      return;
    }

    setCargando(true);
    setFailure(null);
    setBuscado(true);

    const res =
      modo === 'actor'
        ? await listAuditByActor(id, fromUtc, toUtc)
        : await listAuditBySubject(id, fromUtc, toUtc);

    setCargando(false);

    if (!res.success) {
      setEventos([]);
      setFailure(res.failure ?? { kind: 'error_servidor' });
      return;
    }

    setEventos(res.data ?? []);
    setFilterType('todos');
    setFilterEntity('todas');
    setSearch('');
    setPage(1);
  }, [idConsulta, modo, fromLocal, toLocal]);

  // Primera carga: bitácora del usuario en sesión (acercar UX a “lista al abrir”).
  useEffect(() => {
    if (autoTried || !user?.id || idConsulta !== user.id) return;
    setAutoTried(true);
    void consultar();
  }, [autoTried, user?.id, idConsulta, consultar]);

  const eventTypes = useMemo(
    () => [...new Set(eventos.map((e) => e.eventType))].sort((a, b) => a.localeCompare(b)),
    [eventos],
  );
  const entityNames = useMemo(
    () => [...new Set(eventos.map((e) => e.entityName))].sort((a, b) => a.localeCompare(b)),
    [eventos],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return eventos.filter((e) => {
      const actor = (e.actorDisplayName ?? e.actorUserName ?? e.actorUserId).toLowerCase();
      const detail = (e.detailJson ?? '').toLowerCase();
      const matchSearch =
        !q ||
        actor.includes(q) ||
        detail.includes(q) ||
        e.entityName.toLowerCase().includes(q) ||
        e.eventType.toLowerCase().includes(q) ||
        labelEventType(e.eventType).toLowerCase().includes(q);
      const matchType = filterType === 'todos' || e.eventType === filterType;
      const matchEnt = filterEntity === 'todas' || e.entityName === filterEntity;
      return matchSearch && matchType && matchEnt;
    });
  }, [eventos, filterType, filterEntity, search]);

  const sorters = useMemo(
    () => ({
      recordedAtUtc: (a: AuditEventDto, b: AuditEventDto) =>
        a.recordedAtUtc.localeCompare(b.recordedAtUtc),
      actorUserId: (a: AuditEventDto, b: AuditEventDto) =>
        (a.actorDisplayName ?? a.actorUserId).localeCompare(b.actorDisplayName ?? b.actorUserId),
      eventType: (a: AuditEventDto, b: AuditEventDto) => a.eventType.localeCompare(b.eventType),
      entityName: (a: AuditEventDto, b: AuditEventDto) => a.entityName.localeCompare(b.entityName),
      ipAddress: (a: AuditEventDto, b: AuditEventDto) =>
        (a.ipAddress ?? '').localeCompare(b.ipAddress ?? ''),
    }),
    [],
  );

  const { sortedData, sortKey, direction, toggleSort } = useSort(
    filtered,
    sorters,
    'recordedAtUtc',
    'desc',
  );

  useEffect(() => {
    setPage(1);
  }, [search, filterType, filterEntity]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / perPage));
  const paged = sortedData.slice((page - 1) * perPage, page * perPage);
  const msg = failure ? mensajeDeFalla(failure) : null;

  const hasClientFilters =
    !!search.trim() || filterType !== 'todos' || filterEntity !== 'todas';

  function clearClientFilters() {
    setSearch('');
    setFilterType('todos');
    setFilterEntity('todas');
    setPage(1);
  }

  const pageButtons = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const set = new Set([1, totalPages, page, page - 1, page + 1].filter((p) => p >= 1 && p <= totalPages));
    return [...set].sort((a, b) => a - b);
  }, [totalPages, page]);

  return (
    <div className="space-y-3" data-testid="page-seguridad-auditoria">
      {/* Consulta API — fila secundaria compacta (contrato real: sin listado global) */}
      <div className="flex flex-col gap-2 rounded-lg border border-secondary-200/70 bg-background-50 px-3 py-2.5 lg:flex-row lg:flex-wrap lg:items-end">
        <label className="flex min-w-[140px] flex-col gap-0.5 text-xs">
          <span className="text-foreground-500">Consultar por</span>
          <select
            value={modo}
            onChange={(e) => setModo(e.target.value as ModoConsulta)}
            className="cursor-pointer rounded-lg border border-secondary-200 bg-background-50 px-2.5 py-2 text-sm outline-none focus:border-primary-400"
          >
            <option value="actor">Actor (usuario)</option>
            <option value="sujeto">Sujeto de atención</option>
          </select>
        </label>
        <label className="flex min-w-[220px] flex-1 flex-col gap-0.5 text-xs">
          <span className="text-foreground-500">
            {modo === 'actor' ? 'UserId' : 'SubjectId'} (GUID)
          </span>
          <input
            type="text"
            value={idConsulta}
            onChange={(e) => setIdConsulta(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            className="w-full rounded-lg border border-secondary-200 bg-background-50 px-2.5 py-2 font-mono text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <label className="flex flex-col gap-0.5 text-xs">
          <span className="text-foreground-500">Desde</span>
          <input
            type="datetime-local"
            value={fromLocal}
            onChange={(e) => setFromLocal(e.target.value)}
            className="rounded-lg border border-secondary-200 bg-background-50 px-2.5 py-2 text-sm outline-none focus:border-primary-400"
          />
        </label>
        <label className="flex flex-col gap-0.5 text-xs">
          <span className="text-foreground-500">Hasta</span>
          <input
            type="datetime-local"
            value={toLocal}
            onChange={(e) => setToLocal(e.target.value)}
            className="rounded-lg border border-secondary-200 bg-background-50 px-2.5 py-2 text-sm outline-none focus:border-primary-400"
          />
        </label>
        <Button type="button" size="sm" onClick={() => void consultar()} disabled={cargando}>
          {cargando ? 'Consultando…' : 'Consultar'}
        </Button>
      </div>

      {/* Toolbar Readdy */}
      <div className="flex flex-col flex-wrap items-start gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-64">
          <span className="pointer-events-none absolute left-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-foreground-400">
            <i className="ri-search-line text-sm" />
          </span>
          <input
            type="search"
            placeholder="Buscar en auditoría..."
            value={search}
            disabled={!buscado || eventos.length === 0}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar en resultados de auditoría"
            className="w-full rounded-lg border border-secondary-200 bg-background-50 py-2.5 pl-10 pr-3 text-sm text-foreground-900 outline-none transition-base placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-secondary-50 disabled:text-foreground-400"
          />
        </div>
        <select
          value={filterEntity}
          disabled={!buscado || eventos.length === 0}
          onChange={(e) => setFilterEntity(e.target.value)}
          aria-label="Filtrar por módulo / entidad"
          className="cursor-pointer rounded-lg border border-secondary-200 bg-background-50 px-3 py-2.5 text-sm text-foreground-900 outline-none focus:border-primary-400 disabled:cursor-not-allowed disabled:bg-secondary-50 disabled:text-foreground-400"
        >
          <option value="todas">Todos los módulos</option>
          {entityNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <select
          value={filterType}
          disabled={!buscado || eventos.length === 0}
          onChange={(e) => setFilterType(e.target.value)}
          aria-label="Filtrar por acción / tipo"
          className="cursor-pointer rounded-lg border border-secondary-200 bg-background-50 px-3 py-2.5 text-sm text-foreground-900 outline-none focus:border-primary-400 disabled:cursor-not-allowed disabled:bg-secondary-50 disabled:text-foreground-400"
        >
          <option value="todos">Todas las acciones</option>
          {eventTypes.map((t) => (
            <option key={t} value={t}>
              {labelEventType(t)}
            </option>
          ))}
        </select>
        <select
          disabled
          title="Sin columna resultado en AuditEvent (no se inventa éxito/error)"
          aria-label="Resultado no disponible"
          className="cursor-not-allowed rounded-lg border border-secondary-200 bg-secondary-50 px-3 py-2.5 text-sm text-foreground-400"
        >
          <option>Resultado (N/D)</option>
        </select>
        {hasClientFilters && (
          <button
            type="button"
            onClick={clearClientFilters}
            className="cursor-pointer whitespace-nowrap rounded-lg border border-red-200 px-2.5 py-2 text-xs font-medium text-red-500 transition-base hover:bg-red-500/10"
          >
            Limpiar
          </button>
        )}
      </div>

      <p className="text-2xs text-foreground-400">
        Layout Readdy · sin bitácora global del tenant (API por actor/sujeto). Columna Resultado del
        prototipo = N/D. Permiso <code className="text-2xs">canVerAuditoria</code>.
      </p>

      {msg && (
        <div
          role="alert"
          className={`rounded-lg border px-4 py-3 text-sm ${
            msg.esEnlace
              ? 'border-amber-300 bg-amber-50 text-amber-950'
              : failure?.kind === 'sin_permiso'
                ? 'border-red-300 bg-red-50 text-red-950'
                : 'border-secondary-300 bg-secondary-50 text-foreground-800'
          }`}
        >
          <p className="font-medium">{msg.titulo}</p>
          <p className="mt-1 text-xs opacity-90">{msg.detalle}</p>
        </div>
      )}

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-secondary-200 text-left">
                <SortableTh
                  label="Fecha / Hora"
                  sortKey="recordedAtUtc"
                  activeKey={sortKey}
                  direction={direction}
                  onSort={toggleSort}
                />
                <SortableTh
                  label="Usuario"
                  sortKey="actorUserId"
                  activeKey={sortKey}
                  direction={direction}
                  onSort={toggleSort}
                />
                <SortableTh
                  label="Acción"
                  sortKey="eventType"
                  activeKey={sortKey}
                  direction={direction}
                  onSort={toggleSort}
                />
                <SortableTh
                  label="Módulo"
                  sortKey="entityName"
                  activeKey={sortKey}
                  direction={direction}
                  onSort={toggleSort}
                />
                <th className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-foreground-500">
                  Detalle
                </th>
                <th
                  className="px-5 py-2 text-center text-xs font-semibold uppercase tracking-wider text-foreground-400"
                  title="Sin campo en AuditEvent"
                >
                  Resultado
                </th>
                <SortableTh
                  label="IP"
                  sortKey="ipAddress"
                  activeKey={sortKey}
                  direction={direction}
                  onSort={toggleSort}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-foreground-500">
                    Cargando eventos…
                  </td>
                </tr>
              ) : !buscado ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-foreground-400">
                    <div className="flex flex-col items-center gap-2">
                      <span className="flex h-10 w-10 items-center justify-center">
                        <i className="ri-file-search-line text-2xl" aria-hidden />
                      </span>
                      <p className="text-sm">Indica un identificador y pulsa Consultar</p>
                    </div>
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-foreground-400">
                    <div className="flex flex-col items-center gap-2">
                      <span className="flex h-10 w-10 items-center justify-center">
                        <i className="ri-file-search-line text-2xl" aria-hidden />
                      </span>
                      <p className="text-sm">No se encontraron registros de auditoría</p>
                      {hasClientFilters && (
                        <button
                          type="button"
                          onClick={clearClientFilters}
                          className="cursor-pointer text-xs text-primary-500 hover:text-primary-600"
                        >
                          Limpiar filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((e) => (
                  <tr key={e.auditEventId} className="transition-base hover:bg-secondary-50/50">
                    <td className="whitespace-nowrap px-5 py-2 font-mono text-xs text-foreground-600">
                      {formatWhen(e.recordedAtUtc)}
                    </td>
                    <td className="px-5 py-2">
                      <div>
                        <p className="text-sm font-medium text-foreground-900">
                          {e.actorDisplayName ?? 'Usuario no disponible'}
                        </p>
                        <p className="font-mono text-xs text-foreground-400">
                          {e.actorUserName ?? e.actorUserId}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-2">
                      <Badge variant="secondary" size="sm">
                        {labelEventType(e.eventType)}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-2 text-xs text-foreground-600">
                      {e.entityName}
                    </td>
                    <td
                      className="max-w-[280px] px-5 py-2 text-xs text-foreground-700"
                      title={e.detailJson ?? undefined}
                    >
                      {detailPreview(e.detailJson)}
                    </td>
                    <td className="px-5 py-2 text-center">
                      <Badge variant="secondary" size="sm">
                        N/D
                      </Badge>
                    </td>
                    <td className="px-5 py-2 font-mono text-xs text-foreground-500">
                      {e.ipAddress ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {buscado && sortedData.length > 0 && (
          <div className="flex items-center justify-between border-t border-secondary-200 px-5 py-2">
            <span className="text-xs text-foreground-500">
              Página {page} de {totalPages} · {sortedData.length} resultados
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="cursor-pointer rounded-md border border-secondary-200 px-3 py-1.5 text-xs font-medium text-foreground-700 transition-base hover:bg-secondary-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              {pageButtons.map((p, idx) => {
                const prev = pageButtons[idx - 1];
                const showGap = prev != null && p - prev > 1;
                return (
                  <span key={p} className="flex items-center gap-2">
                    {showGap && <span className="text-xs text-foreground-400">…</span>}
                    <button
                      type="button"
                      onClick={() => setPage(p)}
                      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-xs font-medium transition-base ${
                        p === page
                          ? 'bg-primary-500 text-white'
                          : 'text-foreground-600 hover:bg-secondary-100'
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="cursor-pointer rounded-md border border-secondary-200 px-3 py-1.5 text-xs font-medium text-foreground-700 transition-base hover:bg-secondary-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
