import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAuditByActor, listAuditBySubject, type AuditEventDto } from '@/api/audit';
import { mensajeDeFalla, type ApiFailure } from '@/api/errors';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import CargandoPantalla from '@/components/feature/CargandoPantalla';
import SortableTh from '@/components/feature/SortableTh';
import { useSort } from '@/hooks/useSort';

type ModoConsulta = 'actor' | 'sujeto';

/**
 * Auditoría contra API real. Requiere enlace; no se cachea offline (plan M2).
 * Permiso provisional: admin / SuperAdmin (pregunta abierta N / doc 06 §19).
 */
export default function Auditoria() {
  const { user } = useAuth();
  const [modo, setModo] = useState<ModoConsulta>('actor');
  const [idConsulta, setIdConsulta] = useState('');
  const [eventos, setEventos] = useState<AuditEventDto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [buscado, setBuscado] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 12;

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

    setCargando(true);
    setFailure(null);
    setBuscado(true);

    const res =
      modo === 'actor' ? await listAuditByActor(id) : await listAuditBySubject(id);

    setCargando(false);

    if (!res.success) {
      setEventos([]);
      setFailure(res.failure ?? { kind: 'error_servidor' });
      return;
    }

    setEventos(res.data ?? []);
    setPage(1);
  }, [idConsulta, modo]);

  const sorters = useMemo(
    () => ({
      recordedAtUtc: (a: AuditEventDto, b: AuditEventDto) =>
        a.recordedAtUtc.localeCompare(b.recordedAtUtc),
      eventType: (a: AuditEventDto, b: AuditEventDto) => a.eventType.localeCompare(b.eventType),
      entityName: (a: AuditEventDto, b: AuditEventDto) => a.entityName.localeCompare(b.entityName),
      actorUserId: (a: AuditEventDto, b: AuditEventDto) => a.actorUserId.localeCompare(b.actorUserId),
    }),
    [],
  );

  const { sortedData, sortKey, direction, toggleSort } = useSort(
    eventos,
    sorters,
    'recordedAtUtc',
    'desc',
  );

  const totalPages = Math.max(1, Math.ceil(sortedData.length / perPage));
  const paged = sortedData.slice((page - 1) * perPage, page * perPage);
  const msg = failure ? mensajeDeFalla(failure) : null;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-secondary-200 bg-background-50 px-4 py-3 text-sm text-foreground-700">
        Consulta de auditoría con enlace al servidor. No se almacena en caché offline.
        Acceso provisional: roles <strong>admin</strong> / SuperAdmin (modelo granular pendiente,
        pregunta abierta N).
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end flex-wrap">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-foreground-500">Consultar por</span>
          <select
            value={modo}
            onChange={(e) => setModo(e.target.value as ModoConsulta)}
            className="px-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 cursor-pointer"
          >
            <option value="actor">Actor (usuario)</option>
            <option value="sujeto">Sujeto de atención</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm flex-1 min-w-[240px]">
          <span className="text-foreground-500">
            {modo === 'actor' ? 'UserId' : 'SubjectId'} (GUID)
          </span>
          <input
            type="text"
            value={idConsulta}
            onChange={(e) => setIdConsulta(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            className="w-full px-3 py-2.5 text-sm font-mono bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <Button type="button" onClick={() => void consultar()} disabled={cargando}>
          Consultar
        </Button>
      </div>

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

      {cargando ? (
        <CargandoPantalla />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-200 text-left">
                  <SortableTh
                    label="Registrado (UTC)"
                    sortKey="recordedAtUtc"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <SortableTh
                    label="Tipo"
                    sortKey="eventType"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <SortableTh
                    label="Entidad"
                    sortKey="entityName"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <SortableTh
                    label="Actor"
                    sortKey="actorUserId"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <th className="px-5 py-2 text-xs font-semibold text-foreground-500 uppercase tracking-wider">
                    Detalle
                  </th>
                  <th className="px-5 py-2 text-xs font-semibold text-foreground-500 uppercase tracking-wider">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {!buscado ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-foreground-400">
                      Indica un identificador y pulsa Consultar. Los datos vienen del API real.
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-foreground-400">
                      No hay eventos de auditoría para ese criterio.
                    </td>
                  </tr>
                ) : (
                  paged.map((e) => (
                    <tr key={e.auditEventId} className="hover:bg-secondary-50/50 transition-base">
                      <td className="px-5 py-2 text-foreground-600 text-xs whitespace-nowrap font-mono">
                        {e.recordedAtUtc}
                      </td>
                      <td className="px-5 py-2">
                        <Badge variant="secondary" size="sm">
                          {e.eventType}
                        </Badge>
                      </td>
                      <td className="px-5 py-2 text-foreground-600 text-xs">
                        {e.entityName}
                        <span className="block font-mono text-foreground-400">{e.entityId}</span>
                      </td>
                      <td className="px-5 py-2 text-xs font-mono text-foreground-700">
                        {e.actorUserId}
                      </td>
                      <td className="px-5 py-2 text-foreground-700 text-xs max-w-[280px] truncate">
                        {e.detailJson ?? '—'}
                      </td>
                      <td className="px-5 py-2 text-foreground-500 text-xs font-mono">
                        {e.ipAddress ?? '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {buscado && sortedData.length > perPage && (
            <div className="flex items-center justify-between px-5 py-2 border-t border-secondary-200">
              <span className="text-xs text-foreground-500">
                Página {page} de {totalPages} · {sortedData.length} resultados
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-secondary-200 text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-secondary-200 text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
