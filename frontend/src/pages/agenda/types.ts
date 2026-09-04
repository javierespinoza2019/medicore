/** Modelo de cita para la UI de agenda (calendario rico). */

export type AgendaAppointmentEstado =
  | 'disponible'
  | 'reservada'
  | 'confirmada'
  | 'llego'
  | 'en_espera'
  | 'en_triage'
  | 'llamando'
  | 'en_consulta'
  | 'atendida'
  | 'cancelada'
  | 'no_acudio';

export interface AgendaAppointment {
  id: string;
  sucursalId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  especialidad: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: AgendaAppointmentEstado;
  motivo: string;
  consultorio: string;
  roomId: string | null;
  horaLlegada?: string;
  llamadoAt?: number;
}

export const statusConfig: Record<
  AgendaAppointmentEstado,
  {
    label: string;
    variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
    borderColor: string;
    bgColor: string;
    textColor: string;
  }
> = {
  disponible: {
    label: 'Disponible',
    variant: 'secondary',
    borderColor: 'border-l-secondary-300',
    bgColor: 'bg-secondary-50/70',
    textColor: 'text-secondary-600',
  },
  reservada: {
    label: 'Reservada',
    variant: 'primary',
    borderColor: 'border-l-primary-400',
    bgColor: 'bg-primary-50/70',
    textColor: 'text-primary-700',
  },
  confirmada: {
    label: 'Confirmada',
    variant: 'info',
    borderColor: 'border-l-sky-400',
    bgColor: 'bg-sky-50/70',
    textColor: 'text-sky-700',
  },
  llego: {
    label: 'Llegó',
    variant: 'success',
    borderColor: 'border-l-emerald-400',
    bgColor: 'bg-emerald-50/70',
    textColor: 'text-emerald-700',
  },
  en_espera: {
    label: 'En espera',
    variant: 'warning',
    borderColor: 'border-l-amber-400',
    bgColor: 'bg-amber-50/70',
    textColor: 'text-amber-700',
  },
  en_triage: {
    label: 'En triage',
    variant: 'info',
    borderColor: 'border-l-sky-400',
    bgColor: 'bg-sky-50/70',
    textColor: 'text-sky-700',
  },
  llamando: {
    label: 'Llamando',
    variant: 'accent',
    borderColor: 'border-l-accent-500',
    bgColor: 'bg-accent-50/70',
    textColor: 'text-accent-700',
  },
  en_consulta: {
    label: 'En consulta',
    variant: 'accent',
    borderColor: 'border-l-accent-400',
    bgColor: 'bg-accent-50/70',
    textColor: 'text-accent-700',
  },
  atendida: {
    label: 'Atendida',
    variant: 'secondary',
    borderColor: 'border-l-secondary-300',
    bgColor: 'bg-secondary-50/50',
    textColor: 'text-secondary-500',
  },
  cancelada: {
    label: 'Cancelada',
    variant: 'danger',
    borderColor: 'border-l-red-400',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-500',
  },
  no_acudio: {
    label: 'No acudió',
    variant: 'danger',
    borderColor: 'border-l-red-500',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-500',
  },
};

/** Alias histórico del prototipo. */
export type Appointment = AgendaAppointment;
