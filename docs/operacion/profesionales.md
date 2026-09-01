# Profesionales sanitarios y especialidades (M1)

Contrato HTTP del CRUD administrativo de profesionales. Alineado a migración `0003_healthcare_professional.sql`
(esquema vigente: `FullName` + `SpecialtyId` en el profesional; catálogo `dbo.Specialty`).

## Endpoints

| Verbo | Ruta | Notas |
|---|---|---|
| `GET` | `/api/professionals?onlyActive=&search=` | Listado del tenant |
| `GET` | `/api/professionals/{id}` | Detalle; **404** si otro tenant o baja lógica |
| `POST` | `/api/professionals` | Alta; cédula duplicada → **409** |
| `PUT` | `/api/professionals/{id}` | Actualización; cédula opcional (`clearProfessionalLicense`) |
| `DELETE` | `/api/professionals/{id}` | **Baja lógica** (`IsDeleted=1`); no hay `DELETE` SQL |
| `GET` | `/api/specialties?onlyActive=` | Catálogo por tenant |
| `GET` | `/api/specialties/{id}` | Detalle |
| `PUT` | `/api/specialties/{id}` | Upsert (alta o edición) |
| `DELETE` | `/api/specialties/{id}` | Baja lógica |

- `TenantId` sale del claim JWT; nunca del cuerpo.
- Cédula y especialidad **admiten null** (no capturado); no se fabrican.
- Escritura: SuperAdmin / rol `admin` (AuthZ provisional pregunta A). Lectura también `medico`, `enfermeria`, `recepcion`.

## SPs

`backend/database/procedures/professional/sp_HealthcareProfessional.sql` y `sp_Specialty.sql`.
Aplicados por `tools/apply-database.ps1`.

## Frontend

- `frontend/src/api/professionals.ts` — sin mocks.
- `frontend/src/pages/administracion/medicos/page.tsx` y `especialidades/page.tsx` consumen API real.
- Agenda (página + impresos/config auxiliares) también consume este API; ver [`agenda.md`](agenda.md).
  Deuda residual de `@/mocks/doctors` fuera de agenda: FHIR, estudios, vigilancia, referencias,
  egresos, usuarios/servicios admin, `FirmaDigital`, `mocks/reportes.ts`.

## Pruebas

- Unitarias: `backend/Tests/MediCore.Business.Tests/Professional/ProfessionalAccessTests.cs`
- Contrato: `tests/e2e/specs/00-smoke/api-professionals.spec.ts`
- E2E chromium (UI admin, API real): `tests/e2e/specs/10-admin/profesionales-especialidades-ui.spec.ts`
