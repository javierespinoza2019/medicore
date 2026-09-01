import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { catalogoEstudios, searchEstudios, type EstudioSolicitado, type EstudioCatalogo, type ParametroResultado } from '@/mocks/estudios';
import { patients } from '@/mocks/patients';
import { doctors } from '@/mocks/doctors';
import { useEstudiosState } from '@/hooks/useEstudiosState';
import { useCaja } from '@/hooks/useCajaContext';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import { exportTextToPDF, exportToExcel } from '@/utils/exportUtils';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/feature/PaginationControls';
import ResultadoModal from './components/ResultadoModal';

const estadoEstudioConfig: Record<EstudioSolicitado['estado'], { label: string; variant: 'success' | 'warning' | 'info' | 'secondary'; color: string; icon: string }> = {
  solicitado: { label: 'Solicitado', variant: 'warning', color: 'bg-amber-500/15 text-amber-500 border-amber-500/20', icon: 'ri-file-list-3-line' },
  en_proceso: { label: 'En proceso', variant: 'info', color: 'bg-sky-500/15 text-sky-500 border-sky-500/20', icon: 'ri-loader-4-line' },
  completado: { label: 'Completado', variant: 'success', color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20', icon: 'ri-check-double-line' },
  cancelado: { label: 'Cancelado', variant: 'secondary', color: 'bg-secondary-100 text-foreground-600 border-secondary-200', icon: 'ri-close-circle-line' },
};

const tipoEstudioConfig: Record<EstudioCatalogo['tipo'], { label: string; icon: string; color: string }> = {
  laboratorio: { label: 'Laboratorio', icon: 'ri-test-tube-line', color: 'bg-violet-100 text-violet-700' },
  imagen: { label: 'Imagen', icon: 'ri-image-line', color: 'bg-sky-500/15 text-sky-500' },
  gabinete: { label: 'Gabinete', icon: 'ri-computer-line', color: 'bg-teal-100 text-teal-700' },
  patologia: { label: 'Patología', icon: 'ri-microscope-line', color: 'bg-rose-100 text-rose-700' },
  otro: { label: 'Otro', icon: 'ri-more-line', color: 'bg-secondary-100 text-foreground-600' },
};

export default function Estudios() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const estudioParam = searchParams.get('estudio') || '';
  const pacienteParam = searchParams.get('paciente') || '';

  const [search, setSearch] = useState('');
  const [estudioSeleccionado, setEstudioSeleccionado] = useState<EstudioSolicitado | null>(null);
  const [filterEstado, setFilterEstado] = useState<EstudioSolicitado['estado'] | 'todas'>('todas');
  const [filterTipo, setFilterTipo] = useState<EstudioCatalogo['tipo'] | 'todas'>('todas');
  const [tabActiva, setTabActiva] = useState<'solicitudes' | 'catalogo'>('solicitudes');
  const [catalogoSeleccionado, setCatalogoSeleccionado] = useState<EstudioCatalogo | null>(null);
  const [showEstadoMenu, setShowEstadoMenu] = useState(false);
  const { estudios: estudiosList, addEstudio, updateEstudio } = useEstudiosState();
  const [downloadMsg, setDownloadMsg] = useState('');
  const [showSolicitarDialog, setShowSolicitarDialog] = useState(false);
  const [showResultadoModal, setShowResultadoModal] = useState(false);
  const [estudioParaResultado, setEstudioParaResultado] = useState<EstudioSolicitado | null>(null);
  const { addTransaction } = useCaja();

  // Auto-select from URL param
  useEffect(() => {
    if (estudioParam) {
      const found = estudiosList.find((e) => e.id === estudioParam);
      if (found) {
        setEstudioSeleccionado(found);
        setSearch('');
        setFilterEstado('todas');
        setFilterTipo('todas');
        setTabActiva('solicitudes');
      }
    }
  }, [estudioParam]);

  useEffect(() => {
    if (pacienteParam) {
      setFilterEstado('todas');
      setFilterTipo('todas');
      setTabActiva('solicitudes');
    }
  }, [pacienteParam]);

  const { user } = useAuth();
  const isDoctor = user?.rol === 'medico';
  const myDoctorId = user?.doctorId;

  const estudiosFiltrados = useMemo(() => {
    let list = [...estudiosList];
    // Médicos solo ven sus estudios solicitados
    if (isDoctor && myDoctorId) {
      list = list.filter((e) => e.doctorId === myDoctorId);
    }
    if (pacienteParam) {
      list = list.filter((e) => e.patientId === pacienteParam);
    }
    if (filterEstado !== 'todas') {
      list = list.filter((e) => e.estado === filterEstado);
    }
    if (filterTipo !== 'todas') {
      list = list.filter((e) => e.tipo === filterTipo);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.patientName.toLowerCase().includes(q) ||
          e.patientExpediente.toLowerCase().includes(q) ||
          e.nombre.toLowerCase().includes(q) ||
          e.diagnosticoRelacionado.toLowerCase().includes(q) ||
          e.doctorName.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      if (a.fechaSolicitud !== b.fechaSolicitud) return b.fechaSolicitud.localeCompare(a.fechaSolicitud);
      return b.horaSolicitud.localeCompare(a.horaSolicitud);
    });
  }, [search, filterEstado, filterTipo, pacienteParam, estudiosList]);

  const estudiosFiltradosPagination = usePagination(estudiosFiltrados, 10);

  const catalogoFiltrado = useMemo(() => {
    if (!search.trim()) return catalogoEstudios;
    return searchEstudios(search);
  }, [search]);

  const stats = useMemo(() => {
    const total = estudiosList.length;
    const solicitados = estudiosList.filter((e) => e.estado === 'solicitado').length;
    const enProceso = estudiosList.filter((e) => e.estado === 'en_proceso').length;
    const completados = estudiosList.filter((e) => e.estado === 'completado').length;
    return { total, solicitados, enProceso, completados };
  }, [estudiosList]);

  const changeEstado = (newEstado: EstudioSolicitado['estado']) => {
    if (!estudioSeleccionado) return;
    if (newEstado === 'completado') {
      setEstudioParaResultado(estudioSeleccionado);
      setShowResultadoModal(true);
      return;
    }
    const updated = {
      ...estudioSeleccionado,
      estado: newEstado,
      fechaResultado: newEstado === 'completado' ? new Date().toISOString().split('T')[0] : estudioSeleccionado.fechaResultado,
    };
    updateEstudio(updated);
    setEstudioSeleccionado(updated);
    setShowEstadoMenu(false);
  };

  const handleGuardarResultado = (resultado: string, parametros: ParametroResultado[]) => {
    if (!estudioParaResultado) return;
    const updated = {
      ...estudioParaResultado,
      estado: 'completado' as const,
      fechaResultado: new Date().toISOString().split('T')[0],
      resultado,
      parametros,
    };
    updateEstudio(updated);
    setEstudioSeleccionado(updated);
    setShowResultadoModal(false);
    setEstudioParaResultado(null);
    setShowEstadoMenu(false);
  };

  const handleDownload = () => {
    if (!estudioSeleccionado) return;
    const estudio = estudioSeleccionado;
    const estado = estadoEstudioConfig[estudio.estado];
    const tipo = tipoEstudioConfig[estudio.tipo];

    const content = [
      `Estudio: ${estudio.nombre}`,
      `Tipo: ${tipo.label} | Categoría: ${estudio.categoria}`,
      `Referencia: ${estudio.numeroReferencia}`,
      `Estado: ${estado.label}`,
      ``,
      `--- DATOS DEL PACIENTE ---`,
      `Nombre: ${estudio.patientName}`,
      `Expediente: ${estudio.patientExpediente}`,
      ``,
      `--- DATOS DEL MÉDICO ---`,
      `Médico Solicitante: ${estudio.doctorName}`,
      `Fecha de Solicitud: ${estudio.fechaSolicitud} · ${estudio.horaSolicitud} hrs`,
      ``,
      `--- DIAGNÓSTICO RELACIONADO ---`,
      `${estudio.diagnosticoRelacionado}`,
      ``,
      `--- RESULTADOS ---`,
    ];

    if (estudio.estado === 'completado' && estudio.resultado) {
      content.push(`Fecha de resultado: ${estudio.fechaResultado || 'No especificada'}`);
      content.push(``);
      content.push(estudio.resultado);
    } else if (estudio.estado === 'en_proceso') {
      content.push('El estudio se encuentra en proceso. Los resultados estarán disponibles próximamente.');
    } else if (estudio.estado === 'solicitado') {
      content.push('El estudio ha sido solicitado. El paciente debe acudir al área correspondiente.');
    } else {
      content.push('Estudio cancelado.');
    }

    if (estudio.notas) {
      content.push(``);
      content.push(`--- NOTAS ---`);
      content.push(estudio.notas);
    }

    content.push(``);
    content.push(`--- INFORMACIÓN ADICIONAL ---`);
    if (estudio.archivosAdjuntos > 0) {
      content.push(`Archivos adjuntos: ${estudio.archivosAdjuntos}`);
    }
    content.push(`Tipo de estudio: ${tipo.label}`);
    content.push(`Categoría: ${estudio.categoria}`);

    exportTextToPDF(content.join('\n'), `Resultado_${estudio.numeroReferencia}`, {
      title: 'Reporte de Resultados',
      subtitle: `${estudio.nombre} — ${estudio.numeroReferencia}`,
      headerInfo: [
        { label: 'Paciente', value: estudio.patientName },
        { label: 'Expediente', value: estudio.patientExpediente },
        { label: 'Médico', value: estudio.doctorName },
        { label: 'Fecha Solicitud', value: `${estudio.fechaSolicitud} · ${estudio.horaSolicitud} hrs` },
        { label: 'Estado', value: estado.label },
        { label: 'Referencia', value: estudio.numeroReferencia },
      ],
      footerText: `Documento generado por MediCore — ${estudio.numeroReferencia}`,
    });

    setDownloadMsg('PDF descargado correctamente');
    setTimeout(() => setDownloadMsg(''), 3000);
  };

  const handleSolicitar = (cat: EstudioCatalogo) => {
    setCatalogoSeleccionado(cat);
    setShowSolicitarDialog(true);
  };

  const handleExportExcel = () => {
    const data = [...estudiosFiltrados];
    const rows = data.map((e) => ({
      Referencia: e.numeroReferencia,
      Paciente: e.patientName,
      Expediente: e.patientExpediente,
      Medico: e.doctorName,
      Estudio: e.nombre,
      Tipo: tipoEstudioConfig[e.tipo].label,
      Categoria: e.categoria,
      Estado: estadoEstudioConfig[e.estado].label,
      'Fecha Solicitud': e.fechaSolicitud,
      'Hora Solicitud': e.horaSolicitud,
      'Fecha Resultado': e.fechaResultado || '—',
      Diagnostico: e.diagnosticoRelacionado,
      'Archivos Adjuntos': e.archivosAdjuntos,
    }));
    const dateStr = new Date().toISOString().split('T')[0];
    exportToExcel(rows, `Estudios_MediCore_${dateStr}`, 'Estudios');
  };

  const confirmSolicitar = () => {
    if (!catalogoSeleccionado) return;
    const patient = patients.find((p) => p.id === (pacienteParam || 'p1'));
    const doctor = doctors.find((d) => d.id === myDoctorId) || doctors[0];
    const fechaHoy = new Date().toISOString().split('T')[0];
    const newEstudio: EstudioSolicitado = {
      id: `es-${Date.now()}`,
      patientId: patient?.id || 'p1',
      patientName: patient ? `${patient.nombre} ${patient.apellidos}` : 'Paciente',
      patientExpediente: patient?.expediente || 'EXP-2024-0001',
      doctorId: doctor?.id || 'd1',
      doctorName: doctor?.nombre || 'Dr. Asignado',
      consultaId: 'c1',
      estudioCatalogoId: catalogoSeleccionado.id,
      nombre: catalogoSeleccionado.nombre,
      tipo: catalogoSeleccionado.tipo,
      categoria: catalogoSeleccionado.categoria,
      fechaSolicitud: fechaHoy,
      horaSolicitud: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      fechaResultado: null,
      estado: 'solicitado',
      resultado: null,
      parametros: [],
      archivosAdjuntos: 0,
      numeroReferencia: `EST-${fechaHoy.replace(/-/g, '')}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
      notas: catalogoSeleccionado.requiereAyuno ? 'El paciente debe acudir en ayuno de 8-12 horas.' : '',
      diagnosticoRelacionado: 'Pendiente de vinculación',
    };
    addEstudio(newEstudio);
    setEstudioSeleccionado(newEstudio);
    setShowSolicitarDialog(false);
    setShowEstadoMenu(false);
    // Cobro automático en Caja
    addTransaction({
      pacienteId: newEstudio.patientId,
      paciente: newEstudio.patientName,
      concepto: `Estudio: ${catalogoSeleccionado.nombre}`,
      subtotal: catalogoSeleccionado.precio,
      descuento: 0,
      total: catalogoSeleccionado.precio,
      metodoPago: 'efectivo',
      notas: `Solicitud de estudio ${catalogoSeleccionado.tipo}. Ref: ${newEstudio.numeroReferencia}`,
      origen: 'estudio',
      consultaId: newEstudio.consultaId,
      consultaDoctor: newEstudio.doctorName,
    });
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
        </div>

      {/* Stats */}
      <div className="flex items-center gap-0 rounded-lg border border-secondary-200/70 bg-background-50 overflow-hidden">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-foreground-500"><i className="ri-clipboard-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.total}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Total</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-amber-500"><i className="ri-time-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.solicitados}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Solicitados</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-sky-500"><i className="ri-loader-4-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.enProceso}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">En proceso</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-emerald-500"><i className="ri-check-double-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.completados}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Completados</p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-background-50 rounded-lg border border-secondary-200 p-1 flex gap-1 w-fit">
        <button
          onClick={() => { setTabActiva('solicitudes'); setEstudioSeleccionado(null); }}
          className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-base flex items-center gap-2 ${
            tabActiva === 'solicitudes' ? 'bg-background-50 text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'
          }`}
        >
          <i className="ri-file-list-3-line"></i>
          Solicitudes ({estudiosList.length})
        </button>
        <button
          onClick={() => { setTabActiva('catalogo'); setCatalogoSeleccionado(null); setSearch(''); }}
          className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-base flex items-center gap-2 ${
            tabActiva === 'catalogo' ? 'bg-background-50 text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'
          }`}
        >
          <i className="ri-book-open-line"></i>
          Catálogo ({catalogoEstudios.length})
        </button>
      </div>

      {/* Patient Filter Banner */}
      {pacienteParam && estudiosFiltrados.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-accent-50 border border-accent-200/50 rounded-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 flex items-center justify-center rounded-full bg-accent-100 text-accent-600 shrink-0">
              <i className="ri-user-search-line text-sm"></i>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-accent-800 truncate">
                Estudios de {estudiosFiltrados[0]?.patientName}
              </p>
              <p className="text-[10px] text-accent-500">{estudiosFiltrados.length} estudio(s) encontrado(s)</p>
            </div>
          </div>
          <button
            onClick={() => {
              searchParams.delete('paciente');
              searchParams.delete('estudio');
              setSearchParams(searchParams, { replace: true });
              setEstudioSeleccionado(null);
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-accent-600 hover:text-accent-700 hover:bg-accent-100 rounded-md transition-base cursor-pointer whitespace-nowrap shrink-0"
          >
            <i className="ri-close-line"></i> Quitar filtro
          </button>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Left Sidebar */}
        <Card className="w-full lg:w-80 flex-shrink-0" padding="none">
          <div className="p-3 border-b border-secondary-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground-800">
                {tabActiva === 'solicitudes' ? 'Solicitudes' : 'Catálogo'}
              </h2>
              <span className="text-2xs text-foreground-400">
                {tabActiva === 'solicitudes' ? estudiosFiltrados.length : catalogoFiltrado.length} registros
              </span>
            </div>
            <div className="relative mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
                <i className="ri-search-line text-sm"></i>
              </span>
              <input
                type="search"
                aria-label="Buscar paciente o estudio clínico"
                placeholder={tabActiva === 'solicitudes' ? 'Buscar paciente o estudio...' : 'Buscar tipo de estudio...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-1.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
              />
            </div>
            {tabActiva === 'solicitudes' ? (
              <>
                <div className="flex gap-1 flex-wrap mb-1.5">
                  {(['todas', 'solicitado', 'en_proceso', 'completado', 'cancelado'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilterEstado(f)}
                      className={`px-2 py-0.5 text-[10px] rounded-full cursor-pointer transition-base whitespace-nowrap ${
                        filterEstado === f
                          ? 'bg-primary-100 text-primary-700 border border-primary-300'
                          : 'bg-secondary-100 text-foreground-600 border border-secondary-200 hover:border-secondary-300'
                      }`}
                    >
                      {f === 'todas' ? 'Todas' : estadoEstudioConfig[f].label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {(['todas', 'laboratorio', 'imagen', 'gabinete'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilterTipo(f)}
                      className={`px-2 py-0.5 text-[10px] rounded-full cursor-pointer transition-base whitespace-nowrap ${
                        filterTipo === f
                          ? 'bg-accent-100 text-accent-700 border border-accent-300'
                          : 'bg-secondary-100 text-foreground-600 border border-secondary-200 hover:border-secondary-300'
                      }`}
                    >
                      {f === 'todas' ? 'Todos' : tipoEstudioConfig[f]?.label || f}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <div className="max-h-[calc(100vh-360px)] overflow-y-auto">
            {tabActiva === 'solicitudes' ? (
              estudiosFiltradosPagination.paginatedData.map((e) => {
                const isSelected = estudioSeleccionado?.id === e.id;
                const tipo = tipoEstudioConfig[e.tipo];
                return (
                  <button
                    key={e.id}
                    onClick={() => { setEstudioSeleccionado(isSelected ? null : e); setCatalogoSeleccionado(null); }}
                    className={`w-full text-left px-4 py-3 border-b border-secondary-100 transition-base cursor-pointer hover:bg-secondary-50/50 ${
                      isSelected ? 'bg-primary-50/50 border-l-2 border-l-primary-500' : ''
                    } ${e.estado === 'completado' ? 'opacity-85' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-foreground-900 truncate">{e.patientName}</p>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium ${estadoEstudioConfig[e.estado].color}`}>
                            {estadoEstudioConfig[e.estado].label}
                          </span>
                        </div>
                        <p className="text-xs text-foreground-600 mt-0.5 line-clamp-1">{e.nombre}</p>
                        <div className="flex items-center gap-2 mt-1 text-2xs text-foreground-400">
                          <span className={`inline-flex items-center gap-1 ${tipo.color} px-1 py-0.5 rounded`}>
                            <i className={`${tipo.icon} text-[10px]`}></i>
                            {tipo.label}
                          </span>
                          <span>{e.fechaSolicitud}</span>
                          <span>#{e.numeroReferencia.replace('EST-', '')}</span>
                        </div>
                      </div>
                      <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                        <i className={`text-sm text-foreground-400 ${isSelected ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></i>
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              catalogoFiltrado.map((e) => {
                const isSelected = catalogoSeleccionado?.id === e.id;
                const tipo = tipoEstudioConfig[e.tipo];
                return (
                  <button
                    key={e.id}
                    onClick={() => setCatalogoSeleccionado(isSelected ? null : e)}
                    className={`w-full text-left px-4 py-3 border-b border-secondary-100 transition-base cursor-pointer hover:bg-secondary-50/50 ${
                      isSelected ? 'bg-accent-50/50 border-l-2 border-l-accent-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`w-7 h-7 flex items-center justify-center rounded ${tipo.color} flex-shrink-0`}>
                        <i className={`${tipo.icon} text-xs`}></i>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground-900 line-clamp-2">{e.nombre}</p>
                        <p className="text-2xs text-foreground-500 mt-0.5">{e.categoria} · {e.tiempoResultado}</p>
                        {e.requiereAyuno && (
                          <span className="inline-flex items-center gap-1 text-2xs text-amber-500 mt-1">
                            <i className="ri-restaurant-line"></i> Requiere ayuno
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {tabActiva === 'solicitudes' && <PaginationControls {...estudiosFiltradosPagination} />}
        </Card>

        {/* Right: Detail */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {estudioSeleccionado ? (
            <EstudioDetail
              estudio={estudioSeleccionado}
              onClose={() => setEstudioSeleccionado(null)}
              onChangeEstado={changeEstado}
              showEstadoMenu={showEstadoMenu}
              setShowEstadoMenu={setShowEstadoMenu}
              onDownload={handleDownload}
              downloadMsg={downloadMsg}
              onCapturarResultado={() => {
                setEstudioParaResultado(estudioSeleccionado);
                setShowResultadoModal(true);
              }}
            />
          ) : catalogoSeleccionado ? (
            <CatalogoDetail
              estudio={catalogoSeleccionado}
              onClose={() => setCatalogoSeleccionado(null)}
              onSolicitar={() => handleSolicitar(catalogoSeleccionado)}
            />
          ) : (
            <Card>
              <div className="flex flex-col items-center gap-4 py-20 text-foreground-400">
                <span className="w-16 h-16 flex items-center justify-center rounded-full bg-secondary-100">
                  <i className="ri-microscope-line text-3xl"></i>
                </span>
                <div className="text-center max-w-sm">
                  <p className="text-base font-medium text-foreground-600 mb-1">
                    {tabActiva === 'solicitudes' ? 'Selecciona un estudio' : 'Selecciona un tipo de estudio'}
                  </p>
                  <p className="text-sm">
                    {tabActiva === 'solicitudes'
                      ? 'Elige un estudio del panel izquierdo para ver el detalle, estado y resultados.'
                      : 'Explora el catálogo de estudios disponibles para solicitar.'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Estudio types quick reference */}
          {!estudioSeleccionado && !catalogoSeleccionado && tabActiva === 'solicitudes' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.entries(tipoEstudioConfig).filter(([k]) => k !== 'otro' && k !== 'patologia') as [EstudioCatalogo['tipo'], typeof tipoEstudioConfig['laboratorio']][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setFilterTipo(key)}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-base ${cfg.color} hover:scale-[1.02]`}
                >
                  <i className={`${cfg.icon} text-sm`}></i>
                  <div className="text-left">
                    <p className="text-xs font-medium">{cfg.label}</p>
                    <p className="text-2xs opacity-60">{catalogoEstudios.filter((e) => e.tipo === key).length} estudios</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Solicitar diálogo */}
      {showSolicitarDialog && catalogoSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="solicitar-dialog-title"
        >
          <div className="bg-background-50 rounded-xl shadow-lg p-6 max-w-md w-full mx-4" role="document">
            <div className="flex items-start gap-3 mb-4">
              <span className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 flex-shrink-0" aria-hidden="true">
                <i className="ri-clipboard-line text-lg"></i>
              </span>
              <div>
                <h3 id="solicitar-dialog-title" className="text-base font-semibold text-foreground-900">Solicitar estudio</h3>
                <p className="text-sm text-foreground-500 mt-1">¿Confirmas la solicitud de <strong>{catalogoSeleccionado.nombre}</strong>?</p>
                {catalogoSeleccionado.requiereAyuno && (
                  <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
                    <i className="ri-restaurant-line" aria-hidden="true"></i> Este estudio requiere ayuno de 8-12 horas.
                  </p>
                )}
                <p className="text-xs text-foreground-400 mt-1">Tiempo estimado de resultados: {catalogoSeleccionado.tiempoResultado}</p>
                <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <i className="ri-bank-card-line text-emerald-600 text-sm" aria-hidden="true"></i>
                  <span className="text-xs text-emerald-700 font-medium">
                    Cargo a Caja: <strong>${catalogoSeleccionado.precio.toLocaleString('es-MX')}</strong>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowSolicitarDialog(false)}
                className="px-4 py-2 text-sm font-medium bg-secondary-100 text-foreground-700 rounded-lg hover:bg-secondary-200 transition-base cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmSolicitar}
                className="px-4 py-2 text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-base cursor-pointer flex items-center gap-1.5"
              >
                <i className="ri-check-line" aria-hidden="true"></i> Confirmar solicitud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal captura de resultados */}
      {showResultadoModal && estudioParaResultado && (
        <ResultadoModal
          estudio={estudioParaResultado}
          onGuardar={handleGuardarResultado}
          onClose={() => { setShowResultadoModal(false); setEstudioParaResultado(null); setShowEstadoMenu(false); }}
        />
      )}
    </div>
  );
}

function EstudioDetail({
  estudio, onClose, onChangeEstado, showEstadoMenu, setShowEstadoMenu, onDownload, downloadMsg, onCapturarResultado,
}: {
  estudio: EstudioSolicitado;
  onClose: () => void;
  onChangeEstado: (e: EstudioSolicitado['estado']) => void;
  showEstadoMenu: boolean;
  setShowEstadoMenu: (v: boolean) => void;
  onDownload: () => void;
  downloadMsg: string;
  onCapturarResultado: () => void;
}) {
  const estado = estadoEstudioConfig[estudio.estado];
  const tipo = tipoEstudioConfig[estudio.tipo];
  const navigate = useNavigate();

  return (
    <Card padding="lg">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <div className="relative">
                <button
                  onClick={() => setShowEstadoMenu(!showEstadoMenu)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-base ${estado.color}`}
                >
                  <i className={estado.icon}></i>
                  {estado.label}
                  <i className="ri-arrow-down-s-line text-[10px]"></i>
                </button>
                {showEstadoMenu && (
                  <div className="absolute top-full left-0 mt-1 bg-background-50 border border-secondary-200 rounded-lg shadow-lg z-30 py-1 min-w-[130px]">
                    {(['solicitado', 'en_proceso', 'completado', 'cancelado'] as const).map((e) => (
                      <button
                        key={e}
                        onClick={() => onChangeEstado(e)}
                        className={`w-full text-left px-3 py-2 text-xs cursor-pointer transition-base hover:bg-secondary-50 flex items-center gap-2 ${estudio.estado === e ? 'bg-primary-50 text-primary-700 font-medium' : 'text-foreground-700'}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${e === 'solicitado' ? 'bg-amber-500/100' : e === 'en_proceso' ? 'bg-sky-500/100' : e === 'completado' ? 'bg-emerald-500/100' : 'bg-secondary-400'}`}></span>
                        {estadoEstudioConfig[e].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${tipo.color}`}>
                <i className={tipo.icon}></i>
                {tipo.label}
              </span>
            </div>
            <h3 className="text-base font-semibold text-foreground-900">{estudio.nombre}</h3>
            <p className="text-xs text-foreground-500 mt-0.5 font-mono">Referencia: {estudio.numeroReferencia}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary-100 text-foreground-400 hover:bg-secondary-200 hover:text-foreground-600 transition-base cursor-pointer"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>

        {/* Patient + Doctor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-background-50 rounded-lg border border-secondary-100">
            <p className="text-2xs text-foreground-400 mb-0.5"><i className="ri-user-line"></i> Paciente</p>
            <p className="text-sm font-semibold text-foreground-900">{estudio.patientName}</p>
            <p className="text-xs text-foreground-500">{estudio.patientExpediente}</p>
          </div>
          <div className="p-3 bg-background-50 rounded-lg border border-secondary-100">
            <p className="text-2xs text-foreground-400 mb-0.5"><i className="ri-stethoscope-line"></i> Médico solicitante</p>
            <p className="text-sm font-semibold text-foreground-900">{estudio.doctorName}</p>
            <p className="text-xs text-foreground-500">Solicitado: {estudio.fechaSolicitud} · {estudio.horaSolicitud} hrs</p>
          </div>
        </div>

        {/* Diagnóstico relacionado */}
        <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xs text-amber-500 mb-0.5"><i className="ri-award-line"></i> Diagnóstico</p>
              <p className="text-sm font-medium text-foreground-800">{estudio.diagnosticoRelacionado}</p>
            </div>
            <button
              onClick={() => navigate(`/app/consultas?paciente=${estudio.patientId}`)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-500 bg-amber-500/15 hover:bg-amber-200 rounded-lg transition-base cursor-pointer whitespace-nowrap"
            >
              <i className="ri-stethoscope-line"></i> Ver consulta
            </button>
          </div>
        </div>

        {/* Resultados */}
        {estudio.estado === 'completado' && estudio.resultado ? (
          <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                <i className="ri-check-double-line text-sm"></i>
              </span>
              <div>
                <p className="text-sm font-semibold text-emerald-500">Resultados disponibles</p>
                <p className="text-2xs text-emerald-500">Completado el {estudio.fechaResultado}</p>
              </div>
            </div>

            {/* Tabla de parámetros */}
            {estudio.parametros && estudio.parametros.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-50">
                      <th className="text-left px-3 py-2 font-semibold text-foreground-700 border border-emerald-100">Parámetro</th>
                      <th className="text-left px-3 py-2 font-semibold text-foreground-700 border border-emerald-100">Valor</th>
                      <th className="text-left px-3 py-2 font-semibold text-foreground-700 border border-emerald-100">Unidad</th>
                      <th className="text-left px-3 py-2 font-semibold text-foreground-700 border border-emerald-100">Rango Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudio.parametros.map((p, idx) => (
                      <tr key={idx} className={p.fueraRango ? 'bg-red-50' : idx % 2 === 0 ? 'bg-background-50' : 'bg-emerald-500/5'}>
                        <td className="px-3 py-2 border border-emerald-100 font-medium text-foreground-700">{p.nombre}</td>
                        <td className={`px-3 py-2 border border-emerald-100 font-bold ${p.fueraRango ? 'text-red-600' : 'text-emerald-700'}`}>
                          {p.valor}
                          {p.fueraRango && <span className="ml-1.5 text-[10px] bg-red-100 text-red-600 px-1 py-0.5 rounded-full">Fuera de rango</span>}
                        </td>
                        <td className="px-3 py-2 border border-emerald-100 text-foreground-500">{p.unidad}</td>
                        <td className="px-3 py-2 border border-emerald-100 text-foreground-500">{p.rangoReferencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : estudio.resultado ? (
              <div className="p-3 bg-background-50 rounded-lg border border-emerald-500/20">
                <p className="text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap font-mono">{estudio.resultado}</p>
              </div>
            ) : null}

            <button
              onClick={onCapturarResultado}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-base cursor-pointer"
            >
              <i className="ri-edit-line"></i> Actualizar / re-capturar resultados
            </button>

            {estudio.archivosAdjuntos > 0 && (
              <div className="flex items-center gap-2 mt-3 p-2 bg-background-50 rounded-lg border border-emerald-500/20 text-xs text-foreground-600">
                <i className="ri-file-pdf-line text-red-500 text-base"></i>
                <span className="font-medium">Resultados completos</span>
                <span className="text-foreground-400">{estudio.archivosAdjuntos} archivo{estudio.archivosAdjuntos > 1 ? 's' : ''} adjunto{estudio.archivosAdjuntos > 1 ? 's' : ''}</span>
                <button
                  onClick={onDownload}
                  className="ml-auto cursor-pointer hover:text-primary-600 flex items-center gap-1 font-medium transition-base"
                >
                  <i className="ri-download-line"></i> Descargar
                </button>
              </div>
            )}
            {downloadMsg && (
              <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1">
                <i className="ri-check-line"></i> {downloadMsg}
              </p>
            )}
          </div>
        ) : estudio.estado === 'en_proceso' ? (
          <div className="p-4 bg-sky-500/10 rounded-lg border border-sky-500/20">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 flex items-center justify-center rounded-full bg-sky-500/15 text-sky-500">
                <i className="ri-loader-4-line text-sm animate-spin"></i>
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-sky-500">Estudio en proceso</p>
                <p className="text-2xs text-sky-500">El estudio está siendo procesado. Los resultados estarán disponibles próximamente.</p>
              </div>
              <button
                onClick={onCapturarResultado}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-sky-50 border border-sky-200 text-sky-700 rounded-lg hover:bg-sky-100 transition-base cursor-pointer whitespace-nowrap flex-shrink-0"
              >
                <i className="ri-test-tube-line"></i> Capturar resultados
              </button>
            </div>
          </div>
        ) : estudio.estado === 'solicitado' ? (
          <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-500/15 text-amber-500 flex-shrink-0">
                <i className="ri-time-line text-sm"></i>
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-500">Estudio solicitado</p>
                <p className="text-2xs text-amber-500">El paciente debe acudir al área correspondiente para la toma de muestra o realización del estudio.</p>
              </div>
              <button
                onClick={onCapturarResultado}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition-base cursor-pointer whitespace-nowrap flex-shrink-0"
              >
                <i className="ri-test-tube-line"></i> Capturar resultados
              </button>
            </div>
          </div>
        ) : null}

        {/* Notas */}
        {estudio.notas && (
          <div className="p-3 bg-background-50 rounded-lg border border-secondary-100">
            <p className="text-2xs text-foreground-400 mb-1"><i className="ri-sticky-note-line"></i> Notas de la solicitud</p>
            <p className="text-xs text-foreground-700 whitespace-pre-wrap">{estudio.notas}</p>
          </div>
        )}

        {/* Timeline del estudio */}
        <div className="p-3 bg-background-50 rounded-lg border border-secondary-100">
          <h4 className="text-xs font-semibold text-foreground-700 mb-3 flex items-center gap-2">
            <i className="ri-git-commit-line text-foreground-400"></i>
            Seguimiento
          </h4>
          <div className="flex items-center gap-0">
            {(['solicitado', 'en_proceso', 'completado'] as const).map((step, idx, arr) => {
              const stepIdx = ['solicitado', 'en_proceso', 'completado'].indexOf(estudio.estado);
              const currentIdx = ['solicitado', 'en_proceso', 'completado'].indexOf(step);
              const isCompleted = currentIdx <= stepIdx && estudio.estado !== 'cancelado';
              const isCurrent = currentIdx === stepIdx && estudio.estado !== 'cancelado';
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs ${
                      isCompleted ? 'bg-primary-500 text-white' : 'bg-secondary-200 text-foreground-400'
                    } ${isCurrent ? 'ring-2 ring-primary-200 ring-offset-1' : ''}`}>
                      {currentIdx + 1}
                    </span>
                    <span className={`text-2xs mt-1 ${isCompleted ? 'text-primary-600 font-medium' : 'text-foreground-400'}`}>
                      {estadoEstudioConfig[step].label}
                    </span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${currentIdx < stepIdx ? 'bg-primary-400' : 'bg-secondary-200'}`}></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function CatalogoDetail({ estudio, onClose, onSolicitar }: { estudio: EstudioCatalogo; onClose: () => void; onSolicitar: () => void }) {
  const tipo = tipoEstudioConfig[estudio.tipo];
  const navigate = useNavigate();

  return (
    <Card padding="lg">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${tipo.color}`}>
                <i className={tipo.icon}></i>
                {tipo.label}
              </span>
              <span className="text-2xs text-foreground-400">{estudio.categoria}</span>
            </div>
            <h3 className="text-base font-semibold text-foreground-900">{estudio.nombre}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary-100 text-foreground-400 hover:bg-secondary-200 hover:text-foreground-600 transition-base cursor-pointer"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>

        <div className="p-4 bg-background-50 rounded-lg border border-secondary-100">
          <p className="text-sm text-foreground-700 leading-relaxed">{estudio.descripcion}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-background-50 rounded-lg border border-secondary-100">
            <p className="text-2xs text-foreground-400">Tiempo estimado</p>
            <p className="text-sm font-semibold text-foreground-800">{estudio.tiempoResultado}</p>
          </div>
          <div className="p-3 bg-background-50 rounded-lg border border-secondary-100">
            <p className="text-2xs text-foreground-400">Ayuno</p>
            <p className="text-sm font-semibold flex items-center gap-1">
              {estudio.requiereAyuno ? (
                <span className="text-amber-500 flex items-center gap-1"><i className="ri-restaurant-line"></i> Requiere ayuno</span>
              ) : (
                <span className="text-emerald-500 flex items-center gap-1"><i className="ri-check-line"></i> No requiere</span>
              )}
            </p>
          </div>
          <div className="p-3 bg-background-50 rounded-lg border border-secondary-100">
            <p className="text-2xs text-foreground-400">Categoría</p>
            <p className="text-sm font-semibold text-foreground-800">{estudio.categoria}</p>
          </div>
        </div>

        {estudio.requiereAyuno && (
          <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 flex items-start gap-2">
            <span className="w-5 h-5 flex items-center justify-center text-amber-500 flex-shrink-0 mt-0.5">
              <i className="ri-information-line text-sm"></i>
            </span>
            <p className="text-xs text-amber-500">
              Este estudio requiere ayuno de 8 a 12 horas. El paciente debe evitar consumir alimentos y bebidas (excepto agua) antes de la toma de muestra.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onSolicitar}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-base cursor-pointer"
          >
            <i className="ri-add-line"></i> Solicitar este estudio
          </button>
        </div>
      </div>
    </Card>
  );
}