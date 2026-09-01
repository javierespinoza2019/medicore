import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import { consentimientosMock, tipoConsentimientoConfig, plantillasConsentimiento, type ConsentimientoInformado } from '@/mocks/consentimientos';
import { exportToExcel } from '@/utils/exportUtils';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/feature/PaginationControls';
import ConsentimientoPrintModal from './components/ConsentimientoPrintModal';
import NuevoConsentimientoModal from './components/NuevoConsentimientoModal';

const estadoConfig: Record<ConsentimientoInformado['estado'], { label: string; variant: 'success' | 'warning' | 'secondary' | 'danger' }> = {
  firmado: { label: 'Firmado', variant: 'success' },
  pendiente: { label: 'Pendiente', variant: 'warning' },
  revocado: { label: 'Revocado', variant: 'danger' },
  vencido: { label: 'Vencido', variant: 'secondary' },
};

export default function Consentimientos() {
  const navigate = useNavigate();
  const [data, setData] = useState<ConsentimientoInformado[]>([...consentimientosMock]);
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<ConsentimientoInformado['tipo'] | 'todos'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<ConsentimientoInformado['estado'] | 'todos'>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<ConsentimientoInformado | null>(null);
  const [printItem, setPrintItem] = useState<ConsentimientoInformado | null>(null);
  const [showNuevo, setShowNuevo] = useState(false);

  const filtered = useMemo(() => {
    let list = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.patientName.toLowerCase().includes(q) ||
        c.patientExpediente.toLowerCase().includes(q) ||
        c.titulo.toLowerCase().includes(q)
      );
    }
    if (filtroTipo !== 'todos') list = list.filter((c) => c.tipo === filtroTipo);
    if (filtroEstado !== 'todos') list = list.filter((c) => c.estado === filtroEstado);
    return list.sort((a, b) => b.fechaFirma.localeCompare(a.fechaFirma) || b.horaFirma.localeCompare(a.horaFirma));
  }, [search, filtroTipo, filtroEstado, data]);

  const pagination = usePagination(filtered, 10);

  const stats = useMemo(() => {
    const total = data.length;
    const firmados = data.filter((c) => c.estado === 'firmado').length;
    const pendientes = data.filter((c) => c.estado === 'pendiente').length;
    const revocados = data.filter((c) => c.estado === 'revocado').length;
    return { total, firmados, pendientes, revocados };
  }, [data]);

  const handleExport = () => {
    const rows = filtered.map((c) => ({
      ID: c.id,
      Paciente: c.patientName,
      Expediente: c.patientExpediente,
      Tipo: tipoConsentimientoConfig[c.tipo].label,
      Titulo: c.titulo,
      Estado: estadoConfig[c.estado].label,
      'Fecha Firma': c.fechaFirma || '—',
      'Firmado Por': c.firmadoPor || '—',
      Testigo: c.testigo || '—',
    }));
    exportToExcel(rows, `Consentimientos_MediCore_${new Date().toISOString().split('T')[0]}`, 'Consentimientos');
  };

  const handleNuevo = (nuevo: ConsentimientoInformado) => {
    setData((prev) => [nuevo, ...prev]);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground-900 font-heading">Consentimientos Informados</h1>
          <p className="text-sm text-foreground-500 mt-1">
            Gestión de consentimientos conforme a NOM-004 y LFPDPPP
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<i className="ri-download-2-line"></i>} onClick={handleExport}>
            Exportar
          </Button>
          <Button variant="primary" size="sm" icon={<i className="ri-add-line"></i>} onClick={() => setShowNuevo(true)}>
            Nuevo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-0 rounded-lg border border-secondary-200/70 bg-background-50 overflow-hidden">
        <StatItem icon="ri-file-shield-line" value={stats.total} label="Total" />
        <StatItem icon="ri-check-double-line" value={stats.firmados} label="Firmados" color="text-emerald-600" />
        <StatItem icon="ri-time-line" value={stats.pendientes} label="Pendientes" color="text-amber-600" />
        <StatItem icon="ri-close-circle-line" value={stats.revocados} label="Revocados" color="text-red-600" last />
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1 min-w-0 lg:max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="search"
            placeholder="Buscar paciente o título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm bg-background-50 border border-secondary-200/70 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as ConsentimientoInformado['tipo'] | 'todos')}
            className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base"
          >
            <option value="todos">Todos los tipos</option>
            {Object.entries(tipoConsentimientoConfig).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as ConsentimientoInformado['estado'] | 'todos')}
            className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base"
          >
            <option value="todos">Todos los estados</option>
            <option value="firmado">Firmado</option>
            <option value="pendiente">Pendiente</option>
            <option value="revocado">Revocado</option>
            <option value="vencido">Vencido</option>
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
          <div className="col-span-3">Título</div>
          <div className="col-span-2">Tipo</div>
          <div className="col-span-1">Estado</div>
          <div className="col-span-2">Fecha/Hora</div>
          <div className="col-span-1">Acciones</div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-secondary-100 mb-3">
              <i className="ri-file-search-line text-xl text-foreground-400"></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-800">Sin resultados</h3>
            <p className="text-sm text-foreground-500">No se encontraron consentimientos con los filtros actuales.</p>
          </div>
        ) : (
          <div className="divide-y divide-secondary-100">
            {pagination.paginatedData.map((c) => {
              const isExpanded = expandedId === c.id;
              const tipoCfg = tipoConsentimientoConfig[c.tipo];
              return (
                <div key={c.id}>
                  <div
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-3 hover:bg-secondary-50/50 transition-base cursor-pointer items-center"
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  >
                    <div className="md:col-span-3">
                      <p className="text-sm font-medium text-foreground-900">{c.patientName}</p>
                      <p className="text-2xs text-foreground-500">{c.patientExpediente}</p>
                    </div>
                    <div className="md:col-span-3">
                      <p className="text-sm text-foreground-700 line-clamp-1">{c.titulo}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-2xs font-medium bg-secondary-50 border border-secondary-200">
                        <span className="w-3 h-3 flex items-center justify-center">
                          <i className={`${tipoCfg.icon} text-[10px]`}></i>
                        </span>
                        {tipoCfg.label}
                      </span>
                    </div>
                    <div className="md:col-span-1">
                      <Badge variant={estadoConfig[c.estado].variant} size="sm">{estadoConfig[c.estado].label}</Badge>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-foreground-600">
                        {c.fechaFirma ? `${c.fechaFirma} · ${c.horaFirma}` : 'Sin fecha'}
                      </p>
                    </div>
                    <div className="md:col-span-1 flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowPreview(c); }}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-base cursor-pointer"
                        title="Ver documento"
                      >
                        <i className="ri-eye-line text-sm"></i>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPrintItem(c); }}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-base cursor-pointer"
                        title="Imprimir"
                      >
                        <i className="ri-printer-line text-sm"></i>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/app/pacientes/${c.patientId}`); }}
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <InfoRow label="Firmado por" value={c.firmadoPor || '—'} />
                          <InfoRow label="Testigo" value={c.testigo || '—'} />
                          <InfoRow label="Fecha" value={c.fechaFirma || '—'} />
                          <InfoRow label="Hora" value={c.horaFirma || '—'} />
                        </div>
                        <div>
                          <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Descripción</p>
                          <p className="text-sm text-foreground-700">{c.descripcion}</p>
                        </div>
                        {c.riesgos && (
                          <div>
                            <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Riesgos</p>
                            <p className="text-sm text-foreground-700">{c.riesgos}</p>
                          </div>
                        )}
                        {c.beneficios && (
                          <div>
                            <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Beneficios</p>
                            <p className="text-sm text-foreground-700">{c.beneficios}</p>
                          </div>
                        )}
                        {c.observaciones && (
                          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                            <p className="text-xs text-amber-800"><strong>Observaciones:</strong> {c.observaciones}</p>
                          </div>
                        )}
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

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <div className="bg-background-50 rounded-xl shadow-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground-900">Vista previa del consentimiento</h3>
              <button onClick={() => setShowPreview(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary-100 transition-base cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div className="text-center pb-3 border-b border-secondary-200">
                <h4 className="text-lg font-bold text-foreground-900">{showPreview.titulo}</h4>
                <p className="text-xs text-foreground-500 mt-1">{showPreview.patientName} · {showPreview.patientExpediente}</p>
              </div>
              <div className="whitespace-pre-wrap text-sm text-foreground-700 leading-relaxed">
                {plantillasConsentimiento[showPreview.tipo]
                  ? plantillasConsentimiento[showPreview.tipo]
                      .replace('{paciente}', showPreview.patientName)
                      .replace('{expediente}', showPreview.patientExpediente)
                      .replace('{fecha}', showPreview.fechaFirma || '____/____/______')
                      .replace('{hora}', showPreview.horaFirma || '____:____')
                      .replace('{tutor}', showPreview.firmadoPor || '________________________')
                      .replace('{menor}', showPreview.patientName)
                      .replace('{procedimiento}', showPreview.descripcion.substring(0, 60))
                  : showPreview.descripcion}
              </div>
              <div className="pt-4 border-t border-secondary-200 flex items-center justify-between">
                <div className="text-xs text-foreground-500">
                  <p>Firmado por: <strong>{showPreview.firmadoPor || 'Pendiente'}</strong></p>
                  <p>Testigo: {showPreview.testigo || '—'}</p>
                </div>
                <Button variant="primary" size="sm" icon={<i className="ri-printer-line"></i>} onClick={() => { setShowPreview(null); setPrintItem(showPreview); }}>
                  Imprimir
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {printItem && (
        <ConsentimientoPrintModal
          consentimiento={printItem}
          isOpen={!!printItem}
          onClose={() => setPrintItem(null)}
        />
      )}

      {/* Nuevo Modal */}
      <NuevoConsentimientoModal
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xs font-semibold text-foreground-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-foreground-800">{value}</p>
    </div>
  );
}