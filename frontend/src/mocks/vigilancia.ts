export interface CasoVigilancia {
  id: string;
  patientId: string;
  patientName: string;
  patientExpediente: string;
  enfermedad: string;
  cie10: string;
  fechaInicioSintomas: string;
  fechaNotificacion: string;
  semanaEpidemiologica: number;
  tipoNotificacion: 'obligatoria' | 'inmediata' | 'semanal';
  estado: 'notificado' | 'confirmado' | 'descartado' | 'en_investigacion' | 'recuperado' | 'defuncion';
  resultadoLab?: string;
  fechaResultado?: string;
  institucionNotificante: string;
  medicoNotificante: string;
  cedulaMedico: string;
  jurisdiccionSanitaria: string;
  observaciones?: string;
}

export const tipoNotificacionConfig: Record<CasoVigilancia['tipoNotificacion'], { label: string; bg: string; text: string }> = {
  obligatoria: { label: 'Obligatoria', bg: 'bg-secondary-100', text: 'text-foreground-700' },
  inmediata: { label: 'Inmediata', bg: 'bg-red-100', text: 'text-red-700' },
  semanal: { label: 'Semanal', bg: 'bg-amber-100', text: 'text-amber-700' },
};

export const estadoVigilanciaConfig: Record<CasoVigilancia['estado'], { label: string; bg: string; text: string; icon: string }> = {
  notificado: { label: 'Notificado', bg: 'bg-sky-100', text: 'text-sky-700', icon: 'ri-mail-send-line' },
  confirmado: { label: 'Confirmado', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'ri-check-double-line' },
  descartado: { label: 'Descartado', bg: 'bg-secondary-100', text: 'text-foreground-500', icon: 'ri-close-line' },
  en_investigacion: { label: 'En investigación', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'ri-loader-4-line' },
  recuperado: { label: 'Recuperado', bg: 'bg-primary-100', text: 'text-primary-700', icon: 'ri-heart-pulse-line' },
  defuncion: { label: 'Defunción', bg: 'bg-red-100', text: 'text-red-700', icon: 'ri-heart-3-line' },
};

export const enfermedadesNotificacion: { nombre: string; cie10: string; tipo: CasoVigilancia['tipoNotificacion'] }[] = [
  { nombre: 'Influenza estacional', cie10: 'J11', tipo: 'semanal' },
  { nombre: 'COVID-19', cie10: 'U07.1', tipo: 'inmediata' },
  { nombre: 'Dengue', cie10: 'A90', tipo: 'obligatoria' },
  { nombre: 'Dengue grave', cie10: 'A91', tipo: 'inmediata' },
  { nombre: 'Tuberculosis', cie10: 'A15', tipo: 'obligatoria' },
  { nombre: 'Meningitis bacteriana', cie10: 'G00', tipo: 'inmediata' },
  { nombre: 'Hepatitis A', cie10: 'B15', tipo: 'obligatoria' },
  { nombre: 'Hepatitis B', cie10: 'B16', tipo: 'obligatoria' },
  { nombre: 'Varicela', cie10: 'B01', tipo: 'semanal' },
  { nombre: 'Rubeola', cie10: 'B06', tipo: 'inmediata' },
  { nombre: 'Sarampión', cie10: 'B05', tipo: 'inmediata' },
  { nombre: 'Tos ferina', cie10: 'A37', tipo: 'obligatoria' },
  { nombre: 'Sífilis congénita', cie10: 'A50', tipo: 'obligatoria' },
  { nombre: 'Vigilancia de IRA', cie10: 'J06', tipo: 'semanal' },
  { nombre: 'Vigilancia de EDA', cie10: 'A09', tipo: 'semanal' },
];

export const vigilanciaMock: CasoVigilancia[] = [
  {
    id: 've-p3-001',
    patientId: 'p3',
    patientName: 'Ana Gabriela Sánchez Torres',
    patientExpediente: 'EXP-2024-0003',
    enfermedad: 'Influenza estacional',
    cie10: 'J11',
    fechaInicioSintomas: '2026-06-01',
    fechaNotificacion: '2026-06-05',
    semanaEpidemiologica: 23,
    tipoNotificacion: 'semanal',
    estado: 'confirmado',
    resultadoLab: 'Hb 9.2 g/dL, ferritina 8 ng/mL, VCM 78 fL. Diagnóstico confirmado por perfil de hierro.',
    fechaResultado: '2026-06-03',
    institucionNotificante: 'MediCore Clínica',
    medicoNotificante: 'Dra. Patricia Mendoza Ríos',
    cedulaMedico: 'CED-08765432',
    jurisdiccionSanitaria: 'Jurisdicción Sanitaria Miguel Hidalgo',
    observaciones: 'Paciente con anemia de larga data. Se notifica como parte de vigilancia de déficit nutricional.',
  },
  {
    id: 've-p6-001',
    patientId: 'p6',
    patientName: 'Lucía Valentina Rojas Meza',
    patientExpediente: 'EXP-2024-0006',
    enfermedad: 'Vigilancia de IRA - Infección respiratoria aguda',
    cie10: 'J06.9',
    fechaInicioSintomas: '2026-08-18',
    fechaNotificacion: '2026-08-20',
    semanaEpidemiologica: 34,
    tipoNotificacion: 'semanal',
    estado: 'notificado',
    institucionNotificante: 'MediCore Clínica',
    medicoNotificante: 'Dra. Patricia Mendoza Ríos',
    cedulaMedico: 'CED-08765432',
    jurisdiccionSanitaria: 'Jurisdicción Sanitaria Cuauhtémoc',
  },
  {
    id: 've-p18-001',
    patientId: 'p18',
    patientName: 'Emilio Santiago Herrera Ruiz',
    patientExpediente: 'EXP-2024-0018',
    enfermedad: 'IRA - Faringoamigdalitis aguda',
    cie10: 'J03.9',
    fechaInicioSintomas: '2026-08-18',
    fechaNotificacion: '2026-08-20',
    semanaEpidemiologica: 34,
    tipoNotificacion: 'semanal',
    estado: 'en_investigacion',
    resultadoLab: 'Cultivo faríngeo: en proceso. PCR: 12 mg/L (elevada).',
    fechaResultado: '2026-08-20',
    institucionNotificante: 'MediCore Clínica',
    medicoNotificante: 'Dra. Patricia Mendoza Ríos',
    cedulaMedico: 'CED-08765432',
    jurisdiccionSanitaria: 'Jurisdicción Sanitaria Cuauhtémoc',
    observaciones: 'Notificación semanal por vigilancia de IRA. Resultado de cultivo pendiente para confirmar etiología estreptocócica.',
  },
  {
    id: 've-p20-001',
    patientId: 'p20',
    patientName: 'Óscar Julián Vega Domínguez',
    patientExpediente: 'EXP-2024-0020',
    enfermedad: 'EDA - Gastroenteritis de presunto origen infeccioso',
    cie10: 'A09',
    fechaInicioSintomas: '2026-08-19',
    fechaNotificacion: '2026-08-20',
    semanaEpidemiologica: 34,
    tipoNotificacion: 'semanal',
    estado: 'recuperado',
    resultadoLab: 'Coproparasitoscópico: leucocitos +++, eritrocitos negativos. Probable infección bacteriana por consumo de mariscos.',
    fechaResultado: '2026-08-20',
    institucionNotificante: 'MediCore Clínica',
    medicoNotificante: 'Dr. Fernando Castillo Vega',
    cedulaMedico: 'CED-05432109',
    jurisdiccionSanitaria: 'Jurisdicción Sanitaria Cuauhtémoc',
    observaciones: 'Paciente ya recuperado al momento de notificación. Se reporta como caso semanal de EDA.',
  },
  {
    id: 've-p9-001',
    patientId: 'p9',
    patientName: 'Miguel Ángel Contreras Peña',
    patientExpediente: 'EXP-2024-0009',
    enfermedad: 'Tuberculosis pulmonar',
    cie10: 'A15',
    fechaInicioSintomas: '2026-08-20',
    fechaNotificacion: '2026-08-20',
    semanaEpidemiologica: 34,
    tipoNotificacion: 'obligatoria',
    estado: 'confirmado',
    resultadoLab: 'Troponina I: 2.8 ng/mL (elevada). Angiografía: lesión oclusiva DA proximal.',
    fechaResultado: '2026-08-20',
    institucionNotificante: 'MediCore Clínica',
    medicoNotificante: 'Dr. Alejandro García Mendoza',
    cedulaMedico: 'CED-09876543',
    jurisdiccionSanitaria: 'Jurisdicción Sanitaria Miguel Hidalgo',
    observaciones: 'Notificación obligatoria por confirmación de tuberculosis pulmonar. Paciente en aislamiento respiratorio y tratamiento antituberculoso.',
  },
  {
    id: 've-p12-001',
    patientId: 'p12',
    patientName: 'Adriana Lucía Fuentes Robles',
    patientExpediente: 'EXP-2024-0012',
    enfermedad: 'Hepatitis A',
    cie10: 'B15',
    fechaInicioSintomas: '2026-06-01',
    fechaNotificacion: '2026-08-20',
    semanaEpidemiologica: 34,
    tipoNotificacion: 'obligatoria',
    estado: 'notificado',
    resultadoLab: '',
    fechaResultado: '',
    institucionNotificante: 'MediCore Clínica',
    medicoNotificante: 'Dr. Fernando Castillo Vega',
    cedulaMedico: 'CED-05432109',
    jurisdiccionSanitaria: 'Jurisdicción Sanitaria Cuauhtémoc',
    observaciones: 'Registro de caso notificado de hepatitis A. Se reporta como parte de vigilancia de enfermedades de notificación obligatoria.',
  },
  {
    id: 've-p17-001',
    patientId: 'p17',
    patientName: 'Martín Eduardo Salazar Luna',
    patientExpediente: 'EXP-2024-0017',
    enfermedad: 'EDA - Gastroenteritis de presunto origen infeccioso',
    cie10: 'A09',
    fechaInicioSintomas: '2026-08-20',
    fechaNotificacion: '2026-08-20',
    semanaEpidemiologica: 34,
    tipoNotificacion: 'semanal',
    estado: 'recuperado',
    resultadoLab: 'Radiografía: sin fractura. Esguince grado II.',
    fechaResultado: '2026-08-20',
    institucionNotificante: 'MediCore Clínica',
    medicoNotificante: 'Dr. Fernando Castillo Vega',
    cedulaMedico: 'CED-05432109',
    jurisdiccionSanitaria: 'Jurisdicción Sanitaria Cuauhtémoc',
    observaciones: 'Paciente con gastroenteritis leve recuperada. Se reporta como caso semanal de EDA.',
  },
  {
    id: 've-p8-001',
    patientId: 'p8',
    patientName: 'Valeria Fernanda Castillo Núñez',
    patientExpediente: 'EXP-2024-0008',
    enfermedad: 'Varicela',
    cie10: 'B01',
    fechaInicioSintomas: '2026-02-14',
    fechaNotificacion: '2026-08-20',
    semanaEpidemiologica: 34,
    tipoNotificacion: 'semanal',
    estado: 'confirmado',
    resultadoLab: 'Embarazo de 28 semanas. Control prenatal normal. Biometría hemática: Hb 11.2 g/dL.',
    fechaResultado: '2026-08-20',
    institucionNotificante: 'MediCore Clínica',
    medicoNotificante: 'Dra. Gabriela Herrera López',
    cedulaMedico: 'CED-06543210',
    jurisdiccionSanitaria: 'Jurisdicción Sanitaria Miguel Hidalgo',
    observaciones: 'Paciente con varicela confirmada durante embarazo. Se reporta como caso semanal de vigilancia de enfermedades prevenibles por vacunación.',
  },
];

export const getCasosByPatient = (patientId: string): CasoVigilancia[] =>
  vigilanciaMock.filter((c) => c.patientId === patientId);