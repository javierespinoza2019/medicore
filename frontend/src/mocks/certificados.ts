export type TipoCertificado = 'incapacidad' | 'aptitud' | 'embarazo' | 'general';

export interface CertificadoMedico {
  id: string;
  folio: string;
  patientId: string;
  patientName: string;
  patientExpediente: string;
  doctorId: string;
  doctorName: string;
  doctorCedula: string;
  doctorEspecialidad: string;
  consultaId: string;
  fecha: string;
  hora: string;
  tipo: TipoCertificado;
  diagnostico: string;
  // Justificante de incapacidad
  diasIncapacidad?: number;
  fechaInicio?: string;
  fechaFin?: string;
  // Certificado de aptitud fisica / estado de salud
  apto?: boolean;
  actividad?: string;
  // Certificado de embarazo
  semanasGestacion?: number;
  fechaProbableParto?: string;
  // Certificado general
  proposito?: string;
  // Comun a todos los tipos
  recomendaciones?: string;
  estado: 'activo' | 'anulado';
  // Trazabilidad de anulacion
  anuladoPor?: string;
  anuladoEn?: string;
  motivoAnulacion?: string;
}

export const tipoCertificadoConfig: Record<TipoCertificado, { label: string; shortLabel: string; icon: string; desc: string }> = {
  incapacidad: { label: 'Justificante de incapacidad', shortLabel: 'Incapacidad', icon: 'ri-hospital-line', desc: 'Reposo laboral o escolar' },
  aptitud: { label: 'Certificado de aptitud fisica', shortLabel: 'Aptitud fisica', icon: 'ri-run-line', desc: 'Deporte, ingreso escolar o laboral' },
  embarazo: { label: 'Certificado de embarazo', shortLabel: 'Embarazo', icon: 'ri-women-line', desc: 'Constancia de gestacion' },
  general: { label: 'Certificado medico general', shortLabel: 'General', icon: 'ri-file-text-line', desc: 'Constancia de salud' },
};

export const certificados: CertificadoMedico[] = [
  {
    id: 'cm-001',
    folio: 'CM-2026-0001',
    patientId: 'p2',
    patientName: 'Carlos Eduardo Martínez Ruiz',
    patientExpediente: 'EXP-2024-0002',
    doctorId: '66666666-6666-6666-6666-666666660002',
    doctorName: 'Dra. Patricia Mendoza Ríos',
    doctorCedula: 'CED-08765432',
    doctorEspecialidad: 'Medicina General',
    consultaId: 'con-ce-001',
    fecha: '2026-08-20',
    hora: '10:12',
    tipo: 'incapacidad',
    diagnostico: 'M54.5 - Lumbalgia no especificada',
    diasIncapacidad: 3,
    fechaInicio: '2026-08-20',
    fechaFin: '2026-08-22',
    recomendaciones: 'Reposo relativo, evitar levantar objetos pesados y permanecer largos periodos sentado. Aplicar calor local y continuar tratamiento farmacologico indicado.',
    estado: 'activo',
  },
  {
    id: 'cm-002',
    folio: 'CM-2026-0002',
    patientId: 'p8',
    patientName: 'Valeria Fernanda Castillo Núñez',
    patientExpediente: 'EXP-2024-0008',
    doctorId: 'd4',
    doctorName: 'Dra. Gabriela Herrera López',
    doctorCedula: 'CED-06543210',
    doctorEspecialidad: 'Ginecología',
    consultaId: 'con-p8-001',
    fecha: '2026-08-20',
    hora: '09:50',
    tipo: 'embarazo',
    diagnostico: 'Z34 - Supervision de embarazo normal',
    semanasGestacion: 28,
    fechaProbableParto: '2026-11-04',
    recomendaciones: 'Continuar control prenatal mensual y suplementos vitaminicos indicados.',
    estado: 'activo',
  },
  {
    id: 'cm-003',
    folio: 'CM-2026-0003',
    patientId: 'p1',
    patientName: 'María Fernanda López Hernández',
    patientExpediente: 'EXP-2024-0001',
    doctorId: '66666666-6666-6666-6666-666666660001',
    doctorName: 'Dr. Alejandro García Mendoza',
    doctorCedula: 'CED-09876543',
    doctorEspecialidad: 'Medicina General',
    consultaId: 'con-mf-001',
    fecha: '2026-08-05',
    hora: '09:30',
    tipo: 'incapacidad',
    diagnostico: 'J06.9 - Infeccion de vias respiratorias superiores no especificada',
    diasIncapacidad: 2,
    fechaInicio: '2026-08-05',
    fechaFin: '2026-08-06',
    recomendaciones: 'Reposo en casa, hidratacion abundante y medicacion sintomatica.',
    estado: 'anulado',
    anuladoPor: 'Dr. Alejandro García Mendoza',
    anuladoEn: '2026-08-05 14:22',
    motivoAnulacion: 'Error en el diagnostico: el paciente presento gripa comun, no requiere incapacidad laboral. Se genero nuevo certificado correcto.',
  },
];

export const getCertificadosByConsulta = (consultaId: string): CertificadoMedico[] =>
  certificados.filter((c) => c.consultaId === consultaId);

export const getCertificadosByPatient = (patientId: string): CertificadoMedico[] =>
  certificados.filter((c) => c.patientId === patientId).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora));