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

// La fecha base coincide con los datos de ejemplo de la agenda (2026-08-20)
export const reglasBloqueo: ReglaBloqueo[] = [
  {
    id: 'reg-1',
    tipo: 'rango',
    nombre: 'Mantenimiento de limpieza',
    fecha: '2026-08-20',
    horaInicio: '12:00',
    horaFin: '13:00',
    activo: true,
  },
  {
    id: 'reg-2',
    tipo: 'dia',
    nombre: 'Feriado — clínica cerrada',
    fecha: '2026-08-23',
    activo: true,
  },
  {
    id: 'reg-3',
    tipo: 'medico',
    nombre: 'Congreso médico — Dr. Olvera',
    fecha: '2026-08-20',
    doctorId: 'd3',
    activo: false,
  },
  {
    id: 'reg-4',
    tipo: 'especialidad',
    nombre: 'Cierre técnico — Odontología',
    fecha: '2026-08-20',
    especialidadId: 's4',
    activo: false,
  },
];