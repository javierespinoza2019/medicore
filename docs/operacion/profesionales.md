# Profesionales sanitarios y especialidades (M1)

Contrato HTTP del CRUD administrativo de profesionales. Alineado a migración `0003_healthcare_professional.sql`
(esquema vigente: `FullName` + `SpecialtyId` en el profesional; catálogo `dbo.Specialty`).
Asignación a consultorio: `dbo.ConsultingRoomProfessional` (migración `0018`).

## Endpoints

| Verbo | Ruta | Notas |
|---|---|---|
| `GET` | `/api/professionals?onlyActive=&search=` | Listado del tenant (enriquecido) |
| `GET` | `/api/professionals/{id}` | Detalle; **404** si otro tenant o baja lógica |
| `POST` | `/api/professionals` | Alta; cédula duplicada → **409**; `roomId` opcional |
| `PUT` | `/api/professionals/{id}` | Actualización; `roomId` / `clearRoomAssignments` |
| `DELETE` | `/api/professionals/{id}` | **Baja lógica** (`IsDeleted=1`); no hay `DELETE` SQL |
| `GET` | `/api/specialties?onlyActive=` | Catálogo por tenant |
| `GET` | `/api/specialties/{id}` | Detalle |
| `PUT` | `/api/specialties/{id}` | Upsert (alta o edición) |
| `DELETE` | `/api/specialties/{id}` | Baja lógica |

- `TenantId` sale del claim JWT; nunca del cuerpo.
- Cédula y especialidad **admiten null** (no capturado); no se fabrican.
- Escritura: SuperAdmin / rol `admin` (AuthZ provisional pregunta A). Lectura también `medico`, `enfermeria`, `recepcion`.

### Campos enriquecidos (list/get)

| Campo | Origen |
|---|---|
| `linkedUserName` / `linkedUserDisplayName` | `dbo.User` ligado (`UserId`) |
| `primaryRoomId` / `primaryBranchId` / labels | Primer `ConsultingRoomProfessional` vigente |
| `branchNames` / `roomLabels` | Agregado de asignaciones vigentes |

No hay teléfono, horario laboral, estado «vacaciones» ni imagen de firma en el profesional: la UI los muestra deshabilitados u omite (piloto = firma de integridad en documentos, decisión 9/69).

### Consultorio principal

`roomId` en create/update sincroniza CRP al modelo del prototipo (un consultorio): baja lógica del resto de ligas del profesional y deja activa la elegida. `clearRoomAssignments: true` limpia todas. Asignaciones múltiples siguen posibles vía upsert de consultorio en agenda/sucursales.

`BranchNames` / `RoomLabels` se agregan en `OUTER APPLY` **separados** (SQL Server Msg 8711: no dos `STRING_AGG … WITHIN GROUP` con `ORDER BY` distintos en el mismo SELECT).

## SPs

`backend/database/procedures/professional/sp_HealthcareProfessional.sql` y `sp_Specialty.sql`
(incluye `sp_HealthcareProfessional_SyncPrimaryRoom`). Aplicados por `tools/apply-database.ps1`.

## Frontend

- `frontend/src/api/professionals.ts` — sin mocks.
- `frontend/src/pages/administracion/medicos/page.tsx` — listado/modal alineados a Readdy
  (`docs/frontend/.../medicos`); especialidades en `especialidades/page.tsx` (icon chip, empty
  state, baja Readdy; descripción/icono/color sin columna = honestos).
- Agenda (página + impresos/config auxiliares) también consume este API; ver [`agenda.md`](agenda.md).

## Pruebas

- Unitarias: `backend/Tests/MediCore.Business.Tests/Professional/ProfessionalAccessTests.cs`
- Contrato: `tests/e2e/specs/00-smoke/api-professionals.spec.ts`
- E2E chromium (UI admin, API real): `tests/e2e/specs/10-admin/profesionales-especialidades-ui.spec.ts`
