export interface Consultorio {
  id: string;
  nombre: string;
  ubicacion: string;
  especialidadId: string;
  medicosIds: string[];
  activo: boolean;
}

export const consultorios: Consultorio[] = [
  { id: 'c101', nombre: 'Consultorio 101', ubicacion: 'Piso 1', especialidadId: 's1', medicosIds: ['d1'], activo: true },
  { id: 'c102', nombre: 'Consultorio 102', ubicacion: 'Piso 1', especialidadId: 's2', medicosIds: ['d2'], activo: true },
  { id: 'c103', nombre: 'Consultorio 103', ubicacion: 'Piso 1', especialidadId: 's3', medicosIds: ['d3'], activo: true },
  { id: 'c104', nombre: 'Consultorio 104', ubicacion: 'Piso 1', especialidadId: 's1', medicosIds: ['d5'], activo: true },
  { id: 'c201', nombre: 'Consultorio 201', ubicacion: 'Piso 2', especialidadId: 's6', medicosIds: ['d4'], activo: true },
  { id: 'c202', nombre: 'Consultorio 202', ubicacion: 'Piso 2', especialidadId: 's5', medicosIds: ['d14'], activo: true },
];