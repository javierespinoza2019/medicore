import { useState, useMemo, useEffect } from 'react';
import Modal from '@/components/base/Modal';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import Avatar from '@/components/base/Avatar';
import type { SubjectListItemDto } from '@/api/subjects';
import type { AgendaAppointment, Appointment } from '@/pages/agenda/types';
import type { AgendaConsultorio } from '@/pages/agenda/consultorioTypes';
import TicketPrintModal from '@/pages/agenda/components/TicketPrintModal';
import { useAgendaProfessionalsCatalog } from '@/pages/agenda/hooks/useAgendaProfessionalsCatalog';

function subjectDisplayName(s: SubjectListItemDto): string {
  const parts = [s.givenName, s.firstSurname, s.secondSurname].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return s.preferredName ?? s.operationalLabel ?? s.subjectId.slice(0, 8);
}

interface NewAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  onCreateAppointment: (input: {
    subjectId: string;
    professionalId: string;
    roomId: string | null;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    motivo: string;
  }) => Promise<AgendaAppointment | null>;
  allAppointments: Appointment[];
  defaultPatientId?: string;
  defaultTime?: string;
  lockDateTime?: boolean;
  consultorios: AgendaConsultorio[];
  defaultConsultorioId?: string;
  subjects: SubjectListItemDto[];
  branchId: string | null;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function getNow(): { date: string; minutes: number } {
  const now = new Date();
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const m = now.getHours() * 60 + now.getMinutes();
  return { date: d, minutes: m };
}

function isDateTimePast(date: string, time: string): boolean {
  const now = getNow();
  if (date < now.date) return true;
  if (date === now.date && toMinutes(time) <= now.minutes) return true;
  return false;
}

function hasConflict(
  date: string,
  doctorId: string,
  startTime: string,
  duration: string,
  allApps: Appointment[],
  excludeId?: string
): Appointment | null {
  const start = toMinutes(startTime);
  const end = start + Number(duration);
  return allApps.find(a =>
    a.id !== excludeId &&
    a.fecha === date &&
    a.doctorId === doctorId &&
    a.estado !== 'cancelada' &&
    a.estado !== 'no_acudio' &&
    a.estado !== 'atendida' &&
    start < toMinutes(a.horaFin) &&
    end > toMinutes(a.horaInicio)
  ) || null;
}

function getOccupiedSlots(date: string, doctorId: string, allApps: Appointment[]): { start: string; end: string; patientName: string }[] {
  return allApps
    .filter(a =>
      a.fecha === date &&
      a.doctorId === doctorId &&
      a.estado !== 'cancelada' &&
      a.estado !== 'no_acudio' &&
      a.estado !== 'atendida' &&
      a.estado !== 'disponible' &&
      a.patientId
    )
    .map(a => ({ start: a.horaInicio, end: a.horaFin, patientName: a.patientName }));
}

export default function NewAppointmentModal({ open, onClose, defaultDate, onCreateAppointment, allAppointments, defaultPatientId, defaultTime, lockDateTime = false, consultorios, defaultConsultorioId, subjects, branchId }: NewAppointmentModalProps) {
  const { professionals, specialties } = useAgendaProfessionalsCatalog(true);
  const [step, setStep] = useState(defaultPatientId ? 2 : 1);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(defaultPatientId || '');
  const [doctorId, setDoctorId] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [consultorioId, setConsultorioId] = useState(defaultConsultorioId || '');
  const [fecha, setFecha] = useState(defaultDate);
  const [horaInicio, setHoraInicio] = useState(defaultTime || '09:00');
  const [duracion, setDuracion] = useState('30');
  const [motivo, setMotivo] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null);
  const [printTicketOpen, setPrintTicketOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Reset all fields every time the modal opens
  useEffect(() => {
    if (open) {
      setStep(defaultPatientId ? 2 : 1);
      setPatientSearch('');
      setSelectedPatientId(defaultPatientId || '');
      setDoctorId('');
      setSpecialtyFilter('');
      setConsultorioId(defaultConsultorioId || '');
      setFecha(defaultDate);
      setHoraInicio(defaultTime || '09:00');
      setDuracion('30');
      setMotivo('');
      setErrors({});
      setCreatedAppointment(null);
      setPrintTicketOpen(false);
    }
  }, [open, defaultDate, defaultTime, defaultPatientId, defaultConsultorioId]);

  // When opening with a preselected patient (from patient profile), jump to step 2
  useEffect(() => {
    if (open && defaultPatientId) {
      setStep(2);
      setSelectedPatientId(defaultPatientId);
    }
  }, [open, defaultPatientId]);

  const filteredPatients = useMemo(() => {
    const active = subjects;
    if (!patientSearch.trim()) return active;
    const q = patientSearch.toLowerCase();
    return active.filter((s) => {
      const name = [s.givenName, s.firstSurname, s.secondSurname, s.preferredName, s.operationalLabel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return name.includes(q) || s.subjectId.toLowerCase().includes(q);
    });
  }, [patientSearch, subjects]);

  const filteredDoctors = useMemo(() => {
    let list = professionals.filter((d) => d.isActive);
    if (consultorioId) {
      const cons = consultorios.find((c) => c.id === consultorioId);
      // Sin médicos asignados: no filtrar (todos los activos). Con lista: restringir.
      if (cons && cons.medicosIds.length > 0) {
        list = list.filter((d) => cons.medicosIds.includes(d.healthcareProfessionalId));
      } else if (cons?.especialidadId) {
        list = list.filter((d) => d.specialtyId === cons.especialidadId);
      }
    } else if (specialtyFilter) {
      list = list.filter((d) => (d.specialtyName ?? '') === specialtyFilter);
    }
    return list;
  }, [consultorioId, consultorios, specialtyFilter, professionals]);

  // Auto-selecciona el médico si el consultorio tiene uno solo vinculado
  useEffect(() => {
    if (consultorioId) {
      const cons = consultorios.find((c) => c.id === consultorioId);
      if (cons && cons.medicosIds.length === 1) {
        setDoctorId(cons.medicosIds[0]);
      }
    }
  }, [consultorioId, consultorios]);

  const selectedPatient = subjects.find((p) => p.subjectId === selectedPatientId);
  const selectedDoctor = professionals.find((d) => d.healthcareProfessionalId === doctorId);
  const selectedConsultorio = consultorios.find((c) => c.id === consultorioId);

  const conflictAppointment = useMemo(() => {
    if (!doctorId || !fecha || !horaInicio || !duracion) return null;
    return hasConflict(fecha, doctorId, horaInicio, duracion, allAppointments);
  }, [doctorId, fecha, horaInicio, duracion, allAppointments]);

  const pastDateError = useMemo(() => {
    if (!fecha || !horaInicio) return null;
    return isDateTimePast(fecha, horaInicio);
  }, [fecha, horaInicio]);

  const occupiedSlots = useMemo(() => {
    if (!doctorId || !fecha) return [];
    return getOccupiedSlots(fecha, doctorId, allAppointments);
  }, [doctorId, fecha, allAppointments]);

  const calculateHoraFin = () => {
    const [h, m] = horaInicio.split(':').map(Number);
    const totalMin = h * 60 + m + Number(duracion);
    const hh = Math.floor(totalMin / 60).toString().padStart(2, '0');
    const mm = (totalMin % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const handleNext = () => {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!selectedPatientId) errs.patient = 'Selecciona un paciente';
    }
    if (step === 2) {
      if (!doctorId) errs.doctor = 'Selecciona un médico';
      if (!horaInicio) errs.hora = 'Selecciona una hora';
      if (motivo.trim().length > 0 && motivo.trim().length < 5) errs.motivo = 'El motivo debe tener al menos 5 caracteres';
      if (/^\d+$/.test(motivo.trim())) errs.motivo = 'El motivo no puede ser solo números';
      if (conflictAppointment) errs.conflict = `Conflicto: ${conflictAppointment.patientName} ya tiene una cita de ${conflictAppointment.horaInicio} a ${conflictAppointment.horaFin}`;
    }
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStep(step + 1);
  };

  const handleCreate = async () => {
    if (!selectedPatient || !selectedDoctor || !branchId) return;
    if (conflictAppointment) return;
    if (pastDateError) return;
    if (motivo.trim().length > 0 && motivo.trim().length < 5) {
      setErrors((prev) => ({ ...prev, motivo: 'El motivo debe tener al menos 5 caracteres' }));
      return;
    }
    if (/^\d+$/.test(motivo.trim())) {
      setErrors((prev) => ({ ...prev, motivo: 'El motivo no puede ser solo números' }));
      return;
    }
    setCreating(true);
    const created = await onCreateAppointment({
      subjectId: selectedPatient.subjectId,
      professionalId: selectedDoctor.healthcareProfessionalId,
      roomId: consultorioId || null,
      fecha,
      horaInicio,
      horaFin: calculateHoraFin(),
      motivo,
    });
    setCreating(false);
    if (created) {
      setCreatedAppointment(created);
    }
  };

  const handleReset = () => {
    setStep(defaultPatientId ? 2 : 1);
    setPatientSearch('');
    setSelectedPatientId(defaultPatientId || '');
    setDoctorId('');
    setSpecialtyFilter('');
    setConsultorioId(defaultConsultorioId || '');
    setFecha(defaultDate);
    setHoraInicio(defaultTime || '09:00');
    setDuracion('30');
    setMotivo('');
    setErrors({});
    setCreatedAppointment(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleCloseSuccess = () => {
    handleReset();
    setCreatedAppointment(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Nueva Cita" size="lg">
      <div>
        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-base ${
                s < step ? 'bg-emerald-500 text-white' :
                s === step ? 'bg-primary-500 text-white' :
                'bg-secondary-100 text-foreground-400'
              }`}>
                {s < step ? <i className="ri-check-line"></i> : s}
              </div>
              <span className={`text-xs font-medium ${s <= step ? 'text-foreground-700' : 'text-foreground-400'}`}>
                {s === 1 ? 'Paciente' : s === 2 ? 'Médico y Horario' : 'Confirmar'}
              </span>
              {s < 3 && <div className={`flex-1 h-0.5 rounded ${s < step ? 'bg-emerald-400' : 'bg-secondary-200'}`}></div>}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            {defaultPatientId && selectedPatient ? (
              <div className="p-4 bg-primary-50 border border-primary-200/60 rounded-xl space-y-2">
                <p className="text-[11px] font-medium text-primary-600 uppercase tracking-wide">Paciente seleccionado</p>
                <div className="flex items-center gap-3">
                  <Avatar name={subjectDisplayName(selectedPatient)} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground-900">{subjectDisplayName(selectedPatient)}</p>
                    <p className="text-xs text-foreground-500">{selectedPatient.identificationState}</p>
                  </div>
                  <span className="w-6 h-6 flex items-center justify-center text-emerald-500 shrink-0" aria-hidden="true">
                    <i className="ri-checkbox-circle-fill text-lg"></i>
                  </span>
                </div>
              </div>
            ) : (
              <>
                <Input
                  type="search"
                  label="Buscar paciente"
                  placeholder="Nombre o identificador..."
                  aria-label="Buscar paciente por nombre o identificador"
                  maxLength={100}
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  leftIcon="ri-search-line"
                />
                {errors?.patient && <p className="text-xs text-red-500" role="alert">{errors.patient}</p>}

                <div className="max-h-[240px] overflow-y-auto space-y-0.5 border border-secondary-200 rounded-lg" role="listbox" aria-label="Resultados de búsqueda de pacientes">
                  {filteredPatients.length === 0 ? (
                    <p className="text-sm text-foreground-400 text-center py-6">No se encontraron pacientes</p>
                  ) : (
                    filteredPatients.map((p) => (
                      <div
                        key={p.subjectId}
                        role="option"
                        aria-selected={selectedPatientId === p.subjectId}
                        onClick={() => { setSelectedPatientId(p.subjectId); setErrors({}); }}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-base hover:bg-secondary-50 ${
                          selectedPatientId === p.subjectId ? 'bg-primary-50 border-l-2 border-l-primary-500' : ''
                        }`}
                      >
                        <Avatar name={subjectDisplayName(p)} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground-900 truncate">{subjectDisplayName(p)}</p>
                          <p className="text-xs text-foreground-500">{p.identificationState}</p>
                        </div>
                        {selectedPatientId === p.subjectId && (
                          <span className="w-5 h-5 flex items-center justify-center text-primary-500" aria-hidden="true">
                            <i className="ri-checkbox-circle-fill"></i>
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {step === 2 && selectedPatient && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-secondary-50 rounded-lg">
              <Avatar name={subjectDisplayName(selectedPatient)} size="sm" />
              <div>
                <p className="text-sm font-semibold text-foreground-900">{subjectDisplayName(selectedPatient)}</p>
                <p className="text-xs text-foreground-500">{selectedPatient.identificationState}</p>
              </div>
            </div>

            <Select
              label="Consultorio"
              aria-label="Seleccionar consultorio"
              placeholder="Seleccionar consultorio"
              options={[
                { value: '', label: 'Sin consultorio específico' },
                ...consultorios.filter((c) => c.activo).map((c) => ({ value: c.id, label: c.nombre })),
              ]}
              value={consultorioId}
              onChange={(e) => { setConsultorioId(e.target.value); setDoctorId(''); setSpecialtyFilter(''); }}
              disabled={lockDateTime && !!defaultConsultorioId}
            />
            {lockDateTime && defaultConsultorioId && (
              <p className="text-[10px] text-foreground-400 -mt-2 flex items-center gap-1">
                <i className="ri-lock-line text-[10px]"></i>
                Consultorio bloqueado desde el calendario
              </p>
            )}

            {consultorioId && selectedConsultorio ? (
              <div className="p-3 bg-secondary-50 rounded-lg border border-secondary-200">
                <p className="text-xs font-medium text-foreground-500">Especialidad vinculada al consultorio</p>
                <p className="text-sm font-semibold text-foreground-900">
                  {specialties.find((s) => s.specialtyId === selectedConsultorio.especialidadId)?.name || '—'}
                </p>
              </div>
            ) : (
              <Select
                label="Especialidad (filtro)"
                aria-label="Filtrar médicos por especialidad"
                placeholder="Todas las especialidades"
                options={specialties.map((s) => ({ value: s.name, label: s.name }))}
                value={specialtyFilter}
                onChange={(e) => { setSpecialtyFilter(e.target.value); setDoctorId(''); }}
              />
            )}

            <Select
              label="Médico"
              aria-label="Seleccionar médico"
              placeholder="Seleccionar médico"
              data-testid="agenda-professional-select"
              options={filteredDoctors.map((d) => ({
                value: d.healthcareProfessionalId,
                label: d.specialtyName ? `${d.fullName} — ${d.specialtyName}` : d.fullName,
              }))}
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            />
            {errors?.doctor && <p className="text-xs text-red-500" role="alert">{errors.doctor}</p>}

            {/* Occupied slots preview */}
            {occupiedSlots.length > 0 && (
              <div className="p-3 bg-secondary-50 rounded-lg border border-secondary-200">
                <p className="text-xs font-medium text-foreground-600 mb-2">Horarios ocupados este día:</p>
                <div className="flex flex-wrap gap-1.5">
                  {occupiedSlots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-background-50 border border-secondary-200 rounded-md">
                      <span className="text-[10px] font-mono font-bold text-foreground-500">{slot.start}–{slot.end}</span>
                      <span className="text-[10px] text-foreground-400 truncate max-w-[120px]">{(slot.patientName || '').split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="Fecha"
                  aria-label="Fecha de la cita"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  disabled={lockDateTime}
                />
                {lockDateTime && (
                  <p className="text-[10px] text-foreground-400 mt-1 flex items-center gap-1">
                    <i className="ri-lock-line text-[10px]"></i>
                    Fecha bloqueada desde el calendario
                  </p>
                )}
              </div>
              <div>
                <Input
                  label="Hora de inicio"
                  aria-label="Hora de inicio de la cita"
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  disabled={lockDateTime}
                />
                {lockDateTime && (
                  <p className="text-[10px] text-foreground-400 mt-1 flex items-center gap-1">
                    <i className="ri-lock-line text-[10px]"></i>
                    Hora bloqueada desde el calendario
                  </p>
                )}
              </div>
            </div>

            <Select
              label="Duración"
              aria-label="Duración de la cita"
              options={[
                { value: '15', label: '15 minutos' },
                { value: '30', label: '30 minutos' },
                { value: '45', label: '45 minutos' },
                { value: '60', label: '1 hora' },
              ]}
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
            />

            {errors?.conflict && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg" role="alert">
                <i className="ri-error-warning-line text-red-500 mt-0.5" aria-hidden="true"></i>
                <div>
                  <p className="text-xs font-medium text-red-700">Horario no disponible</p>
                  <p className="text-xs text-red-600">{errors.conflict}</p>
                </div>
              </div>
            )}

            {pastDateError && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg" role="alert">
                <i className="ri-time-line text-amber-500 mt-0.5" aria-hidden="true"></i>
                <div>
                  <p className="text-xs font-medium text-amber-700">Fecha y hora ya pasaron</p>
                  <p className="text-xs text-amber-600">La fecha {fecha} a las {horaInicio} ya ocurrió. Selecciona una fecha y hora futuras para agendar la cita.</p>
                </div>
              </div>
            )}

            <Input
              label="Motivo de la consulta"
              aria-label="Motivo de la consulta"
              placeholder="Ej: Control de rutina, dolor de cabeza..."
              maxLength={500}
              value={motivo}
              onChange={(e) => { setMotivo(e.target.value); if (errors.motivo) setErrors((p) => { const n = { ...p }; delete n.motivo; return n; }); }}
            />
            {errors?.motivo && <p className="text-xs text-red-500" role="alert">{errors.motivo}</p>}
          </div>
        )}

        {step === 3 && selectedPatient && selectedDoctor && !createdAppointment && (
          <div className="space-y-4">
            <div className="p-4 bg-secondary-50 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <Avatar name={subjectDisplayName(selectedPatient)} size="lg" />
                <div>
                  <p className="text-sm font-bold text-foreground-900">{subjectDisplayName(selectedPatient)}</p>
                  <p className="text-xs text-foreground-500">{selectedPatient.identificationState}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-secondary-200">
                <div>
                  <p className="text-xs text-foreground-400">Médico</p>
                  <p className="font-medium text-foreground-900">{selectedDoctor.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-400">Especialidad</p>
                  <p className="font-medium text-foreground-900">{selectedDoctor.specialtyName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-400">Fecha</p>
                  <p className="font-medium text-foreground-900">{fecha}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-400">Horario</p>
                  <p className="font-medium text-foreground-900">{horaInicio} – {calculateHoraFin()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-foreground-400">Consultorio</p>
                  <p className="font-medium text-foreground-900">{selectedConsultorio?.nombre || '—'}</p>
                </div>
                {motivo && (
                  <div className="col-span-2">
                    <p className="text-xs text-foreground-400">Motivo</p>
                    <p className="font-medium text-foreground-900">{motivo}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {createdAppointment && (
          <div className="space-y-5">
            <div className="text-center py-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <i className="ri-checkbox-circle-fill text-2xl text-emerald-500"></i>
              </div>
              <p className="text-sm font-bold text-foreground-900">¡Cita agendada con éxito!</p>
              <p className="text-xs text-foreground-500 mt-1">La cita ha sido registrada en el sistema.</p>
            </div>

            <div className="p-4 bg-secondary-50 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <Avatar name={createdAppointment.patientName} size="lg" />
                <div>
                  <p className="text-sm font-bold text-foreground-900">{createdAppointment.patientName}</p>
                  <p className="text-xs text-foreground-500">{createdAppointment.fecha} · {createdAppointment.horaInicio} – {createdAppointment.horaFin}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-secondary-200">
                <div>
                  <p className="text-xs text-foreground-400">Médico</p>
                  <p className="font-medium text-foreground-900">{createdAppointment.doctorName}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-400">Especialidad</p>
                  <p className="font-medium text-foreground-900">{createdAppointment.especialidad}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-400">Consultorio</p>
                  <p className="font-medium text-foreground-900">{createdAppointment.consultorio}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-400">Folio</p>
                  <p className="font-medium text-foreground-900 font-mono text-xs">TK-{createdAppointment.fecha.replace(/-/g, '')}-{createdAppointment.id.toUpperCase().replace('APP-', '')}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button variant="primary" size="sm" onClick={() => setPrintTicketOpen(true)}>
                <i className="ri-printer-line"></i> Imprimir ticket
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCloseSuccess}>
                Cerrar
              </Button>
            </div>
          </div>
        )}

        {!createdAppointment && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-secondary-200">
            <div>
              {step > 1 && (
                <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                  <i className="ri-arrow-left-line"></i> Atrás
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleClose}>Cancelar</Button>
              {step < 3 ? (
                <Button variant="primary" size="sm" onClick={handleNext} disabled={step === 2 && (!!conflictAppointment || pastDateError)}>
                  Siguiente
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={handleCreate} disabled={!!conflictAppointment || pastDateError}>
                  <i className="ri-calendar-check-line"></i> Agendar Cita
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      <TicketPrintModal
        appointment={createdAppointment || {
          id: '', sucursalId: '', patientId: '', patientName: '', doctorId: '', doctorName: '',
          especialidad: '', fecha: '', horaInicio: '', horaFin: '', estado: 'reservada',
          motivo: '', consultorio: '', roomId: null,
        }}
        isOpen={printTicketOpen}
        onClose={() => setPrintTicketOpen(false)}
      />
    </Modal>
  );
}