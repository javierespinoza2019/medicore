import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDevice } from '@/hooks/DeviceProvider';
import { listBranches, type BranchDto } from '@/api/branches';
import { searchSubjects, type SubjectListItemDto } from '@/api/subjects';
import {
  listAppointments,
  listConsultingRooms,
  rescheduleAppointment,
  upsertConsultingRoom,
  type AppointmentDto,
  type CreateAppointmentRequest,
} from '@/api/appointments';
import { listScheduleBlocks } from '@/api/scheduleBlocks';
import { listProfessionals, type ProfessionalDto } from '@/api/professionals';
import { resolveBranchId } from '@/utils/branchResolution';
import { runClinicalOutboxCommand, isClinicalOutboxErr } from '@/sync/runClinicalOutboxCommand';
import { computeAgendaRange } from '@/pages/agenda/agendaDateUtils';
import {
  dtoToAgendaAppointment,
  dtoToReglaBloqueo,
  roomToConsultorio,
  uiStateToApi,
} from '@/pages/agenda/agendaPresentation';
import type { AgendaAppointment, AgendaAppointmentEstado } from '@/pages/agenda/types';
import type { AgendaConsultorio } from '@/pages/agenda/consultorioTypes';
import type { ReglaBloqueo } from '@/pages/agenda/agendaRulesTypes';

type ViewMode = 'day' | 'week' | 'month' | 'list';

export function useAgendaApi(
  view: ViewMode,
  selectedDate: string,
  currentYear: number,
  currentMonth: number,
) {
  const { user, sucursalActualId } = useAuth();
  const { allowsClinicalCache, isPendingApproval } = useDevice();
  const isDoctor = user?.rol === 'medico';
  const myDoctorId = user?.doctorId?.trim() || null;
  const failClosed = isDoctor && !myDoctorId;

  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [appointmentsRaw, setAppointmentsRaw] = useState<AppointmentDto[]>([]);
  const [consultorios, setConsultorios] = useState<AgendaConsultorio[]>([]);
  const [reglasBloqueo, setReglasBloqueo] = useState<ReglaBloqueo[]>([]);
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
    const [aRes, rRes, bRes] = await Promise.all([
      listAppointments({
        branchId,
        from: range.from,
        to: range.to,
        mine: isDoctor,
      }),
      listConsultingRooms(branchId, false),
      listScheduleBlocks(branchId, range.from, range.to),
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
    if (bRes.success && bRes.data) {
      setReglasBloqueo(bRes.data.map(dtoToReglaBloqueo));
    } else {
      setReglasBloqueo([]);
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
      const out = await runClinicalOutboxCommand('appointment.create', body, {
        allowsOfflineQueue: allowsClinicalCache,
        isPendingApproval,
      });
      if (isClinicalOutboxErr(out)) {
        setError(out.error);
        return null;
      }
      if (out.queued) {
        setError(null);
        await reload();
        // Provisional local: sin DTO de servidor; la UI se alinea al sincronizar.
        const prof = professionals.find(
          (p) => p.healthcareProfessionalId.toLowerCase() === input.professionalId.toLowerCase(),
        );
        return {
          id: out.command.id,
          sucursalId: branchId,
          patientId: input.subjectId,
          patientName: 'En cola (sin enlace)',
          doctorId: input.professionalId,
          doctorName: prof?.fullName ?? '',
          especialidad: prof?.specialtyName ?? '',
          fecha: input.fecha,
          horaInicio: input.horaInicio,
          horaFin: input.horaFin,
          estado: 'reservada',
          motivo: input.motivo,
          consultorio: '',
          roomId: input.roomId,
        };
      }
      await reload();
      const list = await listAppointments({
        branchId,
        from: start.toISOString(),
        to: end.toISOString(),
        professionalId: input.professionalId,
      });
      const created = list.data?.find((a) => a.appointmentId === out.serverEntityId);
      if (created) return dtoToAgendaAppointment(created, professionals);
      return null;
    },
    [allowsClinicalCache, branchId, isPendingApproval, professionals, reload],
  );

  const changeStatus = useCallback(
    async (appointmentId: string, uiStatus: AgendaAppointmentEstado, reason?: string) => {
      const apiState = uiStateToApi(uiStatus);
      if (!apiState) {
        setError('Ese estado de agenda aún no se persiste en el servidor.');
        return false;
      }
      const out = await runClinicalOutboxCommand(
        'appointment.state',
        {
          appointmentId,
          toState: apiState,
          reason: reason ?? null,
        },
        { allowsOfflineQueue: allowsClinicalCache, isPendingApproval },
      );
      if (isClinicalOutboxErr(out)) {
        setError(out.error);
        return false;
      }
      if (out.queued) {
        setError(null);
      }
      await reload();
      return true;
    },
    [allowsClinicalCache, isPendingApproval, reload],
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
    reglasBloqueo,
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
