export interface Consultorio {
  id: string;
  nombre: string;
  piso: number;
  tipo: 'consulta' | 'procedimiento' | 'urgencias' | 'triage' | 'estudio';
  activo: boolean;
}

export interface Sucursal {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  telefono: string;
  email: string;
  horarioApertura: string;
  horarioCierre: string;
  diasOperacion: string[];
  activo: boolean;
  consultorios: Consultorio[];
}

export const sucursales: Sucursal[] = [
  {
    id: 'suc1',
    nombre: 'Clínica Central - CDMX',
    direccion: 'Av. Reforma 234, Col. Juárez',
    ciudad: 'Ciudad de México',
    estado: 'CDMX',
    codigoPostal: '06600',
    telefono: '55-1000-2000',
    email: 'central@medicore.mx',
    horarioApertura: '07:00',
    horarioCierre: '20:00',
    diasOperacion: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    activo: true,
    consultorios: [
      { id: 'c1', nombre: 'Consultorio 101', piso: 1, tipo: 'consulta', activo: true },
      { id: 'c2', nombre: 'Consultorio 102', piso: 1, tipo: 'consulta', activo: true },
      { id: 'c3', nombre: 'Consultorio 103', piso: 1, tipo: 'consulta', activo: true },
      { id: 'c4', nombre: 'Consultorio 104', piso: 1, tipo: 'consulta', activo: true },
      { id: 'c5', nombre: 'Consultorio 201', piso: 2, tipo: 'procedimiento', activo: true },
      { id: 'c6', nombre: 'Consultorio 202', piso: 2, tipo: 'procedimiento', activo: false },
      { id: 'c7', nombre: 'Sala de Urgencias', piso: 1, tipo: 'urgencias', activo: true },
      { id: 'c8', nombre: 'Triage', piso: 1, tipo: 'triage', activo: true },
    ],
  },
  {
    id: 'suc2',
    nombre: 'Sucursal Norte - CDMX',
    direccion: 'Calzada Vallejo 1500, Col. Industrial',
    ciudad: 'Ciudad de México',
    estado: 'CDMX',
    codigoPostal: '07700',
    telefono: '55-2000-3000',
    email: 'norte@medicore.mx',
    horarioApertura: '08:00',
    horarioCierre: '18:00',
    diasOperacion: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
    activo: true,
    consultorios: [
      { id: 'c9', nombre: 'Consultorio 101', piso: 1, tipo: 'consulta', activo: true },
      { id: 'c10', nombre: 'Consultorio 102', piso: 1, tipo: 'consulta', activo: true },
      { id: 'c11', nombre: 'Consultorio 103', piso: 1, tipo: 'consulta', activo: false },
      { id: 'c12', nombre: 'Triage', piso: 1, tipo: 'triage', activo: true },
    ],
  },
  {
    id: 'suc3',
    nombre: 'Sucursal Sur - CDMX',
    direccion: 'Av. Universidad 3200, Col. Copilco',
    ciudad: 'Ciudad de México',
    estado: 'CDMX',
    codigoPostal: '04360',
    telefono: '55-3000-4000',
    email: 'sur@medicore.mx',
    horarioApertura: '07:30',
    horarioCierre: '19:30',
    diasOperacion: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    activo: true,
    consultorios: [
      { id: 'c13', nombre: 'Consultorio 101', piso: 1, tipo: 'consulta', activo: true },
      { id: 'c14', nombre: 'Consultorio 102', piso: 1, tipo: 'consulta', activo: true },
      { id: 'c15', nombre: 'Sala de Procedimientos', piso: 1, tipo: 'procedimiento', activo: true },
    ],
  },
];