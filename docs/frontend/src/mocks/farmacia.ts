import { recetas, catalogoMedicamentos, type Receta } from '@/mocks/recetas';

export interface InventarioFarmacia {
  id: string;
  medicamentoId: string;
  stock: number;
  stockMinimo: number;
  precioCosto: number;
  precioVenta: number;
  lote: string;
  fechaCaducidad: string;
  ubicacion: string;
  ultimoMovimiento: string;
}

export interface MedicamentoDispensado {
  medicamentoId: string;
  nombre: string;
  presentacion: string;
  concentracion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  lote: string;
}

export interface MedicamentoPendiente {
  medicamentoId: string;
  nombre: string;
  presentacion: string;
  concentracion: string;
  cantidadPendiente: number;
  cantidadSolicitada: number;
  dosis: string;
  frecuencia: string;
  via: string;
}

export interface DispensacionFarmacia {
  id: string;
  recetaId: string;
  consultaId: string;
  patientId: string;
  patientName: string;
  patientExpediente: string;
  doctorName: string;
  medicamentos: MedicamentoDispensado[];
  subtotal: number;
  descuento: number;
  total: number;
  metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
  detallePago?: {
    efectivo?: number;
    tarjeta?: number;
    transferencia?: number;
  };
  fecha: string;
  hora: string;
  usuario: string;
  estado: 'completada' | 'parcial' | 'cancelada';
  reciboFolio: string;
  notas?: string;
  pendientes?: MedicamentoPendiente[];
}

export const inventarioFarmacia: InventarioFarmacia[] = [
  { id: 'inv-01', medicamentoId: 'm1', stock: 250, stockMinimo: 30, precioCosto: 0.80, precioVenta: 2.50, lote: 'L-PCM-2407', fechaCaducidad: '2027-06-15', ubicacion: 'Estante A-1', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-02', medicamentoId: 'm2', stock: 180, stockMinimo: 25, precioCosto: 1.20, precioVenta: 4.00, lote: 'L-IBU-2408', fechaCaducidad: '2027-08-20', ubicacion: 'Estante A-2', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-03', medicamentoId: 'm3', stock: 5, stockMinimo: 15, precioCosto: 1.50, precioVenta: 5.00, lote: 'L-NAP-2403', fechaCaducidad: '2026-09-10', ubicacion: 'Estante A-2', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-04', medicamentoId: 'm4', stock: 42, stockMinimo: 10, precioCosto: 0.90, precioVenta: 3.00, lote: 'L-DIC-2406', fechaCaducidad: '2027-03-15', ubicacion: 'Refrigerador B-1', ultimoMovimiento: '2026-08-06' },
  { id: 'inv-05', medicamentoId: 'm5', stock: 60, stockMinimo: 10, precioCosto: 12.50, precioVenta: 35.00, lote: 'L-AMC-2407', fechaCaducidad: '2027-04-20', ubicacion: 'Estante B-1', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-06', medicamentoId: 'm6', stock: 85, stockMinimo: 15, precioCosto: 1.80, precioVenta: 6.00, lote: 'L-AMX-2408', fechaCaducidad: '2027-06-30', ubicacion: 'Estante B-1', ultimoMovimiento: '2026-08-05' },
  { id: 'inv-07', medicamentoId: 'm7', stock: 8, stockMinimo: 5, precioCosto: 18.00, precioVenta: 45.00, lote: 'L-CEF-2405', fechaCaducidad: '2026-11-15', ubicacion: 'Refrigerador B-2', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-08', medicamentoId: 'm8', stock: 30, stockMinimo: 10, precioCosto: 3.50, precioVenta: 12.00, lote: 'L-AZI-2407', fechaCaducidad: '2027-05-18', ubicacion: 'Estante B-2', ultimoMovimiento: '2026-08-06' },
  { id: 'inv-09', medicamentoId: 'm9', stock: 3, stockMinimo: 10, precioCosto: 2.00, precioVenta: 8.00, lote: 'L-CIP-2404', fechaCaducidad: '2026-10-01', ubicacion: 'Estante B-3', ultimoMovimiento: '2026-08-04' },
  { id: 'inv-10', medicamentoId: 'm10', stock: 55, stockMinimo: 10, precioCosto: 0.60, precioVenta: 3.50, lote: 'L-MET-2408', fechaCaducidad: '2027-07-12', ubicacion: 'Estante B-3', ultimoMovimiento: '2026-08-05' },
  { id: 'inv-11', medicamentoId: 'm11', stock: 120, stockMinimo: 20, precioCosto: 0.90, precioVenta: 4.00, lote: 'L-OMP-2407', fechaCaducidad: '2027-09-15', ubicacion: 'Estante C-1', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-12', medicamentoId: 'm12', stock: 90, stockMinimo: 15, precioCosto: 0.70, precioVenta: 3.00, lote: 'L-RAN-2406', fechaCaducidad: '2027-02-28', ubicacion: 'Estante C-1', ultimoMovimiento: '2026-08-03' },
  { id: 'inv-13', medicamentoId: 'm13', stock: 150, stockMinimo: 20, precioCosto: 0.50, precioVenta: 3.00, lote: 'L-LOR-2408', fechaCaducidad: '2027-08-10', ubicacion: 'Estante C-2', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-14', medicamentoId: 'm14', stock: 110, stockMinimo: 15, precioCosto: 0.60, precioVenta: 3.50, lote: 'L-CET-2407', fechaCaducidad: '2027-07-22', ubicacion: 'Estante C-2', ultimoMovimiento: '2026-08-06' },
  { id: 'inv-15', medicamentoId: 'm15', stock: 25, stockMinimo: 5, precioCosto: 22.00, precioVenta: 55.00, lote: 'L-SAL-2408', fechaCaducidad: '2027-08-30', ubicacion: 'Estante D-1', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-16', medicamentoId: 'm16', stock: 45, stockMinimo: 8, precioCosto: 5.50, precioVenta: 18.00, lote: 'L-AMB-2407', fechaCaducidad: '2027-05-10', ubicacion: 'Estante D-1', ultimoMovimiento: '2026-08-05' },
  { id: 'inv-17', medicamentoId: 'm17', stock: 4, stockMinimo: 5, precioCosto: 3.50, precioVenta: 12.00, lote: 'L-DEX-2405', fechaCaducidad: '2026-11-01', ubicacion: 'Refrigerador B-2', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-18', medicamentoId: 'm18', stock: 70, stockMinimo: 10, precioCosto: 0.40, precioVenta: 2.50, lote: 'L-PRE-2408', fechaCaducidad: '2027-08-05', ubicacion: 'Estante D-2', ultimoMovimiento: '2026-08-06' },
  { id: 'inv-19', medicamentoId: 'm19', stock: 95, stockMinimo: 15, precioCosto: 0.70, precioVenta: 3.50, lote: 'L-MTF-2407', fechaCaducidad: '2027-06-20', ubicacion: 'Estante D-3', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-20', medicamentoId: 'm20', stock: 65, stockMinimo: 10, precioCosto: 0.35, precioVenta: 2.00, lote: 'L-GLI-2408', fechaCaducidad: '2027-07-15', ubicacion: 'Estante D-3', ultimoMovimiento: '2026-08-04' },
  { id: 'inv-21', medicamentoId: 'm21', stock: 12, stockMinimo: 3, precioCosto: 85.00, precioVenta: 180.00, lote: 'L-INS-2408', fechaCaducidad: '2027-01-15', ubicacion: 'Refrigerador C-1', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-22', medicamentoId: 'm22', stock: 80, stockMinimo: 15, precioCosto: 0.50, precioVenta: 3.00, lote: 'L-ENA-2407', fechaCaducidad: '2027-07-01', ubicacion: 'Estante E-1', ultimoMovimiento: '2026-08-05' },
  { id: 'inv-23', medicamentoId: 'm23', stock: 45, stockMinimo: 15, precioCosto: 0.80, precioVenta: 4.00, lote: 'L-LOS-2408', fechaCaducidad: '2027-08-12', ubicacion: 'Estante E-1', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-24', medicamentoId: 'm24', stock: 55, stockMinimo: 10, precioCosto: 0.60, precioVenta: 3.50, lote: 'L-AML-2407', fechaCaducidad: '2027-06-25', ubicacion: 'Estante E-2', ultimoMovimiento: '2026-08-03' },
  { id: 'inv-25', medicamentoId: 'm25', stock: 35, stockMinimo: 10, precioCosto: 2.50, precioVenta: 10.00, lote: 'L-ATO-2408', fechaCaducidad: '2027-08-18', ubicacion: 'Estante E-2', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-26', medicamentoId: 'm26', stock: 200, stockMinimo: 30, precioCosto: 0.30, precioVenta: 2.00, lote: 'L-AAS-2408', fechaCaducidad: '2027-09-01', ubicacion: 'Estante E-3', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-27', medicamentoId: 'm27', stock: 20, stockMinimo: 5, precioCosto: 8.00, precioVenta: 28.00, lote: 'L-CLO-2407', fechaCaducidad: '2027-04-15', ubicacion: 'Estante F-1', ultimoMovimiento: '2026-08-05' },
  { id: 'inv-28', medicamentoId: 'm28', stock: 15, stockMinimo: 5, precioCosto: 6.00, precioVenta: 22.00, lote: 'L-PRE-2408', fechaCaducidad: '2027-07-30', ubicacion: 'Estante F-1', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-29', medicamentoId: 'm29', stock: 38, stockMinimo: 8, precioCosto: 1.00, precioVenta: 5.00, lote: 'L-CIC-2407', fechaCaducidad: '2027-05-20', ubicacion: 'Estante F-2', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-30', medicamentoId: 'm30', stock: 4, stockMinimo: 5, precioCosto: 2.20, precioVenta: 10.00, lote: 'L-MTC-2405', fechaCaducidad: '2026-10-15', ubicacion: 'Refrigerador B-2', ultimoMovimiento: '2026-08-06' },
  { id: 'inv-31', medicamentoId: 'm31', stock: 50, stockMinimo: 8, precioCosto: 1.50, precioVenta: 6.00, lote: 'L-HIO-2408', fechaCaducidad: '2027-08-05', ubicacion: 'Estante F-3', ultimoMovimiento: '2026-08-04' },
  { id: 'inv-32', medicamentoId: 'm32', stock: 6, stockMinimo: 10, precioCosto: 3.00, precioVenta: 14.00, lote: 'L-LEV-2405', fechaCaducidad: '2026-12-20', ubicacion: 'Estante G-1', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-33', medicamentoId: 'm33', stock: 22, stockMinimo: 5, precioCosto: 1.80, precioVenta: 10.00, lote: 'L-FLX-2408', fechaCaducidad: '2027-07-01', ubicacion: 'Estante G-1', ultimoMovimiento: '2026-08-05' },
  { id: 'inv-34', medicamentoId: 'm34', stock: 28, stockMinimo: 5, precioCosto: 2.00, precioVenta: 11.00, lote: 'L-SER-2407', fechaCaducidad: '2027-06-15', ubicacion: 'Estante G-2', ultimoMovimiento: '2026-08-06' },
  { id: 'inv-35', medicamentoId: 'm35', stock: 2, stockMinimo: 5, precioCosto: 1.20, precioVenta: 7.00, lote: 'L-ALP-2404', fechaCaducidad: '2026-09-15', ubicacion: 'Estante G-2', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-36', medicamentoId: 'm36', stock: 18, stockMinimo: 5, precioCosto: 15.00, precioVenta: 35.00, lote: 'L-HAR-2407', fechaCaducidad: '2027-03-20', ubicacion: 'Almacén H-1', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-37', medicamentoId: 'm37', stock: 25, stockMinimo: 8, precioCosto: 8.00, precioVenta: 22.00, lote: 'L-SSN-2408', fechaCaducidad: '2027-08-25', ubicacion: 'Almacén H-1', ultimoMovimiento: '2026-08-06' },
  { id: 'inv-38', medicamentoId: 'm38', stock: 130, stockMinimo: 20, precioCosto: 1.00, precioVenta: 5.00, lote: 'L-CBX-2408', fechaCaducidad: '2027-09-10', ubicacion: 'Estante H-2', ultimoMovimiento: '2026-08-20' },
  { id: 'inv-39', medicamentoId: 'm39', stock: 90, stockMinimo: 15, precioCosto: 2.50, precioVenta: 10.00, lote: 'L-VD3-2407', fechaCaducidad: '2027-07-05', ubicacion: 'Estante H-3', ultimoMovimiento: '2026-08-05' },
  { id: 'inv-40', medicamentoId: 'm40', stock: 75, stockMinimo: 12, precioCosto: 0.90, precioVenta: 4.50, lote: 'L-HIE-2408', fechaCaducidad: '2027-08-01', ubicacion: 'Estante H-3', ultimoMovimiento: '2026-08-20' },
];

export const dispensacionesFarmacia: DispensacionFarmacia[] = [
  {
    id: 'disp-001',
    recetaId: 'rec-mf-001',
    consultaId: 'con-mf-001',
    patientId: 'p1',
    patientName: 'María Fernanda López Hernández',
    patientExpediente: 'EXP-2024-0001',
    doctorName: 'Dr. Alejandro García Mendoza',
    medicamentos: [
      { medicamentoId: 'm23', nombre: 'Losartán', presentacion: 'Tableta', concentracion: '50mg', cantidad: 30, precioUnitario: 4.00, subtotal: 120.00, lote: 'L-LOS-2408' },
    ],
    subtotal: 120.00,
    descuento: 0,
    total: 120.00,
    metodoPago: 'efectivo',
    detallePago: { efectivo: 120.00 },
    fecha: '2026-08-20',
    hora: '09:58',
    usuario: 'Mónica Fernanda Soto Rivera',
    estado: 'completada',
    reciboFolio: 'FAR-2026-0001',
    notas: 'Receta surtida por completo.',
  },
  {
    id: 'disp-002',
    recetaId: 'rec-p5-001',
    consultaId: 'con-p5-001',
    patientId: 'p5',
    patientName: 'Jorge Alberto Ramírez Duarte',
    patientExpediente: 'EXP-2024-0005',
    doctorName: 'Dr. Alejandro García Mendoza',
    medicamentos: [
      { medicamentoId: 'm19', nombre: 'Metformina', presentacion: 'Tableta', concentracion: '850mg', cantidad: 60, precioUnitario: 3.50, subtotal: 210.00, lote: 'L-MTF-2407' },
      { medicamentoId: 'm21', nombre: 'Insulina glargina', presentacion: 'Pluma', concentracion: '100UI/ml', cantidad: 1, precioUnitario: 180.00, subtotal: 180.00, lote: 'L-INS-2408' },
    ],
    subtotal: 390.00,
    descuento: 0,
    total: 390.00,
    metodoPago: 'tarjeta',
    detallePago: { tarjeta: 390.00 },
    fecha: '2026-08-20',
    hora: '10:55',
    usuario: 'Mónica Fernanda Soto Rivera',
    estado: 'completada',
    reciboFolio: 'FAR-2026-0002',
  },
  {
    id: 'disp-003',
    recetaId: 'rec-p6-001',
    consultaId: 'con-p6-001',
    patientId: 'p6',
    patientName: 'Lucía Valentina Rojas Meza',
    patientExpediente: 'EXP-2024-0006',
    doctorName: 'Dra. Patricia Mendoza Ríos',
    medicamentos: [
      { medicamentoId: 'm15', nombre: 'Salbutamol', presentacion: 'Inhalador', concentracion: '100mcg/dosis', cantidad: 1, precioUnitario: 55.00, subtotal: 55.00, lote: 'L-SAL-2408' },
    ],
    subtotal: 55.00,
    descuento: 0,
    total: 55.00,
    metodoPago: 'efectivo',
    detallePago: { efectivo: 55.00 },
    fecha: '2026-08-20',
    hora: '11:38',
    usuario: 'Mónica Fernanda Soto Rivera',
    estado: 'completada',
    reciboFolio: 'FAR-2026-0003',
  },
  {
    id: 'disp-004',
    recetaId: 'rec-p7-001',
    consultaId: 'con-p7-001',
    patientId: 'p7',
    patientName: 'Ramón Arturo Gutiérrez Salinas',
    patientExpediente: 'EXP-2024-0007',
    doctorName: 'Dr. Fernando Castillo Vega',
    medicamentos: [
      { medicamentoId: 'm8', nombre: 'Azitromicina', presentacion: 'Tableta', concentracion: '500mg', cantidad: 3, precioUnitario: 12.00, subtotal: 36.00, lote: 'L-AZI-2407' },
      { medicamentoId: 'm18', nombre: 'Prednisona', presentacion: 'Tableta', concentracion: '5mg', cantidad: 20, precioUnitario: 2.50, subtotal: 50.00, lote: 'L-PRE-2408' },
    ],
    subtotal: 86.00,
    descuento: 0,
    total: 86.00,
    metodoPago: 'transferencia',
    detallePago: { transferencia: 86.00 },
    fecha: '2026-08-20',
    hora: '12:05',
    usuario: 'Mónica Fernanda Soto Rivera',
    estado: 'completada',
    reciboFolio: 'FAR-2026-0004',
  },
  {
    id: 'disp-005',
    recetaId: 'rec-p8-001',
    consultaId: 'con-p8-001',
    patientId: 'p8',
    patientName: 'Valeria Fernanda Castillo Núñez',
    patientExpediente: 'EXP-2024-0008',
    doctorName: 'Dra. Gabriela Herrera López',
    medicamentos: [
      { medicamentoId: 'm40', nombre: 'Hierro (Sulfato ferroso)', presentacion: 'Tableta', concentracion: '200mg', cantidad: 30, precioUnitario: 4.50, subtotal: 135.00, lote: 'L-HIE-2408' },
    ],
    subtotal: 135.00,
    descuento: 10.00,
    total: 125.00,
    metodoPago: 'tarjeta',
    detallePago: { tarjeta: 125.00 },
    fecha: '2026-08-20',
    hora: '10:10',
    usuario: 'Mónica Fernanda Soto Rivera',
    estado: 'completada',
    reciboFolio: 'FAR-2026-0005',
  },
  {
    id: 'disp-006',
    recetaId: 'rec-p9-001',
    consultaId: 'con-p9-001',
    patientId: 'p9',
    patientName: 'Miguel Ángel Contreras Peña',
    patientExpediente: 'EXP-2024-0009',
    doctorName: 'Dr. Alejandro García Mendoza',
    medicamentos: [
      { medicamentoId: 'm26', nombre: 'AAS (Ácido Acetilsalicílico)', presentacion: 'Tableta', concentracion: '100mg', cantidad: 30, precioUnitario: 2.00, subtotal: 60.00, lote: 'L-AAS-2408' },
      { medicamentoId: 'm27', nombre: 'Clopidogrel', presentacion: 'Tableta', concentracion: '75mg', cantidad: 30, precioUnitario: 28.00, subtotal: 840.00, lote: 'L-CLO-2407' },
    ],
    subtotal: 900.00,
    descuento: 0,
    total: 900.00,
    metodoPago: 'tarjeta',
    detallePago: { tarjeta: 900.00 },
    fecha: '2026-08-20',
    hora: '12:22',
    usuario: 'Mónica Fernanda Soto Rivera',
    estado: 'completada',
    reciboFolio: 'FAR-2026-0006',
  },
  {
    id: 'disp-007',
    recetaId: 'rec-p10-001',
    consultaId: 'con-p10-001',
    patientId: 'p10',
    patientName: 'Sofía Renata Delgado Márquez',
    patientExpediente: 'EXP-2024-0010',
    doctorName: 'Dr. Eduardo Ponce León',
    medicamentos: [
      { medicamentoId: 'm13', nombre: 'Loratadina', presentacion: 'Tableta', concentracion: '10mg', cantidad: 14, precioUnitario: 3.00, subtotal: 42.00, lote: 'L-LOR-2408' },
    ],
    subtotal: 42.00,
    descuento: 0,
    total: 42.00,
    metodoPago: 'efectivo',
    detallePago: { efectivo: 42.00 },
    fecha: '2026-08-20',
    hora: '11:52',
    usuario: 'Mónica Fernanda Soto Rivera',
    estado: 'completada',
    reciboFolio: 'FAR-2026-0007',
  },
  {
    id: 'disp-008',
    recetaId: 'rec-p11-001',
    consultaId: 'con-p11-001',
    patientId: 'p11',
    patientName: 'Daniel Alejandro Cruz Santana',
    patientExpediente: 'EXP-2024-0011',
    doctorName: 'Dr. Alejandro García Mendoza',
    medicamentos: [
      { medicamentoId: 'm34', nombre: 'Sertralina', presentacion: 'Tableta', concentracion: '50mg', cantidad: 30, precioUnitario: 11.00, subtotal: 330.00, lote: 'L-SER-2407' },
    ],
    subtotal: 330.00,
    descuento: 0,
    total: 330.00,
    metodoPago: 'mixto',
    detallePago: { efectivo: 130.00, tarjeta: 200.00 },
    fecha: '2026-08-20',
    hora: '12:08',
    usuario: 'Mónica Fernanda Soto Rivera',
    estado: 'completada',
    reciboFolio: 'FAR-2026-0008',
  },
  {
    id: 'disp-009',
    recetaId: 'rec-p12-001',
    consultaId: 'con-p12-001',
    patientId: 'p12',
    patientName: 'Adriana Lucía Fuentes Robles',
    patientExpediente: 'EXP-2024-0012',
    doctorName: 'Dr. Fernando Castillo Vega',
    medicamentos: [
      { medicamentoId: 'm3', nombre: 'Naproxeno', presentacion: 'Tableta', concentracion: '500mg', cantidad: 14, precioUnitario: 5.00, subtotal: 70.00, lote: 'L-NAP-2403' },
    ],
    subtotal: 70.00,
    descuento: 0,
    total: 70.00,
    metodoPago: 'efectivo',
    detallePago: { efectivo: 70.00 },
    fecha: '2026-08-20',
    hora: '08:55',
    usuario: 'Mónica Fernanda Soto Rivera',
    estado: 'completada',
    reciboFolio: 'FAR-2026-0009',
  },
  {
    id: 'disp-010',
    recetaId: 'rec-p13-001',
    consultaId: 'con-p13-001',
    patientId: 'p13',
    patientName: 'Enrique Gabriel Paredes Ochoa',
    patientExpediente: 'EXP-2024-0013',
    doctorName: 'Dr. Alejandro García Mendoza',
    medicamentos: [
      { medicamentoId: 'm11', nombre: 'Omeprazol', presentacion: 'Cápsula', concentracion: '20mg', cantidad: 30, precioUnitario: 4.00, subtotal: 120.00, lote: 'L-OMP-2407' },
    ],
    subtotal: 120.00,
    descuento: 0,
    total: 120.00,
    metodoPago: 'tarjeta',
    detallePago: { tarjeta: 120.00 },
    fecha: '2026-08-20',
    hora: '12:18',
    usuario: 'Mónica Fernanda Soto Rivera',
    estado: 'completada',
    reciboFolio: 'FAR-2026-0010',
  },
  {
    id: 'disp-011',
    recetaId: 'rec-p14-001',
    consultaId: 'con-p14-001',
    patientId: 'p14',
    patientName: 'Beatriz Elena Villanueva Mora',
    patientExpediente: 'EXP-2024-0014',
    doctorName: 'Dr. Fernando Castillo Vega',
    medicamentos: [
      { medicamentoId: 'm40', nombre: 'Hierro (Sulfato ferroso)', presentacion: 'Tableta', concentracion: '200mg', cantidad: 30, precioUnitario: 4.50, subtotal: 135.00, lote: 'L-HIE-2408' },
    ],
    subtotal: 135.00,
    descuento: 0,
    total: 135.00,
    metodoPago: 'transferencia',
    detallePago: { transferencia: 135.00 },
    fecha: '2026-08-20',
    hora: '10:45',
    usuario: 'Mónica Fernanda Soto Rivera',
    estado: 'completada',
    reciboFolio: 'FAR-2026-0011',
  },
  {
    id: 'disp-012',
    recetaId: 'rec-p15-001',
    consultaId: 'con-p15-001',
    patientId: 'p15',
    patientName: 'Guillermo Israel Mendoza Rocha',
    patientExpediente: 'EXP-2024-0015',
    doctorName: 'Dr. Alejandro García Mendoza',
    medicamentos: [
      { medicamentoId: 'm32', nombre: 'Levotiroxina', presentacion: 'Tableta', concentracion: '100mcg', cantidad: 30, precioUnitario: 14.00, subtotal: 420.00, lote: 'L-LEV-2405' },
    ],
    subtotal: 420.00,
    descuento: 0,
    total: 420.00,
    metodoPago: 'efectivo',
    detallePago: { efectivo: 420.00 },
    fecha: '2026-08-20',
    hora: '12:25',
    usuario: 'Mónica Fernanda Soto Rivera',
    estado: 'completada',
    reciboFolio: 'FAR-2026-0012',
  },
  {
    id: 'disp-013',
    recetaId: 'rec-p16-001',
    consultaId: 'con-p16-001',
    patientId: 'p16',
    patientName: 'Regina Carolina Aguilar Soto',
    patientExpediente: 'EXP-2024-0016',
    doctorName: 'Dra. Patricia Mendoza Ríos',
    medicamentos: [
      { medicamentoId: 'm2', nombre: 'Ibuprofeno', presentacion: 'Tableta', concentracion: '400mg', cantidad: 12, precioUnitario: 4.00, subtotal: 48.00, lote: 'L-IBU-2408' },
    ],
    subtotal: 48.00,
    descuento: 0,
    total: 48.00,
    metodoPago: 'efectivo',
    detallePago: { efectivo: 48.00 },
    fecha: '2026-08-20',
    hora: '12:38',
    usuario: 'Mónica Fernanda Soto Rivera',
    estado: 'parcial',
    reciboFolio: 'FAR-2026-0013',
    notas: 'Metoclopramida pendiente de surtir por falta de stock.',
  },
  {
    id: 'disp-014',
    recetaId: 'rec-p17-001',
    consultaId: 'con-p17-001',
    patientId: 'p17',
    patientName: 'Martín Eduardo Salazar Luna',
    patientExpediente: 'EXP-2024-0017',
    doctorName: 'Dr. Fernando Castillo Vega',
    medicamentos: [
      { medicamentoId: 'm3', nombre: 'Naproxeno', presentacion: 'Tableta', concentracion: '500mg', cantidad: 10, precioUnitario: 5.00, subtotal: 50.00, lote: 'L-NAP-2403' },
    ],
    subtotal: 50.00,
    descuento: 0,
    total: 50.00,
    metodoPago: 'efectivo',
    detallePago: { efectivo: 50.00 },
    fecha: '2026-08-20',
    hora: '12:48',
    usuario: 'Mónica Fernanda Soto Rivera',
    estado: 'completada',
    reciboFolio: 'FAR-2026-0014',
  },
  {
    id: 'disp-015',
    recetaId: 'rec-p18-001',
    consultaId: 'con-p18-001',
    patientId: 'p18',
    patientName: 'Emilio Santiago Herrera Ruiz',
    patientExpediente: 'EXP-2024-0018',
    doctorName: 'Dra. Patricia Mendoza Ríos',
    medicamentos: [
      { medicamentoId: 'm6', nombre: 'Amoxicilina', presentacion: 'Cápsula', concentracion: '500mg', cantidad: 21, precioUnitario: 6.00, subtotal: 126.00, lote: 'L-AMX-2408' },
      { medicamentoId: 'm1', nombre: 'Paracetamol', presentacion: 'Tableta', concentracion: '500mg', cantidad: 12, precioUnitario: 2.50, subtotal: 30.00, lote: 'L-PCM-2407' },
    ],
    subtotal: 156.00,
    descuento: 0,
    total: 156.00,
    metodoPago: 'tarjeta',
    detallePago: { tarjeta: 156.00 },
    fecha: '2026-08-20',
    hora: '09:52',
    usuario: 'Mónica Fernanda Soto Rivera',
    estado: 'completada',
    reciboFolio: 'FAR-2026-0015',
  },
];

export const getInventarioByMedicamentoId = (medicamentoId: string): InventarioFarmacia | undefined =>
  inventarioFarmacia.find((inv) => inv.medicamentoId === medicamentoId);

export const getMedicamentoInfo = (medicamentoId: string) => {
  const med = catalogoMedicamentos.find((m) => m.id === medicamentoId);
  const inv = inventarioFarmacia.find((i) => i.medicamentoId === medicamentoId);
  return { medicamento: med, inventario: inv };
};

export const getRecetasActivas = (): Receta[] =>
  recetas.filter((r) => r.estado === 'activa').sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora));

export const getRecetasSurtidas = (): Receta[] =>
  recetas.filter((r) => r.estado === 'surtida');

export const getDispensacionesHoy = (): DispensacionFarmacia[] => {
  const today = '2026-08-20';
  return dispensacionesFarmacia.filter((d) => d.fecha === today);
};

export const getDispensacionesByReceta = (recetaId: string): DispensacionFarmacia[] =>
  dispensacionesFarmacia.filter((d) => d.recetaId === recetaId);

export const getDispensacionesByPatient = (patientId: string): DispensacionFarmacia[] =>
  dispensacionesFarmacia.filter((d) => d.patientId === patientId);

export const getStockBajo = (): InventarioFarmacia[] =>
  inventarioFarmacia.filter((inv) => inv.stock <= inv.stockMinimo);