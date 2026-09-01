export interface ConsentimientoInformado {
  id: string;
  patientId: string;
  patientName: string;
  patientExpediente: string;
  tipo: 'general' | 'procedimiento' | 'datos_personales' | 'imagenes' | 'menor_edad';
  titulo: string;
  descripcion: string;
  riesgos?: string;
  beneficios?: string;
  alternativas?: string;
  consentido: boolean;
  fechaFirma: string;
  horaFirma: string;
  firmadoPor: string;
  testigo?: string;
  observaciones?: string;
  documentoUrl?: string;
  estado: 'pendiente' | 'firmado' | 'revocado' | 'vencido';
}

export const tipoConsentimientoConfig: Record<ConsentimientoInformado['tipo'], { label: string; icon: string; bg: string; text: string }> = {
  general: { label: 'Consentimiento General', icon: 'ri-file-shield-line', bg: 'bg-primary-50', text: 'text-primary-700' },
  procedimiento: { label: 'Procedimiento Médico', icon: 'ri-surgical-mask-line', bg: 'bg-accent-50', text: 'text-accent-700' },
  datos_personales: { label: 'Datos Personales (LFPDPPP)', icon: 'ri-shield-keyhole-line', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  imagenes: { label: 'Imágenes Clínicas', icon: 'ri-image-line', bg: 'bg-amber-50', text: 'text-amber-700' },
  menor_edad: { label: 'Consentimiento Menor de Edad', icon: 'ri-parent-line', bg: 'bg-rose-50', text: 'text-rose-700' },
};

export const consentimientosMock: ConsentimientoInformado[] = [
  {
    id: 'ci-p1-001',
    patientId: 'p1',
    patientName: 'María Fernanda López Hernández',
    patientExpediente: 'EXP-2024-0001',
    tipo: 'general',
    titulo: 'Consentimiento General para Atención Médica',
    descripcion: 'Autorizo a MediCore Clínica para proporcionarme atención médica, incluyendo evaluación, diagnóstico, tratamiento y seguimiento de mi condición de salud. Entiendo que se me explicarán los riesgos y beneficios de cualquier procedimiento antes de su realización.',
    riesgos: 'Riesgos generales de atención médica: reacciones adversas a medicamentos, complicaciones de procedimientos menores, resultados no esperados de tratamientos.',
    beneficios: 'Acceso a atención médica integral, diagnóstico oportuno, tratamiento adecuado y seguimiento de mi salud.',
    alternativas: 'Puedo optar por no recibir el tratamiento propuesto, buscar una segunda opinión o acudir a otra unidad médica.',
    consentido: true,
    fechaFirma: '2024-03-15',
    horaFirma: '10:30',
    firmadoPor: 'María Fernanda López Hernández',
    testigo: 'Lic. Carmen Vargas Ortega',
    estado: 'firmado',
  },
  {
    id: 'ci-p1-002',
    patientId: 'p1',
    patientName: 'María Fernanda López Hernández',
    patientExpediente: 'EXP-2024-0001',
    tipo: 'datos_personales',
    titulo: 'Consentimiento para Tratamiento de Datos Personales Sensibles',
    descripcion: 'Con fundamento en la LFPDPPP, autorizo de manera expresa el tratamiento de mis datos personales sensibles (información de salud, resultados de estudios, diagnósticos, tratamientos) para fines de prestación de servicios de salud, facturación, calidad y estadística clínica.',
    riesgos: 'Riesgo mínimo de acceso no autorizado; la clínica se compromete a salvaguardar mi información conforme a la NOM-024-SSA3-2012.',
    beneficios: 'Mejora en la continuidad de mi atención médica, historial clínico completo y facturación correcta.',
    consentido: true,
    fechaFirma: '2024-03-15',
    horaFirma: '10:35',
    firmadoPor: 'María Fernanda López Hernández',
    testigo: 'Lic. Carmen Vargas Ortega',
    estado: 'firmado',
  },
  {
    id: 'ci-p2-001',
    patientId: 'p2',
    patientName: 'Carlos Eduardo Martínez Ruiz',
    patientExpediente: 'EXP-2024-0002',
    tipo: 'general',
    titulo: 'Consentimiento General para Atención Médica',
    descripcion: 'Autorizo a MediCore Clínica para proporcionarme atención médica integral, incluyendo exploración física, diagnóstico, prescripción de medicamentos y estudios de gabinete.',
    consentido: true,
    fechaFirma: '2025-01-10',
    horaFirma: '09:15',
    firmadoPor: 'Carlos Eduardo Martínez Ruiz',
    estado: 'firmado',
  },
  {
    id: 'ci-p2-002',
    patientId: 'p2',
    patientName: 'Carlos Eduardo Martínez Ruiz',
    patientExpediente: 'EXP-2024-0002',
    tipo: 'imagenes',
    titulo: 'Consentimiento para Captura y Uso de Imágenes Clínicas',
    descripcion: 'Autorizo la captura, almacenamiento y uso de imágenes clínicas (fotografías dermatológicas, radiografías, tomografías, resonancias) como parte de mi expediente clínico electrónico.',
    consentido: true,
    fechaFirma: '2025-01-10',
    horaFirma: '09:20',
    firmadoPor: 'Carlos Eduardo Martínez Ruiz',
    estado: 'firmado',
  },
  {
    id: 'ci-p3-001',
    patientId: 'p3',
    patientName: 'Ana Gabriela Sánchez Torres',
    patientExpediente: 'EXP-2024-0003',
    tipo: 'general',
    titulo: 'Consentimiento General para Atención Médica',
    descripcion: 'Autorizo la atención médica en MediCore Clínica, incluyendo la elaboración de mi expediente clínico conforme a la NOM-004-SSA3-2012.',
    consentido: true,
    fechaFirma: '2024-06-20',
    horaFirma: '14:00',
    firmadoPor: 'Ana Gabriela Sánchez Torres',
    testigo: 'Dra. Patricia Mendoza Ríos',
    estado: 'firmado',
  },
  {
    id: 'ci-p4-001',
    patientId: 'p4',
    patientName: 'Roberto Jiménez Vega',
    patientExpediente: 'EXP-2024-0004',
    tipo: 'procedimiento',
    titulo: 'Consentimiento para Electrocardiograma de Esfuerzo',
    descripcion: 'Autorizo la realización de una prueba de esfuerzo cardíaco con monitoreo electrocardiográfico continuo. Se me explicó que la prueba consiste en caminar/correr en cinta mientras se monitorea la actividad eléctrica del corazón.',
    riesgos: 'Dolor torácico, arritmias, hipotensión, infarto agudo al miocardio (riesgo <0.1%), muerte súbita (riesgo <0.01%).',
    beneficios: 'Detección de isquemia miocárdica inducible, valoración funcional cardíaca, estratificación de riesgo cardiovascular.',
    alternativas: 'Test farmacológico con dobutamina, tomografía coronaria, cateterismo cardíaco diagnóstico.',
    consentido: true,
    fechaFirma: '2026-08-20',
    horaFirma: '14:05',
    firmadoPor: 'Roberto Jiménez Vega',
    testigo: 'Dra. Patricia Mendoza Ríos',
    observaciones: 'Paciente informado sobre riesgo por antecedente de alerta cardíaca. Acepta procedimiento con supervisión médica continua.',
    estado: 'firmado',
  },
  {
    id: 'ci-p6-001',
    patientId: 'p6',
    patientName: 'Lucía Valentina Rojas Meza',
    patientExpediente: 'EXP-2024-0006',
    tipo: 'menor_edad',
    titulo: 'Consentimiento para Menor de Edad (Asma)',
    descripcion: 'Como tutor legal de Lucía Valentina Rojas Meza (7 años), autorizo la atención médica pediátrica, administración de medicamentos (incluyendo inhaladores y corticoides), y toma de signos vitales.',
    riesgos: 'Reacciones adversas a medicamentos pediátricos, efectos de corticoides inhalados a largo plazo (tasa de crecimiento).',
    beneficios: 'Control de asma, prevención de crisis, calidad de vida mejorada.',
    consentido: true,
    fechaFirma: '2025-03-08',
    horaFirma: '11:00',
    firmadoPor: 'Mariana Meza (Madre)',
    testigo: 'Lic. Carmen Vargas Ortega',
    estado: 'firmado',
  },
  {
    id: 'ci-p8-001',
    patientId: 'p8',
    patientName: 'Valeria Fernanda Castillo Núñez',
    patientExpediente: 'EXP-2024-0008',
    tipo: 'datos_personales',
    titulo: 'Consentimiento para Datos Personales - Embarazo',
    descripcion: 'Autorizo el tratamiento de mis datos personales sensibles relacionados con mi embarazo, incluyendo información gineco-obstétrica, resultados de ultrasonidos y pruebas prenatales.',
    consentido: true,
    fechaFirma: '2026-02-14',
    horaFirma: '10:00',
    firmadoPor: 'Valeria Fernanda Castillo Núñez',
    testigo: 'Dra. Gabriela Herrera López',
    estado: 'firmado',
  },
  {
    id: 'ci-p18-001',
    patientId: 'p18',
    patientName: 'Emilio Santiago Herrera Ruiz',
    patientExpediente: 'EXP-2024-0018',
    tipo: 'menor_edad',
    titulo: 'Consentimiento para Menor de Edad (Pediatría)',
    descripcion: 'Como madre de Emilio Santiago Herrera Ruiz (4 años), autorizo la atención médica pediátrica, incluyendo toma de muestras biológicas, administración de antibióticos y estudios de imagen.',
    consentido: true,
    fechaFirma: '2026-08-20',
    horaFirma: '09:40',
    firmadoPor: 'Rocío Ruiz (Madre)',
    testigo: 'Dra. Patricia Mendoza Ríos',
    estado: 'firmado',
  },
  {
    id: 'ci-p20-001',
    patientId: 'p20',
    patientName: 'Óscar Julián Vega Domínguez',
    patientExpediente: 'EXP-2024-0020',
    tipo: 'general',
    titulo: 'Consentimiento General para Atención Médica',
    descripcion: 'Autorizo la atención médica en urgencias, incluyendo procedimientos diagnósticos y terapéuticos emergentes.',
    consentido: true,
    fechaFirma: '2026-08-20',
    horaFirma: '10:20',
    firmadoPor: 'Óscar Julián Vega Domínguez',
    estado: 'firmado',
  },
  {
    id: 'ci-p21-001',
    patientId: 'p21',
    patientName: 'Karla Fernanda Ríos Pacheco',
    patientExpediente: 'EXP-2024-0021',
    tipo: 'general',
    titulo: 'Consentimiento General para Atención Médica',
    descripcion: 'Autorizo la atención médica en MediCore Clínica.',
    consentido: false,
    fechaFirma: '',
    horaFirma: '',
    firmadoPor: '',
    estado: 'pendiente',
  },
];

export const getConsentimientosByPatient = (patientId: string): ConsentimientoInformado[] =>
  consentimientosMock.filter((c) => c.patientId === patientId);

export const plantillasConsentimiento: Record<string, string> = {
  general: `CONSENTIMIENTO GENERAL PARA ATENCIÓN MÉDICA

Yo, {paciente}, con expediente {expediente}, declaro que:

1. He sido informado(a) sobre los servicios médicos que ofrece MediCore Clínica.
2. Autorizo a los profesionales de la salud de esta institución a realizar la evaluación, diagnóstico y tratamiento médico que consideren necesario para mi atención.
3. Entiendo que se me explicarán los riesgos y beneficios de cualquier procedimiento invasivo antes de su realización.
4. Me comprometo a proporcionar información veraz sobre mi historial médico, alergias y medicamentos que consumo.
5. Entiendo que puedo revocar este consentimiento en cualquier momento sin afectar la calidad de la atención.

Fecha: {fecha}  Hora: {hora}

_________________________________
Firma del paciente o tutor legal`,
  datos_personales: `CONSENTIMIENTO PARA TRATAMIENTO DE DATOS PERSONALES SENSIBLES

Con fundamento en la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), autorizo de manera expresa el tratamiento de mis datos personales sensibles, incluyendo:

• Información de salud y condiciones médicas
• Resultados de estudios de laboratorio e imagen
• Diagnósticos y tratamientos
• Información de contacto y facturación

Finalidades del tratamiento:
a) Prestación de servicios de salud
b) Expediente clínico electrónico (NOM-024-SSA3-2012)
c) Facturación y cobranza
d) Estadística y mejora continua de calidad

Derechos ARCO: Puedo ejercer mis derechos de Acceso, Rectificación, Cancelación y Oposición ante la Unidad de Protección de Datos de MediCore Clínica.`,
  procedimiento: `CONSENTIMIENTO PARA PROCEDIMIENTO MÉDICO

Procedimiento: {procedimiento}
Paciente: {paciente}  Expediente: {expediente}

He sido informado(a) sobre:
• Naturaleza y propósito del procedimiento
• Riesgos y complicaciones potenciales
• Beneficios esperados
• Alternativas disponibles
• Consecuencias de no realizarlo

Declaro que he comprendido la información y autorizo la realización del procedimiento.`,
  menor_edad: `CONSENTIMIENTO PARA MENOR DE EDAD

Yo, {tutor}, identificado(a) como tutor legal de {menor} (menor de edad), autorizo:

• La atención médica necesaria para el menor
• La administración de medicamentos según prescripción médica
• La realización de estudios diagnósticos indicados
• La información de salud al personal médico autorizado

Entiendo que se actuará siempre en beneficio del menor y conforme al interés superior del mismo.`,
};