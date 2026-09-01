export interface CashSession {
  id: string;
  fecha: string;
  apertura: string;
  cierre: string | null;
  usuario: string;
  montoApertura: number;
  montoCierre: number | null;
  totalEfectivo: number;
  totalTarjeta: number;
  totalTransferencia: number;
  totalIngresos: number;
  cantidadTransacciones: number;
  estado: 'abierta' | 'cerrada';
}

export interface CashTransaction {
  id: string;
  sesionId: string;
  fecha: string;
  hora: string;
  pacienteId: string;
  paciente: string;
  concepto: string;
  servicioId: string;
  consultaId?: string;
  consultaDoctor?: string;
  subtotal: number;
  descuento: number;
  total: number;
  metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
  detallePago?: {
    efectivo?: number;
    tarjeta?: number;
    transferencia?: number;
  };
  estado: 'pagado' | 'cancelado' | 'reembolsado';
  usuario: string;
  recibo: string;
  notas?: string;
  origen?: string;
}

export interface CorteCaja {
  id: string;
  sesionId: string;
  fecha: string;
  horaApertura: string;
  horaCierre: string;
  usuario: string;
  montoApertura: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalTransferencia: number;
  totalIngresos: number;
  cantidadTransacciones: number;
  canceladas: number;
  reembolsos: number;
  montoCierre: number;
  diferencia: number;
  observaciones: string;
}

const todayDate = new Date().toISOString().split('T')[0];

export const currentSession: CashSession = {
  id: 'ses-001',
  fecha: todayDate,
  apertura: '08:00',
  cierre: null,
  usuario: 'Laura Torres Jiménez',
  montoApertura: 2000,
  montoCierre: null,
  totalEfectivo: 3650,
  totalTarjeta: 4450,
  totalTransferencia: 500,
  totalIngresos: 8600,
  cantidadTransacciones: 16,
  estado: 'abierta',
};

const today = todayDate;

export const todayTransactions: CashTransaction[] = [
  {
    id: 'trx-mf-001',
    sesionId: 'ses-001',
    fecha: today,
    hora: '09:55',
    pacienteId: 'p1',
    paciente: 'María Fernanda López Hernández',
    concepto: 'Consulta de Medicina General',
    servicioId: 'sv1',
    consultaId: 'con-mf-001',
    consultaDoctor: 'Dr. Alejandro García Mendoza',
    subtotal: 500,
    descuento: 0,
    total: 500,
    metodoPago: 'tarjeta',
    detallePago: { tarjeta: 500 },
    estado: 'pagado',
    usuario: 'Laura Torres Jiménez',
    recibo: 'REC-2026-0072',
    notas: 'Cobro de consulta de control HTA',
  },
  {
    id: 'trx-p5-001',
    sesionId: 'ses-001',
    fecha: today,
    hora: '10:52',
    pacienteId: 'p5',
    paciente: 'Jorge Alberto Ramírez Duarte',
    concepto: 'Consulta de Medicina General',
    servicioId: 'sv1',
    consultaId: 'con-p5-001',
    consultaDoctor: 'Dr. Alejandro García Mendoza',
    subtotal: 500,
    descuento: 0,
    total: 500,
    metodoPago: 'efectivo',
    detallePago: { efectivo: 500 },
    estado: 'pagado',
    usuario: 'Laura Torres Jiménez',
    recibo: 'REC-2026-0073',
    notas: 'Cobro de consulta de control de diabetes',
  },
  {
    id: 'trx-p6-001',
    sesionId: 'ses-001',
    fecha: today,
    hora: '11:25',
    pacienteId: 'p6',
    paciente: 'Lucía Valentina Rojas Meza',
    concepto: 'Consulta Pediátrica',
    servicioId: 'sv2',
    consultaId: 'con-p6-001',
    consultaDoctor: 'Dra. Patricia Mendoza Ríos',
    subtotal: 550,
    descuento: 0,
    total: 550,
    metodoPago: 'tarjeta',
    detallePago: { tarjeta: 550 },
    estado: 'pagado',
    usuario: 'Laura Torres Jiménez',
    recibo: 'REC-2026-0074',
  },
  {
    id: 'trx-p7-001',
    sesionId: 'ses-001',
    fecha: today,
    hora: '11:50',
    pacienteId: 'p7',
    paciente: 'Ramón Arturo Gutiérrez Salinas',
    concepto: 'Consulta de Medicina General',
    servicioId: 'sv1',
    consultaId: 'con-p7-001',
    consultaDoctor: 'Dr. Fernando Castillo Vega',
    subtotal: 500,
    descuento: 50,
    total: 450,
    metodoPago: 'efectivo',
    detallePago: { efectivo: 450 },
    estado: 'pagado',
    usuario: 'Laura Torres Jiménez',
    recibo: 'REC-2026-0075',
    notas: 'Descuento por paciente de la tercera edad',
  },
  {
    id: 'trx-p8-001',
    sesionId: 'ses-001',
    fecha: today,
    hora: '10:02',
    pacienteId: 'p8',
    paciente: 'Valeria Fernanda Castillo Núñez',
    concepto: 'Consulta Ginecológica',
    servicioId: 'sv6',
    consultaId: 'con-p8-001',
    consultaDoctor: 'Dra. Gabriela Herrera López',
    subtotal: 600,
    descuento: 0,
    total: 600,
    metodoPago: 'tarjeta',
    detallePago: { tarjeta: 600 },
    estado: 'pagado',
    usuario: 'Laura Torres Jiménez',
    recibo: 'REC-2026-0076',
  },
  {
    id: 'trx-p12-001',
    sesionId: 'ses-001',
    fecha: today,
    hora: '08:42',
    pacienteId: 'p12',
    paciente: 'Adriana Lucía Fuentes Robles',
    concepto: 'Consulta de Medicina General',
    servicioId: 'sv1',
    consultaId: 'con-p12-001',
    consultaDoctor: 'Dr. Fernando Castillo Vega',
    subtotal: 500,
    descuento: 0,
    total: 500,
    metodoPago: 'efectivo',
    detallePago: { efectivo: 500 },
    estado: 'pagado',
    usuario: 'Laura Torres Jiménez',
    recibo: 'REC-2026-0077',
  },
  {
    id: 'trx-p13-001',
    sesionId: 'ses-001',
    fecha: today,
    hora: '12:08',
    pacienteId: 'p13',
    paciente: 'Enrique Gabriel Paredes Ochoa',
    concepto: 'Consulta de Medicina General',
    servicioId: 'sv1',
    consultaId: 'con-p13-001',
    consultaDoctor: 'Dr. Alejandro García Mendoza',
    subtotal: 500,
    descuento: 0,
    total: 500,
    metodoPago: 'transferencia',
    detallePago: { transferencia: 500 },
    estado: 'pagado',
    usuario: 'Laura Torres Jiménez',
    recibo: 'REC-2026-0078',
  },
  {
    id: 'trx-p15-001',
    sesionId: 'ses-001',
    fecha: today,
    hora: '12:12',
    pacienteId: 'p15',
    paciente: 'Guillermo Israel Mendoza Rocha',
    concepto: 'Consulta de Medicina General',
    servicioId: 'sv1',
    consultaId: 'con-p15-001',
    consultaDoctor: 'Dr. Alejandro García Mendoza',
    subtotal: 500,
    descuento: 0,
    total: 500,
    metodoPago: 'tarjeta',
    detallePago: { tarjeta: 500 },
    estado: 'pagado',
    usuario: 'Laura Torres Jiménez',
    recibo: 'REC-2026-0079',
  },
  {
    id: 'trx-p16-001',
    sesionId: 'ses-001',
    fecha: today,
    hora: '12:28',
    pacienteId: 'p16',
    paciente: 'Regina Carolina Aguilar Soto',
    concepto: 'Consulta de Medicina General',
    servicioId: 'sv1',
    consultaId: 'con-p16-001',
    consultaDoctor: 'Dra. Patricia Mendoza Ríos',
    subtotal: 500,
    descuento: 0,
    total: 500,
    metodoPago: 'efectivo',
    detallePago: { efectivo: 500 },
    estado: 'pagado',
    usuario: 'Laura Torres Jiménez',
    recibo: 'REC-2026-0080',
  },
  {
    id: 'trx-p17-001',
    sesionId: 'ses-001',
    fecha: today,
    hora: '12:42',
    pacienteId: 'p17',
    paciente: 'Martín Eduardo Salazar Luna',
    concepto: 'Consulta de Medicina General',
    servicioId: 'sv1',
    consultaId: 'con-p17-001',
    consultaDoctor: 'Dr. Fernando Castillo Vega',
    subtotal: 500,
    descuento: 0,
    total: 500,
    metodoPago: 'mixto',
    detallePago: { efectivo: 200, tarjeta: 300 },
    estado: 'pagado',
    usuario: 'Laura Torres Jiménez',
    recibo: 'REC-2026-0081',
  },
  {
    id: 'trx-p18-001',
    sesionId: 'ses-001',
    fecha: today,
    hora: '09:42',
    pacienteId: 'p18',
    paciente: 'Emilio Santiago Herrera Ruiz',
    concepto: 'Consulta Pediátrica',
    servicioId: 'sv2',
    consultaId: 'con-p18-001',
    consultaDoctor: 'Dra. Patricia Mendoza Ríos',
    subtotal: 550,
    descuento: 0,
    total: 550,
    metodoPago: 'tarjeta',
    detallePago: { tarjeta: 550 },
    estado: 'pagado',
    usuario: 'Laura Torres Jiménez',
    recibo: 'REC-2026-0082',
  },
  {
    id: 'trx-p10-001',
    sesionId: 'ses-001',
    fecha: today,
    hora: '11:42',
    pacienteId: 'p10',
    paciente: 'Sofía Renata Delgado Márquez',
    concepto: 'Revisión Dermatológica',
    servicioId: 'sv5',
    consultaId: 'con-p10-001',
    consultaDoctor: 'Dr. Eduardo Ponce León',
    subtotal: 650,
    descuento: 0,
    total: 650,
    metodoPago: 'tarjeta',
    detallePago: { tarjeta: 650 },
    estado: 'pagado',
    usuario: 'Laura Torres Jiménez',
    recibo: 'REC-2026-0083',
  },
  {
    id: 'trx-p11-001',
    sesionId: 'ses-001',
    fecha: today,
    hora: '12:02',
    pacienteId: 'p11',
    paciente: 'Daniel Alejandro Cruz Santana',
    concepto: 'Consulta de Medicina General',
    servicioId: 'sv1',
    consultaId: 'con-p11-001',
    consultaDoctor: 'Dr. Alejandro García Mendoza',
    subtotal: 500,
    descuento: 0,
    total: 500,
    metodoPago: 'efectivo',
    detallePago: { efectivo: 500 },
    estado: 'pagado',
    usuario: 'Laura Torres Jiménez',
    recibo: 'REC-2026-0084',
  },
  {
    id: 'trx-p14-001',
    sesionId: 'ses-001',
    fecha: today,
    hora: '10:38',
    pacienteId: 'p14',
    paciente: 'Beatriz Elena Villanueva Mora',
    concepto: 'Consulta de Medicina General',
    servicioId: 'sv1',
    consultaId: 'con-p14-001',
    consultaDoctor: 'Dr. Fernando Castillo Vega',
    subtotal: 500,
    descuento: 0,
    total: 500,
    metodoPago: 'efectivo',
    detallePago: { efectivo: 500 },
    estado: 'pagado',
    usuario: 'Laura Torres Jiménez',
    recibo: 'REC-2026-0085',
  },
  {
    id: 'trx-p21-001',
    sesionId: 'ses-001',
    fecha: today,
    hora: '09:15',
    pacienteId: 'p21',
    paciente: 'Karla Fernanda Ríos Pacheco',
    concepto: 'Atención de urgencia (sutura)',
    servicioId: 'sv1',
    consultaDoctor: 'Dr. Fernando Castillo Vega',
    subtotal: 800,
    descuento: 0,
    total: 800,
    metodoPago: 'tarjeta',
    detallePago: { tarjeta: 800 },
    estado: 'pagado',
    usuario: 'Laura Torres Jiménez',
    recibo: 'REC-2026-0086',
    notas: 'Aseo quirúrgico, sutura y toxoide tetánico',
  },
  {
    id: 'trx-p20-001',
    sesionId: 'ses-001',
    fecha: today,
    hora: '10:22',
    pacienteId: 'p20',
    paciente: 'Óscar Julián Vega Domínguez',
    concepto: 'Consulta de Medicina General',
    servicioId: 'sv1',
    consultaDoctor: 'Dr. Fernando Castillo Vega',
    subtotal: 500,
    descuento: 0,
    total: 500,
    metodoPago: 'efectivo',
    detallePago: { efectivo: 500 },
    estado: 'pagado',
    usuario: 'Laura Torres Jiménez',
    recibo: 'REC-2026-0087',
  },
];

export const cortesHistorial: CorteCaja[] = [
  {
    id: 'corte-2026-08-19',
    sesionId: 'ses-2026-08-19',
    fecha: '2026-08-19',
    horaApertura: '08:00',
    horaCierre: '20:15',
    usuario: 'Laura Torres Jiménez',
    montoApertura: 2000,
    totalEfectivo: 4200,
    totalTarjeta: 6800,
    totalTransferencia: 1200,
    totalIngresos: 12200,
    cantidadTransacciones: 22,
    canceladas: 1,
    reembolsos: 0,
    montoCierre: 14400,
    diferencia: 200,
    observaciones: 'Diferencia menor por redondeo en pago mixto de paciente Martín Salazar. Sesión cerrada sin incidencias.',
  },
  {
    id: 'corte-2026-08-18',
    sesionId: 'ses-2026-08-18',
    fecha: '2026-08-18',
    horaApertura: '08:00',
    horaCierre: '19:45',
    usuario: 'Laura Torres Jiménez',
    montoApertura: 2000,
    totalEfectivo: 3100,
    totalTarjeta: 5200,
    totalTransferencia: 800,
    totalIngresos: 9100,
    cantidadTransacciones: 18,
    canceladas: 0,
    reembolsos: 1,
    montoCierre: 11150,
    diferencia: 50,
    observaciones: 'Reembolso por cancelación de estudios de laboratorio de paciente Regina Aguilar. Diferencia mínima por corte de monedas.',
  },
  {
    id: 'corte-2026-08-17',
    sesionId: 'ses-2026-08-17',
    fecha: '2026-08-17',
    horaApertura: '08:00',
    horaCierre: '20:30',
    usuario: 'Lic. Roberto Méndez Castillo',
    montoApertura: 2000,
    totalEfectivo: 5500,
    totalTarjeta: 7500,
    totalTransferencia: 1500,
    totalIngresos: 14500,
    cantidadTransacciones: 26,
    canceladas: 2,
    reembolsos: 0,
    montoCierre: 16500,
    diferencia: 0,
    observaciones: 'Día de alta afluencia por campaña de vacunación. Sin diferencias al cierre.',
  },
  {
    id: 'corte-2026-08-16',
    sesionId: 'ses-2026-08-16',
    fecha: '2026-08-16',
    horaApertura: '08:00',
    horaCierre: '19:00',
    usuario: 'Laura Torres Jiménez',
    montoApertura: 2000,
    totalEfectivo: 2800,
    totalTarjeta: 4600,
    totalTransferencia: 600,
    totalIngresos: 8000,
    cantidadTransacciones: 15,
    canceladas: 0,
    reembolsos: 0,
    montoCierre: 10000,
    diferencia: 0,
    observaciones: 'Día normal de operaciones. Sin incidencias.',
  },
  {
    id: 'corte-2026-08-15',
    sesionId: 'ses-2026-08-15',
    fecha: '2026-08-15',
    horaApertura: '08:00',
    horaCierre: '18:30',
    usuario: 'Lic. Roberto Méndez Castillo',
    montoApertura: 2000,
    totalEfectivo: 1900,
    totalTarjeta: 3200,
    totalTransferencia: 400,
    totalIngresos: 5500,
    cantidadTransacciones: 11,
    canceladas: 1,
    reembolsos: 0,
    montoCierre: 7500,
    diferencia: 0,
    observaciones: 'Viernes con baja afluencia. Una consulta cancelada por paciente no acudió.',
  },
  {
    id: 'corte-2026-08-14',
    sesionId: 'ses-2026-08-14',
    fecha: '2026-08-14',
    horaApertura: '08:00',
    horaCierre: '20:00',
    usuario: 'Laura Torres Jiménez',
    montoApertura: 2000,
    totalEfectivo: 4800,
    totalTarjeta: 6200,
    totalTransferencia: 1000,
    totalIngresos: 12000,
    cantidadTransacciones: 21,
    canceladas: 0,
    reembolsos: 0,
    montoCierre: 14000,
    diferencia: 0,
    observaciones: 'Jornada completa. Se reportó un pago mixto que requirió verificación manual de tarjeta.',
  },
  {
    id: 'corte-2026-08-13',
    sesionId: 'ses-2026-08-13',
    fecha: '2026-08-13',
    horaApertura: '08:00',
    horaCierre: '19:30',
    usuario: 'Lic. Roberto Méndez Castillo',
    montoApertura: 2000,
    totalEfectivo: 3500,
    totalTarjeta: 5100,
    totalTransferencia: 900,
    totalIngresos: 9500,
    cantidadTransacciones: 17,
    canceladas: 1,
    reembolsos: 1,
    montoCierre: 11450,
    diferencia: -50,
    observaciones: 'Reembolso parcial por copago de seguro no cubierto. Diferencia negativa por reembolso en efectivo mayor al cobro original.',
  },
];

export const paymentMethodConfig: Record<CashTransaction['metodoPago'], { label: string; icon: string; color: string }> = {
  efectivo: { label: 'Efectivo', icon: 'ri-cash-line', color: 'text-emerald-600' },
  tarjeta: { label: 'Tarjeta', icon: 'ri-bank-card-line', color: 'text-accent-600' },
  transferencia: { label: 'Transferencia', icon: 'ri-smartphone-line', color: 'text-primary-600' },
  mixto: { label: 'Mixto', icon: 'ri-exchange-funds-line', color: 'text-amber-600' },
};

export const transactionStatusConfig: Record<CashTransaction['estado'], { label: string; variant: 'success' | 'danger' | 'warning' }> = {
  pagado: { label: 'Pagado', variant: 'success' },
  cancelado: { label: 'Cancelado', variant: 'danger' },
  reembolsado: { label: 'Reembolsado', variant: 'warning' },
};

export interface ConsultaPendienteCobro {
  id: string;
  consultaId: string;
  pacienteId: string;
  paciente: string;
  expediente: string;
  doctor: string;
  especialidad: string;
  servicio: string;
  servicioId: string;
  precio: number;
  horaAtencion: string;
  consultorio: string;
  estado: 'pendiente_cobro' | 'cobro_parcial';
  cobrado?: number;
}

export const consultasPendientesCobro: ConsultaPendienteCobro[] = [
  {
    id: 'pend-cobro-001',
    consultaId: 'con-ce-001',
    pacienteId: 'p2',
    paciente: 'Carlos Eduardo Martínez Ruiz',
    expediente: 'EXP-2024-0002',
    doctor: 'Dra. Patricia Mendoza Ríos',
    especialidad: 'Medicina General',
    servicio: 'Consulta de Medicina General',
    servicioId: 'sv1',
    precio: 500,
    horaAtencion: '10:12',
    consultorio: 'Consultorio 102',
    estado: 'pendiente_cobro',
  },
];