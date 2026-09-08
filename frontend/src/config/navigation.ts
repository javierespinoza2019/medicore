/** Menú principal de la app — configuración estática de rutas (no datos clínicos). */

export interface NavItem {
  key: string;
  label: string;
  icon: string;
  path: string;
  subtitle?: string;
  children?: NavItem[];
  badge?: number;
}

export const navigationItems: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'ri-dashboard-line',
    path: '/app/dashboard',
    subtitle: 'Resumen general y métricas del día',
  },
  {
    key: 'reportes',
    label: 'Reportes',
    icon: 'ri-bar-chart-2-line',
    path: '/app/reportes',
    subtitle: 'Indicadores operativos, clínicos y financieros',
  },
  {
    key: 'operacion',
    label: 'Operación',
    icon: 'ri-calendar-check-line',
    path: '',
    children: [
      { key: 'agenda', label: 'Agenda', icon: 'ri-calendar-2-line', path: '/app/agenda', subtitle: 'Citas programadas y agenda de médicos' },
      { key: 'sala-espera', label: 'Sala de Espera', icon: 'ri-time-line', path: '/app/sala-espera', subtitle: 'Pacientes en espera de atención' },
      { key: 'monitor-turnos', label: 'Monitor de Turnos', icon: 'ri-tv-line', path: '/app/monitor-turnos', subtitle: 'Pantalla de turnos en tiempo real' },
      { key: 'triage', label: 'Triage', icon: 'ri-heart-pulse-line', path: '/app/triage', subtitle: 'Signos vitales y valoración inicial' },
      { key: 'urgencias', label: 'Urgencias', icon: 'ri-alert-line', path: '/app/urgencias', subtitle: 'Ingresos, atención y altas de urgencias' },
    ],
  },
  {
    key: 'pacientes',
    label: 'Pacientes',
    icon: 'ri-user-heart-line',
    path: '',
    children: [
      { key: 'pacientes-lista', label: 'Todos los Pacientes', icon: 'ri-group-line', path: '/app/pacientes', subtitle: 'Padrón y gestión de pacientes' },
      { key: 'paciente-nuevo', label: 'Nuevo Paciente', icon: 'ri-user-add-line', path: '/app/pacientes/nuevo', subtitle: 'Registro de un nuevo paciente' },
    ],
  },
  {
    key: 'clinico',
    label: 'Clínico',
    icon: 'ri-stethoscope-line',
    path: '',
    children: [
      { key: 'consultas', label: 'Consultas', icon: 'ri-file-list-3-line', path: '/app/consultas', subtitle: 'Notas SOAP y seguimiento clínico' },
      { key: 'recetas', label: 'Recetas', icon: 'ri-capsule-line', path: '/app/recetas', subtitle: 'Generación y consulta de recetas' },
      { key: 'estudios', label: 'Estudios', icon: 'ri-microscope-line', path: '/app/estudios', subtitle: 'Solicitud y resultados de estudios' },
      { key: 'farmacia', label: 'Farmacia', icon: 'ri-medicine-bottle-line', path: '/app/farmacia', subtitle: 'Dispensación y control de inventario' },
    ],
  },
  {
    key: 'finanzas',
    label: 'Finanzas',
    icon: 'ri-money-dollar-circle-line',
    path: '',
    children: [
      { key: 'caja', label: 'Caja y Cobros', icon: 'ri-cash-line', path: '/app/caja', subtitle: 'Cobros y transacciones del día' },
      { key: 'cortes', label: 'Cortes de Caja', icon: 'ri-file-chart-line', path: '/app/caja/cortes', subtitle: 'Historial de cierres y conciliación' },
      { key: 'facturacion', label: 'Facturación CFDI', icon: 'ri-file-shield-2-line', path: '/app/facturacion', subtitle: 'Comprobantes fiscales CFDI 4.0' },
    ],
  },
  {
    key: 'integraciones',
    label: 'Integraciones',
    icon: 'ri-share-circle-line',
    path: '',
    children: [
      { key: 'hl7-fhir', label: 'HL7 FHIR', icon: 'ri-share-circle-line', path: '/app/hl7-fhir', subtitle: 'Interoperabilidad clinica FHIR R4 - Mensajes y configuracion de servicios' },
    ],
  },
  {
    key: 'normatividad',
    label: 'Normatividad',
    icon: 'ri-government-line',
    path: '',
    children: [
      { key: 'aviso-privacidad', label: 'Aviso de Privacidad', icon: 'ri-file-shield-line', path: '/app/normatividad/aviso-privacidad', subtitle: 'LFPDPPP - Aviso de privacidad integral y simplificado' },
      { key: 'consentimientos', label: 'Consentimientos Informados', icon: 'ri-file-text-line', path: '/app/normatividad/consentimientos', subtitle: 'NOM-004 - Consentimiento bajo información' },
      { key: 'derechos-arco', label: 'Derechos ARCO', icon: 'ri-shield-keyhole-line', path: '/app/normatividad/derechos-arco', subtitle: 'LFPDPPP - Acceso, Rectificación, Cancelación, Oposición' },
      { key: 'referencias', label: 'Referencias / Contrarref.', icon: 'ri-arrow-left-right-line', path: '/app/normatividad/referencias', subtitle: 'NOM-004 - Notas de referencia y contrarreferencia' },
      { key: 'egresos', label: 'Hojas de Egreso', icon: 'ri-logout-box-line', path: '/app/normatividad/egresos', subtitle: 'NOM-004 - Nota de egreso hospitalario' },
      { key: 'retencion', label: 'Retención Documental', icon: 'ri-archive-line', path: '/app/normatividad/retencion', subtitle: 'NOM-004 - Políticas de conservación de expedientes' },
      { key: 'vigilancia', label: 'Vigilancia Epidemiológica', icon: 'ri-virus-line', path: '/app/normatividad/vigilancia', subtitle: 'NOM-017 - Notificación de enfermedades obligatorias / SUIVE' },
      { key: 'profesionales', label: 'Gestión de Profesionales', icon: 'ri-user-star-line', path: '/app/normatividad/profesionales', subtitle: 'Vigencia de cédulas, certificaciones y licencias sanitarias' },
      { key: 'notas-enfermeria', label: 'Notas de Enfermería', icon: 'ri-nurse-line', path: '/app/normatividad/notas-enfermeria', subtitle: 'NOM-004 Art. 6.3.4 - Cuidados de enfermería por turno' },
      { key: 'documento-seguridad', label: 'Documento de Seguridad', icon: 'ri-shield-star-line', path: '/app/normatividad/documento-seguridad', subtitle: 'LFPDPPP - Medidas de seguridad administrativas, técnicas y físicas' },
      { key: 'checklist-nom', label: 'Checklist NOM-005/016', icon: 'ri-list-check-3', path: '/app/normatividad/checklist-nom', subtitle: 'Infraestructura, equipamiento y documentación por establecimiento' },
    ],
  },
  {
    key: 'administracion',
    label: 'Administración',
    icon: 'ri-settings-3-line',
    path: '',
    children: [
      { key: 'usuarios', label: 'Usuarios', icon: 'ri-shield-user-line', path: '/app/administracion/usuarios', subtitle: 'Usuarios y permisos del sistema' },
      { key: 'medicos', label: 'Médicos', icon: 'ri-user-star-line', path: '/app/administracion/medicos', subtitle: 'Directorio de médicos' },
      { key: 'especialidades', label: 'Especialidades', icon: 'ri-hospital-line', path: '/app/administracion/especialidades', subtitle: 'Catálogo de especialidades' },
      { key: 'sucursales', label: 'Sucursales', icon: 'ri-building-line', path: '/app/administracion/sucursales', subtitle: 'Sucursales y consultorios' },
      { key: 'servicios', label: 'Servicios', icon: 'ri-price-tag-3-line', path: '/app/administracion/servicios', subtitle: 'Catálogo de servicios y tarifas' },
      { key: 'catalogos', label: 'Catálogos', icon: 'ri-book-open-line', path: '/app/administracion/catalogos', subtitle: 'Medicamentos, CIE-10 y estudios' },
      { key: 'dispositivos', label: 'Dispositivos', icon: 'ri-smartphone-line', path: '/app/administracion/dispositivos', subtitle: 'Estaciones PWA y cola offline' },
    ],
  },
  {
    key: 'seguridad',
    label: 'Seguridad',
    icon: 'ri-shield-check-line',
    path: '',
    children: [
      { key: 'roles', label: 'Roles y Permisos', icon: 'ri-key-2-line', path: '/app/seguridad/roles', subtitle: 'Configuración de permisos por rol' },
      { key: 'auditoria', label: 'Auditoría', icon: 'ri-file-search-line', path: '/app/seguridad/auditoria', subtitle: 'Registro de actividad del sistema' },
    ],
  },
];
