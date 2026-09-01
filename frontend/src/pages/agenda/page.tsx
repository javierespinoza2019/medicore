/**
 * Agenda (M9 / WS-J) — vertical día/lista contra API real.
 * Fail closed: médico sin profesional en sesión → lista vacía + mensaje.
 * Profesionales vía `/api/professionals` (sin `@/mocks/doctors`).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { listBranches, type BranchDto } from '@/api/branches';
import { searchSubjects, type SubjectListItemDto } from '@/api/subjects';
import {
  appointmentStateLabels,
  changeAppointmentState,
  createAppointment,
  listAppointments,
  listConsultingRooms,
  type AppointmentDto,
  type AppointmentState,
  type ConsultingRoomDto,
} from '@/api/appointments';
import { listProfessionals, type ProfessionalDto } from '@/api/professionals';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';

function getTodayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayRangeUtc(dateStr: string): { from: string; to: string } {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function resolveBranchId(
  sucursalActualId: string | null,
  branches: BranchDto[],
): string | null {
  if (!branches.length) return null;
  if (sucursalActualId && /^[0-9a-f-]{36}$/i.test(sucursalActualId)) {
    const hit = branches.find((b) => b.branchId.toLowerCase() === sucursalActualId.toLowerCase());
    if (hit) return hit.branchId;
  }
  const central = branches.find((b) => b.code.toUpperCase() === 'CENTRAL');
  return central?.branchId ?? branches[0].branchId;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function subjectLabel(s: SubjectListItemDto): string {
  const parts = [s.givenName, s.firstSurname, s.secondSurname].filter(Boolean);
  if (parts.length) return parts.join(' ');
  if (s.preferredName) return s.preferredName;
  if (s.operationalLabel) return s.operationalLabel;
  return s.subjectId.slice(0, 8);
}

export default function Agenda() {
  const { user, sucursalActualId } = useAuth();
  const isDoctor = user?.rol === 'medico';
  const myDoctorId = user?.doctorId?.trim() || null;
  const failClosed = isDoctor && !myDoctorId;

  const [selectedDate, setSelectedDate] = useState(getTodayLocal);
  const [view, setView] = useState<'day' | 'list'>('day');
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [rooms, setRooms] = useState<ConsultingRoomDto[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalDto[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectListItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [subjectId, setSubjectId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:30');
  const [notes, setNotes] = useState('');
  const [cancelReason, setCancelReason] = useState<Record<string, string>>({});

  const branchId = useMemo(
    () => resolveBranchId(sucursalActualId, branches),
    [sucursalActualId, branches],
  );

  const loadMeta = useCallback(async () => {
    const [bRes, sRes, pRes] = await Promise.all([
      listBranches(true),
      searchSubjects(undefined, true),
      listProfessionals(true),
    ]);
    if (bRes.success && bRes.data) setBranches(bRes.data);
    if (sRes.success && sRes.data) setSubjects(sRes.data);
    if (pRes.success && pRes.data) {
      setProfessionals(pRes.data);
      setProfessionalId((prev) => {
        if (prev && pRes.data!.some((p) => p.healthcareProfessionalId === prev)) return prev;
        return pRes.data![0]?.healthcareProfessionalId ?? '';
      });
    }
  }, []);

  const loadAgenda = useCallback(async () => {
    if (!branchId) return;
    if (failClosed) {
      setAppointments([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const range = dayRangeUtc(selectedDate);
    const [aRes, rRes] = await Promise.all([
      listAppointments({
        branchId,
        from: range.from,
        to: range.to,
        mine: isDoctor,
        professionalId: !isDoctor && myDoctorId ? undefined : undefined,
      }),
      listConsultingRooms(branchId, true),
    ]);
    setLoading(false);
    if (!aRes.success) {
      setError(aRes.message ?? 'No se pudo cargar la agenda.');
      setAppointments([]);
      return;
    }
    setAppointments(aRes.data ?? []);
    if (rRes.success && rRes.data) {
      setRooms(rRes.data);
      if (!roomId && rRes.data[0]) setRoomId(rRes.data[0].roomId);
    }
  }, [branchId, selectedDate, failClosed, isDoctor, myDoctorId, roomId]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void loadAgenda();
  }, [loadAgenda]);

  useEffect(() => {
    if (isDoctor && myDoctorId) setProfessionalId(myDoctorId);
  }, [isDoctor, myDoctorId]);

  const handleCreate = async () => {
    if (!branchId || !subjectId) {
      setError('Seleccione sujeto y sucursal.');
      return;
    }
    const start = new Date(`${selectedDate}T${startTime}:00`);
    const end = new Date(`${selectedDate}T${endTime}:00`);
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await createAppointment({
      branchId,
      subjectId,
      professionalId,
      roomId: roomId || null,
      scheduledStartUtc: start.toISOString(),
      scheduledEndUtc: end.toISOString(),
      notes: notes.trim() || null,
    });
    setLoading(false);
    if (!res.success) {
      setError(res.message ?? 'No se pudo agendar.');
      return;
    }
    setFormOpen(false);
    setNotes('');
    setMessage('Cita agendada.');
    await loadAgenda();
  };

  const handleState = async (id: string, toState: AppointmentState) => {
    const reason = toState === 'cancelada' ? (cancelReason[id] ?? '').trim() : null;
    if (toState === 'cancelada' && !reason) {
      setError('Cancelar exige motivo.');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await changeAppointmentState(id, { toState, reason });
    setLoading(false);
    if (!res.success) {
      setError(res.message ?? 'No se pudo cambiar el estado.');
      return;
    }
    setMessage(`Estado actualizado a ${appointmentStateLabels[toState] ?? toState}.`);
    await loadAgenda();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4" data-testid="page-agenda">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Agenda</h1>
          <p className="text-sm text-slate-600">
            Citas del día contra API (M9). Escritura online; offline se cableará después.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'day' ? 'primary' : 'secondary'}
            onClick={() => setView('day')}
          >
            Día
          </Button>
          <Button
            variant={view === 'list' ? 'primary' : 'secondary'}
            onClick={() => setView('list')}
          >
            Lista
          </Button>
          <Button
            variant="primary"
            disabled={failClosed || !branchId}
            onClick={() => setFormOpen((v) => !v)}
          >
            Nueva cita
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-slate-600 mb-1">Fecha</span>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </label>
        <Button variant="secondary" onClick={() => void loadAgenda()} disabled={loading}>
          Actualizar
        </Button>
      </div>

      {failClosed && (
        <div className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Su usuario no tiene profesional sanitario asociado. El filtro «mi agenda» falla
          cerrado: no se muestran citas.
        </div>
      )}

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      )}

      {formOpen && !failClosed && (
        <div className="rounded border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
          <h2 className="font-medium text-slate-900">Agendar cita</h2>
          <p className="text-xs text-slate-500">
            Se puede agendar sujeto sin identidad completa (basta SubjectId).
          </p>
          <label className="block text-sm">
            <span className="text-slate-600">Sujeto</span>
            <select
              className="mt-1 w-full border border-slate-300 rounded px-2 py-2"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">Seleccione…</option>
              {subjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {subjectLabel(s)} ({s.identificationState})
                </option>
              ))}
            </select>
          </label>
          {!isDoctor && (
            <label className="block text-sm">
              <span className="text-slate-600">Profesional</span>
              <select
                className="mt-1 w-full border border-slate-300 rounded px-2 py-2"
                data-testid="agenda-professional-select"
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
              >
                {professionals.length === 0 && (
                  <option value="">Sin profesionales activos</option>
                )}
                {professionals.map((p) => (
                  <option key={p.healthcareProfessionalId} value={p.healthcareProfessionalId}>
                    {p.fullName}
                    {p.specialtyName ? ` — ${p.specialtyName}` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="text-slate-600">Consultorio</span>
            <select
              className="mt-1 w-full border border-slate-300 rounded px-2 py-2"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            >
              <option value="">Sin consultorio</option>
              {rooms.map((r) => (
                <option key={r.roomId} value={r.roomId}>
                  {r.code} — {r.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-3">
            <label className="text-sm">
              <span className="text-slate-600">Inicio</span>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="text-slate-600">Fin</span>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-slate-600">Notas</span>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <Button variant="primary" onClick={() => void handleCreate()} disabled={loading}>
            Guardar cita
          </Button>
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Cargando…</p>}

      {!loading && !failClosed && appointments.length === 0 && (
        <p className="text-sm text-slate-500">No hay citas en este día.</p>
      )}

      <ul className="space-y-2">
        {appointments.map((a) => (
          <li
            key={a.appointmentId}
            className="rounded border border-slate-200 bg-white px-4 py-3 flex flex-wrap gap-3 justify-between items-start"
          >
            <div>
              <div className="font-medium text-slate-900">
                {formatTime(a.scheduledStartUtc)}–{formatTime(a.scheduledEndUtc)} ·{' '}
                {a.subjectDisplayLabel}
              </div>
              <div className="text-sm text-slate-600">
                {a.professionalFullName ?? a.professionalId}
                {a.roomName ? ` · ${a.roomName}` : ''}
                {' · '}
                {appointmentStateLabels[a.state] ?? a.state}
              </div>
              {a.notes && <div className="text-xs text-slate-500 mt-1">{a.notes}</div>}
            </div>
            {a.state !== 'cancelada' && a.state !== 'atendida' && (
              <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex flex-wrap gap-1">
                  {a.state === 'agendada' && (
                    <Button
                      variant="secondary"
                      onClick={() => void handleState(a.appointmentId, 'confirmada')}
                    >
                      Confirmar
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => void handleState(a.appointmentId, 'atendida')}
                  >
                    Atendida
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => void handleState(a.appointmentId, 'no_asistio')}
                  >
                    No asistió
                  </Button>
                </div>
                <div className="flex gap-1 items-center">
                  <Input
                    placeholder="Motivo cancelación"
                    value={cancelReason[a.appointmentId] ?? ''}
                    onChange={(e) =>
                      setCancelReason((prev) => ({
                        ...prev,
                        [a.appointmentId]: e.target.value,
                      }))
                    }
                  />
                  <Button
                    variant="secondary"
                    onClick={() => void handleState(a.appointmentId, 'cancelada')}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {view === 'list' && appointments.length > 0 && (
        <p className="text-xs text-slate-400">
          Vista lista: mismas citas del día ordenadas por hora ({appointments.length}).
        </p>
      )}
    </div>
  );
}
