import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Urgencia, type NivelUrgencia, type EstadoUrgencia } from '@/mocks/urgencias';
import { urgenciaConfig, estadoUrgenciaConfig, destinoAltaConfig } from '@/mocks/urgencias';
import { useUrgenciasState } from '@/hooks/useUrgenciasState';
import Card from '@/components/base/Card';
import AtencionUrgenciaPanel from './components/AtencionUrgenciaPanel';
import NuevoIngresoModal from './components/NuevoIngresoModal';
import { exportToExcel } from '@/utils/exportUtils';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/feature/PaginationControls';

const nivelOrder: NivelUrgencia[] = ['rojo', 'naranja', 'amarillo', 'verde'];
const estadoOrder: EstadoUrgencia[] = ['en_atencion', 'observacion', 'esperando', 'alta'];

function calcularMinutosEspera(horaLlegada: string): number {
  const [h, m] = horaLlegada.split(':').map(Number);
  const ahora = new Date();
  const llegada = new Date(ahora);
  llegada.setHours(h, m, 0, 0);
  const diffMs = ahora.getTime() - llegada.getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

function formatearTiempo(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h}h ${m}m`;
}

export default function Urgencias() {
  const navigate = useNavigate();
  const { urgencias, addUrgencia, updateUrgencia } = useUrgenciasState();
  const [selectedId, setSelectedId] = useState<string>('');
  const [filterNivel, setFilterNivel] = useState<NivelUrgencia | 'todos'>('todos');
  const [filterEstado, setFilterEstado] = useState<EstadoUrgencia | 'todos'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNuevoIngreso, setShowNuevoIngreso] = useState(false);
  const [nowTick, setNowTick] = useState(0);

  // Timer para actualizar tiempos de espera
  useEffect(() => {
    const interval = setInterval(() => setNowTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const urgenciaSeleccionada = useMemo(
    () => urgencias.find((u) => u.id === selectedId) || null,
    [urgencias, selectedId]
  );

  const urgenciasOrdenadas = useMemo(() => {
    let list = [...urgencias];
    if (filterNivel !== 'todos') {
      list = list.filter((u) => u.nivelUrgencia === filterNivel);
    }
    if (filterEstado !== 'todos') {
      list = list.filter((u) => u.estado === filterEstado);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (u) =>
          u.patientName.toLowerCase().includes(q) ||
          u.patientExpediente.toLowerCase().includes(q) ||
          u.motivo.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      const nivelDiff = nivelOrder.indexOf(a.nivelUrgencia) - nivelOrder.indexOf(b.nivelUrgencia);
      if (nivelDiff !== 0) return nivelDiff;
      const estadoDiff = estadoOrder.indexOf(a.estado) - estadoOrder.indexOf(b.estado);
      if (estadoDiff !== 0) return estadoDiff;
      return a.horaLlegada.localeCompare(b.horaLlegada);
    });
  }, [urgencias, filterNivel, filterEstado, searchTerm]);

  const pagination = usePagination(urgenciasOrdenadas, 10);

  const stats = useMemo(() => {
    const activos = urgencias.filter((u) => u.estado !== 'alta');
    return {
      total: urgencias.length,
      rojos: activos.filter((u) => u.nivelUrgencia === 'rojo').length,
      naranjas: activos.filter((u) => u.nivelUrgencia === 'naranja').length,
      amarillos: activos.filter((u) => u.nivelUrgencia === 'amarillo').length,
      verdes: activos.filter((u) => u.nivelUrgencia === 'verde').length,
      esperando: activos.filter((u) => u.estado === 'esperando').length,
      enAtencion: activos.filter((u) => u.estado === 'en_atencion' || u.estado === 'observacion').length,
      altasHoy: urgencias.filter((u) => u.estado === 'alta').length,
    };
  }, [urgencias]);

  const handleUpdateUrgencia = useCallback((updated: Urgencia) => {
    updateUrgencia(updated);
  }, [updateUrgencia]);

  const handleNuevoIngreso = useCallback((nueva: Urgencia) => {
    addUrgencia(nueva);
    setShowNuevoIngreso(false);
    setSelectedId(nueva.id);
  }, [addUrgencia]);

  const handleExportExcel = () => {
    const data = [...urgencias];
    const rows = data.map((u) => ({
      ID: u.id,
      Paciente: u.patientName,
      Expediente: u.patientExpediente,
      Edad: u.edad,
      Genero: u.genero === 'M' ? 'Masculino' : 'Femenino',
      Fecha: u.fecha,
      'Hora Llegada': u.horaLlegada,
      'Hora Atención': u.horaAtencion || '—',
      'Hora Alta': u.horaAlta || '—',
      'Nivel Urgencia': urgenciaConfig[u.nivelUrgencia].label,
      Estado: estadoUrgenciaConfig[u.estado].label,
      Motivo: u.motivo,
      'Vía Acceso': u.viaAcceso,
      Médico: u.doctorName || '—',
      'Destino Alta': u.destinoAlta ? destinoAltaConfig[u.destinoAlta].label : '—',
    }));
    const dateStr = new Date().toISOString().split('T')[0];
    exportToExcel(rows, `Urgencias_MediCore_${dateStr}`, 'Urgencias');
  };

  const getTiempoEspera = (horaLlegada: string, estado: EstadoUrgencia): string => {
    if (estado === 'alta') return '—';
    const minutos = calcularMinutosEspera(horaLlegada);
    return formatearTiempo(minutos);
  };

  const getEsperaColor = (minutos: number, nivel: NivelUrgencia): string => {
    const thresholds: Record<NivelUrgencia, { warning: number; danger: number }> = {
      rojo: { warning: 5, danger: 10 },
      naranja: { warning: 15, danger: 30 },
      amarillo: { warning: 45, danger: 90 },
      verde: { warning: 90, danger: 150 },
    };
    const t = thresholds[nivel];
    if (minutos >= t.danger) return 'text-red-600 font-bold';
    if (minutos >= t.warning) return 'text-amber-600 font-semibold';
    return 'text-foreground-500';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground-600 bg-background-50 border border-secondary-200 rounded-lg hover:bg-secondary-100 transition-base cursor-pointer whitespace-nowrap"
          >
            <i className="ri-file-excel-line"></i>
            Exportar Excel
          </button>
          <button
            type="button"
            aria-label="Registrar nuevo ingreso de urgencias"
            onClick={() => setShowNuevoIngreso(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-base cursor-pointer whitespace-nowrap shadow-sm"
          >
            <i className="ri-add-line" aria-hidden="true"></i>
            Nuevo ingreso
          </button>
        </div>

      {/* Contadores por nivel de triage */}
      <div className="flex items-center gap-0 rounded-lg border border-secondary-200/70 bg-background-50 overflow-hidden">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-red-500"><i className="ri-heart-pulse-fill"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.rojos}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Emergencia</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-orange-500"><i className="ri-alert-fill"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.naranjas}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Urgencia</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-amber-500"><i className="ri-time-fill"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.amarillos}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Preferente</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-emerald-500"><i className="ri-check-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.verdes}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">No urgente</p>
          </div>
        </div>
      </div>

      {/* Stats generales */}
      <div className="flex items-center gap-0 rounded-lg border border-secondary-200/70 bg-background-50 overflow-hidden">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-red-500"><i className="ri-heart-pulse-fill"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.rojos + stats.naranjas}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Emerg. activas</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-orange-500"><i className="ri-alert-fill"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.naranjas}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Urg. activas</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-amber-500"><i className="ri-time-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.esperando}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Esperando</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-sky-500"><i className="ri-stethoscope-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.enAtencion}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">En atención</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-emerald-500"><i className="ri-check-double-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.altasHoy}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Altas hoy</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-foreground-500"><i className="ri-group-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.total}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Total ingresos</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Lista de urgencias */}
        <Card className="w-full lg:w-[420px] flex-shrink-0" padding="none">
          <div className="p-3 border-b border-secondary-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground-800">Pacientes en urgencias</h2>
              <span className="text-2xs text-foreground-400">{urgenciasOrdenadas.length} registros</span>
            </div>
            <div className="relative mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
                <i className="ri-search-line text-sm" aria-hidden="true"></i>
              </span>
              <input
                type="search"
                placeholder="Buscar paciente o motivo..."
                aria-label="Buscar urgencia por paciente, expediente o motivo"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                maxLength={100}
                className="w-full pl-10 pr-3 py-1.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setFilterNivel('todos')}
                className={`px-2 py-0.5 text-[10px] rounded-full cursor-pointer transition-base whitespace-nowrap ${filterNivel === 'todos' ? 'bg-primary-100 text-primary-700 border border-primary-300' : 'bg-secondary-100 text-foreground-600 border border-secondary-200 hover:border-secondary-300'}`}
              >
                Todos
              </button>
              {nivelOrder.map((n) => (
                <button
                  key={n}
                  onClick={() => setFilterNivel(n)}
                  className={`px-2 py-0.5 text-[10px] rounded-full cursor-pointer transition-base whitespace-nowrap flex items-center gap-1 ${filterNivel === n ? `${urgenciaConfig[n].bg} ${urgenciaConfig[n].text} ${urgenciaConfig[n].border} border` : 'bg-secondary-100 text-foreground-600 border border-secondary-200 hover:border-secondary-300'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${urgenciaConfig[n].color}`}></span>
                  {urgenciaConfig[n].label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 flex-wrap mt-1.5">
              <button
                onClick={() => setFilterEstado('todos')}
                className={`px-2 py-0.5 text-[10px] rounded-full cursor-pointer transition-base whitespace-nowrap ${filterEstado === 'todos' ? 'bg-primary-100 text-primary-700 border border-primary-300' : 'bg-secondary-100 text-foreground-600 border border-secondary-200 hover:border-secondary-300'}`}
              >
                Todos
              </button>
              {(['esperando', 'en_atencion', 'observacion', 'alta'] as EstadoUrgencia[]).map((e) => (
                <button
                  key={e}
                  onClick={() => setFilterEstado(e)}
                  className={`px-2 py-0.5 text-[10px] rounded-full cursor-pointer transition-base whitespace-nowrap flex items-center gap-1 ${filterEstado === e ? `${estadoUrgenciaConfig[e].bg} ${estadoUrgenciaConfig[e].color} border ${estadoUrgenciaConfig[e].bg.replace('bg-', 'border-').replace('50', '200')}` : 'bg-secondary-100 text-foreground-600 border border-secondary-200 hover:border-secondary-300'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${estadoUrgenciaConfig[e].dot}`}></span>
                  {estadoUrgenciaConfig[e].label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            {pagination.paginatedData.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 px-4 text-center">
                <span className="w-12 h-12 flex items-center justify-center rounded-full bg-secondary-100 text-foreground-400">
                  <i className="ri-inbox-line text-xl"></i>
                </span>
                <p className="text-sm font-medium text-foreground-600">Sin registros</p>
                <p className="text-xs text-foreground-400">No hay urgencias que coincidan con los filtros seleccionados.</p>
              </div>
            ) : (
              pagination.paginatedData.map((u) => {
                const isSelected = selectedId === u.id;
                const urgConfig = urgenciaConfig[u.nivelUrgencia];
                const estadoConfig = estadoUrgenciaConfig[u.estado];
                const minutosEspera = u.estado !== 'alta' ? calcularMinutosEspera(u.horaLlegada) : 0;
                const tiempoTexto = getTiempoEspera(u.horaLlegada, u.estado);
                const esperaClass = getEsperaColor(minutosEspera, u.nivelUrgencia);

                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedId(isSelected ? '' : u.id)}
                    className={`w-full text-left transition-base cursor-pointer border-b border-secondary-100 last:border-b-0 ${
                      isSelected ? 'bg-primary-50/60' : 'hover:bg-secondary-50/40'
                    }`}
                  >
                    <div className="px-4 py-3.5">
                      <div className="flex items-start gap-3">
                        {/* Priority indicator */}
                        <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                          <span className={`w-3 h-3 rounded-full ${urgConfig.color} ${u.estado === 'esperando' ? 'animate-pulse' : ''}`}></span>
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${urgConfig.text}`}>{urgConfig.label.charAt(0)}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="text-sm font-semibold text-foreground-900 truncate">{u.patientName}</p>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium ${estadoConfig.bg} ${estadoConfig.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${estadoConfig.dot} ${u.estado === 'en_atencion' ? 'animate-pulse' : ''}`}></span>
                              {estadoConfig.label}
                            </span>
                          </div>
                          <p className="text-2xs text-foreground-500">{u.patientExpediente} · {u.edad} años · {u.genero === 'F' ? 'F' : 'M'}</p>
                          <p className="text-xs text-foreground-600 mt-1.5 line-clamp-2 leading-relaxed">{u.motivo}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2 text-2xs text-foreground-400">
                              <span className="flex items-center gap-1">
                                <i className="ri-time-line"></i>
                                {u.horaLlegada}
                              </span>
                              {u.horaAtencion && (
                                <span className="flex items-center gap-1">
                                  <i className="ri-stethoscope-line text-sky-400"></i>
                                  {u.horaAtencion}
                                </span>
                              )}
                              {u.horaAlta && (
                                <span className="flex items-center gap-1">
                                  <i className="ri-check-double-line text-emerald-400"></i>
                                  {u.horaAlta}
                                </span>
                              )}
                            </div>
                            {u.estado !== 'alta' && (
                              <span className={`text-2xs ${esperaClass}`}>
                                <i className="ri-hourglass-line mr-0.5"></i>
                                {tiempoTexto}
                              </span>
                            )}
                          </div>
                          {u.destinoAlta && (
                            <div className="mt-1.5 flex items-center gap-1 text-2xs text-emerald-600">
                              <i className={destinoAltaConfig[u.destinoAlta].icon}></i>
                              Alta: {destinoAltaConfig[u.destinoAlta].label}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <PaginationControls {...pagination} />
        </Card>

        {/* Panel de detalle */}
        <div className="flex-1 min-w-0 w-full">
          {urgenciaSeleccionada ? (
            <AtencionUrgenciaPanel
              urgencia={urgenciaSeleccionada}
              onUpdate={handleUpdateUrgencia}
            />
          ) : (
            <Card>
              <div className="flex flex-col items-center gap-4 py-20 text-foreground-400">
                <span className="w-16 h-16 flex items-center justify-center rounded-full bg-secondary-100">
                  <i className="ri-heart-pulse-line text-3xl"></i>
                </span>
                <div className="text-center max-w-sm">
                  <p className="text-base font-medium text-foreground-600 mb-1">Selecciona una urgencia</p>
                  <p className="text-sm">Elige un paciente del panel izquierdo para ver el detalle clínico, signos vitales, nota médica y gestionar el proceso de atención y alta.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Modal de nuevo ingreso */}
      <NuevoIngresoModal
        open={showNuevoIngreso}
        onClose={() => setShowNuevoIngreso(false)}
        onSubmit={handleNuevoIngreso}
      />
    </div>
  );
}