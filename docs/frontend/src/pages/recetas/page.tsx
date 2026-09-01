import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { recetas, recetasUrgencia, subscribeRecetasUrgencia, updateRecetaUrgenciaGlobal, getRecetaById, type Receta, type MedicamentoPrescrito } from '@/mocks/recetas';
import { useAuth } from '@/hooks/useAuth';
import { getConsultasByPatient } from '@/mocks/consultas';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import RecetaPrintModal from './components/RecetaPrintModal';
import { exportToExcel } from '@/utils/exportUtils';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/feature/PaginationControls';

const estadoRecetaConfig: Record<Receta['estado'], { label: string; variant: 'success' | 'warning' | 'info' | 'secondary'; color: string }> = {
  activa: { label: 'Activa', variant: 'success', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  surtida: { label: 'Surtida', variant: 'info', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  parcial: { label: 'Parcial', variant: 'warning', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  vencida: { label: 'Vencida', variant: 'secondary', color: 'bg-secondary-100 text-foreground-600 border-secondary-200' },
  cancelada: { label: 'Cancelada', variant: 'warning', color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

export default function Recetas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const recetaParam = searchParams.get('receta') || '';
  const pacienteParam = searchParams.get('paciente') || '';

  const [search, setSearch] = useState('');
  const [recetaSeleccionada, setRecetaSeleccionada] = useState<Receta | null>(null);
  const [filterEstado, setFilterEstado] = useState<Receta['estado'] | 'todas'>('todas');
  const [showEstadoMenu, setShowEstadoMenu] = useState(false);
  const [recetasList, setRecetasList] = useState<Receta[]>([...recetas, ...recetasUrgencia]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Auto-select receta from URL param
  useEffect(() => {
    if (recetaParam) {
      const found = getRecetaById(recetaParam);
      if (found) {
        setRecetaSeleccionada(found);
        setSearch('');
        setFilterEstado('todas');
      }
    }
  }, [recetaParam]);

  // Filter by patient from URL
  useEffect(() => {
    if (pacienteParam) {
      setFilterEstado('todas');
      setSearch('');
    }
  }, [pacienteParam]);

  // Mantener sincronizadas las recetas de urgencia creadas/surtidas en
  // Urgencias y Farmacia con el listado de Recetas.
  useEffect(() => {
    const sync = () => setRecetasList([...recetas, ...recetasUrgencia]);
    return subscribeRecetasUrgencia(sync);
  }, []);

  const { user } = useAuth();
  const isDoctor = user?.rol === 'medico';
  const myDoctorId = user?.doctorId;

  const recetasFiltradas = useMemo(() => {
    let list = [...recetasList];
    // Médicos solo ven sus recetas
    if (isDoctor && myDoctorId) {
      list = list.filter((r) => r.doctorId === myDoctorId);
    }
    if (pacienteParam) {
      list = list.filter((r) => r.patientId === pacienteParam);
    }
    if (filterEstado !== 'todas') {
      list = list.filter((r) => r.estado === filterEstado);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.patientName.toLowerCase().includes(q) ||
          r.patientExpediente.toLowerCase().includes(q) ||
          r.diagnosticoRelacionado.toLowerCase().includes(q) ||
          r.doctorName.toLowerCase().includes(q) ||
          r.medicamentos.some((m) => m.nombre.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => {
      if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
      return b.hora.localeCompare(a.hora);
    });
  }, [search, filterEstado, pacienteParam, recetasList]);

  const pagination = usePagination(recetasFiltradas, 10);

  const stats = useMemo(() => {
    const total = recetasList.length;
    const activas = recetasList.filter((r) => r.estado === 'activa').length;
    const today = new Date().toISOString().split('T')[0];
    const todayCount = recetasList.filter((r) => r.fecha === today).length;
    const totalMeds = recetasList.reduce((acc, r) => acc + r.medicamentos.length, 0);
    return { total, activas, todayCount, totalMeds };
  }, [recetasList]);

  const changeEstado = (newEstado: Receta['estado']) => {
    if (!recetaSeleccionada) return;
    const updated = { ...recetaSeleccionada, estado: newEstado };
    setRecetasList((prev) =>
      prev.map((r) => (r.id === recetaSeleccionada.id ? updated : r))
    );
    setRecetaSeleccionada(updated);
    if (recetaSeleccionada.urgenciaId) {
      updateRecetaUrgenciaGlobal(updated);
    }
    setShowEstadoMenu(false);
  };

  const handleSelectReceta = (r: Receta) => {
    if (recetaSeleccionada?.id === r.id) {
      setRecetaSeleccionada(null);
      return;
    }
    setRecetaSeleccionada(r);
    setShowEstadoMenu(false);
  };

  const handleVolverListado = () => {
    setRecetaSeleccionada(null);
    setShowEstadoMenu(false);
    if (recetaParam) {
      searchParams.delete('receta');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleExportExcel = () => {
    const data = [...recetasFiltradas];
    const rows = data.map((r) => ({
      Folio: `RX-${r.id.replace('r', '').padStart(4, '0')}`,
      Paciente: r.patientName,
      Expediente: r.patientExpediente,
      Medico: r.doctorName,
      Fecha: r.fecha,
      Hora: r.hora,
      Estado: estadoRecetaConfig[r.estado].label,
      Diagnostico: r.diagnosticoRelacionado,
      Medicamentos: r.medicamentos.length,
    }));
    const dateStr = new Date().toISOString().split('T')[0];
    exportToExcel(rows, `Recetas_MediCore_${dateStr}`, 'Recetas');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            size="sm"
            variant="secondary"
            icon={<i className="ri-file-excel-line"></i>}
            onClick={handleExportExcel}
          >
            Exportar Excel
          </Button>
        </div>

      {/* Stats */}
      <div className="flex items-center gap-0 rounded-lg border border-secondary-200/70 bg-background-50 overflow-hidden">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-primary-600"><i className="ri-file-text-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.total}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Total recetas</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-emerald-600"><i className="ri-check-double-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.activas}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Activas</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-sky-600"><i className="ri-calendar-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.todayCount}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Emitidas hoy</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-amber-600"><i className="ri-capsule-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.totalMeds}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Medicamentos</p>
          </div>
        </div>
      </div>

      {/* Patient Filter Banner */}
      {pacienteParam && recetasFiltradas.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-accent-50 border border-accent-200/50 rounded-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 flex items-center justify-center rounded-full bg-accent-100 text-accent-600 shrink-0">
              <i className="ri-user-search-line text-sm"></i>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-accent-800 truncate">
                Recetas de {recetasFiltradas[0]?.patientName}
              </p>
              <p className="text-[10px] text-accent-500">{recetasFiltradas.length} receta(s) encontrada(s)</p>
            </div>
          </div>
          <button
            onClick={() => {
              searchParams.delete('paciente');
              searchParams.delete('receta');
              setSearchParams(searchParams, { replace: true });
              setRecetaSeleccionada(null);
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-accent-600 hover:text-accent-700 hover:bg-accent-100 rounded-md transition-base cursor-pointer whitespace-nowrap shrink-0"
          >
            <i className="ri-close-line"></i> Quitar filtro
          </button>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Left: Recetas List */}
        <Card className="w-full lg:w-80 flex-shrink-0" padding="none">
          <div className="p-3 border-b border-secondary-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground-800">Recetas</h2>
              <span className="text-2xs text-foreground-400">{recetasFiltradas.length} registros</span>
            </div>
            <div className="relative mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
                <i className="ri-search-line text-sm"></i>
              </span>
              <input
                type="search"
                aria-label="Buscar paciente, medicamento o diagnóstico"
                placeholder="Paciente, medicamento, diagnóstico..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-1.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {(['todas', 'activa', 'surtida', 'parcial', 'vencida', 'cancelada'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterEstado(f)}
                  className={`px-2 py-0.5 text-[10px] rounded-full cursor-pointer transition-base whitespace-nowrap ${
                    filterEstado === f
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-secondary-100 text-foreground-600 border border-secondary-200 hover:border-secondary-300'
                  }`}
                >
                  {f === 'todas' ? 'Todas' : estadoRecetaConfig[f].label}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            {pagination.paginatedData.map((r) => {
              const isSelected = recetaSeleccionada?.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => handleSelectReceta(r)}
                  className={`w-full text-left px-4 py-3 border-b border-secondary-100 transition-base cursor-pointer hover:bg-secondary-50/50 ${
                    isSelected ? 'bg-primary-50/50 border-l-2 border-l-primary-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium text-foreground-900 truncate">{r.patientName}</p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium ${estadoRecetaConfig[r.estado].color}`}>
                          {estadoRecetaConfig[r.estado].label}
                        </span>
                      </div>
                      <p className="text-2xs text-foreground-500 mt-0.5">{r.patientExpediente} · {r.fecha} {r.hora}</p>
                      <p className="text-xs text-foreground-600 mt-1 line-clamp-1 flex items-center gap-1">
                        <i className="ri-capsule-line text-foreground-400 text-2xs"></i>
                        {r.medicamentos.length} medicamento{r.medicamentos.length > 1 ? 's' : ''}
                      </p>
                      <p className="text-2xs text-foreground-400 mt-0.5">{r.doctorName}</p>
                    </div>
                    <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      <i className={`text-sm text-foreground-400 ${isSelected ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></i>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <PaginationControls {...pagination} />
        </Card>

        {/* Right: Receta Detail */}
        <div className="flex-1 min-w-0 w-full">
          {!recetaSeleccionada ? (
            <Card>
              <div className="flex flex-col items-center gap-4 py-20 text-foreground-400">
                <span className="w-16 h-16 flex items-center justify-center rounded-full bg-secondary-100">
                  <i className="ri-capsule-line text-3xl"></i>
                </span>
                <div className="text-center max-w-sm">
                  <p className="text-base font-medium text-foreground-600 mb-1">Selecciona una receta</p>
                  <p className="text-sm">Elige una receta del panel izquierdo para ver el detalle completo de medicamentos, dosis e indicaciones.</p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleVolverListado}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap w-fit"
              >
                <i className="ri-arrow-left-line"></i> Volver al listado
              </button>
              {/* Receta Header */}
              <Card padding="md" id="receta-printable">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-4 pb-4 border-b border-secondary-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 flex-shrink-0">
                        <i className="ri-capsule-line"></i>
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-foreground-900">Receta Médica</h3>
                        <p className="text-2xs text-foreground-400 font-mono">
                          Folio: RX-{recetaSeleccionada.urgenciaId ? 'URG-' : ''}{recetaSeleccionada.id.replace('r', '').padStart(4, '0')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        onClick={() => setShowEstadoMenu(!showEstadoMenu)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-2xs font-medium cursor-pointer transition-base ${estadoRecetaConfig[recetaSeleccionada.estado].color}`}
                      >
                        {estadoRecetaConfig[recetaSeleccionada.estado].label}
                        <i className="ri-arrow-down-s-line text-[10px]"></i>
                      </button>
                      {showEstadoMenu && (
                        <div className="absolute top-full right-0 mt-1 bg-background-50 border border-secondary-200 rounded-lg shadow-lg z-30 py-1 min-w-[120px]">
                          {(['activa', 'surtida', 'parcial', 'vencida', 'cancelada'] as const).map((e) => (
                            <button
                              key={e}
                              onClick={() => changeEstado(e)}
                              className={`w-full text-left px-3 py-2 text-xs cursor-pointer transition-base hover:bg-secondary-50 flex items-center gap-2 ${recetaSeleccionada.estado === e ? 'bg-primary-50 text-primary-700 font-medium' : 'text-foreground-700'}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${e === 'activa' ? 'bg-emerald-500' : e === 'surtida' ? 'bg-sky-500' : e === 'parcial' ? 'bg-amber-500' : e === 'vencida' ? 'bg-secondary-400' : 'bg-amber-500'}`}></span>
                              {estadoRecetaConfig[e].label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {recetaSeleccionada.urgenciaId && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-red-100 text-red-700 border border-red-200">
                        <i className="ri-heart-pulse-line text-[10px]"></i>
                        Urgencia
                      </span>
                    )}
                    <span className="text-2xs text-foreground-400">{recetaSeleccionada.fecha} · {recetaSeleccionada.hora} hrs</span>
                  </div>
                </div>

                {/* Datos del paciente y médico */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-background-50 rounded-lg border border-secondary-100">
                    <p className="text-2xs text-foreground-400 mb-1 flex items-center gap-1">
                      <i className="ri-user-line"></i> Paciente
                    </p>
                    <p className="text-sm font-semibold text-foreground-900">{recetaSeleccionada.patientName}</p>
                    <p className="text-xs text-foreground-500">Exp: {recetaSeleccionada.patientExpediente}</p>
                  </div>
                  <div className="p-3 bg-background-50 rounded-lg border border-secondary-100">
                    <p className="text-2xs text-foreground-400 mb-1 flex items-center gap-1">
                      <i className="ri-stethoscope-line"></i> Médico tratante
                    </p>
                    <p className="text-sm font-semibold text-foreground-900">{recetaSeleccionada.doctorName}</p>
                    <p className="text-xs text-foreground-500">Cédula: {recetaSeleccionada.doctorCedula}</p>
                  </div>
                </div>

                {/* Diagnóstico */}
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xs text-amber-600 mb-0.5 flex items-center gap-1">
                        <i className="ri-award-line"></i> Diagnóstico
                      </p>
                      <p className="text-sm font-medium text-foreground-800">{recetaSeleccionada.diagnosticoRelacionado}</p>
                    </div>
                    <button
                      onClick={() =>
                        recetaSeleccionada.urgenciaId
                          ? navigate(`/app/urgencias`)
                          : navigate(`/app/consultas?paciente=${recetaSeleccionada.patientId}`)
                      }
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-base cursor-pointer whitespace-nowrap"
                    >
                      <i className={recetaSeleccionada.urgenciaId ? 'ri-heart-pulse-line' : 'ri-stethoscope-line'}></i>
                      {recetaSeleccionada.urgenciaId ? 'Ver urgencia' : 'Ver consulta'}
                    </button>
                  </div>
                </div>

                {/* Medicamentos */}
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-foreground-700 mb-2 flex items-center gap-2">
                    <i className="ri-capsule-line text-primary-600"></i>
                    Medicamentos prescritos ({recetaSeleccionada.medicamentos.length})
                  </h4>
                  <div className="space-y-2">
                    {recetaSeleccionada.medicamentos.map((med, idx) => (
                      <MedicamentoCard key={med.id} med={med} index={idx} />
                    ))}
                  </div>
                </div>

                {/* Indicaciones generales */}
                {recetaSeleccionada.indicacionesGenerales && (
                  <div className="p-3 bg-background-50 rounded-lg border border-secondary-100">
                    <p className="text-2xs text-foreground-400 mb-1 flex items-center gap-1">
                      <i className="ri-information-line"></i> Indicaciones generales
                    </p>
                    <p className="text-xs text-foreground-700 leading-relaxed whitespace-pre-wrap">{recetaSeleccionada.indicacionesGenerales}</p>
                  </div>
                )}

                {/* Actions bar */}
                <div className="mt-4 pt-4 border-t border-secondary-100 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-4 text-2xs text-foreground-400">
                    <span className="flex items-center gap-1"><i className="ri-user-line"></i> {recetaSeleccionada.doctorName}</span>
                    <span className="flex items-center gap-1"><i className="ri-calendar-line"></i> {recetaSeleccionada.fecha}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" icon={<i className="ri-printer-line"></i>} onClick={() => setIsPrintModalOpen(true)}>
                      Imprimir receta
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<i className={recetaSeleccionada.urgenciaId ? 'ri-heart-pulse-line' : 'ri-stethoscope-line'}></i>}
                      onClick={() =>
                        recetaSeleccionada.urgenciaId
                          ? navigate(`/app/urgencias`)
                          : navigate(`/app/consultas?paciente=${recetaSeleccionada.patientId}`)
                      }
                    >
                      {recetaSeleccionada.urgenciaId ? 'Ver urgencia' : 'Ver consulta'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Print Modal */}
      {recetaSeleccionada && (
        <RecetaPrintModal
          receta={recetaSeleccionada}
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
}

function MedicamentoCard({ med, index }: { med: MedicamentoPrescrito; index: number }) {
  return (
    <div className="p-3 bg-background-50 rounded-lg border border-secondary-200 hover:border-secondary-300 transition-base">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 text-2xs font-bold flex-shrink-0 mt-0.5">{index + 1}</span>
          <div>
            <p className="text-sm font-semibold text-foreground-900">{med.nombre}</p>
            <p className="text-xs text-foreground-500">{med.presentacion} · {med.concentracion}</p>
          </div>
        </div>
        <span className="text-xs px-2 py-0.5 bg-secondary-100 text-foreground-600 rounded-full whitespace-nowrap">{med.via}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 mt-3 ml-8 text-xs">
        <div>
          <span className="text-2xs text-foreground-400">Dosis</span>
          <p className="font-medium text-foreground-700">{med.dosis}</p>
        </div>
        <div>
          <span className="text-2xs text-foreground-400">Frecuencia</span>
          <p className="font-medium text-foreground-700">{med.frecuencia}</p>
        </div>
        <div>
          <span className="text-2xs text-foreground-400">Vía</span>
          <p className="font-medium text-foreground-700">{med.via}</p>
        </div>
        <div>
          <span className="text-2xs text-foreground-400">Duración</span>
          <p className="font-medium text-foreground-700">{med.duracion}</p>
        </div>
      </div>
      {med.indicaciones && (
        <p className="text-xs text-foreground-500 mt-2 ml-8 p-2 bg-background-50 rounded border border-secondary-100 italic">
          {med.indicaciones}
        </p>
      )}
    </div>
  );
}