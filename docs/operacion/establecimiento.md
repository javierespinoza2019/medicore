# MediCore — Establecimiento y tenant (M11 / WS-C)

Contrato HTTP del módulo de datos del establecimiento (NOM-004 5.2–5.2.4).
Aprovisionamiento de tenants: script manual (`seeds/003_provision_tenant.sql`), no endpoint.

## Rutas

| Verbo | Ruta | Auth | Códigos |
|---|---|---|---|
| `GET` | `/api/branches?onlyActive=` | JWT | 200, 401 |
| `GET` | `/api/branches/{id}` | JWT | 200, 401, 404 |
| `PUT` | `/api/branches/{id}` | JWT | 200, 400, 401, 404 |
| `GET` | `/api/tenant/profile` | JWT | 200, 401, 404 |
| `PUT` | `/api/tenant/profile` | JWT | 200, 400, 401, 404 |

- `TenantId` sale del claim JWT; nunca del cuerpo.
- Sucursal cuyo `BranchId` pertenece a otro tenant: **404** (no 403 — no se confirma existencia).
- `PUT /api/branches/{id}` con id nuevo = upsert (alta) en el tenant del token.
- `FacilityType` y `HasEmergencyService` admiten `null` (no se inventan en API ni en `003`). Tipología del tenant **demo** la fija el seed `002` (doc 06 §10 / L). Valores nulos se muestran como «No capturado».

## DTOs (camelCase)

`BranchDto`: `branchId`, `tenantId`, `code`, `name`, `facilityType`, `legalName`, domicilio
(`addressStreet`…`addressPostalCode`), `phoneNumber`, `healthLicense`,
`responsiblePhysicianProfessionalId`, `timeZoneId`, `hasEmergencyService`, `isActive`.

`TenantProfileDto`: `tenantId`, `code`, `name`, `legalName`, `rfc`, `primaryColorToken`, `isActive`.

## Pruebas de contrato

`tests/e2e/specs/00-smoke/api-branches.spec.ts` (proyecto Playwright `contrato-api`).
