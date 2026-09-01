# Plataforma Integral de Gestión Clínica — MediCore

## 1. Descripción del Proyecto

Plataforma SaaS empresarial moderna para la gestión integral de clínicas privadas. Cubre el ciclo completo del paciente: registro → agenda → recepción → triage → consulta → diagnóstico → receta → seguimiento → cobro → expediente clínico.

**Target inicial:** Clínica privada con medicina general, pediatría, nutrición, odontología y especialidades configurables.
**Visión de crecimiento:** Centro médico → Hospital (con hospitalización, farmacia, laboratorio, imagenología, quirófanos, UCI).

## 2. Estructura de Páginas

### Autenticación
- `/login` — Inicio de sesión
- `/recuperar-password` — Recuperación de contraseña

### App Principal (Layout con Sidebar + Header)
- `/app/dashboard` — Dashboard según rol
- `/app/agenda` — Agenda de citas (vista día/semana/mes)
- `/app/recepcion` — Recepción y flujo de llegada
- `/app/sala-espera` — Sala de espera en tiempo real
- `/app/triage` — Triage y signos vitales
- `/app/urgencias` — Atención de urgencias
- `/app/pacientes` — Lista de pacientes
- `/app/pacientes/nuevo` — Alta de paciente (wizard)
- `/app/pacientes/:id` — Expediente clínico
- `/app/consulta/:id` — Consulta médica
- `/app/recetas` — Gestión de recetas
- `/app/reportes` — Reportes operativos, clínicos y financieros
- `/portal-paciente` — Portal del paciente (autoconsulta por CURP + expediente)
- `/app/caja` — Cobros y caja
- `/app/facturacion` — Facturación CFDI 4.0 (comprobantes fiscales desde cobros)
- `/app/administracion` — Administración (usuarios, médicos, especialidades, sucursales)
- `/app/seguridad` — Roles, permisos y auditoría
- `/app/configuracion` — Configuración general

## 3. Funcionalidades Core

### MVP (Fase actual)
- [x] Design System (colores, tipografía, componentes base)
- [x] Shell: Login + Layout principal con sidebar y header
- [x] Navegación completa de todos los módulos
- [x] Guard de autenticación (redirección a login sin sesión activa)
- [x] Dashboard por rol (admin, médico, recepción)
- [x] Módulo de Pacientes (lista, alta con wizard, expediente)
- [x] Agenda (vistas día/semana/mes/lista, filtros, estados, agendado desde paciente, consultorios por columnas, reglas de bloqueo, reimpresión de ticket, asistencia y triage)
- [x] Recepción y flujo de llegada
- [x] Sala de espera en tiempo real (conexión con Agenda, timers en vivo, cola del día)
- [x] Triage y signos vitales (con IMC auto, escala EVA con guía, signos de alarma, acciones post-guardado, protección cambios no guardados)
- [x] Integración Triage ↔ Urgencias ↔ Sala de Espera (derivación automática con estado compartido)
- [x] Consulta médica (nota SOAP, búsqueda CIE-10, certificados, recetas, estudios, historia clínica y nota de evolución)
- [x] Diagnóstico con búsqueda CIE-10
- [x] Receta médica
- [x] Urgencias
- [x] Caja y cobros
- [x] Facturación CFDI 4.0 (generar comprobantes fiscales desde cobros, catálogos SAT, PDF/XML, cancelación)
- [x] Administración (CRUD completo: especialidades, médicos, servicios, sucursales/consultorios, usuarios)
- [x] Firma digital (e.firma/FIEL) en recetas y certificados (sello de tiempo + NOM-004)
- [x] Reportes operativos, clínicos y financieros
- [x] Portal del paciente (autoconsulta por CURP + expediente)
- [x] Seguridad (Roles RBAC con matriz de permisos, Auditoría con logs y filtros)

### Futuro (Crecimiento a Hospital)
- [ ] Hospitalización y camas
- [ ] Farmacia
- [ ] Laboratorio
- [ ] Imagenología (PACS/RIS)
- [ ] Quirófanos
- [ ] UCI
- [ ] Inventarios
- [ ] Seguros y facturación avanzada
- [ ] Portal del paciente
- [ ] App móvil
- [ ] HL7 / FHIR / DICOM

## 4. Modelo de Datos

Al ser un MVP sin backend conectado, se utilizarán datos mock realistas. Estructura prevista para futura conexión a Supabase:

### Tablas principales planeadas:
- **patients:** id, curp, nombre, apellidos, fecha_nacimiento, sexo, telefono, email, direccion, contacto_emergencia, aseguradora, poliza, created_at
- **doctors:** id, nombre, especialidad_id, cedula, telefono, email, status
- **specialties:** id, nombre, descripcion
- **appointments:** id, patient_id, doctor_id, consultorio_id, fecha, hora_inicio, hora_fin, estado, motivo
- **consultations:** id, patient_id, doctor_id, appointment_id, motivo, padecimiento, exploracion, notas, created_at
- **diagnoses:** id, consultation_id, codigo_cie10, descripcion, tipo (principal/secundario)
- **prescriptions:** id, consultation_id, medicamento, concentracion, dosis, frecuencia, via, duracion, indicaciones
- **vital_signs:** id, patient_id, peso, talla, imc, temperatura, presion_sistolica, presion_diastolica, fc, fr, saturacion, glucosa, dolor
- **payments:** id, patient_id, servicio, importe, descuento, total, metodo_pago, estado, fecha
- **users:** id, nombre, email, password_hash, rol_id, sucursal_id, status
- **audit_log:** id, user_id, accion, modulo, registro_id, ip, resultado, created_at

## 5. Integraciones Planeadas

- **Supabase:** Para autenticación, base de datos y edge functions (futuro)
- **Stripe:** Para procesamiento de pagos (futuro)
- **HL7/FHIR:** Para interoperabilidad con otros sistemas de salud (futuro)

## 6. Development Phase Plan

### Phase 1: MVP Core (Completed)
- Goal: Core clinical and operational modules with realistic test data
- Deliverable: Dashboard, Agenda, Sala de Espera, Triage, Urgencias, Pacientes, Consultas, Recetas, Estudios, Farmacia, Caja, Administración, Seguridad

### Phase 2: Data Consistency & Polish (Completed)
- Goal: Cross-module data alignment, enriched mock data, visual refinements
- Deliverable: All dates anchored to current day, patient-doctor-consultation-recipe linkages fixed, dashboard KPIs recalculated, caja totals reconciled

### Phase 3: NOM-004 + LFPDPPP Compliance (UI Layer) (Completed)
- Goal: Add regulatory compliance modules that can work without backend
- Deliverable:
  - Aviso de Privacidad (integral + simplificado)
  - Consentimientos Informados (NOM-004)
  - Derechos ARCO module (LFPDPPP)
  - Notas de Referencia / Contrarreferencia (NOM-004)
  - Hojas de Egreso (NOM-004 Art. 6.3.7)
  - Retención Documental policies (NOM-004 + NOM-024)
  - Integration of all normativity sections into patient unified record

### Phase 4: Advanced Compliance (Requires Backend)
- Goal: Backend-dependent regulatory features
- Deliverable: Real authentication, encrypted storage, e.firma/FIEL integration, audit trail enforcement, HL7/FHIR interoperability hooks

### Phase 5: NOM-017 + Professional Management
- Goal: Epidemiological surveillance and professional certification tracking
- Deliverable: Notificación SUIVE/SUAVE module, verification of medical licenses (RENAP), certification expiry alerts

<project_sprints>
            <!-- Sprint 1: Fundamentos del Sistema -->
            <sprint id="1" name="Fundamentos del Sistema" status="completado">
                <task>Definir arquitectura técnica y estructura de carpetas</task>
                <task>Configurar autenticación y roles (RBAC) con 8 perfiles</task>
                <task>Implementar sistema de permisos por ruta y por acción</task>
                <task>Crear AppLayout, navegación lateral y header global</task>
                <task>Implementar selector de sucursal activa</task>
                <task>Crear módulo de login con selector de rol</task>
                <task>Crear mocks realistas de pacientes, médicos, sucursales y usuarios</task>
                <task>Configurar gráficos, KPIs y sistema de colores institucionales</task>
                <task>Implementar módulo de Pacientes (CRUD completo, filtros, exportación)</task>
            </sprint>

            <!-- Sprint 2: Flujo Clínico Principal -->
            <sprint id="2" name="Flujo Clínico Principal" status="completado">
                <task>Implementar Agenda médica (Vista Día, Semana, Mes, Lista)</task>
                <task>Crear modal de nueva cita con validaciones</task>
                <task>Implementar Sala de Espera (flujo de estados, triage, consulta)</task>
                <task>Crear Monitor de Turnos (pantalla pública)</task>
                <task>Implementar módulo de Triage (signos vitales, niveles de urgencia, impresión)</task>
                <task>Crear Consulta médica con estructura SOAP completa</task>
                <task>Implementar Nota de Evolución (crear, leer, imprimir, validación NOM-004)</task>
                <task>Crear Historia Clínica (editar, leer, imprimir)</task>
                <task>Implementar búsqueda de diagnósticos CIE-10</task>
                <task>Crear módulo de Recetas (crear, imprimir, firma digital e.firma)</task>
                <task>Validar flujo end-to-end: paciente → agenda → triage → consulta → receta → caja</task>
            </sprint>

            <!-- Sprint 3: Módulos de Soporte y Administración -->
            <sprint id="3" name="Módulos de Soporte y Administración" status="completado">
                <task>Implementar módulo de Estudios (solicitar, resultados, estados)</task>
                <task>Crear módulo de Farmacia (inventario, dispensación, movimientos)</task>
                <task>Implementar módulo de Caja (cobros, transacciones, cierre, recibos)</task>
                <task>Crear Cortes de Caja (historial, diferencias, observaciones)</task>
                <task>Implementar módulo de Facturación CFDI 4.0 (catálogos SAT, timbrado simulado, PDF/XML, cancelación, integración desde Caja)</task>
                <task>Implementar Administración de Usuarios (CRUD, roles, sucursales)</task>
                <task>Crear Administración de Médicos (firma digital, especialidades, estado)</task>
                <task>Implementar Administración de Sucursales</task>
                <task>Crear módulo de Servicios y Especialidades</task>
                <task>Implementar catálogos de CIE-10, Medicamentos, Estudios</task>
            </sprint>

            <!-- Sprint 4: Normatividad, Seguridad y Reportes -->
            <sprint id="4" name="Normatividad, Seguridad y Reportes" status="completado">
                <task>Crear módulo de Consentimientos Informados (crear, firmar, imprimir, anular)</task>
                <task>Implementar Derechos ARCO (solicitudes, plazos, respuesta, impresión)</task>
                <task>Crear módulo de Egresos (notas de egreso, impresión)</task>
                <task>Implementar Notas de Enfermería (turnos, actividades, medicamentos, impresión)</task>
                <task>Crear Referencias y Contrarreferencias (origen, destino, impresión)</task>
                <task>Implementar Vigilancia Epidemiológica (SUIVE, notificación, impresión)</task>
                <task>Crear Aviso de Privacidad (integral y simplificado, impresión y PDF)</task>
                <task>Implementar Checklist NOM-005/NOM-016 (evaluación, progreso, exportación Excel)</task>
                <task>Crear Documento de Seguridad (LFPDPPP, medidas administrativas/técnicas/físicas)</task>
                <task>Implementar Gestión de Profesionales (vigencia de cédulas, alertas)</task>
                <task>Crear módulo de Retención Documental (plazos, normas, responsables)</task>
                <task>Implementar HL7/FHIR (mensajes, dashboard, crear mensaje, configuración de servidores, exportación JSON e impresión de comprobantes)</task>
                <task>Crear módulo de Seguridad: Auditoría (trazabilidad, bitácora, exportación)</task>
                <task>Implementar Roles y Permisos (matriz de acceso, visualización)</task>
                <task>Crear módulo de Reportes (Operativos, Clínicos, Financieros) con exportación Excel</task>
            </sprint>

            <!-- Sprint 5: Firma Digital y Portal del Paciente -->
            <sprint id="5" name="Firma Digital y Portal del Paciente" status="completado">
                <task>Implementar firma digital (e.firma/FIEL) en recetas y certificados</task>
                <task>Agregar sello de tiempo y referencia NOM-004 a documentos firmados</task>
                <task>Crear Portal del Paciente (autoconsulta con CURP + expediente)</task>
                <task>Implementar acceso público al portal desde login</task>
                <task>Validar que todos los documentos de normatividad impriman correctamente en PDF</task>
                <task>Verificar flujo end-to-end completo con guard de autenticación y redirección al login</task>
            </sprint>
        </project_sprints>