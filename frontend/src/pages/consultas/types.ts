/**
 * Tipos de UI del módulo consultas (sin datos mock).
 * Persistencia = notes / prescriptions / encounters API.
 */

export type Pronostico = 'bueno' | 'reservado' | 'malo';

export type MedicamentoPrescrito = {
  id: string;
  medicamentoId: string;
  nombre: string;
  presentacion: string;
  concentracion: string;
  dosis: string;
  frecuencia: string;
  via: string;
  duracion: string;
  indicaciones: string;
};

/** Vista de receta para listados/impresión; origen: PrescriptionDto. */
export type RecetaView = {
  id: string;
  patientId: string;
  patientName: string;
  patientExpediente: string;
  doctorId: string;
  doctorName: string;
  doctorCedula: string;
  consultaId: string;
  urgenciaId?: string;
  fecha: string;
  hora: string;
  medicamentos: MedicamentoPrescrito[];
  indicacionesGenerales: string;
  estado: 'activa' | 'surtida' | 'parcial' | 'vencida' | 'cancelada';
  diagnosticoRelacionado: string;
};

export type ResultadoEstudioEvolucion = {
  id: string;
  nombre: string;
  resultado: string;
  fecha: string;
};

export type SignosVitalesEvolucion = {
  temperatura: string;
  presionSistolica: string;
  presionDiastolica: string;
  frecuenciaCardiaca: string;
  frecuenciaRespiratoria: string;
  saturacionOxigeno: string;
  peso: string;
  talla: string;
  glucosa: string;
};

/** Borrador local de evolución (impresión legacy); captura clínica vía ClinicalNotesPanel. */
export type NotaEvolucion = {
  id: string;
  consultaId: string;
  patientId: string;
  fecha: string;
  hora: string;
  medico: string;
  medicoCedula: string;
  signosVitales: SignosVitalesEvolucion;
  evolucionSubjetiva: string;
  evolucionObjetiva: string;
  resultadosEstudios: ResultadoEstudioEvolucion[];
  diagnosticoPrincipal: string;
  diagnosticosSecundarios: string[];
  tratamientoIndicaciones: string;
  /** null = no capturado (sin preselección). */
  pronostico: Pronostico | null;
  observaciones: string;
};

export function emptyNotaEvolucion(
  consultaId: string,
  patientId: string,
  medico: string,
  medicoCedula: string,
): NotaEvolucion {
  const now = new Date();
  return {
    id: `ne-draft-${consultaId}`,
    consultaId,
    patientId,
    fecha: now.toISOString().slice(0, 10),
    hora: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    medico,
    medicoCedula,
    signosVitales: {
      temperatura: '',
      presionSistolica: '',
      presionDiastolica: '',
      frecuenciaCardiaca: '',
      frecuenciaRespiratoria: '',
      saturacionOxigeno: '',
      peso: '',
      talla: '',
      glucosa: '',
    },
    evolucionSubjetiva: '',
    evolucionObjetiva: '',
    resultadosEstudios: [],
    diagnosticoPrincipal: '',
    diagnosticosSecundarios: [],
    tratamientoIndicaciones: '',
    pronostico: null,
    observaciones: '',
  };
}
