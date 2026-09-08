# 06 — Decisiones abiertas

Instrucción atendida: *"No asumas nada, no inventes nada y pregunta si tienes dudas."*

Este documento contiene todo lo que **no** se dio por resuelto. Nada de esto fue asumido en los documentos 01–05. Cada punto indica qué se bloquea si no se responde.

---

## Decisiones ya ratificadas por el cliente

### Oleada 2026-09-08 (reinicio demo Clínicas del Valle)

| # | Tema | Resolución |
|---|---|---|
| — | **Reinicio excepcional de BD demo** | Autorizado **solo** vía `tools/reset-and-bootstrap-clinicas-del-valle.ps1 -IAuthorizeDestructiveReset` + confirmación interactiva `BORRAR`. Ejecuta `backend/database/ops/ops_wipe_business_data.sql` (`DELETE` de filas de negocio; **sin** `DROP`/`TRUNCATE` de objetos) y siembra tenant `clinicas_del_valle` (seed `010_provision_*`). **Prohibido** contra Production con PHI. No relaja la regla cotidiana de AGENTS.md; es excepción operativa de demo/shared. |

### Oleada 2026-09-02 (fotografía del paciente)

| # | Tema | Resolución |
|---|---|---|
| 44 | **Fotografía del paciente para identificación** | **Sí — se captura.** Dato biométrico/sensible; el cliente asume la base de licitud y el aviso de privacidad. Implementación: `PhotoRelativePath` en Subject + `files/{TenantCode}/Pacientes/{subjectId}/foto.{ext}`; API `PUT/DELETE/GET /api/subjects/{id}/photo`; UI en detalle de paciente. **No** se afirma por sí sola cumplimiento LFPDPPP art. 9; el dictamen de licitud queda del lado del establecimiento. Contrato: [`docs/operacion/sujeto.md`](../operacion/sujeto.md). |

### Oleada 2026-08-31 (break-glass y SaMD)

| # | Tema | Resolución |
|---|---|---|
| 23 | **Break-glass** | **Sí — habilitado con justificación obligatoria y alerta auditable.** Acceso de emergencia cuando el rol habitual no alcanza. Requiere motivo escrito (mín. 15), registro en bitácora (`security.break_glass.started`) y concesión temporal (60 min). API/UI entregadas 2026-08-31: `POST /api/auth/break-glass`, menú usuario «Acceso de emergencia». No sustituye el catálogo de roles ni permite nombres libres. |
| 8 | **Software como dispositivo médico (SaMD)** | **Fuera de alcance — producto documental/administrativo.** No se incorpora apoyo a la decisión clínica automatizada, cálculo de dosis, interpretación de resultados ni IA diagnóstica en Fases 1–4. Si legal exige reevaluación ante COFEPRIS antes del primer paciente real, reabrir con dictamen escrito. **No** afirmar clasificación SaMD sin fuente oficial. |

### Oleada 2026-08-30 (revocación global de sesiones)

| # | Tema | Resolución |
|---|---|---|
| 75 | **Revocación global de sesiones** | **Opción A — política ratificada; endpoints entregados 2026-08-31.** El logout ordinario sigue siendo **solo esta estación** (#73). `sp_Auth_RevokeAllRefreshTokensForUser` se invoca en: (1) **cambio de contraseña** (cuando exista el flujo); (2) **revocación admin** vía `POST /api/auth/users/{userId}/sessions/revoke-all` (previo a o junto con `IsActive=false`); (3) **autogestión** `POST /api/auth/sessions/revoke-all` («cerrar en todos mis dispositivos»). **No** en lockout por intentos fallidos. Contrato: [`docs/operacion/auth-sesiones.md`](../operacion/auth-sesiones.md). |

### Oleada 2026-08-30 (monitor de turnos)

| # | Tema | Resolución |
|---|---|---|
| 21 | **Enmascaramiento en el monitor de turnos** | **Sólo número de turno por omisión** (recomendación técnica aceptada). No se muestra nombre ni otra PHI en la pantalla pública. Mostrar nombre exigiría una decisión futura explícita (opt-in por tenant/sucursal); hoy no hay control de UI para activarlo. |

### Oleada 2026-08-30 (escala de triage)

| # | Tema | Resolución |
|---|---|---|
| 63 | **Escala de triage** | **Opción A — motor configurable; plantilla demo de 5 niveles.** Se mantiene la cascada sucursal → tenant (plan 13 / M5). Plantilla Dev = `escala_sintetica_demo_v1` (seed `006`, cinco niveles `prioridad_1`…`prioridad_5`); **no** es Manchester, ESI ni norma mexicana. Cada tenant **puede** cambiar el número y el contenido de niveles vía API/admin. La UI clínica **no** hardcodea los cuatro colores del prototipo: presenta la escala efectiva. **No** se afirma cumplimiento de escala internacional ni NOM sobre triage. Deuda residual: pantallas que aún consumen `mocks/urgencias` (dashboard/farmacia/expediente mock) con rojo/naranja/amarillo/verde — se retiran al sacar esos módulos de mocks, no se reinstalan como escala de producto. |

### Oleada 2026-08-30 (establecimiento)

| # | Tema | Resolución |
|---|---|---|
| 10 / L | **Responsable sanitario y tipología de establecimiento** | **Opción A — tipología demo + alcance de servicios.** Producto Fases 1–4: **solo ambulatorio + urgencias** (sin laboratorio propio, imagenología, cirugía, anestesia, odontología, hospital/UCI como alcance de esta decisión). Tenant demo (`seeds/002`): **CENTRAL** = `ambulatorio_con_urgencias` / `HasEmergencyService=1`; **NORTE** y **SUR** = `ambulatorio` / `0`. Aprovisionamiento genérico (`003`) **no** inventa tipología (queda NULL hasta captura). Responsable sanitario operativo **provisional:** rol `admin` (y SuperAdmin de plataforma) aprueba parámetros clínicos versionados; `ResponsiblePhysicianProfessionalId` se liga cuando se conozca al profesional — **no** bloquea emisión solo por faltar ese FK. |

### Oleada 2026-08-30 (controlados)

| # | Tema | Resolución |
|---|---|---|
| 64 / 68 | **Estupefacientes y psicotrópicos** | **Opción A — fuera de alcance comercial** en Fases 1–4 (y piloto / primer año comercial: las clínicas **no** los necesitan). El bloqueo ya implementado (`IsControlledSubstance` → HTTP **422** + exclusión del catálogo de prescritir) es **política de producto**, no un temporal. **No** hay UI/API de recetarios especiales ni surtido de estas clases. Reabrir solo con decisión escrita + **Reglamento de Insumos** verificado en fuente oficial + trámite de folios ante autoridad. El **libro de control de farmacia general** (pregunta **#60**, LGS 226) queda **aparte** y sigue abierto; no se decide por esta oleada. |

### Oleada 2026-08-30 (roles y permisos)

| # | Tema | Resolución |
|---|---|---|
| 19 | **Roles y permisos (Fase 1)** | **Opción B — plantillas fijas; permisos ajustables por tenant.** No se permiten nombres de rol libres por cliente. Catálogo cerrado de plantillas (los 8 del prototipo **más** `trabajo_social`) con matriz de permisos configurable por tenant sobre esas plantillas. **SuperAdmin** sigue siendo **solo de plataforma** (no es rol de tenant). Consulta de bitácora (`GET /api/audit/subject|actor`) permanece **admin + SuperAdmin** hasta una fase posterior. API matriz: `GET/PUT /api/roles/permission-matrix` (entregada 2026-08-31); UI admin en `seguridad/roles`. El front sigue usando `permissions.ts` como plantilla hasta que la sesión cargue overrides del tenant. |

### Oleada 2026-08-30 (firma electrónica)

| # | Tema | Resolución |
|---|---|---|
| 9 / 69 | **Firma electrónica (piloto / Fase 1)** | **Opción A — firma simple de integridad.** Hasta un nuevo dictamen escrito, basta la mecánica ya entregada: hash canónico SHA-256 + sello de tiempo + snapshot de cédula/establecimiento; nota/receta inmutables al firmar. **No** se exige e.firma/FIEL del SAT en el piloto. Los médicos del piloto **no** disponen de e.firma vigente. **No** se exige constancia NOM-151-SCFI-2016 en el piloto. La UI **no** afirma validez jurídica plena ni cumplimiento NOM-004 5.10; puede retirarse la leyenda de «dictamen pendiente de producto» y sustituirse por texto que describa integridad/cadena de custodia técnica sin pretensión de e.firma. Reabrir si legal exige FIEL o NOM-151 antes del primer paciente real. |

### Oleada 2026-08-27 (operación de sesiones)

| # | Tema | Resolución |
|---|---|---|
| 73 | **Alcance del logout** | **Sólo la sesión actual.** Cerrar sesión revoca únicamente el refresh token presentado en la cookie; las demás estaciones del mismo usuario siguen trabajando. Motivo del cliente: continuidad de la atención con dos estaciones en urgencias (recepción y triage sobre la misma cuenta). Si la petición llega **sin** cookie de refresh válida, el API limpia la cookie de esa estación y responde **400** con `success:false`: no hay sesión identificable que cerrar y responder 200 afirmaría un cierre que no ocurrió; tampoco se cae al cierre global, que sería lo contrario de la decisión. El cierre global (`sp_Auth_RevokeAllRefreshTokensForUser`) se usa según política **§75** (cambio de contraseña, bloqueo/baja admin, botón «cerrar en todos…»; no lockout por intentos). |
| 19-bis | **Profesional sanitario en BD + sesión** | **Modelar y alimentar la sesión desde el servidor** (2026-08-27/28). Cédula/especialidad admiten «no capturado»; sin validación externa; filtro médico **fail closed** si no hay profesional ligado. Detalle y pendientes en §19-bis. |

### Oleada 2026-08-23 (arquitectura final + operación)

| # | Tema | Resolución |
|---|---|---|
| — | **Topología final** | **Sin Edge.** Core central + SPA/PWA. Navegador e instalación = mismo cliente. Doc 03 reescrito. |
| — | **Cobro offline** | **Permitido.** Recibo provisional no fiscal; CFDI diferido; corte por dispositivo en contingencia. |
| — | **Farmacia offline** | **Permitida** (existencia negativa + reconciliación). **Estupefacientes y psicotrópicos: fuera de alcance** (opción A, 2026-08-30 — ver 64/68); el sistema los **impide**. |
| — | **Firma offline** | Local + sello al sincronizar; nota inmutable al firmar. **Dictamen de alcance (opción A) ratificado 2026-08-30** — ver 9/69; sin afirmar e.firma SAT ni NOM-004 5.10. |
| — | **Rechazo diferido** | Severidad admin/clínico; bandeja con SLA; nunca borrar; protocolo de contacto. |
| — | **Despliegue escalonado** | Aceptado **en entorno controlado**. No aplicable en shared hosting. |
| — | **Hospedaje** | SmarterASP **shared** = demos/ventas (datos sintéticos). **Instancia dedicada antes del primer paciente real.** |
| — | **Dispositivos** | Solo registrados: caché clínica + cola. Otros: solo en línea. Cola no se borra al logout. |
| — | **BI / dirección** | **Módulo en la app principal** (no app aparte). Permisos de solo lectura; solo agregados; sin PHI a nivel paciente; anti-reidentificación; lazy load; sin caché clínica offline del tablero. |
| — | **Infra del cliente** | Prevista; portabilidad Fase 0; flags CFDI/FHIR/RENAPO; deslinde contractual de Internet. |
| — | **DGIS / SINBA** | **Capacidad fija** del producto (no feature flag). Generación siempre; envío vía outbox cuando hay red. Demo: destino no productivo. |

### Oleada 2026-08-22 (histórico; parcialmente superado)

Estas dejan de ser preguntas. Se registran aquí y quedan reflejadas en los ADR del documento 03. **Nota:** la resolución “dos modalidades con/sin Edge” fue **superada** el 2026-08-23 (sin Edge). Se conserva el registro por trazabilidad.

| # | Tema | Resolución |
|---|---|---|
| 1 | Estrategia offline | ~~Dos modalidades Edge~~ → **Superado 2026-08-23:** Core + cola en dispositivo. Ver oleada superior. |
| 3 | Desviaciones al doc 2 | **ADR-006 aprobado.** Core sin HA de diseño; continuidad en dispositivo. |
| — | **Ventana de mantenimiento** | **No existe** (urgencias 24/7). Mitigación: despliegue escalonado en entorno dedicado. |
| — | **Transición online/offline** | Imperceptible al escribir (ADR-014); explícita al leer (SC-09). |
| — | **Nada bloquea el inicio de la atención** | Ratificado (ADR-015). |
| 5 | Identidad del paciente | Modelo doc 08 aceptado. |
| 11 | Alcance clínica vs. hospital | Congelado ambulatorio + urgencias. |
| — | **App de dirección** | Actualizado 2026-08-23: **módulo BI en app principal** (no bundle aparte). |

---

## A. Bloqueantes — no se puede empezar a construir sin esto

### 1. Modalidad de despliegue por sucursal — **RESUELTA en lo esencial**
Ambas modalidades son obligatorias y la modalidad es configuración por sucursal. Lo que queda abierto no es *si* se soportan, sino cómo se parametrizan. Esas preguntas están agrupadas en la nueva sección **E** de este documento y desarrolladas en el doc 07 §9.

**Sigue bloqueando el presupuesto y el dimensionamiento:** ¿cuántas sucursales y cuántas estaciones por sucursal en el primer año, y **cuáles tienen urgencias**? Esto último determina qué modalidad es obligatoria en cada sucursal, porque mientras el Core siga en 1 nodo sin HA la modalidad sin servidor no debe ofrecerse donde hay urgencias (doc 07 §6).

### 2. Hospedaje y residencia de datos — **APLAZADA 2026-08-30** (cliente: dejar pendiente)
Vigente lo ya ratificado: shared = demos sintéticas; dedicado antes de PHI. **Sigue abierto** (no inventar):
- ¿Nube pública (Azure / AWS / GCP), VPS, datacenter propio o híbrido?
- ¿Requisito o preferencia de residencia en México? (ligado a #70)
- ¿Proveedor o contrato vigente?
- Región y proveedor definitivos de Production y de QA (#71; hoy “por definir” en `docs/operacion/ambientes.md`)

**No bloquea** seguir en Dev sintético. **Sí bloquea** `AllowRealPatientData=true` y PHI en Prod.

### 3. Desviaciones al documento de arquitectura — **RESUELTA**
- **ADR-006 (refresh token en cookie `httpOnly`): aprobado.**
- **Redundancia del Core: no se hace.** El Core permanece en 1 nodo conforme al doc 2. En este punto **ya no hay desviación** que aprobar.

**Postura registrada:** la continuidad de la atención es responsabilidad de la **sucursal** —servidor local, o caché en el cliente cuando no hay servidor— y el Core se diseña asumiendo que **puede estar caído, reiniciándose o en mantenimiento**. Ver ADR-007 reformulado y doc 07 §5.

**Lo que sigue abierto es la consecuencia por sucursal, no la decisión:** ver pregunta 28 en la sección E.

### 4. Alcance real de la Fase 1
Los dos documentos de entrada **están truncados** (ver documento 00) y el `.docx` se declara "NO CONCLUYENTE".

- ¿Se toman las reglas recuperadas como base y se completan en talleres por módulo?
- ¿Existen versiones completas de esos documentos?
- ¿Hay un módulo que deba salir primero por necesidad del negocio?

**Bloquea:** el alcance de cada fase.

### 5. Identidad del paciente y CURP — **RESUELTA**
Se aprueba el modelo propuesto: **ID interno inmutable + CURP opcional validada + flujo de paciente no identificado + cola de fusión con revisión humana obligatoria**. La validación de CURP es **estructural con dígito verificador**, sin consulta en línea a RENAPO.

Queda así levantado el bloqueo que la regla del `.docx` (CURP obligatoria y única) imponía sobre el registro de pacientes inconscientes, recién nacidos y extranjeros en urgencias.

**Consecuencia para el diseño:** la unicidad de CURP se implementa como índice único **filtrado** (aplica sólo cuando hay CURP), no como restricción `NOT NULL UNIQUE`. La detección de duplicados se apoya en coincidencia probabilística sobre nombre, fecha de nacimiento y sexo, y **nunca fusiona de forma automática**.

---

## B. Legales y fiscales — requieren dictamen del cliente, no decisión técnica

### 6. Telesalud y artículo 71 Septies de la LGS
La reforma del 15-01-2026 redacta el art. 71 Septies en términos generales, a diferencia de 71 Quater y 71 Quinquies, que sí acotan al sector público (doc 01 §1).

- ¿MediCore ofrecerá telemedicina/teleconsulta?
- Si sí: ¿el área legal del cliente confirma si 71 Septies alcanza a prestadores privados?

**Recomendación:** construirlo como si aplicara. El costo incremental es bajo y el riesgo de no hacerlo es alto.

### 7. IVA en servicios médicos
El `.docx` calcula IVA al 16% con uso de CFDI D01 por defecto. El tratamiento del IVA en servicios médicos prestados por profesionales titulados tiene reglas específicas.

- ¿Qué determina el asesor fiscal del cliente, por tipo de servicio?
- ¿Hay servicios del catálogo que sí causen IVA (por ejemplo, venta de medicamentos o insumos, o estudios)?

**Bloquea:** la Fase 2. Programar esto mal tiene consecuencia fiscal directa.

### 8. Software como dispositivo médico — **RATIFICADA 2026-08-31**
Ver oleada break-glass/SaMD (#8). Alcance F1–4 = documental/administrativo; sin ADC/IA clínica. Reabrir solo con dictamen legal escrito.

### 9. Firma electrónica — **RATIFICADA 2026-08-30** (opción A)
Ver oleada de decisiones ratificadas (9 / 69). Mecánica = integridad + sello; sin e.firma SAT ni NOM-151 en el piloto; médicos del piloto sin e.firma vigente.

### 10. Responsable sanitario y perfil del establecimiento — **RATIFICADA 2026-08-30** (opción A)
Ver oleada de establecimiento (10 / L). Alcance de servicios = ambulatorio + urgencias. Tipología demo en seed `002`; `003` no inventa. Responsable operativo provisional = `admin` / SuperAdmin; médico responsable ligado cuando se conozca.

**Sigue abierto (no bloquea tipología):** domicilio completo, cédula de licencia sanitaria, persona concreta del responsable médico, y matriz normativa fina por servicio futuro (lab/imagen) si se amplía alcance.

---

## C. Producto y operación

### 11. Alcance "clínica" vs "hospital" — **RESUELTA**
Las Fases 1–4 se **congelan en clínica ambulatoria + urgencias**. Hospitalización, quirófanos y UCI quedan como dirección estratégica (Fase 5), **no** como compromiso con fecha.

**Consecuencia favorable:** el modelo de datos se diseña para admitir el episodio hospitalario más adelante (el episodio de urgencias ya es un caso particular de episodio), pero no se construye ni se estima ahora. El paquete normativo de F1–4 queda acotado a ambulatorio + urgencias (doc 06 §10).

### 12. Equipo y capacidades disponibles
Sin esto no hay calendario.

- ¿Cuántas personas y con qué perfiles (backend .NET/SQL, frontend React, QA, DevOps, DBA, diseño)?
- ¿Existe experiencia previa en sincronización offline y en despliegues distribuidos?
- ¿Quién operará los nodos Edge?

### 13. Fecha objetivo y qué es negociable
- ¿Hay una fecha comprometida con un cliente real o una demo?
- Si la fecha es fija: ¿qué se negocia, el alcance o el número de sucursales del piloto? (Lo que no se negocia son las pruebas de seguridad clínica SC-01 a SC-12.)

### 14. Migración desde un sistema previo
- ¿Existe un sistema actual (papel, Excel, otro software)?
- ¿Hay que migrar historial clínico? ¿Cuántos pacientes y con qué antigüedad?
- ¿Se requiere operación en paralelo durante la transición?

### 15. Internacionalización
El prototipo tiene i18n inicializado pero **vacío**, con `lng: 'en'` y cero llamadas a `useTranslation` (doc 02 §4).

- ¿Se prevé otro idioma o país? (Cambiaría decisiones sobre CURP, CFDI, CIE-10 y todo el módulo normativo.)
- Si no: ¿se retira el andamiaje de i18n, o se deja preparado extrayendo las cadenas?

### 16. Portal del paciente
Hoy es una consulta pública por CURP/expediente, sin autenticación (`src/pages/portal-paciente/page.tsx`).

- ¿El portal es parte del alcance?
- Si sí, requiere autenticación propia del paciente, consentimiento y auditoría de acceso. **Una consulta de expediente por CURP sin autenticación es una fuga de datos sensibles.**

### 17. Interoperabilidad: alcance y prioridad
- ¿Hay una necesidad real de intercambio hoy (aseguradoras, laboratorios externos, otras instituciones), o FHIR es preparación estratégica?
- ¿Se buscará certificación NOM-024 ante la DGIS? ¿En qué horizonte? (Recordar el requisito de 6 meses de madurez del SGSI.)
- ¿El cliente tiene licenciamiento de SNOMED CT? ¿Qué versión de CIE-10 debe usarse?

### 18. Pagos
El documento técnico menciona Stripe/Toss/PayPal como previstos y el prototipo tiene la dependencia de Stripe sin usar.

- ¿Se requiere cobro con tarjeta en línea, o sólo registro del método de pago en caja?
- ¿Qué PAC se usará para el timbrado CFDI?

### 19. Roles y permisos — **RATIFICADA 2026-08-30** (ver oleada de roles)

**Resuelto (producto):** opción **B** — plantillas cerradas; permisos ajustables por tenant; sin roles con nombre libre; SuperAdmin solo plataforma; auditoría de consulta sigue admin + SuperAdmin; plantilla explícita `trabajo_social` en el catálogo.

**Pendiente de implementar:** persistencia y UI/API de la matriz de permisos por tenant (hoy el front usa `roleRoutes` / `rolePermissions` estáticos por código de plantilla). Cuando exista la matriz, sustituir AuthZ provisional (`AuditAccess.CanQuery` y dominios clínicos) sin cambiar contratos HTTP salvo que se documente en `docs/operacion/`.

### 19-bis. Profesional sanitario en sesión — **PARCIALMENTE RESUELTO 2026-08-28**
**Resuelto (modelo + sesión):** existe `dbo.HealthcareProfessional` (liga opcional 0..1 a `dbo.[User]`, cédula y especialidad **nullable** = «no capturado», sin defaults inventados), catálogo `dbo.Specialty` por tenant vacío de fábrica, SPs mínimos de consulta, y el login/`me` exponen `healthcareProfessional` (o `null`) desde el servidor. Seed sintético de Dev liga sólo a los dos usuarios con rol `medico` del prototipo; el resto queda sin profesional a propósito (fail closed). El filtro clínico en frontend, si el médico no trae profesional, muestra lista vacía — no inventa `doctorId`.

**Sigue abierto (no verificado / no implementado):**
- ¿La cédula debe **validarse** contra el registro oficial (SEP/RUPE u otro)? **No implementado**; no hay consulta externa.
- ¿La cédula es **obligatoria para firmar/emitir** documentos clínicos en todo caso? El art. 83 LGS (verificado 2026-08-22, doc 01 §11.1) exige consignarla en documentos del ejercicio; la regla de bloqueo al emitir es de Fase 1.
- ¿Cómo se representan **pasantes y residentes** (sin cédula plena o con cédula de otra categoría)?
- Perfil profesional completo (correo, teléfono, vigencias de cédula/certificación, responsable sanitario del establecimiento — pregunta 10).
- Administración CRUD de médicos (alta/edición/baja) — Fase 1.
- Afirmar cumplimiento normativo de cédula/responsable sanitario **sin** fuente oficial + fecha sigue prohibido.

### 20. Estaciones con hardware
- ¿Qué hardware hay o habrá: impresoras térmicas, impresoras de etiquetas/brazalete, tabletas de firma, lectores biométricos, lectores de código de barras, básculas, equipos de laboratorio con interfaz?
- ¿Se acepta el shell nativo `MediCore Estación` (Tauri) para esas estaciones, o debe funcionar todo dentro del navegador?

---

## D. Confirmaciones de menor riesgo

21. **Enmascaramiento en el monitor de turnos — RATIFICADA 2026-08-30.** Sólo número de turno por omisión; sin nombre/PHI en pantalla pública (ver oleada). Opt-in de nombre = decisión futura, no implementada.
22. **Retención documental:** ¿se adopta el mínimo de 5 años de NOM-004 numeral 5.4, o el cliente define un plazo mayor por política?
23. **Break-glass — RATIFICADA e implementada 2026-08-31.** API `POST /api/auth/break-glass`, auditoría, UI menú usuario. Ver [`docs/operacion/auth-sesiones.md`](../operacion/auth-sesiones.md).
24. **Zona horaria:** ¿todas las sucursales en la misma zona, o hay sucursales en zonas distintas de México?
25. **Navegadores y sistemas soportados:** ¿se puede exigir un navegador moderno basado en Chromium? (Impacta service worker, IndexedDB, OKLCH y las APIs de PWA.)
26. **Idioma del código y la documentación:** el doc 2 fija código en inglés, explicaciones en español y documentación en el código en español. ¿Se confirma?
27. **Presupuestos de performance y RTO/RPO:** ¿se ratifican los valores propuestos en los documentos 03 §4 y 05 §3, o el cliente fija otros?

---

## E. Preguntas nuevas derivadas de las modalidades de despliegue y de la app de dirección

Surgen del análisis de [`07-modalidades-de-despliegue.md`](07-modalidades-de-despliegue.md), donde están desarrolladas con su fundamento. Se listan aquí para mantener este documento como el único índice de pendientes.

### Sobre el Core y el rechazo de ADR-007

28. **¿Se reconsidera ADR-007?** Dato verificado que puede cambiar la evaluación: la alta disponibilidad del Core es alcanzable en **SQL Server Standard** mediante Basic Availability Groups, **sin salto a Enterprise**, porque su limitación de "una sola base de datos por grupo" coincide exactamente con la base única multi-tenant que fija el doc 2. Los ≥2 nodos de API son .NET *stateless*, sin costo de licencia de base de datos. Fuente: Microsoft Learn, verificado 2026-08-22. *(La decisión sigue siendo del cliente; sólo se corrige el dato de costo.)*
29. Si se **mantiene** el rechazo: ¿se acepta por contrato que (a) la modalidad sin servidor **no se ofrezca en sucursales con urgencias**, y (b) exista una ventana de mantenimiento acordada con indisponibilidad simultánea declarada para todas las sucursales sin servidor?

### Sobre la modalidad con servidor

30. ¿Se estandariza **SQL Server 2025 Express** en el Edge para aprovechar el límite de 50 GB por base de datos, o **2022 Express** con 10 GB y una ventana de retención más corta?
31. ¿Cuál es la **ventana de retención local** de datos calientes en el Edge: 3, 6, 12 meses? Determina el dimensionamiento y la frecuencia de purga.
32. Sobre el **PC reutilizado**: ¿cuáles son sus características reales (procesador, memoria, disco, sistema operativo, uso actual)? ¿Se aceptan **todos** los controles obligatorios del doc 07 §3.2 —cifrado de disco, UPS, respaldo automático a segundo medio, sin uso interactivo compartido, actualizaciones en ventana controlada, ubicación con llave, alerta por retraso de sincronización y ensayo de restauración?
33. **¿Quién opera y respalda el Edge en cada sucursal?** ¿Personal de TI del cliente, soporte contratado, o administración remota a cargo del proveedor? Sin respuesta, el riesgo operativo del Edge no tiene dueño.

### Sobre la modalidad sin servidor

34. **Política de caché en equipos compartidos:** ¿se acepta **prohibir** la caché de datos clínicos en equipos de kiosco y compartidos, habilitándola sólo en dispositivos registrados?
35. ¿Se acepta el **cifrado de disco del sistema operativo como requisito** de toda estación que use caché offline? (IndexedDB no está cifrada.)
36. Tensión de diseño sin solución única (doc 07 §4.4): ¿cifrado de la caché **a nivel de aplicación** —más seguro ante robo del equipo, pero incompatible con recargar la aplicación estando offline, que es justo lo que la caché busca permitir— o caché protegida **sólo** por el cifrado de disco?
37. ¿Cuál es el **umbral de cola** que bloquea la captura nueva, por antigüedad y por volumen? Es preferible detener la captura de forma visible a acumular en silencio información que se puede perder.
38. ¿Existe ya **enlace redundante** en las sucursales, o es un costo nuevo? Se requieren cotizaciones reales: el enlace redundante es costo **recurrente** y el servidor local es costo **único**, por lo que "sin servidor" no es necesariamente más barato.
39. Para folios de documentos clínicos que se imprimen y se entregan: ¿se acepta la política de **bloques pre-asignados por dispositivo con huecos documentados**, dado que la alternativa —folio provisional reconciliado después— cambia el identificador de un documento ya entregado al paciente?

### Sobre la app de dirección

40. **¿El director puede ver datos a nivel de paciente, o sólo indicadores agregados?** — **RESUELTA 2026-08-23:** sólo agregados.
41. ¿App aparte vs módulo en la principal? — **RESUELTA 2026-08-23:** **módulo en la app principal** con permisos (ADR-013 reformulado). Ya no aplica el costo de una segunda aplicación.
42. ¿Qué **indicadores** necesita realmente la dirección? Sin esta lista el alcance del tablero no es estimable.

### Transversal

43. ¿Cuántas sucursales y cuántas estaciones por sucursal en el primer año, y **cuáles tienen urgencias**? Determina qué modalidad es obligatoria en cada una y todo el costo del despliegue.

---

## F. Preguntas nuevas derivadas de la identidad del paciente y del paciente no identificado

Surgen del análisis de [`08-identidad-y-paciente-no-identificado.md`](08-identidad-y-paciente-no-identificado.md), donde están desarrolladas con su fundamento normativo verificado. Ninguna se resolvió por cuenta propia: todas tienen componente legal o de política del cliente.

### Requieren dictamen legal del cliente

44. ~~**Fotografía del paciente para identificación.**~~ **RATIFICADA 2026-09-02 — Sí.** Ver oleada superior. Implementada en producto; el establecimiento responde por base de licitud / aviso. **No** se afirma cumplimiento LFPDPPP sin fuente oficial + fecha.
45. **Aviso al Ministerio Público: ¿quién emite el juicio de presunción, y con qué criterio operativo?** Ya **no** es una laguna: la obligación sanitaria está verificada en el **artículo 19 fracción V** del Reglamento de la LGS en materia de Prestación de Servicios de Atención Médica, a cargo del **responsable del establecimiento**, y su disparador es *"lesiones u otros signos que **presumiblemente** se encuentren vinculadas a la comisión de hechos ilícitos"* — no "accidente" ni "lesión" (doc 01 §2, verificado el 2026-08-22). Lo que falta es del cliente: **¿qué rol de su organización emite ese juicio de presunción y con qué criterio documentado?** Sin eso, el sistema puede ofrecer y sugerir la notificación, pero nadie la asume. Queda además sin verificar si existen deberes **adicionales** de denuncia en legislación penal federal o estatal, que no se revisó.
46. **Artículo 81 del Reglamento en establecimiento ambulatorio — la pregunta se estrechó, pero no desapareció.** La verificación del **artículo 51 Bis 2 de la LGS** cambió el panorama: la ley obliga al *"prestador de servicios de salud"* —sin decir hospital— a *"proceder de inmediato para preservar la vida y salud del usuario, **dejando constancia en el expediente clínico**"* cuando no hay quien pueda autorizar, y **no exige el acuerdo de dos médicos** (doc 01 §2, verificado el 2026-08-22). Es decir, **la habilitación para actuar ya no depende de resolver si una clínica ambulatoria es "hospital"**. Lo que sigue abierto es más acotado: ¿el establecimiento debe cumplir además el requisito **reforzado** del artículo 81 del Reglamento —valoración con acuerdo de al menos dos médicos autorizados— por prestar servicio de urgencias, o le basta la constancia del 51 Bis 2? El diseño soporta el requisito más exigente para no quedar corto, pero el criterio debe dictaminarlo el área legal.

### Requieren política del cliente

47. **Conservación de las señas particulares una vez identificado el paciente.** La base de licitud del artículo 9 fracción VI opera *"mientras la persona titular no esté en condiciones de otorgar el consentimiento"*, y la finalidad declarada de las señas es **identificar**. Agotada esa finalidad: ¿se conservan como parte del expediente, se restringe su acceso a roles sujetos a secreto profesional, o se anonimizan mediante el motor de retención? Lo que **no** es admisible es dejarlas indefinidamente visibles para cualquier rol como si fueran expediente clínico ordinario. Se necesita una regla explícita.
   - *Acotación M3 (2026-08-28):* se **conservan** (no se borran ni anonimizan al identificar); acceso restringido a roles admin/clínicos provisionales. Pendiente la regla definitiva de retención.
48. **Quién puede ejecutar la búsqueda por descripción** para atender a familiares (doc 08 §7): ¿recepción, trabajo social, sólo personal clínico, o un rol específico? ¿Alcance limitado a la sucursal o a toda la organización? Es un flujo con una tensión normativa propia: el numeral **5.6** de la NOM-004 **obliga** a proporcionar información verbal a los familiares, mientras el **5.5.1** condiciona la entrega a terceros a solicitud escrita de quien tiene legitimación — y con un paciente no identificado **no se puede acreditar el parentesco de alguien cuya identidad se desconoce** (doc 08 §7, ambos numerales verificados el 2026-08-22). Se requiere criterio del cliente sobre el procedimiento operativo.
   - *Acotación M3 (2026-08-28):* endpoint implementado; AuthZ provisional **SuperAdmin/`admin`** (mismo criterio que auditoría). Alcance y rol definitivo pendientes.
49. **Copia del documento de identidad.** Al verificar la identidad, ¿se conserva copia digital del documento cotejado, o basta registrar tipo, folio y quién cotejó? Conservar la copia amplía la superficie de datos sensibles sin necesidad clínica evidente. La propuesta es **no conservarla**, pero es decisión del cliente.
50. **Estado `no_recuperable`:** ¿qué plazo o criterio operativo lo dispara, y qué rol lo autoriza? Sin una regla, los expedientes de pacientes que nunca se identificaron quedan indefinidamente en las bandejas de pendientes.
51. **Convención de etiquetas temporales.** Se propone **alfabeto fonético** (Alfa, Bravo, Charlie…) por ser inconfundible al pronunciarse, que es donde ocurre la confusión real: "Desconocido 1" y "Desconocido 2" se distinguen en pantalla pero no en un pasillo. ¿Se acepta, o el cliente tiene convención propia? Queda excluido cualquier esquema basado en colores, porque colisiona con la semántica clínica de triage.
52. **Cese de la base de licitud.** Cuando el paciente recupera capacidad o aparece su representante, cesa el supuesto del artículo 9 fracción VI y vuelve a aplicar el consentimiento expreso y por escrito del artículo 8. ¿Cuál es el procedimiento operativo para recabarlo en ese momento y quién es responsable de ejecutarlo?

### Requieren consulta a la autoridad, no sólo decisión interna

53. **CURP de un paciente que nunca se identifica: hay que preguntarle a la DGIS.** Es la **única laguna normativa dura** que dejó esta verificación. La NOM-024 marca la CURP como requerida sin valor sustituto y su numeral **6.5.1** establece que *"los SIRES no deben autogenerar la CURP"*; el instructivo vigente de la DGIS prescribe valores de desconocimiento para nombre (`Desconocido`), fecha de nacimiento (`09/09/9999`) y edad (`999`), **pero no para la CURP** (doc 01 §3, verificado el 2026-08-22). Consecuencia: **un paciente no identificado no tiene representación prevista para el intercambio de información bajo NOM-024, y está prohibido inventarle una clave.** Se propone **consulta formal a la DGIS antes de construir el módulo de intercambio**, porque determina si esos episodios son reportables. No se resuelve por analogía con los otros rellenos, y no se debe implementar un valor inventado.
54. **Campo `sexo` en el reporte cuando no es determinable.** El numeral 5.9 de la NOM-004 lo exige en toda nota médica y no se localizó instrucción oficial de desconocimiento para ese campo. Internamente se conserva `no_determinado`; qué se emite hacia el reporte debe confirmarse en la misma consulta que el punto 53.
55. **NOM-046-SSA2-2005.** El instructivo de Lesiones de la DGIS la invoca como criterio para decidir el aviso al Ministerio Público, pero su ámbito declarado es violencia familiar, sexual y contra las mujeres, que **probablemente no cubre un accidente vial** (doc 01 §8). Requiere verificación antes de usarla como criterio.

---

## G. Preguntas nuevas derivadas del barrido del modelo de datos

Surgen de [`09-brechas-del-modelo-de-datos.md`](09-brechas-del-modelo-de-datos.md), donde cada una está desarrollada con el hallazgo que la origina, su evidencia en el código y el tipo propuesto. Ninguna se resolvió por cuenta propia: todas tienen componente clínico, legal o de producto. Cuando existe una recomendación técnica se conserva, y se declara como tal — es una recomendación, no una decisión tomada.

### Requieren criterio clínico o de dirección médica

56. **Qué se hace con los expedientes existentes cuyos antecedentes fueron prellenados.** La función que crea la historia clínica inicializa los antecedentes en `negado` y **todos** los aparatos y sistemas en `normal` (BM-PAC-14). Al corregir el tipo, los registros ya creados con esos valores son **indistinguibles** de los asentados por un clínico. ¿Se migran todos a `no_interrogado`, aceptando que se pierde información realmente asentada; se migran sólo los que nunca fueron editados; o se marcan todos como *"origen: prellenado por el sistema"* y se deja que el clínico los confirme en el siguiente contacto? **Recomendación técnica:** la tercera, por ser la única que no destruye ni afirma. Requiere criterio clínico del cliente.
57. **Cuántos signos vitales se exigen para poder guardar un triage.** Hoy nueve son obligatorios y no nulos, de modo que el triage del paciente en reanimación no se puede guardar (BM-URG-02). La propuesta es que el triage **siempre** se pueda guardar, exigiendo respuesta explícita por signo y no valor. ¿Hay algún signo vital cuya ausencia deba impedir el guardado, o basta la razón de no medición en todos? **Recomendación técnica:** ninguno debe impedirlo, y un triage con los nueve en `no_medido` y razón *"paciente en reanimación"* debe ser un registro válido y visible. Requiere criterio de enfermería y dirección médica.
58. **Qué se hace cuando se prescribe sin haber interrogado alergias.** ~~Propuesta anterior: exigir que el estado no sea `no_interrogado`.~~ **RATIFICADA 2026-08-27 (doc 13 / M8):** se **obliga a capturar el estado** de forma explícita antes de prescritir (incluye `no_interrogado` / `paciente_no_puede_responder`) con rastro auditado. **No** se bloquea hasta «conocer» las alergias; se bloquea si el estado **nunca** se capturó (la semilla de Ensure no cuenta). Implementado en WS-I (`sp_Prescription_Create` → 409; UI de captura; contrato `api-prescriptions.spec.ts`).
59. **Unidad canónica de almacenamiento de peso y talla.** La propuesta lleva unidad explícita en el tipo de toda medición (BM-TRA-09, BM-URG-11). ¿Se almacena en la unidad capturada, conservando el dato original, o se normaliza a una unidad canónica al guardar? **Recomendación técnica:** almacenar lo capturado con su unidad y convertir al calcular, porque normalizar al guardar pierde la información de cómo se midió y reintroduce el error de conversión en el punto de escritura. Requiere validación clínica.

### Requieren dictamen legal o consulta a la autoridad

60. **Equivalencia del libro de control de farmacia electrónico con el libro físico.** El artículo 226 fracciones II y III de la LGS exige registro en libros de control y retención física de la receta (doc 01 §11; BM-FAR-07). Si el sistema produce el libro de control electrónico, ¿sustituye al físico o lo complementa? Depende del **Reglamento de Insumos para la Salud, no verificado** (doc 01 §8). Bloqueante para el alcance del módulo de farmacia **general**. **No se decide por analogía.** *Acotación 2026-08-30:* la decisión de controlados (64/68 opción A) **no** cierra esta pregunta; libro de controlados no aplica mientras esas clases estén fuera de alcance.
61. **Cuál es el reloj del último acto médico.** El plazo de conservación de cinco años corre desde el **último acto médico** (NOM-004 numeral 5.4), y la implementación actual lo ancla en la última consulta (BM-NOR-10). La propuesta enumera doce tipos de acto médico; se requiere **ratificar la lista**. ¿Una dispensación de farmacia es acto médico para efectos del numeral 5.4? ¿Una cita a la que el paciente no acudió? **Recomendación técnica:** todo acto que genere un documento en el expediente. Requiere criterio legal. *Acotación M7 (2026-08-28):* `ClinicalRecord.LastMedicalActAtUtc` queda **nullable** y `sp_ClinicalRecord_TouchMedicalAct` existe sin afirmar qué `ActType` cuentan; el motor de retención sigue en Fase 3. *Acotación M6 (2026-08-28):* al firmar una nota se invoca `TouchMedicalAct` con `ActType = clinical_note_{noteType}` si hay expediente; **no se afirma** que cuente para el reloj.
62. **Qué se registra como sexo biológico cuando el paciente declara identidad de género distinta.** La propuesta separa sexo biológico, identidad de género y sexo documental (BM-PAC-03). ¿Qué campo alimenta los rangos de referencia y el cálculo de dosis cuando difieren, y qué campo se imprime en cada documento? **Recomendación técnica:** sexo biológico para lo clínico, nombre de uso e identidad para el trato y la presentación, sexo documental para lo fiscal y los trámites. Requiere validación clínica y legal. Se relaciona con la pregunta 54, sobre el sexo no determinable.
   - *Acotación M3 (2026-08-28):* sólo `BiologicalSex` + `SexSource`; **no** se agregó campo de género/identidad hasta respuesta del cliente.
63. **Escala de triage — RATIFICADA 2026-08-30** (opción A; ver oleada de escala de triage).
Motor configurable; demo = 5 niveles sintéticos; UI clínica lee escala efectiva; sin afirmar norma/escala internacional.

### Requieren decisión de producto y de negocio

64. **Si la clínica prescribirá estupefacientes y psicotrópicos — RATIFICADA 2026-08-30** (opción A; ver oleada de controlados).
Fuera de alcance comercial Fases 1–4; piloto/primer año **sin** necesidad de controlados; bloqueo 422 = política de producto. Reabrir solo con decisión escrita + Reglamento verificado + trámite de recetarios.
65. **Alcance del multi-tenant en la primera versión.** La propuesta exige identificador de tenant en toda entidad (BM-TRA-01). ¿La primera versión es realmente multi-tenant, o es una instalación por cliente? La respuesta **no cambia la recomendación** —el campo debe existir desde el inicio, porque agregarlo después obliga a migrar todo— pero sí cambia el alcance del trabajo de aislamiento, autorización y pruebas. Decisión de arquitectura y de negocio.
66. **Qué campos se retiran por minimización.** Se señalan datos posiblemente innecesarios: aseguradora y póliza obligatorias para todo paciente, correo electrónico obligatorio, y la denominación del paciente copiada en catorce entidades (BM-TRA-11, BM-PAC-13). ¿Qué se conserva? **Bloqueada** por la verificación pendiente del principio de minimización en la LFPDPPP de 2025 (doc 01 §8).
67. **Tratamiento fiscal del IVA en servicios médicos — reiteración de la pregunta 7.** No es una decisión nueva: es la **misma** pregunta 7 de la sección B, y se registra aquí porque el barrido del modelo de datos añadió una dependencia que antes no era visible. Los hallazgos BM-CAJ-02 y BM-CAJ-05 no se pueden cerrar sin ella, porque el objeto de impuesto por concepto y la regla de cálculo dependen de esa definición. Ver pregunta 7.

---

## H. Pendientes explícitos post-cierre (2026-08-23)

### 68. Estupefacientes y psicotrópicos — **RATIFICADA 2026-08-30** (opción A)
Ver oleada de controlados (64 / 68). Alcance = **impedir** (no omitir en silencio). Sin recetarios especiales. Reglamento de Insumos sigue sin verificar en fuente oficial (doc 01 §8); no se afirma cumplimiento del régimen de controlados.

### 69. Dictamen firma electrónica local + sello — **RATIFICADA 2026-08-30** (opción A)
Ver oleada de decisiones ratificadas (9 / 69). Alcance piloto = integridad técnica; sin e.firma/NOM-151. **No** se cierra cumplimiento NOM-004 5.10 por esta decisión.

### 70. Residencia / transferencia internacional de datos — **APLAZADA 2026-08-30**
Proveedor típico sin DC en México. Requerido antes del primer paciente real. Cliente dejó pendiente junto con §2 / #71.

### 71. Región y proveedor definitivo de producción — **APLAZADA 2026-08-30**
VPS dedicado u otro; no shared para PHI. Cliente dejó pendiente junto con §2 / #70. QA/Prod siguen “por definir” en `ambientes.md`.

### 72. Supresión de celdas pequeñas en BI
Umbral numérico (p. ej. n&lt;5) a definir con dirección / legal.

### 73. Alcance del logout — **RATIFICADA 2026-08-27** (ver oleada de decisiones ratificadas)
Movida a la sección de decisiones ratificadas: **cerrar sesión revoca únicamente la sesión actual**.

### 74. `tools/apply-database.ps1` no aplicaba la migración `0002` — **RESUELTO 2026-08-27**
El script enumeraba los archivos SQL uno por uno y sólo incluía `0001_foundation.sql`, así que QA y Production habrían quedado sin la columna `PayloadHash` de `dbo.IdempotencyRecord` que `sp_Sync_SaveIdempotency` necesita para distinguir reintento de conflicto.

Ahora recorre `backend/database/migrations/*.sql` en orden lexicográfico. La primera migración es la fundacional y es la única que puede conectarse a `master` (es la que crea la base); las demás corren siempre contra la base destino, porque todas traen `USE [$(DbName)]`. Con `-SkipCreateDatabase` nada toca `master`, que es el caso del hosting compartido. Verificado el 2026-08-27 aplicando `0001` + `0002` + SPs a la base de Dev hospedada con `-SkipCreateDatabase -SkipSeed`.

### 75. Revocación global de sesiones — **RATIFICADA 2026-08-30** (opción A; ver oleada)
Política: revocar **todas** las estaciones en cambio de contraseña, bloqueo/baja admin (`IsActive=false`) y botón autogestión «cerrar en todos…». **No** en lockout por intentos fallidos. Logout ordinario = solo sesión actual (#73). SP ya existe; endpoints/UI pendientes de implementación.

### 76. Deuda de tipos y lint del frontend
`npm run type-check` y `npm run lint` en `frontend/` fallan por la deuda del prototipo migrado (ver [`docs/operacion/pruebas.md`](../operacion/pruebas.md)). Se registra aquí porque la tarea que lo introdujo no pudo anotarlo. Al 2026-08-27 hay un agente atacándolo en `frontend/src/**`; si al cerrar ese trabajo la etapa `frontend` de `tools/run-all-tests.ps1` queda en verde, este pendiente se cierra sin decisión adicional.

### 77. SC-25 / SC-26 vs mapa SC-01…SC-24 — **ALCANCE QA RATIFICADO 2026-08-29**
Discrepancia del doc 13 §M12 / doc 11 §3 («SC-01…SC-26») frente al mapa ejecutable (hasta SC-24). **Resolución de alcance (no de producto nuevo):** SC-25 y SC-26 **permanecen fuera** del mapa `sc-mapa.spec.ts` en M12 parcial. Motivos y defensa parcial ya cubierta: hecho canónico en [`docs/operacion/pruebas.md`](../operacion/pruebas.md) § «Discrepancia SC-25 / SC-26». Reabrir SC-25 exige capa de reporte SINBA (Fase 4) + cierre de #53/#54; reabrir SC-26 exige detección offline NOM-027 en cliente.
