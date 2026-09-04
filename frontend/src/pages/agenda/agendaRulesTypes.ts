/** Reglas de bloqueo locales (configuración UI; sin persistencia API en Fase 1). */

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

export const reglasBloqueoIniciales: ReglaBloqueo[] = [];
