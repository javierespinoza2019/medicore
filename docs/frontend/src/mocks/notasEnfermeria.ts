export interface MedicamentoAdministrado {
  nombre: string;
  dosis: string;
  via: string;
  hora: string;
  observacion?: string;
}

export interface ActividadEnfermeria {
  id: string;
  tipo: 'curacion' | 'cateter' | 'sonda' | 'monitoreo' | 'aspiracion' | 'oxigeno' | 'movilizacion' | 'alimentacion' | 'educacion' | 'otro';
  descripcion: string;
  hora: string;
  resultado?: string;
}

export interface NotaEnfermeria {
  id: string;
  patientId: string;
  patientName: string;
  patientExpediente: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  turno: 'matutino' | 'vespertino' | 'nocturno';
  enfermera: string;
  cedulaEnfermera: string;
  especialidad?: string;

  // Signos vitales
  temperatura: string;
  presionSistolica: string;
  presionDiastolica: string;
  frecuenciaCardiaca: string;
  frecuenciaRespiratoria: string;
  saturacionOxigeno: string;
  glucosa: string;
  peso: string;
  talla: string;

  // Estado del paciente
  estadoInicio: 'estable' | 'grave' | 'critico' | 'mejorando' | 'deterioro';
  estadoFin: 'estable' | 'grave' | 'critico' | 'mejorando' | 'deterioro';
  dolorEva: string;

  // Actividades y cuidados
  actividades: ActividadEnfermeria[];
  medicamentos: MedicamentoAdministrado[];

  // Plan y evolución
  evolucionEnfermeria: string;
  planCuidados: string;
  observaciones?: string;

  // Firma
  firmaEnfermera: boolean;
}

export const actividadTipoConfig: Record<ActividadEnfermeria['tipo'], { label: string; icon: string; color: string }> = {
  curacion: { label: 'Curación', icon: 'ri-first-aid-kit-line', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  cateter: { label: 'Catéter', icon: 'ri-drop-line', color: 'bg-red-50 text-red-700 border-red-200' },
  sonda: { label: 'Sonda', icon: 'ri-test-tube-line', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  monitoreo: { label: 'Monitoreo', icon: 'ri-heart-pulse-line', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  aspiracion: { label: 'Aspiración', icon: 'ri-lungs-line', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  oxigeno: { label: 'Oxígeno', icon: 'ri-windy-line', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  movilizacion: { label: 'Movilización', icon: 'ri-walk-line', color: 'bg-lime-50 text-lime-700 border-lime-200' },
  alimentacion: { label: 'Alimentación', icon: 'ri-restaurant-line', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  educacion: { label: 'Educación', icon: 'ri-book-open-line', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  otro: { label: 'Otro', icon: 'ri-more-line', color: 'bg-secondary-50 text-foreground-600 border-secondary-200' },
};

export const estadoPacienteConfig: Record<NotaEnfermeria['estadoInicio'], { label: string; bg: string; text: string; icon: string }> = {
  estable: { label: 'Estable', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'ri-check-line' },
  grave: { label: 'Grave', bg: 'bg-amber-50', text: 'text-amber-700', icon: 'ri-alert-line' },
  critico: { label: 'Crítico', bg: 'bg-red-50', text: 'text-red-700', icon: 'ri-error-warning-line' },
  mejorando: { label: 'Mejorando', bg: 'bg-sky-50', text: 'text-sky-700', icon: 'ri-arrow-up-line' },
  deterioro: { label: 'Deterioro', bg: 'bg-rose-50', text: 'text-rose-700', icon: 'ri-arrow-down-line' },
};

export const turnoConfig: Record<NotaEnfermeria['turno'], { label: string; icon: string; color: string; rango: string }> = {
  matutino: { label: 'Matutino', icon: 'ri-sun-line', color: 'bg-amber-100 text-amber-700', rango: '07:00 - 15:00' },
  vespertino: { label: 'Vespertino', icon: 'ri-cloud-line', color: 'bg-orange-100 text-orange-700', rango: '15:00 - 23:00' },
  nocturno: { label: 'Nocturno', icon: 'ri-moon-line', color: 'bg-indigo-100 text-indigo-700', rango: '23:00 - 07:00' },
};

export const viaAdminConfig: Record<string, { label: string; icon: string }> = {
  vo: { label: 'Vía oral', icon: 'ri-capsule-line' },
  iv: { label: 'Intravenosa', icon: 'ri-drop-line' },
  im: { label: 'Intramuscular', icon: 'ri-syringe-line' },
  sc: { label: 'Subcutánea', icon: 'ri-drop-line' },
  rectal: { label: 'Rectal', icon: 'ri-indeterminate-circle-line' },
  topica: { label: 'Tópica', icon: 'ri-drop-line' },
  inhalatoria: { label: 'Inhalatoria', icon: 'ri-windy-line' },
};

export const notasEnfermeriaMock: NotaEnfermeria[] = [
  {
    id: 'ne-p1-001',
    patientId: 'p1',
    patientName: 'María Fernanda López Hernández',
    patientExpediente: 'EXP-2024-0001',
    fecha: '2026-08-21',
    horaInicio: '07:00',
    horaFin: '15:00',
    turno: 'matutino',
    enfermera: 'Lic. Carmen Vargas Ortega',
    cedulaEnfermera: 'ENF-2024-0012',
    especialidad: 'Enfermería Clínica - Triage',
    temperatura: '37.0',
    presionSistolica: '118',
    presionDiastolica: '76',
    frecuenciaCardiaca: '78',
    frecuenciaRespiratoria: '16',
    saturacionOxigeno: '98',
    glucosa: '92',
    peso: '68.5',
    talla: '1.62',
    estadoInicio: 'estable',
    estadoFin: 'mejorando',
    dolorEva: '2',
    actividades: [
      { id: 'a1', tipo: 'monitoreo', descripcion: 'Monitoreo de signos vitales cada 4 horas', hora: '07:00', resultado: 'Estables' },
      { id: 'a2', tipo: 'curacion', descripcion: 'Curación de herida operatoria en abdomen', hora: '09:30', resultado: 'Sin signos de infección, cicatrización adecuada' },
      { id: 'a3', tipo: 'educacion', descripcion: 'Educación al paciente sobre cuidados postoperatorios', hora: '11:00', resultado: 'Paciente comprende indicaciones' },
      { id: 'a4', tipo: 'movilizacion', descripcion: 'Movilización asistida para deambulación', hora: '13:00', resultado: 'Deambulación de 20m sin dificultad' },
    ],
    medicamentos: [
      { nombre: 'Paracetamol', dosis: '500mg', via: 'vo', hora: '08:00', observacion: 'Para dolor leve postoperatorio' },
      { nombre: 'Cefalexina', dosis: '500mg', via: 'vo', hora: '09:00', observacion: 'Profilaxis antibiótica' },
      { nombre: 'Enoxaparina', dosis: '40mg', via: 'sc', hora: '20:00', observacion: 'Profilaxis de TVP' },
    ],
    evolucionEnfermeria: 'Paciente estable durante todo el turno. Herida operatoria limpia y seca, sin signos de infección. Dolor controlado con analgésicos. Toleró dieta blanda sin náuseas ni vómitos. Deambulación asistida exitosa. Estado de ánimo positivo.',
    planCuidados: '1. Continuar monitoreo de signos vitales cada 4h.\n2. Mantener curaciones de herida c/24h.\n3. Movilización progresiva.\n4. Educación continua sobre cuidados en domicilio.',
    observaciones: 'Paciente pregunta por fecha de alta. Informar médico tratante.',
    firmaEnfermera: true,
  },
  {
    id: 'ne-p4-001',
    patientId: 'p4',
    patientName: 'Roberto Jiménez Vega',
    patientExpediente: 'EXP-2024-0004',
    fecha: '2026-08-21',
    horaInicio: '15:00',
    horaFin: '23:00',
    turno: 'vespertino',
    enfermera: 'Lic. Roberto Méndez Castillo',
    cedulaEnfermera: 'ENF-2023-0045',
    especialidad: 'Enfermería General',
    temperatura: '37.8',
    presionSistolica: '132',
    presionDiastolica: '84',
    frecuenciaCardiaca: '88',
    frecuenciaRespiratoria: '18',
    saturacionOxigeno: '96',
    glucosa: '145',
    peso: '82.0',
    talla: '1.75',
    estadoInicio: 'grave',
    estadoFin: 'estable',
    dolorEva: '6',
    actividades: [
      { id: 'a5', tipo: 'oxigeno', descripcion: 'Administración de oxígeno suplementario vía cánula nasal', hora: '15:15', resultado: 'SpO₂ de 92% a 96% con 2L/min' },
      { id: 'a6', tipo: 'monitoreo', descripcion: 'Monitoreo cardiaco continuo (ECG)', hora: '15:00', resultado: 'Ritmo sinusal, FC 88 lpm' },
      { id: 'a7', tipo: 'cateter', descripcion: 'Canalización periférica con catéter 18G', hora: '15:30', resultado: 'Catéter permeable, sin fuga' },
      { id: 'a8', tipo: 'alimentacion', descripcion: 'NPO por indicación médica', hora: '15:00', resultado: 'Paciente acepta indicación' },
    ],
    medicamentos: [
      { nombre: 'Nitroglicerina', dosis: '0.4mg', via: 'sc', hora: '15:20', observacion: 'Para dolor torácico' },
      { nombre: 'Aspirina', dosis: '325mg', via: 'vo', hora: '15:25', observacion: 'Carga antiplaquetaria' },
      { nombre: 'Metoprolol', dosis: '25mg', via: 'vo', hora: '18:00', observacion: 'Control de FC y PA' },
    ],
    evolucionEnfermeria: 'Paciente ingresó a urgencias por dolor torácico opresivo de 2 horas de evolución. Se inició oxigenoterapia y monitoreo cardiaco continuo. Canalización periférica exitosa. Dolor disminuyó tras administración de nitroglicerina. Estado general mejoró durante el turno. Se mantiene en observación.',
    planCuidados: '1. Monitoreo cardiaco continuo.\n2. Oxigenoterapia según SpO₂.\n3. Canalización periférica permeable.\n4. NPO hasta valoración médica.\n5. Valorar dolor con EVA c/2h.',
    observaciones: 'Familiar acompañante: esposa. Se le informa del estado del paciente.',
    firmaEnfermera: true,
  },
  {
    id: 'ne-p2-001',
    patientId: 'p2',
    patientName: 'Carlos Eduardo Martínez Ruiz',
    patientExpediente: 'EXP-2024-0002',
    fecha: '2026-08-21',
    horaInicio: '23:00',
    horaFin: '07:00',
    turno: 'nocturno',
    enfermera: 'Lic. Roberto Méndez Castillo',
    cedulaEnfermera: 'ENF-2023-0045',
    especialidad: 'Enfermería General',
    temperatura: '36.5',
    presionSistolica: '105',
    presionDiastolica: '68',
    frecuenciaCardiaca: '72',
    frecuenciaRespiratoria: '14',
    saturacionOxigeno: '99',
    glucosa: '88',
    peso: '72.0',
    talla: '1.70',
    estadoInicio: 'estable',
    estadoFin: 'estable',
    dolorEva: '1',
    actividades: [
      { id: 'a9', tipo: 'monitoreo', descripcion: 'Monitoreo de signos vitales cada 6 horas', hora: '23:00', resultado: 'Dentro de parámetros normales' },
      { id: 'a10', tipo: 'alimentacion', descripcion: 'Hidratación oral continua', hora: '00:00', resultado: 'Toleró líquidos sin problemas' },
      { id: 'a11', tipo: 'movilizacion', descripcion: 'Cambio de posición cada 2 horas', hora: '01:00', resultado: 'Sin úlceras de presión' },
      { id: 'a12', tipo: 'educacion', descripcion: 'Reforzar higiene de manos al paciente y acompañante', hora: '03:00', resultado: 'Paciente demuestra técnica correcta' },
    ],
    medicamentos: [
      { nombre: 'Ibuprofeno', dosis: '400mg', via: 'vo', hora: '02:00', observacion: 'Para dolor leve residual' },
    ],
    evolucionEnfermeria: 'Paciente estable durante turno nocturno. Descansó adecuadamente. Sin eventos adversos. Hidratación oral mantenida. Cambios de posición cada 2h para prevención de úlceras de presión. Sin quejas de dolor significativo.',
    planCuidados: '1. Continuar hidratación oral.\n2. Cambios de posición cada 2h.\n3. Valorar dolor al despertar.\n4. Preparar para alta programada en turno matutino.',
    observaciones: undefined,
    firmaEnfermera: true,
  },
  {
    id: 'ne-p12-001',
    patientId: 'p12',
    patientName: 'Adriana Lucía Fuentes Robles',
    patientExpediente: 'EXP-2024-0012',
    fecha: '2026-08-20',
    horaInicio: '07:00',
    horaFin: '15:00',
    turno: 'matutino',
    enfermera: 'Lic. Carmen Vargas Ortega',
    cedulaEnfermera: 'ENF-2024-0012',
    especialidad: 'Enfermería Clínica - Triage',
    temperatura: '37.2',
    presionSistolica: '128',
    presionDiastolica: '82',
    frecuenciaCardiaca: '76',
    frecuenciaRespiratoria: '17',
    saturacionOxigeno: '97',
    glucosa: '102',
    peso: '78.0',
    talla: '1.78',
    estadoInicio: 'mejorando',
    estadoFin: 'estable',
    dolorEva: '3',
    actividades: [
      { id: 'a13', tipo: 'monitoreo', descripcion: 'Monitoreo de signos vitales', hora: '07:00', resultado: 'Dentro de límites normales' },
      { id: 'a14', tipo: 'curacion', descripcion: 'Revisión de herida quirúrgica de rodilla', hora: '08:30', resultado: 'Sin signos de infección' },
      { id: 'a15', tipo: 'movilizacion', descripcion: 'Fisioterapia pasiva de rodilla', hora: '10:00', resultado: 'Rango de movimiento mejorado' },
    ],
    medicamentos: [
      { nombre: 'Diclofenaco', dosis: '50mg', via: 'vo', hora: '08:00', observacion: 'Antiinflamatorio' },
      { nombre: 'Tramadol', dosis: '50mg', via: 'vo', hora: '14:00', observacion: 'Analgésico para dolor postquirúrgico' },
    ],
    evolucionEnfermeria: 'Paciente postoperatorio de artroscopia de rodilla. Herida quirúrgica limpia, sin eritema ni secreción. Dolor controlado con analgésicos. Movilización progresiva favorable. Sin complicaciones.',
    planCuidados: '1. Continuar analgesia según dolor.\n2. Fisioterapia progresiva.\n3. Curaciones diarias.\n4. Educación sobre rehabilitación en domicilio.',
    observaciones: 'Paciente ansioso por regreso a actividades laborales. Se le recomienda seguir indicaciones médicas.',
    firmaEnfermera: true,
  },
  {
    id: 'ne-p7-001',
    patientId: 'p7',
    patientName: 'Ramón Arturo Gutiérrez Salinas',
    patientExpediente: 'EXP-2024-0007',
    fecha: '2026-08-20',
    horaInicio: '15:00',
    horaFin: '23:00',
    turno: 'vespertino',
    enfermera: 'Lic. Roberto Méndez Castillo',
    cedulaEnfermera: 'ENF-2023-0045',
    especialidad: 'Enfermería General',
    temperatura: '38.1',
    presionSistolica: '110',
    presionDiastolica: '70',
    frecuenciaCardiaca: '95',
    frecuenciaRespiratoria: '22',
    saturacionOxigeno: '95',
    glucosa: '110',
    peso: '60.0',
    talla: '1.60',
    estadoInicio: 'grave',
    estadoFin: 'mejorando',
    dolorEva: '7',
    actividades: [
      { id: 'a16', tipo: 'aspiracion', descripcion: 'Aspiración de secreciones vía orofaríngea', hora: '15:30', resultado: 'Secreciones amarillentas, cantidad moderada' },
      { id: 'a17', tipo: 'oxigeno', descripcion: 'Oxigenoterapia con mascarilla simple', hora: '15:00', resultado: 'SpO₂ de 90% a 95% con 5L/min' },
      { id: 'a18', tipo: 'monitoreo', descripcion: 'Monitoreo de signos vitales cada 2 horas', hora: '15:00', resultado: 'FC y FR ligeramente elevadas' },
    ],
    medicamentos: [
      { nombre: 'Ceftriaxona', dosis: '1g', via: 'iv', hora: '16:00', observacion: 'Antibiótico de amplio espectro' },
      { nombre: 'Paracetamol', dosis: '1g', via: 'iv', hora: '15:00', observacion: 'Antipirético y analgésico' },
      { nombre: 'Salbutamol', dosis: '2.5mg', via: 'inhalatoria', hora: '17:00', observacion: 'Nebulización para broncoespasmo' },
    ],
    evolucionEnfermeria: 'Paciente con neumonía bacteriana en tratamiento antibiótico. Fiebre controlada con antipiréticos. Secreciones aspiradas sin complicaciones. Oxigenoterapia mantenida. Respuesta favorable al tratamiento.',
    planCuidados: '1. Continuar antibioterapia.\n2. Aspiración de secreciones según necesidad.\n3. Oxigenoterapia ajustada a SpO₂.\n4. Hidratación intravenosa.\n5. Fomentar tos efectiva.',
    observaciones: 'Familiar solicita información sobre evolución. Se le informa de mejora progresiva.',
    firmaEnfermera: true,
  },
];