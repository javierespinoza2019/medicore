/**
 * Pacientes de prueba (ficticios). Alinear con MPI / doc 08 cuando exista backend.
 */

export interface TestPatient {
  /** Etiqueta legible en reportes. */
  label: string;
  nombre?: string;
  apellidos?: string;
  curp?: string;
  /** Paciente no identificado (doc 08). */
  noIdentificado: boolean;
  /** Palabra fonética / descriptor discriminante (SC-17). */
  etiquetaProvisional?: string;
}

export const patients = {
  ambulatorio: {
    label: 'Paciente ambulatorio identificado',
    nombre: 'María',
    apellidos: 'López Hernández',
    curp: 'LOHM850101MDFPRR09',
    noIdentificado: false,
  } satisfies TestPatient,

  noIdentificado: {
    label: 'Paciente no identificado (urgencias)',
    noIdentificado: true,
    etiquetaProvisional: 'Nácar — cicatriz ceja izquierda',
  } satisfies TestPatient,

  alergicoPenicilina: {
    label: 'Paciente con alergia a penicilina (SC-01/SC-02)',
    nombre: 'Carlos',
    apellidos: 'Ruiz Domínguez',
    curp: 'RUDC900215HDFZXN01',
    noIdentificado: false,
  } satisfies TestPatient,
} as const;
