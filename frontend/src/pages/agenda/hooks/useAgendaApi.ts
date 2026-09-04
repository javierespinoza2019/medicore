import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { listBranches, type BranchDto } from '@/api/branches';
import { searchSubjects, type SubjectListItemDto } from '@/api/subjects';
import {
  changeAppointmentState,
  createAppointment,
  listAppointments,
  listConsultingRooms,
  rescheduleAppointment,
  upsertConsultingRoom,
  type AppointmentDto,
  type CreateAppointmentRequest,
} from '@/api/appointments';
import { listProfessionals, type ProfessionalDto } from '@/api/professionals';
import { resolveBranchId } from '@/utils/branchResolution';
import { computeAgendaRange } from '@/pages/agenda/agendaDateUtils';
import {
  dtoToAgendaAppointment,
  roomToConsultorio,
  uiStateToApi,
} from '@/pages/agenda/agendaPresentation';
import type { AgendaAppointment, AgendaAppointmentEstado } from '@/pages/agenda/types';
import type { AgendaConsultorio } from '@/pages/agenda/consultorioTypes';

type ViewMode = 'day' | 'week' | 'month' | 'list';

export function useAgendaApi(
  view: ViewMode,
  selectedDate: string,
  currentYear: number,
  currentMonth: number,
) {
  const { user, sucursalActualId } = useAuth();
  const isDoctor = user?.rol === 'medico';
  const myDoctorId = user?.doctorId?.trim() || null;
  const failClosed = isDoctor && !myDoctorId;

  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [appointmentsRaw, setAppointmentsRaw] = useState<AppointmentDto[]>([]);
  const [consultorios, setConsultorios] = useState<AgendaConsultorio[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectListItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const branchId = useMemo(
    () => resolveBranchId(sucursalActualId, branches),
    [sucursalActualId, branches],
  );

  const appointments = useMemo(
    () => appointmentsRaw.map((dto) => dtoToAgendaAppointment(dto, professionals)),
    [appointmentsRaw, professionals],
  );

  const loadMeta = useCallback(async () => {
    const [bRes, sRes, pRes] = await Promise.all([
      listBranches(true),
      searchSubjects(undefined, true),
      listProfessionals(true),
    ]);
    if (bRes.success && bRes.data) setBranches(bRes.data);
    if (sRes.success && sRes.data) setSubjects(sRes.data);
    if (pRes.success && pRes.data) setProfessionals(pRes.data);
  }, []);

  const reload = useCallback(async () => {
    if (!branchId) return;
    if (failClosed) {
      setAppointmentsRaw([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const range = computeAgendaRange(view, selectedDate, currentYear, currentMonth);
    const [aRes, rRes] = await Promise.all([
      listAppointments({
        branchId,
        from: range.from,
        to: range.to,
        mine: isDoctor,
      }),
      listConsultingRooms(branchId, false),
    ]);
    setLoading(false);
    if (!aRes.success) {
      setError(aRes.message ?? 'No se pudo cargar la agenda.');
      setAppointmentsRaw([]);
      return;
    }
    setAppointmentsRaw(aRes.data ?? []);
    if (rRes.success && rRes.data) {
      setConsultorios(rRes.data.map(roomToConsultorio));
    }
  }, [branchId, failClosed, isDoctor, view, selectedDate, currentYear, currentMonth]);

  const upsertRoom = useCallback(
    async (input: {
      roomId?: string;
      code: string;
      name: string;
      isActive: boolean;
      specialtyId?: string | null;
      professionalIds?: string[];
    }): Promise<boolean> => {
      if (!branchId) {
        setError('Selecciona una sucursal para gestionar consultorios.');
        return false;
      }
      const id = input.roomId ?? crypto.randomUUID();
      const res = await upsertConsultingRoom(id, {
        branchId,
        code: input.code.trim(),
        name: input.name.trim(),
        isActive: input.isActive,
        specialtyId: input.specialtyId ?? null,
        professionalIds: input.professionalIds ?? [],
      });
      if (!res.success) {
        setError(res.message ?? 'No se pudo guardar el consultorio.');
        return false;
      }
      await reload();
      return true;
    },
    [branchId, reload],
  );

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createFromForm = useCallback(
    async (input: {
      subjectId: string;
      professionalId: string;
      roomId: string | null;
      fecha: string;
      horaInicio: string;
      horaFin: string;
      motivo: string;
    }): Promise<AgendaAppointment | null> => {
      if (!branchId) return null;
      const start = new Date(`${input.fecha}T${input.horaInicio}:00`);
      const end = new Date(`${input.fecha}T${input.horaFin}:00`);
      const body: CreateAppointmentRequest = {
        branchId,
        subjectId: input.subjectId,
        professionalId: input.professionalId,
        roomId: input.roomId,
        scheduledStartUtc: start.toISOString(),
        scheduledEndUtc: end.toISOString(),
        notes: input.motivo.trim() || null,
      };
      const res = await createAppointment(body);
      if (!res.success || !res.data) {
        setError(res.message ?? 'No se pudo agendar la cita.');
        return null;
      }
      await reload();
      return dtoToAgendaAppointment(res.data, professionals);
    },
    [branchId, professionals, reload],
  );

  const changeStatus = useCallback(
    async (appointmentId: string, uiStatus: AgendaAppointmentEstado, reason?: string) => {
      const apiState = uiStateToApi(uiStatus);
      if (!apiState) {
        setError('Ese estado de agenda aún no se persiste en el servidor.');
        return false;
      }
      const res = await changeAppointmentState(appointmentId, {
        toState: apiState,
        reason: reason ?? null,
      });
      if (!res.success) {
        setError(res.message ?? 'No se pudo cambiar el estado.');
        return false;
      }
      await reload();
      return true;
    },
    [reload],
  );

  const moveAppointment = useCallback(
    async (
      appointmentId: string,
      newDate: string,
      newHoraInicio: string,
      newHoraFin: string,
    ) => {
      const start = new Date(`${newDate}T${newHoraInicio}:00`);
      const end = new Date(`${newDate}T${newHoraFin}:00`);
      const res = await rescheduleAppointment(appointmentId, {
        scheduledStartUtc: start.toISOString(),
        scheduledEndUtc: end.toISOString(),
      });
      if (!res.success) {
        setError(res.message ?? 'No se pudo reprogramar la cita.');
        return false;
      }
      await reload();
      return true;
    },
    [reload],
  );

  return {
    user,
    isDoctor,
    myDoctorId,
    failClosed,
    branchId,
    appointments,
    consultorios,
    setConsultorios,
    professionals,
    subjects,
    loading,
    error,
    setError,
    reload,
    createFromForm,
    changeStatus,
    moveAppointment,
    upsertRoom,
  };
}
