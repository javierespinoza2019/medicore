export interface ProfesionalSalud {
  id: string;
  nombre: string;
  cedulaProfesional: string;
  vigenciaCedula: string;
  especialidad: string;
  certificacionConsejo: string;
  vigenciaCertificacion: string;
  licenciaSanitariaEstablecimiento: string;
  vigenciaLicencia: string;
  email: string;
  telefono: string;
  sucursalId: string;
  estado: 'activo' | 'licencia' | 'baja' | 'suspendido';
  observaciones?: string;
}

export const estadoProfesionalConfig: Record<ProfesionalSalud['estado'], { label: string; bg: string; text: string; icon: string }> = {
  activo: { label: 'Activo', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'ri-check-line' },
  licencia: { label: 'En licencia', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'ri-time-line' },
  baja: { label: 'Baja', bg: 'bg-secondary-100', text: 'text-foreground-500', icon: 'ri-close-line' },
  suspendido: { label: 'Suspendido', bg: 'bg-red-100', text: 'text-red-700', icon: 'ri-error-warning-line' },
};

export const profesionalesMock: ProfesionalSalud[] = [
  {
    id: 'med-001',
    nombre: 'Dr. Alejandro García Mendoza',
    cedulaProfesional: 'CED-09876543',
    vigenciaCedula: '2028-12-31',
    especialidad: 'Medicina General',
    certificacionConsejo: 'Certificado por el Consejo Mexicano de Medicina General',
    vigenciaCertificacion: '2027-06-30',
    licenciaSanitariaEstablecimiento: 'LS-MH-2024-001',
    vigenciaLicencia: '2026-12-31',
    email: 'alejandro.garcia@medicore.com',
    telefono: '55-1234-5678',
    sucursalId: 's1',
    estado: 'activo',
  },
  {
    id: 'med-002',
    nombre: 'Dra. Patricia Mendoza Ríos',
    cedulaProfesional: 'CED-08765432',
    vigenciaCedula: '2029-03-15',
    especialidad: 'Pediatría',
    certificacionConsejo: 'Certificada por el Consejo Mexicano de Pediatría',
    vigenciaCertificacion: '2028-09-30',
    licenciaSanitariaEstablecimiento: 'LS-MH-2024-001',
    vigenciaLicencia: '2026-12-31',
    email: 'patricia.mendoza@medicore.com',
    telefono: '55-1234-5679',
    sucursalId: 's1',
    estado: 'activo',
  },
  {
    id: 'med-003',
    nombre: 'Dr. Fernando Castillo Vega',
    cedulaProfesional: 'CED-05432109',
    vigenciaCedula: '2027-08-20',
    especialidad: 'Medicina General',
    certificacionConsejo: 'Certificado por el Consejo Mexicano de Medicina General',
    vigenciaCertificacion: '2026-12-31',
    licenciaSanitariaEstablecimiento: 'LS-MH-2024-001',
    vigenciaLicencia: '2026-12-31',
    email: 'fernando.castillo@medicore.com',
    telefono: '55-1234-5680',
    sucursalId: 's1',
    estado: 'activo',
  },
  {
    id: 'med-004',
    nombre: 'Dra. Gabriela Herrera López',
    cedulaProfesional: 'CED-06543210',
    vigenciaCedula: '2030-01-10',
    especialidad: 'Ginecología y Obstetricia',
    certificacionConsejo: 'Certificada por el Consejo Mexicano de Ginecología y Obstetricia',
    vigenciaCertificacion: '2029-06-30',
    licenciaSanitariaEstablecimiento: 'LS-MH-2024-001',
    vigenciaLicencia: '2026-12-31',
    email: 'gabriela.herrera@medicore.com',
    telefono: '55-1234-5681',
    sucursalId: 's1',
    estado: 'activo',
  },
  {
    id: 'med-005',
    nombre: 'Dr. Roberto Méndez Sánchez',
    cedulaProfesional: 'CED-45678901',
    vigenciaCedula: '2027-05-30',
    especialidad: 'Cirugía General',
    certificacionConsejo: 'Certificado por el Consejo Mexicano de Cirugía General',
    vigenciaCertificacion: '2026-11-30',
    licenciaSanitariaEstablecimiento: 'LS-MH-2024-001',
    vigenciaLicencia: '2026-12-31',
    email: 'roberto.mendez@medicore.com',
    telefono: '55-1234-5682',
    sucursalId: 's1',
    estado: 'licencia',
    observaciones: 'En licencia por capacitación quirúrgica avanzada (1 mes).',
  },
  {
    id: 'enf-001',
    nombre: 'Lic. Carmen Vargas Ortega',
    cedulaProfesional: 'ENF-2024-0012',
    vigenciaCedula: '2028-07-15',
    especialidad: 'Enfermería Clínica - Triage',
    certificacionConsejo: 'Certificada por el Consejo Mexicano de Enfermería',
    vigenciaCertificacion: '2027-12-31',
    licenciaSanitariaEstablecimiento: 'LS-MH-2024-001',
    vigenciaLicencia: '2026-12-31',
    email: 'carmen.vargas@medicore.com',
    telefono: '55-1234-5683',
    sucursalId: 's1',
    estado: 'activo',
  },
  {
    id: 'enf-002',
    nombre: 'Lic. Roberto Méndez Castillo',
    cedulaProfesional: 'ENF-2023-0045',
    vigenciaCedula: '2027-11-20',
    especialidad: 'Enfermería General',
    certificacionConsejo: 'Certificado por el Consejo Mexicano de Enfermería',
    vigenciaCertificacion: '2027-05-30',
    licenciaSanitariaEstablecimiento: 'LS-MH-2024-001',
    vigenciaLicencia: '2026-12-31',
    email: 'roberto.mendez.enf@medicore.com',
    telefono: '55-1234-5684',
    sucursalId: 's1',
    estado: 'activo',
  },
  {
    id: 'adm-001',
    nombre: 'Laura Torres Jiménez',
    cedulaProfesional: 'ADM-2019-001',
    vigenciaCedula: '2026-12-31',
    especialidad: 'Administración Hospitalaria',
    certificacionConsejo: 'Certificada por Asociación Mexicana de Administración Hospitalaria',
    vigenciaCertificacion: '2026-06-30',
    licenciaSanitariaEstablecimiento: 'LS-MH-2024-001',
    vigenciaLicencia: '2026-12-31',
    email: 'laura.torres@medicore.com',
    telefono: '55-1234-5685',
    sucursalId: 's1',
    estado: 'activo',
    observaciones: 'Responsable de caja y facturación. No es personal médico asistencial.',
  },
];

export function calcularDiasRestantes(fechaVencimiento: string): number {
  const hoy = new Date();
  const venc = new Date(fechaVencimiento);
  return Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

export function getAlertasVencimiento(profesional: ProfesionalSalud): { campo: string; dias: number; severidad: 'alta' | 'media' | 'baja' }[] {
  const alertas: { campo: string; dias: number; severidad: 'alta' | 'media' | 'baja' }[] = [];

  const diasCedula = calcularDiasRestantes(profesional.vigenciaCedula);
  if (diasCedula <= 90) alertas.push({ campo: 'Cédula profesional', dias: diasCedula, severidad: diasCedula <= 30 ? 'alta' : 'media' });

  const diasCert = calcularDiasRestantes(profesional.vigenciaCertificacion);
  if (diasCert <= 90) alertas.push({ campo: 'Certificación de especialidad', dias: diasCert, severidad: diasCert <= 30 ? 'alta' : 'media' });

  const diasLic = calcularDiasRestantes(profesional.vigenciaLicencia);
  if (diasLic <= 90) alertas.push({ campo: 'Licencia sanitaria', dias: diasLic, severidad: diasLic <= 30 ? 'alta' : 'media' });

  return alertas;
}