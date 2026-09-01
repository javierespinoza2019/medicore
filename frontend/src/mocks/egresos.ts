export interface HojaEgreso {
  id: string;
  patientId: string;
  patientName: string;
  patientExpediente: string;
  fechaIngreso: string;
  horaIngreso: string;
  fechaEgreso: string;
  horaEgreso: string;
  motivoIngreso: string;
  diagnosticoIngreso: string;
  diagnosticosSecundarios: string[];
  resumenEvolucion: string;
  tratamientoRecibido: string[];
  estudiosRealizados: string[];
  diagnosticoEgreso: string;
  estadoAlta: 'mejorado' | 'curado' | 'estable' | 'inconcluso' | 'fallecimiento';
  destinoAlta: 'domicilio' | 'hospital' | 'otra_unidad' | 'referencia' | 'defuncion';
  recomendaciones: string;
  medicamentosAlta: { nombre: string; dosis: string; frecuencia: string; duracion: string }[];
  citaControl?: string;
  medicoTratante: string;
  cedulaTratante: string;
  especialidad: string;
  firmaPaciente: boolean;
  firmaMedico: boolean;
  observaciones?: string;
}

export const estadoAltaConfig: Record<HojaEgreso['estadoAlta'], { label: string; bg: string; text: string; icon: string }> = {
  mejorado: { label: 'Mejorado', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'ri-arrow-up-line' },
  curado: { label: 'Curado', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'ri-check-double-line' },
  estable: { label: 'Estable', bg: 'bg-sky-50', text: 'text-sky-700', icon: 'ri-equalizer-line' },
  inconcluso: { label: 'Inconcluso', bg: 'bg-amber-50', text: 'text-amber-700', icon: 'ri-error-warning-line' },
  fallecimiento: { label: 'Fallecimiento', bg: 'bg-red-50', text: 'text-red-700', icon: 'ri-heart-3-line' },
};

export const destinoAltaConfigEgreso: Record<HojaEgreso['destinoAlta'], { label: string; icon: string }> = {
  domicilio: { label: 'Domicilio', icon: 'ri-home-line' },
  hospital: { label: 'Hospitalización', icon: 'ri-hospital-line' },
  otra_unidad: { label: 'Otra unidad médica', icon: 'ri-building-line' },
  referencia: { label: 'Referencia médica', icon: 'ri-arrow-right-line' },
  defuncion: { label: 'Defunción', icon: 'ri-heart-3-line' },
};

export const egresosMock: HojaEgreso[] = [
  {
    id: 'eg-p9-001',
    patientId: 'p9',
    patientName: 'Miguel Ángel Contreras Peña',
    patientExpediente: 'EXP-2024-0009',
    fechaIngreso: '2026-08-20',
    horaIngreso: '12:30',
    fechaEgreso: '2026-08-20',
    horaEgreso: '15:45',
    motivoIngreso: 'Dolor precordial opresivo de 40 min de evolución, irradiado a mandíbula, con diaforesis. Antecedente de IAM en 2023 con stent en DA.',
    diagnosticoIngreso: 'I21.0 - Infarto agudo del miocardio anteroseptal',
    diagnosticosSecundarios: ['Z95.1 - Presencia de stent coronario', 'E78.5 - Dislipidemia no especificada'],
    resumenEvolucion: 'Paciente ingresó por SCACEST con supradesnivel ST en V1-V4. Se activó código infarto. Angioplastia primaria exitosa a las 13:20 hrs con stent farmacoactivo 3.0x18mm en DA proximal. Post-procedimiento sin complicaciones. Troponina I en descenso. ECG post-TCI con resolución del supradesnivel ST. Sin arritmias.',
    tratamientoRecibido: ['Aspirina 325mg VO carga', 'Clopidogrel 600mg VO carga', 'Enoxaparina 1mg/kg SC c/12h', 'Atorvastatina 80mg VO c/24h', 'Metoprolol 50mg VO c/12h', 'Nitroglicerina IV (suspendida post-TCI)', 'Oxígeno suplementario 2L/min'],
    estudiosRealizados: ['ECG 12D: supradesnivel ST V1-V4', 'Troponina I: 2.8 ng/mL', 'Angiografía coronaria con TCI primaria', 'Eco TT post-TCI: FE 58%'],
    diagnosticoEgreso: 'I21.0 - IAM anteroseptal tratado con TCI primaria exitosa. Stent farmacoactivo en DA. Sin complicaciones post-procedimiento.',
    estadoAlta: 'mejorado',
    destinoAlta: 'referencia',
    recomendaciones: '1. Continuar doble antiagregación por 12 meses. 2. Atorvastatina 80mg (LDL objetivo <70). 3. Rehabilitación cardíaca ambulatoria. 4. Control cardiología a 2 semanas. 5. Evitar esfuerzo físico intenso por 4 semanas. 6. Dieta cardiosaludable.',
    medicamentosAlta: [
      { nombre: 'Aspirina', dosis: '100mg', frecuencia: 'c/24h', duracion: 'Indefinido' },
      { nombre: 'Clopidogrel', dosis: '75mg', frecuencia: 'c/24h', duracion: '12 meses' },
      { nombre: 'Atorvastatina', dosis: '80mg', frecuencia: 'c/24h', duracion: 'Indefinido' },
      { nombre: 'Metoprolol', dosis: '50mg', frecuencia: 'c/12h', duracion: 'Indefinido' },
    ],
    citaControl: '2026-09-03 - Cardiología Intervencionista',
    medicoTratante: 'Dr. Alejandro García Mendoza',
    cedulaTratante: 'CED-09876543',
    especialidad: 'Medicina General',
    firmaPaciente: true,
    firmaMedico: true,
    observaciones: 'Se entrega contrarreferencia del Hospital Cardiovascular del Sur. Paciente consciente, orientado, hemodinámicamente estable al egreso. Se explica importancia de adherencia a doble antiagregación.',
  },
  {
    id: 'eg-p20-001',
    patientId: 'p20',
    patientName: 'Óscar Julián Vega Domínguez',
    patientExpediente: 'EXP-2024-0020',
    fechaIngreso: '2026-08-20',
    horaIngreso: '10:15',
    fechaEgreso: '2026-08-20',
    horaEgreso: '14:30',
    motivoIngreso: 'Gastroenteritis aguda con vómito y diarrea acuosa de 12 hrs de evolución, asociado a consumo de mariscos. Datos de deshidratación leve.',
    diagnosticoIngreso: 'A09 - Gastroenteritis de presunto origen infeccioso',
    diagnosticosSecundarios: ['E86 - Deshidratación leve'],
    resumenEvolucion: 'Paciente recibió hidratación con suero oral y antibioterapia (Ciprofloxacino 500mg c/12h). Evolucionó favorablemente con cese de vómitos en las primeras 4 horas. Diarrea se redujo a 2 evacuaciones sueltas en 6 horas. Sin fiebre. Mucosas hidratadas al egreso.',
    tratamientoRecibido: ['Suero oral 200mL c/30min', 'Ciprofloxacino 500mg VO c/12h', 'Omeprazol 20mg VO c/24h'],
    estudiosRealizados: ['Química sanguínea: electrolitos en rango', 'Coproparasitoscópico: leucocitos +++, eritrocitos negativos', 'Hemograma: leucocitosis leve 11,500'],
    diagnosticoEgreso: 'A09 - Gastroenteritis aguda (probable infección bacteriana por mariscos). Resuelta con tratamiento ambulatorio.',
    estadoAlta: 'curado',
    destinoAlta: 'domicilio',
    recomendaciones: '1. Continuar Ciprofloxacino por 5 días. 2. Dieta blanda por 48 horas (BRAT). 3. Hidratación abundante. 4. Evitar lácteos y alimentos irritantes por 72 hrs. 5. Revisar coproparasitoscópico de control en 7 días. 6. Evitar mariscos crudos o mal cocidos.',
    medicamentosAlta: [
      { nombre: 'Ciprofloxacino', dosis: '500mg', frecuencia: 'c/12h', duracion: '5 días' },
      { nombre: 'Omeprazol', dosis: '20mg', frecuencia: 'c/24h', duracion: '7 días' },
    ],
    citaControl: '2026-08-27 - Medicina General',
    medicoTratante: 'Dr. Fernando Castillo Vega',
    cedulaTratante: 'CED-05432109',
    especialidad: 'Medicina General',
    firmaPaciente: true,
    firmaMedico: true,
    observaciones: 'Paciente con evolución favorable. Se entrega guía de alimentación y manejo de deshidratación en casa. Se instruye sobre signos de alarma (sangrado, fiebre persistente, vómito incontrolable).',
  },
  {
    id: 'eg-p17-001',
    patientId: 'p17',
    patientName: 'Martín Eduardo Salazar Luna',
    patientExpediente: 'EXP-2024-0017',
    fechaIngreso: '2026-08-20',
    horaIngreso: '12:25',
    fechaEgreso: '2026-08-20',
    horaEgreso: '16:00',
    motivoIngreso: 'Esguince de tobillo derecho por inversión forzada durante actividad deportiva. Dolor e impotencia funcional.',
    diagnosticoIngreso: 'S93.4 - Esguince de tobillo',
    diagnosticosSecundarios: [],
    resumenEvolucion: 'Paciente valorado en urgencias. Radiografía AP y lateral de tobillo: sin datos de fractura ni luxación. Esguince grado II de ligamentos colaterales laterales. Se aplicó vendaje elástico compresivo. Se indicó reposo, elevación y hielo. Mejoría significativa del dolor y edema en 3 horas.',
    tratamientoRecibido: ['Naproxeno 250mg VO c/12h', 'Hielo local 15min c/2h', 'Vendaje elástico compresivo', 'Elevación y reposo'],
    estudiosRealizados: ['Radiografía AP tobillo derecho: sin fractura', 'Radiografía Lateral tobillo derecho: sin luxación', 'Test de Ottawa: negativo'],
    diagnosticoEgreso: 'S93.4 - Esguince de tobillo grado II. Sin fractura asociada. Manejo conservador exitoso.',
    estadoAlta: 'mejorado',
    destinoAlta: 'domicilio',
    recomendaciones: '1. Continuar AINE por 5 días. 2. Vendaje elástico por 7 días. 3. Elevación y hielo por 48 hrs. 4. Iniciar movilización activa gradual a las 72 hrs. 5. Fisioterapia a la semana 2. 6. No retornar a actividad deportiva antes de 3 semanas.',
    medicamentosAlta: [
      { nombre: 'Naproxeno', dosis: '250mg', frecuencia: 'c/12h', duracion: '5 días' },
    ],
    citaControl: '2026-08-27 - Medicina General',
    medicoTratante: 'Dr. Fernando Castillo Vega',
    cedulaTratante: 'CED-05432109',
    especialidad: 'Medicina General',
    firmaPaciente: true,
    firmaMedico: true,
    observaciones: 'Se entrega radiografía en CD para control con traumatología. Paciente instruido sobre rehabilitación temprana.',
  },
  {
    id: 'eg-p18-001',
    patientId: 'p18',
    patientName: 'Emilio Santiago Herrera Ruiz',
    patientExpediente: 'EXP-2024-0018',
    fechaIngreso: '2026-08-20',
    horaIngreso: '09:30',
    fechaEgreso: '2026-08-20',
    horaEgreso: '13:15',
    motivoIngreso: 'Amigdalitis aguda con fiebre de 39.8°C de 2 días, irritabilidad y rechazo a la vía oral. Leucocitosis con neutrofilia.',
    diagnosticoIngreso: 'J03.9 - Amigdalitis aguda no especificada (probable estreptocócica)',
    diagnosticosSecundarios: ['R50.9 - Fiebre'],
    resumenEvolucion: 'Paciente pediátrico recibió antipirético (Paracetamol 10mg/kg) y antibioterapia IV con Ampicilina/Sulbactam 50mg/kg c/8h. Fiebre cedió a las 2 horas post-antibioterapia. Mejoró hidratación con solución IV. Inició vía oral tolerada. Cultivo faríngeo tomado.',
    tratamientoRecibido: ['Paracetamol 10mg/kg VO/PR c/6h', 'Ampicilina/Sulbactam 50mg/kg IV c/8h', 'Suero fisiológico IV', 'Hidratación oral forzada'],
    estudiosRealizados: ['Hemograma: leucocitosis 16,500, neutrofilia 78%', 'PCR: 12 mg/L', 'Grupo sanguíneo A+', 'Cultivo faríngeo: en proceso'],
    diagnosticoEgreso: 'J03.9 - Amigdalitis aguda (sospecha estreptocócica) en resolución. Cultivo faríngeo pendiente.',
    estadoAlta: 'mejorado',
    destinoAlta: 'domicilio',
    recomendaciones: '1. Continuar Amoxicilina/Ác. Clavulánico 400mg/57mg/5mL (3.5mL c/12h) por 10 días. 2. Paracetamol si fiebre >38.5°C. 3. Hidratación abundante. 4. Control de cultivo faríngeo en 48 hrs. 5. Signos de alarma: fiebre persistente >48h, dificultad respiratoria, rechazo total a alimentos, letargo.',
    medicamentosAlta: [
      { nombre: 'Amoxicilina/Ác. Clavulánico', dosis: '400/57mg/5mL - 3.5mL', frecuencia: 'c/12h', duracion: '10 días' },
      { nombre: 'Paracetamol', dosis: '10mg/kg', frecuencia: 'c/6h si fiebre', duracion: 'PRN' },
    ],
    citaControl: '2026-08-22 - Pediatría (revisión de cultivo)',
    medicoTratante: 'Dra. Patricia Mendoza Ríos',
    cedulaTratante: 'CED-08765432',
    especialidad: 'Pediatría',
    firmaPaciente: true,
    firmaMedico: true,
    observaciones: 'Tutor (madre) instruida sobre importancia de completar antibioterapia por 10 días aunque el niño mejore antes. Se entrega guía de cuidados en casa.',
  },
];

export const getEgresosByPatient = (patientId: string): HojaEgreso[] =>
  egresosMock.filter((e) => e.patientId === patientId);