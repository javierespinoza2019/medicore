/** Consultorio de agenda — mapeado desde `ConsultingRoomDto` (API M9). */

export interface AgendaConsultorio {
  id: string;
  nombre: string;
  ubicacion: string;
  /** Especialidad del consultorio (opcional). */
  especialidadId: string;
  /** Profesionales asignados al consultorio. */
  medicosIds: string[];
  activo: boolean;
}

export type Consultorio = AgendaConsultorio;
