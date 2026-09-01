import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { patients, type Patient } from '@/mocks/patients';
import { sucursales } from '@/mocks/branches';
import Avatar from '@/components/base/Avatar';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import Select from '@/components/base/Select';
import Input from '@/components/base/Input';
import Card from '@/components/base/Card';
import Modal from '@/components/base/Modal';
import { exportToExcel } from '@/utils/exportUtils';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/feature/PaginationControls';
import { useAuth } from '@/hooks/useAuth';

type SortField = 'nombre' | 'ultimaVisita' | 'edad' | 'expediente';
type SortDir = 'asc' | 'desc';
type VisitFilter = '' | 'hoy' | '7dias' | '30dias' | 'mes' | 'mas30';

function formatearFecha(fecha: string): string {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
}

function haceNDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function hoyStr(): string {
  return new Date().toISOString().split('T')[0];
}

const ESTADO_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
];

const SEXO_OPTS = [
  { value: '', label: 'Todos los sexos' },
  { value: 'F', label: 'Femenino' },
  { value: 'M', label: 'Masculino' },
];

const VISITA_OPTS = [
  { value: '', label: 'Todas las fechas' },
  { value: 'hoy', label: 'Hoy' },
  { value: '7dias', label: 'Últimos 7 días' },
  { value: '30dias', label: 'Últimos 30 días' },
  { value: 'mes', label: 'Este mes' },
  { value: 'mas30', label: 'Hace más de 30 días' },
];

export default function Pacientes() {
  const navigate = useNavigate();

  const { user, sucursalActualId } = useAuth();
  const canVerTodasSucursales = user?.sucursalIds && user.sucursalIds.length > 1;

  // Search + filters
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroSexo, setFiltroSexo] = useState<string>('');
  const [filtroVisita, setFiltroVisita] = useState<VisitFilter>('');
  const [filtroMedico, setFiltroMedico] = useState<string>('');
  const [filtroAlergia, setFiltroAlergia] = useState<string>('');
  const [filtroSucursal, setFiltroSucursal] = useState<string>(canVerTodasSucursales ? '' : (sucursalActualId || ''));
  const [sortField, setSortField] = useState<SortField>('ultimaVisita');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Modals
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Patient>>();
  const [editSaving, setEditSaving] = useState(false);

  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivatePatient, setDeactivatePatient] = useState<Patient | null>(null);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ fecha: '', hora: '', motivo: '', medico: '' });

  // Computed: unique doctors and allergies for filters
  const medicosUnicos = useMemo(() => {
    const docs = new Set(patients.map((p) => p.medicoAsignado).filter(Boolean));
    return Array.from(docs).sort();
  }, []);

  const alergiasUnicas = useMemo(() => {
    const all = new Set<string>();
    patients.forEach((p) => p.alergias.forEach((a) => all.add(a)));
    return Array.from(all).sort();
  }, []);

  // Filter by visit date
  const visitFilterFn = (p: Patient): boolean => {
    if (!filtroVisita || !p.ultimaVisita) return true;
    const uv = p.ultimaVisita;
    const hoy = hoyStr();
    switch (filtroVisita) {
      case 'hoy': return uv === hoy;
      case '7dias': return uv >= haceNDias(7);
      case '30dias': return uv >= haceNDias(30);
      case 'mes': {
        const [y, m] = uv.split('-');
        const ahora = new Date();
        return parseInt(y) === ahora.getFullYear() && parseInt(m) === ahora.getMonth() + 1;
      }
      case 'mas30': return uv < haceNDias(30);
      default: return true;
    }
  };

  // Filtered + sorted patients
  const filteredPatients = useMemo(() => {
    let result = [...patients];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.apellidos.toLowerCase().includes(q) ||
          p.expediente.toLowerCase().includes(q) ||
          p.telefono.includes(q) ||
          p.celular.includes(q) ||
          p.curp.toLowerCase().includes(q),
      );
    }

    if (filtroEstado) result = result.filter((p) => p.estado === filtroEstado);
    if (filtroSexo) result = result.filter((p) => p.sexo === filtroSexo);
    if (filtroVisita) result = result.filter(visitFilterFn);
    if (filtroMedico) result = result.filter((p) => p.medicoAsignado === filtroMedico);
    if (filtroAlergia) result = result.filter((p) => p.alergias.includes(filtroAlergia));
    if (filtroSucursal) result = result.filter((p) => p.sucursalId === filtroSucursal);

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'nombre':
          cmp = (`${a.nombre} ${a.apellidos}`).localeCompare(`${b.nombre} ${b.apellidos}`);
          break;
        case 'ultimaVisita':
          cmp = (a.ultimaVisita || '').localeCompare(b.ultimaVisita || '');
          break;
        case 'edad':
          cmp = a.edad - b.edad;
          break;
        case 'expediente':
          cmp = a.expediente.localeCompare(b.expediente);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [search, filtroEstado, filtroSexo, filtroVisita, filtroMedico, filtroAlergia, filtroSucursal, sortField, sortDir]);

  const pagination = usePagination(filteredPatients, 20);

  // Stats
  const stats = useMemo(() => {
    const total = patients.length;
    const activos = patients.filter((p) => p.estado === 'activo').length;
    const conAlergias = patients.filter((p) => p.alergias.length > 0).length;
    const esteMes = patients.filter((p) => {
      if (!p.ultimaVisita) return false;
      const [y, m] = p.ultimaVisita.split('-');
      const ahora = new Date();
      return parseInt(y) === ahora.getFullYear() && parseInt(m) === ahora.getMonth() + 1;
    }).length;
    return { total, activos, conAlergias, esteMes };
  }, []);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return 'ri-arrow-up-down-line';
    return sortDir === 'asc' ? 'ri-arrow-up-line' : 'ri-arrow-down-line';
  };

  const sortAriaValue = (field: SortField): 'none' | 'ascending' | 'descending' => {
    if (sortField !== field) return 'none';
    return sortDir === 'asc' ? 'ascending' : 'descending';
  };

  const openQuickView = (p: Patient) => {
    setSelectedPatient(p);
    setQuickViewOpen(true);
  };

  const goToExpediente = (e: React.MouseEvent, patientId: string) => {
    e.stopPropagation();
    navigate(`/app/pacientes/${patientId}`);
  };

  const hasActiveFilters = filtroEstado || filtroSexo || filtroVisita || filtroMedico || filtroAlergia || filtroSucursal || search.trim();

  const activeFilterCount = [filtroEstado, filtroSexo, filtroVisita, filtroMedico, filtroAlergia, filtroSucursal].filter(Boolean).length + (search.trim() ? 1 : 0);

  // ─── Actions ───

  const openEditModal = (p: Patient) => {
    setSelectedPatient(p);
    setEditForm({ ...p });
    setEditModalOpen(true);
  };

  const saveEdit = () => {
    if (!selectedPatient) return;
    setEditSaving(true);
    setTimeout(() => {
      // In real app: update via API
      const idx = patients.findIndex((x) => x.id === selectedPatient.id);
      if (idx !== -1 && editForm) {
        patients[idx] = { ...patients[idx], ...editForm } as Patient;
      }
      setEditSaving(false);
      setEditModalOpen(false);
      setSelectedPatient(null);
    }, 700);
  };

  const openDeactivate = (p: Patient) => {
    setDeactivatePatient(p);
    setDeactivateModalOpen(true);
  };

  const confirmDeactivate = () => {
    if (!deactivatePatient) return;
    const idx = patients.findIndex((x) => x.id === deactivatePatient.id);
    if (idx !== -1) {
      patients[idx] = { ...patients[idx], estado: 'inactivo' } as Patient;
    }
    setDeactivateModalOpen(false);
    setDeactivatePatient(null);
  };

  const openSchedule = (p: Patient) => {
    setSelectedPatient(p);
    setScheduleForm({ fecha: '', hora: '', motivo: '', medico: p.medicoAsignado });
    setScheduleModalOpen(true);
  };

  const saveSchedule = () => {
    setScheduleModalOpen(false);
    setSelectedPatient(null);
  };

  // ─── Export ───
  const handleExport = () => {
    const data = [...filteredPatients];
    const rows = data.map((p) => ({
      Expediente: p.expediente,
      Nombre: p.nombre,
      Apellidos: p.apellidos,
      Edad: p.edad,
      Sexo: p.sexo === 'F' ? 'Femenino' : 'Masculino',
      Teléfono: p.telefono,
      Celular: p.celular,
      Email: p.email || '',
      Dirección: p.direccion,
      CURP: p.curp,
      'Médico Asignado': p.medicoAsignado,
      'Última Visita': formatearFecha(p.ultimaVisita),
      'Alergias': p.alergias.join(', '),
      Estado: p.estado === 'activo' ? 'Activo' : 'Inactivo',
      Aseguradora: p.aseguradora || 'Particular',
    }));
    const dateStr = new Date().toISOString().split('T')[0];
    exportToExcel(rows, `Pacientes_MediCore_${dateStr}`, 'Pacientes');
  };

  const MEDICO_OPTS = useMemo(() => [
    { value: '', label: 'Todos los médicos' },
    ...medicosUnicos.map((m) => ({ value: m, label: m })),
  ], [medicosUnicos]);

  const ALERGIA_OPTS = useMemo(() => [
    { value: '', label: 'Todas las alergias' },
    ...alergiasUnicas.map((a) => ({ value: a, label: a })),
  ], [alergiasUnicas]);

  const SUCURSAL_OPTS = useMemo(() => {
    const opts = [{ value: '', label: 'Todas las sucursales' }];
    const userBranchIds = user?.sucursalIds || [];
    const visibleBranches = sucursales.filter((s) => userBranchIds.includes(s.id));
    return [...opts, ...visibleBranches.map((s) => ({ value: s.id, label: s.nombre }))];
  }, [user?.sucursalIds]);

  return (
    <div className="p-4 md:p-6 space-y-3">
      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            variant="ghost"
            size="xs"
            icon={<i className="ri-download-2-line"></i>}
            onClick={handleExport}
          >
            Exportar
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<i className="ri-user-add-line"></i>}
            onClick={() => navigate('/app/pacientes/nuevo')}
          >
            Nuevo Paciente
          </Button>
        </div>

      {/* Stats ribbon */}
      <div className="flex items-center gap-0 rounded-lg border border-secondary-200/70 bg-background-50 overflow-hidden">
        <StatItem icon="ri-group-line" value={stats.total} label="Total" />
        <StatItem icon="ri-user-heart-line" value={stats.activos} label="Activos" color="text-emerald-600" />
        <StatItem icon="ri-alert-line" value={stats.conAlergias} label="Alergias" color="text-amber-600" />
        <StatItem icon="ri-calendar-check-line" value={stats.esteMes} label="Este mes" color="text-accent-600" last />
      </div>

      {/* Toolbar: search + listbox filters in one compact row */}
      <div className="flex flex-col lg:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-0 lg:max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="search"
            aria-label="Buscar pacientes"
            placeholder="Buscar por nombre, expediente, teléfono o CURP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-8 py-2 text-sm bg-background-50 border border-secondary-200/70 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 hover:text-foreground-600 transition-base cursor-pointer"
            >
              <i className="ri-close-line text-sm" aria-hidden="true"></i>
            </button>
          )}
        </div>

        {/* Listbox filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="min-w-[130px]">
            <Select
              options={ESTADO_OPTS}
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            />
          </div>
          <div className="min-w-[130px]">
            <Select
              options={SEXO_OPTS}
              value={filtroSexo}
              onChange={(e) => setFiltroSexo(e.target.value)}
            />
          </div>
          <div className="min-w-[140px]">
            <Select
              options={VISITA_OPTS}
              value={filtroVisita}
              onChange={(e) => setFiltroVisita(e.target.value as VisitFilter)}
            />
          </div>
          <div className="min-w-[160px]">
            <Select
              options={MEDICO_OPTS}
              value={filtroMedico}
              onChange={(e) => setFiltroMedico(e.target.value)}
            />
          </div>
          <div className="min-w-[150px]">
            <Select
              options={ALERGIA_OPTS}
              value={filtroAlergia}
              onChange={(e) => setFiltroAlergia(e.target.value)}
            />
          </div>
          <div className="min-w-[170px]">
            <Select
              options={SUCURSAL_OPTS}
              value={filtroSucursal}
              onChange={(e) => setFiltroSucursal(e.target.value)}
            />
          </div>

          {/* Clear all */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearch('');
                setFiltroEstado('');
                setFiltroSexo('');
                setFiltroVisita('');
                setFiltroMedico('');
                setFiltroAlergia('');
                setFiltroSucursal(canVerTodasSucursales ? '' : (sucursalActualId || ''));
              }}
              className="px-2.5 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-base cursor-pointer whitespace-nowrap flex items-center gap-1 border border-red-200"
            >
              <span className="w-3 h-3 flex items-center justify-center"><i className="ri-filter-off-line text-2xs"></i></span>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Patient table */}
      <Card padding="none">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 border-b border-secondary-200 bg-secondary-50/60 text-2xs font-semibold text-foreground-500 uppercase tracking-wider items-center">
          <button type="button" className="col-span-3 flex items-center gap-1 cursor-pointer select-none" aria-sort={sortAriaValue('nombre')} onClick={() => toggleSort('nombre')}>
            Paciente
            <span className="w-3 h-3 flex items-center justify-center" aria-hidden="true"><i className={`${sortIcon('nombre')} text-2xs`}></i></span>
          </button>
          <button type="button" className="col-span-1 flex items-center gap-1 cursor-pointer select-none" aria-sort={sortAriaValue('expediente')} onClick={() => toggleSort('expediente')}>
            Exp.
            <span className="w-3 h-3 flex items-center justify-center" aria-hidden="true"><i className={`${sortIcon('expediente')} text-2xs`}></i></span>
          </button>
          <button type="button" className="col-span-1 flex items-center gap-1 cursor-pointer select-none" aria-sort={sortAriaValue('edad')} onClick={() => toggleSort('edad')}>
            Edad
            <span className="w-3 h-3 flex items-center justify-center" aria-hidden="true"><i className={`${sortIcon('edad')} text-2xs`}></i></span>
          </button>
          <div className="col-span-2">Contacto</div>
          <button type="button" className="col-span-1 flex items-center gap-1 cursor-pointer select-none" aria-sort={sortAriaValue('ultimaVisita')} onClick={() => toggleSort('ultimaVisita')}>
            Últ. visita
            <span className="w-3 h-3 flex items-center justify-center" aria-hidden="true"><i className={`${sortIcon('ultimaVisita')} text-2xs`}></i></span>
          </button>
          <div className="col-span-2">Médico / Sucursal</div>
          <div className="col-span-2">Acciones</div>
        </div>

        {/* Table body */}
        {filteredPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-secondary-100 mb-3">
              <i className="ri-user-search-line text-xl text-foreground-400"></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-800 mb-1">Sin resultados</h3>
            <p className="text-sm text-foreground-500 text-center max-w-sm">
              {hasActiveFilters
                ? 'No se encontraron pacientes con los filtros actuales. Intenta ajustar los criterios.'
                : 'Aún no hay pacientes registrados. Crea el primer paciente para comenzar.'}
            </p>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearch('');
                  setFiltroEstado('');
                  setFiltroSexo('');
                  setFiltroVisita('');
                  setFiltroMedico('');
                  setFiltroAlergia('');
                }}
              >
                Limpiar filtros
              </Button>
            )}
            {!hasActiveFilters && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                icon={<i className="ri-user-add-line"></i>}
                onClick={() => navigate('/app/pacientes/nuevo')}
              >
                Nuevo Paciente
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-secondary-100">
            {pagination.paginatedData.map((patient) => (
              <div
                key={patient.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-1.5 hover:bg-secondary-50/50 transition-base cursor-pointer group items-center"
                onClick={() => openQuickView(patient)}
              >
                {/* Patient info */}
                <div className="md:col-span-3 flex items-center gap-3 min-w-0">
                  <Avatar name={`${patient.nombre} ${patient.apellidos}`} size="md" />
                  <div className="min-w-0">
                    <a
                      href={`/app/pacientes/${patient.id}`}
                      onClick={(e) => goToExpediente(e, patient.id)}
                      className="text-sm font-semibold text-foreground-900 truncate group-hover:text-primary-600 transition-base block"
                    >
                      {patient.nombre} {patient.apellidos}
                    </a>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <Badge variant={patient.sexo === 'F' ? 'accent' : 'info'} size="sm">
                        {patient.sexo === 'F' ? 'F' : 'M'}
                      </Badge>
                      <Badge variant={patient.estado === 'activo' ? 'success' : 'secondary'} size="sm" dot>
                        {patient.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </Badge>
                      {patient.alergias.length > 0 && (
                        <Badge variant="warning" size="sm">{patient.alergias.length}</Badge>
                      )}
                      {patient.alertas.length > 0 && (
                        <Badge variant="danger" size="sm">{patient.alertas.length}</Badge>
                      )}
                      <span className="text-2xs text-foreground-400 md:hidden ml-1">{patient.expediente}</span>
                    </div>
                  </div>
                </div>

                {/* Expediente */}
                <div className="hidden md:flex md:col-span-1 items-center">
                  <span className="text-sm font-mono text-foreground-500">{patient.expediente}</span>
                </div>

                {/* Edad */}
                <div className="hidden md:flex md:col-span-1 items-center">
                  <span className="text-sm text-foreground-600">{patient.edad} a.</span>
                </div>

                {/* Contacto */}
                <div className="md:col-span-2 flex flex-col justify-center min-w-0">
                  <span className="text-sm text-foreground-700 truncate">{patient.celular || patient.telefono}</span>
                  {patient.email && (
                    <span className="text-2xs text-foreground-400 truncate">{patient.email}</span>
                  )}
                </div>

                {/* Última visita */}
                <div className="hidden md:flex md:col-span-1 items-center">
                  <span className="text-sm text-foreground-600 whitespace-nowrap">{formatearFecha(patient.ultimaVisita)}</span>
                </div>

                {/* Médico + Sucursal */}
                <div className="hidden md:flex md:col-span-2 flex-col justify-center min-w-0">
                  <span className="text-sm text-foreground-700 truncate">{patient.medicoAsignado}</span>
                  <span className="text-2xs text-foreground-400 truncate">
                    {sucursales.find((s) => s.id === patient.sucursalId)?.nombre || patient.sucursalId}
                  </span>
                </div>

                {/* Acciones */}
                <div className="hidden md:flex md:col-span-2 items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigate(`/app/pacientes/${patient.id}`); }}
                    title="Abrir expediente"
                    className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-base cursor-pointer"
                  >
                    <i className="ri-folder-open-line text-sm" aria-hidden="true"></i>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigate(`/app/agenda?paciente=${patient.id}`); }}
                    title="Agendar cita"
                    className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-accent-600 hover:bg-accent-50 transition-base cursor-pointer"
                  >
                    <i className="ri-calendar-event-line text-sm" aria-hidden="true"></i>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openEditModal(patient); }}
                    title="Editar datos"
                    className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer"
                  >
                    <i className="ri-edit-line text-sm" aria-hidden="true"></i>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openDeactivate(patient); }}
                    title={patient.estado === 'activo' ? 'Desactivar' : 'Activar'}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-base cursor-pointer"
                  >
                    <i className={`${patient.estado === 'activo' ? 'ri-user-unfollow-line' : 'ri-user-follow-line'} text-sm`} aria-hidden="true"></i>
                  </button>
                </div>

                {/* Mobile extra row */}
                <div className="md:hidden flex items-center gap-3 flex-wrap text-2xs text-foreground-500">
                  <span><i className="ri-phone-line mr-0.5"></i>{patient.celular || patient.telefono}</span>
                  <span><i className="ri-calendar-line mr-0.5"></i>{formatearFecha(patient.ultimaVisita)}</span>
                  <span><i className="ri-user-star-line mr-0.5"></i>{patient.medicoAsignado.split(' ').slice(0, 2).join(' ')}</span>
                  {patient.alergias.length > 0 && (
                    <span className="text-amber-600"><i className="ri-alert-line mr-0.5"></i>{patient.alergias.length} alergia(s)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer — Real pagination */}
        <PaginationControls {...pagination} />
      </Card>

      {/* ─── Quick View Modal ─── */}
      <Modal
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
        title="Vista Rápida"
        size="lg"
        footer={
          <div className="flex items-center gap-2 w-full justify-between">
            <Button variant="ghost" size="sm" onClick={() => setQuickViewOpen(false)}>
              Cerrar
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<i className="ri-edit-line"></i>}
                onClick={() => {
                  if (selectedPatient) {
                    setQuickViewOpen(false);
                    openEditModal(selectedPatient);
                  }
                }}
              >
                Editar
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<i className="ri-folder-open-line"></i>}
                onClick={() => {
                  setQuickViewOpen(false);
                  if (selectedPatient) navigate(`/app/pacientes/${selectedPatient.id}`);
                }}
              >
                Abrir Expediente
              </Button>
            </div>
          </div>
        }
      >
        {selectedPatient && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={`${selectedPatient.nombre} ${selectedPatient.apellidos}`} size="xl" />
              <div>
                <h3 className="text-lg font-bold text-foreground-900 font-heading">
                  {selectedPatient.nombre} {selectedPatient.apellidos}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" size="md">{selectedPatient.expediente}</Badge>
                  <Badge variant="info" size="md">{selectedPatient.edad} años</Badge>
                  <Badge variant={selectedPatient.sexo === 'F' ? 'accent' : 'info'} size="md">
                    {selectedPatient.sexo === 'F' ? 'Femenino' : 'Masculino'}
                  </Badge>
                  <Badge variant={selectedPatient.estado === 'activo' ? 'success' : 'secondary'} size="md" dot>
                    {selectedPatient.estado === 'activo' ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </div>
            </div>

            {(selectedPatient.alergias.length > 0 || selectedPatient.alertas.length > 0) && (
              <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-secondary-50 border border-secondary-200">
                {selectedPatient.alergias.map((a) => (
                  <div key={a} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium">
                    <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-error-warning-line text-xs"></i></span>
                    Alergia: {a}
                  </div>
                ))}
                {selectedPatient.alertas.map((a) => (
                  <div key={a} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
                    <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-alert-line text-xs"></i></span>
                    {a}
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <InfoRow label="CURP" value={selectedPatient.curp} />
                <InfoRow label="Teléfono" value={selectedPatient.telefono} />
                <InfoRow label="Celular" value={selectedPatient.celular} />
                <InfoRow label="Email" value={selectedPatient.email || '—'} />
                <InfoRow label="Dirección" value={selectedPatient.direccion} />
              </div>
              <div className="space-y-3">
                <InfoRow label="Contacto de emergencia" value={selectedPatient.contactoEmergencia} />
                <InfoRow label="Parentesco" value={selectedPatient.parentescoEmergencia} />
                <InfoRow label="Aseguradora" value={selectedPatient.aseguradora || 'Particular'} />
                <InfoRow label="Póliza" value={selectedPatient.poliza || '—'} />
                <InfoRow label="Última visita" value={formatearFecha(selectedPatient.ultimaVisita)} />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-secondary-200 flex-wrap">
              <Button variant="secondary" size="sm" icon={<i className="ri-calendar-event-line"></i>} onClick={() => {
                setQuickViewOpen(false);
                if (selectedPatient) navigate(`/app/agenda?paciente=${selectedPatient.id}`);
              }}>
                Agendar Cita
              </Button>
              <Button variant="secondary" size="sm" icon={<i className="ri-phone-line"></i>}>
                Llamar
              </Button>
              <Button variant="secondary" size="sm" icon={<i className="ri-mail-line"></i>}>
                Enviar Correo
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Edit Modal ─── */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Paciente"
        size="lg"
        footer={
          <div className="flex items-center gap-2 w-full justify-between">
            <Button variant="ghost" size="sm" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={editSaving ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-save-line"></i>}
              onClick={saveEdit}
              disabled={editSaving}
            >
              {editSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        }
      >
        {selectedPatient && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-secondary-200">
              <Avatar name={`${selectedPatient.nombre} ${selectedPatient.apellidos}`} size="lg" />
              <div>
                <p className="text-sm font-semibold text-foreground-900">
                  {selectedPatient.nombre} {selectedPatient.apellidos}
                </p>
                <p className="text-xs text-foreground-500">{selectedPatient.expediente}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nombre"
                value={editForm.nombre || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                required
              />
              <Input
                label="Apellidos"
                value={editForm.apellidos || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, apellidos: e.target.value }))}
                required
              />
              <Input
                label="CURP"
                value={editForm.curp || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, curp: e.target.value }))}
                maxLength={18}
                className="font-mono"
              />
              <Input
                label="Fecha de nacimiento"
                type="date"
                value={editForm.fechaNacimiento || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, fechaNacimiento: e.target.value }))}
              />
              <Select
                label="Sexo"
                value={editForm.sexo || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, sexo: e.target.value as 'F' | 'M' }))}
                options={[
                  { value: 'F', label: 'Femenino' },
                  { value: 'M', label: 'Masculino' },
                ]}
              />
              <Select
                label="Estado"
                value={editForm.estado || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, estado: e.target.value as 'activo' | 'inactivo' }))}
                options={[
                  { value: 'activo', label: 'Activo' },
                  { value: 'inactivo', label: 'Inactivo' },
                ]}
              />
            </div>

            <div className="border-t border-secondary-200 pt-4">
              <p className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-3">Contacto</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Teléfono fijo" type="tel" value={editForm.telefono || ''} onChange={(e) => setEditForm((f) => ({ ...f, telefono: e.target.value }))} />
                <Input label="Celular" type="tel" value={editForm.celular || ''} onChange={(e) => setEditForm((f) => ({ ...f, celular: e.target.value }))} />
                <Input label="Email" type="email" value={editForm.email || ''} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                <Input label="Dirección" value={editForm.direccion || ''} onChange={(e) => setEditForm((f) => ({ ...f, direccion: e.target.value }))} />
              </div>
            </div>

            <div className="border-t border-secondary-200 pt-4">
              <p className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-3">Emergencia y Seguro</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Contacto de emergencia" value={editForm.contactoEmergencia || ''} onChange={(e) => setEditForm((f) => ({ ...f, contactoEmergencia: e.target.value }))} />
                <Input label="Parentesco" value={editForm.parentescoEmergencia || ''} onChange={(e) => setEditForm((f) => ({ ...f, parentescoEmergencia: e.target.value }))} />
                <Input label="Aseguradora" value={editForm.aseguradora || ''} onChange={(e) => setEditForm((f) => ({ ...f, aseguradora: e.target.value }))} />
                <Input label="Número de póliza" value={editForm.poliza || ''} onChange={(e) => setEditForm((f) => ({ ...f, poliza: e.target.value }))} />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Deactivate Confirm Modal ─── */}
      <Modal
        open={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
        title="Confirmar acción"
        size="sm"
        footer={
          <div className="flex items-center gap-2 w-full justify-between">
            <Button variant="ghost" size="sm" onClick={() => setDeactivateModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<i className="ri-user-unfollow-line"></i>}
              onClick={confirmDeactivate}
            >
              {deactivatePatient?.estado === 'activo' ? 'Desactivar' : 'Activar'}
            </Button>
          </div>
        }
      >
        {deactivatePatient && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary-100">
                <i className="ri-user-search-line text-lg text-foreground-500"></i>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground-900">{deactivatePatient.nombre} {deactivatePatient.apellidos}</p>
                <p className="text-xs text-foreground-500">{deactivatePatient.expediente}</p>
              </div>
            </div>
            <p className="text-sm text-foreground-700">
              {deactivatePatient.estado === 'activo'
                ? '¿Estás seguro de que deseas desactivar este paciente? El expediente permanecerá accesible pero no podrá agendarse citas nuevas.'
                : '¿Deseas activar nuevamente este paciente? Podrá recibir citas y ser atendido en consulta.'}
            </p>
          </div>
        )}
      </Modal>

      {/* ─── Schedule Appointment Modal ─── */}
      <Modal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Agendar Cita"
        size="md"
        footer={
          <div className="flex items-center gap-2 w-full justify-between">
            <Button variant="ghost" size="sm" onClick={() => setScheduleModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<i className="ri-calendar-check-line"></i>}
              onClick={saveSchedule}
              disabled={!scheduleForm.fecha || !scheduleForm.hora}
            >
              Confirmar Cita
            </Button>
          </div>
        }
      >
        {selectedPatient && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary-50 border border-secondary-200">
              <Avatar name={`${selectedPatient.nombre} ${selectedPatient.apellidos}`} size="md" />
              <div>
                <p className="text-sm font-semibold text-foreground-900">{selectedPatient.nombre} {selectedPatient.apellidos}</p>
                <p className="text-xs text-foreground-500">{selectedPatient.expediente} · {selectedPatient.medicoAsignado}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Fecha" type="date" value={scheduleForm.fecha} onChange={(e) => setScheduleForm((s) => ({ ...s, fecha: e.target.value }))} />
              <Input label="Hora" type="time" value={scheduleForm.hora} onChange={(e) => setScheduleForm((s) => ({ ...s, hora: e.target.value }))} />
            </div>

            <Select
              label="Médico"
              value={scheduleForm.medico || selectedPatient.medicoAsignado}
              onChange={(e) => setScheduleForm((s) => ({ ...s, medico: e.target.value }))}
              options={medicosUnicos.map((m) => ({ value: m, label: m }))}
            />

            <div>
              <label htmlFor="schedule-motivo" className="block text-sm font-medium text-foreground-800 mb-1.5">Motivo de consulta</label>
              <textarea
                id="schedule-motivo"
                value={scheduleForm.motivo}
                onChange={(e) => setScheduleForm((s) => ({ ...s, motivo: e.target.value }))}
                placeholder="Ej. Revisión general, dolor de cabeza persistente..."
                rows={3}
                maxLength={500}
                className="w-full px-3.5 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
              />
              <p className="text-2xs text-foreground-400 mt-1 text-right">{scheduleForm.motivo.length}/500</p>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-50 border border-accent-200">
              <span className="w-4 h-4 flex items-center justify-center text-accent-600"><i className="ri-information-line text-sm"></i></span>
              <p className="text-xs text-accent-800">
                Se enviará una notificación al paciente con los detalles de la cita.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatItem({ icon, value, label, color = 'text-foreground-700', last = false }: { icon: string; value: number; label: string; color?: string; last?: boolean }) {
  return (
    <div className={`flex-1 flex items-center gap-3 px-4 py-3 ${!last ? 'border-r border-secondary-200/70' : ''}`}>
      <span className={`w-7 h-7 flex items-center justify-center rounded-lg bg-secondary-100`}>
        <i className={`${icon} text-sm ${color}`}></i>
      </span>
      <div className="min-w-0">
        <p className="text-base font-bold text-foreground-900 font-heading leading-tight">{value}</p>
        <p className="text-2xs text-foreground-500 whitespace-nowrap">{label}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xs font-semibold text-foreground-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-foreground-800">{value}</p>
    </div>
  );
}