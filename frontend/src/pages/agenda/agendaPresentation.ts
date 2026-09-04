import type { AppointmentDto, AppointmentState, ConsultingRoomDto } from '@/api/appointments';
import type { ProfessionalDto } from '@/api/professionals';
import type { AgendaAppointment, AgendaAppointmentEstado } from '@/pages/agenda/types';
import type { AgendaConsultorio } from '@/pages/agenda/consultorioTypes';

function localDateFromUtc(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function localTimeFromUtc(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function apiStateToUi(state: string): AgendaAppointmentEstado {
  switch (state) {
    case 'agendada':
      return 'reservada';
    case 'confirmada':
      return 'confirmada';
    case 'llego':
      return 'llego';
    case 'en_espera':
      return 'en_espera';
    case 'en_consulta':
      return 'en_consulta';
    case 'atendida':
      return 'atendida';
    case 'no_asistio':
      return 'no_acudio';
    case 'cancelada':
      return 'cancelada';
    default:
      return 'reservada';
  }
}

export function uiStateToApi(state: AgendaAppointmentEstado): AppointmentState | null {
  switch (state) {
    case 'reservada':
      return 'agendada';
    case 'confirmada':
      return 'confirmada';
    case 'llego':
      return 'llego';
    case 'en_espera':
      return 'en_espera';
    case 'en_consulta':
      return 'en_consulta';
    case 'atendida':
      return 'atendida';
    case 'no_acudio':
      return 'no_asistio';
    case 'cancelada':
      return 'cancelada';
    default:
      // en_triage / llamando / disponible: aún sin contrato API.
      return null;
  }
}

export function dtoToAgendaAppointment(
  dto: AppointmentDto,
  professionals: ProfessionalDto[],
): AgendaAppointment {
  const prof = professionals.find(
    (p) => p.healthcareProfessionalId.toLowerCase() === dto.professionalId.toLowerCase(),
  );
  return {
    id: dto.appointmentId,
    sucursalId: dto.branchId,
    patientId: dto.subjectId,
    patientName: dto.subjectDisplayLabel,
    doctorId: dto.professionalId,
    doctorName: dto.professionalFullName ?? prof?.fullName ?? dto.professionalId,
    especialidad: prof?.specialtyName ?? '',
    fecha: localDateFromUtc(dto.scheduledStartUtc),
    horaInicio: localTimeFromUtc(dto.scheduledStartUtc),
    horaFin: localTimeFromUtc(dto.scheduledEndUtc),
    estado: apiStateToUi(dto.state),
    motivo: dto.notes ?? '',
    consultorio: dto.roomName ?? dto.roomCode ?? '',
    roomId: dto.roomId,
  };
}

export function roomToConsultorio(room: ConsultingRoomDto): AgendaConsultorio {
  return {
    id: room.roomId,
    nombre: room.name,
    ubicacion: room.code,
    especialidadId: room.specialtyId ?? '',
    medicosIds: room.professionalIds ?? [],
    activo: room.isActive,
  };
}
