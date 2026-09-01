import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import { egresosMock, estadoAltaConfig, destinoAltaConfigEgreso, type HojaEgreso } from '@/mocks/egresos';
import { exportToExcel } from '@/utils/exportUtils';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/feature/PaginationControls';
import EgresoPrintModal from './components/EgresoPrintModal';
import NuevaHojaEgresoModal from './components/NuevaHojaEgresoModal';

export default function Egresos() {
  const navigate = useNavigate();
  const [data, setData] = useState<HojaEgreso[]>([...egresosMock]);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<HojaEgreso['estadoAlta'] | 'todos'>('todos');
  const [filtroDestino, setFiltroDestino] = useState<HojaEgreso['destinoAlta'] | 'todos'>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<HojaEgreso | null>(null);
  const [showNuevo, setShowNuevo] = useState(false);

  const filtered = useMemo(() => {
    let list = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        e.patientName.toLowerCase().includes(q) ||
        e.patientExpediente.toLowerCase().includes(q) ||
        e.motivoIngreso.toLowerCase().includes(q) ||
        e.diagnosticoEgreso.toLowerCase().includes(q)
      );
    }
    if (filtroEstado !== 'todos') list = list.filter((e) => e.estadoAlta === filtroEstado);
    if (filtroDestino !== 'todos') list = list.filter((e) => e.destinoAlta === filtroDestino);
    return list.sort((a, b) => b.fechaEgreso.localeCompare(a.fechaEgreso) || b.horaEgreso.localeCompare(a.horaEgreso));
  }, [search, filtroEstado, filtroDestino, data]);

  const pagination = usePagination(filtered, 10);

  const stats = useMemo(() => {
    const total = data.length;
    const mejorados = data.filter((e) => e.estadoAlta === 'mejorado').length;
    const curados = data.filter((e) => e.estadoAlta === 'curado').length;
    const domicilio = data.filter((e) => e.destinoAlta === 'domicilio').length;
    const referencia = data.filter((e) => e.destinoAlta === 'referencia').length;
    return { total, mejorados, curados, domicilio, referencia };
  }, [data]);

  const handleExport = () => {
    const rows = filtered.map((e) => ({
      ID: e.id,
      Paciente: e.patientName,
      Expediente: e.patientExpediente,
      'Fecha Ingreso': `${e.fechaIngreso} ${e.horaIngreso}`,
      'Fecha Egreso': `${e.fechaEgreso} ${e.horaEgreso}`,
      'Diagnóstico Ingreso': e.diagnosticoIngreso,
      'Diagnóstico Egreso': e.diagnosticoEgreso,
      'Estado Alta': estadoAltaConfig[e.estadoAlta].label,
      Destino: destinoAltaConfigEgreso[e.destinoAlta].label,
      'Médico Tratante': e.medicoTratante,
    }));
    exportToExcel(rows, `Egresos_MediCore_${new Date().toISOString().split('T')[0]}`, 'Egresos');
  };

  const handleNuevo = (nuevo: HojaEgreso) => {
    setData((prev) => [nuevo, ...prev]);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground-900 font-heading">Hojas de Egreso</h1>
          <p className="text-sm text-foreground-500 mt-1">
            Notas de egreso hospitalario conforme a NOM-004 Art. 6.3.7
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
        <StatItem icon="ri-file-list-3-line" value={stats.total} label="Total" />
        <StatItem icon="ri-arrow-up-line" value={stats.mejorados} label="Mejorados" color="text-sky-600" />
        <StatItem icon="ri-check-double-line" value={stats.curados} label="Curados" color="text-emerald-600" />
        <StatItem icon="ri-home-line" value={stats.domicilio} label="A domicilio" color="text-primary-600" />
        <StatItem icon="ri-arrow-right-line" value={stats.referencia} label="Referidos" color="text-accent-600" last />
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1 min-w-0 lg:max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="search"
            placeholder="Buscar paciente, diagnóstico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm bg-background-50 border border-secondary-200/70 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as HojaEgreso['estadoAlta'] | 'todos')}
            className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base"
          >
            <option value="todos">Estado: Todos</option>
            <option value="mejorado">Mejorado</option>
            <option value="curado">Curado</option>
            <option value="estable">Estable</option>
            <option value="inconcluso">Inconcluso</option>
            <option value="fallecimiento">Fallecimiento</option>
          </select>
          <select
            value={filtroDestino}
            onChange={(e) => setFiltroDestino(e.target.value as HojaEgreso['destinoAlta'] | 'todos')}
            className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base"
          >
            <option value="todos">Destino: Todos</option>
            <option value="domicilio">Domicilio</option>
            <option value="hospital">Hospitalización</option>
            <option value="otra_unidad">Otra unidad</option>
            <option value="referencia">Referencia</option>
            <option value="defuncion">Defunción</option>
          </select>
          {(search || filtroEstado !== 'todos' || filtroDestino !== 'todos') && (
            <button
              onClick={() => { setSearch(''); setFiltroEstado('todos'); setFiltroDestino('todos'); }}
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
          <div className="col-span-2">Ingreso / Egreso</div>
          <div className="col-span-3">Diagnóstico</div>
          <div className="col-span-1">Estado</div>
          <div className="col-span-1">Destino</div>
          <div className="col-span-1">Médico</div>
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
            {pagination.paginatedData.map((e) => {
              const isExpanded = expandedId === e.id;
              const estCfg = estadoAltaConfig[e.estadoAlta];
              const destCfg = destinoAltaConfigEgreso[e.destinoAlta];
              return (
                <div key={e.id}>
                  <div
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-3 hover:bg-secondary-50/50 transition-base cursor-pointer items-center"
                    onClick={() => setExpandedId(isExpanded ? null : e.id)}
                  >
                    <div className="md:col-span-3">
                      <p className="text-sm font-medium text-foreground-900">{e.patientName}</p>
                      <p className="text-2xs text-foreground-500">{e.patientExpediente}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-foreground-600">Ingreso: {e.fechaIngreso} {e.horaIngreso}</p>
                      <p className="text-xs text-foreground-600">Egreso: {e.fechaEgreso} {e.horaEgreso}</p>
                    </div>
                    <div className="md:col-span-3">
                      <p className="text-xs text-foreground-700 line-clamp-1 font-medium">{e.diagnosticoEgreso}</p>
                      <p className="text-2xs text-foreground-500 line-clamp-1">{e.motivoIngreso.substring(0, 60)}...</p>
                    </div>
                    <div className="md:col-span-1">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium ${estCfg.bg} ${estCfg.text}`}>
                        <i className={`${estCfg.icon} text-[10px]`}></i>
                        {estCfg.label}
                      </span>
                    </div>
                    <div className="md:col-span-1">
                      <span className="inline-flex items-center gap-1 text-2xs text-foreground-500">
                        <i className={`${destCfg.icon} text-[10px]`}></i>
                        {destCfg.label}
                      </span>
                    </div>
                    <div className="md:col-span-1">
                      <p className="text-xs text-foreground-600 line-clamp-1">{e.medicoTratante}</p>
                    </div>
                    <div className="md:col-span-1 flex items-center justify-end gap-1">
                      <button
                        onClick={(ev) => { ev.stopPropagation(); setPrintItem(e); }}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-base cursor-pointer"
                        title="Imprimir"
                      >
                        <i className="ri-printer-line text-sm"></i>
                      </button>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); navigate(`/app/pacientes/${e.patientId}`); }}
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <InfoRow label="Fecha de ingreso" value={`${e.fechaIngreso} ${e.horaIngreso}`} />
                          <InfoRow label="Fecha de egreso" value={`${e.fechaEgreso} ${e.horaEgreso}`} />
                          <InfoRow label="Tiempo de estancia" value={`${Math.round((new Date(`${e.fechaEgreso}T${e.horaEgreso}`).getTime() - new Date(`${e.fechaIngreso}T${e.horaIngreso}`).getTime()) / 60000)} minutos`} />
                        </div>

                        <div className="space-y-3">
                          <div>
                            <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Motivo de ingreso</p>
                            <p className="text-sm text-foreground-700 p-2 bg-background-50 rounded-lg border border-secondary-100">{e.motivoIngreso}</p>
                          </div>
                          <div>
                            <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Diagnóstico de ingreso</p>
                            <p className="text-sm text-foreground-700 p-2 bg-background-50 rounded-lg border border-secondary-100">{e.diagnosticoIngreso}</p>
                          </div>
                          {e.diagnosticosSecundarios.length > 0 && (
                            <div>
                              <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Diagnósticos secundarios</p>
                              <div className="flex flex-wrap gap-1.5">
                                {e.diagnosticosSecundarios.map((d, i) => (
                                  <span key={i} className="px-2 py-1 rounded-md bg-secondary-100 text-foreground-600 text-xs">{d}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div>
                            <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Resumen de evolución</p>
                            <p className="text-sm text-foreground-700 p-2 bg-background-50 rounded-lg border border-secondary-100 whitespace-pre-line">{e.resumenEvolucion}</p>
                          </div>
                          <div>
                            <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Tratamiento recibido</p>
                            <ul className="list-disc list-inside text-xs text-foreground-700 space-y-1 pl-1">
                              {e.tratamientoRecibido.map((t, i) => (
                                <li key={i}>{t}</li>
                              ))}
                            </ul>
                          </div>
                          {e.estudiosRealizados.length > 0 && (
                            <div>
                              <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Estudios realizados</p>
                              <ul className="list-disc list-inside text-xs text-foreground-700 space-y-1 pl-1">
                                {e.estudiosRealizados.map((s, i) => (
                                  <li key={i}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div>
                            <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Diagnóstico de egreso</p>
                            <p className="text-sm font-semibold text-foreground-800 p-2 bg-primary-50 rounded-lg border border-primary-200">{e.diagnosticoEgreso}</p>
                          </div>
                          <div>
                            <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Recomendaciones</p>
                            <p className="text-sm text-foreground-700 p-2 bg-background-50 rounded-lg border border-secondary-100 whitespace-pre-line">{e.recomendaciones}</p>
                          </div>
                          {e.medicamentosAlta.length > 0 && (
                            <div>
                              <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Medicamentos al alta</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {e.medicamentosAlta.map((m, i) => (
                                  <div key={i} className="p-2 bg-background-50 rounded-lg border border-secondary-100 text-xs">
                                    <p className="font-medium text-foreground-800">{m.nombre}</p>
                                    <p className="text-foreground-600">{m.dosis} · {m.frecuencia} · {m.duracion}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {e.citaControl && (
                            <div className="p-2 rounded-lg bg-accent-50 border border-accent-200">
                              <p className="text-xs text-accent-800"><strong>Cita de control:</strong> {e.citaControl}</p>
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-secondary-200 flex items-center justify-between">
                          <div className="text-xs text-foreground-500">
                            <p>Médico tratante: <strong>{e.medicoTratante}</strong> (Céd. {e.cedulaTratante})</p>
                            <p>Especialidad: {e.especialidad}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-2xs ${e.firmaPaciente ? 'text-emerald-600' : 'text-amber-600'}`}>
                              <i className={e.firmaPaciente ? 'ri-check-line' : 'ri-time-line'}></i> Firma paciente
                            </span>
                            <span className={`text-2xs ${e.firmaMedico ? 'text-emerald-600' : 'text-amber-600'}`}>
                              <i className={e.firmaMedico ? 'ri-check-line' : 'ri-time-line'}></i> Firma médico
                            </span>
                          </div>
                        </div>

                        {e.observaciones && (
                          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                            <p className="text-xs text-amber-800"><strong>Observaciones:</strong> {e.observaciones}</p>
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
        <EgresoPrintModal
          egreso={printItem}
          isOpen={!!printItem}
          onClose={() => setPrintItem(null)}
        />
      )}

      {/* Nuevo Modal */}
      <NuevaHojaEgresoModal
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