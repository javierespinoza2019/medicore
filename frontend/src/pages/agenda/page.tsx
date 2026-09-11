import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '@/components/base/Button';
import Select from '@/components/base/Select';
import Badge from '@/components/base/Badge';
import Input from '@/components/base/Input';
import Tabs from '@/components/base/Tabs';
import { displayNameOf } from '@/api/subjects';
import DayView from '@/pages/agenda/components/DayView';
import WeekView from '@/pages/agenda/components/WeekView';
import MonthView, { MESES } from '@/pages/agenda/components/MonthView';
import NewAppointmentModal from '@/pages/agenda/components/NewAppointmentModal';
import AppointmentDetailModal from '@/pages/agenda/components/AppointmentDetailModal';
import ConsultoriosDayView from '@/pages/agenda/components/ConsultoriosDayView';
import AgendaConfigModal from '@/pages/agenda/components/AgendaConfigModal';
import AgendaListView from '@/pages/agenda/components/AgendaListView';
import TicketPrintModal from '@/pages/agenda/components/TicketPrintModal';
import { type TimeGranularity } from '@/pages/agenda/components/timeGridConfig';
import { exportToExcel } from '@/utils/exportUtils';
import {
  addDays,
  formatDateSpanish,
  getMonday,
  getTodayLocal,
  getWeekDays,
} from '@/pages/agenda/agendaDateUtils';
import { uiStateToApi } from '@/pages/agenda/agendaPresentation';
import {
  statusConfig,
  type AgendaAppointment,
  type AgendaAppointmentEstado,
} from '@/pages/agenda/types';
import { useAgendaApi } from '@/pages/agenda/hooks/useAgendaApi';
import { useAgendaProfessionalsCatalog } from '@/pages/agenda/hooks/useAgendaProfessionalsCatalog';

type ViewMode = 'day' | 'week' | 'month' | 'list';

function getAppsByDate(appointments: AgendaAppointment[], date: string) {
  return appointments.filter((a) => a.fecha === date);
}

export default function Agenda() {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = getTodayLocal();
  const todayDate = useMemo(() => new Date(`${today}T00:00:00`), [today]);
  const [view, setView] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(today);
  const [currentYear, setCurrentYear] = useState(() => todayDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => todayDate.getMonth());
  const [defaultScheduleTime, setDefaultScheduleTime] = useState<string | undefined>(undefined);
  const [lockDateTime, setLockDateTime] = useState(false);
  const [defaultConsultorioId, setDefaultConsultorioId] = useState<string | undefined>(undefined);
  const [configOpen, setConfigOpen] = useState(false);
  const [printAppointment, setPrintAppointment] = useState<AgendaAppointment | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [detailAppointment, setDetailAppointment] = useState<AgendaAppointment | null>(null);
  const [duplicateAppointment, setDuplicateAppointment] = useState<AgendaAppointment | null>(null);
  const [showDragHint, setShowDragHint] = useState(false);

  const urlPatientId = searchParams.get('paciente') || '';

  const {
    isDoctor,
    myDoctorId,
    failClosed,
    branchId,
    appointments,
    consultorios,
    reglasBloqueo,
    subjects,
    loading,
    error,
    reload,
    createFromForm,
    changeStatus,
    moveAppointment,
    upsertRoom,
  } = useAgendaApi(view, selectedDate, currentYear, currentMonth);

  const { professionals: catalogProfessionals, specialties: catalogSpecialties } =
    useAgendaProfessionalsCatalog(true);

  const filteredPatient = useMemo(
    () => subjects.find((s) => s.subjectId === urlPatientId),
    [subjects, urlPatientId],
  );

  const displayAppointments = appointments;

  useEffect(() => {
    if (urlPatientId) {
      setNewModalOpen(true);
    }
  }, [urlPatientId]);

  useEffect(() => {
    const dismissed = localStorage.getItem('agenda_drag_hint_dismissed');
    if (!dismissed) {
      setShowDragHint(true);
      const timer = setTimeout(() => setShowDragHint(false), 8000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissDragHint = useCallback(() => {
    setShowDragHint(false);
    localStorage.setItem('agenda_drag_hint_dismissed', 'true');
  }, []);

  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [timeGranularity, setTimeGranularity] = useState<TimeGranularity>('15');

  const mondayOfWeek = useMemo(() => getMonday(selectedDate), [selectedDate]);
  const weekDays = useMemo(() => getWeekDays(mondayOfWeek), [mondayOfWeek]);
  const activeConsultorios = useMemo(() => consultorios.filter((c) => c.activo), [consultorios]);

  const filteredAppointments = useMemo(() => {
    let apps =
      view === 'day'
        ? getAppsByDate(displayAppointments, selectedDate)
        : view === 'week'
          ? displayAppointments.filter(
              (a) => a.fecha >= weekDays[0].date && a.fecha <= weekDays[6].date,
            )
          : displayAppointments;

    if (isDoctor && myDoctorId) apps = apps.filter((a) => a.doctorId === myDoctorId);
    if (urlPatientId) apps = apps.filter((a) => a.patientId === urlPatientId);
    if (filterDoctor) apps = apps.filter((a) => a.doctorId === filterDoctor);
    if (filterSpecialty) apps = apps.filter((a) => a.especialidad === filterSpecialty);
    if (filterStatus) apps = apps.filter((a) => a.estado === filterStatus);
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      apps = apps.filter(
        (a) =>
          a.patientName.toLowerCase().includes(q) ||
          a.doctorName.toLowerCase().includes(q) ||
          a.motivo.toLowerCase().includes(q),
      );
    }
    return apps;
  }, [
    displayAppointments,
    view,
    selectedDate,
    filterDoctor,
    filterSpecialty,
    filterStatus,
    filterSearch,
    weekDays,
    urlPatientId,
    isDoctor,
    myDoctorId,
  ]);

  const stats = useMemo(() => {
    const dayApps = getAppsByDate(displayAppointments, selectedDate);
    return {
      total: dayApps.length,
      atendidas: dayApps.filter((a) => a.estado === 'atendida').length,
      enCurso: dayApps.filter(
        (a) =>
          a.estado === 'en_consulta' ||
          a.estado === 'en_espera' ||
          a.estado === 'llego',
      ).length,
      confirmadas: dayApps.filter(
        (a) => a.estado === 'confirmada' || a.estado === 'reservada',
      ).length,
      canceladas: dayApps.filter(
        (a) => a.estado === 'cancelada' || a.estado === 'no_acudio',
      ).length,
    };
  }, [displayAppointments, selectedDate]);

  const activeFiltersCount = [filterDoctor, filterSpecialty, filterStatus].filter(Boolean).length;
  const isToday = selectedDate === today;

  const handleStatusChange = useCallback(
    async (appointmentId: string, newStatus: AgendaAppointmentEstado) => {
      if (!uiStateToApi(newStatus)) {
        // en_triage / llamando: sin contrato API — no simular overlay.
        return;
      }
      const ok = await changeStatus(appointmentId, newStatus);
      if (ok) {
        setDetailAppointment((prev) =>
          prev && prev.id === appointmentId ? { ...prev, estado: newStatus } : prev,
        );
      }
    },
    [changeStatus],
  );

  const handleCreateAppointment = useCallback(
    (input: {
      subjectId: string;
      professionalId: string;
      roomId: string | null;
      fecha: string;
      horaInicio: string;
      horaFin: string;
      motivo: string;
    }) => createFromForm(input),
    [createFromForm],
  );

  const handleMoveAppointment = useCallback(
    async (
      appointmentId: string,
      newDate: string,
      newHoraInicio: string,
      newHoraFin: string,
    ) => {
      await moveAppointment(appointmentId, newDate, newHoraInicio, newHoraFin);
    },
    [moveAppointment],
  );

  const handleDuplicate = useCallback(() => {
    if (!detailAppointment) return;
    setDuplicateAppointment(detailAppointment);
    setDetailAppointment(null);
    setNewModalOpen(true);
  }, [detailAppointment]);

  const handleExportExcel = useCallback(() => {
    const rows = filteredAppointments.map((a) => ({
      ID: a.id,
      Paciente: a.patientName,
      Médico: a.doctorName,
      Especialidad: a.especialidad,
      Fecha: a.fecha,
      'Hora Inicio': a.horaInicio,
      'Hora Fin': a.horaFin,
      Estado: statusConfig[a.estado].label,
      Motivo: a.motivo,
      Consultorio: a.consultorio,
      'Hora Llegada': a.horaLlegada || '—',
    }));
    const dateStr = new Date().toISOString().split('T')[0];
    exportToExcel(rows, `Agenda_MediCore_${dateStr}`, 'Citas');
  }, [filteredAppointments]);

  const handleScheduleAtTime = useCallback((time: string, consultorioId?: string) => {
    setDefaultScheduleTime(time);
    setDefaultConsultorioId(consultorioId);
    setLockDateTime(true);
    setNewModalOpen(true);
  }, []);

  const handleScheduleAtDate = useCallback((date: string, time?: string) => {
    setSelectedDate(date);
    setDefaultScheduleTime(time);
    setDefaultConsultorioId(undefined);
    setLockDateTime(true);
    setNewModalOpen(true);
  }, []);

  const handleMonthDayClick = useCallback((date: string) => {
    setSelectedDate(date);
    setView('day');
  }, []);

  const handlePrevMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const handleNextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const handleGoToToday = useCallback(() => {
    setSelectedDate(today);
    setCurrentYear(todayDate.getFullYear());
    setCurrentMonth(todayDate.getMonth());
  }, [today, todayDate]);

  const closeNewModal = useCallback(() => {
    setNewModalOpen(false);
    setDuplicateAppointment(null);
    setDefaultScheduleTime(undefined);
    setLockDateTime(false);
    setDefaultConsultorioId(undefined);
    if (searchParams.has('paciente')) {
      searchParams.delete('paciente');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const getAppsForWeekDate = useCallback(
    (date: string) => {
      let apps = getAppsByDate(displayAppointments, date);
      if (urlPatientId) apps = apps.filter((a) => a.patientId === urlPatientId);
      if (filterDoctor) apps = apps.filter((a) => a.doctorId === filterDoctor);
      if (filterSpecialty) apps = apps.filter((a) => a.especialidad === filterSpecialty);
      if (filterStatus) apps = apps.filter((a) => a.estado === filterStatus);
      if (filterSearch.trim()) {
        const q = filterSearch.toLowerCase();
        apps = apps.filter(
          (a) =>
            a.patientName.toLowerCase().includes(q) ||
            a.doctorName.toLowerCase().includes(q),
        );
      }
      return apps;
    },
    [displayAppointments, filterDoctor, filterSpecialty, filterStatus, filterSearch, urlPatientId],
  );

  const headerDateText =
    view === 'month'
      ? `${MESES[currentMonth]} ${currentYear}`
      : view === 'week'
        ? `${formatDateSpanish(weekDays[0].date)} – ${formatDateSpanish(weekDays[6].date)}`
        : formatDateSpanish(selectedDate);

  return (
    <div className="flex flex-col min-h-0" data-testid="page-agenda">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2 shrink-0">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground-900">Agenda</h1>
          <p className="text-sm text-foreground-500 hidden sm:block">
            Calendario de citas · datos desde API
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void reload()} disabled={loading}>
          Actualizar
        </Button>
      </div>

      {error && (
        <div className="mb-2 px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg shrink-0">
          {error}
        </div>
      )}

      {failClosed && (
        <div className="mb-2 px-3 py-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg shrink-0">
          Tu sesión de médico no tiene identificador clínico; la agenda no muestra citas hasta
          corregir el perfil.
        </div>
      )}

      <div className="mb-2 rounded-lg border border-secondary-200 bg-secondary-50/60 px-3 py-2 text-xs text-foreground-600 shrink-0">
        Estados `en_triage` / `llamando` del prototipo <strong>no</strong> tienen contrato API: no se
        simulan overlays. Escala de triage en citas = la efectiva del establecimiento (no 4 colores
        fijos de producto).
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {/* ── Compact Header ── */}
        <div className="flex items-center justify-between mb-2 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0">
              <p className="text-[11px] text-foreground-400 leading-tight">{headerDateText}</p>
            </div>

            <div className="hidden md:flex items-center gap-1 pl-3 border-l border-secondary-200/70">
              {[
                {
                  label: 'Total',
                  value: stats.total,
                  icon: 'ri-calendar-line',
                  color: 'text-foreground-500',
                  bg: 'bg-foreground-50',
                },
                {
                  label: 'Atendidas',
                  value: stats.atendidas,
                  icon: 'ri-check-double-line',
                  color: 'text-emerald-500',
                  bg: 'bg-emerald-50',
                },
                {
                  label: 'En curso',
                  value: stats.enCurso,
                  icon: 'ri-time-line',
                  color: 'text-accent-500',
                  bg: 'bg-accent-50',
                },
                {
                  label: 'Pend.',
                  value: stats.confirmadas,
                  icon: 'ri-hourglass-line',
                  color: 'text-primary-500',
                  bg: 'bg-primary-50',
                },
                {
                  label: 'Cancel.',
                  value: stats.canceladas,
                  icon: 'ri-close-circle-line',
                  color: 'text-red-500',
                  bg: 'bg-red-500/10',
                },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-1 px-1.5 py-1 rounded-md shrink-0">
                  <span
                    className={`w-5 h-5 flex items-center justify-center rounded ${stat.bg} ${stat.color}`}
                  >
                    <i className={`${stat.icon} text-xs`}></i>
                  </span>
                  <span className="text-xs font-bold text-foreground-800">{stat.value}</span>
                  <span className="text-[10px] text-foreground-400 hidden lg:inline">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground-600 bg-background-50 border border-secondary-200 rounded-lg hover:bg-secondary-100 transition-base cursor-pointer whitespace-nowrap"
              >
                <i className="ri-file-excel-line text-sm"></i>
                <span className="hidden lg:inline">Exportar Excel</span>
              </button>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setConfigOpen(true)}>
              <i className="ri-settings-3-line"></i>{' '}
              <span className="hidden sm:inline">Configuración</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setDefaultScheduleTime(undefined);
                setLockDateTime(false);
                setDefaultConsultorioId(undefined);
                setNewModalOpen(true);
              }}
            >
              <i className="ri-add-line"></i> <span className="hidden sm:inline">Nueva Cita</span>
            </Button>
          </div>
        </div>

        {/* ── Mobile Stats ── */}
        <div className="flex md:hidden items-center gap-2 mb-2 overflow-x-auto pb-1 shrink-0">
          {[
            { label: 'Total', value: stats.total, color: 'bg-foreground-100 text-foreground-700' },
            { label: 'Atend.', value: stats.atendidas, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Curso', value: stats.enCurso, color: 'bg-accent-50 text-accent-600' },
            { label: 'Pend.', value: stats.confirmadas, color: 'bg-primary-50 text-primary-600' },
            { label: 'Cancel.', value: stats.canceladas, color: 'bg-red-500/10 text-red-500' },
          ].map((stat) => (
            <Badge key={stat.label} variant="secondary" size="sm" className={`${stat.color} shrink-0`}>
              {stat.value} {stat.label}
            </Badge>
          ))}
        </div>

        {/* ── Patient Filter Banner ── */}
        {urlPatientId && filteredPatient && (
          <div className="flex items-center justify-between px-3 py-2 mb-2 bg-primary-50 border border-primary-200/50 rounded-lg shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 shrink-0">
                <i className="ri-user-search-line text-sm"></i>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-primary-800 truncate">
                  Viendo solo citas de {displayNameOf(filteredPatient)}
                </p>
                <p className="text-[10px] text-primary-500">
                  Exp. {filteredPatient.recordNumber ?? '—'} — Los demás pacientes están ocultos
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                searchParams.delete('paciente');
                setSearchParams(searchParams, { replace: true });
                setNewModalOpen(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-100 rounded-md transition-base cursor-pointer whitespace-nowrap shrink-0"
            >
              <i className="ri-close-line"></i> Quitar filtro
            </button>
          </div>
        )}

        {/* ── Controls & Filters Row ── */}
        <div className="flex items-center gap-2 mb-2 flex-wrap shrink-0">
          <div
            className="flex items-center gap-0.5 bg-secondary-100 rounded-lg p-0.5 shrink-0"
            role="group"
            aria-label="Navegación de fecha"
          >
            <button
              type="button"
              aria-label={
                view === 'month'
                  ? 'Mes anterior'
                  : view === 'day'
                    ? 'Día anterior'
                    : 'Semana anterior'
              }
              onClick={() => {
                if (view === 'month') handlePrevMonth();
                else
                  setSelectedDate(
                    view === 'day' ? addDays(selectedDate, -1) : addDays(selectedDate, -7),
                  );
              }}
              className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-600 hover:text-foreground-900 hover:bg-secondary-200 transition-base cursor-pointer"
            >
              <i className="ri-arrow-left-s-line text-lg" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              aria-label="Ir a hoy"
              onClick={handleGoToToday}
              className={`px-2 py-1 text-[11px] font-medium rounded-md transition-base cursor-pointer whitespace-nowrap ${
                isToday && view !== 'month'
                  ? 'bg-primary-500 text-white'
                  : view === 'month' &&
                      currentMonth === todayDate.getMonth() &&
                      currentYear === todayDate.getFullYear()
                    ? 'bg-primary-500 text-white'
                    : 'text-foreground-600 hover:text-foreground-900 hover:bg-secondary-200'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              aria-label={
                view === 'month'
                  ? 'Mes siguiente'
                  : view === 'day'
                    ? 'Día siguiente'
                    : 'Semana siguiente'
              }
              onClick={() => {
                if (view === 'month') handleNextMonth();
                else
                  setSelectedDate(
                    view === 'day' ? addDays(selectedDate, 1) : addDays(selectedDate, 7),
                  );
              }}
              className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-600 hover:text-foreground-900 hover:bg-secondary-200 transition-base cursor-pointer"
            >
              <i className="ri-arrow-right-s-line text-lg" aria-hidden="true"></i>
            </button>
          </div>

          <Tabs
            tabs={[
              { key: 'day', label: 'Día', icon: 'ri-sun-line' },
              { key: 'week', label: 'Semana', icon: 'ri-calendar-2-line' },
              { key: 'month', label: 'Mes', icon: 'ri-calendar-line' },
              { key: 'list', label: 'Lista', icon: 'ri-file-list-3-line' },
            ]}
            activeTab={view}
            onChange={(v) => {
              setView(v as ViewMode);
              if (v === 'month') {
                const d = new Date(`${selectedDate}T00:00:00`);
                setCurrentYear(d.getFullYear());
                setCurrentMonth(d.getMonth());
              }
            }}
            variant="pills"
          />

          <div className="w-px h-5 bg-secondary-200 hidden sm:block shrink-0"></div>

          <div
            className="flex items-center gap-0.5 bg-secondary-100 rounded-lg p-0.5 shrink-0"
            role="group"
            aria-label="Intervalo de tiempo"
          >
            {[
              { value: '15' as TimeGranularity, label: '15m' },
              { value: '30' as TimeGranularity, label: '30m' },
              { value: '60' as TimeGranularity, label: '1h' },
            ].map((g) => (
              <button
                key={g.value}
                type="button"
                aria-pressed={timeGranularity === g.value}
                aria-label={`Intervalo de ${g.label}`}
                onClick={() => setTimeGranularity(g.value)}
                className={`px-2 py-1 text-[11px] font-medium rounded-md transition-base cursor-pointer whitespace-nowrap ${
                  timeGranularity === g.value
                    ? 'bg-primary-500 text-white'
                    : 'text-foreground-600 hover:text-foreground-900 hover:bg-secondary-200'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-expanded={showFilters}
            aria-controls="filtros-citas"
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-base cursor-pointer shrink-0 ${showFilters ? 'bg-primary-100 text-primary-700' : 'bg-secondary-100 text-foreground-600 hover:bg-secondary-200'}`}
          >
            <i className="ri-filter-3-line" aria-hidden="true"></i>
            <span className="hidden sm:inline">Filtros</span>
            {activeFiltersCount > 0 && (
              <span
                className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-primary-500 text-white text-[10px] font-bold"
                aria-label={`${activeFiltersCount} filtros activos`}
              >
                {activeFiltersCount}
              </span>
            )}
          </button>

          <div className="relative w-[160px] shrink-0">
            <Input
              type="search"
              placeholder="Buscar..."
              aria-label="Buscar citas por paciente, médico o motivo"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              leftIcon="ri-search-line"
              className="text-xs py-1.5"
            />
            {filterSearch && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={() => setFilterSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-foreground-400 hover:text-foreground-600 cursor-pointer"
              >
                <i className="ri-close-circle-fill text-xs" aria-hidden="true"></i>
              </button>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              aria-label="Limpiar todos los filtros"
              onClick={() => {
                setFilterDoctor('');
                setFilterSpecialty('');
                setFilterStatus('');
                setFilterSearch('');
              }}
              className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 font-medium whitespace-nowrap cursor-pointer transition-base shrink-0"
            >
              <i className="ri-filter-off-line" aria-hidden="true"></i> Limpiar
            </button>
          )}
        </div>

        {showFilters && (
          <div
            id="filtros-citas"
            role="region"
            aria-label="Filtros de citas"
            className="flex items-center gap-2 mb-2 flex-wrap shrink-0"
          >
            <Select
              placeholder="Médico"
              aria-label="Filtrar por médico"
              options={[
                { value: '', label: 'Todos los médicos' },
                ...catalogProfessionals.map((d) => ({
                  value: d.healthcareProfessionalId,
                  label: d.fullName,
                })),
              ]}
              value={filterDoctor}
              onChange={(e) => setFilterDoctor(e.target.value)}
              className="w-[150px] text-xs"
            />
            <Select
              placeholder="Especialidad"
              aria-label="Filtrar por especialidad"
              options={[
                { value: '', label: 'Todas' },
                ...catalogSpecialties.map((s) => ({ value: s.name, label: s.name })),
              ]}
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              className="w-[140px] text-xs"
            />
            <Select
              placeholder="Estado"
              aria-label="Filtrar por estado de cita"
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'reservada', label: 'Reservada' },
                { value: 'confirmada', label: 'Confirmada' },
                { value: 'llego', label: 'Llegó' },
                { value: 'en_espera', label: 'En espera' },
                { value: 'en_consulta', label: 'En consulta' },
                { value: 'atendida', label: 'Atendida' },
                { value: 'cancelada', label: 'Cancelada' },
                { value: 'no_acudio', label: 'No acudió' },
              ]}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-[140px] text-xs"
            />
          </div>
        )}

        {view !== 'month' && (
          <div
            className="flex items-center gap-1.5 mb-2 flex-wrap shrink-0 overflow-x-auto"
            role="list"
            aria-label="Leyenda de estados de cita"
          >
            {Object.entries(statusConfig)
              .filter(([k]) => k !== 'disponible' && k !== 'en_triage' && k !== 'llamando')
              .map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1 shrink-0" role="listitem">
                  <span
                    className={`w-2 h-2 rounded-full ${cfg.borderColor.replace('border-l-', 'bg-').replace('-400', '-500').replace('-300', '-400')}`}
                    aria-hidden="true"
                  ></span>
                  <span className="text-[10px] text-foreground-400 whitespace-nowrap">{cfg.label}</span>
                </div>
              ))}
          </div>
        )}

        {showDragHint && (
          <div className="flex items-center justify-between px-3 py-2 mb-2 bg-accent-50 border border-accent-200/60 rounded-lg shrink-0 animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 flex items-center justify-center rounded-full bg-accent-100 text-accent-600 shrink-0">
                <i className="ri-drag-move-line text-sm"></i>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-accent-800">Arrastra para desplazar el calendario</p>
                <p className="text-[10px] text-accent-600">
                  Mantén clic sostenido y mueve el ratón en cualquier dirección. También puedes usar la
                  rueda del ratón.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissDragHint}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-accent-600 hover:text-accent-700 hover:bg-accent-100 rounded-md transition-base cursor-pointer whitespace-nowrap shrink-0"
              aria-label="Ocultar consejo"
            >
              <i className="ri-close-line"></i> Entendido
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden">
          {loading && filteredAppointments.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-foreground-500">
              Cargando citas…
            </div>
          ) : view === 'day' ? (
            activeConsultorios.length > 0 ? (
              <ConsultoriosDayView
                date={selectedDate}
                appointments={filteredAppointments}
                consultorios={consultorios}
                reglasBloqueo={reglasBloqueo}
                onSelectAppointment={setDetailAppointment}
                onScheduleAtTime={handleScheduleAtTime}
                timeGranularity={timeGranularity}
              />
            ) : (
              <DayView
                date={selectedDate}
                appointments={filteredAppointments}
                onSelectAppointment={setDetailAppointment}
                onScheduleAtTime={(time: string) => handleScheduleAtTime(time)}
                onMoveAppointment={handleMoveAppointment}
                timeGranularity={timeGranularity}
              />
            )
          ) : view === 'week' ? (
            <WeekView
              weekDays={weekDays}
              getAppointmentsForDate={getAppsForWeekDate}
              onSelectAppointment={setDetailAppointment}
              onSelectDate={setSelectedDate}
              onScheduleAtDate={handleScheduleAtDate}
              onMoveAppointment={handleMoveAppointment}
              timeGranularity={timeGranularity}
            />
          ) : view === 'list' ? (
            <AgendaListView
              appointments={filteredAppointments}
              onReprint={setPrintAppointment}
              onMarkAttendance={(a) => void handleStatusChange(a.id, 'llego')}
            />
          ) : (
            <MonthView
              year={currentYear}
              month={currentMonth}
              appointments={filteredAppointments}
              onSelectDate={handleMonthDayClick}
              onSelectAppointment={setDetailAppointment}
            />
          )}
        </div>

        <NewAppointmentModal
          open={newModalOpen}
          onClose={closeNewModal}
          defaultDate={selectedDate}
          defaultTime={defaultScheduleTime}
          lockDateTime={lockDateTime}
          onCreateAppointment={handleCreateAppointment}
          allAppointments={displayAppointments}
          defaultPatientId={duplicateAppointment?.patientId || urlPatientId}
          consultorios={consultorios}
          defaultConsultorioId={defaultConsultorioId}
          subjects={subjects}
          branchId={branchId}
        />
        <AppointmentDetailModal
          open={!!detailAppointment}
          onClose={() => setDetailAppointment(null)}
          appointment={detailAppointment}
          onStatusChange={(id, status) => void handleStatusChange(id, status)}
          onDuplicate={handleDuplicate}
        />
        <AgendaConfigModal
          open={configOpen}
          onClose={() => setConfigOpen(false)}
          consultorios={consultorios}
          branchId={branchId}
          onUpsertRoom={upsertRoom}
          reglasBloqueo={reglasBloqueo}
          defaultFecha={selectedDate}
          onReloadBlocks={reload}
        />
        <TicketPrintModal
          appointment={
            printAppointment || {
              id: '',
              sucursalId: '',
              patientId: '',
              patientName: '',
              doctorId: '',
              doctorName: '',
              especialidad: '',
              fecha: '',
              horaInicio: '',
              horaFin: '',
              estado: 'reservada',
              motivo: '',
              consultorio: '',
              roomId: null,
            }
          }
          isOpen={!!printAppointment}
          onClose={() => setPrintAppointment(null)}
        />
      </div>
    </div>
  );
}
