import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import { referenciasMock, urgenciaConfigRef, estadoRefConfig, type ReferenciaMedica } from '@/mocks/referencias';
import { exportToExcel } from '@/utils/exportUtils';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/feature/PaginationControls';
import ReferenciaPrintModal from './components/ReferenciaPrintModal';
import NuevaReferenciaModal from './components/NuevaReferenciaModal';

export default function Referencias() {
  const navigate = useNavigate();
  const [data, setData] = useState<ReferenciaMedica[]>([...referenciasMock]);
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<ReferenciaMedica['tipo'] | 'todos'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<ReferenciaMedica['estado'] | 'todos'>('todos');
  const [filtroUrgencia, setFiltroUrgencia] = useState<ReferenciaMedica['urgencia'] | 'todos'>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<ReferenciaMedica | null>(null);
  const [showNuevo, setShowNuevo] = useState(false);

  const filtered = useMemo(() => {
    let list = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.patientName.toLowerCase().includes(q) ||
        r.patientExpediente.toLowerCase().includes(q) ||
        r.motivo.toLowerCase().includes(q) ||
        r.destino.toLowerCase().includes(q)
      );
    }
    if (filtroTipo !== 'todos') list = list.filter((r) => r.tipo === filtroTipo);
    if (filtroEstado !== 'todos') list = list.filter((r) => r.estado === filtroEstado);
    if (filtroUrgencia !== 'todos') list = list.filter((r) => r.urgencia === filtroUrgencia);
    return list.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora));
  }, [search, filtroTipo, filtroEstado, filtroUrgencia, data]);

  const pagination = usePagination(filtered, 10);

  const stats = useMemo(() => {
    const total = data.length;
    const referencias = data.filter((r) => r.tipo === 'referencia').length;
    const contrarreferencias = data.filter((r) => r.tipo === 'contrarreferencia').length;
    const emergencias = data.filter((r) => r.urgencia === 'emergencia').length;
    const concluidas = data.filter((r) => r.estado === 'concluida').length;
    return { total, referencias, contrarreferencias, emergencias, concluidas };
  }, [data]);

  const handleExport = () => {
    const rows = filtered.map((r) => ({
      ID: r.id,
      Tipo: r.tipo === 'referencia' ? 'Referencia' : 'Contrarreferencia',
      Paciente: r.patientName,
      Expediente: r.patientExpediente,
      Origen: r.origen,
      Destino: r.destino,
      Motivo: r.motivo,
      Urgencia: urgenciaConfigRef[r.urgencia].label,
      Estado: estadoRefConfig[r.estado].label,
      'Fecha/Hora': `${r.fecha} ${r.hora}`,
      'Médico Remitente': r.medicoRemitente,
    }));
    exportToExcel(rows, `Referencias_MediCore_${new Date().toISOString().split('T')[0]}`, 'Referencias');
  };

  const handleNuevo = (nuevo: ReferenciaMedica) => {
    setData((prev) => [nuevo, ...prev]);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground-900 font-heading">Referencias y Contrarreferencias</h1>
          <p className="text-sm text-foreground-500 mt-1">
            Notas de referencia médica entre unidades conforme a NOM-004
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
        <StatItem icon="ri-arrow-left-right-line" value={stats.total} label="Total" />
        <StatItem icon="ri-arrow-right-line" value={stats.referencias} label="Referencias" color="text-primary-600" />
        <StatItem icon="ri-arrow-left-line" value={stats.contrarreferencias} label="Contrarref." color="text-accent-600" />
        <StatItem icon="ri-alert-line" value={stats.emergencias} label="Emergencias" color="text-red-600" />
        <StatItem icon="ri-check-double-line" value={stats.concluidas} label="Concluidas" color="text-emerald-600" last />
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-2 flex-wrap">
        <div className="relative flex-1 min-w-0 lg:max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="search"
            placeholder="Buscar paciente, destino o motivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm bg-background-50 border border-secondary-200/70 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as ReferenciaMedica['tipo'] | 'todos')}
            className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base"
          >
            <option value="todos">Tipo: Todos</option>
            <option value="referencia">Referencia</option>
            <option value="contrarreferencia">Contrarreferencia</option>
          </select>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as ReferenciaMedica['estado'] | 'todos')}
            className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base"
          >
            <option value="todos">Estado: Todos</option>
            <option value="enviada">Enviada</option>
            <option value="recibida">Recibida</option>
            <option value="en_atencion">En atención</option>
            <option value="concluida">Concluida</option>
            <option value="cancelada">Cancelada</option>
          </select>
          <select
            value={filtroUrgencia}
            onChange={(e) => setFiltroUrgencia(e.target.value as ReferenciaMedica['urgencia'] | 'todos')}
            className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base"
          >
            <option value="todos">Urgencia: Todas</option>
            <option value="programada">Programada</option>
            <option value="urgente">Urgente</option>
            <option value="emergencia">Emergencia</option>
          </select>
          {(search || filtroTipo !== 'todos' || filtroEstado !== 'todos' || filtroUrgencia !== 'todos') && (
            <button
              onClick={() => { setSearch(''); setFiltroTipo('todos'); setFiltroEstado('todos'); setFiltroUrgencia('todos'); }}
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
          <div className="col-span-2">Tipo</div>
          <div className="col-span-3">Paciente / Motivo</div>
          <div className="col-span-2">Origen → Destino</div>
          <div className="col-span-1">Urgencia</div>
          <div className="col-span-1">Estado</div>
          <div className="col-span-2">Médico / Fecha</div>
          <div className="col-span-1">Acciones</div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-secondary-100 mb-3">
              <i className="ri-file-search-line text-xl text-foreground-400"></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-800">Sin resultados</h3>
          </div>
        ) : (
          <div className="divide-y divide-secondary-100">
            {pagination.paginatedData.map((r) => {
              const isExpanded = expandedId === r.id;
              const urgCfg = urgenciaConfigRef[r.urgencia];
              const estCfg = estadoRefConfig[r.estado];
              return (
                <div key={r.id}>
                  <div
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-3 hover:bg-secondary-50/50 transition-base cursor-pointer items-start"
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  >
                    <div className="md:col-span-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-2xs font-medium ${r.tipo === 'referencia' ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'bg-accent-50 text-accent-700 border border-accent-200'}`}>
                        <i className={`${r.tipo === 'referencia' ? 'ri-arrow-right-line' : 'ri-arrow-left-line'} text-[10px]`}></i>
                        {r.tipo === 'referencia' ? 'Referencia' : 'Contrarref.'}
                      </span>
                    </div>
                    <div className="md:col-span-3">
                      <p className="text-sm font-medium text-foreground-900 line-clamp-1">{r.patientName}</p>
                      <p className="text-2xs text-foreground-500">{r.patientExpediente}</p>
                      <p className="text-xs text-foreground-600 mt-1 line-clamp-2">{r.motivo.substring(0, 80)}...</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-foreground-600 line-clamp-1">{r.origen}</p>
                      <p className="text-2xs text-foreground-400">→</p>
                      <p className="text-xs text-foreground-600 line-clamp-1">{r.destino}</p>
                    </div>
                    <div className="md:col-span-1">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium ${urgCfg.bg} ${urgCfg.text}`}>
                        <i className={`${urgCfg.icon} text-[10px]`}></i>
                        {urgCfg.label}
                      </span>
                    </div>
                    <div className="md:col-span-1">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium ${estCfg.bg} ${estCfg.text}`}>
                        {estCfg.label}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-foreground-600 line-clamp-1">{r.medicoRemitente}</p>
                      <p className="text-2xs text-foreground-400">{r.fecha} · {r.hora}</p>
                    </div>
                    <div className="md:col-span-1 flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPrintItem(r); }}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-base cursor-pointer"
                        title="Imprimir"
                      >
                        <i className="ri-printer-line text-sm"></i>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/app/pacientes/${r.patientId}`); }}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-accent-600 hover:bg-accent-50 transition-base cursor-pointer"
                        title="Ver expediente"
                      >
                        <i className="ri-folder-open-line text-sm"></i>
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="p-4 rounded-xl bg-secondary-50 border border-secondary-200 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <InfoRow label="Origen" value={r.origen} />
                          <InfoRow label="Destino" value={r.destino} />
                          <InfoRow label="Médico remitente" value={`${r.medicoRemitente} (Céd. ${r.cedulaRemitente})`} />
                          {r.medicoReceptor && <InfoRow label="Médico receptor" value={`${r.medicoReceptor} (Céd. ${r.cedulaReceptor})`} />}
                          <InfoRow label="Transporte" value={r.transporte === 'ambulancia' ? 'Ambulancia' : r.transporte === 'particular' ? 'Particular' : 'Transporte público'} />
                          <InfoRow label="Acompañante" value={r.acompanante} />
                          <InfoRow label="Contacto destino" value={r.contactoDestino} />
                        </div>

                        <div className="space-y-3">
                          <div>
                            <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Diagnóstico resumen</p>
                            <p className="text-sm text-foreground-700 p-2 bg-background-50 rounded-lg border border-secondary-100">{r.diagnosticoResumen}</p>
                          </div>
                          <div>
                            <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Tratamiento previo</p>
                            <p className="text-sm text-foreground-700 p-2 bg-background-50 rounded-lg border border-secondary-100">{r.tratamientoPrevio}</p>
                          </div>
                          {r.estudiosRealizados.length > 0 && (
                            <div>
                              <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Estudios realizados</p>
                              <ul className="list-disc list-inside text-xs text-foreground-700 space-y-1 pl-1">
                                {r.estudiosRealizados.map((e, i) => (
                                  <li key={i}>{e}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {r.estudiosPendientes.length > 0 && (
                            <div>
                              <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Estudios pendientes</p>
                              <ul className="list-disc list-inside text-xs text-foreground-700 space-y-1 pl-1">
                                {r.estudiosPendientes.map((e, i) => (
                                  <li key={i}>{e}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div>
                            <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Recomendaciones</p>
                            <p className="text-sm text-foreground-700 p-2 bg-background-50 rounded-lg border border-secondary-100 whitespace-pre-line">{r.recomendaciones}</p>
                          </div>
                        </div>

                        {r.resumenRespuesta && (
                          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                            <p className="text-2xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
                              Respuesta {r.fechaRespuesta ? `· ${r.fechaRespuesta}` : ''}
                            </p>
                            <p className="text-sm text-emerald-800">{r.resumenRespuesta}</p>
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

      {/* Print Modal */}
      {printItem && (
        <ReferenciaPrintModal
          referencia={printItem}
          isOpen={!!printItem}
          onClose={() => setPrintItem(null)}
        />
      )}

      {/* Nuevo Modal */}
      <NuevaReferenciaModal
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