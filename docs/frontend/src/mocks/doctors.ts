export interface Doctor {
  id: string;
  nombre: string;
  especialidad: string;
  cedula: string;
  email: string;
  telefono: string;
  consultorio: string;
  color: string;
  avatar?: string;
  status: 'activo' | 'inactivo' | 'vacaciones';
}

export const doctors: Doctor[] = [
  {
    id: 'd1',
    nombre: 'Dr. Alejandro García Mendoza',
    especialidad: 'Medicina General',
    cedula: 'CED-09876543',
    email: 'alejandro.garcia@medicore.mx',
    telefono: '55-1111-2222',
    consultorio: 'Consultorio 101',
    color: 'primary',
    status: 'activo',
  },
  {
    id: 'd2',
    nombre: 'Dra. Patricia Mendoza Ríos',
    especialidad: 'Pediatría',
    cedula: 'CED-08765432',
    email: 'patricia.mendoza@medicore.mx',
    telefono: '55-2222-3333',
    consultorio: 'Consultorio 102',
    color: 'accent',
    status: 'activo',
  },
  {
    id: 'd3',
    nombre: 'Dr. Ricardo Olvera Campos',
    especialidad: 'Nutrición',
    cedula: 'CED-07654321',
    email: 'ricardo.olvera@medicore.mx',
    telefono: '55-3333-4444',
    consultorio: 'Consultorio 103',
    color: 'emerald',
    status: 'activo',
  },
  {
    id: 'd4',
    nombre: 'Dra. Gabriela Herrera López',
    especialidad: 'Ginecología',
    cedula: 'CED-06543210',
    email: 'gabriela.herrera@medicore.mx',
    telefono: '55-4444-5555',
    consultorio: 'Consultorio 201',
    color: 'amber',
    status: 'activo',
  },
  {
    id: 'd5',
    nombre: 'Dr. Fernando Castillo Vega',
    especialidad: 'Medicina General',
    cedula: 'CED-05432109',
    email: 'fernando.castillo@medicore.mx',
    telefono: '55-5555-6666',
    consultorio: 'Consultorio 104',
    color: 'primary',
    status: 'activo',
  },
  {
    id: 'd14',
    nombre: 'Dr. Eduardo Ponce León',
    especialidad: 'Dermatología',
    cedula: 'CED-01234567',
    email: 'eduardo.ponce@medicore.mx',
    telefono: '55-7777-8888',
    consultorio: 'Consultorio 202',
    color: 'violet',
    status: 'activo',
  },
];

export interface Speciality {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
}

export const specialties: Speciality[] = [
  { id: 's1', nombre: 'Medicina General', descripcion: 'Atención primaria integral', icono: 'ri-stethoscope-line', color: 'primary' },
  { id: 's2', nombre: 'Pediatría', descripcion: 'Atención infantil y adolescente', icono: 'ri-emotion-happy-line', color: 'accent' },
  { id: 's3', nombre: 'Nutrición', descripcion: 'Planes nutricionales personalizados', icono: 'ri-heart-pulse-line', color: 'emerald' },
  { id: 's4', nombre: 'Odontología', descripcion: 'Salud bucal integral', icono: 'ri-tooth-line', color: 'amber' },
  { id: 's5', nombre: 'Dermatología', descripcion: 'Cuidado de la piel', icono: 'ri-sun-line', color: 'violet' },
  { id: 's6', nombre: 'Ginecología', descripcion: 'Salud femenina', icono: 'ri-women-line', color: 'rose' },
];