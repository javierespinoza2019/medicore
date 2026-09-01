export type FhirVersion = 'R4' | 'R4B' | 'R5';

export type FhirResourceType =
  | 'Patient'
  | 'Observation'
  | 'DiagnosticReport'
  | 'MedicationRequest'
  | 'Encounter'
  | 'Condition'
  | 'AllergyIntolerance'
  | 'Immunization'
  | 'Procedure'
  | 'Practitioner'
  | 'Organization'
  | 'Bundle';

export type FhirMessageDirection = 'outbound' | 'inbound';
export type FhirMessageStatus = 'pending' | 'sent' | 'received' | 'error' | 'acked';

export interface FhirServerConfig {
  id: string;
  nombre: string;
  url: string;
  version: FhirVersion;
  authType: 'none' | 'basic' | 'bearer' | 'apikey';
  credentials?: {
    username?: string;
    password?: string;
    bearerToken?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  headers: Record<string, string>;
  enabled: boolean;
  isDefault: boolean;
  descripcion: string;
  contactEmail: string;
  organizationId: string;
}

export interface FhirMessage {
  id: string;
  serverId: string;
  serverName: string;
  direction: FhirMessageDirection;
  status: FhirMessageStatus;
  resourceType: FhirResourceType;
  resourceId: string;
  patientId?: string;
  patientName?: string;
  fecha: string;
  hora: string;
  rawPayload: string;
  responsePayload?: string;
  httpStatus?: number;
  errorMessage?: string;
  operation: 'create' | 'update' | 'read' | 'search' | 'delete' | 'transaction';
  endpointPath: string;
  correlationId: string;
  userName: string;
}

export interface FhirTransmissionLog {
  id: string;
  fecha: string;
  hora: string;
  serverId: string;
  serverName: string;
  nivel: 'info' | 'warning' | 'error' | 'debug';
  mensaje: string;
  detalle?: string;
  correlationId?: string;
}

export interface FhirResourceProfile {
  id: string;
  resourceType: FhirResourceType;
  nombre: string;
  descripcion: string;
  mapeoCampos: { campoFhir: string; campoLocal: string; requerido: boolean }[];
  activo: boolean;
}

export const fhirVersions: { value: FhirVersion; label: string }[] = [
  { value: 'R4', label: 'FHIR R4 (4.0.1)' },
  { value: 'R4B', label: 'FHIR R4B (4.3.0)' },
  { value: 'R5', label: 'FHIR R5 (5.0.0)' },
];

export const fhirResourceTypes: { value: FhirResourceType; label: string; icon: string; descripcion: string }[] = [
  { value: 'Patient', label: 'Patient (Paciente)', icon: 'ri-user-heart-line', descripcion: 'Datos demograficos e identificadores del paciente' },
  { value: 'Observation', label: 'Observation (Observacion)', icon: 'ri-test-tube-line', descripcion: 'Signos vitales, resultados de laboratorio, medidas clinicas' },
  { value: 'DiagnosticReport', label: 'DiagnosticReport (Reporte Diagnostico)', icon: 'ri-microscope-line', descripcion: 'Reportes de laboratorio, imagen, patologia' },
  { value: 'MedicationRequest', label: 'MedicationRequest (Prescripcion)', icon: 'ri-capsule-line', descripcion: 'Recetas y ordenes de medicamentos' },
  { value: 'Encounter', label: 'Encounter (Encuentro)', icon: 'ri-stethoscope-line', descripcion: 'Consultas, hospitalizaciones, urgencias' },
  { value: 'Condition', label: 'Condition (Condicion)', icon: 'ri-heart-pulse-line', descripcion: 'Diagnosticos, problemas, enfermedades cronicas' },
  { value: 'AllergyIntolerance', label: 'AllergyIntolerance (Alergia)', icon: 'ri-alert-line', descripcion: 'Alergias e intolerancias documentadas' },
  { value: 'Immunization', label: 'Immunization (Vacunacion)', icon: 'ri-shield-check-line', descripcion: 'Registro de vacunas aplicadas' },
  { value: 'Procedure', label: 'Procedure (Procedimiento)', icon: 'ri-scissors-line', descripcion: 'Cirugias, procedimientos terapeuticos' },
  { value: 'Practitioner', label: 'Practitioner (Profesional)', icon: 'ri-user-star-line', descripcion: 'Datos del medico y profesionales de salud' },
  { value: 'Organization', label: 'Organization (Organizacion)', icon: 'ri-building-line', descripcion: 'Datos de la institucion de salud' },
  { value: 'Bundle', label: 'Bundle (Paquete)', icon: 'ri-stack-line', descripcion: 'Coleccion de recursos para intercambio' },
];

export const fhirOperationTypes = [
  { value: 'create' as const, label: 'CREATE (POST)', desc: 'Crear nuevo recurso' },
  { value: 'update' as const, label: 'UPDATE (PUT)', desc: 'Actualizar recurso existente' },
  { value: 'read' as const, label: 'READ (GET)', desc: 'Leer recurso por ID' },
  { value: 'search' as const, label: 'SEARCH (GET)', desc: 'Buscar recursos con parametros' },
  { value: 'delete' as const, label: 'DELETE', desc: 'Eliminar recurso' },
  { value: 'transaction' as const, label: 'TRANSACTION (Bundle)', desc: 'Operacion atomica con multiples recursos' },
];

export const fhirServers: FhirServerConfig[] = [
  {
    id: 'srv-hapi',
    nombre: 'HAPI FHIR Test Server',
    url: 'https://hapi.fhir.org/baseR4',
    version: 'R4',
    authType: 'none',
    credentials: {},
    headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' },
    enabled: true,
    isDefault: true,
    descripcion: 'Servidor publico de pruebas HAPI FHIR para validacion de mensajes',
    contactEmail: 'support@hapi.fhir.org',
    organizationId: 'org-medicore',
  },
  {
    id: 'srv-epic',
    nombre: 'Epic FHIR Sandbox',
    url: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
    version: 'R4',
    authType: 'bearer',
    credentials: { bearerToken: 'eyJhbGciOiJSUzI1NiIs...demo_token' },
    headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' },
    enabled: false,
    isDefault: false,
    descripcion: 'Sandbox de Epic para integracion con sistemas EHR externos',
    contactEmail: 'fhir@epic.com',
    organizationId: 'org-medicore',
  },
  {
    id: 'srv-local',
    nombre: 'Servidor FHIR Local',
    url: 'http://localhost:8080/fhir',
    version: 'R4',
    authType: 'basic',
    credentials: { username: 'admin', password: '********' },
    headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' },
    enabled: false,
    isDefault: false,
    descripcion: 'Instancia local de HAPI FHIR JPA Server para desarrollo',
    contactEmail: 'admin@medicore.mx',
    organizationId: 'org-medicore',
  },
];

// Sample FHIR messages with pre-serialized JSON strings to avoid parser issues
const patientPayload1 = '{\n  "resourceType": "Patient",\n  "id": "medicore-p1",\n  "meta": { "versionId": "1", "lastUpdated": "2026-08-20T09:30:15Z" },\n  "identifier": [{ "system": "http://medicore.mx/expediente", "value": "EXP-2024-0001" }],\n  "name": [{ "family": "Lopez Hernandez", "given": ["Maria Fernanda"] }],\n  "gender": "female",\n  "birthDate": "1988-03-15",\n  "address": [{ "city": "CDMX", "country": "MX" }]\n}';

const observationPayload1 = '{\n  "resourceType": "Observation",\n  "id": "medicore-obs-001",\n  "status": "final",\n  "category": [{ "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "vital-signs" }] }],\n  "code": { "coding": [{ "system": "http://loinc.org", "code": "8867-4", "display": "Heart rate" }] },\n  "subject": { "reference": "Patient/medicore-p1" },\n  "effectiveDateTime": "2026-08-20T09:35:00Z",\n  "valueQuantity": { "value": 88, "unit": "beats/minute", "system": "http://unitsofmeasure.org", "code": "/min" }\n}';

const encounterPayload1 = '{\n  "resourceType": "Encounter",\n  "id": "medicore-enc-001",\n  "status": "finished",\n  "class": { "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode", "code": "AMB", "display": "ambulatory" },\n  "type": [{ "coding": [{ "system": "http://medicore.mx/tipos-consulta", "code": "control", "display": "Control" }] }],\n  "subject": { "reference": "Patient/medicore-p1" },\n  "participant": [{ "individual": { "reference": "Practitioner/medicore-d1", "display": "Dr. Alejandro Garcia Mendoza" } }],\n  "period": { "start": "2026-08-20T09:35:00Z", "end": "2026-08-20T09:48:00Z" },\n  "reasonCode": [{ "coding": [{ "system": "http://snomed.info/sct", "code": "38341003", "display": "Hypertensive disorder" }] }]\n}';

const medicationPayload1 = '{\n  "resourceType": "MedicationRequest",\n  "id": "medicore-med-001",\n  "status": "active",\n  "intent": "order",\n  "medicationCodeableConcept": { "coding": [{ "system": "http://www.whocc.no/atc", "code": "C09CA01", "display": "Losartan" }] },\n  "subject": { "reference": "Patient/medicore-p1" },\n  "authoredOn": "2026-08-20T09:50:00Z",\n  "requester": { "reference": "Practitioner/medicore-d1", "display": "Dr. Alejandro Garcia Mendoza" },\n  "dosageInstruction": [{ "text": "1 tableta por via oral cada 24 horas por 30 dias", "route": { "coding": [{ "system": "http://snomed.info/sct", "code": "26643006", "display": "Oral route" }] } }]\n}';

const diagnosticPayload1 = '{\n  "resourceType": "DiagnosticReport",\n  "id": "medicore-dr-001",\n  "status": "final",\n  "category": [{ "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/v2-0074", "code": "LAB", "display": "Laboratory" }] }],\n  "code": { "coding": [{ "system": "http://loinc.org", "code": "33717-0", "display": "Hemoglobin A1c" }] },\n  "subject": { "reference": "Patient/medicore-p5" },\n  "effectiveDateTime": "2026-08-20T10:55:00Z",\n  "conclusion": "HbA1c: 8.2% (descontrolado)"\n}';

const diagnosticResponseError = '{\n  "resourceType": "OperationOutcome",\n  "issue": [{ "severity": "error", "code": "not-found", "diagnostics": "Referenced Patient/medicore-p5 does not exist on server" }]\n}';

const bundlePayload1 = '{\n  "resourceType": "Bundle",\n  "id": "incoming-001",\n  "type": "transaction",\n  "entry": [\n    { "fullUrl": "urn:uuid:pat-incoming-1", "resource": { "resourceType": "Patient", "name": [{ "family": "Vega Dominguez", "given": ["Oscar Julian"] }] } },\n    { "fullUrl": "urn:uuid:obs-incoming-1", "resource": { "resourceType": "Observation", "status": "final", "code": { "coding": [{ "system": "http://loinc.org", "code": "2339-0" }] } } }\n  ]\n}';

const okResponse = '{\n  "resourceType": "OperationOutcome",\n  "issue": [{ "severity": "information", "code": "informational", "diagnostics": "All OK" }]\n}';

export const fhirMessages: FhirMessage[] = [
  {
    id: 'msg-001',
    serverId: 'srv-hapi',
    serverName: 'HAPI FHIR Test Server',
    direction: 'outbound',
    status: 'sent',
    resourceType: 'Patient',
    resourceId: 'Patient/medicore-p1',
    patientId: 'p1',
    patientName: 'Maria Fernanda Lopez Hernandez',
    fecha: '2026-08-20',
    hora: '09:30:15',
    rawPayload: patientPayload1,
    responsePayload: okResponse,
    httpStatus: 201,
    operation: 'create',
    endpointPath: '/Patient',
    correlationId: 'corr-20260820-001',
    userName: 'Dr. Alejandro Garcia Mendoza',
  },
  {
    id: 'msg-002',
    serverId: 'srv-hapi',
    serverName: 'HAPI FHIR Test Server',
    direction: 'outbound',
    status: 'sent',
    resourceType: 'Observation',
    resourceId: 'Observation/medicore-obs-001',
    patientId: 'p1',
    patientName: 'Maria Fernanda Lopez Hernandez',
    fecha: '2026-08-20',
    hora: '09:35:42',
    rawPayload: observationPayload1,
    httpStatus: 201,
    operation: 'create',
    endpointPath: '/Observation',
    correlationId: 'corr-20260820-002',
    userName: 'Lic. Carmen Vargas Ortega',
  },
  {
    id: 'msg-003',
    serverId: 'srv-hapi',
    serverName: 'HAPI FHIR Test Server',
    direction: 'outbound',
    status: 'sent',
    resourceType: 'Encounter',
    resourceId: 'Encounter/medicore-enc-001',
    patientId: 'p1',
    patientName: 'Maria Fernanda Lopez Hernandez',
    fecha: '2026-08-20',
    hora: '09:48:00',
    rawPayload: encounterPayload1,
    httpStatus: 201,
    operation: 'create',
    endpointPath: '/Encounter',
    correlationId: 'corr-20260820-003',
    userName: 'Dr. Alejandro Garcia Mendoza',
  },
  {
    id: 'msg-004',
    serverId: 'srv-hapi',
    serverName: 'HAPI FHIR Test Server',
    direction: 'outbound',
    status: 'sent',
    resourceType: 'MedicationRequest',
    resourceId: 'MedicationRequest/medicore-med-001',
    patientId: 'p1',
    patientName: 'Maria Fernanda Lopez Hernandez',
    fecha: '2026-08-20',
    hora: '09:50:10',
    rawPayload: medicationPayload1,
    httpStatus: 201,
    operation: 'create',
    endpointPath: '/MedicationRequest',
    correlationId: 'corr-20260820-004',
    userName: 'Dr. Alejandro Garcia Mendoza',
  },
  {
    id: 'msg-005',
    serverId: 'srv-hapi',
    serverName: 'HAPI FHIR Test Server',
    direction: 'outbound',
    status: 'error',
    resourceType: 'DiagnosticReport',
    resourceId: 'DiagnosticReport/medicore-dr-001',
    patientId: 'p5',
    patientName: 'Jorge Alberto Ramirez Duarte',
    fecha: '2026-08-20',
    hora: '11:00:22',
    rawPayload: diagnosticPayload1,
    responsePayload: diagnosticResponseError,
    httpStatus: 422,
    errorMessage: 'Patient reference not found: medicore-p5',
    operation: 'create',
    endpointPath: '/DiagnosticReport',
    correlationId: 'corr-20260820-005',
    userName: 'Dr. Alejandro Garcia Mendoza',
  },
  {
    id: 'msg-006',
    serverId: 'srv-hapi',
    serverName: 'HAPI FHIR Test Server',
    direction: 'inbound',
    status: 'received',
    resourceType: 'Bundle',
    resourceId: 'Bundle/incoming-001',
    fecha: '2026-08-20',
    hora: '08:15:00',
    rawPayload: bundlePayload1,
    httpStatus: 200,
    operation: 'transaction',
    endpointPath: '/',
    correlationId: 'corr-20260820-incoming-001',
    userName: 'Sistema (recepcion automatica)',
  },
];

export const fhirLogs: FhirTransmissionLog[] = [
  { id: 'log-001', fecha: '2026-08-20', hora: '09:30:14', serverId: 'srv-hapi', serverName: 'HAPI FHIR Test Server', nivel: 'info', mensaje: 'Iniciando conexion con servidor FHIR', detalle: 'URL: https://hapi.fhir.org/baseR4', correlationId: 'corr-20260820-001' },
  { id: 'log-002', fecha: '2026-08-20', hora: '09:30:15', serverId: 'srv-hapi', serverName: 'HAPI FHIR Test Server', nivel: 'info', mensaje: 'POST /Patient exitoso', detalle: 'HTTP 201 Created. ID asignado: medicore-p1', correlationId: 'corr-20260820-001' },
  { id: 'log-003', fecha: '2026-08-20', hora: '09:35:41', serverId: 'srv-hapi', serverName: 'HAPI FHIR Test Server', nivel: 'info', mensaje: 'POST /Observation exitoso', detalle: 'HTTP 201 Created. ID asignado: medicore-obs-001', correlationId: 'corr-20260820-002' },
  { id: 'log-004', fecha: '2026-08-20', hora: '09:48:00', serverId: 'srv-hapi', serverName: 'HAPI FHIR Test Server', nivel: 'info', mensaje: 'POST /Encounter exitoso', detalle: 'HTTP 201 Created. ID asignado: medicore-enc-001', correlationId: 'corr-20260820-003' },
  { id: 'log-005', fecha: '2026-08-20', hora: '09:50:09', serverId: 'srv-hapi', serverName: 'HAPI FHIR Test Server', nivel: 'info', mensaje: 'POST /MedicationRequest exitoso', detalle: 'HTTP 201 Created. ID asignado: medicore-med-001', correlationId: 'corr-20260820-004' },
  { id: 'log-006', fecha: '2026-08-20', hora: '11:00:21', serverId: 'srv-hapi', serverName: 'HAPI FHIR Test Server', nivel: 'warning', mensaje: 'POST /DiagnosticReport retorno error 422', detalle: 'Unprocessable Entity: Referenced Patient does not exist on server. Se requiere crear Patient primero.', correlationId: 'corr-20260820-005' },
  { id: 'log-007', fecha: '2026-08-20', hora: '11:00:23', serverId: 'srv-hapi', serverName: 'HAPI FHIR Test Server', nivel: 'error', mensaje: 'Fallo en transmision de DiagnosticReport', detalle: 'Error: Patient reference not found: medicore-p5. Recomendacion: sincronizar paciente antes de enviar reportes.', correlationId: 'corr-20260820-005' },
  { id: 'log-008', fecha: '2026-08-20', hora: '08:14:59', serverId: 'srv-hapi', serverName: 'HAPI FHIR Test Server', nivel: 'info', mensaje: 'Bundle entrante recibido por webhook', detalle: 'Type: transaction. 2 recursos incluidos. Procesando...', correlationId: 'corr-20260820-incoming-001' },
  { id: 'log-009', fecha: '2026-08-20', hora: '08:15:01', serverId: 'srv-hapi', serverName: 'HAPI FHIR Test Server', nivel: 'info', mensaje: 'Bundle entrante procesado exitosamente', detalle: '2 recursos validados y almacenados en cola de integracion.', correlationId: 'corr-20260820-incoming-001' },
];

export const fhirResourceProfiles: FhirResourceProfile[] = [
  {
    id: 'prof-patient',
    resourceType: 'Patient',
    nombre: 'Perfil Paciente Mexico (MX-Patient)',
    descripcion: 'Perfil nacional para interoperabilidad de pacientes en Mexico basado en FHIR R4',
    mapeoCampos: [
      { campoFhir: 'identifier[0].value', campoLocal: 'expediente', requerido: true },
      { campoFhir: 'name[0].family', campoLocal: 'apellidos', requerido: true },
      { campoFhir: 'name[0].given[0]', campoLocal: 'nombre', requerido: true },
      { campoFhir: 'gender', campoLocal: 'genero', requerido: true },
      { campoFhir: 'birthDate', campoLocal: 'fechaNacimiento', requerido: true },
      { campoFhir: 'address[0].city', campoLocal: 'ciudad', requerido: false },
      { campoFhir: 'telecom[0].value', campoLocal: 'telefono', requerido: false },
    ],
    activo: true,
  },
  {
    id: 'prof-observation',
    resourceType: 'Observation',
    nombre: 'Perfil Signos Vitales (MX-VitalSigns)',
    descripcion: 'Mapeo de signos vitales desde triage a FHIR Observation con codificacion LOINC',
    mapeoCampos: [
      { campoFhir: 'code.coding[0].code', campoLocal: 'tipoSigno (mapeo LOINC)', requerido: true },
      { campoFhir: 'valueQuantity.value', campoLocal: 'valor', requerido: true },
      { campoFhir: 'valueQuantity.unit', campoLocal: 'unidad', requerido: true },
      { campoFhir: 'subject.reference', campoLocal: 'patientId', requerido: true },
      { campoFhir: 'effectiveDateTime', campoLocal: 'fecha + hora', requerido: true },
    ],
    activo: true,
  },
  {
    id: 'prof-medicationrequest',
    resourceType: 'MedicationRequest',
    nombre: 'Perfil Receta Electronica (MX-Receta)',
    descripcion: 'Formato de receta electronica interoperable con codificacion WHO-ATC',
    mapeoCampos: [
      { campoFhir: 'medicationCodeableConcept.coding[0].code', campoLocal: 'medicamentoId (ATC)', requerido: true },
      { campoFhir: 'subject.reference', campoLocal: 'patientId', requerido: true },
      { campoFhir: 'requester.reference', campoLocal: 'doctorId', requerido: true },
      { campoFhir: 'dosageInstruction[0].text', campoLocal: 'indicaciones', requerido: true },
      { campoFhir: 'authoredOn', campoLocal: 'fecha', requerido: true },
    ],
    activo: true,
  },
  {
    id: 'prof-diagnosticreport',
    resourceType: 'DiagnosticReport',
    nombre: 'Perfil Reporte Diagnostico (MX-LabReport)',
    descripcion: 'Reportes de laboratorio e imagen con codificacion LOINC',
    mapeoCampos: [
      { campoFhir: 'code.coding[0].code', campoLocal: 'estudioCatalogoId (LOINC)', requerido: true },
      { campoFhir: 'subject.reference', campoLocal: 'patientId', requerido: true },
      { campoFhir: 'result', campoLocal: 'resultado', requerido: false },
      { campoFhir: 'conclusion', campoLocal: 'notas', requerido: false },
    ],
    activo: true,
  },
  {
    id: 'prof-encounter',
    resourceType: 'Encounter',
    nombre: 'Perfil Consulta Ambulatoria (MX-Encounter)',
    descripcion: 'Encuentros clinicos con clasificacion SNOMED CT y actCode HL7',
    mapeoCampos: [
      { campoFhir: 'class.code', campoLocal: 'tipo (AMB|EMER|IMP)', requerido: true },
      { campoFhir: 'subject.reference', campoLocal: 'patientId', requerido: true },
      { campoFhir: 'participant[0].individual.reference', campoLocal: 'doctorId', requerido: true },
      { campoFhir: 'period.start', campoLocal: 'fecha + hora inicio', requerido: true },
      { campoFhir: 'reasonCode[0].coding[0].code', campoLocal: 'diagnosticoPrincipal (SNOMED)', requerido: false },
    ],
    activo: true,
  },
];

export function getFhirServerById(id: string): FhirServerConfig | undefined {
  return fhirServers.find((s) => s.id === id);
}

export function getDefaultServer(): FhirServerConfig | undefined {
  return fhirServers.find((s) => s.isDefault && s.enabled);
}

export function getMessagesByServer(serverId: string): FhirMessage[] {
  return fhirMessages
    .filter((m) => m.serverId === serverId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora));
}

export function getLogsByServer(serverId: string): FhirTransmissionLog[] {
  return fhirLogs
    .filter((l) => l.serverId === serverId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora));
}

export function getMessagesByPatient(patientId: string): FhirMessage[] {
  return fhirMessages
    .filter((m) => m.patientId === patientId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora));
}