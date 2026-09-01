import { useState, useMemo } from 'react';
import { useSort } from '@/hooks/useSort';
import SortableTh from '@/components/feature/SortableTh';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';

interface AuditLog {
  id: number;
  usuario: string;
  rol: string;
  accion: string;
  modulo: string;
  detalle: string;
  resultado: 'exito' | 'error' | 'advertencia';
  ip: string;
  fecha: string;
}

const auditLogs: AuditLog[] = [
  { id: 1, usuario: 'Laura Torres', rol: 'Administrador', accion: 'Eliminar', modulo: 'Usuarios', detalle: 'Eliminó usuario Diana Cruz (recepcionista, Sucursal Sur)', resultado: 'exito', ip: '192.168.1.45', fecha: '2026-08-07 09:55' },
  { id: 2, usuario: 'Dr. Alejandro García', rol: 'Médico', accion: 'Crear', modulo: 'Recetas', detalle: 'Generó receta para María Fernanda López (EXP-2024-0001)', resultado: 'exito', ip: '192.168.1.12', fecha: '2026-08-07 09:40' },
  { id: 3, usuario: 'Dr. Alejandro García', rol: 'Médico', accion: 'Editar', modulo: 'Consultas', detalle: 'Finalizó consulta de Roberto Jiménez (EXP-2024-0004)', resultado: 'exito', ip: '192.168.1.12', fecha: '2026-08-07 09:35' },
  { id: 4, usuario: 'José Luis Ramírez', rol: 'Recepción', accion: 'Registrar', modulo: 'Recepción', detalle: 'Registró llegada de Daniela Ortiz (EXP-2024-0007)', resultado: 'exito', ip: '192.168.1.20', fecha: '2026-08-07 09:30' },
  { id: 5, usuario: 'Laura Torres', rol: 'Administrador', accion: 'Editar', modulo: 'Servicios', detalle: 'Actualizó precio de Consulta Pediátrica: $550 → $600', resultado: 'exito', ip: '192.168.1.45', fecha: '2026-08-07 09:25' },
  { id: 6, usuario: 'Carmen Vargas', rol: 'Enfermería', accion: 'Registrar', modulo: 'Triage', detalle: 'Registró signos vitales de Roberto Jiménez (EXP-2024-0004)', resultado: 'exito', ip: '192.168.1.33', fecha: '2026-08-07 09:15' },
  { id: 7, usuario: 'Dr. Alejandro García', rol: 'Médico', accion: 'Ver', modulo: 'Expediente', detalle: 'Abrió expediente de Roberto Jiménez (EXP-2024-0004)', resultado: 'exito', ip: '192.168.1.12', fecha: '2026-08-07 09:12' },
  { id: 8, usuario: 'Laura Torres', rol: 'Administrador', accion: 'Crear', modulo: 'Usuarios', detalle: 'Registró nuevo usuario Eduardo Ponce (Médico, Sucursal Norte)', resultado: 'exito', ip: '192.168.1.45', fecha: '2026-08-07 09:00' },
  { id: 9, usuario: 'Mónica Soto', rol: 'Caja', accion: 'Cobrar', modulo: 'Caja', detalle: 'Cobró $500 a María Fernanda López por Consulta General', resultado: 'exito', ip: '192.168.1.50', fecha: '2026-08-07 08:50' },
  { id: 10, usuario: 'Dr. Fernando Castillo', rol: 'Médico', accion: 'Editar', modulo: 'Diagnósticos', detalle: 'Agregó diagnóstico CIE-10 I10 a Luis Vargas (EXP-2024-0006)', resultado: 'advertencia', ip: '192.168.2.15', fecha: '2026-08-07 08:40' },
  { id: 11, usuario: 'José Luis Ramírez', rol: 'Recepción', accion: 'Cancelar', modulo: 'Agenda', detalle: 'Canceló cita de Ana Castillo (EXP-2024-0005) — motivo: paciente reagendó', resultado: 'exito', ip: '192.168.1.20', fecha: '2026-08-07 08:30' },
  { id: 12, usuario: 'Dr. Alejandro García', rol: 'Médico', accion: 'Iniciar sesión', modulo: 'Autenticación', detalle: 'Inicio de sesión exitoso desde Chrome / Windows', resultado: 'exito', ip: '192.168.1.12', fecha: '2026-08-07 08:05' },
  { id: 13, usuario: 'Desconocido', rol: '—', accion: 'Iniciar sesión', modulo: 'Autenticación', detalle: 'Intento fallido de inicio de sesión para alejandro.garcia@medicore.mx', resultado: 'error', ip: '187.190.45.22', fecha: '2026-08-07 07:58' },
  { id: 14, usuario: 'Dra. Patricia Mendoza', rol: 'Médico', accion: 'Editar', modulo: 'Pacientes', detalle: 'Actualizó información de contacto de Sofía Ramírez (EXP-2024-0003)', resultado: 'exito', ip: '192.168.1.18', fecha: '2026-08-06 18:30' },
  { id: 15, usuario: 'Laura Torres', rol: 'Administrador', accion: 'Editar', modulo: 'Especialidades', detalle: 'Cambió nombre: "Medicina Interna" → "Medicina General"', resultado: 'exito', ip: '192.168.1.45', fecha: '2026-08-06 17:45' },
  { id: 16, usuario: 'Mónica Soto', rol: 'Caja', accion: 'Corte', modulo: 'Caja', detalle: 'Realizó corte de caja del día — total: $18,500', resultado: 'exito', ip: '192.168.1.50', fecha: '2026-08-06 17:00' },
  { id: 17, usuario: 'Dra. Patricia Mendoza', rol: 'Médico', accion: 'Crear', modulo: 'Recetas', detalle: 'Generó receta para Sofía Ramírez (EXP-2024-0003)', resultado: 'exito', ip: '192.168.1.18', fecha: '2026-08-06 16:20' },
  { id: 18, usuario: 'Héctor Núñez', rol: 'Recepción', accion: 'Crear', modulo: 'Pacientes', detalle: 'Registró nuevo paciente Javier Reyes (EXP-2025-0010)', resultado: 'exito', ip: '192.168.2.25', fecha: '2026-08-06 15:10' },
  { id: 19, usuario: 'Dr. Ricardo Olvera', rol: 'Médico', accion: 'Solicitar', modulo: 'Estudios', detalle: 'Solicitó perfil lipídico para Luis Vargas (EXP-2024-0006)', resultado: 'exito', ip: '192.168.1.14', fecha: '2026-08-06 14:00' },
  { id: 20, usuario: 'Omar Flores', rol: 'Directivo', accion: 'Exportar', modulo: 'Reportes', detalle: 'Exportó reporte financiero mensual julio 2026 en PDF', resultado: 'exito', ip: '192.168.1.55', fecha: '2026-08-06 12:30' },
  { id: 21, usuario: 'Laura Torres', rol: 'Administrador', accion: 'Eliminar', modulo: 'Pacientes', detalle: 'Intentó eliminar paciente Roberto Jiménez — no autorizado', resultado: 'error', ip: '192.168.1.45', fecha: '2026-08-06 11:15' },
  { id: 22, usuario: 'Carmen Vargas', rol: 'Enfermería', accion: 'Registrar', modulo: 'Triage', detalle: 'Registró signos vitales de Gabriela Mendoza (EXP-2025-0011)', resultado: 'exito', ip: '192.168.1.33', fecha: '2026-08-06 10:45' },
  { id: 23, usuario: 'José Luis Ramírez', rol: 'Recepción', accion: 'Crear', modulo: 'Agenda', detalle: 'Agendó cita para Gabriela Mendoza con Dra. Patricia Mendoza', resultado: 'exito', ip: '192.168.1.20', fecha: '2026-08-06 10:30' },
  { id: 24, usuario: 'Dr. Alejandro García', rol: 'Médico', accion: 'Cerrar sesión', modulo: 'Autenticación', detalle: 'Cierre de sesión', resultado: 'exito', ip: '192.168.1.12', fecha: '2026-08-06 08:55' },
  { id: 25, usuario: 'Desconocido', rol: '—', accion: 'Iniciar sesión', modulo: 'Autenticación', detalle: 'Intento fallido de inicio de sesión para admin@medicore.mx', resultado: 'error', ip: '201.163.22.89', fecha: '2026-08-06 03:12' },
];

const resultadoMap: Record<AuditLog['resultado'], { label: string; variant: 'success' | 'danger' | 'warning' }> = {
  exito: { label: 'Éxito', variant: 'success' },
  error: { label: 'Error', variant: 'danger' },
  advertencia: { label: 'Advertencia', variant: 'warning' },
};

const modulos = ['Todos', 'Autenticación', 'Agenda', 'Pacientes', 'Expediente', 'Consultas', 'Diagnósticos', 'Recetas', 'Estudios', 'Caja', 'Recepción', 'Triage', 'Usuarios', 'Servicios', 'Especialidades', 'Reportes'];
const acciones = ['Todas', 'Iniciar sesión', 'Cerrar sesión', 'Ver', 'Crear', 'Editar', 'Eliminar', 'Cancelar', 'Registrar', 'Cobrar', 'Corte', 'Solicitar', 'Exportar'];
const resultados = ['Todos', 'exito', 'error', 'advertencia'];

export default function Auditoria() {
  const [search, setSearch] = useState('');
  const [filterModulo, setFilterModulo] = useState('Todos');
  const [filterAccion, setFilterAccion] = useState('Todas');
  const [filterResultado, setFilterResultado] = useState('Todos');
  const [page, setPage] = useState(1);
  const perPage = 12;

  const filtered = auditLogs.filter((l) => {
    const matchSearch =
      l.usuario.toLowerCase().includes(search.toLowerCase()) ||
      l.detalle.toLowerCase().includes(search.toLowerCase()) ||
      l.modulo.toLowerCase().includes(search.toLowerCase());
    const matchModulo = filterModulo === 'Todos' || l.modulo === filterModulo;
    const matchAccion = filterAccion === 'Todas' || l.accion === filterAccion;
    const matchResult = filterResultado === 'Todos' || l.resultado === filterResultado;
    return matchSearch && matchModulo && matchAccion && matchResult;
  });

  const sorters = useMemo(() => ({
    fecha: (a: AuditLog, b: AuditLog) => a.fecha.localeCompare(b.fecha),
    usuario: (a: AuditLog, b: AuditLog) => a.usuario.localeCompare(b.usuario),
    accion: (a: AuditLog, b: AuditLog) => a.accion.localeCompare(b.accion),
    modulo: (a: AuditLog, b: AuditLog) => a.modulo.localeCompare(b.modulo),
    resultado: (a: AuditLog, b: AuditLog) => a.resultado.localeCompare(b.resultado),
    ip: (a: AuditLog, b: AuditLog) => a.ip.localeCompare(b.ip),
  }), []);

  const { sortedData, sortKey, direction, toggleSort } = useSort(filtered, sorters, 'fecha', 'desc');

  const totalPages = Math.ceil(sortedData.length / perPage);
  const paged = sortedData.slice((page - 1) * perPage, page * perPage);

  // Reset page on filter change
  useMemo(() => setPage(1), [search, filterModulo, filterAccion, filterResultado]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="relative w-full sm:w-64">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="text"
            placeholder="Buscar en auditoría..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
          />
        </div>
        <select
          value={filterModulo}
          onChange={(e) => { setFilterModulo(e.target.value); setPage(1); }}
          className="px-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 cursor-pointer"
        >
          {modulos.map((m) => <option key={m} value={m}>{m === 'Todos' ? 'Todos los módulos' : m}</option>)}
        </select>
        <select
          value={filterAccion}
          onChange={(e) => { setFilterAccion(e.target.value); setPage(1); }}
          className="px-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 cursor-pointer"
        >
          {acciones.map((a) => <option key={a} value={a}>{a === 'Todas' ? 'Todas las acciones' : a}</option>)}
        </select>
        <select
          value={filterResultado}
          onChange={(e) => { setFilterResultado(e.target.value); setPage(1); }}
          className="px-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 cursor-pointer"
        >
          {resultados.map((r) => <option key={r} value={r}>{r === 'Todos' ? 'Todos los resultados' : r === 'exito' ? 'Éxito' : r === 'error' ? 'Error' : 'Advertencia'}</option>)}
        </select>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-secondary-200 text-left">
                <SortableTh label="Fecha / Hora" sortKey="fecha" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Usuario" sortKey="usuario" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Acción" sortKey="accion" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Módulo" sortKey="modulo" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <th className="px-5 py-2 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Detalle</th>
                <SortableTh label="Resultado" sortKey="resultado" activeKey={sortKey} direction={direction} onSort={toggleSort} align="center" />
                <SortableTh label="IP" sortKey="ip" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-foreground-400">
                    <div className="flex flex-col items-center gap-2">
                      <span className="w-10 h-10 flex items-center justify-center">
                        <i className="ri-file-search-line text-2xl"></i>
                      </span>
                      <p className="text-sm">No se encontraron registros de auditoría</p>
                      <button
                        onClick={() => { setSearch(''); setFilterModulo('Todos'); setFilterAccion('Todas'); setFilterResultado('Todos'); }}
                        className="text-xs text-primary-500 hover:text-primary-600 cursor-pointer"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((l) => {
                  const r = resultadoMap[l.resultado];
                  return (
                    <tr key={l.id} className="hover:bg-secondary-50/50 transition-base">
                      <td className="px-5 py-2 text-foreground-600 text-xs whitespace-nowrap font-mono">{l.fecha}</td>
                      <td className="px-5 py-2">
                        <div>
                          <p className="text-sm font-medium text-foreground-900">{l.usuario}</p>
                          <p className="text-xs text-foreground-400">{l.rol}</p>
                        </div>
                      </td>
                      <td className="px-5 py-2">
                        <Badge variant="secondary" size="sm">{l.accion}</Badge>
                      </td>
                      <td className="px-5 py-2 text-foreground-600 text-xs whitespace-nowrap">{l.modulo}</td>
                      <td className="px-5 py-2 text-foreground-700 text-xs max-w-[280px]">{l.detalle}</td>
                      <td className="px-5 py-2 text-center">
                        <Badge variant={r.variant} size="sm" dot>{r.label}</Badge>
                      </td>
                      <td className="px-5 py-2 text-foreground-500 text-xs font-mono">{l.ip}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-2 border-t border-secondary-200">
            <span className="text-xs text-foreground-500">
              Página {page} de {totalPages} · {sortedData.length} resultados
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-secondary-200 text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 flex items-center justify-center text-xs font-medium rounded-md transition-base cursor-pointer ${
                    p === page
                      ? 'bg-primary-500 text-white'
                      : 'text-foreground-600 hover:bg-secondary-100'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
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
    </div>
  );
}