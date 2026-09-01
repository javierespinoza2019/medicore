export interface TriageRecord {
  id: string;
  patientId: string;
  fecha: string;
  hora: string;
  peso: number;
  talla: number;
  imc: number;
  temperatura: number;
  presionSistolica: number;
  presionDiastolica: number;
  frecuenciaCardiaca: number;
  frecuenciaRespiratoria: number;
  saturacionOxigeno: number;
  glucosa: number | null;
  dolor: number;
  notas: string;
  realizadoPor: string;
  nivelUrgencia: 'verde' | 'amarillo' | 'naranja' | 'rojo';
}

export interface TriagePatient {
  id: string;
  nombre: string;
  apellidos: string;
  edad: number;
  genero: 'M' | 'F';
  expediente: string;
  motivo: string;
  estado: 'espera' | 'en_triage' | 'completado' | 'derivado';
  horaRegistro: string;
  ultimoTriage: TriageRecord | null;
  historialTriage: TriageRecord[];
}

const triageMF: TriageRecord = {
  id: 'tri-mf-001',
  patientId: 'p1',
  fecha: '2026-08-20',
  hora: '09:22',
  peso: 68,
  talla: 1.62,
  imc: 25.9,
  temperatura: 36.5,
  presionSistolica: 148,
  presionDiastolica: 92,
  frecuenciaCardiaca: 88,
  frecuenciaRespiratoria: 18,
  saturacionOxigeno: 97,
  glucosa: 105,
  dolor: 1,
  notas: 'Paciente refiere cefalea ocasional y leve mareo matutino. Refiere haber suspendido Losartán por 3 días por olvido. Niega otros síntomas. Se orienta sobre adherencia terapéutica.',
  realizadoPor: 'Lic. Carmen Vargas Ortega',
  nivelUrgencia: 'verde',
};

const triageCE: TriageRecord = {
  id: 'tri-ce-001',
  patientId: 'p2',
  fecha: '2026-08-20',
  hora: '10:05',
  peso: 78,
  talla: 1.75,
  imc: 25.5,
  temperatura: 36.8,
  presionSistolica: 125,
  presionDiastolica: 82,
  frecuenciaCardiaca: 72,
  frecuenciaRespiratoria: 16,
  saturacionOxigeno: 98,
  glucosa: null,
  dolor: 6,
  notas: 'Paciente masculino de 33 años refiere dolor lumbar de 2 semanas de evolución, intensidad 6/10 (EVA), sin irradiación a miembros inferiores. No antecedente traumático. Refiere pasar largas horas sentado por trabajo de oficina. Niega fiebre, pérdida de peso, incontinencia o déficit neurológico. Signos vitales dentro de parámetros normales.',
  realizadoPor: 'Lic. Carmen Vargas Ortega',
  nivelUrgencia: 'verde',
};

const triageAR: TriageRecord = {
  id: 'tri-af-001',
  patientId: 'p12',
  fecha: '2026-08-20',
  hora: '14:20',
  peso: 72,
  talla: 1.60,
  imc: 28.1,
  temperatura: 36.4,
  presionSistolica: 132,
  presionDiastolica: 86,
  frecuenciaCardiaca: 80,
  frecuenciaRespiratoria: 17,
  saturacionOxigeno: 97,
  glucosa: 110,
  dolor: 5,
  notas: 'Paciente refiere dolor e inflamación persistente en ambas rodillas que limita la marcha. Sin fiebre. Refiere haber suspendido ejercicios de fisioterapia por 1 semana.',
  realizadoPor: 'Lic. Carmen Vargas Ortega',
  nivelUrgencia: 'verde',
};

export const triagePacientes: TriagePatient[] = [
  {
    id: 'p1',
    nombre: 'María Fernanda',
    apellidos: 'López Hernández',
    edad: 38,
    genero: 'F',
    expediente: 'EXP-2024-0001',
    motivo: 'Consulta de control de hipertensión',
    estado: 'completado',
    horaRegistro: '09:15',
    ultimoTriage: triageMF,
    historialTriage: [triageMF],
  },
  {
    id: 'p2',
    nombre: 'Carlos Eduardo',
    apellidos: 'Martínez Ruiz',
    edad: 33,
    genero: 'M',
    expediente: 'EXP-2024-0002',
    motivo: 'Valoración por dolor lumbar',
    estado: 'completado',
    horaRegistro: '10:00',
    ultimoTriage: triageCE,
    historialTriage: [triageCE],
  },
  {
    id: 'p3',
    nombre: 'Ana Gabriela',
    apellidos: 'Sánchez Torres',
    edad: 28,
    genero: 'F',
    expediente: 'EXP-2024-0003',
    motivo: 'Fatiga persistente de 3 semanas',
    estado: 'completado',
    horaRegistro: '13:10',
    ultimoTriage: {
      id: 'tri-ag-001',
      patientId: 'p3',
      fecha: '2026-08-20',
      hora: '13:15',
      peso: 55,
      talla: 1.58,
      imc: 22.0,
      temperatura: 37.1,
      presionSistolica: 112,
      presionDiastolica: 74,
      frecuenciaCardiaca: 76,
      frecuenciaRespiratoria: 16,
      saturacionOxigeno: 99,
      glucosa: 88,
      dolor: 2,
      notas: 'Paciente refiere fatiga persistente de 3 semanas, sin fiebre ni pérdida de peso. Signos vitales estables.',
      realizadoPor: 'Lic. Carmen Vargas Ortega',
      nivelUrgencia: 'verde',
    },
    historialTriage: [
      {
        id: 'tri-ag-001',
        patientId: 'p3',
        fecha: '2026-08-20',
        hora: '13:15',
        peso: 55,
        talla: 1.58,
        imc: 22.0,
        temperatura: 37.1,
        presionSistolica: 112,
        presionDiastolica: 74,
        frecuenciaCardiaca: 76,
        frecuenciaRespiratoria: 16,
        saturacionOxigeno: 99,
        glucosa: 88,
        dolor: 2,
        notas: 'Paciente refiere fatiga persistente de 3 semanas, sin fiebre ni pérdida de peso. Signos vitales estables.',
        realizadoPor: 'Lic. Carmen Vargas Ortega',
        nivelUrgencia: 'verde',
      },
    ],
  },
  {
    id: 'p4',
    nombre: 'Roberto',
    apellidos: 'Jiménez Vega',
    edad: 45,
    genero: 'M',
    expediente: 'EXP-2024-0004',
    motivo: 'Dolor torácico leve - evaluar origen',
    estado: 'completado',
    horaRegistro: '13:35',
    ultimoTriage: {
      id: 'tri-rj-001',
      patientId: 'p4',
      fecha: '2026-08-20',
      hora: '13:40',
      peso: 82,
      talla: 1.78,
      imc: 25.9,
      temperatura: 36.7,
      presionSistolica: 138,
      presionDiastolica: 88,
      frecuenciaCardiaca: 82,
      frecuenciaRespiratoria: 17,
      saturacionOxigeno: 97,
      glucosa: 102,
      dolor: 4,
      notas: 'Paciente refiere dolor torácico leve no irradiado, de características no anginosas. Alerta cardíaca previa.',
      realizadoPor: 'Lic. Carmen Vargas Ortega',
      nivelUrgencia: 'amarillo',
    },
    historialTriage: [
      {
        id: 'tri-rj-001',
        patientId: 'p4',
        fecha: '2026-08-20',
        hora: '13:40',
        peso: 82,
        talla: 1.78,
        imc: 25.9,
        temperatura: 36.7,
        presionSistolica: 138,
        presionDiastolica: 88,
        frecuenciaCardiaca: 82,
        frecuenciaRespiratoria: 17,
        saturacionOxigeno: 97,
        glucosa: 102,
        dolor: 4,
        notas: 'Paciente refiere dolor torácico leve no irradiado, de características no anginosas. Alerta cardíaca previa.',
        realizadoPor: 'Lic. Carmen Vargas Ortega',
        nivelUrgencia: 'amarillo',
      },
    ],
  },
  {
    id: 'p5',
    nombre: 'Jorge Alberto',
    apellidos: 'Ramírez Duarte',
    edad: 55,
    genero: 'M',
    expediente: 'EXP-2024-0005',
    motivo: 'Descontrol glucémico y mareo',
    estado: 'espera',
    horaRegistro: '10:40',
    ultimoTriage: null,
    historialTriage: [],
  },
  {
    id: 'p6',
    nombre: 'Lucía Valentina',
    apellidos: 'Rojas Meza',
    edad: 7,
    genero: 'F',
    expediente: 'EXP-2024-0006',
    motivo: 'Crisis asmática leve, sibilancias',
    estado: 'en_triage',
    horaRegistro: '10:50',
    ultimoTriage: null,
    historialTriage: [],
  },
  {
    id: 'p7',
    nombre: 'Ramón Arturo',
    apellidos: 'Gutiérrez Salinas',
    edad: 71,
    genero: 'M',
    expediente: 'EXP-2024-0007',
    motivo: 'Disnea progresiva por EPOC',
    estado: 'espera',
    horaRegistro: '11:00',
    ultimoTriage: null,
    historialTriage: [],
  },
  {
    id: 'p8',
    nombre: 'Valeria Fernanda',
    apellidos: 'Castillo Núñez',
    edad: 28,
    genero: 'F',
    expediente: 'EXP-2024-0008',
    motivo: 'Control prenatal de rutina',
    estado: 'completado',
    horaRegistro: '09:45',
    ultimoTriage: null,
    historialTriage: [],
  },
  {
    id: 'p9',
    nombre: 'Miguel Ángel',
    apellidos: 'Contreras Peña',
    edad: 61,
    genero: 'M',
    expediente: 'EXP-2024-0009',
    motivo: 'Dolor precordial de esfuerzo',
    estado: 'derivado',
    horaRegistro: '11:10',
    ultimoTriage: null,
    historialTriage: [],
  },
  {
    id: 'p10',
    nombre: 'Sofía Renata',
    apellidos: 'Delgado Márquez',
    edad: 34,
    genero: 'F',
    expediente: 'EXP-2024-0010',
    motivo: 'Brote de dermatitis con prurito intenso',
    estado: 'en_triage',
    horaRegistro: '11:20',
    ultimoTriage: null,
    historialTriage: [],
  },
  {
    id: 'p11',
    nombre: 'Daniel Alejandro',
    apellidos: 'Cruz Santana',
    edad: 41,
    genero: 'M',
    expediente: 'EXP-2024-0011',
    motivo: 'Crisis de ansiedad con palpitaciones',
    estado: 'espera',
    horaRegistro: '11:30',
    ultimoTriage: null,
    historialTriage: [],
  },
  {
    id: 'p12',
    nombre: 'Adriana Lucía',
    apellidos: 'Fuentes Robles',
    edad: 47,
    genero: 'F',
    expediente: 'EXP-2024-0012',
    motivo: 'Dolor e inflamación en rodillas',
    estado: 'completado',
    horaRegistro: '14:10',
    ultimoTriage: triageAR,
    historialTriage: [triageAR],
  },
  {
    id: 'p13',
    nombre: 'Enrique Gabriel',
    apellidos: 'Paredes Ochoa',
    edad: 50,
    genero: 'M',
    expediente: 'EXP-2024-0013',
    motivo: 'Pirosis y reflujo frecuente',
    estado: 'espera',
    horaRegistro: '11:40',
    ultimoTriage: null,
    historialTriage: [],
  },
  {
    id: 'p14',
    nombre: 'Beatriz Elena',
    apellidos: 'Villanueva Mora',
    edad: 66,
    genero: 'F',
    expediente: 'EXP-2024-0014',
    motivo: 'Malestar general post-diálisis',
    estado: 'en_triage',
    horaRegistro: '11:50',
    ultimoTriage: null,
    historialTriage: [],
  },
  {
    id: 'p15',
    nombre: 'Guillermo Israel',
    apellidos: 'Mendoza Rocha',
    edad: 44,
    genero: 'M',
    expediente: 'EXP-2024-0015',
    motivo: 'Fatiga y aumento de peso',
    estado: 'espera',
    horaRegistro: '12:00',
    ultimoTriage: null,
    historialTriage: [],
  },
  {
    id: 'p16',
    nombre: 'Regina Carolina',
    apellidos: 'Aguilar Soto',
    edad: 58,
    genero: 'F',
    expediente: 'EXP-2024-0016',
    motivo: 'Migraña intensa con fotofobia',
    estado: 'en_triage',
    horaRegistro: '12:10',
    ultimoTriage: null,
    historialTriage: [],
  },
  {
    id: 'p17',
    nombre: 'Martín Eduardo',
    apellidos: 'Salazar Luna',
    edad: 39,
    genero: 'M',
    expediente: 'EXP-2024-0017',
    motivo: 'Esguince de tobillo tras caída',
    estado: 'espera',
    horaRegistro: '12:20',
    ultimoTriage: null,
    historialTriage: [],
  },
];

export interface VitalRange {
  min: number;
  max: number;
  unit: string;
  label: string;
}

export const vitalRanges: Record<string, { normal: VitalRange; warning: VitalRange; critical: VitalRange }> = {
  temperatura: {
    normal: { min: 36.0, max: 37.5, unit: '°C', label: 'Normal' },
    warning: { min: 35.5, max: 38.5, unit: '°C', label: 'Alterada' },
    critical: { min: 34.0, max: 42.0, unit: '°C', label: 'Crítica' },
  },
  frecuenciaCardiaca: {
    normal: { min: 60, max: 100, unit: 'lpm', label: 'Normal' },
    warning: { min: 50, max: 120, unit: 'lpm', label: 'Alterada' },
    critical: { min: 30, max: 200, unit: 'lpm', label: 'Crítica' },
  },
  frecuenciaRespiratoria: {
    normal: { min: 12, max: 20, unit: 'rpm', label: 'Normal' },
    warning: { min: 10, max: 28, unit: 'rpm', label: 'Alterada' },
    critical: { min: 6, max: 40, unit: 'rpm', label: 'Crítica' },
  },
  saturacionOxigeno: {
    normal: { min: 95, max: 100, unit: '%', label: 'Normal' },
    warning: { min: 90, max: 94, unit: '%', label: 'Baja' },
    critical: { min: 70, max: 89, unit: '%', label: 'Crítica' },
  },
  presionSistolica: {
    normal: { min: 90, max: 139, unit: 'mmHg', label: 'Normal' },
    warning: { min: 80, max: 159, unit: 'mmHg', label: 'Alterada' },
    critical: { min: 60, max: 200, unit: 'mmHg', label: 'Crítica' },
  },
  presionDiastolica: {
    normal: { min: 60, max: 89, unit: 'mmHg', label: 'Normal' },
    warning: { min: 50, max: 99, unit: 'mmHg', label: 'Alterada' },
    critical: { min: 30, max: 120, unit: 'mmHg', label: 'Crítica' },
  },
  glucosa: {
    normal: { min: 70, max: 110, unit: 'mg/dL', label: 'Normal' },
    warning: { min: 50, max: 180, unit: 'mg/dL', label: 'Alterada' },
    critical: { min: 30, max: 400, unit: 'mg/dL', label: 'Crítica' },
  },
  imc: {
    normal: { min: 18.5, max: 24.9, unit: 'kg/m²', label: 'Normal' },
    warning: { min: 17, max: 29.9, unit: 'kg/m²', label: 'Alterado' },
    critical: { min: 14, max: 40, unit: 'kg/m²', label: 'Crítico' },
  },
};

export type VitalStatus = 'normal' | 'warning' | 'critical';

export const getTriageRecordById = (recordId: string): TriageRecord | undefined => {
  for (const p of triagePacientes) {
    const found = p.historialTriage.find((t) => t.id === recordId);
    if (found) return found;
  }
  return undefined;
};

export const getTriagePatientById = (patientId: string): TriagePatient | undefined =>
  triagePacientes.find((p) => p.id === patientId);