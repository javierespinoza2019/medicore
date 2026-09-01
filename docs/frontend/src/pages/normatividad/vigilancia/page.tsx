import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import {
  vigilanciaMock,
  tipoNotificacionConfig,
  estadoVigilanciaConfig,
  enfermedadesNotificacion,
  type CasoVigilancia,
} from '@/mocks/vigilancia';
import { patients } from '@/mocks/patients';
import { doctors } from '@/mocks/doctors';
import { exportToExcel } from '@/utils/exportUtils';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/feature/PaginationControls';
import VigilanciaPrintModal from './components/VigilanciaPrintModal';

export default function VigilanciaEpidemiologica() {
  const navigate = useNavigate();
  const [data, setData] = useState<CasoVigilancia[]>([...vigilanciaMock]);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<CasoVigilancia['estado'] | 'todos'>('todos');
  const [filtroTipo, setFiltroTipo] = useState<CasoVigilancia['tipoNotificacion'] | 'todos'>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<CasoVigilancia | null>(null);
  const [showNuevo, setShowNuevo] = useState(false);

  // Nuevo caso form state
  const [nPatientId, setNPatientId] = useState('');
  const [nEnfermedad, setNEnfermedad] = useState('');
  const [nCie10, setNCie10] = useState('');
  const [nFechaInicio, setNFechaInicio] = useState('');
  const [nTipo, setNTipo] = useState<CasoVigilancia['tipoNotificacion']>('semanal');
  const [nMedico, setNMedico] = useState('');
  const [nCedula, setNCedula] = useState('');
  const [nJurisdiccion, setNJurisdiccion] = useState('Jurisdicción Sanitaria Miguel Hidalgo');
  const [nObs, setNObs] = useState('');
  const [formError, setFormError] = useState('');

  const filtered = useMemo(() => {
    let list = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.patientName.toLowerCase().includes(q) ||
        c.enfermedad.toLowerCase().includes(q) ||
        c.cie10.toLowerCase().includes(q)
      );
    }
    if (filtroEstado !== 'todos') list = list.filter((c) => c.estado === filtroEstado);
    if (filtroTipo !== 'todos') list = list.filter((c) => c.tipoNotificacion === filtroTipo);
    return list.sort((a, b) => b.fechaNotificacion.localeCompare(a.fechaNotificacion));
  }, [search, filtroEstado, filtroTipo, data]);

  const pagination = usePagination(filtered, 10);

  const stats = useMemo(() => {
    const total = data.length;
    const confirmados = data.filter((c) => c.estado === 'confirmado').length;
    const enInvestigacion = data.filter((c) => c.estado === 'en_investigacion').length;
    const inmediatas = data.filter((c) => c.tipoNotificacion === 'inmediata').length;
    const semanaActual = data.filter((c) => c.semanaEpidemiologica === 34).length;
    return { total, confirmados, enInvestigacion, inmediatas, semanaActual };
  }, [data]);

  const handleExport = () => {
    const rows = filtered.map((c) => ({
      ID: c.id,
      Paciente: c.patientName,
      Expediente: c.patientExpediente,
      Enfermedad: c.enfermedad,
      'CIE-10': c.cie10,
      'Semana Epidemiológica': c.semanaEpidemiologica,
      'Tipo Notificación': tipoNotificacionConfig[c.tipoNotificacion].label,
      Estado: estadoVigilanciaConfig[c.estado].label,
      'Fecha Inicio Síntomas': c.fechaInicioSintomas,
      'Fecha Notificación': c.fechaNotificacion,
      'Médico': c.medicoNotificante,
      'Jurisdicción': c.jurisdiccionSanitaria,
    }));
    exportToExcel(rows, `Vigilancia_Epidemiologica_MediCore_${new Date().toISOString().split('T')[0]}`, 'Vigilancia');
  };

  const handleEnfermedadChange = (nombre: string) => {
    setNEnfermedad(nombre);
    const enf = enfermedadesNotificacion.find((e) => e.nombre === nombre);
    if (enf) {
      setNCie10(enf.cie10);
      setNTipo(enf.tipo);
    }
  };

  const handleNuevo = () => {
    if (!nPatientId || !nEnfermedad.trim() || !nFechaInicio || !nMedico.trim()) {
      setFormError('Paciente, enfermedad, fecha y médico son obligatorios.');
      return;
    }
    const patient = patients.find((p) => p.id === nPatientId);
    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const semanaEpi = Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    const nuevo: CasoVigilancia = {
      id: `ve-${nPatientId}-${Date.now().toString(36)}`,
      patientId: nPatientId,
      patientName: patient ? `${patient.nombre} ${patient.apellidos}` : '',
      patientExpediente: patient?.expediente || '',
      enfermedad: nEnfermedad.trim(),
      cie10: nCie10.trim(),
      fechaInicioSintomas: nFechaInicio,
      fechaNotificacion: fecha,
      semanaEpidemiologica: semanaEpi,
      tipoNotificacion: nTipo,
      estado: 'notificado',
      institucionNotificante: 'MediCore Clínica',
      medicoNotificante: nMedico.trim(),
      cedulaMedico: nCedula.trim(),
      jurisdiccionSanitaria: nJurisdiccion.trim(),
      observaciones: nObs.trim() || undefined,
    };
    setData((prev) => [nuevo, ...prev]);
    setNPatientId('');
    setNEnfermedad('');
    setNCie10('');
    setNFechaInicio('');
    setNTipo('semanal');
    setNMedico('');
    setNCedula('');
    setNObs('');
    setFormError('');
    setShowNuevo(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground-900 font-heading">Vigilancia Epidemiológica</h1>
          <p className="text-sm text-foreground-500 mt-1">
            Notificación obligatoria conforme a NOM-017-SSA2-2012 / SUIVE
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<i className="ri-download-2-line"></i>} onClick={handleExport}>
            Exportar SUIVE
          </Button>
          <Button variant="primary" size="sm" icon={<i className="ri-add-line"></i>} onClick={() => setShowNuevo(true)}>
            Notificar caso
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-0 rounded-lg border border-secondary-200/70 bg-background-50 overflow-hidden">
        <StatItem icon="ri-virus-line" value={stats.total} label="Total" />
        <StatItem icon="ri-check-double-line" value={stats.confirmados} label="Confirmados" color="text-emerald-600" />
        <StatItem icon="ri-loader-4-line" value={stats.enInvestigacion} label="En investigación" color="text-amber-600" />
        <StatItem icon="ri-alarm-warning-line" value={stats.inmediatas} label="Inmediatas" color="text-red-600" />
        <StatItem icon="ri-calendar-check-line" value={stats.semanaActual} label="Sem. actual" color="text-primary-600" last />
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1 min-w-0 lg:max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="search"
            placeholder="Buscar paciente o enfermedad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm bg-background-50 border border-secondary-200/70 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as CasoVigilancia['estado'] | 'todos')}
            className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base"
          >
            <option value="todos">Estado: Todos</option>
            <option value="notificado">Notificado</option>
            <option value="confirmado">Confirmado</option>
            <option value="descartado">Descartado</option>
            <option value="en_investigacion">En investigación</option>
            <option value="recuperado">Recuperado</option>
          </select>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as CasoVigilancia['tipoNotificacion'] | 'todos')}
            className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base"
          >
            <option value="todos">Tipo: Todos</option>
            <option value="inmediata">Inmediata</option>
            <option value="obligatoria">Obligatoria</option>
            <option value="semanal">Semanal</option>
          </select>
          {(search || filtroEstado !== 'todos' || filtroTipo !== 'todos') && (
            <button
              onClick={() => { setSearch(''); setFiltroEstado('todos'); setFiltroTipo('todos'); }}
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
          <div className="col-span-3">Enfermedad / CIE-10</div>
          <div className="col-span-1">SE</div>
          <div className="col-span-1">Tipo</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-1">Fecha</div>
          <div className="col-span-1">Acciones</div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-secondary-100 mb-3">
              <i className="ri-virus-line text-xl text-foreground-400"></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-800">Sin casos registrados</h3>
          </div>
        ) : (
          <div className="divide-y divide-secondary-100">
            {pagination.paginatedData.map((c) => {
              const isExpanded = expandedId === c.id;
              const tipoCfg = tipoNotificacionConfig[c.tipoNotificacion];
              const estCfg = estadoVigilanciaConfig[c.estado];
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
                      <p className="text-xs font-medium text-foreground-700 line-clamp-1">{c.enfermedad}</p>
                      <p className="text-2xs text-foreground-400 font-mono">{c.cie10}</p>
                    </div>
                    <div className="md:col-span-1">
                      <span className="text-xs font-bold text-foreground-700">SE{c.semanaEpidemiologica}</span>
                    </div>
                    <div className="md:col-span-1">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium ${tipoCfg.bg} ${tipoCfg.text}`}>
                        {tipoCfg.label}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-medium ${estCfg.bg} ${estCfg.text}`}>
                        <i className={`${estCfg.icon} text-[10px]`}></i>
                        {estCfg.label}
                      </span>
                    </div>
                    <div className="md:col-span-1">
                      <p className="text-xs text-foreground-500">{c.fechaNotificacion}</p>
                    </div>
                    <div className="md:col-span-1 flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPrintItem(c); }}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-base cursor-pointer"
                        title="Imprimir notificacion"
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <InfoRow label="Fecha inicio síntomas" value={c.fechaInicioSintomas} />
                          <InfoRow label="Fecha notificación" value={c.fechaNotificacion} />
                          <InfoRow label="Semana epidemiológica" value={`SE ${c.semanaEpidemiologica}`} />
                          <InfoRow label="Médico notificante" value={`${c.medicoNotificante} (Céd. ${c.cedulaMedico})`} />
                          <InfoRow label="Institución" value={c.institucionNotificante} />
                          <InfoRow label="Jurisdicción sanitaria" value={c.jurisdiccionSanitaria} />
                        </div>
                        {c.resultadoLab && (
                          <div>
                            <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider mb-1">Resultado de laboratorio</p>
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                              <p className="text-sm text-emerald-800">{c.resultadoLab}</p>
                              {c.fechaResultado && <p className="text-2xs text-emerald-600 mt-1">Fecha: {c.fechaResultado}</p>}
                            </div>
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

      {/* Print Modal */}
      {printItem && (
        <VigilanciaPrintModal
          caso={printItem}
          isOpen={!!printItem}
          onClose={() => setPrintItem(null)}
        />
      )}

      {/* Nuevo caso modal */}
      {showNuevo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <div className="bg-background-50 rounded-xl shadow-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground-900">Notificar Caso Epidemiológico</h3>
              <button onClick={() => { setShowNuevo(false); setFormError(''); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary-100 transition-base cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{formError}</div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-700 mb-1">Paciente <span className="text-red-500">*</span></label>
                  <select value={nPatientId} onChange={(e) => setNPatientId(e.target.value)} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base">
                    <option value="">Seleccionar...</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-700 mb-1">Enfermedad / Condición <span className="text-red-500">*</span></label>
                  <select value={nEnfermedad} onChange={(e) => handleEnfermedadChange(e.target.value)} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base">
                    <option value="">Seleccionar...</option>
                    {enfermedadesNotificacion.map((e) => (
                      <option key={e.cie10} value={e.nombre}>{e.nombre} ({e.cie10})</option>
                    ))}
                    <option value="Otra">Otra (especificar)</option>
                  </select>
                </div>
              </div>
              {nEnfermedad === 'Otra' && (
                <div>
                  <label className="block text-xs font-medium text-foreground-700 mb-1">Especificar enfermedad y CIE-10</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Nombre de la enfermedad" onChange={(e) => setNEnfermedad(e.target.value)} className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base" />
                    <input type="text" value={nCie10} onChange={(e) => setNCie10(e.target.value)} placeholder="Código CIE-10" className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base" />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-700 mb-1">Fecha inicio síntomas</label>
                  <input type="date" value={nFechaInicio} onChange={(e) => setNFechaInicio(e.target.value)} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-700 mb-1">Tipo de notificación</label>
                  <select value={nTipo} onChange={(e) => setNTipo(e.target.value as CasoVigilancia['tipoNotificacion'])} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base">
                    <option value="semanal">Semanal</option>
                    <option value="obligatoria">Obligatoria</option>
                    <option value="inmediata">Inmediata</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-700 mb-1">Médico notificante <span className="text-red-500">*</span></label>
                  <select
                    value={nMedico}
                    onChange={(e) => {
                      const doc = doctors.find((d) => d.nombre === e.target.value);
                      setNMedico(e.target.value);
                      setNCedula(doc?.cedula || '');
                    }}
                    className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base"
                  >
                    <option value="">Seleccionar...</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.nombre}>{d.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-700 mb-1">Jurisdicción sanitaria</label>
                  <input type="text" value={nJurisdiccion} onChange={(e) => setNJurisdiccion(e.target.value)} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Observaciones</label>
                <textarea value={nObs} onChange={(e) => setNObs(e.target.value)} rows={3} maxLength={500} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base resize-none" placeholder="Observaciones adicionales..." />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button onClick={() => { setShowNuevo(false); setFormError(''); }} className="px-4 py-2 text-sm font-medium text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap">
                Cancelar
              </button>
              <button onClick={handleNuevo} className="px-6 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-base cursor-pointer whitespace-nowrap">
                Registrar notificación
              </button>
            </div>
          </div>
        </div>
      )}
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