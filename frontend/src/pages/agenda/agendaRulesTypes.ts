/** Reglas de bloqueo de agenda (UI + API ScheduleBlock). */

export type ReglaBloqueoTipo = 'rango' | 'dia' | 'medico' | 'especialidad';

export interface ReglaBloqueo {
  id: string;
  tipo: ReglaBloqueoTipo;
  nombre: string;
  fecha: string;
  horaInicio?: string;
  horaFin?: string;
  doctorId?: string;
  especialidadId?: string;
  activo: boolean;
}
