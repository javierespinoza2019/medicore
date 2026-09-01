export type EstadoHabitual = 'negado' | 'presente' | 'ex';

export interface AntecedenteHeredofamiliar {
  id: string;
  parentesco: string;
  condiciones: string[];
  detalle: string;
}

export interface AntecedentesNoPatologicos {
  tabaquismo: EstadoHabitual;
  tabaquismoDetalle: string;
  alcoholismo: 'negado' | 'ocasional' | 'frecuente';
  alcoholismoDetalle: string;
  toxicomanias: 'negado' | 'presente';
  toxicomaniasDetalle: string;
  alimentacion: string;
  actividadFisica: 'sedentario' | 'leve' | 'moderado' | 'intenso';
  horasSueno: string;
  vivienda: string;
  inmunizaciones: 'completo' | 'incompleto' | 'desconocido';
  ocupacion: string;
  riesgoLaboral: string;
}

export interface AntecedentePatologico {
  id: string;
  tipo: string;
  descripcion: string;
  anio: string;
}

export interface AntecedentesGinecoObstetricos {
  menarca: string;
  ritmo: string;
  fum: string;
  gestas: string;
  partos: string;
  abortos: string;
  cesareas: string;
  metodoAnticonceptivo: string;
  ultimoPapanicolau: string;
  mastografia: string;
}

export interface InterrogatorioSistema {
  id: string;
  sistema: string;
  estado: 'normal' | 'anormal';
  detalle: string;
}

export interface HistoriaClinica {
  id: string;
  patientId: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  creadoPor: string;
  ahf: AntecedenteHeredofamiliar[];
  apnp: AntecedentesNoPatologicos;
  app: AntecedentePatologico[];
  ago: AntecedentesGinecoObstetricos | null;
  interrogatorio: InterrogatorioSistema[];
  observaciones: string;
}

export const condicionesHeredofamiliares = [
  'Diabetes mellitus',
  'Hipertensión arterial',
  'Cardiopatía / IAM',
  'Cáncer',
  'Enfermedad tiroidea',
  'Enfermedad mental',
  'Asma / alergias',
  'Nefropatía',
  'Obesidad',
  'Otras',
];

export const parentescosHeredofamiliares = [
  'Padre',
  'Madre',
  'Hermanos',
  'Abuelos paternos',
  'Abuelos maternos',
  'Tíos',
];

export const tiposAntecedentePatologico = [
  'Crónico-degenerativo',
  'Quirúrgico',
  'Traumático',
  'Transfusional',
  'Hospitalización',
  'Infeccioso',
  'Alérgico',
  'Otro',
];

export const sistemasInterrogatorio = [
  'General',
  'Cardiovascular',
  'Respiratorio',
  'Digestivo',
  'Genitourinario',
  'Neurológico',
  'Músculo-esquelético',
  'Piel y anexos',
  'Endocrino',
  'Psiquiátrico',
];

export const historiaClinicaData: HistoriaClinica[] = [
  {
    id: 'hc-p1',
    patientId: 'p1',
    fechaCreacion: '2026-08-20',
    fechaActualizacion: '2026-08-20',
    creadoPor: 'Dr. Alejandro García Mendoza',
    ahf: [
      { id: 'ahf-p1-1', parentesco: 'Padre', condiciones: ['Diabetes mellitus', 'Hipertensión arterial'], detalle: 'Padre con DM2 diagnosticado a los 55 años.' },
      { id: 'ahf-p1-2', parentesco: 'Madre', condiciones: ['Hipertensión arterial'], detalle: 'Madre hipertensa en tratamiento.' },
      { id: 'ahf-p1-3', parentesco: 'Abuelos maternos', condiciones: ['Diabetes mellitus'], detalle: 'Abuela materna con DM2.' },
    ],
    apnp: {
      tabaquismo: 'negado',
      tabaquismoDetalle: '',
      alcoholismo: 'ocasional',
      alcoholismoDetalle: 'Consumo social en reuniones (1-2 copas).',
      toxicomanias: 'negado',
      toxicomaniasDetalle: '',
      alimentacion: 'Balanceada, con exceso de sal y consumo frecuente de embutidos.',
      actividadFisica: 'leve',
      horasSueno: '7',
      vivienda: 'Departamento propio, cuenta con todos los servicios básicos.',
      inmunizaciones: 'completo',
      ocupacion: 'Contadora (trabajo de oficina)',
      riesgoLaboral: 'Sedestación prolongada y estrés laboral.',
    },
    app: [
      { id: 'app-p1-1', tipo: 'Crónico-degenerativo', descripcion: 'Hipertensión arterial sistémica', anio: '2023' },
      { id: 'app-p1-2', tipo: 'Crónico-degenerativo', descripcion: 'Sobrepeso (IMC 25.9)', anio: '2024' },
      { id: 'app-p1-3', tipo: 'Alérgico', descripcion: 'Alergia a penicilina y sulfas', anio: '2010' },
    ],
    ago: {
      menarca: '12 años',
      ritmo: '28 x 5',
      fum: '2026-07-20',
      gestas: '2',
      partos: '2',
      abortos: '0',
      cesareas: '0',
      metodoAnticonceptivo: 'DIU',
      ultimoPapanicolau: '2025',
      mastografia: 'Pendiente (indicada)',
    },
    interrogatorio: [
      { id: 'int-p1-1', sistema: 'General', estado: 'normal', detalle: '' },
      { id: 'int-p1-2', sistema: 'Cardiovascular', estado: 'anormal', detalle: 'Cefalea holocraneana y mareo matutino al suspender antihipertensivo.' },
      { id: 'int-p1-3', sistema: 'Respiratorio', estado: 'normal', detalle: '' },
      { id: 'int-p1-4', sistema: 'Digestivo', estado: 'normal', detalle: '' },
      { id: 'int-p1-5', sistema: 'Genitourinario', estado: 'normal', detalle: '' },
      { id: 'int-p1-6', sistema: 'Neurológico', estado: 'anormal', detalle: 'Cefalea ocasional; sin focalización.' },
      { id: 'int-p1-7', sistema: 'Músculo-esquelético', estado: 'normal', detalle: '' },
      { id: 'int-p1-8', sistema: 'Piel y anexos', estado: 'normal', detalle: '' },
      { id: 'int-p1-9', sistema: 'Endocrino', estado: 'normal', detalle: '' },
      { id: 'int-p1-10', sistema: 'Psiquiátrico', estado: 'normal', detalle: '' },
    ],
    observaciones: 'Paciente con buena comprensión de su enfermedad. Se refuerza adherencia terapéutica.',
  },
  {
    id: 'hc-p2',
    patientId: 'p2',
    fechaCreacion: '2026-08-20',
    fechaActualizacion: '2026-08-20',
    creadoPor: 'Dra. Patricia Mendoza Ríos',
    ahf: [
      { id: 'ahf-p2-1', parentesco: 'Padre', condiciones: ['Cardiopatía / IAM'], detalle: 'Padre con infarto agudo al miocardio a los 58 años.' },
      { id: 'ahf-p2-2', parentesco: 'Madre', condiciones: [], detalle: 'Aparentemente sana.' },
    ],
    apnp: {
      tabaquismo: 'negado',
      tabaquismoDetalle: '',
      alcoholismo: 'ocasional',
      alcoholismoDetalle: 'Consumo social los fines de semana.',
      toxicomanias: 'negado',
      toxicomaniasDetalle: '',
      alimentacion: 'Alta en carbohidratos y comida rápida por horario laboral.',
      actividadFisica: 'sedentario',
      horasSueno: '6',
      vivienda: 'Departamento rentado, servicios básicos completos.',
      inmunizaciones: 'completo',
      ocupacion: 'Oficinista (8-10 horas sentado)',
      riesgoLaboral: 'Postura sedente prolongada sin pausas ergonómicas.',
    },
    app: [
      { id: 'app-p2-1', tipo: 'Quirúrgico', descripcion: 'Apendicectomía laparoscópica', anio: '2008' },
    ],
    ago: null,
    interrogatorio: [
      { id: 'int-p2-1', sistema: 'General', estado: 'normal', detalle: '' },
      { id: 'int-p2-2', sistema: 'Cardiovascular', estado: 'normal', detalle: '' },
      { id: 'int-p2-3', sistema: 'Respiratorio', estado: 'normal', detalle: '' },
      { id: 'int-p2-4', sistema: 'Digestivo', estado: 'normal', detalle: '' },
      { id: 'int-p2-5', sistema: 'Genitourinario', estado: 'normal', detalle: '' },
      { id: 'int-p2-6', sistema: 'Neurológico', estado: 'normal', detalle: '' },
      { id: 'int-p2-7', sistema: 'Músculo-esquelético', estado: 'anormal', detalle: 'Dolor lumbar mecánico de 2 semanas, intensidad 6/10 (EVA).' },
      { id: 'int-p2-8', sistema: 'Piel y anexos', estado: 'normal', detalle: '' },
      { id: 'int-p2-9', sistema: 'Endocrino', estado: 'normal', detalle: '' },
      { id: 'int-p2-10', sistema: 'Psiquiátrico', estado: 'normal', detalle: '' },
    ],
    observaciones: 'Se entrega guía de ejercicios y recomendaciones ergonómicas.',
  },
  {
    id: 'hc-p3',
    patientId: 'p3',
    fechaCreacion: '2026-08-20',
    fechaActualizacion: '2026-08-20',
    creadoPor: 'Dr. Alejandro García Mendoza',
    ahf: [
      { id: 'ahf-p3-1', parentesco: 'Padre', condiciones: ['Hipertensión arterial'], detalle: 'Padre hipertenso desde los 45 años, bien controlado.' },
      { id: 'ahf-p3-2', parentesco: 'Madre', condiciones: [], detalle: 'Sin antecedentes relevantes.' },
      { id: 'ahf-p3-3', parentesco: 'Abuelos paternos', condiciones: ['Diabetes mellitus'], detalle: 'Abuelo paterno con DM2.' },
    ],
    apnp: {
      tabaquismo: 'negado',
      tabaquismoDetalle: '',
      alcoholismo: 'negado',
      alcoholismoDetalle: '',
      toxicomanias: 'negado',
      toxicomaniasDetalle: '',
      alimentacion: 'Vegetariana, suplementa con B12 y hierro.',
      actividadFisica: 'moderado',
      horasSueno: '7-8',
      vivienda: 'Departamento compartido, servicios completos.',
      inmunizaciones: 'completo',
      ocupacion: 'Diseñadora gráfica (freelance)',
      riesgoLaboral: 'Sedestación prolongada, fatiga visual por pantallas.',
    },
    app: [
      { id: 'app-p3-1', tipo: 'Alérgico', descripcion: 'Alergia a AINEs (ibuprofeno, naproxeno)', anio: '2015' },
      { id: 'app-p3-2', tipo: 'Crónico-degenerativo', descripcion: 'Anemia ferropénica leve', anio: '2024' },
    ],
    ago: {
      menarca: '13 años',
      ritmo: '28 x 4',
      fum: '2026-08-05',
      gestas: '0',
      partos: '0',
      abortos: '0',
      cesareas: '0',
      metodoAnticonceptivo: 'Pastoral combinado',
      ultimoPapanicolau: '2025',
      mastografia: 'No aplica',
    },
    interrogatorio: [
      { id: 'int-p3-1', sistema: 'General', estado: 'anormal', detalle: 'Fatiga persistente de 3 semanas, sin fiebre ni pérdida de peso.' },
      { id: 'int-p3-2', sistema: 'Cardiovascular', estado: 'normal', detalle: '' },
      { id: 'int-p3-3', sistema: 'Respiratorio', estado: 'normal', detalle: '' },
      { id: 'int-p3-4', sistema: 'Digestivo', estado: 'normal', detalle: '' },
      { id: 'int-p3-5', sistema: 'Genitourinario', estado: 'normal', detalle: '' },
      { id: 'int-p3-6', sistema: 'Neurológico', estado: 'normal', detalle: '' },
      { id: 'int-p3-7', sistema: 'Músculo-esquelético', estado: 'normal', detalle: '' },
      { id: 'int-p3-8', sistema: 'Piel y anexos', estado: 'normal', detalle: '' },
      { id: 'int-p3-9', sistema: 'Endocrino', estado: 'normal', detalle: '' },
      { id: 'int-p3-10', sistema: 'Psiquiátrico', estado: 'normal', detalle: '' },
    ],
    observaciones: 'Sospecha de anemia recidivante. Se solicita biometría hemática y ferritina.',
  },
  {
    id: 'hc-p4',
    patientId: 'p4',
    fechaCreacion: '2026-08-20',
    fechaActualizacion: '2026-08-20',
    creadoPor: 'Dra. Patricia Mendoza Ríos',
    ahf: [
      { id: 'ahf-p4-1', parentesco: 'Padre', condiciones: ['Cardiopatía / IAM'], detalle: 'Padre fallecido por IAM a los 62 años.' },
      { id: 'ahf-p4-2', parentesco: 'Madre', condiciones: ['Hipertensión arterial'], detalle: 'Madre hipertensa controlada.' },
      { id: 'ahf-p4-3', parentesco: 'Hermanos', condiciones: ['Hipertensión arterial'], detalle: 'Hermano mayor con HTA diagnosticada a los 40 años.' },
    ],
    apnp: {
      tabaquismo: 'ex',
      tabaquismoDetalle: 'Dejó de fumar hace 5 años. Consumía 10 cigarrillos/día por 12 años.',
      alcoholismo: 'ocasional',
      alcoholismoDetalle: 'Cerveza los fines de semana (2-3).',
      toxicomanias: 'negado',
      toxicomaniasDetalle: '',
      alimentacion: 'Alta en grasas saturadas y sodio. Consumo frecuente de embutidos.',
      actividadFisica: 'sedentario',
      horasSueno: '6',
      vivienda: 'Casa propia, servicios completos.',
      inmunizaciones: 'completo',
      ocupacion: 'Ejecutivo de ventas (viaja frecuentemente)',
      riesgoLaboral: 'Estrés laboral intenso, horarios irregulares.',
    },
    app: [
      { id: 'app-p4-1', tipo: 'Crónico-degenerativo', descripcion: 'Dislipidemia mixta', anio: '2022' },
      { id: 'app-p4-2', tipo: 'Alérgico', descripcion: 'Alergia a aspirina', anio: '2010' },
    ],
    ago: null,
    interrogatorio: [
      { id: 'int-p4-1', sistema: 'General', estado: 'normal', detalle: '' },
      { id: 'int-p4-2', sistema: 'Cardiovascular', estado: 'anormal', detalle: 'Dolor torácico leve no irradiado, de características no anginosas. Alerta cardíaca previa.' },
      { id: 'int-p4-3', sistema: 'Respiratorio', estado: 'normal', detalle: '' },
      { id: 'int-p4-4', sistema: 'Digestivo', estado: 'normal', detalle: '' },
      { id: 'int-p4-5', sistema: 'Genitourinario', estado: 'normal', detalle: '' },
      { id: 'int-p4-6', sistema: 'Neurológico', estado: 'normal', detalle: '' },
      { id: 'int-p4-7', sistema: 'Músculo-esquelético', estado: 'normal', detalle: '' },
      { id: 'int-p4-8', sistema: 'Piel y anexos', estado: 'normal', detalle: '' },
      { id: 'int-p4-9', sistema: 'Endocrino', estado: 'normal', detalle: '' },
      { id: 'int-p4-10', sistema: 'Psiquiátrico', estado: 'normal', detalle: '' },
    ],
    observaciones: 'Alto riesgo cardiovascular por historia familiar y ex-tabaquismo. Se sugiere perfil de lípidos y ecocardiograma.',
  },
  {
    id: 'hc-p5',
    patientId: 'p5',
    fechaCreacion: '2024-03-15',
    fechaActualizacion: '2026-08-20',
    creadoPor: 'Dr. Alejandro García Mendoza',
    ahf: [
      { id: 'ahf-p5-1', parentesco: 'Padre', condiciones: ['Diabetes mellitus'], detalle: 'Padre con DM2 diagnosticado a los 50 años.' },
      { id: 'ahf-p5-2', parentesco: 'Madre', condiciones: ['Hipertensión arterial'], detalle: 'Madre hipertensa.' },
      { id: 'ahf-p5-3', parentesco: 'Hermanos', condiciones: ['Diabetes mellitus'], detalle: 'Hermano con DM2 diagnosticado a los 48 años.' },
    ],
    apnp: {
      tabaquismo: 'negado',
      tabaquismoDetalle: '',
      alcoholismo: 'negado',
      alcoholismoDetalle: '',
      toxicomanias: 'negado',
      toxicomaniasDetalle: '',
      alimentacion: 'Irregular, alto consumo de carbohidratos refinados y azúcares.',
      actividadFisica: 'sedentario',
      horasSueno: '5-6',
      vivienda: 'Departamento propio, servicios completos.',
      inmunizaciones: 'completo',
      ocupacion: 'Taxista',
      riesgoLaboral: 'Sedestación prolongada, horarios irregulares.',
    },
    app: [
      { id: 'app-p5-1', tipo: 'Crónico-degenerativo', descripcion: 'Diabetes mellitus tipo 2 diagnosticada en 2018', anio: '2018' },
      { id: 'app-p5-2', tipo: 'Crónico-degenerativo', descripcion: 'Retinopatía diabética no proliferativa', anio: '2023' },
      { id: 'app-p5-3', tipo: 'Alérgico', descripcion: 'Alergia a sulfonamidas', anio: '2010' },
    ],
    ago: null,
    interrogatorio: [
      { id: 'int-p5-1', sistema: 'General', estado: 'anormal', detalle: 'Poliuria ocasional y sed intensa en las tardes. Visión borrosa intermitente.' },
      { id: 'int-p5-2', sistema: 'Cardiovascular', estado: 'normal', detalle: '' },
      { id: 'int-p5-3', sistema: 'Respiratorio', estado: 'normal', detalle: '' },
      { id: 'int-p5-4', sistema: 'Digestivo', estado: 'normal', detalle: '' },
      { id: 'int-p5-5', sistema: 'Genitourinario', estado: 'normal', detalle: '' },
      { id: 'int-p5-6', sistema: 'Neurológico', estado: 'normal', detalle: '' },
      { id: 'int-p5-7', sistema: 'Músculo-esquelético', estado: 'normal', detalle: '' },
      { id: 'int-p5-8', sistema: 'Piel y anexos', estado: 'normal', detalle: '' },
      { id: 'int-p5-9', sistema: 'Endocrino', estado: 'anormal', detalle: 'DM2 insulinodependiente de 8 años de evolución. HbA1c descontrolada.' },
      { id: 'int-p5-10', sistema: 'Psiquiátrico', estado: 'normal', detalle: '' },
    ],
    observaciones: 'Paciente con adherencia irregular a tratamiento. Se refuerza importancia de automonitoreo.',
  },
  {
    id: 'hc-p7',
    patientId: 'p7',
    fechaCreacion: '2022-05-10',
    fechaActualizacion: '2026-08-20',
    creadoPor: 'Dr. Fernando Castillo Vega',
    ahf: [
      { id: 'ahf-p7-1', parentesco: 'Padre', condiciones: ['Asma'], detalle: 'Padre asmático de joven.' },
      { id: 'ahf-p7-2', parentesco: 'Madre', condiciones: [], detalle: 'Sin antecedentes relevantes.' },
    ],
    apnp: {
      tabaquismo: 'ex',
      tabaquismoDetalle: 'Exfumador de 20 años. Dejó hace 15 años.',
      alcoholismo: 'negado',
      alcoholismoDetalle: '',
      toxicomanias: 'negado',
      toxicomaniasDetalle: '',
      alimentacion: 'Regular, bajo consumo de frutas y verduras.',
      actividadFisica: 'sedentario',
      horasSueno: '6',
      vivienda: 'Casa propia, servicios completos.',
      inmunizaciones: 'completo',
      ocupacion: 'Jubilado (ex-mecánico)',
      riesgoLaboral: 'Exposición a polvos y solventes por 40 años.',
    },
    app: [
      { id: 'app-p7-1', tipo: 'Crónico-degenerativo', descripcion: 'EPOC Gold B (FEV1 65%)', anio: '2019' },
      { id: 'app-p7-2', tipo: 'Crónico-degenerativo', descripcion: 'Hipertensión arterial sistémica', anio: '2015' },
      { id: 'app-p7-3', tipo: 'Hospitalización', descripcion: 'Neumonía por Haemophilus influenzae', anio: '2023' },
    ],
    ago: null,
    interrogatorio: [
      { id: 'int-p7-1', sistema: 'General', estado: 'normal', detalle: '' },
      { id: 'int-p7-2', sistema: 'Cardiovascular', estado: 'normal', detalle: '' },
      { id: 'int-p7-3', sistema: 'Respiratorio', estado: 'anormal', detalle: 'Disnea progresiva, aumento de expectoración. Requiere oxígeno suplementario.' },
      { id: 'int-p7-4', sistema: 'Digestivo', estado: 'normal', detalle: '' },
      { id: 'int-p7-5', sistema: 'Genitourinario', estado: 'normal', detalle: '' },
      { id: 'int-p7-6', sistema: 'Neurológico', estado: 'normal', detalle: '' },
      { id: 'int-p7-7', sistema: 'Músculo-esquelético', estado: 'normal', detalle: '' },
      { id: 'int-p7-8', sistema: 'Piel y anexos', estado: 'normal', detalle: '' },
      { id: 'int-p7-9', sistema: 'Endocrino', estado: 'normal', detalle: '' },
      { id: 'int-p7-10', sistema: 'Psiquiátrico', estado: 'normal', detalle: '' },
    ],
    observaciones: 'Paciente con EPOC en seguimiento. Se coordina con neumología para valoración.',
  },
  {
    id: 'hc-p8',
    patientId: 'p8',
    fechaCreacion: '2025-01-10',
    fechaActualizacion: '2026-08-20',
    creadoPor: 'Dra. Gabriela Herrera López',
    ahf: [
      { id: 'ahf-p8-1', parentesco: 'Padre', condiciones: [], detalle: 'Sin antecedentes relevantes.' },
      { id: 'ahf-p8-2', parentesco: 'Madre', condiciones: ['Diabetes mellitus'], detalle: 'Madre con DM2 gestacional que persistió.' },
    ],
    apnp: {
      tabaquismo: 'negado',
      tabaquismoDetalle: '',
      alcoholismo: 'negado',
      alcoholismoDetalle: '',
      toxicomanias: 'negado',
      toxicomaniasDetalle: '',
      alimentacion: 'Balanceada, suplementada con ácido fólico y hierro.',
      actividadFisica: 'leve',
      horasSueno: '8',
      vivienda: 'Departamento propio, servicios completos.',
      inmunizaciones: 'completo',
      ocupacion: 'Maestra de primaria',
      riesgoLaboral: 'Estrés leve, contacto con niños.',
    },
    app: [
      { id: 'app-p8-1', tipo: 'Hospitalización', descripcion: 'Cesárea por sufrimiento fetal agudo (2020)', anio: '2020' },
      { id: 'app-p8-2', tipo: 'Crónico-degenerativo', descripcion: 'Cervicovaginitis recurrente', anio: '2023' },
    ],
    ago: {
      menarca: '11 años',
      ritmo: '28 x 4',
      fum: '2025-12-01',
      gestas: '2',
      partos: '1',
      abortos: '0',
      cesareas: '1',
      metodoAnticonceptivo: 'Ninguno (deseo de embarazo actual)',
      ultimoPapanicolau: '2025',
      mastografia: 'No aplica (menor de 40 años)',
    },
    interrogatorio: [
      { id: 'int-p8-1', sistema: 'General', estado: 'normal', detalle: '' },
      { id: 'int-p8-2', sistema: 'Cardiovascular', estado: 'normal', detalle: '' },
      { id: 'int-p8-3', sistema: 'Respiratorio', estado: 'normal', detalle: '' },
      { id: 'int-p8-4', sistema: 'Digestivo', estado: 'normal', detalle: '' },
      { id: 'int-p8-5', sistema: 'Genitourinario', estado: 'normal', detalle: '' },
      { id: 'int-p8-6', sistema: 'Neurológico', estado: 'normal', detalle: '' },
      { id: 'int-p8-7', sistema: 'Músculo-esquelético', estado: 'normal', detalle: '' },
      { id: 'int-p8-8', sistema: 'Piel y anexos', estado: 'normal', detalle: '' },
      { id: 'int-p8-9', sistema: 'Endocrino', estado: 'normal', detalle: '' },
      { id: 'int-p8-10', sistema: 'Psiquiátrico', estado: 'normal', detalle: '' },
    ],
    observaciones: 'Embarazo de 28 semanas con buena evolución. Pendiente biometría hemática y glucosa.',
  },
  {
    id: 'hc-p9',
    patientId: 'p9',
    fechaCreacion: '2023-06-20',
    fechaActualizacion: '2026-08-20',
    creadoPor: 'Dr. Alejandro García Mendoza',
    ahf: [
      { id: 'ahf-p9-1', parentesco: 'Padre', condiciones: ['Cardiopatía / IAM', 'Diabetes mellitus'], detalle: 'Padre fallecido por IAM a los 70 años, con DM2.' },
      { id: 'ahf-p9-2', parentesco: 'Madre', condiciones: ['Hipertensión arterial'], detalle: 'Madre hipertensa.' },
      { id: 'ahf-p9-3', parentesco: 'Hermanos', condiciones: ['Cardiopatía / IAM'], detalle: 'Hermano mayor con IAM a los 55 años.' },
    ],
    apnp: {
      tabaquismo: 'ex',
      tabaquismoDetalle: 'Exfumador de 15 años. Dejó hace 3 años tras el IAM.',
      alcoholismo: 'negado',
      alcoholismoDetalle: '',
      toxicomanias: 'negado',
      toxicomaniasDetalle: '',
      alimentacion: 'Baja en grasas desde el evento cardiaco. Controlada por nutrición.',
      actividadFisica: 'leve',
      horasSueno: '7',
      vivienda: 'Casa propia, servicios completos.',
      inmunizaciones: 'completo',
      ocupacion: 'Contador público (oficina)',
      riesgoLaboral: 'Sedestación prolongada, estrés moderado.',
    },
    app: [
      { id: 'app-p9-1', tipo: 'Crónico-degenerativo', descripcion: 'Infarto agudo al miocardio (2023) con stent en ADA', anio: '2023' },
      { id: 'app-p9-2', tipo: 'Crónico-degenerativo', descripcion: 'Hipercolesterolemia familiar', anio: '2010' },
      { id: 'app-p9-3', tipo: 'Alérgico', descripcion: 'Alergia a contraste yodado', anio: '2010' },
      { id: 'app-p9-4', tipo: 'Hospitalización', descripcion: 'Cateterismo cardiaco con stent (2023)', anio: '2023' },
    ],
    ago: null,
    interrogatorio: [
      { id: 'int-p9-1', sistema: 'General', estado: 'normal', detalle: '' },
      { id: 'int-p9-2', sistema: 'Cardiovascular', estado: 'anormal', detalle: 'Dolor precordial opresivo de 40 min, irradiado a mandíbula, con diaforesis. Antecedente de IAM.' },
      { id: 'int-p9-3', sistema: 'Respiratorio', estado: 'normal', detalle: '' },
      { id: 'int-p9-4', sistema: 'Digestivo', estado: 'normal', detalle: '' },
      { id: 'int-p9-5', sistema: 'Genitourinario', estado: 'normal', detalle: '' },
      { id: 'int-p9-6', sistema: 'Neurológico', estado: 'normal', detalle: '' },
      { id: 'int-p9-7', sistema: 'Músculo-esquelético', estado: 'normal', detalle: '' },
      { id: 'int-p9-8', sistema: 'Piel y anexos', estado: 'normal', detalle: '' },
      { id: 'int-p9-9', sistema: 'Endocrino', estado: 'normal', detalle: '' },
      { id: 'int-p9-10', sistema: 'Psiquiátrico', estado: 'normal', detalle: '' },
    ],
    observaciones: 'Alto riesgo cardiovascular. Se activa código de cardiología y monitoreo continuo.',
  },
  {
    id: 'hc-p10',
    patientId: 'p10',
    fechaCreacion: '2020-04-15',
    fechaActualizacion: '2026-08-20',
    creadoPor: 'Dr. Eduardo Ponce León',
    ahf: [
      { id: 'ahf-p10-1', parentesco: 'Padre', condiciones: ['Asma', 'Alergias'], detalle: 'Padre asmático con alergias a polen.' },
      { id: 'ahf-p10-2', parentesco: 'Madre', condiciones: ['Dermatitis atópica'], detalle: 'Madre con dermatitis atópica crónica desde la infancia.' },
      { id: 'ahf-p10-3', parentesco: 'Hermanos', condiciones: ['Alergias'], detalle: 'Hermana con rinitis alérgica.' },
    ],
    apnp: {
      tabaquismo: 'negado',
      tabaquismoDetalle: '',
      alcoholismo: 'ocasional',
      alcoholismoDetalle: 'Vino ocasional.',
      toxicomanias: 'negado',
      toxicomaniasDetalle: '',
      alimentacion: 'Evita lácteos y gluten por intolerancia.',
      actividadFisica: 'moderado',
      horasSueno: '7',
      vivienda: 'Departamento propio, servicios completos.',
      inmunizaciones: 'completo',
      ocupacion: 'Estilista (salón de belleza)',
      riesgoLaboral: 'Contacto frecuente con químicos, látex.',
    },
    app: [
      { id: 'app-p10-1', tipo: 'Alérgico', descripcion: 'Alergia a látex (contacto)', anio: '2015' },
      { id: 'app-p10-2', tipo: 'Alérgico', descripcion: 'Dermatitis atópica crónica', anio: 'Infancia' },
      { id: 'app-p10-3', tipo: 'Alérgico', descripcion: 'Rinitis alérgica estacional', anio: '2012' },
    ],
    ago: {
      menarca: '12 años',
      ritmo: '28 x 5',
      fum: '2026-08-01',
      gestas: '0',
      partos: '0',
      abortos: '0',
      cesareas: '0',
      metodoAnticonceptivo: 'Condón',
      ultimoPapanicolau: '2025',
      mastografia: 'No aplica',
    },
    interrogatorio: [
      { id: 'int-p10-1', sistema: 'General', estado: 'normal', detalle: '' },
      { id: 'int-p10-2', sistema: 'Cardiovascular', estado: 'normal', detalle: '' },
      { id: 'int-p10-3', sistema: 'Respiratorio', estado: 'normal', detalle: '' },
      { id: 'int-p10-4', sistema: 'Digestivo', estado: 'normal', detalle: '' },
      { id: 'int-p10-5', sistema: 'Genitourinario', estado: 'normal', detalle: '' },
      { id: 'int-p10-6', sistema: 'Neurológico', estado: 'normal', detalle: '' },
      { id: 'int-p10-7', sistema: 'Músculo-esquelético', estado: 'normal', detalle: '' },
      { id: 'int-p10-8', sistema: 'Piel y anexos', estado: 'anormal', detalle: 'Brote de dermatitis atópica con prurito intenso y lesiones eritematosas en pliegues.' },
      { id: 'int-p10-9', sistema: 'Endocrino', estado: 'normal', detalle: '' },
      { id: 'int-p10-10', sistema: 'Psiquiátrico', estado: 'normal', detalle: '' },
    ],
    observaciones: 'Paciente con dermatitis atópica de larga data. Se refuerza rutina de hidratación y evitar irritantes.',
  },
];

export const getHistoriaClinicaByPatient = (patientId: string): HistoriaClinica | undefined =>
  historiaClinicaData.find((h) => h.patientId === patientId);

export const createEmptyHistoriaClinica = (patientId: string, creadoPor: string): HistoriaClinica => ({
  id: `hc-${patientId}-${Date.now()}`,
  patientId,
  fechaCreacion: new Date().toISOString().split('T')[0],
  fechaActualizacion: new Date().toISOString().split('T')[0],
  creadoPor,
  ahf: [],
  apnp: {
    tabaquismo: 'negado',
    tabaquismoDetalle: '',
    alcoholismo: 'negado',
    alcoholismoDetalle: '',
    toxicomanias: 'negado',
    toxicomaniasDetalle: '',
    alimentacion: '',
    actividadFisica: 'sedentario',
    horasSueno: '',
    vivienda: '',
    inmunizaciones: 'desconocido',
    ocupacion: '',
    riesgoLaboral: '',
  },
  app: [],
  ago: null,
  interrogatorio: sistemasInterrogatorio.map((sistema, i) => ({
    id: `int-${patientId}-${i}`,
    sistema,
    estado: 'normal' as const,
    detalle: '',
  })),
  observaciones: '',
});