import type { TriageRecord } from '@/mocks/triage';

/**
 * @deprecated Escala de 4 colores del prototipo. No es la escala de producto
 * (doc 06 §63: configurable; demo = 5 niveles sintéticos). Solo para pantallas
 * que aún leen mocks; no usarla en triage/urgencias/API.
 */
export type NivelUrgencia = 'rojo' | 'naranja' | 'amarillo' | 'verde';
export type EstadoUrgencia = 'esperando' | 'en_atencion' | 'observacion' | 'alta';
export type DestinoAlta = 'domicilio' | 'hospitalizacion' | 'consulta_externa' | 'referencia' | 'quirofano';

export interface Urgencia {
  id: string;
  patientId: string;
  patientName: string;
  patientExpediente: string;
  fecha: string;
  horaLlegada: string;
  horaAtencion?: string;
  horaAlta?: string;
  nivelUrgencia: NivelUrgencia;
  estado: EstadoUrgencia;
  motivo: string;
  areaUrgencia: string;
  doctorId?: string;
  doctorName?: string;
  signosVitales: TriageRecord | null;
  notaMedica: string;
  destinoAlta: DestinoAlta | null;
  contactoEmergencia: string;
  genero: 'M' | 'F';
  edad: number;
  viaAcceso: 'caminando' | 'ambulancia' | 'referencia' | 'policia';
}

export const urgenciasMock: Urgencia[] = [
  {
    id: 'urg-001',
    patientId: 'p4',
    patientName: 'Roberto Jiménez Vega',
    patientExpediente: 'EXP-2024-0004',
    fecha: '2026-08-20',
    horaLlegada: '11:10',
    nivelUrgencia: 'naranja',
    estado: 'esperando',
    motivo: 'Paciente masculino de 45 años con dolor torácico opresivo de 3 horas de evolución, irradiado a brazo izquierdo. Refiere episodio similar hace 1 semana de menor intensidad. Antecedente de tabaquismo (20 cigarrillos/día por 25 años). Niega disnea, palpitaciones o síncope.',
    areaUrgencia: 'Área de Urgencias',
    signosVitales: null,
    notaMedica: '',
    destinoAlta: null,
    contactoEmergencia: 'Lucía Vega (esposa)',
    genero: 'M',
    edad: 45,
    viaAcceso: 'caminando',
  },
  {
    id: 'urg-002',
    patientId: 'p6',
    patientName: 'Lucía Valentina Rojas Meza',
    patientExpediente: 'EXP-2024-0006',
    fecha: '2026-08-20',
    horaLlegada: '11:15',
    nivelUrgencia: 'amarillo',
    estado: 'en_atencion',
    motivo: 'Paciente femenina de 7 años con crisis asmática moderada, sibilancias audibles a distancia, tiraje intercostal leve y tos seca. Madre refiere exposición a polvo durante la mañana. Antecedente de asma bronquial con tratamiento intermitente.',
    areaUrgencia: 'Área de Urgencias Pediátrica',
    doctorName: 'Dra. Patricia Mendoza Ríos',
    signosVitales: null,
    notaMedica: '',
    destinoAlta: null,
    contactoEmergencia: 'Mariana Meza (madre)',
    genero: 'F',
    edad: 7,
    viaAcceso: 'ambulancia',
  },
  {
    id: 'urg-003',
    patientId: 'p7',
    patientName: 'Ramón Arturo Gutiérrez Salinas',
    patientExpediente: 'EXP-2024-0007',
    fecha: '2026-08-20',
    horaLlegada: '11:40',
    nivelUrgencia: 'naranja',
    estado: 'esperando',
    motivo: 'Paciente masculino de 71 años con exacerbación de EPOC, disnea en reposo, uso de músculos accesorios y saturación baja en domicilio. Requiere oxígeno suplementario continuo. Antecedente de tabaquismo de 40 años.',
    areaUrgencia: 'Área de Urgencias',
    signosVitales: null,
    notaMedica: '',
    destinoAlta: null,
    contactoEmergencia: 'Teresa Salinas (hija)',
    genero: 'M',
    edad: 71,
    viaAcceso: 'ambulancia',
  },
  {
    id: 'urg-004',
    patientId: 'p9',
    patientName: 'Miguel Ángel Contreras Peña',
    patientExpediente: 'EXP-2024-0009',
    fecha: '2026-08-20',
    horaLlegada: '12:05',
    nivelUrgencia: 'rojo',
    estado: 'en_atencion',
    motivo: 'Paciente masculino de 61 años con dolor precordial opresivo de 40 minutos de evolución, irradiado a mandíbula, con diaforesis profusa y náusea. Antecedente de infarto agudo al miocardio en 2023. Se activa código de cardiología.',
    areaUrgencia: 'Área de Choque',
    doctorName: 'Dr. Alejandro García Mendoza',
    signosVitales: null,
    notaMedica: '',
    destinoAlta: null,
    contactoEmergencia: 'Rosa Peña (esposa)',
    genero: 'M',
    edad: 61,
    viaAcceso: 'ambulancia',
  },
  {
    id: 'urg-005',
    patientId: 'p17',
    patientName: 'Martín Eduardo Salazar Luna',
    patientExpediente: 'EXP-2024-0017',
    fecha: '2026-08-20',
    horaLlegada: '12:25',
    nivelUrgencia: 'verde',
    estado: 'esperando',
    motivo: 'Paciente masculino de 39 años con esguince de tobillo derecho por inversión forzada tras caída en escaleras. Dolor a la palpación en maléolo lateral, edema moderado, sin deformidad. Marcha con apoyo parcial.',
    areaUrgencia: 'Área de Urgencias',
    signosVitales: null,
    notaMedica: '',
    destinoAlta: null,
    contactoEmergencia: 'Daniela Salazar (esposa)',
    genero: 'M',
    edad: 39,
    viaAcceso: 'caminando',
  },
  {
    id: 'urg-006',
    patientId: 'p14',
    patientName: 'Beatriz Elena Villanueva Mora',
    patientExpediente: 'EXP-2024-0014',
    fecha: '2026-08-20',
    horaLlegada: '10:20',
    nivelUrgencia: 'amarillo',
    estado: 'observacion',
    motivo: 'Paciente femenina de 66 años con malestar general, hipotensión y calambres musculares tras sesión de hemodiálisis. Refiere vértigo y debilidad. Antecedente de insuficiencia renal crónica en diálisis.',
    areaUrgencia: 'Área de Observación',
    signosVitales: null,
    notaMedica: 'Se mantiene en observación con monitoreo de signos vitales y reposición hídrica.',
    destinoAlta: null,
    contactoEmergencia: 'Jorge Villanueva (hijo)',
    genero: 'F',
    edad: 66,
    viaAcceso: 'referencia',
  },
  {
    id: 'urg-007',
    patientId: 'p16',
    patientName: 'Regina Carolina Aguilar Soto',
    patientExpediente: 'EXP-2024-0016',
    fecha: '2026-08-20',
    horaLlegada: '12:15',
    nivelUrgencia: 'verde',
    estado: 'esperando',
    motivo: 'Paciente femenina de 58 años con cefalea intensa de tipo migrañoso, fotofobia y náusea de 6 horas de evolución. Antecedente de migraña crónica. No responde a analgésicos habituales en domicilio.',
    areaUrgencia: 'Área de Urgencias',
    signosVitales: null,
    notaMedica: '',
    destinoAlta: null,
    contactoEmergencia: 'Luis Soto (esposo)',
    genero: 'F',
    edad: 58,
    viaAcceso: 'caminando',
  },
  {
    id: 'urg-008',
    patientId: 'p10',
    patientName: 'Sofía Renata Delgado Márquez',
    patientExpediente: 'EXP-2024-0010',
    fecha: '2026-08-20',
    horaLlegada: '11:30',
    nivelUrgencia: 'verde',
    estado: 'en_atencion',
    motivo: 'Paciente femenina de 34 años con brote de dermatitis atópica, prurito intenso y lesiones eritematosas en pliegues. Sin compromiso respiratorio. Antecedente de dermatitis atópica crónica y alergia al látex.',
    areaUrgencia: 'Área de Urgencias',
    doctorName: 'Dr. Eduardo Ponce León',
    signosVitales: null,
    notaMedica: '',
    destinoAlta: null,
    contactoEmergencia: 'Andrés Márquez (padre)',
    genero: 'F',
    edad: 34,
    viaAcceso: 'caminando',
  },
  {
    id: 'urg-009',
    patientId: 'p11',
    patientName: 'Daniel Alejandro Cruz Santana',
    patientExpediente: 'EXP-2024-0011',
    fecha: '2026-08-20',
    horaLlegada: '11:50',
    nivelUrgencia: 'verde',
    estado: 'esperando',
    motivo: 'Paciente masculino de 41 años con crisis de ansiedad, palpitaciones, sensación de falta de aire y opresión torácica de inicio súbito. Antecedente de trastorno de ansiedad generalizada. Signos vitales por confirmar.',
    areaUrgencia: 'Área de Urgencias',
    signosVitales: null,
    notaMedica: '',
    destinoAlta: null,
    contactoEmergencia: 'Paola Santana (hermana)',
    genero: 'M',
    edad: 41,
    viaAcceso: 'caminando',
  },
  {
    id: 'urg-010',
    patientId: 'p5',
    patientName: 'Jorge Alberto Ramírez Duarte',
    patientExpediente: 'EXP-2024-0005',
    fecha: '2026-08-20',
    horaLlegada: '10:55',
    nivelUrgencia: 'naranja',
    estado: 'esperando',
    motivo: 'Paciente masculino de 55 años con descontrol glucémico, glucosa capilar elevada, mareo y visión borrosa. Antecedente de diabetes mellitus tipo 2 insulinodependiente. Refiere omisión de dosis de insulina por 2 días.',
    areaUrgencia: 'Área de Urgencias',
    signosVitales: null,
    notaMedica: '',
    destinoAlta: null,
    contactoEmergencia: 'Verónica Duarte (esposa)',
    genero: 'M',
    edad: 55,
    viaAcceso: 'ambulancia',
  },
  {
    id: 'urg-011',
    patientId: 'p18',
    patientName: 'Emilio Santiago Herrera Ruiz',
    patientExpediente: 'EXP-2024-0018',
    fecha: '2026-08-20',
    horaLlegada: '09:30',
    nivelUrgencia: 'naranja',
    estado: 'en_atencion',
    motivo: 'Paciente masculino de 4 años con fiebre de 39.8°C de 2 días, irritabilidad y rechazo a la vía oral. Madre refiere que no cede con antipiréticos. Se descarta foco infeccioso evidente al momento.',
    areaUrgencia: 'Área de Urgencias Pediátrica',
    doctorName: 'Dra. Patricia Mendoza Ríos',
    signosVitales: null,
    notaMedica: '',
    destinoAlta: null,
    contactoEmergencia: 'Rocío Ruiz (madre)',
    genero: 'M',
    edad: 4,
    viaAcceso: 'caminando',
  },
  {
    id: 'urg-012',
    patientId: 'p19',
    patientName: 'Graciela Josefina Navarro Peña',
    patientExpediente: 'EXP-2024-0019',
    fecha: '2026-08-20',
    horaLlegada: '08:45',
    nivelUrgencia: 'amarillo',
    estado: 'observacion',
    motivo: 'Paciente femenina de 82 años con caída desde su propia altura en domicilio, contusión en cadera izquierda y dolor a la movilización. Se solicita radiografía para descartar fractura.',
    areaUrgencia: 'Área de Observación',
    signosVitales: null,
    notaMedica: 'Pendiente resultado de radiografía de cadera.',
    destinoAlta: null,
    contactoEmergencia: 'Mario Navarro (hijo)',
    genero: 'F',
    edad: 82,
    viaAcceso: 'ambulancia',
  },
  {
    id: 'urg-013',
    patientId: 'p8',
    patientName: 'Valeria Fernanda Castillo Núñez',
    patientExpediente: 'EXP-2024-0008',
    fecha: '2026-08-20',
    horaLlegada: '12:35',
    nivelUrgencia: 'naranja',
    estado: 'en_atencion',
    motivo: 'Paciente femenina de 28 años con embarazo de 28 semanas, refiere contracciones uterinas regulares y dolor abdominal bajo. Niega pérdida de líquido o sangrado transvaginal. Se valora riesgo de parto pretérmino.',
    areaUrgencia: 'Área de Urgencias Obstétrica',
    doctorName: 'Dra. Gabriela Herrera López',
    signosVitales: null,
    notaMedica: '',
    destinoAlta: null,
    contactoEmergencia: 'Raúl Núñez (esposo)',
    genero: 'F',
    edad: 28,
    viaAcceso: 'ambulancia',
  },
  {
    id: 'urg-014',
    patientId: 'p20',
    patientName: 'Óscar Julián Vega Domínguez',
    patientExpediente: 'EXP-2024-0020',
    fecha: '2026-08-20',
    horaLlegada: '10:10',
    nivelUrgencia: 'amarillo',
    estado: 'esperando',
    motivo: 'Paciente masculino de 29 años con cuadro de intoxicación alimentaria, vómito y diarrea de 12 horas de evolución, con datos de deshidratación leve. Refiere consumo de mariscos el día previo.',
    areaUrgencia: 'Área de Urgencias',
    signosVitales: null,
    notaMedica: '',
    destinoAlta: null,
    contactoEmergencia: 'Martha Domínguez (madre)',
    genero: 'M',
    edad: 29,
    viaAcceso: 'caminando',
  },
  {
    id: 'urg-015',
    patientId: 'p21',
    patientName: 'Karla Fernanda Ríos Pacheco',
    patientExpediente: 'EXP-2024-0021',
    fecha: '2026-08-20',
    horaLlegada: '08:15',
    horaAtencion: '08:40',
    horaAlta: '09:20',
    nivelUrgencia: 'verde',
    estado: 'alta',
    motivo: 'Paciente femenina de 24 años con herida cortante superficial en antebrazo izquierdo por accidente doméstico. Se realiza aseo quirúrgico, sutura y aplicación de toxoide tetánico.',
    areaUrgencia: 'Área de Urgencias',
    doctorName: 'Dr. Fernando Castillo Vega',
    signosVitales: null,
    notaMedica: 'Se realiza sutura con 4 puntos. Se indica retiro en 7 días.',
    destinoAlta: 'domicilio',
    contactoEmergencia: 'Renata Pacheco (hermana)',
    genero: 'F',
    edad: 24,
    viaAcceso: 'caminando',
  },
  {
    id: 'urg-016',
    patientId: 'p22',
    patientName: 'Hugo Alberto Montiel Castro',
    patientExpediente: 'EXP-2024-0022',
    fecha: '2026-08-20',
    horaLlegada: '12:45',
    nivelUrgencia: 'rojo',
    estado: 'en_atencion',
    motivo: 'Paciente masculino de 35 años con crisis convulsiva tónico-clónica generalizada de 3 minutos, con período postictal. Antecedente de epilepsia en tratamiento irregular. Se activa protocolo de atención neurológica.',
    areaUrgencia: 'Área de Choque',
    doctorName: 'Dr. Alejandro García Mendoza',
    signosVitales: null,
    notaMedica: '',
    destinoAlta: null,
    contactoEmergencia: 'Laura Castro (esposa)',
    genero: 'M',
    edad: 35,
    viaAcceso: 'ambulancia',
  },
];

export const urgenciaConfig: Record<NivelUrgencia, {
  label: string;
  color: string;
  bg: string;
  border: string;
  text: string;
  icon: string;
  description: string;
}> = {
  rojo: {
    label: 'Emergencia',
    color: 'bg-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: 'ri-heart-pulse-fill',
    description: 'Atención inmediata. Amenaza inminente para la vida.',
  },
  naranja: {
    label: 'Urgencia',
    color: 'bg-orange-500',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    icon: 'ri-alert-fill',
    description: 'Atención en menos de 15 min. Riesgo de deterioro.',
  },
  amarillo: {
    label: 'Preferente',
    color: 'bg-amber-400',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: 'ri-time-fill',
    description: 'Atención en menos de 60 min. Condición estable.',
  },
  verde: {
    label: 'No urgente',
    color: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    icon: 'ri-check-line',
    description: 'Atención en menos de 120 min. No hay riesgo inminente.',
  },
};

export const estadoUrgenciaConfig: Record<EstadoUrgencia, {
  label: string;
  variant: 'success' | 'warning' | 'info' | 'danger';
  color: string;
  bg: string;
  dot: string;
}> = {
  esperando: {
    label: 'Esperando',
    variant: 'warning',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    dot: 'bg-amber-500',
  },
  en_atencion: {
    label: 'En atención',
    variant: 'danger',
    color: 'text-red-700',
    bg: 'bg-red-500/10',
    dot: 'bg-red-500',
  },
  observacion: {
    label: 'Observación',
    variant: 'info',
    color: 'text-sky-700',
    bg: 'bg-sky-50',
    dot: 'bg-sky-500',
  },
  alta: {
    label: 'Alta',
    variant: 'success',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    dot: 'bg-emerald-500',
  },
};

export const destinoAltaConfig: Record<DestinoAlta, { label: string; icon: string; color: string }> = {
  domicilio: { label: 'Domicilio', icon: 'ri-home-line', color: 'text-emerald-600' },
  hospitalizacion: { label: 'Hospitalización', icon: 'ri-hotel-bed-line', color: 'text-sky-600' },
  consulta_externa: { label: 'Consulta externa', icon: 'ri-stethoscope-line', color: 'text-primary-600' },
  referencia: { label: 'Referencia', icon: 'ri-arrow-right-up-line', color: 'text-amber-600' },
  quirofano: { label: 'Quirófano', icon: 'ri-surgical-mask-line', color: 'text-red-600' },
};

export const viaAccesoConfig: Record<Urgencia['viaAcceso'], { label: string; icon: string }> = {
  caminando: { label: 'Caminando', icon: 'ri-walk-line' },
  ambulancia: { label: 'Ambulancia', icon: 'ri-truck-line' },
  referencia: { label: 'Referencia', icon: 'ri-exchange-line' },
  policia: { label: 'Policía', icon: 'ri-shield-line' },
};

export const getUrgenciasByEstado = (estado: EstadoUrgencia): Urgencia[] =>
  urgenciasMock.filter((u) => u.estado === estado);

export const getUrgenciasByNivel = (nivel: NivelUrgencia): Urgencia[] =>
  urgenciasMock.filter((u) => u.nivelUrgencia === nivel);

export const getUrgenciaById = (id: string): Urgencia | undefined =>
  urgenciasMock.find((u) => u.id === id);