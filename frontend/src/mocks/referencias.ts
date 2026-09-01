export interface ReferenciaMedica {
  id: string;
  patientId: string;
  patientName: string;
  patientExpediente: string;
  tipo: 'referencia' | 'contrarreferencia';
  fecha: string;
  hora: string;
  origen: string;
  destino: string;
  motivo: string;
  diagnosticoResumen: string;
  tratamientoPrevio: string;
  estudiosRealizados: string[];
  estudiosPendientes: string[];
  recomendaciones: string;
  medicoRemitente: string;
  cedulaRemitente: string;
  medicoReceptor?: string;
  cedulaReceptor?: string;
  urgencia: 'programada' | 'urgente' | 'emergencia';
  transporte: 'ambulancia' | 'particular' | 'publico';
  acompanante: string;
  estado: 'enviada' | 'recibida' | 'en_atencion' | 'concluida' | 'cancelada';
  fechaRespuesta?: string;
  resumenRespuesta?: string;
  contactoDestino: string;
}

export const urgenciaConfigRef: Record<ReferenciaMedica['urgencia'], { label: string; bg: string; text: string; icon: string }> = {
  programada: { label: 'Programada', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'ri-calendar-check-line' },
  urgente: { label: 'Urgente', bg: 'bg-amber-50', text: 'text-amber-700', icon: 'ri-time-line' },
  emergencia: { label: 'Emergencia', bg: 'bg-red-50', text: 'text-red-700', icon: 'ri-alert-line' },
};

export const estadoRefConfig: Record<ReferenciaMedica['estado'], { label: string; bg: string; text: string }> = {
  enviada: { label: 'Enviada', bg: 'bg-amber-100', text: 'text-amber-700' },
  recibida: { label: 'Recibida', bg: 'bg-sky-100', text: 'text-sky-700' },
  en_atencion: { label: 'En atención', bg: 'bg-primary-100', text: 'text-primary-700' },
  concluida: { label: 'Concluida', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  cancelada: { label: 'Cancelada', bg: 'bg-secondary-100', text: 'text-foreground-500' },
};

export const referenciasMock: ReferenciaMedica[] = [
  {
    id: 'ref-p9-001',
    patientId: 'p9',
    patientName: 'Miguel Ángel Contreras Peña',
    patientExpediente: 'EXP-2024-0009',
    tipo: 'referencia',
    fecha: '2026-08-20',
    hora: '12:20',
    origen: 'MediCore Clínica - Medicina General',
    destino: 'Hospital Cardiovascular del Sur - Unidad de Cuidados Coronarios',
    motivo: 'Síndrome coronario agudo con elevación del ST (SCACEST). Paciente con dolor precordial opresivo de 40 min de evolución, irradiado a mandíbula, con diaforesis profusa. Antecedente de IAM en 2023 con stent en DA.',
    diagnosticoResumen: 'I21.9 - Infarto agudo del miocardio sin especificación de localización. Angina inestable refractaria. Riesgo cardiovascular alto (puntaje GRACE >140).',
    tratamientoPrevio: 'AAS 325mg VO, Clopidogrel 600mg carga, Enoxaparina 1mg/kg SC, Atorvastatina 80mg VO, Nitroglicerina SL. Oxígeno suplementario 4L/min.',
    estudiosRealizados: ['Electrocardiograma 12 derivaciones: supradesnivel ST en V1-V4', 'Troponina I: 2.8 ng/mL (elevada)', 'CK-MB: 45 U/L (elevada)', 'RX tórax: sin datos de edema agudo de pulmón'],
    estudiosPendientes: ['Cateterismo cardíaco urgente', 'Angiografía coronaria', 'Eco transtorácica post-revascularización'],
    recomendaciones: '1. Activar código infarto (Door-to-balloon <90 min). 2. Valorar revascularización primaria percutánea. 3. Continuar doble antiagregación. 4. Vigilar arritmias en primeras 24-48h.',
    medicoRemitente: 'Dr. Alejandro García Mendoza',
    cedulaRemitente: 'CED-09876543',
    urgencia: 'emergencia',
    transporte: 'ambulancia',
    acompanante: 'Rosa Peña (esposa)',
    estado: 'enviada',
    contactoDestino: 'Urgencias HCS: 55-8901-2345 / Cardiología: 55-8901-2346',
  },
  {
    id: 'ref-p7-001',
    patientId: 'p7',
    patientName: 'Ramón Arturo Gutiérrez Salinas',
    patientExpediente: 'EXP-2024-0007',
    tipo: 'referencia',
    fecha: '2026-08-20',
    hora: '11:50',
    origen: 'MediCore Clínica - Medicina General',
    destino: 'Hospital General de Zona 27 - Servicio de Neumología',
    motivo: 'Exacerbación aguda de EPOC GOLD D con insuficiencia respiratoria tipo II. Paciente con disnea en reposo, uso de músculos accesorios, confusión leve. SpO₂ 88% con oxígeno 2L/min.',
    diagnosticoResumen: 'J44.1 - EPOC con exacerbación aguda. J96.1 - Insuficiencia respiratoria crónica tipo II. Cor pulmonale leve.',
    tratamientoPrevio: 'Salbutamol nebulizado, Ipratropio nebulizado, Prednisona 40mg VO, Oxígeno suplementario 2L/min.',
    estudiosRealizados: ['Gases arteriales: pH 7.32, pCO₂ 58, pO₂ 62, HCO₃ 30', 'RX tórax: hiperinsuflación, aplanamiento diafragmático', 'Hemograma: leucocitosis 14,000'],
    estudiosPendientes: ['TC de tórax alta resolución', 'Cultivo de esputo', 'Espirometría post-estabilización'],
    recomendaciones: '1. Ingreso a UCI para ventilación no invasiva (BiPAP). 2. Antibiótico de amplio espectro por sospecha de infección respiratoria. 3. Broncodilatadores continuos. 4. Vigilar retención de CO₂ con oxigenación controlada.',
    medicoRemitente: 'Dr. Fernando Castillo Vega',
    cedulaRemitente: 'CED-05432109',
    urgencia: 'urgente',
    transporte: 'ambulancia',
    acompanante: 'Teresa Salinas (hija)',
    estado: 'recibida',
    fechaRespuesta: '2026-08-20',
    resumenRespuesta: 'Recibido en urgencias del HGZ27 a las 12:15 hrs. Ingreso a UCI con BiPAP. Iniciado tratamiento con Ceftriaxona + Azitromicina. Pronóstico reservado.',
    contactoDestino: 'Urgencias HGZ27: 55-6700-1122',
  },
  {
    id: 'ref-p4-001',
    patientId: 'p4',
    patientName: 'Roberto Jiménez Vega',
    patientExpediente: 'EXP-2024-0004',
    tipo: 'referencia',
    fecha: '2026-08-20',
    hora: '14:15',
    origen: 'MediCore Clínica - Medicina General',
    destino: 'Centro Cardiológico del Valle - Cardiología Intervencionista',
    motivo: 'Evaluación por cardiología intervencionista tras episodio de dolor torácico leve. Paciente con alerta cardíaca previa. Se solicita valoración de riesgo y posible cateterismo diagnóstico.',
    diagnosticoResumen: 'Z03.5 - Observación por sospecha de enfermedad cardiovascular. Riesgo cardiovascular intermedio. Dislipidemia mixta.',
    tratamientoPrevio: 'Atorvastatina 20mg c/24h. ASA 100mg c/24h.',
    estudiosRealizados: ['ECG: ritmo sinusal, sin datos de isquemia aguda', 'Troponina I: 0.02 ng/mL (normal)', 'Perfil lipídico: CT 245, LDL 165, HDL 38, TG 180'],
    estudiosPendientes: ['Test de esfuerzo cardíaco', 'Eco transtorácica', 'AngioTC coronaria'],
    recomendaciones: '1. Valorar test de esfuerzo como screening. 2. Si test positivo, considerar cateterismo diagnóstico. 3. Optimizar manejo de factores de riesgo cardiovascular.',
    medicoRemitente: 'Dra. Patricia Mendoza Ríos',
    cedulaRemitente: 'CED-08765432',
    urgencia: 'programada',
    transporte: 'particular',
    acompanante: 'Lucía Vega (esposa)',
    estado: 'enviada',
    contactoDestino: 'Agendamiento CCV: 55-5500-3300',
  },
  {
    id: 'ref-p8-001',
    patientId: 'p8',
    patientName: 'Valeria Fernanda Castillo Núñez',
    patientExpediente: 'EXP-2024-0008',
    tipo: 'referencia',
    fecha: '2026-08-20',
    hora: '10:15',
    origen: 'MediCore Clínica - Ginecología',
    destino: 'Hospital Materno Infantil - Servicio de Obstetricia de Alto Riesgo',
    motivo: 'Embarazo de 28 semanas con cesárea previa. Control prenatal de rutina. Se solicita valoración de riesgo para parto vaginal después de cesárea (TOLAC) o cesárea electiva programada.',
    diagnosticoResumen: 'Z34 - Supervisión de embarazo normal. O34.2 - Cicatriz uterina previa por cesárea.',
    tratamientoPrevio: 'Suplemento prenatal (ácido fólico + hierro + calcio).',
    estudiosRealizados: ['Ultrasonido obstétrico: feto en presentación cefálica, biometría acorde a 28 semanas', 'Biometría hemática: Hb 11.2 g/dL', 'Glucosa: 82 mg/dL', 'Urocultivo: negativo'],
    estudiosPendientes: ['Prueba de tolerancia a glucosa oral (28 semanas)', 'Eco de crecimiento fetal (32 semanas)', 'Evaluación de cicatriz uterina por ultrasonido transvaginal'],
    recomendaciones: '1. Continuar controles prenatales quincenales. 2. Programar valoración de TOLAC vs cesárea electiva a las 36 semanas. 3. Mantener suplementación. 4. Educación sobre signos de alarma (sangrado, contracciones, disminución de movimientos fetales).',
    medicoRemitente: 'Dra. Gabriela Herrera López',
    cedulaRemitente: 'CED-06543210',
    urgencia: 'programada',
    transporte: 'particular',
    acompanante: 'Raúl Núñez (esposo)',
    estado: 'concluida',
    fechaRespuesta: '2026-08-21',
    resumenRespuesta: 'Valorado en HMI. Se programó cesárea electiva para semana 39 por preferencia materna y cicatriz uterina. Todos los estudios complementarios en normalidad.',
    contactoDestino: 'Agendamiento HMI: 55-7800-9900',
  },
  {
    id: 'ref-p18-001',
    patientId: 'p18',
    patientName: 'Emilio Santiago Herrera Ruiz',
    patientExpediente: 'EXP-2024-0018',
    tipo: 'referencia',
    fecha: '2026-08-20',
    hora: '10:45',
    origen: 'MediCore Clínica - Pediatría',
    destino: 'Hospital Infantil - Servicio de Infectología Pediátrica',
    motivo: 'Amigdalitis aguda con fiebre persistente (39.8°C) de 48 hrs en niño de 4 años. Sin respuesta a antipiréticos. Rechazo a la vía oral. Se solicita valoración para manejo intrahospitalario y posible antibioterapia IV.',
    diagnosticoResumen: 'J03.9 - Amigdalitis aguda no especificada, probable etiología estreptocócica. R50.9 - Fiebre.',
    tratamientoPrevio: 'Paracetamol 10mg/kg VO, Hidratación oral forzada.',
    estudiosRealizados: ['Hemograma: leucocitosis 16,500 con neutrofilia', 'PCR: 12 mg/L (elevada)', 'Grupo sanguíneo y factor Rh: A+', 'Faringoamigdalitis con exudado purulento bilateral'],
    estudiosPendientes: ['Cultivo faríngeo con antibiograma', 'Reactantes de fase aguda seriados'],
    recomendaciones: '1. Considerar ingreso para hidratación IV y antibioterapia IV. 2. Iniciar Amoxicilina/Ác. Clavulánico IV. 3. Vigilar vía aérea por edema amigdalar. 4. Cultivo faríngeo previo a antibioterapia.',
    medicoRemitente: 'Dra. Patricia Mendoza Ríos',
    cedulaRemitente: 'CED-08765432',
    urgencia: 'urgente',
    transporte: 'particular',
    acompanante: 'Rocío Ruiz (madre)',
    estado: 'en_atencion',
    contactoDestino: 'Urgencias HI: 55-6600-2200',
  },
  {
    id: 'contra-p9-001',
    patientId: 'p9',
    patientName: 'Miguel Ángel Contreras Peña',
    patientExpediente: 'EXP-2024-0009',
    tipo: 'contrarreferencia',
    fecha: '2026-08-20',
    hora: '15:30',
    origen: 'Hospital Cardiovascular del Sur - Unidad de Cuidados Coronarios',
    destino: 'MediCore Clínica - Medicina General',
    motivo: 'Contrarreferencia post-cateterismo cardíaco. Paciente con SCACEST tratado con angioplastia primaria + stent farmacoactivo en DA proximal.',
    diagnosticoResumen: 'I21.0 - IAM anteroseptal. TCI primaria exitosa. Stent farmacoactivo en DA. Fracción de eyección preservada (>55%).',
    tratamientoPrevio: 'Angioplastia primaria con stent en DA. AAS 100mg, Clopidogrel 75mg, Atorvastatina 80mg, Metoprolol 50mg, Enoxaparina 1mg/kg.',
    estudiosRealizados: ['Angiografía coronaria: lesión oclusiva 100% DA proximal', 'TCI primaria: stent 3.0x18mm', 'Eco TT post-procedimiento: FE 58%, cinética anteroseptal hipocinética'],
    estudiosPendientes: ['Control de troponinas seriadas', 'Eco de estrés a 6 semanas'],
    recomendaciones: '1. Continuar doble antiagregación por 12 meses (AAS + Clopidogrel). 2. Control lipídico agresivo (LDL <70). 3. Rehabilitación cardíaca. 4. Control en cardiología a 2 semanas. 5. Control en Medicina General a 1 semana para seguimiento de heridas y medicamentos.',
    medicoRemitente: 'Dr. Carlos Mendieta (Cardiología Intervencionista)',
    cedulaRemitente: '99887766',
    medicoReceptor: 'Dr. Alejandro García Mendoza',
    cedulaReceptor: 'CED-09876543',
    urgencia: 'urgente',
    transporte: 'ambulancia',
    acompanante: 'Rosa Peña (esposa)',
    estado: 'recibida',
    contactoDestino: 'MediCore Clínica: 55-1234-5678',
  },
];

export const getReferenciasByPatient = (patientId: string): ReferenciaMedica[] =>
  referenciasMock.filter((r) => r.patientId === patientId);