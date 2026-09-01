export interface Medicamento {
  id: string;
  nombre: string;
  presentacion: string;
  concentracion: string;
  categoria: string;
  viaAdministracion: string;
}

export interface MedicamentoPrescrito {
  id: string;
  medicamentoId: string;
  nombre: string;
  presentacion: string;
  concentracion: string;
  dosis: string;
  frecuencia: string;
  via: string;
  duracion: string;
  indicaciones: string;
}

export interface Receta {
  id: string;
  patientId: string;
  patientName: string;
  patientExpediente: string;
  doctorId: string;
  doctorName: string;
  doctorCedula: string;
  consultaId: string;
  urgenciaId?: string;
  fecha: string;
  hora: string;
  medicamentos: MedicamentoPrescrito[];
  indicacionesGenerales: string;
  estado: 'activa' | 'surtida' | 'parcial' | 'vencida' | 'cancelada';
  diagnosticoRelacionado: string;
  medicamentosPendientes?: { medicamentoId: string; cantidadPendiente: number }[];
}

export const catalogoMedicamentos: Medicamento[] = [
  { id: 'm1', nombre: 'Paracetamol', presentacion: 'Tableta', concentracion: '500mg', categoria: 'Analgésico/Antipirético', viaAdministracion: 'Oral' },
  { id: 'm2', nombre: 'Ibuprofeno', presentacion: 'Tableta', concentracion: '400mg', categoria: 'AINE', viaAdministracion: 'Oral' },
  { id: 'm3', nombre: 'Naproxeno', presentacion: 'Tableta', concentracion: '500mg', categoria: 'AINE', viaAdministracion: 'Oral' },
  { id: 'm4', nombre: 'Diclofenaco', presentacion: 'Ampolleta', concentracion: '75mg/3ml', categoria: 'AINE', viaAdministracion: 'Intramuscular' },
  { id: 'm5', nombre: 'Amoxicilina/Ácido clavulánico', presentacion: 'Suspensión', concentracion: '400mg/57mg/5ml', categoria: 'Antibiótico', viaAdministracion: 'Oral' },
  { id: 'm6', nombre: 'Amoxicilina', presentacion: 'Cápsula', concentracion: '500mg', categoria: 'Antibiótico', viaAdministracion: 'Oral' },
  { id: 'm7', nombre: 'Ceftriaxona', presentacion: 'Ampolleta', concentracion: '1g', categoria: 'Antibiótico', viaAdministracion: 'Intravenosa' },
  { id: 'm8', nombre: 'Azitromicina', presentacion: 'Tableta', concentracion: '500mg', categoria: 'Antibiótico', viaAdministracion: 'Oral' },
  { id: 'm9', nombre: 'Ciprofloxacino', presentacion: 'Tableta', concentracion: '500mg', categoria: 'Antibiótico', viaAdministracion: 'Oral' },
  { id: 'm10', nombre: 'Metronidazol', presentacion: 'Tableta', concentracion: '500mg', categoria: 'Antibiótico/Antiparasitario', viaAdministracion: 'Oral' },
  { id: 'm11', nombre: 'Omeprazol', presentacion: 'Cápsula', concentracion: '20mg', categoria: 'Inhibidor bomba protones', viaAdministracion: 'Oral' },
  { id: 'm12', nombre: 'Ranitidina', presentacion: 'Tableta', concentracion: '150mg', categoria: 'Antiulceroso', viaAdministracion: 'Oral' },
  { id: 'm13', nombre: 'Loratadina', presentacion: 'Tableta', concentracion: '10mg', categoria: 'Antihistamínico', viaAdministracion: 'Oral' },
  { id: 'm14', nombre: 'Cetirizina', presentacion: 'Tableta', concentracion: '10mg', categoria: 'Antihistamínico', viaAdministracion: 'Oral' },
  { id: 'm15', nombre: 'Salbutamol', presentacion: 'Inhalador', concentracion: '100mcg/dosis', categoria: 'Broncodilatador', viaAdministracion: 'Inhalatoria' },
  { id: 'm16', nombre: 'Ambroxol', presentacion: 'Jarabe', concentracion: '15mg/5ml', categoria: 'Mucolítico', viaAdministracion: 'Oral' },
  { id: 'm17', nombre: 'Dexametasona', presentacion: 'Ampolleta', concentracion: '8mg/2ml', categoria: 'Corticoide', viaAdministracion: 'Intramuscular' },
  { id: 'm18', nombre: 'Prednisona', presentacion: 'Tableta', concentracion: '5mg', categoria: 'Corticoide', viaAdministracion: 'Oral' },
  { id: 'm19', nombre: 'Metformina', presentacion: 'Tableta', concentracion: '850mg', categoria: 'Hipoglucemiante', viaAdministracion: 'Oral' },
  { id: 'm20', nombre: 'Glibenclamida', presentacion: 'Tableta', concentracion: '5mg', categoria: 'Hipoglucemiante', viaAdministracion: 'Oral' },
  { id: 'm21', nombre: 'Insulina glargina', presentacion: 'Pluma', concentracion: '100UI/ml', categoria: 'Hipoglucemiante', viaAdministracion: 'Subcutánea' },
  { id: 'm22', nombre: 'Enalapril', presentacion: 'Tableta', concentracion: '10mg', categoria: 'Antihipertensivo', viaAdministracion: 'Oral' },
  { id: 'm23', nombre: 'Losartán', presentacion: 'Tableta', concentracion: '50mg', categoria: 'Antihipertensivo', viaAdministracion: 'Oral' },
  { id: 'm24', nombre: 'Amlodipino', presentacion: 'Tableta', concentracion: '5mg', categoria: 'Antihipertensivo', viaAdministracion: 'Oral' },
  { id: 'm25', nombre: 'Atorvastatina', presentacion: 'Tableta', concentracion: '20mg', categoria: 'Hipolipemiante', viaAdministracion: 'Oral' },
  { id: 'm26', nombre: 'AAS (Ácido Acetilsalicílico)', presentacion: 'Tableta', concentracion: '100mg', categoria: 'Antiagregante', viaAdministracion: 'Oral' },
  { id: 'm27', nombre: 'Clopidogrel', presentacion: 'Tableta', concentracion: '75mg', categoria: 'Antiagregante', viaAdministracion: 'Oral' },
  { id: 'm28', nombre: 'Pregabalina', presentacion: 'Cápsula', concentracion: '75mg', categoria: 'Neuromodulador', viaAdministracion: 'Oral' },
  { id: 'm29', nombre: 'Ciclobenzaprina', presentacion: 'Tableta', concentracion: '10mg', categoria: 'Relajante muscular', viaAdministracion: 'Oral' },
  { id: 'm30', nombre: 'Metoclopramida', presentacion: 'Ampolleta', concentracion: '10mg/2ml', categoria: 'Antiemético', viaAdministracion: 'Intravenosa' },
  { id: 'm31', nombre: 'Hioscina (Butilhioscina)', presentacion: 'Tableta', concentracion: '10mg', categoria: 'Antiespasmódico', viaAdministracion: 'Oral' },
  { id: 'm32', nombre: 'Levotiroxina', presentacion: 'Tableta', concentracion: '100mcg', categoria: 'Hormona tiroidea', viaAdministracion: 'Oral' },
  { id: 'm33', nombre: 'Fluoxetina', presentacion: 'Cápsula', concentracion: '20mg', categoria: 'Antidepresivo', viaAdministracion: 'Oral' },
  { id: 'm34', nombre: 'Sertralina', presentacion: 'Tableta', concentracion: '50mg', categoria: 'Antidepresivo', viaAdministracion: 'Oral' },
  { id: 'm35', nombre: 'Alprazolam', presentacion: 'Tableta', concentracion: '0.5mg', categoria: 'Ansiolítico', viaAdministracion: 'Oral' },
  { id: 'm36', nombre: 'Solución Hartmann', presentacion: 'Bolsa 1000ml', concentracion: 'N/A', categoria: 'Solución IV', viaAdministracion: 'Intravenosa' },
  { id: 'm37', nombre: 'Cloruro de sodio 0.9%', presentacion: 'Bolsa 500ml', concentracion: '0.9%', categoria: 'Solución IV', viaAdministracion: 'Intravenosa' },
  { id: 'm38', nombre: 'Complejo B', presentacion: 'Tableta', concentracion: 'N/A', categoria: 'Vitamínico', viaAdministracion: 'Oral' },
  { id: 'm39', nombre: 'Vitamina D3', presentacion: 'Cápsula', concentracion: '2000UI', categoria: 'Vitamínico', viaAdministracion: 'Oral' },
  { id: 'm40', nombre: 'Hierro (Sulfato ferroso)', presentacion: 'Tableta', concentracion: '200mg', categoria: 'Antianémico', viaAdministracion: 'Oral' },
];

export const frecuenciasComunes = [
  'c/4h', 'c/6h', 'c/8h', 'c/12h', 'c/24h',
  'c/8h por 7 días', 'c/12h por 5 días', 'c/12h por 7 días', 'c/12h por 10 días', 'c/12h por 14 días',
  'c/24h por 7 días', 'c/24h por 14 días', 'c/24h por 30 días', 'c/24h permanente',
  'c/8h (PRN dolor)', 'c/6h (PRN fiebre)',
];

export const viasAdministracion = ['Oral', 'Sublingual', 'Intravenosa', 'Intramuscular', 'Subcutánea', 'Inhalatoria', 'Tópica', 'Oftálmica', 'Ótica', 'Rectal', 'Vaginal'];

export const recetas: Receta[] = [
  {
    id: 'rec-mf-001',
    patientId: 'p1',
    patientName: 'María Fernanda López Hernández',
    patientExpediente: 'EXP-2024-0001',
    doctorId: 'd1',
    doctorName: 'Dr. Alejandro García Mendoza',
    doctorCedula: 'CED-09876543',
    consultaId: 'con-mf-001',
    fecha: '2026-08-20',
    hora: '09:48',
    medicamentos: [
      {
        id: 'mp-001',
        medicamentoId: 'm23',
        nombre: 'Losartán',
        presentacion: 'Tableta',
        concentracion: '50mg',
        dosis: '1 tableta',
        frecuencia: 'c/24h',
        via: 'Oral',
        duracion: 'c/24h por 30 días',
        indicaciones: 'Tomar por la mañana con un vaso de agua. No suspender sin indicación médica.',
      },
    ],
    indicacionesGenerales: 'IMPORTANTE: No suspender medicamento. Si presenta mareo severo, palpitaciones o dolor torácico, acudir a urgencias inmediatamente.',
    estado: 'activa',
    diagnosticoRelacionado: 'I10 - Hipertensión arterial esencial (primaria)',
  },
  {
    id: 'rec-p5-001',
    patientId: 'p5',
    patientName: 'Jorge Alberto Ramírez Duarte',
    patientExpediente: 'EXP-2024-0005',
    doctorId: 'd1',
    doctorName: 'Dr. Alejandro García Mendoza',
    doctorCedula: 'CED-09876543',
    consultaId: 'con-p5-001',
    fecha: '2026-08-20',
    hora: '10:50',
    medicamentos: [
      { id: 'mp-501', medicamentoId: 'm19', nombre: 'Metformina', presentacion: 'Tableta', concentracion: '850mg', dosis: '1 tableta', frecuencia: 'c/12h', via: 'Oral', duracion: 'c/12h por 30 días', indicaciones: 'Tomar con alimentos para reducir molestias gastrointestinales.' },
      { id: 'mp-502', medicamentoId: 'm21', nombre: 'Insulina glargina', presentacion: 'Pluma', concentracion: '100UI/ml', dosis: '22 UI', frecuencia: 'c/24h', via: 'Subcutánea', duracion: 'c/24h permanente', indicaciones: 'Aplicar por la noche a la misma hora. Rotar sitio de aplicación.' },
    ],
    indicacionesGenerales: 'Vigilar glucosa capilar en ayuno y postprandial. No omitir dosis de insulina.',
    estado: 'activa',
    diagnosticoRelacionado: 'E11.9 - Diabetes mellitus tipo 2 sin complicaciones',
  },
  {
    id: 'rec-p6-001',
    patientId: 'p6',
    patientName: 'Lucía Valentina Rojas Meza',
    patientExpediente: 'EXP-2024-0006',
    doctorId: 'd2',
    doctorName: 'Dra. Patricia Mendoza Ríos',
    doctorCedula: 'CED-08765432',
    consultaId: 'con-p6-001',
    fecha: '2026-08-20',
    hora: '11:30',
    medicamentos: [
      { id: 'mp-601', medicamentoId: 'm15', nombre: 'Salbutamol', presentacion: 'Inhalador', concentracion: '100mcg/dosis', dosis: '2 inhalaciones', frecuencia: 'c/8h', via: 'Inhalatoria', duracion: 'c/8h por 7 días', indicaciones: 'Usar con cámara espaciadora. En caso de crisis usar a demanda.' },
    ],
    indicacionesGenerales: 'Evitar exposición a polvo y alérgenos. Acudir a urgencias si hay dificultad respiratoria severa.',
    estado: 'activa',
    diagnosticoRelacionado: 'J45.9 - Asma no especificada',
  },
  {
    id: 'rec-p7-001',
    patientId: 'p7',
    patientName: 'Ramón Arturo Gutiérrez Salinas',
    patientExpediente: 'EXP-2024-0007',
    doctorId: 'd5',
    doctorName: 'Dr. Fernando Castillo Vega',
    doctorCedula: 'CED-05432109',
    consultaId: 'con-p7-001',
    fecha: '2026-08-20',
    hora: '11:55',
    medicamentos: [
      { id: 'mp-701', medicamentoId: 'm8', nombre: 'Azitromicina', presentacion: 'Tableta', concentracion: '500mg', dosis: '1 tableta', frecuencia: 'c/24h', via: 'Oral', duracion: 'c/24h por 3 días', indicaciones: 'Tomar una hora antes o dos horas después de alimentos.' },
      { id: 'mp-702', medicamentoId: 'm18', nombre: 'Prednisona', presentacion: 'Tableta', concentracion: '5mg', dosis: '4 tabletas', frecuencia: 'c/24h', via: 'Oral', duracion: 'c/24h por 5 días', indicaciones: 'Tomar por la mañana. No suspender de forma abrupta.' },
    ],
    indicacionesGenerales: 'Continuar con oxígeno suplementario domiciliario. Vigilar saturación.',
    estado: 'activa',
    diagnosticoRelacionado: 'J44.1 - EPOC con exacerbación aguda',
  },
  {
    id: 'rec-p8-001',
    patientId: 'p8',
    patientName: 'Valeria Fernanda Castillo Núñez',
    patientExpediente: 'EXP-2024-0008',
    doctorId: 'd4',
    doctorName: 'Dra. Gabriela Herrera López',
    doctorCedula: 'CED-06543210',
    consultaId: 'con-p8-001',
    fecha: '2026-08-20',
    hora: '10:00',
    medicamentos: [
      { id: 'mp-801', medicamentoId: 'm40', nombre: 'Hierro (Sulfato ferroso)', presentacion: 'Tableta', concentracion: '200mg', dosis: '1 tableta', frecuencia: 'c/24h', via: 'Oral', duracion: 'c/24h por 30 días', indicaciones: 'Tomar con jugo de cítricos para mejorar absorción. Evitar con lácteos.' },
    ],
    indicacionesGenerales: 'Continuar ácido fólico y suplementos prenatales. Acudir a control en 4 semanas.',
    estado: 'activa',
    diagnosticoRelacionado: 'Z34 - Supervisión de embarazo normal',
  },
  {
    id: 'rec-p9-001',
    patientId: 'p9',
    patientName: 'Miguel Ángel Contreras Peña',
    patientExpediente: 'EXP-2024-0009',
    doctorId: 'd1',
    doctorName: 'Dr. Alejandro García Mendoza',
    doctorCedula: 'CED-09876543',
    consultaId: 'con-p9-001',
    fecha: '2026-08-20',
    hora: '12:15',
    medicamentos: [
      { id: 'mp-901', medicamentoId: 'm26', nombre: 'AAS (Ácido Acetilsalicílico)', presentacion: 'Tableta', concentracion: '100mg', dosis: '1 tableta', frecuencia: 'c/24h', via: 'Oral', duracion: 'c/24h permanente', indicaciones: 'Tomar después de alimentos.' },
      { id: 'mp-902', medicamentoId: 'm27', nombre: 'Clopidogrel', presentacion: 'Tableta', concentracion: '75mg', dosis: '1 tableta', frecuencia: 'c/24h', via: 'Oral', duracion: 'c/24h permanente', indicaciones: 'Tomar a la misma hora todos los días.' },
    ],
    indicacionesGenerales: 'No suspender antiagregantes sin indicación. Ante sangrado acudir de inmediato.',
    estado: 'activa',
    diagnosticoRelacionado: 'I20.0 - Angina inestable',
  },
  {
    id: 'rec-p10-001',
    patientId: 'p10',
    patientName: 'Sofía Renata Delgado Márquez',
    patientExpediente: 'EXP-2024-0010',
    doctorId: 'd14',
    doctorName: 'Dr. Eduardo Ponce León',
    doctorCedula: 'CED-01234567',
    consultaId: 'con-p10-001',
    fecha: '2026-08-20',
    hora: '11:45',
    medicamentos: [
      { id: 'mp-1001', medicamentoId: 'm13', nombre: 'Loratadina', presentacion: 'Tableta', concentracion: '10mg', dosis: '1 tableta', frecuencia: 'c/24h', via: 'Oral', duracion: 'c/24h por 14 días', indicaciones: 'Tomar por la mañana para control del prurito.' },
    ],
    indicacionesGenerales: 'Aplicar emolientes y corticosteroide tópico según indicación. Evitar irritantes.',
    estado: 'activa',
    diagnosticoRelacionado: 'L20.9 - Dermatitis atópica no especificada',
  },
  {
    id: 'rec-p11-001',
    patientId: 'p11',
    patientName: 'Daniel Alejandro Cruz Santana',
    patientExpediente: 'EXP-2024-0011',
    doctorId: 'd1',
    doctorName: 'Dr. Alejandro García Mendoza',
    doctorCedula: 'CED-09876543',
    consultaId: 'con-p11-001',
    fecha: '2026-08-20',
    hora: '12:00',
    medicamentos: [
      { id: 'mp-1101', medicamentoId: 'm34', nombre: 'Sertralina', presentacion: 'Tableta', concentracion: '50mg', dosis: '1 tableta', frecuencia: 'c/24h', via: 'Oral', duracion: 'c/24h por 30 días', indicaciones: 'Tomar por la mañana. No suspender de forma abrupta.' },
    ],
    indicacionesGenerales: 'Continuar psicoterapia. Reportar efectos adversos o ideación suicida.',
    estado: 'activa',
    diagnosticoRelacionado: 'F41.1 - Trastorno de ansiedad generalizada',
  },
  {
    id: 'rec-p12-001',
    patientId: 'p12',
    patientName: 'Adriana Lucía Fuentes Robles',
    patientExpediente: 'EXP-2024-0012',
    doctorId: 'd5',
    doctorName: 'Dr. Fernando Castillo Vega',
    doctorCedula: 'CED-05432109',
    consultaId: 'con-p12-001',
    fecha: '2026-08-20',
    hora: '08:45',
    medicamentos: [
      { id: 'mp-1201', medicamentoId: 'm3', nombre: 'Naproxeno', presentacion: 'Tableta', concentracion: '500mg', dosis: '1 tableta', frecuencia: 'c/12h', via: 'Oral', duracion: 'c/12h por 7 días', indicaciones: 'Tomar con alimentos. No exceder dosis indicada.' },
    ],
    indicacionesGenerales: 'Reposo relativo y fisioterapia. Aplicar calor local.',
    estado: 'activa',
    diagnosticoRelacionado: 'M17.9 - Gonartrosis no especificada',
  },
  {
    id: 'rec-p13-001',
    patientId: 'p13',
    patientName: 'Enrique Gabriel Paredes Ochoa',
    patientExpediente: 'EXP-2024-0013',
    doctorId: 'd1',
    doctorName: 'Dr. Alejandro García Mendoza',
    doctorCedula: 'CED-09876543',
    consultaId: 'con-p13-001',
    fecha: '2026-08-20',
    hora: '12:10',
    medicamentos: [
      { id: 'mp-1301', medicamentoId: 'm11', nombre: 'Omeprazol', presentacion: 'Cápsula', concentracion: '20mg', dosis: '1 cápsula', frecuencia: 'c/24h', via: 'Oral', duracion: 'c/24h por 30 días', indicaciones: 'Tomar en ayunas, 30 minutos antes del desayuno.' },
    ],
    indicacionesGenerales: 'Evitar alimentos irritantes, alcohol y tabaco. Elevar cabecera de la cama.',
    estado: 'activa',
    diagnosticoRelacionado: 'K21.9 - Enfermedad por reflujo gastroesofágico',
  },
  {
    id: 'rec-p14-001',
    patientId: 'p14',
    patientName: 'Beatriz Elena Villanueva Mora',
    patientExpediente: 'EXP-2024-0014',
    doctorId: 'd5',
    doctorName: 'Dr. Fernando Castillo Vega',
    doctorCedula: 'CED-05432109',
    consultaId: 'con-p14-001',
    fecha: '2026-08-20',
    hora: '10:35',
    medicamentos: [
      { id: 'mp-1401', medicamentoId: 'm40', nombre: 'Hierro (Sulfato ferroso)', presentacion: 'Tableta', concentracion: '200mg', dosis: '1 tableta', frecuencia: 'c/24h', via: 'Oral', duracion: 'c/24h por 30 días', indicaciones: 'Tomar en ayunas con agua o jugo de naranja.' },
    ],
    indicacionesGenerales: 'Mantener hidratación adecuada. Continuar controles de nefrología.',
    estado: 'activa',
    diagnosticoRelacionado: 'N18.9 - Enfermedad renal crónica',
  },
  {
    id: 'rec-p15-001',
    patientId: 'p15',
    patientName: 'Guillermo Israel Mendoza Rocha',
    patientExpediente: 'EXP-2024-0015',
    doctorId: 'd1',
    doctorName: 'Dr. Alejandro García Mendoza',
    doctorCedula: 'CED-09876543',
    consultaId: 'con-p15-001',
    fecha: '2026-08-20',
    hora: '12:15',
    medicamentos: [
      { id: 'mp-1501', medicamentoId: 'm32', nombre: 'Levotiroxina', presentacion: 'Tableta', concentracion: '100mcg', dosis: '1 tableta', frecuencia: 'c/24h', via: 'Oral', duracion: 'c/24h permanente', indicaciones: 'Tomar en ayunas, 30-60 minutos antes del desayuno.' },
    ],
    indicacionesGenerales: 'Tomar siempre en ayunas. No combinar con suplementos de calcio o hierro.',
    estado: 'activa',
    diagnosticoRelacionado: 'E03.9 - Hipotiroidismo no especificado',
  },
  {
    id: 'rec-p16-001',
    patientId: 'p16',
    patientName: 'Regina Carolina Aguilar Soto',
    patientExpediente: 'EXP-2024-0016',
    doctorId: 'd2',
    doctorName: 'Dra. Patricia Mendoza Ríos',
    doctorCedula: 'CED-08765432',
    consultaId: 'con-p16-001',
    fecha: '2026-08-20',
    hora: '12:30',
    medicamentos: [
      { id: 'mp-1601', medicamentoId: 'm2', nombre: 'Ibuprofeno', presentacion: 'Tableta', concentracion: '400mg', dosis: '1 tableta', frecuencia: 'c/8h', via: 'Oral', duracion: 'c/8h por 3 días', indicaciones: 'Tomar con alimentos. No exceder dosis.' },
      { id: 'mp-1602', medicamentoId: 'm30', nombre: 'Metoclopramida', presentacion: 'Ampolleta', concentracion: '10mg/2ml', dosis: '1 ampolleta', frecuencia: 'c/8h', via: 'Intravenosa', duracion: 'c/8h (PRN náusea)', indicaciones: 'Aplicar lento. Usar solo si hay náusea persistente.' },
    ],
    indicacionesGenerales: 'Reposo en ambiente oscuro y silencioso. Valorar profilaxis de migraña.',
    estado: 'activa',
    diagnosticoRelacionado: 'G43.9 - Migraña sin aura',
  },
  {
    id: 'rec-p17-001',
    patientId: 'p17',
    patientName: 'Martín Eduardo Salazar Luna',
    patientExpediente: 'EXP-2024-0017',
    doctorId: 'd5',
    doctorName: 'Dr. Fernando Castillo Vega',
    doctorCedula: 'CED-05432109',
    consultaId: 'con-p17-001',
    fecha: '2026-08-20',
    hora: '12:40',
    medicamentos: [
      { id: 'mp-1701', medicamentoId: 'm3', nombre: 'Naproxeno', presentacion: 'Tableta', concentracion: '500mg', dosis: '1 tableta', frecuencia: 'c/12h', via: 'Oral', duracion: 'c/12h por 5 días', indicaciones: 'Tomar con alimentos.' },
    ],
    indicacionesGenerales: 'Reposo, hielo local 20 min cada 3 horas, elevación de la extremidad y vendaje elástico.',
    estado: 'activa',
    diagnosticoRelacionado: 'S93.4 - Esguince de tobillo',
  },
  {
    id: 'rec-p18-001',
    patientId: 'p18',
    patientName: 'Emilio Santiago Herrera Ruiz',
    patientExpediente: 'EXP-2024-0018',
    doctorId: 'd2',
    doctorName: 'Dra. Patricia Mendoza Ríos',
    doctorCedula: 'CED-08765432',
    consultaId: 'con-p18-001',
    fecha: '2026-08-20',
    hora: '09:45',
    medicamentos: [
      { id: 'mp-1801', medicamentoId: 'm6', nombre: 'Amoxicilina', presentacion: 'Cápsula', concentracion: '500mg', dosis: '1 cápsula', frecuencia: 'c/8h', via: 'Oral', duracion: 'c/8h por 7 días', indicaciones: 'Completar esquema completo aunque haya mejoría.' },
      { id: 'mp-1802', medicamentoId: 'm1', nombre: 'Paracetamol', presentacion: 'Tableta', concentracion: '500mg', dosis: '1 tableta', frecuencia: 'c/6h', via: 'Oral', duracion: 'c/6h (PRN fiebre)', indicaciones: 'Solo si fiebre mayor a 38°C. No exceder 4 dosis al día.' },
    ],
    indicacionesGenerales: 'Hidratación oral abundante. Acudir si persiste fiebre o dificultad respiratoria.',
    estado: 'activa',
    diagnosticoRelacionado: 'J03.9 - Amigdalitis aguda no especificada',
  },
  {
    id: 'rec-p20-001',
    patientId: 'p20',
    patientName: 'Óscar Julián Vega Domínguez',
    patientExpediente: 'EXP-2024-0020',
    doctorId: 'd5',
    doctorName: 'Dr. Fernando Castillo Vega',
    doctorCedula: 'CED-05432109',
    consultaId: 'con-p20-001',
    fecha: '2026-08-20',
    hora: '10:20',
    medicamentos: [
      { id: 'mp-2001', medicamentoId: 'm9', nombre: 'Ciprofloxacino', presentacion: 'Tableta', concentracion: '500mg', dosis: '1 tableta', frecuencia: 'c/12h', via: 'Oral', duracion: 'c/12h por 7 días', indicaciones: 'Tomar con abundante agua. Evitar antiácidos 2 horas antes/después.' },
      { id: 'mp-2002', medicamentoId: 'm11', nombre: 'Omeprazol', presentacion: 'Cápsula', concentracion: '20mg', dosis: '1 cápsula', frecuencia: 'c/24h', via: 'Oral', duracion: 'c/24h por 7 días', indicaciones: 'Tomar en ayunas.' },
    ],
    indicacionesGenerales: 'Hidratación con suero oral. Dieta blanda. Reposo.',
    estado: 'activa',
    diagnosticoRelacionado: 'A09 - Gastroenteritis de presunto origen infeccioso',
  },
  {
    id: 'rec-ce-001',
    patientId: 'p2',
    patientName: 'Carlos Eduardo Martínez Ruiz',
    patientExpediente: 'EXP-2024-0002',
    doctorId: 'd2',
    doctorName: 'Dra. Patricia Mendoza Ríos',
    doctorCedula: 'CED-08765432',
    consultaId: 'con-ce-001',
    fecha: '2026-08-20',
    hora: '10:20',
    medicamentos: [
      { id: 'mp-ce-1', medicamentoId: 'm3', nombre: 'Naproxeno', presentacion: 'Tableta', concentracion: '250mg', dosis: '1 tableta', frecuencia: 'c/12h', via: 'Oral', duracion: 'c/12h por 7 días', indicaciones: 'Tomar con alimentos.' },
      { id: 'mp-ce-2', medicamentoId: 'm29', nombre: 'Ciclobenzaprina', presentacion: 'Tableta', concentracion: '10mg', dosis: '1 tableta', frecuencia: 'c/24h', via: 'Oral', duracion: 'c/24h por 7 días', indicaciones: 'Tomar antes de dormir. Puede causar somnolencia.' },
    ],
    indicacionesGenerales: 'Evitar levantar objetos pesados y permanecer largos periodos sentado. Aplicar compresas calientes locales y realizar pausas activas. No manejar ni operar maquinaria mientras tome ciclobenzaprina.',
    estado: 'activa',
    diagnosticoRelacionado: 'M54.5 - Lumbalgia no especificada',
  },
];

const todasLasRecetas = (): Receta[] => [...recetas, ...recetasUrgencia];

export const getRecetaById = (id: string): Receta | undefined => todasLasRecetas().find((r) => r.id === id);

export const getRecetasByUrgencia = (urgenciaId: string): Receta[] =>
  recetasUrgencia.filter((r) => r.urgenciaId === urgenciaId).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora));

export const getRecetasUrgenciasActivas = (): Receta[] =>
  recetasUrgencia.filter((r) => r.estado === 'activa').sort((a, b) => {
    const urgAPrio = getUrgenciaPriority(a.urgenciaId || '');
    const urgBPrio = getUrgenciaPriority(b.urgenciaId || '');
    if (urgAPrio !== urgBPrio) return urgAPrio - urgBPrio;
    return b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora);
  });

function getUrgenciaPriority(urgenciaId: string): number {
  const priorityMap: Record<string, number> = { 'urg-001': 0, 'urg-004': 0, 'urg-002': 1, 'urg-007': 1, 'urg-003': 2, 'urg-006': 2, 'urg-005': 3, 'urg-008': 3 };
  return priorityMap[urgenciaId] ?? 99;
}

export const recetasUrgencia: Receta[] = [];

const recetasUrgenciaListeners = new Set<() => void>();

// Registro global de recetas de urgencia para que el flujo
// Urgencias -> Farmacia comparta la misma lista (mismo patrón
// que useAppointmentsState / useUrgenciasState).
export function addRecetaUrgenciaGlobal(receta: Receta) {
  recetasUrgencia.push(receta);
  recetasUrgenciaListeners.forEach((fn) => fn());
}

// Actualiza una receta de urgencia ya registrada (p. ej. cuando Farmacia la
// marca como surtida/parcial) para que Urgencias y Recetas reflejen el cambio
// de estado en tiempo real.
export function updateRecetaUrgenciaGlobal(receta: Receta) {
  const idx = recetasUrgencia.findIndex((r) => r.id === receta.id);
  if (idx >= 0) {
    recetasUrgencia[idx] = receta;
  } else {
    recetasUrgencia.push(receta);
  }
  recetasUrgenciaListeners.forEach((fn) => fn());
}

export function subscribeRecetasUrgencia(fn: () => void) {
  recetasUrgenciaListeners.add(fn);
  return () => {
    recetasUrgenciaListeners.delete(fn);
  };
}

export const getRecetasByPatient = (patientId: string): Receta[] =>
  recetas.filter((r) => r.patientId === patientId).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora));

export const getRecetasByConsulta = (consultaId: string): Receta[] =>
  recetas.filter((r) => r.consultaId === consultaId);

export const searchMedicamentos = (query: string): Medicamento[] => {
  const q = query.toLowerCase();
  return catalogoMedicamentos.filter(
    (m) => m.nombre.toLowerCase().includes(q) || m.categoria.toLowerCase().includes(q) || m.presentacion.toLowerCase().includes(q)
  ).slice(0, 15);
};