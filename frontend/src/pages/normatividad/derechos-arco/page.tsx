import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import { solicitudesARCOMock, tipoARCOConfig, estadoARCOConfig, type SolicitudARCO } from '@/mocks/derechosARCO';
import { exportToExcel } from '@/utils/exportUtils';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/feature/PaginationControls';
import ARCOPrintModal from './components/ARCOPrintModal';
import NuevaSolicitudARCOModal from './components/NuevaSolicitudARCOModal';

export default function DerechosARCO() {
  const navigate = useNavigate();
  const [data, setData] = useState<SolicitudARCO[]>([...solicitudesARCOMock]);
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<SolicitudARCO['tipo'] | 'todos'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<SolicitudARCO['estado'] | 'todos'>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<SolicitudARCO | null>(null);
  const [showNuevo, setShowNuevo] = useState(false);

  const filtered = useMemo(() => {
    let list = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) =>
        s.patientName.toLowerCase().includes(q) ||
        s.patientExpediente.toLowerCase().includes(q) ||
        s.descripcion.toLowerCase().includes(q)
      );
    }
    if (filtroTipo !== 'todos') list = list.filter((s) => s.tipo === filtroTipo);
    if (filtroEstado !== 'todos') list = list.filter((s) => s.estado === filtroEstado);
    return list.sort((a, b) => b.fechaSolicitud.localeCompare(a.fechaSolicitud));
  }, [search, filtroTipo, filtroEstado, data]);

  const pagination = usePagination(filtered, 10);

  const stats = useMemo(() => {
    const total = data.length;
    const recibidas = data.filter((s) => s.estado === 'recibida').length;
    const enProceso = data.filter((s) => s.estado === 'en_proceso').length;
    const atendidas = data.filter((s) => s.estado === 'atendida').length;
    const rechazadas = data.filter((s) => s.estado === 'rechazada').length;
    return { total, recibidas, enProceso, atendidas, rechazadas };
  }, [data]);

  const handleExport = () => {
    const rows = filtered.map((s) => ({
      ID: s.id,
      Paciente: s.patientName,
      Expediente: s.patientExpediente,
      Tipo: tipoARCOConfig[s.tipo].label,
      Estado: estadoARCOConfig[s.estado].label,
      'Fecha Solicitud': s.fechaSolicitud,
      'Fecha Respuesta': s.fechaRespuesta || '—',
      'Atendido Por': s.atendidoPor || '—',
      'Días Restantes': s.diasRestantes,
    }));
    exportToExcel(rows, `ARCO_MediCore_${new Date().toISOString().split('T')[0]}`, 'DerechosARCO');
  };

  const handleNuevo = (nuevo: SolicitudARCO) => {
    setData((prev) => [nuevo, ...prev]);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground-900 font-heading">Derechos ARCO</h1>
          <p className="text-sm text-foreground-500 mt-1">
            Solicitudes de Acceso, Rectificación, Cancelación y Oposición (LFPDPPP)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<i className="ri-download-2-line"></i>} onClick={handleExport}>
            Exportar
          </Button>
          <Button variant="primary" size="sm" icon={<i className="ri-add-line"></i>} onClick={() => setShowNuevo(true)}>
            Nueva solicitud
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-0 rounded-lg border border-secondary-200/70 bg-background-50 overflow-hidden">
        <StatItem icon="ri-mail-open-line" value={stats.total} label="Total" />
        <StatItem icon="ri-inbox-unarchive-line" value={stats.recibidas} label="Recibidas" color="text-amber-600" />
        <StatItem icon="ri-loader-4-line" value={stats.enProceso} label="En proceso" color="text-sky-600" />
        <StatItem icon="ri-check-double-line" value={stats.atendidas} label="Atendidas" color="text-emerald-600" />
        <StatItem icon="ri-close-circle-line" value={stats.rechazadas} label="Rechazadas" color="text-red-600" last />
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1 min-w-0 lg:max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="search"
            placeholder="Buscar paciente o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm bg-background-50 border border-secondary-200/70 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as SolicitudARCO['tipo'] | 'todos')}
            className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base"
          >
            <option value="todos">Todos los tipos</option>
            {Object.entries(tipoARCOConfig).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as SolicitudARCO['estado'] | 'todos')}
            className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base"
          >
            <option value="todos">Todos los estados</option>
            <option value="recibida">Recibida</option>
            <option value="en_proceso">En proceso</option>
            <option value="atendida">Atendida</option>
            <option value="rechazada">Rechazada</option>
            <option value="cancelada">Cancelada</option>
          </select>
          {(search || filtroTipo !== 'todos' || filtroEstado !== 'todos') && (
            <button
              onClick={() => { setSearch(''); setFiltroTipo('todos'); setFiltroEstado('todos'); }}
              className="px-2.5 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-base cursor-pointer whitespace-nowrap border border-red-200"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 border-b border-secondary-200 bg-secondary-50/60 text-2xs font-semibold text-foreground-500 uppercase tracking-wider items-center">
          <div className="col-span-3">Paciente</div>
          <div className="col-span-2">Tipo</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-2">Fecha / Plazo</div>
          <div className="col-span-2">Atendido por</div>
          <div className="col-span-1">Acciones</div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-secondary-100 mb-3">
              <i className="ri-mail-open-line text-xl text-foreground-400"></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-800">Sin solicitudes</h3>
            <p className="text-sm text-foreground-500">No se encontraron solicitudes ARCO con los filtros actuales.</p>
          </div>
        ) : (
          <div className="divide-y divide-secondary-100">
            {pagination.paginatedData.map((s) => {
              const isExpanded = expandedId === s.id;
              const tipoCfg = tipoARCOConfig[s.tipo];
              const estadoCfg = estadoARCOConfig[s.estado];
              return (
                <div key={s.id}>
                  <div
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-3 hover:bg-secondary-50/50 transition-base cursor-pointer items-center"
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  >
                    <div className="md:col-span-3">
                      <p className="text-sm font-medium text-foreground-900">{s.patientName}</p>
                      <p className="text-2xs text-foreground-500">{s.patientExpediente}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-2xs font-medium ${tipoCfg.bg} ${tipoCfg.text} border border-secondary-200`}>
                        <span className="w-3 h-3 flex items-center justify-center">
                          <i className={`${tipoCfg.icon} text-[10px]`}></i>
                        </span>
                        {tipoCfg.label}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-2xs font-medium ${estadoCfg.bg} ${estadoCfg.text}`}>
                        {estadoCfg.label}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-foreground-600">{s.fechaSolicitud}</p>
                      {s.estado !== 'atendida' && s.estado !== 'rechazada' && s.estado !== 'cancelada' && (
                        <p className={`text-2xs ${s.diasRestantes <= 5 ? 'text-red-600 font-semibold' : 'text-foreground-500'}`}>
                          {s.diasRestantes} días restantes
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-foreground-600">{s.atendidoPor || 'Sin asignar'}</p>
                    </div>
                    <div className="md:col-span-1 flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPrintItem(s); }}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-base cursor-pointer"
                        title="Imprimir"
                      >
                        <i className="ri-printer-line text-sm"></i>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/app/pacientes/${s.patientId}`); }}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-accent-600 hover:bg-accent-50 transition-base cursor-pointer"
                        title="Ver expediente"
                      >
                        <i className="ri-folder-open-line text-sm"></i>
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="p-4 rounded-xl bg-secondary-50 border border-secondary-200 space-y-3">
                        <div>
                          <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Descripción de la solicitud</p>
                          <p className="text-sm text-foreground-700">{s.descripcion}</p>
                        </div>
                        {s.motivo && (
                          <div>
                            <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Motivo</p>
                            <p className="text-sm text-foreground-700">{s.motivo}</p>
                          </div>
                        )}
                        {(s.fechaRespuesta || s.respuesta) && (
                          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                            <p className="text-2xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
                              Respuesta {s.fechaRespuesta ? `· ${s.fechaRespuesta}` : ''}
                            </p>
                            <p className="text-sm text-emerald-800">{s.respuesta}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs text-foreground-500">
                          <span>Plazo legal: <strong>{s.plazoDias} días hábiles</strong></span>
                          {s.documentoAdjunto && <span>Documento: <strong className="text-primary-600">{s.documentoAdjunto}</strong></span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <PaginationControls {...pagination} />
      </Card>

      {/* Print Modal */}
      {printItem && (
        <ARCOPrintModal
          solicitud={printItem}
          isOpen={!!printItem}
          onClose={() => setPrintItem(null)}
        />
      )}

      {/* Nuevo Modal */}
      <NuevaSolicitudARCOModal
        isOpen={showNuevo}
        onClose={() => setShowNuevo(false)}
        onGuardar={handleNuevo}
      />
    </div>
  );
}

function StatItem({ icon, value, label, color = 'text-foreground-700', last = false }: { icon: string; value: number; label: string; color?: string; last?: boolean }) {
  return (
    <div className={`flex-1 flex items-center gap-2 px-3 py-2 ${!last ? 'border-r border-secondary-200/70' : ''}`}>
      <span className="w-5 h-5 flex items-center justify-center rounded text-sm">
        <i className={`${icon} ${color}`}></i>
      </span>
      <div>
        <p className="text-sm font-bold text-foreground-900">{value}</p>
        <p className="text-[10px] text-foreground-500 uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}