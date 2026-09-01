// ─────────────────────────────────────────────────────────────
// Facturación CFDI 4.0 — catálogos SAT y datos de demostración
// ─────────────────────────────────────────────────────────────

export type FacturaEstado = 'vigente' | 'cancelada';

export interface FacturaConcepto {
  claveProdServ: string;
  claveUnidad: string;
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  importe: number;
  descuento: number;
}

export interface FacturaTraslado {
  impuesto: string;
  tipoFactor: 'Tasa' | 'Exento';
  tasaOCuota: number;
  base: number;
  importe: number;
}

export interface FacturaCFDI {
  id: string;
  serie: string;
  folio: string;
  uuid: string;
  fechaEmision: string;
  fechaTimbrado: string;
  // Emisor (clínica)
  rfcEmisor: string;
  nombreEmisor: string;
  regimenEmisor: string;
  regimenEmisorNombre: string;
  // Receptor (paciente)
  rfcReceptor: string;
  nombreReceptor: string;
  regimenReceptor: string;
  regimenReceptorNombre: string;
  usoCfdi: string;
  usoCfdiNombre: string;
  correoReceptor: string;
  // Pago
  metodoPago: string;
  metodoPagoNombre: string;
  formaPago: string;
  formaPagoNombre: string;
  moneda: string;
  // Importes
  subtotal: number;
  descuento: number;
  total: number;
  impuestos: {
    traslados: FacturaTraslado[];
  };
  conceptos: FacturaConcepto[];
  // Control
  estado: FacturaEstado;
  transaccionId: string;
  pacienteId: string;
  paciente: string;
  usuario: string;
  // Sello digital (representativo)
  certificadoSAT: string;
  selloCFD: string;
  selloSAT: string;
  cadenaOriginal: string;
}

// ── Catálogos SAT (CFDI 4.0) ──

export const usosCfdi = [
  { value: 'G01', label: 'G01 — Adquisición de mercancías' },
  { value: 'G02', label: 'G02 — Devoluciones, descuentos o bonificaciones' },
  { value: 'G03', label: 'G03 — Gastos en general' },
  { value: 'D01', label: 'D01 — Honorarios médicos, dentales y gastos hospitalarios' },
  { value: 'D02', label: 'D02 — Gastos médicos por incapacidad o discapacidad' },
  { value: 'D04', label: 'D04 — Donativos' },
  { value: 'D10', label: 'D10 — Pagos por servicios educativos' },
  { value: 'P01', label: 'P01 — Por definir' },
];

export const regimenesFiscales = [
  { value: '601', label: '601 — General de Ley Personas Morales' },
  { value: '603', label: '603 — Personas Morales con Fines no Lucrativos' },
  { value: '606', label: '606 — Arrendamiento' },
  { value: '612', label: '612 — Personas Físicas con Actividades Empresariales y Profesionales' },
  { value: '614', label: '614 — Ingresos por intereses' },
  { value: '616', label: '616 — Sin obligaciones fiscales' },
  { value: '625', label: '625 — Act. Empresariales con ingresos por Plataformas Tecnológicas' },
  { value: '626', label: '626 — Régimen Simplificado de Confianza' },
];

export const formasPago = [
  { value: '01', label: '01 — Efectivo' },
  { value: '02', label: '02 — Cheque nominativo' },
  { value: '03', label: '03 — Transferencia electrónica de fondos' },
  { value: '04', label: '04 — Tarjeta de crédito' },
  { value: '28', label: '28 — Tarjeta de débito' },
  { value: '99', label: '99 — Por definir' },
];

export const metodosPago = [
  { value: 'PUE', label: 'PUE — Pago en una sola exhibición' },
  { value: 'PPD', label: 'PPD — Pago en parcialidades o diferido' },
];

export const clavesProdServ = [
  { value: '85121800', label: '85121800 — Servicios médicos y de salud' },
  { value: '85121801', label: '85121801 — Servicios de consulta médica' },
  { value: '85121802', label: '85121802 — Servicios de laboratorio clínico' },
  { value: '85121803', label: '85121803 — Servicios de hospitalización' },
];

// ── Datos del emisor (clínica) ──

export const emisorFiscal = {
  rfc: 'MCO240101ABC',
  nombre: 'MediCore Servicios Médicos, S.A. de C.V.',
  regimen: '601',
  regimenNombre: 'General de Ley Personas Morales',
  domicilio: 'Av. Paseo de la Reforma 234, Col. Juárez, Cuauhtémoc, CDMX, C.P. 06600',
  lugarExpedicion: '06600',
};

// ── Facturas de demostración ──

export const facturasIniciales: FacturaCFDI[] = [
  {
    id: 'fac-0001',
    serie: 'FAC-A',
    folio: '0001',
    uuid: 'A1B2C3D4-5E6F-7890-ABCD-EF1234567890',
    fechaEmision: '2026-08-20T09:58:00',
    fechaTimbrado: '2026-08-20T09:58:11',
    rfcEmisor: 'MCO240101ABC',
    nombreEmisor: 'MediCore Servicios Médicos, S.A. de C.V.',
    regimenEmisor: '601',
    regimenEmisorNombre: 'General de Ley Personas Morales',
    rfcReceptor: 'LOHM850512M91',
    nombreReceptor: 'María Fernanda López Hernández',
    regimenReceptor: '612',
    regimenReceptorNombre: 'Personas Físicas con Actividades Empresariales y Profesionales',
    usoCfdi: 'D01',
    usoCfdiNombre: 'Honorarios médicos, dentales y gastos hospitalarios',
    correoReceptor: 'maria.lopez@correo.mx',
    metodoPago: 'PUE',
    metodoPagoNombre: 'Pago en una sola exhibición',
    formaPago: '04',
    formaPagoNombre: 'Tarjeta de crédito',
    moneda: 'MXN',
    subtotal: 500,
    descuento: 0,
    total: 500,
    impuestos: { traslados: [] },
    conceptos: [
      {
        claveProdServ: '85121801',
        claveUnidad: 'E48',
        descripcion: 'Consulta de Medicina General',
        cantidad: 1,
        valorUnitario: 500,
        importe: 500,
        descuento: 0,
      },
    ],
    estado: 'vigente',
    transaccionId: 'trx-mf-001',
    pacienteId: 'p1',
    paciente: 'María Fernanda López Hernández',
    usuario: 'Laura Torres Jiménez',
    certificadoSAT: '00001000000409193623',
    selloCFD: 'kB0y9+5x7fQ2mZ8lT1nR4wV6cX3eA0sD...',
    selloSAT: 'w7P2m9zQ4xV6bN8cR1tY5uI3oK0jH7gF...',
    cadenaOriginal: '||4.0|FAC-A|0001|2026-08-20T09:58:00|01|PUE|500.00|MXN|D01|MCO240101ABC|MediCore|601|LOHM850512M91|María...|',
  },
  {
    id: 'fac-0002',
    serie: 'FAC-A',
    folio: '0002',
    uuid: 'B2C3D4E5-6F7A-8901-BCDE-F12345678901',
    fechaEmision: '2026-08-20T10:55:00',
    fechaTimbrado: '2026-08-20T10:55:09',
    rfcEmisor: 'MCO240101ABC',
    nombreEmisor: 'MediCore Servicios Médicos, S.A. de C.V.',
    regimenEmisor: '601',
    regimenEmisorNombre: 'General de Ley Personas Morales',
    rfcReceptor: 'RADJ790812H42',
    nombreReceptor: 'Jorge Alberto Ramírez Duarte',
    regimenReceptor: '605',
    regimenReceptorNombre: 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
    usoCfdi: 'G03',
    usoCfdiNombre: 'Gastos en general',
    correoReceptor: 'jorge.ramirez@correo.mx',
    metodoPago: 'PUE',
    metodoPagoNombre: 'Pago en una sola exhibición',
    formaPago: '01',
    formaPagoNombre: 'Efectivo',
    moneda: 'MXN',
    subtotal: 500,
    descuento: 0,
    total: 500,
    impuestos: { traslados: [] },
    conceptos: [
      {
        claveProdServ: '85121801',
        claveUnidad: 'E48',
        descripcion: 'Consulta de Medicina General',
        cantidad: 1,
        valorUnitario: 500,
        importe: 500,
        descuento: 0,
      },
    ],
    estado: 'vigente',
    transaccionId: 'trx-p5-001',
    pacienteId: 'p5',
    paciente: 'Jorge Alberto Ramírez Duarte',
    usuario: 'Laura Torres Jiménez',
    certificadoSAT: '00001000000409193623',
    selloCFD: 'q3X8zL2mN5bV7cR0tY4uI6oK1jH9gF0s...',
    selloSAT: 'e8R1tY5uI3oK0jH7gF2sD5aZ9xV4bN6mC...',
    cadenaOriginal: '||4.0|FAC-A|0002|2026-08-20T10:55:00|01|PUE|500.00|MXN|G03|MCO240101ABC|MediCore|601|RADJ790812H42|Jorge...|',
  },
  {
    id: 'fac-0003',
    serie: 'FAC-A',
    folio: '0003',
    uuid: 'C3D4E5F6-7A8B-9012-CDEF-123456789012',
    fechaEmision: '2026-08-20T11:44:00',
    fechaTimbrado: '2026-08-20T11:44:13',
    rfcEmisor: 'MCO240101ABC',
    nombreEmisor: 'MediCore Servicios Médicos, S.A. de C.V.',
    regimenEmisor: '601',
    regimenEmisorNombre: 'General de Ley Personas Morales',
    rfcReceptor: 'DEMS900304M75',
    nombreReceptor: 'Sofía Renata Delgado Márquez',
    regimenReceptor: '612',
    regimenReceptorNombre: 'Personas Físicas con Actividades Empresariales y Profesionales',
    usoCfdi: 'G03',
    usoCfdiNombre: 'Gastos en general',
    correoReceptor: 'sofia.delgado@correo.mx',
    metodoPago: 'PUE',
    metodoPagoNombre: 'Pago en una sola exhibición',
    formaPago: '04',
    formaPagoNombre: 'Tarjeta de crédito',
    moneda: 'MXN',
    subtotal: 650,
    descuento: 0,
    total: 650,
    impuestos: { traslados: [] },
    conceptos: [
      {
        claveProdServ: '85121801',
        claveUnidad: 'E48',
        descripcion: 'Revisión Dermatológica',
        cantidad: 1,
        valorUnitario: 650,
        importe: 650,
        descuento: 0,
      },
    ],
    estado: 'vigente',
    transaccionId: 'trx-p10-001',
    pacienteId: 'p10',
    paciente: 'Sofía Renata Delgado Márquez',
    usuario: 'Laura Torres Jiménez',
    certificadoSAT: '00001000000409193623',
    selloCFD: 'n5Bv7Cx9Z2mL4qV6wT8yR0uI3oK1jH5gF...',
    selloSAT: 'uI3oK1jH5gF2sD8aZ9xV4bN6mC0qT7yR0...',
    cadenaOriginal: '||4.0|FAC-A|0003|2026-08-20T11:44:00|04|PUE|650.00|MXN|G03|MCO240101ABC|MediCore|601|DEMS900304M75|Sofía...|',
  },
  {
    id: 'fac-0004',
    serie: 'FAC-A',
    folio: '0004',
    uuid: 'D4E5F6A7-8B9C-0123-DEFA-234567890123',
    fechaEmision: '2026-08-20T10:40:00',
    fechaTimbrado: '2026-08-20T10:40:17',
    rfcEmisor: 'MCO240101ABC',
    nombreEmisor: 'MediCore Servicios Médicos, S.A. de C.V.',
    regimenEmisor: '601',
    regimenEmisorNombre: 'General de Ley Personas Morales',
    rfcReceptor: 'VIMB810211M33',
    nombreReceptor: 'Beatriz Elena Villanueva Mora',
    regimenReceptor: '605',
    regimenReceptorNombre: 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
    usoCfdi: 'D01',
    usoCfdiNombre: 'Honorarios médicos, dentales y gastos hospitalarios',
    correoReceptor: 'beatriz.villanueva@correo.mx',
    metodoPago: 'PUE',
    metodoPagoNombre: 'Pago en una sola exhibición',
    formaPago: '01',
    formaPagoNombre: 'Efectivo',
    moneda: 'MXN',
    subtotal: 500,
    descuento: 0,
    total: 500,
    impuestos: { traslados: [] },
    conceptos: [
      {
        claveProdServ: '85121801',
        claveUnidad: 'E48',
        descripcion: 'Consulta de Medicina General',
        cantidad: 1,
        valorUnitario: 500,
        importe: 500,
        descuento: 0,
      },
    ],
    estado: 'vigente',
    transaccionId: 'trx-p14-001',
    pacienteId: 'p14',
    paciente: 'Beatriz Elena Villanueva Mora',
    usuario: 'Laura Torres Jiménez',
    certificadoSAT: '00001000000409193623',
    selloCFD: 'z9Xv4Bq6Wt8Yr2Uo5Ii3Pk1Jm7Hn0Gf4S...',
    selloSAT: 'k1Jm7Hn0Gf4Sd9Az3Xc6Vb2Nq5Wt8Yr0Uo...',
    cadenaOriginal: '||4.0|FAC-A|0004|2026-08-20T10:40:00|01|PUE|500.00|MXN|D01|MCO240101ABC|MediCore|601|VIMB810211M33|Beatriz...|',
  },
  {
    id: 'fac-0005',
    serie: 'FAC-A',
    folio: '0005',
    uuid: 'E5F6A7B8-9C0D-1234-EFAB-345678901234',
    fechaEmision: '2026-08-20T11:52:00',
    fechaTimbrado: '2026-08-20T11:52:08',
    rfcEmisor: 'MCO240101ABC',
    nombreEmisor: 'MediCore Servicios Médicos, S.A. de C.V.',
    regimenEmisor: '601',
    regimenEmisorNombre: 'General de Ley Personas Morales',
    rfcReceptor: 'GUSR751104K85',
    nombreReceptor: 'Ramón Arturo Gutiérrez Salinas',
    regimenReceptor: '616',
    regimenReceptorNombre: 'Sin obligaciones fiscales',
    usoCfdi: 'G03',
    usoCfdiNombre: 'Gastos en general',
    correoReceptor: 'ramon.gutierrez@correo.mx',
    metodoPago: 'PUE',
    metodoPagoNombre: 'Pago en una sola exhibición',
    formaPago: '01',
    formaPagoNombre: 'Efectivo',
    moneda: 'MXN',
    subtotal: 500,
    descuento: 50,
    total: 450,
    impuestos: { traslados: [] },
    conceptos: [
      {
        claveProdServ: '85121801',
        claveUnidad: 'E48',
        descripcion: 'Consulta de Medicina General',
        cantidad: 1,
        valorUnitario: 500,
        importe: 500,
        descuento: 50,
      },
    ],
    estado: 'cancelada',
    transaccionId: 'trx-p7-001',
    pacienteId: 'p7',
    paciente: 'Ramón Arturo Gutiérrez Salinas',
    usuario: 'Laura Torres Jiménez',
    certificadoSAT: '00001000000409193623',
    selloCFD: 'c6Vb2Nq5Wt8Yr0Uo5Ii3Pk1Jm7Hn0Gf4S...',
    selloSAT: 'o5Ii3Pk1Jm7Hn0Gf4Sd9Az3Xc6Vb2Nq5Wt...',
    cadenaOriginal: '||4.0|FAC-A|0005|2026-08-20T11:52:00|01|PUE|450.00|MXN|G03|MCO240101ABC|MediCore|601|GUSR751104K85|Ramón...|',
  },
  {
    id: 'fac-0006',
    serie: 'FAC-A',
    folio: '0006',
    uuid: 'F6A7B8C9-0D1E-2345-FABC-456789012345',
    fechaEmision: '2026-08-20T09:20:00',
    fechaTimbrado: '2026-08-20T09:20:21',
    rfcEmisor: 'MCO240101ABC',
    nombreEmisor: 'MediCore Servicios Médicos, S.A. de C.V.',
    regimenEmisor: '601',
    regimenEmisorNombre: 'General de Ley Personas Morales',
    rfcReceptor: 'RIPK900522Q60',
    nombreReceptor: 'Karla Fernanda Ríos Pacheco',
    regimenReceptor: '612',
    regimenReceptorNombre: 'Personas Físicas con Actividades Empresariales y Profesionales',
    usoCfdi: 'G03',
    usoCfdiNombre: 'Gastos en general',
    correoReceptor: 'karla.rios@correo.mx',
    metodoPago: 'PUE',
    metodoPagoNombre: 'Pago en una sola exhibición',
    formaPago: '04',
    formaPagoNombre: 'Tarjeta de crédito',
    moneda: 'MXN',
    subtotal: 800,
    descuento: 0,
    total: 928,
    impuestos: {
      traslados: [
        { impuesto: '002', tipoFactor: 'Tasa', tasaOCuota: 0.16, base: 800, importe: 128 },
      ],
    },
    conceptos: [
      {
        claveProdServ: '85121800',
        claveUnidad: 'E48',
        descripcion: 'Atención de urgencia (sutura y aseo quirúrgico)',
        cantidad: 1,
        valorUnitario: 800,
        importe: 800,
        descuento: 0,
      },
    ],
    estado: 'vigente',
    transaccionId: 'trx-p21-001',
    pacienteId: 'p21',
    paciente: 'Karla Fernanda Ríos Pacheco',
    usuario: 'Laura Torres Jiménez',
    certificadoSAT: '00001000000409193623',
    selloCFD: 't8Yr0Uo5Ii3Pk1Jm7Hn0Gf4Sd9Az3Xc6Vb...',
    selloSAT: 'b2Nq5Wt8Yr0Uo5Ii3Pk1Jm7Hn0Gf4Sd9Az...',
    cadenaOriginal: '||4.0|FAC-A|0006|2026-08-20T09:20:00|04|PUE|928.00|MXN|G03|MCO240101ABC|MediCore|601|RIPK900522Q60|Karla...|',
  },
];

// Mapeo de método de pago de Caja → forma de pago SAT
export const metodoPagoCajaASat: Record<
  string,
  { formaPago: string; formaPagoNombre: string }
> = {
  efectivo: { formaPago: '01', formaPagoNombre: 'Efectivo' },
  tarjeta: { formaPago: '04', formaPagoNombre: 'Tarjeta de crédito' },
  transferencia: { formaPago: '03', formaPagoNombre: 'Transferencia electrónica de fondos' },
  mixto: { formaPago: '99', formaPagoNombre: 'Por definir' },
};