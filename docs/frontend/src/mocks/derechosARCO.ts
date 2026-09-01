export interface SolicitudARCO {
  id: string;
  patientId: string;
  patientName: string;
  patientExpediente: string;
  tipo: 'acceso' | 'rectificacion' | 'cancelacion' | 'oposicion';
  descripcion: string;
  motivo?: string;
  fechaSolicitud: string;
  fechaRespuesta?: string;
  estado: 'recibida' | 'en_proceso' | 'atendida' | 'rechazada' | 'cancelada';
  respuesta?: string;
  atendidoPor?: string;
  documentoAdjunto?: string;
  plazoDias: number;
  diasRestantes: number;
}

export const tipoARCOConfig: Record<SolicitudARCO['tipo'], { label: string; icon: string; bg: string; text: string; desc: string }> = {
  acceso: {
    label: 'Acceso',
    icon: 'ri-eye-line',
    bg: 'bg-primary-50',
    text: 'text-primary-700',
    desc: 'Solicitud de acceso a datos personales',
  },
  rectificacion: {
    label: 'Rectificación',
    icon: 'ri-edit-line',
    bg: 'bg-accent-50',
    text: 'text-accent-700',
    desc: 'Solicitud de corrección de datos inexactos',
  },
  cancelacion: {
    label: 'Cancelación',
    icon: 'ri-delete-bin-line',
    bg: 'bg-red-50',
    text: 'text-red-700',
    desc: 'Solicitud de eliminación de datos cuando ya no sean necesarios',
  },
  oposicion: {
    label: 'Oposición',
    icon: 'ri-hand',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    desc: 'Solicitud de no usar datos para fines específicos',
  },
};

export const estadoARCOConfig: Record<SolicitudARCO['estado'], { label: string; bg: string; text: string }> = {
  recibida: { label: 'Recibida', bg: 'bg-secondary-100', text: 'text-foreground-600' },
  en_proceso: { label: 'En proceso', bg: 'bg-amber-100', text: 'text-amber-700' },
  atendida: { label: 'Atendida', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  rechazada: { label: 'Rechazada', bg: 'bg-red-100', text: 'text-red-700' },
  cancelada: { label: 'Cancelada', bg: 'bg-secondary-100', text: 'text-foreground-500' },
};

export const solicitudesARCOMock: SolicitudARCO[] = [
  {
    id: 'arco-p1-001',
    patientId: 'p1',
    patientName: 'María Fernanda López Hernández',
    patientExpediente: 'EXP-2024-0001',
    tipo: 'acceso',
    descripcion: 'Solicito acceso completo a mi expediente clínico en formato digital, incluyendo todas las notas de evolución, resultados de estudios, recetas y certificados médicos generados en los últimos 2 años.',
    fechaSolicitud: '2026-07-15',
    fechaRespuesta: '2026-07-22',
    estado: 'atendida',
    respuesta: 'Se entregó expediente clínico completo en formato PDF cifrado mediante portal seguro. Incluye 12 consultas, 8 recetas, 15 estudios y 2 certificados médicos. Validez del enlace: 30 días.',
    atendidoPor: 'Lic. Roberto Méndez Castillo (Responsable de Datos)',
    plazoDias: 20,
    diasRestantes: 0,
  },
  {
    id: 'arco-p2-001',
    patientId: 'p2',
    patientName: 'Carlos Eduardo Martínez Ruiz',
    patientExpediente: 'EXP-2024-0002',
    tipo: 'rectificacion',
    descripcion: 'Solicito la rectificación de mi número telefónico celular en el expediente clínico. El número registrado actual (55-8765-4321) ya no me pertenece. Mi número actual es 55-9988-7766.',
    motivo: 'Cambio de número telefónico por portabilidad.',
    fechaSolicitud: '2026-08-10',
    fechaRespuesta: '2026-08-12',
    estado: 'atendida',
    respuesta: 'Se actualizó el número celular en el expediente clínico (EXP-2024-0002) y se notificó al médico asignado. Se envió confirmación al nuevo número.',
    atendidoPor: 'Laura Torres Jiménez (Recepción)',
    plazoDias: 20,
    diasRestantes: 0,
  },
  {
    id: 'arco-p3-001',
    patientId: 'p3',
    patientName: 'Ana Gabriela Sánchez Torres',
    patientExpediente: 'EXP-2024-0003',
    tipo: 'oposicion',
    descripcion: 'Me opongo al uso de mis datos personales para fines de marketing y promoción de servicios de la clínica, incluyendo envío de correos electrónicos, mensajes de texto y llamadas telefónicas con ofertas de servicios.',
    motivo: 'Derecho a la privacidad y no recibir publicidad no solicitada.',
    fechaSolicitud: '2026-06-01',
    fechaRespuesta: '2026-06-05',
    estado: 'atendida',
    respuesta: 'Se registró la oposición en el sistema. El paciente fue agregado a la lista de exclusión de marketing. Se confirmó que sus datos seguirán siendo utilizados únicamente para fines de prestación de servicios de salud conforme a la LFPDPPP.',
    atendidoPor: 'Lic. Roberto Méndez Castillo',
    plazoDias: 20,
    diasRestantes: 0,
  },
  {
    id: 'arco-p8-001',
    patientId: 'p8',
    patientName: 'Valeria Fernanda Castillo Núñez',
    patientExpediente: 'EXP-2024-0008',
    tipo: 'rectificacion',
    descripcion: 'Solicito actualizar mi domicilio en el expediente. Me mudé de Colonia Condesa a Av. Insurgentes Sur 1845, Col. Del Valle, CDMX, C.P. 03100.',
    fechaSolicitud: '2026-05-20',
    fechaRespuesta: '2026-05-22',
    estado: 'atendida',
    respuesta: 'Domicilio actualizado en expediente clínico. Se validó dirección con copia de comprobante de domicilio presentado.',
    atendidoPor: 'Laura Torres Jiménez',
    plazoDias: 20,
    diasRestantes: 0,
  },
  {
    id: 'arco-p12-001',
    patientId: 'p12',
    patientName: 'Adriana Lucía Fuentes Robles',
    patientExpediente: 'EXP-2024-0012',
    tipo: 'acceso',
    descripcion: 'Solicito copia de mis radiografías de rodillas (estudios del 2026-08-20) en formato DICOM para llevar a mi valoración con ortopedia externa.',
    fechaSolicitud: '2026-08-20',
    estado: 'en_proceso',
    atendidoPor: 'Dr. Fernando Castillo Vega',
    plazoDias: 20,
    diasRestantes: 18,
  },
  {
    id: 'arco-p14-001',
    patientId: 'p14',
    patientName: 'Beatriz Elena Villanueva Mora',
    patientExpediente: 'EXP-2024-0014',
    tipo: 'cancelacion',
    descripcion: 'Solicito la cancelación de mis datos personales en el sistema, dado que ya no recibo atención en esta clínica desde hace 6 meses y he migrado a otra institución de salud.',
    motivo: 'Ya no soy paciente activo de la clínica.',
    fechaSolicitud: '2026-08-15',
    estado: 'en_proceso',
    atendidoPor: 'Lic. Roberto Méndez Castillo',
    plazoDias: 20,
    diasRestantes: 13,
  },
  {
    id: 'arco-p17-001',
    patientId: 'p17',
    patientName: 'Martín Eduardo Salazar Luna',
    patientExpediente: 'EXP-2024-0017',
    tipo: 'oposicion',
    descripcion: 'Me opongo a que mi información de salud sea compartida con aseguradoras para fines de evaluación de riesgo, salvo cuando sea necesario para la facturación directa de servicios.',
    fechaSolicitud: '2026-08-18',
    estado: 'recibida',
    plazoDias: 20,
    diasRestantes: 17,
  },
  {
    id: 'arco-p22-001',
    patientId: 'p22',
    patientName: 'Hugo Alberto Montiel Castro',
    patientExpediente: 'EXP-2024-0022',
    tipo: 'acceso',
    descripcion: 'Solicito acceso a mi historial de medicamentos recetados en los últimos 12 meses para compartir con mi nuevo neurólogo.',
    fechaSolicitud: '2026-08-19',
    estado: 'recibida',
    plazoDias: 20,
    diasRestantes: 18,
  },
];

export const getSolicitudesByPatient = (patientId: string): SolicitudARCO[] =>
  solicitudesARCOMock.filter((s) => s.patientId === patientId);