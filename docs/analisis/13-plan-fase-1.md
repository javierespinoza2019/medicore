# 13 — Plan de Fase 1 (ejecutable)

Estado: **plan de trabajo**. Deriva de [`11-plan-de-implementacion.md`](11-plan-de-implementacion.md) §3 «Fase 1» y de
[`12-propuesta-final.md`](12-propuesta-final.md) §8. No amplía el alcance de esos documentos: lo detalla al nivel
necesario para codificar.

Sin fechas ni plazos: el doc 11 mide en **bloques** y no hay tamaño de equipo informado. Aquí se conserva ese criterio y
se agrega lo único que sí es planificable con certeza: el **orden de dependencias** y los **límites de archivos** por
línea de trabajo.

Lectura previa obligatoria para quien tome un módulo: `AGENTS.md`, doc 12, doc 08 (identidad), doc 09 (brechas del
modelo), doc 01 (marco normativo verificado), `docs/operacion/pruebas.md` y las reglas `.cursor/rules/medicore-*`.

### Decisiones ratificadas para Fase 1 (2026-08-27)

Cuatro decisiones del usuario, incorporadas a los módulos afectados. Dejan de ser preguntas abiertas en §5.3.

| # | Decisión | Módulos |
|---|---|---|
| 1 | **Escala de triage** configurable por **tenant y por sucursal** (cascada; prioriza sucursal). Plantilla demo = 5 niveles sintéticos (`006`). El producto **no** impone Manchester ni cuatro colores; UI clínica lee la escala efectiva (doc 06 §63, 2026-08-30). | M5 |
| 2 | **Mínimo de signos vitales para guardar triage: ninguno obligatorio.** Se guarda con lo que haya; lo faltante queda explícitamente como «no tomado». La atención no se detiene. Aplica `medicore-clinical-safety`: no fabricar signos por omisión. | M5 |
| 3 | **Alergias al prescritir:** si las alergias **no** han sido interrogadas (distinto de «niega alergias»), el sistema **obliga a capturar el estado de alergias** antes de continuar, aunque ese estado sea «no interrogado» o «paciente no puede responder». No es bloquear hasta conocer las alergias; es exigir registro explícito del estado (incluidos valores de «no sé») con **rastro de lo elegido**. | M8 (flujo), M7 (modelo de estado) |
| 4 | **Etiqueta de paciente no identificado:** misma cascada que el triage (tenant; sucursal puede sobreescribir; **prioriza sucursal**). El formato concreto (fonético vs folio u otro) lo define esa configuración; el producto **no** impone uno fijo. | M3 |

### Decisiones ratificadas para Fase 1 (2026-08-28)

Respuestas del usuario sobre identidad / establecimiento (C, D, L) y sexo/género (M). Dejan de ser preguntas
abiertas C, D, L y M en §5.3. Detalle de M: [`14-sexo-genero-dgis.md`](14-sexo-genero-dgis.md).

| # | Decisión | Módulos |
|---|---|---|
| 5 | **Búsqueda por descripción (pregunta C):** la ejecutan **recepción** y **trabajo social** con alcance de **esa sucursal**; **admin/supervisor** con alcance de **toda la organización**. Resultados solo al personal (coincidencias, no fichas al solicitante). | M3 |
| 6 | **Señas al identificarse (pregunta D):** **se conservan** en el expediente; solo las ve personal con **secreto profesional** (o obligación equivalente). | M3 |
| 7 | **Tipo de establecimiento (pregunta L) — ratificada en doc 06 §10 (2026-08-30):** sucursal **Central con urgencias** (`HasEmergencyService=true`); **Norte** y **Sur** solo **ambulatorio** (sin urgencias). Alcance de servicios F1–4 = ambulatorio+urgencias; responsable operativo provisional = `admin`. Sin inventar domicilios ni PHI. | M11 |
| 8 | **Sexo vs género (pregunta M):** **Opción B** — `BiologicalSex` (+ `SexSource`) para clínica y mapeo SEUL 1/2/3; `GenderIdentity` opcional (códigos GIIS `0…6, 88`, NULL = no capturado) solo para trato / GIIS Consulta Externa. **Prohibido** usar género en dosis, rangos, triage o reporte Urgencias. No inventar género por omisión. | M3 (modelo), M5 (uso clínico solo biológico) |

---

## 1. Alcance de Fase 1

### 1.1 Lo que entra (literal del doc 11 §3, Fase 1)

| Id doc 11 | Entrega | Módulo de este plan |
|---|---|---|
| 1.1 | MPI / sujeto + identidad progresiva (doc 08) | M3 |
| 1.2 | Agenda | M9 |
| 1.3 | Triage + signos vitales (sin obligatoriedad que bloquee al crítico) | M5 |
| 1.4 | Urgencias (cola, ingreso, observación) | M4 |
| 1.5 | Consulta + notas (firma local + sello) | M6 |
| 1.6 | Receta (sin estupefacientes hasta resolver pendiente) | M8 |
| 1.7 | Expediente / historia (sin prellenar «negado/normal») | M7 |
| 1.8 | Empuje en vivo sala / urgencias | M10 |
| 1.9 | SC-01…SC-26 en verde en E2E contra API | M12 |

### 1.2 Lo que este plan agrega como **habilitador**, no como alcance nuevo

Tres piezas que el doc 11 no enumera en Fase 1 pero sin las cuales 1.1–1.9 no se pueden construir sin retrabajo. Se
declaran explícitamente para que no parezcan alcance inventado:

| Módulo | Por qué es habilitador | Fundamento |
|---|---|---|
| **M1 — Profesional sanitario y sesión** | Toda nota, receta y clasificación de triage exige autor con cédula verificable. Sin la entidad, M5–M8 fabricarían el actor. | Decisión del usuario del 2026-08-27; doc 09 BM-TRA-07, BM-TRA-08, BM-SEG-03; LGS art. 83 (doc 01 §11.1) |
| **M2 — Tipos base transversales + auditoría de acceso** | Doce tipos base sostienen ocho de los diecinueve hallazgos críticos del doc 09; definirlos después obliga a reabrir cada entidad. | doc 09 §14, primer paso del orden propuesto |
| **M11 — Datos del establecimiento y aprovisionamiento de tenant** | Todo documento clínico imprime tipo, nombre y domicilio del establecimiento. Sin esos campos los documentos de M6–M8 no se pueden emitir completos. | NOM-004 numerales 5.2 a 5.2.4 (doc 01 §2); doc 09 BM-TRA-03 |

### 1.3 Lo que **no** entra en Fase 1

- Caja, cortes, cobro offline, CFDI, PAC, catálogos SAT → **Fase 2** (doc 11 §3).
- Inventario, surtido, farmacia, libro de control, estudios y resultados → **Fase 2**.
- Bandeja de rechazo diferido → **Fase 2**.
- Aviso de privacidad, ARCO, SGSI, motor de retención, módulo BI → **Fase 3**.
- Envío productivo DGIS/SINBA, FHIR, camino a certificación NOM-024 → **Fase 4**. En Fase 1 se
  **generan y encolan** los hechos reportables; no se envía a la autoridad, y el Worker sigue negándose a arrancar con
  destino productivo (`docs/operacion/ambientes.md`).
- Hospitalización, quirófanos, UCI, DICOM, portal del paciente → **Fase 5 / contrato aparte**.
- Estupefacientes y psicotrópicos → **no se implementan**; el sistema debe **impedirlos** (pendiente 68).
- Fotografía del paciente → **no se propone** (decisión abierta 44).
- Roles dinámicos por tenant (pregunta 19), segundo factor (BM-SEG-05), telesalud (pregunta 6): fuera de Fase 1 salvo
  decisión expresa.
- Migración de expedientes prellenados existentes (decisión DA-A / 56): fuera de Fase 1 mientras no haya criterio
  clínico. En Dev no hay expedientes reales que migrar.

### 1.4 Punto de partida verificado (Fase 0 en operación)

Lo que ya existe y **no** se rehace: `dbo.Tenant`, `dbo.Branch`, `dbo.[User]`, `dbo.Role`, `dbo.UserRole`,
`dbo.UserBranch`, `dbo.RefreshToken`, `dbo.Device`, `dbo.IdempotencyRecord`, `dbo.OutboxMessage`, `dbo.FeatureFlag`
(migración `0001_foundation.sql` + `0002_sync_idempotency_hash.sql`); `sp_Auth_*`, `sp_Device_*`, `sp_Sync_*`,
`sp_Outbox_*`; `ApiResponse<T>`, `MediCoreClaims`, `UlidId`; `POST /api/sync/commands` con idempotencia atómica y 409 por
conflicto de huella; cola IndexedDB en `frontend/src/sync/outboxQueue.ts`; login real y sesión restaurada por cookie
`httpOnly`.

Convenciones que Fase 1 hereda sin discusión: SPs `sp_{Entity}_{Action}` con `@TenantId` siempre; `CREATE OR ALTER`;
migraciones nuevas numeradas, nunca editar una aplicada; `DATETIME2(3)` UTC; `IsDeleted` / reverso en lugar de `DELETE`;
`ApiResponse<T>` en toda respuesta; outbox en la **misma transacción** que el hecho de negocio.

---

## 2. Módulos, en orden de dependencia

Numeración de migraciones reservada por módulo para que dos agentes no colisionen en el mismo archivo:

| Módulo | Migración | Carpeta de SPs |
|---|---|---|
| M1 Profesional sanitario | `0003_profesional_sanitario.sql` | `procedures/professional/` |
| M2 Tipos base + auditoría | `0004_tipos_base_auditoria.sql` | `procedures/audit/` |
| M11 Establecimiento | `0005_establecimiento.sql` | `procedures/tenant/` |
| M3 Sujeto e identidad | `0006_sujeto_identidad.sql` (+ `0013_sujeto_identidad_genero.sql` aditivo Opción B) | `procedures/subject/` |
| M4 Episodio y urgencias | `0007_episodio_urgencias.sql` | `procedures/encounter/` |
| M5 Triage y signos vitales | `0008_triage_signos.sql` | `procedures/triage/` |
| M7 Expediente / historia | `0009_expediente.sql` | `procedures/record/` |
| M6 Consulta y notas | `0010_consulta_notas.sql` | `procedures/consult/` |
| M8 Receta | `0011_receta.sql` | `procedures/prescription/` |
| M9 Agenda | `0012_agenda.sql` | `procedures/schedule/` |

> **Dependencia operativa previa a cualquier migración nueva:** `tools/apply-database.ps1` hoy enumera los archivos SQL
> uno por uno y no incluye `0002` (pendiente 74 del doc 06). Mientras no recorra `migrations/*.sql` en orden, cada
> migración de Fase 1 queda fuera de QA y Production. `tools/**` lo trabaja otro agente; este plan solo lo declara como
> bloqueo de despliegue, no de codificación.

---

### M1 — Profesional sanitario y sesión servida por el servidor

**Depende de:** nada. **Habilita:** M5, M6, M7, M8, M9 y el filtro por médico en toda la UI.
**Decisión del usuario (2026-08-27):** el profesional se modela en base de datos (cédula, especialidad, liga
usuario→médico) y la sesión se alimenta desde el servidor. Mientras un usuario no tenga profesional asociado, **el filtro
por médico falla cerrado**.

#### Datos

`dbo.HealthcareProfessional`
| Columna | Tipo | Notas |
|---|---|---|
| `ProfessionalId` | `UNIQUEIDENTIFIER` PK | |
| `TenantId` | `UNIQUEIDENTIFIER` NOT NULL | FK `Tenant`, índice compuesto |
| `UserId` | `UNIQUEIDENTIFIER` NULL | FK `[User]`. Nulo = profesional que aún no tiene cuenta; **no** se inventa la liga |
| `GivenName`, `FirstSurname` | `NVARCHAR(120)` NOT NULL | apellidos separados (BM-PAC-04 aplicado también al profesional) |
| `SecondSurname` | `NVARCHAR(120)` NULL | ausencia legítima, no cadena vacía |
| `ProfessionalLicense` | `NVARCHAR(32)` NULL | cédula profesional. **Nulo permitido en el modelo, no en la emisión**: sin cédula el profesional no puede firmar documentos (regla de negocio, no `NOT NULL`) |
| `LicenseIssuer`, `LicenseVerifiedAtUtc` | `NVARCHAR(200)` / `DATETIME2(3)` NULL | quién y cuándo cotejó; nunca por omisión |
| `IsActive`, `IsDeleted` | `BIT` | baja lógica |
| `CreatedAtUtc`, `UpdatedAtUtc` | `DATETIME2(3)` | UTC |

`dbo.Specialty` (`SpecialtyId`, `TenantId`, `Code`, `Name`, `IsActive`, `IsDeleted`) — catálogo por tenant.

`dbo.ProfessionalSpecialty` (`ProfessionalId`, `SpecialtyId`, `TenantId`, `CertificateNumber` NULL,
`CertificateValidUntil` `DATE` NULL, `IsPrimary` `BIT`) — la **vigencia del certificado es dato del modelo**, no nota
administrativa (LGS art. 83, doc 01 §11.1). Un certificado vencido cambia lo que legalmente puede consignarse.

Índices: `IX_HealthcareProfessional_Tenant_User (TenantId, UserId)`; único **filtrado**
`UQ_HealthcareProfessional_Tenant_License (TenantId, ProfessionalLicense) WHERE ProfessionalLicense IS NOT NULL AND IsDeleted = 0`
— mismo patrón que la CURP del paciente (doc 06 §5).

#### SPs

| SP | Parámetros | Devuelve |
|---|---|---|
| `sp_Professional_Create` | `@ProfessionalId, @TenantId, @UserId NULL, @GivenName, @FirstSurname, @SecondSurname NULL, @ProfessionalLicense NULL, @LicenseIssuer NULL, @ActorUserId` | fila creada |
| `sp_Professional_Update` | ídem sin `@ProfessionalId` nuevo | fila actualizada |
| `sp_Professional_SoftDelete` | `@TenantId, @ProfessionalId, @ActorUserId` | filas afectadas |
| `sp_Professional_GetById` | `@TenantId, @ProfessionalId` | profesional + especialidades |
| `sp_Professional_List` | `@TenantId, @BranchId NULL, @OnlyActive BIT, @Search NVARCHAR(200) NULL` | listado paginado |
| `sp_Professional_GetByUser` | `@TenantId, @UserId` | 0 o 1 fila; **0 filas es respuesta válida** y significa «este usuario no es profesional» |
| `sp_Professional_LinkUser` | `@TenantId, @ProfessionalId, @UserId, @ActorUserId` | fila ligada |
| `sp_Professional_SetSpecialty` | `@TenantId, @ProfessionalId, @SpecialtyId, @CertificateNumber NULL, @CertificateValidUntil NULL, @IsPrimary` | fila |
| `sp_Specialty_List` / `sp_Specialty_Upsert` | `@TenantId` (+ campos) | catálogo |

#### API

| Verbo | Ruta | Entrada | Salida | Códigos |
|---|---|---|---|---|
| `GET` | `/api/professionals` | query `branchId?`, `search?`, `onlyActive?` | `ApiResponse<ProfessionalListDto>` | 200, 401, 403 |
| `GET` | `/api/professionals/{id}` | — | `ApiResponse<ProfessionalDto>` | 200, 404 |
| `POST` | `/api/professionals` | `CreateProfessionalRequest` | `ApiResponse<ProfessionalDto>` | 200, 400, 403, 409 (cédula duplicada) |
| `PUT` | `/api/professionals/{id}` | `UpdateProfessionalRequest` | `ApiResponse<ProfessionalDto>` | 200, 400, 404 |
| `DELETE` | `/api/professionals/{id}` | — | `ApiResponse<object?>` | 200, 404 — **baja lógica**, el verbo HTTP no implica `DELETE` en SQL |
| `GET` | `/api/specialties` | — | `ApiResponse<SpecialtyDto[]>` | 200 |
| `GET` | `/api/auth/session` | — | `ApiResponse<SessionDto>` | 200, 401 |

`SessionDto` amplía lo que hoy devuelve `/api/auth/me`: `userId`, `tenantId`, `tenantCode`, `displayName`, `roles[]`,
`branches[] {id, code, name}`, y **`professional`**: `null` o `{ professionalId, fullName, professionalLicense,
specialties[], canSignDocuments }`. `canSignDocuments` es del servidor, no del cliente: `false` si no hay profesional
ligado o si falta cédula.

#### Offline / outbox

Alta y edición de profesionales son **administrativas**: requieren enlace, no van a la cola offline (no son actos
clínicos y su ausencia no detiene la atención). `GET /api/auth/session` requiere enlace; si no hay red, la estación
conserva la última sesión conocida con antigüedad visible y **sin** `canSignDocuments` elevado. Nada de este módulo va al
outbox en Fase 1 (la CURP del profesional que exige el instructivo SINBA se consume en Fase 4 desde esta tabla).

#### Pantallas

| Prototipo | Destino |
|---|---|
| `docs/frontend/src/pages/administracion/medicos/page.tsx` | `frontend/src/pages/administracion/medicos/page.tsx` |
| `docs/frontend/src/pages/administracion/especialidades/page.tsx` | `frontend/src/pages/administracion/especialidades/page.tsx` |
| `docs/frontend/src/pages/normatividad/profesionales/page.tsx` | `frontend/src/pages/normatividad/profesionales/page.tsx` |

Nuevo en `frontend/src/api/professionals.ts`. `frontend/src/hooks/AuthProvider.tsx` deja de derivar el usuario de
`@/mocks/users` y consume `SessionDto`.

#### Salvaguardas

- **Falla cerrado:** si `professional` es `null`, el filtro «mis pacientes / mi agenda» **no devuelve todo**: devuelve
  vacío con mensaje explícito. Un filtro por médico que ante ausencia de médico muestra el padrón completo es una fuga.
- Cédula, especialidad y vigencia **nunca** se rellenan por omisión ni se copian de otro profesional.
- La atribución de autoría se toma del token, jamás de un campo del cuerpo (SC-12).

#### Pruebas

- Unitarias (`backend/Tests/MediCore.Business.Tests/Professional/`): `canSignDocuments` falso sin cédula y sin liga;
  certificado vencido no habilita consignar especialidad.
- Integración de SP: `@TenantId` filtra; `sp_Professional_GetByUser` devuelve 0 filas sin inventar; `SoftDelete` no borra
  físicamente.
- Contrato de API: `/api/auth/session` con y sin profesional ligado; 409 por cédula duplicada dentro del tenant y **no**
  entre tenants distintos.
- E2E: **SC-12** (no se atribuye una nota a un profesional distinto del autenticado) queda accionable aquí; se retira su
  `skip` cuando exista la primera nota firmable (M6).

---

### M2 — Tipos base transversales y auditoría de acceso

**Depende de:** nada. **Habilita:** todo lo clínico. Es el «primero» del orden del doc 09 §14.

No es un módulo de pantallas: es el vocabulario compartido. Se define **una vez** en backend y frontend.

#### Backend (`backend/Models/Clinical/CommonTypes.cs`, `backend/Common/`)

| Tipo | Forma | Motivo (doc 09) |
|---|---|---|
| `Autoria` | `{ UserId, ProfessionalId?, DisplayName, ProfessionalLicense?, OccurredAtUtc, RecordedAtUtc }` | BM-TRA-04, BM-TRA-07 |
| `Firma` | `{ Algoritmo, ContentHash, FirmadoAtUtc, SelloAtUtc?, SelloEstado }` con `SelloEstado ∈ { pendiente, sellado }` | BM-TRA-05 |
| `Medicion<TUnidad>` | `{ Valor?, Unidad, Estado, Origen, RazonNoMedido? }` con `Estado ∈ { medido, no_medido, no_valorable }` y `Origen ∈ { medido, estimado, declarado }` | BM-TRA-09, BM-URG-11, BM-URG-04 |
| `EstadoInterrogatorio<T>` | `{ Estado, Valor? }` con `Estado ∈ { no_interrogado, se_desconoce, no_aplica, conocido }` | BM-PAC-01, BM-PAC-15, BM-CON-07 |
| `EdadEstimada` | `{ Valor, Unidad ∈ { años, meses, días }, RangoMin?, RangoMax?, Origen ∈ { calculada, estimada, declarada } }` | doc 08 §5.2, BM-PAC-02 |
| `Dinero` | `decimal(18,4)` + moneda | BM-CAJ-05 (se define ya, se usa en Fase 2) |

Reglas duras de estos tipos: **no hay constructor por omisión que produzca un valor clínico**. `Medicion` sin valor exige
`Estado` explícito. Prohibido `?? 0` y `parseFloat(x) || 0` sobre magnitudes clínicas.

#### Datos

`dbo.AuditEvent` (append-only): `AuditEventId`, `TenantId`, `ActorUserId`, `ActorProfessionalId` NULL, `BranchId` NULL,
`EventType`, `EntityName`, `EntityId`, `SubjectId` NULL, `DetailJson` NULL, `OccurredAtUtc`, `RecordedAtUtc`,
`DeviceId` NULL, `IpAddress` NULL. Índices por `(TenantId, SubjectId, RecordedAtUtc)` y `(TenantId, ActorUserId,
RecordedAtUtc)`. Sin `UPDATE` ni `DELETE`: solo `INSERT` (BM-SEG-01, BM-SEG-02).

#### SPs

| SP | Parámetros | Devuelve |
|---|---|---|
| `sp_Audit_Append` | `@AuditEventId, @TenantId, @ActorUserId, @ActorProfessionalId NULL, @BranchId NULL, @EventType, @EntityName, @EntityId, @SubjectId NULL, @DetailJson NULL, @OccurredAtUtc, @DeviceId NULL, @IpAddress NULL` | nada (o `1`) |
| `sp_Audit_ListBySubject` | `@TenantId, @SubjectId, @FromUtc NULL, @ToUtc NULL` | eventos |
| `sp_Audit_ListByActor` | `@TenantId, @ActorUserId, @FromUtc, @ToUtc` | eventos |

`sp_Audit_Append` se invoca **dentro de la transacción** del hecho auditado, igual que el outbox.

#### API

| Verbo | Ruta | Salida | Códigos |
|---|---|---|---|
| `GET` | `/api/audit/subject/{subjectId}` | `ApiResponse<AuditEventDto[]>` | 200, 403 (rol sin permiso), 404 |
| `GET` | `/api/audit/actor/{userId}` | `ApiResponse<AuditEventDto[]>` | 200, 403 |

Toda **lectura de expediente** registra un evento `record.read` (NOM-004 numerales 5.5.1 y 5.7, doc 01 §2). Consulta de
auditoría requiere enlace; nunca se cachea offline.

#### Pantallas

`docs/frontend/src/pages/seguridad/auditoria/page.tsx` → `frontend/src/pages/seguridad/auditoria/page.tsx`, consumiendo
datos reales. Tipos base al frontend en `frontend/src/types/clinical.ts` (espejo exacto de los del backend).

#### Pruebas

- Unitarias: `Medicion` rechaza valor sin unidad; `EstadoInterrogatorio` no colapsa `no_interrogado` con lista vacía;
  serialización estable del hash de contenido para `Firma`.
- Integración: `sp_Audit_Append` no admite `UPDATE`; el evento sobrevive al rollback del hecho **solo si** el hecho se
  confirmó (misma transacción).
- Contrato: 403 para rol sin permiso de auditoría.
- E2E: base para **SC-06** (documento firmado inmutable) y para la evidencia de **SC-23**.

---

### M11 — Datos del establecimiento y aprovisionamiento de tenant

**Depende de:** nada. **Habilita:** la emisión de cualquier documento de M5–M8.
**Decisión del usuario (2026-08-27):** el tenant vive en tabla y las sucursales se relacionan con su tenant (ya es así
desde la fundación); el aprovisionamiento se hace por **script manual**, y el frontend toma el código de tenant de
configuración mientras haya un solo cliente.

#### Datos

Ampliación **aditiva** de `dbo.Branch` (columnas nuevas, ninguna existente se altera ni se elimina):
`FacilityType` (`NVARCHAR(64)` NULL — consultorio general, consulta especializada, urgencias…), `LegalName`,
`AddressStreet`, `AddressNumber`, `AddressNeighborhood`, `AddressMunicipality`, `AddressState`, `AddressPostalCode`,
`PhoneNumber`, `HealthLicense` (licencia sanitaria), `ResponsiblePhysicianProfessionalId` NULL, `TimeZoneId`,
`HasEmergencyService` `BIT NULL`. **Ratificado 2026-08-28 (demo sintético):** Central con urgencias; Norte/Sur
ambulatorio sin urgencias. Domicilios siguen sin inventarse.

Ampliación aditiva de `dbo.Tenant`: `LegalName`, `Rfc` NULL (se usará en Fase 2), `PrimaryColorToken` NULL (white-label).

Nada se rellena por omisión: un domicilio inventado se imprimiría en documentos clínicos.

#### SPs

`sp_Tenant_GetByCode (@Code)`, `sp_Tenant_UpdateProfile (@TenantId, …, @ActorUserId)`,
`sp_Branch_Upsert (@TenantId, @BranchId, …, @ActorUserId)`, `sp_Branch_List (@TenantId, @OnlyActive)`,
`sp_Branch_GetById (@TenantId, @BranchId)`.

Aprovisionamiento manual: `backend/database/seeds/003_provision_tenant.sql` **parametrizado por variables `sqlcmd`**,
idempotente (`IF NOT EXISTS`), sin `DELETE`. Es un script de operación, no un endpoint: no hay API de creación de tenants
en Fase 1.

#### API

| Verbo | Ruta | Salida | Códigos |
|---|---|---|---|
| `GET` | `/api/branches` | `ApiResponse<BranchDto[]>` | 200, 401 |
| `GET` | `/api/branches/{id}` | `ApiResponse<BranchDto>` | 200, 404 |
| `PUT` | `/api/branches/{id}` | `ApiResponse<BranchDto>` | 200, 400, 403, 404 |
| `GET` | `/api/tenant/profile` | `ApiResponse<TenantProfileDto>` | 200, 401 |

Lecturas con enlace; se cachean con antigüedad visible porque los documentos offline las necesitan (SC-09). Sin outbox.

#### Pantallas

`docs/frontend/src/pages/administracion/sucursales/page.tsx` → `frontend/src/pages/administracion/sucursales/page.tsx`.

#### Pruebas

- Integración: `sp_Branch_Upsert` respeta `UQ_Branch_Tenant_Code`; no cruza tenants.
- Contrato: `PUT` de sucursal ajena al tenant del token responde 404 (no 403: no se confirma la existencia).
- E2E: aislamiento multi-tenant (`specs/08-multi-tenant/aislamiento.spec.ts`) se extiende a sucursales.

---

### M3 — Sujeto de atención e identidad progresiva

**Depende de:** M2 (tipos base), M11 (establecimiento para etiqueta por sucursal). **Habilita:** M4 y todo lo clínico.
Implementa doc 08 §1–§7. Es el módulo con más carga normativa. **Búsqueda por descripción** y **conservación de señas**
quedaron **ratificadas** el 2026-08-28 (ver bloque al inicio). La **convención de la etiqueta temporal** quedó
**ratificada** el 2026-08-27 (configurable tenant/sucursal con cascada). **Sexo vs género (pregunta M)** quedó
**ratificada Opción B** el 2026-08-28 ([`14-sexo-genero-dgis.md`](14-sexo-genero-dgis.md)): `GenderIdentity`
opcional; clínica y SEUL solo con `BiologicalSex`.

#### Datos

`dbo.Subject` — la persona tal como la conoce esta organización. **Todos los atributos de identidad son opcionales.**
`SubjectId`, `TenantId`, `RecordNumber` (folio de expediente con ámbito tenant+sucursal, no por conteo — BM-PAC-12),
`IdentificationState` (`no_identificado | declarada_sin_documento | verificada_con_documento | rectificada |
no_recuperable`), `GivenName` NULL, `FirstSurname` NULL, `SecondSurname` NULL, `PreferredName` NULL,
`BirthDate` `DATE` **NULL**, `EstimatedAgeJson` NULL (`EdadEstimada`), `BiologicalSex`
(`masculino | femenino | no_determinado | no_especificado`, **sin valor por omisión**), `SexSource`
(`documento | observado | declarado`) NULL, `GenderIdentity` NVARCHAR(8) NULL (códigos GIIS `0|1|2|3|4|5|6|88`;
**NULL = no capturado**; no DEFAULT; no usar en dosis/rangos/triage/SEUL), `Curp` NULL, `CurpValidatedAtUtc` NULL,
`BloodType` NULL (`EstadoInterrogatorio`), `DeceasedAtUtc` NULL, `IsDeleted`, `CreatedAtUtc`, `UpdatedAtUtc`.
Columna de género: migración aditiva `0013_sujeto_identidad_genero.sql` (no editar `0006` ya aplicada).

Índice único **filtrado** `UQ_Subject_Tenant_Curp (TenantId, Curp) WHERE Curp IS NOT NULL AND IsDeleted = 0` (doc 06 §5).
**Prohibido autogenerar CURP** (NOM-024 numeral 6.5.1, doc 01 §3).

`dbo.SubjectIdentityEvent` (append-only): `EventId`, `TenantId`, `SubjectId`, `FromState`, `ToState`, `EvidenceType` NULL,
`EvidenceReference` NULL, `Justification` NULL, `ActorUserId`, `ActorProfessionalId` NULL, `OccurredAtUtc`,
`RecordedAtUtc`. `Subject.IdentificationState` es la **proyección** de estos eventos, no un campo que se sobrescribe a
ciegas.

`dbo.UnidentifiedLabelConfig` — configuración del **formato** de etiqueta de paciente no identificado, a **dos niveles**:
filas por `TenantId` (ámbito tenant) y, opcionalmente, por `(TenantId, BranchId)` (ámbito sucursal). Cascada
**ratificada 2026-08-27:** si existe configuración de sucursal, **tiene prioridad**; si no, se usa la del tenant. El
producto **no** hardcodea fonético ni folio: el responsable sanitario elige el esquema vía esta configuración
(`SchemeCode` u equivalente: p. ej. fonético, folio secuencial, u otro que el tenant declare). Persistencia de la
configuración efectiva usada al emitir (snapshot o `ConfigId`) para que la etiqueta quede reconstruible.

`dbo.SubjectTemporaryLabel`: `LabelId`, `TenantId`, `SubjectId`, `BranchId`, `InternalCode`, `OperationalLabel`,
`ConfigSnapshotJson` NULL (esquema/resolución de cascada al emitir), `IssuedAtUtc`, `DeviceId` NULL, `IsActive`.
Único `(TenantId, BranchId, InternalCode)` según reglas del esquema activo. **Ningún token de etiqueta puede ser un
color** (colisiona con la semántica de triage), cualquiera que sea el esquema.

`dbo.SubjectDescriptor`: sexo aparente, rango de edad aparente, hora de llegada, `FreeText` (camino rápido de captura).

`dbo.SubjectDistinctiveMark`: `MarkId`, `TenantId`, `SubjectId`, `RawText` NULL, `MarkType` NULL, `AnatomicalRegion` NULL,
`Laterality` NULL (`izquierda | derecha | bilateral | linea_media | no_aplica`), `Description` NULL, `StructuredAtUtc`
NULL, `Autoria`. La lateralidad es **campo propio**, no texto embebido (doc 08 §4.2).

`dbo.SubjectBelonging` — pertenencias (vestimenta, objetos), **colección distinta** de las señas: cambian y no son
características de la persona.

`dbo.SubjectLink` (append-only): `LinkId`, `TenantId`, `AbsorbedSubjectId`, `SurvivingSubjectId`, `LinkType`
(`vinculacion | vinculacion_revertida`), `Justification`, `ActorUserId`, `OccurredAtUtc`, `RecordedAtUtc`. **Nunca hay
fusión automática** y **nunca** se reasigna `SubjectId` en documentos clínicos: las consultas resuelven identidad a través
de la cadena de vínculos (doc 08 §6.1; NOM-004 numeral 5.11).

`dbo.SubjectMergeQueue` — cola de fusión con revisión humana obligatoria (candidatos por coincidencia probabilística
nombre + fecha de nacimiento + sexo; **sugerencia**, jamás ejecución).

`dbo.SubjectConsentLapse` — momento en que **cesa** la base de licitud del artículo 9 fracción VI de la LFPDPPP vigente
(el titular recupera capacidad o aparece representante) y queda accionado el flujo de consentimiento (doc 01 §4).

#### SPs

| SP | Parámetros clave | Devuelve |
|---|---|---|
| `sp_Subject_Create` | `@SubjectId, @TenantId, @BranchId, @IdentificationState, @GivenName NULL, …, @ActorUserId, @OccurredAtUtc` | sujeto + etiqueta si aplica |
| `sp_UnidentifiedLabelConfig_GetEffective` | `@TenantId, @BranchId` | config resuelta (cascada sucursal → tenant) |
| `sp_UnidentifiedLabelConfig_Upsert` | `@TenantId, @BranchId NULL, esquema/parámetros, @ActorUserId` | config tenant o sucursal |
| `sp_Subject_IssueTemporaryLabel` | `@LabelId, @TenantId, @SubjectId, @BranchId, @InternalCode, @OperationalLabel, @ConfigSnapshotJson NULL, @DeviceId NULL` | etiqueta |
| `sp_Subject_UpdateIdentity` | `@TenantId, @SubjectId, campos, @ActorUserId, @OccurredAtUtc` | sujeto |
| `sp_Subject_TransitionIdentityState` | `@EventId, @TenantId, @SubjectId, @ToState, @EvidenceType NULL, @EvidenceReference NULL, @Justification NULL, @ActorUserId, @OccurredAtUtc` | evento + estado proyectado |
| `sp_Subject_AddDistinctiveMark` / `sp_Subject_StructureDistinctiveMark` | `@TenantId, @SubjectId, …` | seña |
| `sp_Subject_AddBelonging` | `@TenantId, @SubjectId, …` | pertenencia |
| `sp_Subject_SearchByDescription` | `@TenantId, @BranchId NULL, @ApparentSex NULL, @AgeMin NULL, @AgeMax NULL, @MarkType NULL, @AnatomicalRegion NULL, @Laterality NULL, @ArrivalFromUtc NULL, @ArrivalToUtc NULL, @ActorUserId` | **coincidencias para el personal**, no fichas |
| `sp_Subject_Search` | `@TenantId, @Query, @IncludeUnidentified BIT` | padrón |
| `sp_Subject_GetById` | `@TenantId, @SubjectId` | sujeto resuelto por cadena de vínculos |
| `sp_Subject_EnqueueMergeCandidate` | `@TenantId, @SubjectIdA, @SubjectIdB, @Score, @ActorUserId` | caso en cola |
| `sp_Subject_Link` / `sp_Subject_RevertLink` | `@LinkId, @TenantId, @AbsorbedSubjectId, @SurvivingSubjectId, @Justification, @ActorUserId` | evento |
| `sp_Subject_RegisterConsentLapse` | `@TenantId, @SubjectId, @LapseReason, @OccurredAtUtc, @ActorUserId` | registro |
| `sp_Subject_SoftDelete` | `@TenantId, @SubjectId, @ActorUserId` | filas |

Todos registran auditoría con `sp_Audit_Append` en la misma transacción. `sp_Subject_SearchByDescription` audita también
las búsquedas **sin resultado** (doc 08 §7).

#### API

| Verbo | Ruta | Entrada / Salida | Códigos |
|---|---|---|---|
| `POST` | `/api/subjects` | `CreateSubjectRequest` (todo opcional salvo `branchId`) → `ApiResponse<SubjectDto>` | 200, 400, 409 (CURP duplicada) |
| `GET` | `/api/subjects` | `search`, `includeUnidentified` → `ApiResponse<SubjectListDto>` | 200, 403 |
| `GET` | `/api/subjects/{id}` | `ApiResponse<SubjectDto>` | 200, 404 |
| `PUT` | `/api/subjects/{id}/identity` | `UpdateIdentityRequest` | 200, 400, 404 |
| `POST` | `/api/subjects/{id}/identity-state` | `TransitionIdentityStateRequest` | 200, 400, 403 (rol sin permiso de verificación/rectificación), 409 (transición inválida) |
| `POST` | `/api/subjects/{id}/marks` · `PUT /api/subjects/{id}/marks/{markId}` | señas | 200, 400, 404 |
| `POST` | `/api/subjects/{id}/belongings` | pertenencias | 200, 400 |
| `POST` | `/api/subjects/search-by-description` | criterios → `ApiResponse<DescriptionMatchDto[]>` con `{ matchCount, matches[] { subjectId, operationalLabel, arrivalAtUtc } }` **sin datos de identidad** | 200, 403 |
| `GET` | `/api/subjects/merge-queue` · `POST /api/subjects/merge-queue/{caseId}/resolve` | cola de fusión | 200, 403, 409 |
| `POST` | `/api/subjects/{id}/links` · `POST /api/subjects/{id}/links/{linkId}/revert` | vinculación / reversión | 200, 400, 403 |

Es un `POST` y no un `GET` para la búsqueda por descripción porque los criterios son datos sensibles y no deben quedar en
la barra de direcciones ni en logs de proxy.

#### Offline e idempotencia

| Operación | Camino |
|---|---|
| Crear sujeto (incluye no identificado) | **Cola offline** — `commandType: subject.create`, `IdempotencyKey` al capturar |
| Emitir etiqueta temporal | **Local, sin Core**, según la configuración efectiva (cascada sucursal → tenant) cacheada en la estación con antigüedad visible. El generador aplica el esquema configurado; no se inventa un formato fijo en código. Colisión imposible por construcción dentro del ámbito `(TenantId, BranchId)` |
| Capturar señas, descriptor, pertenencias | **Cola offline** (append-only) |
| Transición de estado de identidad | **Cola offline** (append-only) |
| Vinculación / fusión | **Cola**, revisión humana en el Core; puede quedar pendiente hasta que vuelva el enlace, y eso es aceptable |
| Búsqueda por descripción | **Requiere enlace** para alcance de sucursal/organización; offline solo alcanza lo del propio dispositivo, y la UI debe decirlo |
| Padrón / detalle | **Requiere enlace**; caché mínima con antigüedad visible (SC-09) |

Outbox: nada en Fase 1. El sujeto no identificado es reportable a SINBA con centinelas oficiales, pero el **envío** es
Fase 4 y los centinelas viven en la capa de reporte, **nunca** en `Subject` (`09/09/9999` y `999` almacenados corromperían
la aritmética de edad y con ella dosis y rangos de signos vitales).

#### Pantallas

| Prototipo | Destino |
|---|---|
| `docs/frontend/src/pages/pacientes/page.tsx` | `frontend/src/pages/pacientes/page.tsx` |
| `docs/frontend/src/pages/pacientes/nuevo/page.tsx` | `frontend/src/pages/pacientes/nuevo/page.tsx` |
| `docs/frontend/src/pages/pacientes/detalle/page.tsx` (+ `components/ExpedienteUnificado.tsx`) | `frontend/src/pages/pacientes/detalle/**` |

Nuevo: `frontend/src/api/subjects.ts`; cabecera de identidad reutilizable (etiqueta + descriptor) visible durante toda la
atención (SC-05).

#### Salvaguardas clínicas

- **Nada bloquea la creación del sujeto**: ni nombre, ni CURP, ni sexo, ni fecha de nacimiento, ni pago, ni
  consentimiento. El único dato requerido es la sucursal de contacto.
- `BiologicalSex` **no tiene valor por omisión** (SC-15). `no_determinado` («no se pudo determinar ahora») y
  `no_especificado` («el documento no lo dice») son estados distintos y ambos válidos.
- Edad desconocida **no obliga a inventar un número** (SC-16): `EstimatedAgeJson` con unidad y rango, marcado como
  estimado en toda pantalla donde influya en una decisión clínica.
- La etiqueta operativa nunca se muestra sola: siempre con descriptor (SC-17).
- **Fusión automática prohibida** (SC-18). Rectificación: rol supervisor, justificación obligatoria, estado `rectificada`
  y **alerta de seguridad del paciente**, no solo entrada de auditoría (SC-22).
- La búsqueda por descripción **devuelve coincidencias al personal, no identidades al solicitante** (SC-23); confirmar a
  un desconocido que «hay un hombre con un tatuaje en la mano izquierda» ya es divulgación.
- Señas particulares: acceso restringido a roles sujetos a secreto profesional; finalidad declarada **identificar**, no
  describir.
- **Fotografía: no se implementa.**

#### Normativa aplicable (verificada)

| Requisito | Fuente y fecha |
|---|---|
| No se exige identidad para registrar la atención; el contenido mínimo de la nota inicial de urgencias es clínico | NOM-004-SSA3-2012 numerales 6.1.1 y 7.1 — verificado 2026-08-22 (doc 01 §2) |
| Nombre, edad y sexo deben estar **poblados** en toda nota médica | NOM-004 numeral 5.9 — verificado 2026-08-22 |
| Valores oficiales de desconocimiento (`Desconocido`, `09/09/9999`, `999`) solo en reporte | Instructivo Hoja Diaria del Servicio de Urgencias SINBA-SEUL-16-P, DGIS, v. 2024 — verificado 2026-08-22 (doc 01 §3) |
| Prohibido autogenerar CURP | NOM-024-SSA3-2012 numeral 6.5.1 — verificado (doc 01 §3) |
| Base de licitud sin consentimiento, temporal y con secreto profesional | LFPDPPP vigente (DOF 20-03-2025, última reforma 14-11-2025) artículos 8 y 9 fracciones V y VI — verificado 2026-08-22 (doc 01 §4) |
| Inmutabilidad: sin enmendaduras ni tachaduras | NOM-004 numeral 5.11 — verificado |

**No verificado, y por tanto no se afirma:** qué se captura en la **CURP** de un paciente que nunca se identifica (hueco
normativo real, decisión abierta 53); qué se **emite** como sexo cuando no es determinable (54); base de licitud para
fotografía (44). Ninguno de los tres bloquea el módulo clínico: bloquean el reporte de Fase 4 y una funcionalidad que no
se propone.

#### Pruebas

- Unitarias: validación estructural de CURP con dígito verificador (sin RENAPO); generador de etiqueta según config
  (cascada sucursal sobre tenant; no repite dentro del ámbito; no emite colores); máquina de transiciones de
  `IdentificationState`; resolución de identidad a través de la cadena de vínculos, incluida una reversión.
- Integración: `@TenantId` en todos los SPs; único filtrado de CURP; `SubjectIdentityEvent` y `SubjectLink` append-only;
  `SoftDelete` sin borrado físico.
- Contrato: `POST /api/subjects` con cuerpo **vacío salvo `branchId`** responde 200; `search-by-description` no devuelve
  nombres.
- E2E, retirando `skip` en `tests/e2e/specs/02-pacientes/no-identificado.spec.ts` y en el mapa:
  **SC-13** (paciente inconsciente sin identidad, con Core caído), **SC-15**, **SC-16**, **SC-17**, **SC-18**, **SC-21**,
  **SC-22**, **SC-23**; **SC-05** al conectar la cabecera de identidad.

---

### M4 — Episodio de atención, ingreso y cola de urgencias

**Depende de:** M3. **Habilita:** M5, M6, M7, M8, M10.

#### Datos

`dbo.Encounter`: `EncounterId`, `TenantId`, `BranchId`, `SubjectId` **NOT NULL** (el sujeto siempre existe, así que no
hay FK nulas en el modelo clínico), `EncounterType` (`urgencias | consulta_externa`), `State`
(`abierto | en_observacion | cerrado`), `Disposition` NULL (`alta_domicilio | traslado | alta_voluntaria |
defuncion | fuga | referencia`), `ArrivalAtUtc`, `AccessRoute` NULL (`viaAcceso` — catálogo **abierto** con texto libre,
BM-URG-08), `AdmissionCircumstance` NULL (hecho de tránsito, caída, agresión, intoxicación, quemadura, hallado en vía
pública, causa médica no traumática, otro; catálogo abierto), `AdmissionCircumstanceText` NULL,
`MinisterioPublicoNotified` `BIT NULL` (**tres estados: sí / no / no valorado**; nunca `false` por omisión),
`AttendingProfessionalId` NULL, `ClosedAtUtc` NULL, `IsDeleted`, `Autoria`.

`dbo.EncounterStateEvent` (append-only): transiciones con actor, justificación y doble marca de tiempo.

`dbo.MinisterioPublicoNotice`: los siete campos del numeral 10.3 de la NOM-004 (establecimiento notificador, fecha de
elaboración, identificación del paciente **que acepta identidad provisional**, acto notificado, reporte de lesiones,
agencia del MP, nombre y firma del médico), generable **fuera de línea**, append-only.

`dbo.EncounterCareWithoutConsent` — constancia del artículo 51 Bis 2 de la LGS / artículo 81 del Reglamento:
valoración, razonamientos del estado de urgencia, ausencia de familiar o representante, y **co-autoría verificada de al
menos dos profesionales** (no un campo de texto con dos nombres). Se soporta el requisito más exigente para no quedar
corto; el dictamen de si aplica a establecimiento ambulatorio es del área legal (decisión abierta 46).

#### SPs

`sp_Encounter_Open (@EncounterId, @TenantId, @BranchId, @SubjectId, @EncounterType, @ArrivalAtUtc, @AccessRoute NULL, @AdmissionCircumstance NULL, @ActorUserId, @OccurredAtUtc)`;
`sp_Encounter_UpdateAdmissionData`; `sp_Encounter_TransitionState (@…, @ToState, @Disposition NULL, @Justification NULL, …)`;
`sp_Encounter_AssignProfessional`; `sp_Encounter_GetById`;
`sp_Encounter_ListQueue (@TenantId, @BranchId, @IncludeClosed BIT)` — **orden: nivel de triage, luego estado, luego hora
de llegada**, con «sin clasificar» arriba; `sp_Encounter_ListBySubject`;
`sp_MinisterioPublicoNotice_Create`; `sp_EncounterCareWithoutConsent_Create` (exige dos `ProfessionalId` distintos).

#### API

| Verbo | Ruta | Salida | Códigos |
|---|---|---|---|
| `POST` | `/api/encounters` | `ApiResponse<EncounterDto>` | 200, 400, 404 (sujeto inexistente) |
| `GET` | `/api/encounters/{id}` | `ApiResponse<EncounterDto>` | 200, 404 |
| `PUT` | `/api/encounters/{id}/admission` | `ApiResponse<EncounterDto>` | 200, 400, 404 |
| `POST` | `/api/encounters/{id}/state` | `ApiResponse<EncounterDto>` | 200, 400, 409 (cierre sin triage), 422 (cierre forzado sin motivo) |
| `GET` | `/api/encounters/queue?branchId=` | `ApiResponse<EncounterQueueDto>` | 200, 403 |
| `POST` | `/api/encounters/{id}/mp-notice` | `ApiResponse<MpNoticeDto>` | 200, 400 |
| `POST` | `/api/encounters/{id}/care-without-consent` | `ApiResponse<…>` | 200, 400, 409 (menos de dos profesionales) |

#### Offline

Apertura de episodio, datos de ingreso, transiciones, hoja al MP y constancia sin consentimiento: **todo por cola offline
con idempotencia** (`encounter.open`, `encounter.admission`, `encounter.state`, `encounter.mpNotice`,
`encounter.careWithoutConsent`). La cola de urgencias **se lee del servidor** con enlace y de la caché con antigüedad
visible sin enlace; el orden se calcula igual en ambos casos (SC-07). Outbox: nada en Fase 1 (la Hoja Diaria de Urgencias
y el subsistema de Lesiones se envían en Fase 4; el campo estructurado «se dio aviso al MP» ya existe para ese momento).

#### Pantallas

`docs/frontend/src/pages/urgencias/page.tsx` (+ `components/NuevoIngresoModal.tsx`, `AtencionUrgenciaPanel.tsx`) →
`frontend/src/pages/urgencias/**`. `docs/frontend/src/pages/sala-espera/page.tsx` y
`docs/frontend/src/pages/monitor-turnos/page.tsx` → destinos equivalentes en `frontend/src/pages/**` (el monitor con
enmascaramiento: por omisión solo número de turno, confirmación 21 pendiente).
Nuevo: `frontend/src/api/encounters.ts`.

#### Salvaguardas

- **Nada bloquea el ingreso.** Ni identidad, ni CURP, ni pago, ni consentimiento, ni catálogo faltante (SC-19, SC-20).
  Un fallo de red, de Core, de validación diferida o de sincronización no puede producir un bloqueo en la ruta de
  ingreso.
- Bloquear el **cierre** sin clasificación de triage es legítimo; bloquear el **inicio** no lo es (SC-03).
- `MinisterioPublicoNotified` empieza en **no valorado**. El sistema **sugiere** la notificación según la circunstancia,
  **nunca la determina** y **nunca bloquea**: el disparador es la presunción de vinculación con un hecho ilícito, que es
  juicio humano.
- La hoja al MP se genera **fuera de línea** y acepta identidad provisional (SC-24).
- `Disposition` contempla defunción, alta voluntaria, fuga y traslado (BM-URG-06, BM-URG-07): no se fuerza «alta a
  domicilio» por omisión.

#### Normativa aplicable (verificada)

| Requisito | Fuente y fecha |
|---|---|
| Atención inmediata en urgencias; prohibido retener para garantizar el pago | Reglamento de la LGS en materia de Prestación de Servicios de Atención Médica arts. 71–73 y 85 (texto vigente, última reforma DOF 17-07-2018) — doc 01 §2 |
| Negativa de asistencia en notoria urgencia = delito | LGS art. 469 (texto vigente, últimas reformas DOF 15-01-2026) — doc 01 §2 |
| Actuar sin autorización dejando constancia en el expediente | LGS art. 51 Bis 2 — verificado 2026-08-22 |
| Requisito reforzado de dos médicos autorizados | Reglamento art. 81 párrafo 2 — verificado 2026-08-22 |
| Obligación de notificar al MP: lesiones **presumiblemente** vinculadas a hechos ilícitos, a cargo del responsable del establecimiento | Reglamento art. 19 fracción V — verificado 2026-08-22 |
| Contenido de la hoja de notificación al MP (siete campos) | NOM-004 numeral 10.3 — verificado 2026-08-22 |
| Recepción en urgencias: **un médico** valora y establece prioridades | NOM-027-SSA3-2013 numeral 5.4 (DOF 04-09-2013) — verificado 2026-08-22 |

**Se declara con precisión, sin suavizarlo:** **no existe** en la LGS ni en el Reglamento una prohibición expresa de
condicionar la atención de urgencia a la identificación del paciente. El respaldo del criterio de continuidad es
indirecto (arts. 51 Bis 2 y 469 de la LGS, 71–73 del Reglamento). No se afirma lo contrario en código, UI ni documentos.
Tampoco se afirma fundamento **penal** del aviso al MP: no se revisó (doc 01 §8).

#### Pruebas

- Unitarias: orden de la cola (nivel → estado → llegada, «sin clasificar» primero); máquina de estados del episodio;
  `care-without-consent` rechaza el mismo profesional dos veces.
- Integración: episodio abierto solo con `SubjectId` y sucursal; append-only de `EncounterStateEvent`.
- Contrato: `POST /api/encounters` sin dato administrativo alguno responde 200; cierre sin triage responde 409.
- E2E: **SC-03**, **SC-07**, **SC-19**, **SC-20**, **SC-24**; `specs/03-triage-urgencias/dos-estaciones-offline.spec.ts`
  con dos contextos (la decisión de logout de sesión única ya permite escribir esta prueba tal como está descrita).

---

### M5 — Triage y signos vitales

**Depende de:** M4. **Decisiones ratificadas (2026-08-27):** escala configurable por tenant/sucursal con cascada
(sucursal gana); ningún signo vital obligatorio para guardar. El módulo **no** está bloqueado por esas preguntas.

#### Datos

`dbo.TriageScaleConfig` — definición de la **escala de triage** a dos niveles: por `TenantId` y, opcionalmente, por
`(TenantId, BranchId)`. Cascada **ratificada 2026-08-27:** si existe la de sucursal, **tiene prioridad**; si no, la del
tenant. El contenido de la escala (niveles, códigos, etiquetas, orden de prioridad) lo define el **responsable
sanitario**; el producto **no** impone Manchester, cuatro colores ni ninguna escala fija. `ScaleCode` en la valoración
apunta a la escala efectiva usada (con snapshot o `ConfigId` para reproducibilidad).

`dbo.TriageAssessment`: `TriageId`, `TenantId`, `EncounterId`, `Level` **NULL** (nulo = `sin_clasificar`, estado
explícito; el dominio de valores no nulos lo da la escala configurada, no un enum hardcodeado del producto),
`ScaleCode` / referencia a config efectiva (sin escala declarada no hay nivel interpretable),
`ChiefComplaint` NULL, `PainScore` NULL + `PainAssessable` (`no_valorable` posible, BM-URG-03), `ClassifiedByProfessionalId`
NULL, `Autoria`, `IsDeleted`.

`dbo.VitalSignSet` + `dbo.VitalSignMeasurement`: una fila por signo con `Medicion<TUnidad>` completo —
`SignCode` (`temperatura | tension_sistolica | tension_diastolica | frecuencia_cardiaca | frecuencia_respiratoria |
saturacion | glucosa | peso | talla | …`), `Value` NULL, `Unit`, `State` (`medido | no_medido | no_valorable` — «no
tomado» se modela como `no_medido` con razón explícita cuando aplique),
`Source` (`medido | estimado | declarado`), `NotMeasuredReason` NULL. **La unidad es obligatoria cuando hay valor**; el
valor es opcional siempre. **Ningún signo es obligatorio** para persistir el triage (ratificado 2026-08-27).

`dbo.TriageEvent` (append-only) para reclasificaciones: el triage no se sobrescribe.

#### SPs

`sp_TriageScaleConfig_GetEffective (@TenantId, @BranchId)` — resuelve cascada sucursal → tenant;
`sp_TriageScaleConfig_Upsert` (ámbitos tenant y sucursal, con actor);
`sp_Triage_Save (@TriageId, @TenantId, @EncounterId, @Level NULL, @ScaleCode, @ChiefComplaint NULL, @PainScore NULL, @PainAssessable, @VitalsJson, @ActorUserId, @ActorProfessionalId, @OccurredAtUtc)` —
inserta triage + set de signos + evento + auditoría en una transacción; **no exige** presencia de signos medidos;
`sp_Triage_GetByEncounter`; `sp_Triage_Reclassify`; `sp_VitalSigns_Append (@…, @EncounterId, @VitalsJson, …)`
(la nota de evolución también captura signos, numeral 6.2.2);
`sp_VitalSigns_ListByEncounter`.

#### API

| Verbo | Ruta | Salida | Códigos |
|---|---|---|---|
| `GET` | `/api/branches/{branchId}/triage-scale` | `ApiResponse<TriageScaleConfigDto>` (efectiva: cascada) | 200, 404 |
| `PUT` | `/api/tenant/triage-scale` · `/api/branches/{branchId}/triage-scale` | `ApiResponse<TriageScaleConfigDto>` | 200, 400, 403 |
| `POST` | `/api/encounters/{id}/triage` | `ApiResponse<TriageDto>` | 200, 400, 404 |
| `GET` | `/api/encounters/{id}/triage` | `ApiResponse<TriageDto>` | 200, 404 |
| `POST` | `/api/encounters/{id}/triage/reclassify` | `ApiResponse<TriageDto>` | 200, 400, 403 |
| `POST` | `/api/encounters/{id}/vitals` | `ApiResponse<VitalSetDto>` | 200, 400 |
| `GET` | `/api/encounters/{id}/vitals` | `ApiResponse<VitalSetDto[]>` | 200, 404 |

#### Offline

Triage, reclasificación y signos vitales: **cola offline** (`triage.save`, `triage.reclassify`, `vitals.append`),
append-only. La escala efectiva se cachea con antigüedad visible (misma necesidad que datos de establecimiento). Lectura
con enlace; caché con antigüedad. Sin outbox en Fase 1.

#### Pantallas

`docs/frontend/src/pages/triage/page.tsx` (+ `components/TriagePrintModal.tsx`) → `frontend/src/pages/triage/**`.
`frontend/src/utils/vitalValidation.ts` ya existe migrado del prototipo: se reusa para **destacar** fuera de rango, no
para rellenar. UI de administración de escala (tenant/sucursal) en administración / parámetros clínicos.
Nuevo: `frontend/src/api/triage.ts`.

#### Salvaguardas

- **No existe botón de «valores normales» ni de autocompletar signos vitales.** Si aparece en el prototipo migrado, se
  retira (BM-URG-01).
- **Ningún nivel de triage por omisión** (SC-03). Sin clasificar es un estado visible y con prioridad alta.
- El triage **siempre se puede guardar** sin signos medidos: lo faltante queda explícitamente como «no tomado»
  (`no_medido` / razón), **nunca** se inventa un valor (BM-URG-02; ratificado 2026-08-27). Un triage con todos los signos
  en `no_medido` y razón «paciente en reanimación» es un registro válido y visible.
- Prohibido `parseFloat(x) || 0` sobre peso, talla o cualquier magnitud clínica: imprimiría «0 kg» (BM-URG-04).
- Fuera de rango crítico se destaca y **nunca** se guarda silenciosamente como normal (SC-08).
- El nivel es distinguible **sin percepción de color**: texto + icono (SC-10). Los tokens de presentación de triage
  salen de la escala configurada; **no** son white-label genérico del producto.
- **No hardcodear** una escala concreta en migraciones ni en UI.

#### Normativa aplicable

| Requisito | Fuente y fecha |
|---|---|
| La clasificación es **acto médico**: un médico valora y establece prioridades | NOM-027-SSA3-2013 numeral 5.4 — verificado 2026-08-22 |
| Signos vitales en el contenido mínimo de la nota inicial de urgencias | NOM-004 numeral 7.1.2 — verificado |
| Exploración física con signos vitales, peso y talla | NOM-004 numeral 6.1.2 — verificado 2026-08-22 |
| Notas de evolución en observación **por turno o al menos cada 8 horas** y ante cambios significativos | NOM-027-SSA3-2013 numeral 6.2.2 — verificado 2026-08-22. El sistema debe detectar y alertar la nota vencida **también sin enlace**, porque el reloj sigue corriendo |

**No verificado:** si alguna norma mexicana prescribe una **escala** de triage. La NOM-027 está verificada pero no se
revisó ese punto (doc 01 §8). Por eso la escala es **configurable** y no se afirma una escala «oficial» del producto.

#### Pruebas

- Unitarias: `vitalValidation` con valores ausentes no marca «normal»; guardado sin signos medidos (todos «no tomado»)
  es válido; el nivel nulo ordena primero; cascada de escala (sucursal sobre tenant).
- Integración: `sp_Triage_Save` es transaccional (triage + signos + auditoría) y no permite `UPDATE` del triage previo;
  `sp_TriageScaleConfig_GetEffective` respeta prioridad de sucursal.
- Contrato: `POST /api/encounters/{id}/triage` sin nivel y sin signos medidos responde 200.
- E2E: **SC-03**, **SC-08**, **SC-10**, **SC-14**; `specs/03-triage-urgencias/triage-sin-bloqueo.spec.ts` sale de `skip`.

---

### M7 — Expediente e historia clínica

**Depende de:** M2, M3, M4. **Se adelanta a M6** porque la nota de evolución se apoya en los tipos del interrogatorio.

#### Datos

`dbo.ClinicalRecord` (uno por sujeto y tenant — expediente **único**, numeral 4.4): `RecordId`, `TenantId`, `SubjectId`,
`OpenedAtUtc`, `LastMedicalActAtUtc` (reloj de retención; qué cuenta como acto médico es la decisión abierta 61),
`IsDeleted`.

`dbo.MedicalHistory` (historia clínica, numeral 6.1) con **todos** los campos de interrogatorio tipados como
`EstadoInterrogatorio<T>`: heredo-familiares, personales patológicos y no patológicos, aparatos y sistemas, habitus
exterior, padecimiento actual. Estado inicial de **todo**: `no_interrogado`. Columna `Origin`
(`capturado | prellenado_por_sistema`) para poder distinguir después lo que un clínico asentó de lo que puso el software.

`dbo.AllergyStatus` + `dbo.Allergy`: el **estado alérgico** es `EstadoInterrogatorio` a nivel expediente
(`no_interrogado | niega | refiere | se_desconoce | paciente_no_puede_responder`), y las alergias son filas tipadas
(sustancia, tipo de reacción, severidad, origen del dato, autoría). **`alergias: []` no significa «sin alergias»**
(BM-PAC-01, SC-01). El valor `paciente_no_puede_responder` queda disponible para el flujo de captura obligatoria al
prescribir (decisión ratificada 2026-08-27 en M8).

`dbo.HistoryAmendment` (addendum append-only): las correcciones no sobrescriben (numeral 5.11).

`dbo.SubjectFlag` — alertas destacadas del sujeto (alergia grave, riesgo, embarazo). El embarazo y la edad gestacional se
modelan como campo propio, no como texto (BM-PAC-06).

#### SPs

`sp_ClinicalRecord_EnsureForSubject (@TenantId, @SubjectId, @ActorUserId)` — idempotente;
`sp_ClinicalRecord_GetBySubject`; `sp_MedicalHistory_Save` (append de versión, nunca `UPDATE` destructivo);
`sp_MedicalHistory_AddAmendment`; `sp_AllergyStatus_Set (@TenantId, @RecordId, @Status, @ActorUserId, @OccurredAtUtc)`;
`sp_Allergy_Add` / `sp_Allergy_SoftDelete`; `sp_SubjectFlag_Set`;
`sp_ClinicalRecord_TouchMedicalAct (@TenantId, @RecordId, @ActUtc, @ActType)`.

#### API

| Verbo | Ruta | Salida | Códigos |
|---|---|---|---|
| `GET` | `/api/subjects/{id}/record` | `ApiResponse<ClinicalRecordDto>` | 200, 403, 404 — **registra lectura en auditoría** |
| `POST` | `/api/subjects/{id}/history` | `ApiResponse<MedicalHistoryDto>` | 200, 400 |
| `POST` | `/api/subjects/{id}/history/amendments` | `ApiResponse<AmendmentDto>` | 200, 400 |
| `PUT` | `/api/subjects/{id}/allergy-status` | `ApiResponse<AllergyStatusDto>` | 200, 400 |
| `POST` | `/api/subjects/{id}/allergies` · `DELETE .../allergies/{allergyId}` | `ApiResponse<…>` | 200, 400, 404 (baja lógica) |

Escrituras por **cola offline** (`history.save`, `history.amend`, `allergyStatus.set`, `allergy.add`). Lectura del
expediente **con enlace**; caché mínima con antigüedad visible y solo en dispositivos registrados. Sin outbox.

#### Pantallas

`docs/frontend/src/pages/consultas/components/HistoriaClinicaForm.tsx`, `HistoriaClinicaReadOnly.tsx`,
`HistoriaClinicaPrintModal.tsx` y `docs/frontend/src/pages/pacientes/detalle/components/ExpedienteUnificado.tsx` →
destinos equivalentes en `frontend/src/pages/**`. Nuevo: `frontend/src/api/clinicalRecord.ts`.

#### Salvaguardas

- El expediente nuevo **no afirma nada**: antecedentes en `no_interrogado`, aparatos y sistemas en `no_interrogado`.
  Prohibido el equivalente de `createEmptyHistoriaClinica` que inicializaba en `negado` / `normal` (BM-PAC-14).
- `frontend/src/mocks/historiaClinica.ts` y el resto de `frontend/src/mocks/**` **no** pueden alimentar builds
  demo/staging/prod: dato sintético solo por API → SP → BD.
- La cabecera de identidad y las alertas de alergia se presentan de forma inequívoca antes de prescribir (SC-01).
- Un documento firmado no se edita por ninguna vía (SC-06): las correcciones son addendum.

#### Normativa aplicable

| Requisito | Fuente y fecha |
|---|---|
| Expediente **único** por paciente; soporte electrónico válido | NOM-004 numeral 4.4 — verificado |
| Contenido mínimo de la historia clínica (interrogatorio, antecedentes, aparatos y sistemas) | NOM-004 numeral 6.1.1 — verificado 2026-08-22 |
| Exploración física: habitus exterior, signos vitales, peso y talla | NOM-004 numeral 6.1.2 — verificado 2026-08-22 |
| Conservación mínima de 5 años desde el **último acto médico** | NOM-004 numeral 5.4 — verificado |
| Confidencialidad; entrega a terceros solo con solicitud escrita de quien tiene legitimación | NOM-004 numerales 5.5, 5.5.1, 5.6 y 5.7 — verificado 2026-08-22 |
| Sin enmendaduras ni tachaduras | NOM-004 numeral 5.11 — verificado |

**No verificado:** el artículo 79 del Reglamento (hoja de egreso voluntario) y los artículos de la LFPDPPP 2025 sobre
minimización y plazos ARCO (doc 01 §8). El motor de retención es **Fase 3**: aquí solo se registra
`LastMedicalActAtUtc`, sin afirmar cumplimiento del numeral 5.4.

#### Pruebas

- Unitarias: fábrica de historia nueva devuelve todo en `no_interrogado`; `estado alérgico = no_interrogado` no se
  presenta como «sin alergias».
- Integración: `sp_ClinicalRecord_EnsureForSubject` es idempotente; historia versionada sin `UPDATE` destructivo.
- Contrato: `GET .../record` deja evento de auditoría; 403 por rol sin permiso.
- E2E: **SC-01**, **SC-05**, **SC-06**.

---

### M6 — Consulta, notas clínicas y firma local + sello

**Depende de:** M1, M2, M4, M7, M11. **Parcialmente bloqueado:** el **valor jurídico** de la firma depende del dictamen
69 / pregunta 9. Se construye la mecánica (hash de contenido canónico + sello al sincronizar) **sin afirmar** que
satisface el numeral 5.10 de la NOM-004.

#### Datos

`dbo.ClinicalNote`: `NoteId`, `TenantId`, `EncounterId`, `SubjectId`, `NoteType`
(`urgencias_inicial | evolucion | interconsulta | referencia_traslado | egreso | enfermeria | certificado`),
`BodyJson` (campos tipados por tipo de nota, no un blob de texto), `Prognosis` NULL (exigido por los numerales 6.1.5 y
6.2.5, **sin escala prescrita** por la norma), `AuthorProfessionalId`, `AuthorUserId`, `AuthorLicenseSnapshot`
(cédula y certificado vigentes **al momento de firmar**: el documento debe poder reimprimirse igual años después),
`FacilitySnapshotJson` (datos del establecimiento, numerales 5.2 a 5.2.4), `ContentHash`, `SignedAtUtc` NULL,
`SealedAtUtc` NULL, `SealState`, `IsDeleted`, `OccurredAtUtc`, `RecordedAtUtc`.

`dbo.ClinicalNoteAddendum` (append-only). `dbo.ClinicalNoteCoAuthor` — co-autoría verificada, requerida por el artículo
81 del Reglamento y por el certificado de dos médicos.

Una nota firmada es **inmutable**: no hay SP que la actualice. Solo addendum.

#### SPs

`sp_ClinicalNote_Create`; `sp_ClinicalNote_Sign (@TenantId, @NoteId, @ContentHash, @AuthorProfessionalId, @SignedAtUtc, @ActorUserId)`
— rechaza si ya está firmada y si el profesional no tiene cédula;
`sp_ClinicalNote_Seal (@TenantId, @NoteId, @SealedAtUtc)`; `sp_ClinicalNote_AddAddendum`;
`sp_ClinicalNote_AddCoAuthor`; `sp_ClinicalNote_GetById`; `sp_ClinicalNote_ListByEncounter`;
`sp_ClinicalNote_ListPendingEvolution (@TenantId, @BranchId, @HoursThreshold)` — nota de evolución vencida
(numeral 6.2.2).

#### API

| Verbo | Ruta | Salida | Códigos |
|---|---|---|---|
| `POST` | `/api/encounters/{id}/notes` | `ApiResponse<NoteDto>` | 200, 400, 404 |
| `POST` | `/api/notes/{noteId}/sign` | `ApiResponse<NoteDto>` | 200, 400, 403 (sin cédula), 409 (ya firmada) |
| `POST` | `/api/notes/{noteId}/addenda` | `ApiResponse<AddendumDto>` | 200, 400, 404 |
| `POST` | `/api/notes/{noteId}/co-authors` | `ApiResponse<NoteDto>` | 200, 400, 409 |
| `GET` | `/api/encounters/{id}/notes` | `ApiResponse<NoteDto[]>` | 200, 404 |
| `GET` | `/api/notes/pending-evolution?branchId=` | `ApiResponse<PendingEvolutionDto[]>` | 200, 403 |
| `PUT` / `PATCH` sobre una nota firmada | — | — | **405 / 409 siempre.** No existe la ruta de edición (SC-06) |

Creación, firma y addendum por **cola offline** (`note.create`, `note.sign`, `note.addendum`). El **sello** lo pone el
servidor al sincronizar; la UI muestra «sello pendiente» hasta entonces. La alerta de nota de evolución vencida debe
calcularse también **sin enlace**. Sin outbox en Fase 1.

#### Pantallas

`docs/frontend/src/pages/consultas/page.tsx` (+ `components/ConsultorioView.tsx`,
`CertificadoMedicoPrintModal.tsx`) → `frontend/src/pages/consultas/**`.
`docs/frontend/src/pages/normatividad/notas-enfermeria/page.tsx`, `.../egresos/page.tsx`, `.../referencias/page.tsx` →
destinos equivalentes. Nuevo: `frontend/src/api/notes.ts`.

#### Salvaguardas

- **La autoría se toma del token, jamás del cuerpo** (SC-12).
- Firmar exige cédula vigente del autor; sin ella el endpoint responde 403 y la UI lo explica en lugar de fallar en
  silencio.
- Nota firmada inmutable (SC-06). Addendum con autoría y doble marca de tiempo.
- El pronóstico se exige pero **no se preselecciona**.
- No se afirma en UI ni en el PDF que la firma tiene validez jurídica plena. El texto legible dice qué es: firma
  electrónica del sistema con cadena de integridad y sello de tiempo.

#### Normativa aplicable

| Requisito | Fuente y fecha |
|---|---|
| Toda nota con fecha, hora, nombre completo y firma (autógrafa, electrónica o digital, sujeta a otras disposiciones) | NOM-004 numeral 5.10 — verificado |
| Cédula profesional y certificado de especialidad vigente **en los documentos** del ejercicio profesional | LGS art. 83 (reformado DOF 01-09-2011) — verificado 2026-08-22 |
| Nombre completo del paciente, edad y sexo en toda nota y reporte | NOM-004 numeral 5.9 — verificado |
| Datos del establecimiento en el expediente | NOM-004 numerales 5.2 a 5.2.4 — verificado |
| Contenido de nota inicial de urgencias, evolución, interconsulta, referencia/traslado y egreso | NOM-004 numerales 7.1, 6.2, 6.3, 6.4, **8.9** (no 8.8: el 8.8 es la nota postoperatoria) — verificado 2026-08-22 |
| Consentimiento: firma «si su estado de salud lo permite»; en urgencias remite al art. 81 del Reglamento; no requiere formato impreso | NOM-004 numerales 10.1.1.8, 10.1.2, 10.1.3, 10.1.4 — verificado 2026-08-22 |

**No verificado:** si la firma local + sello satisface el numeral 5.10 (dictamen 69); NOM-151-SCFI-2016; NOM-011-SSA3-2014
para notas de enfermería (doc 01 §8). Ninguna cita normativa se imprime en un documento del sistema sin estar verificada
y registrada con `source_url` y `last_verified_at`.

#### Pruebas

- Unitarias: canonicalización estable del contenido para el hash; firmar dos veces falla; sin cédula no firma.
- Integración: no existe SP que actualice una nota firmada; addendum append-only.
- Contrato: cualquier intento de modificar una nota firmada por cualquier ruta responde 409/405 (SC-06).
- E2E: **SC-06**, **SC-12**; `specs/04-consulta-receta/flujo-consulta.spec.ts` sale de `skip` en la parte de consulta.

---

### M8 — Receta

**Depende de:** M1, M6, M7. **Decisión ratificada (2026-08-27) sobre alergias al prescritir:** si el estado alérgico
**no** ha sido interrogado (distinto de «niega alergias»), el sistema **obliga a capturar el estado** antes de continuar,
aunque el valor capturado sea «no interrogado» o «paciente no puede responder». No es un bloqueo hasta conocer las
alergias; es exigir registro **explícito** del estado (incluidos valores de «no sé») con **rastro auditado** de lo
elegido. **Sigue parcialmente bloqueado** por el contenido obligatorio según el Reglamento de Insumos (no verificado) y
por el alcance de controlados. Los estupefacientes y psicotrópicos **no se implementan** y deben **impedirse**.

#### Datos

`dbo.Medication` (catálogo): `GenericName` **NOT NULL**, `BrandName` NULL, `Presentation`, `SaleClassification`
(las **seis** fracciones del artículo 226 de la LGS), `IsControlledSubstance` `BIT`, `IsActive`, `IsDeleted`.

`dbo.Prescription`: `PrescriptionId`, `TenantId`, `BranchId`, `EncounterId`, `SubjectId`, `ProfessionalId`,
`AuthorLicenseSnapshot`, `FacilitySnapshotJson`, `IssuedAtUtc`, `ValidUntilUtc` NULL (vigencia según clasificación de
venta), `AllergyStatusAtIssue` (**se congela el estado alérgico al emitir**), `AllergyStatusCaptureEventId` NULL
(referencia al acto de captura explícita cuando se forzó el paso previo), `AllergyOverrideJustification` NULL,
`ContentHash`, `SignedAtUtc` NULL, `SealState`, `IsDeleted`.

`dbo.PrescriptionItem`: `MedicationId`, `GenericNameSnapshot`, `BrandNameSnapshot` NULL, `Dose` (`Medicion`),
`Route`, `Frequency` (estructurada: cada N horas / N veces al día), `DurationDays` NULL, `Quantity`,
`RefillsAllowed`, `Instructions`. Dosis, vía y periodicidad **estructuradas**, no texto libre (BM-FAR-02).

#### SPs

`sp_Medication_Search (@TenantId, @Query, @ExcludeControlled BIT)`; `sp_Medication_Upsert`;
`sp_Prescription_Create` (rechaza cualquier ítem con `IsControlledSubstance = 1`; si el expediente no tiene estado
alérgico capturado de forma explícita para este acto —p. ej. aún en silencio/`no_interrogado` sin paso de captura—,
exige antes `sp_AllergyStatus_Set` con valor explícito, que **puede** ser `no_interrogado` o
`paciente_no_puede_responder`; registra auditoría de lo elegido);
`sp_Prescription_Sign`; `sp_Prescription_Cancel` (reverso, no `DELETE`); `sp_Prescription_GetById`;
`sp_Prescription_ListBySubject`.

#### API

| Verbo | Ruta | Salida | Códigos |
|---|---|---|---|
| `GET` | `/api/medications?query=` | `ApiResponse<MedicationDto[]>` | 200 |
| `POST` | `/api/encounters/{id}/prescriptions` | `ApiResponse<PrescriptionDto>` | 200, 400, **409** (falta captura **explícita** del estado alérgico en el flujo —no es «bloqueo hasta conocer alergias»; tras capturar, incluso con `no_interrogado` o `paciente_no_puede_responder`, se puede continuar), **422** (medicamento controlado: **impedido**, con mensaje explícito de que está fuera de alcance y por qué) |
| `PUT` | `/api/subjects/{id}/allergy-status` | (reuso M7) captura explícita con rastro | 200, 400 |
| `POST` | `/api/prescriptions/{id}/sign` | `ApiResponse<PrescriptionDto>` | 200, 403, 409 |
| `POST` | `/api/prescriptions/{id}/cancel` | `ApiResponse<PrescriptionDto>` | 200, 400, 404 |
| `GET` | `/api/subjects/{id}/prescriptions` | `ApiResponse<PrescriptionDto[]>` | 200, 404 |

Emisión y firma por **cola offline** (`prescription.create`, `prescription.sign`; la captura de estado alérgico
`allergyStatus.set` debe ir **antes** en la cola cuando aplique). Catálogo de medicamentos: lectura con
enlace, caché con antigüedad. Sin outbox en Fase 1 (surtido y libro de control son Fase 2).

#### Pantallas

`docs/frontend/src/pages/recetas/page.tsx` (+ `components/RecetaPrintModal.tsx`) → `frontend/src/pages/recetas/**`;
`docs/frontend/src/pages/urgencias/components/UrgenciaRecetaCreator.tsx` → destino equivalente.
Nuevo: `frontend/src/api/prescriptions.ts`. Flujo de emisión: si el estado no ha sido interrogado, **paso obligatorio de
captura** (incluye opciones «no interrogado» / «paciente no puede responder») antes de armar la receta; queda rastro de
la elección.

#### Salvaguardas

- Alergias y alertas del paciente visibles **antes** de emitir (SC-01); prescribir un medicamento al que el paciente es
  alérgico exige confirmación explícita **con justificación registrada** (SC-02).
- Si el estado es «no interrogado» (o equivalente sin captura explícita en el acto), **no se continúa** hasta registrar
  un estado explícito —que puede seguir siendo de «no sé»— con auditoría (ratificado 2026-08-27). Distinto de «niega
  alergias», que sí es un estado clínico afirmado.
- Prescripción por **denominación genérica**; la distintiva es opcional y no la sustituye.
- Estupefacientes y psicotrópicos: **impedidos**, no «no soportados en silencio». El mensaje dice que está fuera de
  alcance y que depende de recetario especial con código de barras de la autoridad.
- El alta con recetas pendientes está bloqueada; forzarla exige motivo y genera evento de excepción (SC-04) — el bloqueo
  es al **cierre**, nunca al inicio.

#### Normativa aplicable

| Requisito | Fuente y fecha |
|---|---|
| Identificación genérica obligatoria del medicamento | LGS art. 225 (reformado DOF 30-03-2022) — verificado 2026-08-22 |
| Seis grupos de venta y suministro; retención, vigencia de 30 días, resurtido hasta tres veces con sello y registro | LGS art. 226 fracciones I–VI — verificado 2026-08-22 |
| El emisor prescribe en denominación genérica | LGS art. 226, último párrafo (adicionado DOF 30-03-2022) — verificado 2026-08-22 |
| Solo ciertos profesionales con título registrado prescriben estupefacientes | LGS art. 240 — verificado 2026-08-22 |
| Estupefacientes en **recetarios especiales** con código de barras asignado por la autoridad | LGS art. 241 — verificado 2026-08-22 |
| Tratamiento e indicaciones con dosis, vía y periodicidad como mínimo | NOM-004 numeral 6.2.6 — verificado 2026-08-22 |
| Cédula en los documentos del ejercicio profesional | LGS art. 83 — verificado 2026-08-22 |

**No verificado, y por eso no se afirma:** el **Reglamento de Insumos para la Salud** (arts. 28–31 y 50–52), que es el
instrumento que cierra el contenido obligatorio de la receta. Se intentó obtener el texto oficial el 2026-08-22 y no se
consiguió (doc 01 §8). Todo requisito de receta implementado en Fase 1 se sostiene **exclusivamente** en la LGS. No se
declara «receta conforme a norma».

#### Pruebas

- Unitarias: ítem controlado siempre rechazado; frecuencia estructurada no acepta texto libre; vigencia derivada de la
  clasificación de venta; emisión tras captura explícita de `no_interrogado` o `paciente_no_puede_responder` es válida;
  emisión sin paso de captura cuando el estado no fue interrogado es inválida.
- Integración: `sp_Prescription_Create` rechaza controlados en el propio SP (no solo en Business); cancelación por
  reverso, sin `DELETE`; rastro de captura de estado alérgico en auditoría.
- Contrato: 409 si falta captura explícita del estado; 200 tras capturar aunque el valor sea de «no sé»; 422 con
  medicamento controlado.
- E2E: **SC-01**, **SC-02**, **SC-04**; resto de `specs/04-consulta-receta/flujo-consulta.spec.ts`.

---

### M9 — Agenda

**Depende de:** M1, M3, M11. Independiente de M4–M8: se puede construir en paralelo.

#### Datos

`dbo.ConsultingRoom` (`RoomId`, `TenantId`, `BranchId`, `Code`, `Name`, `IsActive`, `IsDeleted`) — el consultorio es
entidad, no una cadena (BM-AGE-02).
`dbo.Appointment`: `AppointmentId`, `TenantId`, `BranchId`, `SubjectId`, `ProfessionalId`, `RoomId` NULL,
`ScheduledStartUtc`, `ScheduledEndUtc`, `State` (`agendada | confirmada | atendida | no_asistio | cancelada`),
`ServiceCode` NULL, `Notes` NULL, `IsDeleted`, `Autoria`.
`dbo.AppointmentEvent` (append-only): cancelación con **motivo, autor e historial** (BM-AGE-01).

#### SPs

`sp_Appointment_Create`; `sp_Appointment_Reschedule`; `sp_Appointment_ChangeState (@…, @ToState, @Reason NULL, @ActorUserId)`;
`sp_Appointment_ListByRange (@TenantId, @BranchId, @FromUtc, @ToUtc, @ProfessionalId NULL, @RoomId NULL)`;
`sp_Appointment_ListBySubject`; `sp_ConsultingRoom_List` / `sp_ConsultingRoom_Upsert`.

#### API

`POST /api/appointments` · `PUT /api/appointments/{id}` · `POST /api/appointments/{id}/state` ·
`GET /api/appointments?branchId=&from=&to=&professionalId=` · `GET /api/consulting-rooms`.
Códigos: 200, 400, 403, 404, 409 (traslape de profesional o consultorio).

Escrituras por cola offline (`appointment.create`, `appointment.state`) — una cita capturada sin red no se pierde.
Lecturas con enlace; caché con antigüedad. Sin outbox.

#### Pantallas

`docs/frontend/src/pages/agenda/page.tsx` (+ `components/DayView.tsx`, `WeekDayColumn.tsx`,
`ConsultoriosDayView.tsx`) → `frontend/src/pages/agenda/**`. Nuevo: `frontend/src/api/appointments.ts`.

#### Salvaguardas

- **Se puede agendar a un sujeto sin identidad completa** (BM-AGE-03): el sujeto siempre existe.
- El filtro por médico **falla cerrado** si el usuario no tiene profesional asociado (decisión del usuario).
- Cancelar exige motivo y deja historial; no se borra la cita.

#### Pruebas

Unitarias de traslape; integración de `@TenantId` y append-only del evento; contrato de 409 por traslape; E2E de agenda
básica (no hay SC específico de agenda en el mapa SC-01…SC-24).

---

### M10 — Empuje en vivo (sala de espera y urgencias)

**Depende de:** M4, M5, M9. Último en la secuencia porque necesita las colas ya funcionando.

Hub SignalR en `backend/Api/Hubs/ClinicalQueueHub.cs`, con grupos por `TenantId + BranchId` (nunca broadcast global) y
autorización por token. Eventos: `queueChanged`, `triageChanged`, `appointmentChanged`, `encounterStateChanged`. El
payload lleva **identificadores y nivel**, no datos clínicos ni identidad: quien recibe consulta el detalle por API con
sus permisos.

Sin enlace: la pantalla cae a caché y **muestra la antigüedad** (SC-09). El live es mejora de latencia, no fuente de
verdad. Sin outbox y sin cola offline (no es escritura).

Pantallas: `frontend/src/pages/sala-espera/**`, `frontend/src/pages/urgencias/**`,
`frontend/src/pages/monitor-turnos/**`. Nuevo: `frontend/src/sync/liveQueue.ts`.

Pruebas: contrato de autorización del hub (un token de otro tenant no recibe el grupo); E2E **SC-07** y **SC-09** con dos
contextos y `context.setOffline`.

---

### M12 — Cierre E2E: SC en verde

**Depende de:** todos. Es el 1.9 del doc 11.

Trabajo concreto: retirar los `test.skip` de `tests/e2e/specs/06-seguridad-clinica/sc-mapa.spec.ts` conforme cada módulo
entrega, e implementar los casos en sus archivos de dominio. Los IDs **no se borran** para poner verde la suite.

Reparto de SC por módulo, para que cada agente sepa qué le toca:

| Módulo | SC que debe dejar en verde |
|---|---|
| M1 | SC-12 (junto con M6) |
| M2 | soporte de SC-06 y SC-23 |
| M3 | SC-05, SC-13, SC-15, SC-16, SC-17, SC-18, SC-21, SC-22, SC-23 |
| M4 | SC-03, SC-07, SC-19, SC-20, SC-24 |
| M5 | SC-03, SC-08, SC-10, SC-14 |
| M6 | SC-06, SC-12 |
| M7 | SC-01, SC-05, SC-06 |
| M8 | SC-01, SC-02, SC-04 |
| M10 | SC-07, SC-09 |
| M12 | SC-11 (cola offline sobrevive al reinicio) y cierre del mapa completo |

**SC-25 y SC-26** existen en el doc 05 pero no en el mapa ejecutable actual (que llega a SC-24). El doc 11 §3 pide
«SC-01…SC-26». Se declara como discrepancia a resolver al abrir M12: o se agregan al mapa, o se documenta por qué quedan
fuera. **No se decide aquí.**

---

## 3. Salvaguardas clínicas transversales

Resumen operativo del skill `medicore-clinical-safety`, aplicable a **todos** los módulos. Si un módulo contradice esto,
el módulo está mal.

### 3.1 Lo que jamás bloquea el ingreso a urgencias

Nombre, apellidos, CURP, fecha de nacimiento, sexo, domicilio, teléfono, correo, aseguradora, póliza, forma de pago,
consentimiento firmado, catálogo faltante, fallo de red, Core caído, cola con error, validación diferida. **Ninguno.**
Lo único requerido para abrir un episodio es la sucursal y el sujeto (que se crea vacío en el mismo acto).

### 3.2 Dónde el modelo debe poder decir «no sé»

| Campo | Cómo lo dice |
|---|---|
| Sexo biológico | `no_determinado` / `no_especificado`, con `origen` |
| Fecha de nacimiento | `NULL` legítimo |
| Edad | `EdadEstimada` con unidad, rango y origen; nunca un entero inventado |
| Peso y talla | `Medicion` con `Estado = no_medido` / `estimado` marcado |
| Cada signo vital | `medido` / `no_medido` + razón / `no_valorable` |
| Dolor | `no_valorable` |
| Nivel de triage | `NULL` = `sin_clasificar`, visible y con prioridad alta |
| Antecedentes y aparatos y sistemas | `no_interrogado` / `se_desconoce` / `no_aplica` / valor |
| Estado alérgico | `no_interrogado` ≠ `niega` ≠ lista vacía; también `paciente_no_puede_responder` (captura explícita al prescritir) |
| Tipo de sangre | `EstadoInterrogatorio` |
| Aviso al MP | sí / no / **no valorado** |
| Cédula del profesional | `NULL` en el modelo, pero sin ella no se firma |

### 3.3 Campos que **nunca** se rellenan por omisión

Sexo, edad, fecha de nacimiento, signos vitales (ni un botón que los ponga «normales»), nivel de triage, antecedentes,
aparatos y sistemas, alergias, pronóstico, `viaAcceso`, circunstancia de ingreso, aviso al MP, destino del alta, cédula,
especialidad, domicilio del establecimiento.

### 3.4 Qué debe fallar cerrado

- Filtro por médico sin profesional asociado → **vacío**, no el padrón completo.
- Firmar sin cédula vigente → **403**, no firma anónima.
- Lectura de flags con error → **error**, no «todo apagado».
- Token de otro tenant → **404 / 403**, nunca fuga entre tenants.
- Búsqueda por descripción sin permiso → **403**, y toda búsqueda auditada, incluidas las sin resultado.
- Medicamento controlado → **impedido** con mensaje explícito.
- Caché clínica en dispositivo no registrado → **no se guarda**; la estación opera solo en línea.
- Worker con destino DGIS productivo → **no arranca** (ya implementado).

### 3.5 Qué se bloquea legítimamente

Solo **cierres** y **emisiones**, nunca inicios: cerrar urgencias sin triage (SC-03), dar de alta con recetas pendientes
sin motivo (SC-04), emitir receta **sin captura explícita** del estado alérgico cuando aún no fue interrogado
(ratificado 2026-08-27: se exige el registro del estado —que puede ser «no sé»—, no conocer las alergias), editar una
nota firmada (SC-06), prescribir controlados (fuera de alcance).

---

## 4. Requisitos normativos: qué está verificado y qué no

Las tablas por módulo (§2) llevan la fuente y la fecha de cada requisito. Aquí queda solo lo que **no** debe afirmarse.

### 4.1 No afirmar cumplimiento

- **No se afirma cumplimiento de la NOM-004, la NOM-024, la NOM-027 ni la LFPDPPP.** Lo verificado son numerales y
  artículos concretos con fecha (doc 01); el cumplimiento es del establecimiento y requiere control operativo y
  evidencia, no solo software (NOM-004 numeral 5.1: el establecimiento es solidariamente responsable).
- **No se dice «MediCore certificado NOM-024».** La certificación exige SGSI con seis meses de madurez y es de Fase 4 en
  el mejor caso (doc 01 §3).
- WCAG 2.2, FHIR, ISO 27001 y SNOMED **no** son obligación legal mexicana; se adoptan como marco y se declaran como
  tales.

### 4.2 No verificado que toca a Fase 1

| Punto | Consecuencia para Fase 1 |
|---|---|
| **Reglamento de Insumos para la Salud** (arts. 28–31, 50–52) | El contenido obligatorio de la receta se sostiene solo en la LGS. No se declara receta conforme a reglamento |
| Firma local + sello vs. NOM-004 numeral 5.10 (dictamen 69) | Se construye la mecánica; no se afirma validez jurídica plena |
| NOM-151-SCFI-2016 | No se promete constancia de conservación |
| CURP de un paciente que nunca se identifica (53) | Bloquea el **reporte** de Fase 4, no el módulo clínico. Prohibido inventar la clave |
| Sexo emitido cuando no es determinable (54) | Igual: interno `no_determinado`; lo que se emite queda pendiente |
| Escala de triage prescrita por norma mexicana | No se afirma. Escala **configurable** por tenant/sucursal (ratificado 2026-08-27); el producto no impone una fija |
| Artículo 79 del Reglamento (egreso voluntario) | La hoja de egreso voluntario no se cierra en Fase 1 |
| Minimización y plazos ARCO en la LFPDPPP 2025 | Fase 3. En Fase 1 no se retiran campos por «minimización» sin fundamento |
| NOM-011-SSA3-2014 (enfermería), NOM-005/016/017/035 | Las notas de enfermería se implementan contra la NOM-004 numeral 9.1, no contra normas sin verificar |
| Artículo 81 en establecimiento ambulatorio (46) | Se soporta el requisito más exigente (dos profesionales) para no quedar corto |
| Fundamento **penal** del aviso al MP | No se invoca |
| NOM-046-SSA2-2005 | No se usa como criterio |

**Regla dura heredada del doc 01 §2:** ninguna cita normativa se imprime en un documento del sistema sin estar
verificada contra el texto del DOF y registrada con `source_url` y `last_verified_at`. Y el numeral de la nota de egreso
es el **8.9**, no el 8.8.

---

## 5. Decisiones bloqueantes

Separadas con precisión: primero lo que **sí** se puede construir hoy sin respuesta, y luego las preguntas. Las
decisiones de triage, signos vitales, etiqueta temporal y alergias al prescritir están **ratificadas** (2026-08-27; ver
bloque al inicio) y **no** se reabren aquí.

### 5.1 Módulos que arrancan sin ninguna decisión pendiente

**M1** (profesional sanitario), **M2** (tipos base y auditoría), **M11** (establecimiento: tipo/urgencias por sucursal
ratificados 2026-08-28), **M3** (sujeto e identidad — el núcleo; ver acotación abajo), **M4** (episodio y urgencias),
**M5** (triage y signos: escala y mínimo de signos ya ratificados), **M9** (agenda), **M10** (live).

### 5.2 Lo que queda acotado, no detenido

| Módulo | Parte bloqueada | Parte construible ya |
|---|---|---|
| M3 | Emisión de sexo no determinable al reporte (54); valor interno `intersexual` si se requiere SEUL «3» sin inventar | Modelo Opción B (`GenderIdentity`) + estados, vínculos, cola de fusión, señas (conservar + secreto profesional), búsqueda por descripción (roles/alcance ratificados 2026-08-28), etiqueta configurable (2026-08-27). AuthZ fina de sucursal/rol `trabajo_social` puede quedar como tarea de implementación si el catálogo de roles (pregunta A) aún no lo incluye |
| M6 | Valor jurídico de la firma (G) | Hash canónico, sello, addendum, inmutabilidad, contenido de notas |
| M7 | Qué cuenta como «acto médico» para el reloj de retención (H); migración de expedientes prellenados (I) | Historia sin prellenar, estado alérgico (incl. captura explícita para M8), addendum. En Dev no hay expedientes reales que migrar |
| M8 | Contenido de receta según Reglamento de Insumos (pendiente normativo); confirmación de alcance de controlados (K) | Catálogo, ítems estructurados, firma, impedimento de controlados, flujo de captura obligatoria de estado alérgico (ratificado 2026-08-27) |

### 5.3 Preguntas para el usuario

Redactadas para responder con una frase. Cada una dice qué bloquea.

**Resueltas el 2026-08-27** (texto completo en el bloque al inicio; no se reiteran como abiertas):
- ~~Convención fija de etiqueta temporal (fonético vs propia)~~ → configurable tenant/sucursal con cascada.
- ~~Escala de triage (cuatro colores vs cinco niveles)~~ → configurable tenant/sucursal; producto sin escala fija.
- ~~Mínimo de signos vitales para guardar triage~~ → ninguno obligatorio; faltantes como «no tomado».
- ~~Prescribir sin haber interrogado alergias (bloqueo duro / con justificación / advertencia)~~ → obligar captura
  explícita del estado (incluye «no sé»), con rastro; no bloquear hasta conocer las alergias.

**Resueltas el 2026-08-28** (texto completo en el bloque de ratificadas; no se reiteran como abiertas):
- ~~Búsqueda por descripción: rol y alcance (C)~~ → recepción + trabajo social (sucursal); admin/supervisor (organización).
- ~~Conservación de señas al identificarse (D)~~ → se conservan; solo secreto profesional.
- ~~Tipo de establecimiento / urgencias por sucursal (L)~~ → Central con urgencias; Norte y Sur solo ambulatorio.

**A. Roles y permisos.** ¿Se aceptan los 8 roles actuales como catálogo cerrado en Fase 1, con configurabilidad por
tenant en una fase posterior, o se necesita ya el permiso granular? *(Bloquea la autorización fina de M2, M3 y M7:
quién puede verificar identidad, rectificar, leer expediente y consultar auditoría. También afecta si existe el rol
`trabajo_social` / `supervisor` nombrados en la decisión C. Pregunta 19 del doc 06.)*

**G. Firma electrónica.** ¿Basta la firma electrónica del sistema con cadena de integridad y sello de tiempo, o se
requiere e.firma del SAT con validez jurídica plena? ¿Los médicos tienen e.firma vigente? *(Bloquea el cierre de M6 y
cualquier afirmación sobre el numeral 5.10. Preguntas 9 y 69.)*

**H. Reloj del último acto médico.** ¿Qué actos cuentan para el plazo de conservación: solo los que generan documento en
el expediente, o también dispensaciones y citas no asistidas? *(Bloquea `LastMedicalActAtUtc` en M7 y el motor de
retención de Fase 3. Pregunta 61.)*

**I. Expedientes con antecedentes prellenados.** ¿Se migran a `no_interrogado`, solo los nunca editados, o se marcan
como «origen: prellenado por el sistema» para que el clínico los confirme? *(No bloquea Fase 1 en Dev; bloquea la puesta
en marcha con datos preexistentes de un cliente. Pregunta 56.)*

**K. Alcance de controlados.** ¿Se confirma que estupefacientes y psicotrópicos quedan fuera de Fase 1 y que el sistema
debe **impedirlos** con mensaje explícito? *(Confirmación, no decisión nueva: pendiente 68 y pregunta 64. Si se
confirmara lo contrario, M8 cambia de tamaño y requiere trámite de recetarios ante la autoridad.)*

**M. Sexo biológico frente a identidad de género — RATIFICADO Opción B (2026-08-28).** Análisis y decisión en
[`14-sexo-genero-dgis.md`](14-sexo-genero-dgis.md). Sexo biológico para clínica/SEUL; género opcional para trato/GIIS;
prohibido fabricar género o usarlo en dosis. *(Desbloquea tipado M3; M5 sigue usando solo biológico. Hueco 54 abierto.)*

**N. Enmascaramiento del monitor de turnos.** ¿Se confirma que por omisión se muestra únicamente el número de turno?
*(Confirmación de menor riesgo; bloquea el monitor en M4/M10. Pregunta 21.)*

> **Nota de mapeo:** las respuestas del 2026-08-27 y 2026-08-28 se documentaron **tal como las formuló el usuario** en
> los bloques de ratificadas; no se forzaron a alternativas redactadas antes.

## 6. Puertas de avance

### 6.1 Puerta por módulo (idéntica para todos)

Un módulo está terminado cuando **todo** esto está verde y **ejecutado**, no supuesto:

1. Migración aplicada en Dev con `tools/apply-database.ps1` sin error y de forma **idempotente** (correrla dos veces no
   duplica ni pierde nada).
2. Ningún `DELETE`, `DROP` ni `TRUNCATE` en migración, SP ni script. Bajas por `IsDeleted` / reverso / addendum.
3. Todo SP nuevo recibe `@TenantId` y filtra por él; ninguno expone borrado físico.
4. Endpoints devuelven `ApiResponse<T>` con los códigos publicados en §2.
5. Escrituras clínicas pasan por la cola offline con `IdempotencyKey`; reintento devuelve `duplicate`, no duplica el
   hecho, y contenido distinto con la misma clave devuelve 409.
6. Lecturas que requieren enlace muestran antigüedad cuando salen de caché.
7. Ningún campo clínico con valor por omisión; los estados «no sé» de §3.2 existen y se presentan.
8. Unitarias nuevas en verde; integración del SP nuevo; contrato del endpoint nuevo; E2E del flujo con los SC del
   reparto de M12 fuera de `skip`.
9. `type-check` y `lint` del frontend en verde si se tocó el frontend.
10. `./tools/run-all-tests.ps1` corrido de verdad, con su resultado reportado por etapa.
11. Memoria viva actualizada según `.cursor/rules/medicore-cierre-de-tarea.mdc`, o declaración explícita de «sin cambios
    de memoria».

> Nota de estado: `docs/operacion/pruebas.md` registra que `type-check` y `lint` del frontend **hoy fallan** (deuda del
> prototipo migrado). El primer módulo que toque el frontend hereda esa deuda o la declara como bloqueo; no se puede
> cerrar un módulo de frontend con esas etapas en rojo.

### 6.2 Puerta de cierre de Fase 1

Del doc 11 §3: **SC bloqueantes en verde; paciente no identificado operable offline; cero campos administrativos
obligatorios en el ingreso a urgencias.** En detalle:

1. SC-01…SC-24 implementados y en verde contra **stack real** (API + BD), sin casos borrados del mapa. La discrepancia
   SC-25/SC-26 resuelta o documentada.
2. Un paciente inconsciente sin ningún dato se registra, se le emite etiqueta, se clasifica triage y se documenta la
   atención **con el Core caído**, y todo se reconcilia al volver el enlace sin duplicados (SC-13, SC-11, SC-19).
3. Dos estaciones offline en la misma sucursal no se confunden entre pacientes no identificados (SC-17), y cerrar sesión
   en una **no** cierra la otra (decisión del 2026-08-27).
4. Ninguna pantalla fabrica sexo, edad, alergias, antecedentes ni signos vitales; ningún nivel de triage por omisión.
5. Ninguna nota firmada es modificable por ninguna ruta del API.
6. Prescribir un controlado está impedido con mensaje explícito.
7. Lectura de expediente auditada; búsqueda por descripción auditada incluso sin resultado.
8. Los hechos reportables a DGIS/SINBA quedan **encolados**, con centinelas solo en capa de reporte; el Worker sigue
   negándose a arrancar con destino productivo.
9. `./tools/run-all-tests.ps1` en verde en Dev y en QA con el **mismo binario**.
10. `docs/operacion/pruebas.md` y `docs/operacion/ambientes.md` actualizados con el inventario real.

### 6.3 Puerta de «antes del primer paciente real»

**No se reescribe aquí.** Es la sección «Antes del primer paciente real» de
[`docs/operacion/ambientes.md`](../operacion/ambientes.md), y es independiente de esta fase: aprobar la puerta de Fase 1
**no** habilita `AllowRealPatientData`. Se suman los requisitos externos del doc 11 §2 (dictámenes de residencia y
encargo del tratamiento, entorno dedicado) y las decisiones abiertas 70 y 71.

---

## 7. Secuencia y paralelización

### 7.1 Grafo de dependencias

```
M1 ─┐
M2 ─┼─→ M3 ─→ M4 ─┬─→ M5 ─┐
M11─┘             │        ├─→ M10 ─→ M12
                  ├─→ M7 ─→ M6 ─→ M8 ─┘
M9 (independiente tras M1 + M3 + M11) ──────┘
```

- **Estrictamente secuencial:** M3 después de M2 y M11 · M4 después de M3 · M5 y M7 después de M4 · M6 después de M7 y
  M1 · M8 después de M6 · M10 después de M4, M5 y M9 · M12 al final.
- **Paralelizable sin fricción:** M1 ∥ M2 ∥ M11 al arranque. Después, M5 ∥ M7 (tocan tablas y carpetas distintas).
  M9 en paralelo con casi todo una vez existen M1, M3 y M11.

### 7.2 Workstreams con límites de archivos

Pensado para despachar agentes en paralelo. **Un archivo tiene un solo dueño por workstream activo.**

**WS-A — Profesional y sesión (M1)**
- `backend/database/migrations/0003_profesional_sanitario.sql`, `backend/database/procedures/professional/**`
- `backend/Models/Professional/**`, `backend/Business/Professional/**`, `backend/DataAccess/Professional/**`,
  `backend/Api/Controllers/ProfessionalsController.cs`
- Toca compartido: `backend/Models/Auth/AuthDtos.cs`, `backend/Business/Auth/AuthService.cs`,
  `backend/Api/Controllers/AuthController.cs` (solo `SessionDto` y `GET /api/auth/session`),
  `backend/Business/DependencyInjection.cs`
- Frontend: `frontend/src/api/professionals.ts`, `frontend/src/auth/session.ts`,
  `frontend/src/hooks/AuthProvider.tsx`, `frontend/src/pages/administracion/{medicos,especialidades}/**`
- Pruebas: `backend/Tests/MediCore.Business.Tests/Professional/**`, `tests/e2e/specs/01-auth-seguridad/**`

**WS-B — Tipos base y auditoría (M2)**
- `backend/database/migrations/0004_tipos_base_auditoria.sql`, `backend/database/procedures/audit/**`
- `backend/Models/Clinical/CommonTypes.cs`, `backend/Models/Audit/**`, `backend/Business/Audit/**`,
  `backend/DataAccess/Audit/**`, `backend/Api/Controllers/AuditController.cs`
- Frontend: `frontend/src/types/clinical.ts`, `frontend/src/api/audit.ts`,
  `frontend/src/pages/seguridad/auditoria/**`
- **Debe entregarse primero o muy pronto:** el resto depende de sus tipos. Mientras no exista, los demás workstreams no
  inventan tipos paralelos.

**WS-C — Establecimiento y tenant (M11)**
- `backend/database/migrations/0005_establecimiento.sql`, `backend/database/seeds/003_provision_tenant.sql`,
  `backend/database/procedures/tenant/**`
- `backend/Models/Tenant/**`, `backend/Business/Tenant/**`, `backend/DataAccess/Tenant/**`,
  `backend/Api/Controllers/BranchesController.cs`, `TenantController.cs`
- Frontend: `frontend/src/api/branches.ts`, `frontend/src/pages/administracion/sucursales/**`

**WS-D — Sujeto e identidad (M3)** *(inicia cuando WS-B publicó los tipos)*
- `0006_sujeto_identidad.sql`, `procedures/subject/**`
- `backend/Models/Subject/**`, `backend/Business/Subject/**`, `backend/DataAccess/Subject/**`,
  `backend/Api/Controllers/SubjectsController.cs`
- Frontend: `frontend/src/api/subjects.ts`, `frontend/src/pages/pacientes/**`, componente de cabecera de identidad
- Pruebas: `tests/e2e/specs/02-pacientes/**`

**WS-E — Episodio y urgencias (M4)** *(después de WS-D)*
- `0007_episodio_urgencias.sql`, `procedures/encounter/**`
- `backend/Models/Encounter/**`, `Business/Encounter/**`, `DataAccess/Encounter/**`,
  `Api/Controllers/EncountersController.cs`
- Frontend: `frontend/src/api/encounters.ts`, `frontend/src/pages/urgencias/**`,
  `frontend/src/pages/sala-espera/**`, `frontend/src/pages/monitor-turnos/**`
- Pruebas: `tests/e2e/specs/03-triage-urgencias/**`

**WS-F — Triage y signos (M5)** ∥ **WS-G — Expediente (M7)** *(ambos después de WS-E; no se pisan)*
- WS-F: `0008_triage_signos.sql`, `procedures/triage/**`, `Models|Business|DataAccess/Triage/**`,
  `Api/Controllers/TriageController.cs`, `frontend/src/api/triage.ts`, `frontend/src/pages/triage/**`,
  `frontend/src/utils/vitalValidation.ts`
- WS-G: `0009_expediente.sql`, `procedures/record/**`, `Models|Business|DataAccess/ClinicalRecord/**`,
  `Api/Controllers/ClinicalRecordController.cs`, `frontend/src/api/clinicalRecord.ts`,
  `frontend/src/pages/consultas/components/HistoriaClinica*.tsx`,
  `frontend/src/pages/pacientes/detalle/components/ExpedienteUnificado.tsx`
- **Frontera declarada:** ambos leen el episodio; **ninguno** modifica `EncountersController` ni las tablas de M4. Si
  hace falta un campo nuevo del episodio, se pide a WS-E.

**WS-H — Consulta y notas (M6)** *(después de WS-G y WS-A)*
- `0010_consulta_notas.sql`, `procedures/consult/**`, `Models|Business|DataAccess/Notes/**`,
  `Api/Controllers/NotesController.cs`, `frontend/src/api/notes.ts`, `frontend/src/pages/consultas/**`
  (salvo los archivos de historia clínica, que son de WS-G), `frontend/src/pages/normatividad/{egresos,referencias,notas-enfermeria}/**`

**WS-I — Receta (M8)** *(después de WS-H)*
- `0011_receta.sql`, `procedures/prescription/**`, `Models|Business|DataAccess/Prescription/**`,
  `Api/Controllers/PrescriptionsController.cs`, `MedicationsController.cs`,
  `frontend/src/api/prescriptions.ts`, `frontend/src/pages/recetas/**`,
  `frontend/src/pages/urgencias/components/UrgenciaRecetaCreator.tsx` *(único archivo de urgencias que WS-I toca;
  coordinar con WS-E)*

**WS-J — Agenda (M9)** *(paralelo desde que existen WS-A, WS-C, WS-D)*
- `0012_agenda.sql`, `procedures/schedule/**`, `Models|Business|DataAccess/Appointment/**`,
  `Api/Controllers/AppointmentsController.cs`, `frontend/src/api/appointments.ts`, `frontend/src/pages/agenda/**`

**WS-K — Live (M10)** *(al final)*
- `backend/Api/Hubs/**`, `frontend/src/sync/liveQueue.ts`, más el enganche en las páginas de cola (coordinar con WS-E
  y WS-J; WS-K **no** cambia contratos de API, solo agrega el hub)

### 7.3 Archivos de alta contención

Requieren turno explícito o cambio mínimo y acordado:

| Archivo | Quién lo toca y para qué |
|---|---|
| `backend/Business/DependencyInjection.cs` | Todos, una línea de registro por servicio. Cambios de una línea, sin reordenar |
| `backend/Api/Program.cs` | Solo WS-K (hub) y quien agregue política de autorización nueva |
| `frontend/src/router/config.tsx` | Cada workstream agrega su ruta; nadie reordena las ajenas |
| `frontend/src/components/feature/AppLayout.tsx` | Solo si el módulo agrega entrada de menú |
| `frontend/src/api/client.ts` | Nadie, salvo que se necesite un helper nuevo genérico |
| `frontend/src/sync/outboxQueue.ts` | Solo WS-B/WS-D si hace falta tipar `commandType`; el resto lo consume |
| `backend/Business/Sync/SyncService.cs` | **Alta contención real:** hoy solo registra idempotencia y encola DGIS. Cada módulo clínico necesita despachar su `commandType` al SP correspondiente. **Se despacha como turno único**, no en paralelo, o se refactoriza a un registro de handlers antes de abrir los workstreams clínicos |
| `tests/e2e/specs/06-seguridad-clinica/sc-mapa.spec.ts` | Cada workstream quita solo los `skip` de los SC de su reparto (§M12) |
| `tools/apply-database.ps1`, `tools/run-all-tests.ps1` | **Otro agente.** Ningún workstream de Fase 1 los edita; se le solicita el cambio |

### 7.4 Recomendación de despacho

Primera oleada: **WS-B**, **WS-A**, **WS-C** en paralelo, más la refactorización de `SyncService` a registro de handlers
como tarea corta y aislada (habilita todo lo clínico sin contención).
Segunda: **WS-D**, y **WS-J** si hay capacidad.
Tercera: **WS-E**.
Cuarta: **WS-F** ∥ **WS-G**.
Quinta: **WS-H**, luego **WS-I**.
Sexta: **WS-K** y **M12**.
