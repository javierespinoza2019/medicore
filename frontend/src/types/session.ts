/** Tipos de sesión y roles — fuente compartida (sin datos mock). */

export type UserRole =
  | 'admin'
  | 'medico'
  | 'recepcion'
  | 'enfermeria'
  | 'caja'
  | 'farmacia'
  | 'laboratorio'
  | 'directivo'
  | 'trabajo_social';

export type UserStatus = 'activo' | 'inactivo' | 'bloqueado';

export interface SessionUser {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  password: string;
  telefono: string;
  rol: UserRole;
  rolLabel: string;
  sucursalIds: string[];
  sucursales: string[];
  cedulaProfesional?: string;
  especialidadId?: string;
  especialidad?: string;
  doctorId?: string;
  ultimoAcceso: string;
  status: UserStatus;
  fechaCreacion: string;
}

/** Alias histórico del prototipo. */
export type User = SessionUser;

export const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  medico: 'Médico',
  recepcion: 'Recepción',
  enfermeria: 'Enfermería',
  caja: 'Caja y Cobros',
  farmacia: 'Farmacia',
  laboratorio: 'Laboratorio',
  directivo: 'Directivo',
  trabajo_social: 'Trabajo social',
};
