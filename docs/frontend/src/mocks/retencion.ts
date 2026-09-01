export interface PoliticaRetencion {
  id: string;
  categoria: 'expediente_clinico' | 'imagenes' | 'recetas' | 'estudios_laboratorio' | 'facturacion' | 'consentimientos' | 'referencias' | 'egresos' | 'vigilancia_epidemiologica';
  descripcion: string;
  plazoAnios: number;
  normaAplicable: string;
  fechaInicioVigencia: string;
  ultimaRevision: string;
  proximaRevision: string;
  responsable: string;
  estado: 'vigente' | 'en_revision' | 'actualizada';
  observaciones?: string;
}

export const categoriaRetencionConfig: Record<PoliticaRetencion['categoria'], { label: string; icon: string }> = {
  expediente_clinico: { label: 'Expediente Clínico', icon: 'ri-folder-open-line' },
  imagenes: { label: 'Imágenes Clínicas', icon: 'ri-image-line' },
  recetas: { label: 'Recetas Médicas', icon: 'ri-capsule-line' },
  estudios_laboratorio: { label: 'Estudios de Laboratorio', icon: 'ri-flask-line' },
  facturacion: { label: 'Facturación y Cobranza', icon: 'ri-bill-line' },
  consentimientos: { label: 'Consentimientos Informados', icon: 'ri-file-shield-line' },
  referencias: { label: 'Referencias/Contrarreferencias', icon: 'ri-arrow-left-right-line' },
  egresos: { label: 'Hojas de Egreso', icon: 'ri-file-list-3-line' },
  vigilancia_epidemiologica: { label: 'Vigilancia Epidemiológica', icon: 'ri-virus-line' },
};

export const retencionMock: PoliticaRetencion[] = [
  {
    id: 'ret-001',
    categoria: 'expediente_clinico',
    descripcion: 'Conservación de expedientes clínicos completos en formato físico y electrónico, incluyendo historias clínicas, notas de evolución, signos vitales y documentos asociados.',
    plazoAnios: 5,
    normaAplicable: 'NOM-004-SSA3-2012 Art. 6.4.1 / LFPDPPP Art. 11',
    fechaInicioVigencia: '2024-01-01',
    ultimaRevision: '2026-01-15',
    proximaRevision: '2027-01-15',
    responsable: 'Dr. Alejandro García Mendoza',
    estado: 'vigente',
    observaciones: 'Se conserva copia digital en servidor local con respaldo en nube cifrada. Destrucción física certificada al término del plazo.',
  },
  {
    id: 'ret-002',
    categoria: 'imagenes',
    descripcion: 'Conservación de imágenes clínicas (radiografías, tomografías, resonancias magnéticas, ultrasonidos, fotografías dermatológicas) con sus reportes.',
    plazoAnios: 5,
    normaAplicable: 'NOM-004-SSA3-2012 Art. 6.4.2 / NOM-024-SSA3-2012',
    fechaInicioVigencia: '2024-01-01',
    ultimaRevision: '2026-01-15',
    proximaRevision: '2027-01-15',
    responsable: 'Dr. Fernando Castillo Vega',
    estado: 'vigente',
    observaciones: 'Formato DICOM con metadatos preservados. Acceso mediante PACS interno.',
  },
  {
    id: 'ret-003',
    categoria: 'recetas',
    descripcion: 'Conservación de recetas médicas emitidas, incluyendo nombre del paciente, medicamentos prescritos, dosis, frecuencia y firma del médico.',
    plazoAnios: 2,
    normaAplicable: 'Reglamento de Insumos para la Salud / COFEPRIS',
    fechaInicioVigencia: '2024-01-01',
    ultimaRevision: '2026-01-15',
    proximaRevision: '2027-01-15',
    responsable: 'Dra. Patricia Mendoza Ríos',
    estado: 'vigente',
  },
  {
    id: 'ret-004',
    categoria: 'estudios_laboratorio',
    descripcion: 'Conservación de resultados de estudios de laboratorio clínico y de gabinete con identificación del paciente y fecha de realización.',
    plazoAnios: 5,
    normaAplicable: 'NOM-004-SSA3-2012 / NOM-024-SSA3-2012',
    fechaInicioVigencia: '2024-01-01',
    ultimaRevision: '2026-01-15',
    proximaRevision: '2027-01-15',
    responsable: 'Dr. Alejandro García Mendoza',
    estado: 'vigente',
  },
  {
    id: 'ret-005',
    categoria: 'facturacion',
    descripcion: 'Conservación de comprobantes fiscales, notas de cargo, estados de cuenta y documentación relacionada con pagos de servicios médicos.',
    plazoAnios: 5,
    normaAplicable: 'Código Fiscal de la Federación Art. 30 / SAT',
    fechaInicioVigencia: '2024-01-01',
    ultimaRevision: '2026-01-15',
    proximaRevision: '2027-01-15',
    responsable: 'Laura Torres Jiménez (Administración)',
    estado: 'vigente',
    observaciones: 'Archivo fiscal separado del expediente clínico. Acceso restringido.',
  },
  {
    id: 'ret-006',
    categoria: 'consentimientos',
    descripcion: 'Conservación de consentimientos informados firmados, incluyendo documento de aviso de privacidad y autorizaciones de tratamiento de datos sensibles.',
    plazoAnios: 5,
    normaAplicable: 'LFPDPPP Art. 15 / NOM-004-SSA3-2012',
    fechaInicioVigencia: '2024-01-01',
    ultimaRevision: '2026-03-10',
    proximaRevision: '2027-03-10',
    responsable: 'Lic. Roberto Méndez Castillo',
    estado: 'vigente',
    observaciones: 'Vinculado al expediente clínico del paciente.',
  },
  {
    id: 'ret-007',
    categoria: 'referencias',
    descripcion: 'Conservación de notas de referencia y contrarreferencia entre unidades médicas, incluyendo resumen clínico y recomendaciones.',
    plazoAnios: 5,
    normaAplicable: 'NOM-004-SSA3-2012 Art. 6.5 / NOM-017-SSA2-2012',
    fechaInicioVigencia: '2024-01-01',
    ultimaRevision: '2026-01-15',
    proximaRevision: '2027-01-15',
    responsable: 'Dr. Alejandro García Mendoza',
    estado: 'vigente',
  },
  {
    id: 'ret-008',
    categoria: 'egresos',
    descripcion: 'Conservación de hojas de egreso hospitalario o de urgencias, con resumen de evolución, diagnóstico de egreso, tratamiento y recomendaciones.',
    plazoAnios: 5,
    normaAplicable: 'NOM-004-SSA3-2012 Art. 6.3.7',
    fechaInicioVigencia: '2024-01-01',
    ultimaRevision: '2026-01-15',
    proximaRevision: '2027-01-15',
    responsable: 'Dr. Fernando Castillo Vega',
    estado: 'vigente',
  },
  {
    id: 'ret-009',
    categoria: 'vigilancia_epidemiologica',
    descripcion: 'Conservación de registros de enfermedades de notificación obligatoria y reportes al sistema SUIVE/SUAVE.',
    plazoAnios: 5,
    normaAplicable: 'NOM-017-SSA2-2012 / Ley General de Salud Art. 77',
    fechaInicioVigencia: '2024-01-01',
    ultimaRevision: '2026-04-20',
    proximaRevision: '2027-04-20',
    responsable: 'Dr. Alejandro García Mendoza',
    estado: 'vigente',
    observaciones: 'Reporte semanal a la jurisdicción sanitaria correspondiente.',
  },
];

export interface RegistroRetencionPaciente {
  patientId: string;
  fechaCreacionExpediente: string;
  fechaUltimaConsulta: string;
  aniosTranscurridos: number;
  fechaVencimientoRetencion: string;
  diasRestantes: number;
  estado: 'activo' | 'proximo_vencer' | 'vencido';
  politicasAplicables: string[];
}

export const getPoliticasByCategoria = (categoria: PoliticaRetencion['categoria']): PoliticaRetencion[] =>
  retencionMock.filter((p) => p.categoria === categoria);