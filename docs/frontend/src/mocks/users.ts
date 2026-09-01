export type UserRole = 'admin' | 'medico' | 'recepcion' | 'enfermeria' | 'caja' | 'farmacia' | 'laboratorio' | 'directivo';
export type UserStatus = 'activo' | 'inactivo' | 'bloqueado';

export interface User {
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

export const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  medico: 'Médico',
  recepcion: 'Recepción',
  enfermeria: 'Enfermería',
  caja: 'Caja y Cobros',
  farmacia: 'Farmacia',
  laboratorio: 'Laboratorio',
  directivo: 'Directivo',
};

// Usuarios de prueba: 1 por cada rol + 2 médicos para validar especialidades
export const usuarios: User[] = [
  // ── Médico 1: Medicina General ──
  {
    id: 'u1',
    nombre: 'Alejandro',
    apellidos: 'García Mendoza',
    email: 'alejandro.garcia@medicore.mx',
    password: 'Admin123!',
    telefono: '55-1111-2222',
    rol: 'medico',
    rolLabel: 'Médico',
    sucursalIds: ['suc1', 'suc2'],
    sucursales: ['Clínica Central - CDMX', 'Sucursal Norte - CDMX'],
    cedulaProfesional: 'CED-09876543',
    especialidadId: 's1',
    especialidad: 'Medicina General',
    doctorId: 'd1',
    ultimoAcceso: '2026-08-21 09:30',
    status: 'activo',
    fechaCreacion: '2024-01-15',
  },
  // ── Médico 2: Pediatría ──
  {
    id: 'u2',
    nombre: 'Patricia',
    apellidos: 'Mendoza Ríos',
    email: 'patricia.mendoza@medicore.mx',
    password: 'Admin123!',
    telefono: '55-2222-3333',
    rol: 'medico',
    rolLabel: 'Médico',
    sucursalIds: ['suc1', 'suc2'],
    sucursales: ['Clínica Central - CDMX', 'Sucursal Norte - CDMX'],
    cedulaProfesional: 'CED-08765432',
    especialidadId: 's2',
    especialidad: 'Pediatría',
    doctorId: 'd2',
    ultimoAcceso: '2026-08-21 08:15',
    status: 'activo',
    fechaCreacion: '2024-01-15',
  },
  // ── Administrador ──
  {
    id: 'u6',
    nombre: 'Laura Elena',
    apellidos: 'Torres Pérez',
    email: 'laura.torres@medicore.mx',
    password: 'Admin123!',
    telefono: '55-6666-7777',
    rol: 'admin',
    rolLabel: 'Administrador',
    sucursalIds: ['suc1', 'suc2', 'suc3'],
    sucursales: ['Clínica Central - CDMX', 'Sucursal Norte - CDMX', 'Sucursal Sur - CDMX'],
    ultimoAcceso: '2026-08-21 09:55',
    status: 'activo',
    fechaCreacion: '2024-01-10',
  },
  // ── Recepción (una sola sucursal por defecto) ──
  {
    id: 'u8',
    nombre: 'José Luis',
    apellidos: 'Ramírez Díaz',
    email: 'jose.ramirez@medicore.mx',
    password: 'Admin123!',
    telefono: '55-8888-9999',
    rol: 'recepcion',
    rolLabel: 'Recepción',
    sucursalIds: ['suc1'],
    sucursales: ['Clínica Central - CDMX'],
    ultimoAcceso: '2026-08-21 09:00',
    status: 'activo',
    fechaCreacion: '2024-01-20',
  },
  // ── Enfermería ──
  {
    id: 'u7',
    nombre: 'Carmen Alicia',
    apellidos: 'Vargas Luna',
    email: 'carmen.vargas@medicore.mx',
    password: 'Admin123!',
    telefono: '55-7777-8888',
    rol: 'enfermeria',
    rolLabel: 'Enfermería',
    sucursalIds: ['suc1'],
    sucursales: ['Clínica Central - CDMX'],
    ultimoAcceso: '2026-08-21 08:30',
    status: 'activo',
    fechaCreacion: '2024-01-15',
  },
  // ── Caja y Cobros ──
  {
    id: 'u9',
    nombre: 'Mónica Fernanda',
    apellidos: 'Soto Rivera',
    email: 'monica.soto@medicore.mx',
    password: 'Admin123!',
    telefono: '55-9999-0000',
    rol: 'caja',
    rolLabel: 'Caja y Cobros',
    sucursalIds: ['suc1', 'suc2'],
    sucursales: ['Clínica Central - CDMX', 'Sucursal Norte - CDMX'],
    ultimoAcceso: '2026-08-21 09:45',
    status: 'activo',
    fechaCreacion: '2024-02-01',
  },
  // ── Farmacia ──
  {
    id: 'u-farm',
    nombre: 'Luis Alberto',
    apellidos: 'Hernández Cruz',
    email: 'luis.hernandez@medicore.mx',
    password: 'Admin123!',
    telefono: '55-1010-2020',
    rol: 'farmacia',
    rolLabel: 'Farmacia',
    sucursalIds: ['suc1'],
    sucursales: ['Clínica Central - CDMX'],
    ultimoAcceso: '2026-08-21 10:00',
    status: 'activo',
    fechaCreacion: '2024-03-01',
  },
  // ── Laboratorio ──
  {
    id: 'u-lab',
    nombre: 'Diana Michelle',
    apellidos: 'López Castañeda',
    email: 'diana.lopez@medicore.mx',
    password: 'Admin123!',
    telefono: '55-3030-4040',
    rol: 'laboratorio',
    rolLabel: 'Laboratorio',
    sucursalIds: ['suc1', 'suc2'],
    sucursales: ['Clínica Central - CDMX', 'Sucursal Norte - CDMX'],
    ultimoAcceso: '2026-08-21 07:30',
    status: 'activo',
    fechaCreacion: '2024-03-15',
  },
  // ── Directivo ──
  {
    id: 'u12',
    nombre: 'Omar Alberto',
    apellidos: 'Flores Medina',
    email: 'omar.flores@medicore.mx',
    password: 'Admin123!',
    telefono: '55-2222-0000',
    rol: 'directivo',
    rolLabel: 'Directivo',
    sucursalIds: ['suc1', 'suc2', 'suc3'],
    sucursales: ['Clínica Central - CDMX', 'Sucursal Norte - CDMX', 'Sucursal Sur - CDMX'],
    ultimoAcceso: '2026-08-20 17:00',
    status: 'activo',
    fechaCreacion: '2024-01-01',
  },
  // ── Recepción Sucursal Norte ──
  {
    id: 'u-r2',
    nombre: 'Verónica',
    apellidos: 'Salinas Castro',
    email: 'veronica.salinas@medicore.mx',
    password: 'Admin123!',
    telefono: '55-5050-1010',
    rol: 'recepcion',
    rolLabel: 'Recepción',
    sucursalIds: ['suc2'],
    sucursales: ['Sucursal Norte - CDMX'],
    ultimoAcceso: '2026-08-21 08:20',
    status: 'activo',
    fechaCreacion: '2024-02-15',
  },
  // ── Enfermería Sucursal Norte ──
  {
    id: 'u-e2',
    nombre: 'Rocío',
    apellidos: 'Bautista León',
    email: 'rocio.bautista@medicore.mx',
    password: 'Admin123!',
    telefono: '55-5151-1212',
    rol: 'enfermeria',
    rolLabel: 'Enfermería',
    sucursalIds: ['suc2'],
    sucursales: ['Sucursal Norte - CDMX'],
    ultimoAcceso: '2026-08-21 07:45',
    status: 'activo',
    fechaCreacion: '2024-02-15',
  },
  // ── Recepción Sucursal Sur ──
  {
    id: 'u-r3',
    nombre: 'Enrique',
    apellidos: 'Padilla Mora',
    email: 'enrique.padilla@medicore.mx',
    password: 'Admin123!',
    telefono: '55-5252-1313',
    rol: 'recepcion',
    rolLabel: 'Recepción',
    sucursalIds: ['suc3'],
    sucursales: ['Sucursal Sur - CDMX'],
    ultimoAcceso: '2026-08-21 08:00',
    status: 'activo',
    fechaCreacion: '2024-03-01',
  },
  // ── Enfermería Sucursal Sur ──
  {
    id: 'u-e3',
    nombre: 'Susana',
    apellidos: 'Reyes Campos',
    email: 'susana.reyes@medicore.mx',
    password: 'Admin123!',
    telefono: '55-5353-1414',
    rol: 'enfermeria',
    rolLabel: 'Enfermería',
    sucursalIds: ['suc3'],
    sucursales: ['Sucursal Sur - CDMX'],
    ultimoAcceso: '2026-08-21 07:30',
    status: 'activo',
    fechaCreacion: '2024-03-01',
  },
  // ── Caja Sucursal Sur ──
  {
    id: 'u-c3',
    nombre: 'Alejandra',
    apellidos: 'Vega Núñez',
    email: 'alejandra.vega@medicore.mx',
    password: 'Admin123!',
    telefono: '55-5454-1515',
    rol: 'caja',
    rolLabel: 'Caja y Cobros',
    sucursalIds: ['suc3'],
    sucursales: ['Sucursal Sur - CDMX'],
    ultimoAcceso: '2026-08-21 09:10',
    status: 'activo',
    fechaCreacion: '2024-03-10',
  },
];