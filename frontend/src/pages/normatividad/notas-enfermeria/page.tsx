import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import {
  notasEnfermeriaMock,
  turnoConfig,
  estadoPacienteConfig,
  actividadTipoConfig,
  type NotaEnfermeria,
} from '@/mocks/notasEnfermeria';
import { patients } from '@/mocks/patients';
import { exportToExcel } from '@/utils/exportUtils';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/feature/PaginationControls';
import NotaEnfermeriaPrintModal from './components/NotaEnfermeriaPrintModal';
import NuevaNotaEnfermeriaModal from './components/NuevaNotaEnfermeriaModal';

export default function NotasEnfermeria() {
  const navigate = useNavigate();
  const [data, setData] = useState<NotaEnfermeria[]>([...notasEnfermeriaMock]);
  const [search, setSearch] = useState('');
  const [filtroTurno, setFiltroTurno] = useState<NotaEnfermeria['turno'] | 'todos'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<NotaEnfermeria['estadoInicio'] | 'todos'>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<NotaEnfermeria | null>(null);
  const [showNuevo, setShowNuevo] = useState(false);

  const filtered = useMemo(() => {
    let list = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((n) =>
        n.patientName.toLowerCase().includes(q) ||
        n.patientExpediente.toLowerCase().includes(q) ||
        n.enfermera.toLowerCase().includes(q)
      );
    }
    if (filtroTurno !== 'todos') list = list.filter((n) => n.turno === filtroTurno);
    if (filtroEstado !== 'todos') list = list.filter((n) => n.estadoInicio === filtroEstado || n.estadoFin === filtroEstado);
    return list.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.horaInicio.localeCompare(a.horaInicio));
  }, [search, filtroTurno, filtroEstado, data]);

  const pagination = usePagination(filtered, 10);

  const stats = useMemo(() => {
    const total = data.length;
    const matutino = data.filter((n) => n.turno === 'matutino').length;
    const vespertino = data.filter((n) => n.turno === 'vespertino').length;
    const nocturno = data.filter((n) => n.turno === 'nocturno').length;
    const criticos = data.filter((n) => n.estadoInicio === 'critico' || n.estadoFin === 'critico').length;
    return { total, matutino, vespertino, nocturno, criticos };
  }, [data]);

  const handleExport = () => {
    const rows = filtered.map((n) => ({
      ID: n.id,
      Paciente: n.patientName,
      Expediente: n.patientExpediente,
      Fecha: n.fecha,
      Turno: turnoConfig[n.turno].label,
      'Hora Inicio': n.horaInicio,
      'Hora Fin': n.horaFin,
      Enfermera: n.enfermera,
      'Estado Inicio': estadoPacienteConfig[n.estadoInicio].label,
      'Estado Fin': estadoPacienteConfig[n.estadoFin].label,
      'Actividades': n.actividades.length,
      'Medicamentos': n.medicamentos.length,
      'Dolor EVA': n.dolorEva,
    }));
    exportToExcel(rows, `NotasEnfermeria_MediCore_${new Date().toISOString().split('T')[0]}`, 'NotasEnfermeria');
  };

  const handleNuevo = (nuevo: NotaEnfermeria) => {
    setData((prev) => [nuevo, ...prev]);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground-900 font-heading">Notas de Enfermería</h1>
          <p className="text-sm text-foreground-500 mt-1">
            Registro de cuidados de enfermería conforme a NOM-004 Art. 6.3.4
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<i className="ri-download-2-line"></i>} onClick={handleExport}>
            Exportar
          </Button>
          <Button variant="primary" size="sm" icon={<i className="ri-add-line"></i>} onClick={() => setShowNuevo(true)}>
            Nueva nota
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-0 rounded-lg border border-secondary-200/70 bg-background-50 overflow-hidden">
        <StatItem icon="ri-nurse-line" value={stats.total} label="Total" />
        <StatItem icon="ri-sun-line" value={stats.matutino} label="Matutino" color="text-amber-600" />
        <StatItem icon="ri-cloud-line" value={stats.vespertino} label="Vespertino" color="text-orange-600" />
        <StatItem icon="ri-moon-line" value={stats.nocturno} label="Nocturno" color="text-indigo-600" />
        <StatItem icon="ri-error-warning-line" value={stats.criticos} label="Críticos" color="text-red-600" last />
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1 min-w-0 lg:max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="search"
            placeholder="Buscar paciente o enfermera..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm bg-background-50 border border-secondary-200/70 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={filtroTurno}
            onChange={(e) => setFiltroTurno(e.target.value as NotaEnfermeria['turno'] | 'todos')}
            className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base"
          >
            <option value="todos">Todos los turnos</option>
            {Object.entries(turnoConfig).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as NotaEnfermeria['estadoInicio'] | 'todos')}
            className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base"
          >
            <option value="todos">Todos los estados</option>
            {Object.entries(estadoPacienteConfig).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          {(search || filtroTurno !== 'todos' || filtroEstado !== 'todos') && (
            <button
              onClick={() => { setSearch(''); setFiltroTurno('todos'); setFiltroEstado('todos'); }}
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
          <div className="col-span-2">Turno / Horario</div>
          <div className="col-span-2">Estado (Inicio → Fin)</div>
          <div className="col-span-2">Enfermera / Signos</div>
          <div className="col-span-2">Actividades / Meds</div>
          <div className="col-span-1">Acciones</div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-secondary-100 mb-3">
              <i className="ri-nurse-line text-xl text-foreground-400"></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-800">Sin notas registradas</h3>
            <p className="text-sm text-foreground-500">No se encontraron notas de enfermería con los filtros actuales.</p>
          </div>
        ) : (
          <div className="divide-y divide-secondary-100">
            {pagination.paginatedData.map((n) => {
              const isExpanded = expandedId === n.id;
              const turnoCfg = turnoConfig[n.turno];
              const estIniCfg = estadoPacienteConfig[n.estadoInicio];
              const estFinCfg = estadoPacienteConfig[n.estadoFin];
              const dolorNum = parseInt(n.dolorEva, 10);
              const dolorColor = Number.isNaN(dolorNum) || dolorNum <= 3 ? 'text-emerald-600' : dolorNum <= 6 ? 'text-amber-600' : 'text-red-600';
              return (
                <div key={n.id}>
                  <div
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-3 hover:bg-secondary-50/50 transition-base cursor-pointer items-center"
                    onClick={() => setExpandedId(isExpanded ? null : n.id)}
                  >
                    <div className="md:col-span-3">
                      <p className="text-sm font-medium text-foreground-900">{n.patientName}</p>
                      <p className="text-2xs text-foreground-500">{n.patientExpediente}</p>
                      <p className="text-2xs text-foreground-400 mt-0.5">{n.fecha}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-2xs font-medium border ${turnoCfg.color}`}>
                        <i className={`${turnoCfg.icon} text-[10px]`}></i>
                        {turnoCfg.label}
                      </span>
                      <p className="text-2xs text-foreground-500 mt-1">{n.horaInicio} → {n.horaFin}</p>
                    </div>
                    <div className="md:col-span-2 flex items-center gap-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium ${estIniCfg.bg} ${estIniCfg.text}`}>
                        <i className={`${estIniCfg.icon} text-[10px]`}></i> {estIniCfg.label}
                      </span>
                      <i className="ri-arrow-right-line text-2xs text-foreground-400"></i>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium ${estFinCfg.bg} ${estFinCfg.text}`}>
                        <i className={`${estFinCfg.icon} text-[10px]`}></i> {estFinCfg.label}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-foreground-700 line-clamp-1">{n.enfermera}</p>
                      <div className="flex items-center gap-2 mt-1 text-2xs text-foreground-500">
                        <span>FC {n.frecuenciaCardiaca}</span>
                        <span>SpO₂ {n.saturacionOxigeno}%</span>
                        <span className={dolorColor}>EVA {n.dolorEva}</span>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium bg-secondary-100 text-foreground-600">
                          <i className="ri-clipboard-line text-[10px]"></i> {n.actividades.length} act.
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium bg-secondary-100 text-foreground-600">
                          <i className="ri-capsule-line text-[10px]"></i> {n.medicamentos.length} meds
                        </span>
                      </div>
                    </div>
                    <div className="md:col-span-1 flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPrintItem(n); }}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-base cursor-pointer"
                        title="Imprimir"
                      >
                        <i className="ri-printer-line text-sm"></i>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/app/pacientes/${n.patientId}`); }}
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
                        {/* Signos vitales */}
                        <div>
                          <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-2">Signos Vitales</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            <VitalPill label="Temp" value={`${n.temperatura} °C`} />
                            <VitalPill label="PA" value={`${n.presionSistolica}/${n.presionDiastolica}`} />
                            <VitalPill label="FC" value={`${n.frecuenciaCardiaca} lpm`} />
                            <VitalPill label="FR" value={`${n.frecuenciaRespiratoria} rpm`} />
                            <VitalPill label="SpO₂" value={`${n.saturacionOxigeno}%`} />
                            <VitalPill label="Glucosa" value={`${n.glucosa} mg/dL`} />
                            <VitalPill label="Peso" value={`${n.peso} kg`} />
                            <VitalPill label="Talla" value={`${n.talla} m`} />
                          </div>
                        </div>

                        {/* Actividades */}
                        {n.actividades.length > 0 && (
                          <div>
                            <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-2">Actividades Realizadas</p>
                            <div className="space-y-2">
                              {n.actividades.map((a) => {
                                const tipoCfg = actividadTipoConfig[a.tipo];
                                return (
                                  <div key={a.id} className="flex items-start gap-2 p-2.5 bg-background-50 rounded-lg border border-secondary-100">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium border flex-shrink-0 ${tipoCfg.color}`}>
                                      <i className={`${tipoCfg.icon} text-[10px]`}></i>
                                      {tipoCfg.label}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-foreground-700">{a.descripcion}</p>
                                      {a.resultado && <p className="text-2xs text-foreground-500 mt-0.5">Resultado: {a.resultado}</p>}
                                    </div>
                                    <span className="text-2xs text-foreground-400 flex-shrink-0">{a.hora}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Medicamentos */}
                        {n.medicamentos.length > 0 && (
                          <div>
                            <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-2">Medicamentos Administrados</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {n.medicamentos.map((m, i) => (
                                <div key={i} className="p-2.5 bg-background-50 rounded-lg border border-secondary-100">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-medium text-foreground-800">{m.nombre}</p>
                                    <span className="text-2xs text-foreground-400">{m.hora}</span>
                                  </div>
                                  <p className="text-2xs text-foreground-600 mt-0.5">{m.dosis} · {m.via}</p>
                                  {m.observacion && <p className="text-2xs text-foreground-500 mt-0.5">{m.observacion}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Evolución y Plan */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-3 bg-background-50 rounded-lg border border-secondary-100">
                            <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Evolución de Enfermería</p>
                            <p className="text-xs text-foreground-700 whitespace-pre-line">{n.evolucionEnfermeria}</p>
                          </div>
                          <div className="p-3 bg-background-50 rounded-lg border border-secondary-100">
                            <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Plan de Cuidados</p>
                            <p className="text-xs text-foreground-700 whitespace-pre-line">{n.planCuidados}</p>
                          </div>
                        </div>

                        {/* Footer info */}
                        <div className="pt-3 border-t border-secondary-200 flex items-center justify-between flex-wrap gap-2">
                          <div className="text-xs text-foreground-500">
                            <p>Enfermera: <strong>{n.enfermera}</strong> · Cédula: {n.cedulaEnfermera}</p>
                            {n.especialidad && <p className="text-2xs">{n.especialidad}</p>}
                          </div>
                          <span className={`text-2xs ${n.firmaEnfermera ? 'text-emerald-600' : 'text-amber-600'}`}>
                            <i className={n.firmaEnfermera ? 'ri-check-line' : 'ri-time-line'}></i> {n.firmaEnfermera ? 'Firmada' : 'Pendiente de firma'}
                          </span>
                        </div>

                        {n.observaciones && (
                          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                            <p className="text-xs text-amber-800"><strong>Observaciones:</strong> {n.observaciones}</p>
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
        <NotaEnfermeriaPrintModal
          nota={printItem}
          isOpen={!!printItem}
          onClose={() => setPrintItem(null)}
        />
      )}

      {/* Nuevo Modal */}
      <NuevaNotaEnfermeriaModal
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

function VitalPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 bg-background-50 rounded-lg border border-secondary-100 text-center">
      <p className="text-[9px] uppercase tracking-wider text-foreground-400 font-semibold">{label}</p>
      <p className="text-xs font-bold text-foreground-800 mt-0.5">{value}</p>
    </div>
  );
}