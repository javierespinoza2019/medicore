# MediCore — Establecimiento y tenant (M11 / WS-C)

Contrato HTTP del módulo de datos del establecimiento (NOM-004 5.2–5.2.4).
Aprovisionamiento de tenants: script manual (`seeds/003_provision_tenant.sql`), no endpoint.

## Rutas

| Verbo | Ruta | Auth | Códigos |
|---|---|---|---|
| `GET` | `/api/branches?onlyActive=` | JWT | 200, 401 |
| `GET` | `/api/branches/{id}` | JWT | 200, 401, 404 |
| `PUT` | `/api/branches/{id}` | JWT | 200, 400, 401, 404 |
| `GET` | `/api/branches/{id}/logo` | JWT | 200 (bytes), 401, 404 |
| `PUT` | `/api/branches/{id}/logo` | JWT + permiso admin | 200, 400, 401, 403, 404 |
| `DELETE` | `/api/branches/{id}/logo` | JWT + permiso admin | 200, 401, 403, 404 |
| `GET` | `/api/tenant/profile` | JWT | 200, 401, 404 |
| `PUT` | `/api/tenant/profile` | JWT | 200, 400, 401, 404 |
| `GET` | `/api/tenant/logo` | JWT | 200 (bytes), 401, 404 |
| `PUT` | `/api/tenant/logo` | JWT + permiso admin | 200, 400, 401, 403, 404 |
| `DELETE` | `/api/tenant/logo` | JWT + permiso admin | 200, 401, 403, 404 |

- `TenantId` sale del claim JWT; nunca del cuerpo.
- Sucursal cuyo `BranchId` pertenece a otro tenant: **404** (no 403 — no se confirma existencia).
- `PUT /api/branches/{id}` con id nuevo = upsert (alta) en el tenant del token.
- `FacilityType` y `HasEmergencyService` admiten `null` (no se inventan en API ni en `003`). Tipología del tenant **demo** la fija el seed `002` (doc 06 §10 / L). Valores nulos se muestran como «No capturado».
- Logo upload/clear: SuperAdmin, o permisos efectivos de catálogos o de usuarios (`CanManageCatalogs` / `CanManageUsers`).
- `GET .../logo` de sucursal: variante de branch si existe; si no, logo del tenant; si ninguno, 404.

## DTOs (camelCase)

`BranchDto`: `branchId`, `tenantId`, `code`, `name`, `facilityType`, `legalName`, domicilio
(`addressStreet`…`addressPostalCode`), `phoneNumber`, `healthLicense`,
`responsiblePhysicianProfessionalId`, `timeZoneId`, `hasEmergencyService`, `isActive`,
`logoRelativePath`.

`TenantProfileDto`: `tenantId`, `code`, `name`, `legalName`, `rfc`, `primaryColorToken`,
`logoRelativePath`, `isActive`.

## White-label

- **`primaryColorToken`**: hex (`#0EA5E9`) u OKLCH (`0.55 0.195 250` / `oklch(...)`). La SPA
  aplica la escala `--primary-*` en el contenedor de tema tras login (`BrandColorSync`).
  Vacío/null = paleta por defecto del design system. Solo a nivel tenant.
- **Logo**: tenant (organización) y opcional por sucursal. Archivos bajo
  `files/{TenantCode}/{Tenant|Branches}/{entityId}/logo.{ext}` (ruta relativa en BD).
  Imágenes: `.jpg` / `.jpeg` / `.png` / `.gif`, máx. 2 MB. UI: Administración → Sucursales;
  `InstitucionalLogo` consume `GET` (sucursal actual → fallback tenant → icono). Sin sesión =
  icono por defecto.

## UI Sucursales (alineación Readdy)

- Tarjetas expandibles con consultorios anidados vía `GET/PUT /api/consulting-rooms`
  (mismo contrato que agenda; ver [`agenda.md`](agenda.md)).
- Correo / horario / días de operación y piso/tipo de consultorio: **no capturados** (sin
  columna); visibles deshabilitados. No se inventa schema.
- `FacilityType` / urgencias: se preservan; edición tipológica bloqueada hasta doc 06 L.

## Pruebas de contrato

`tests/e2e/specs/00-smoke/api-branches.spec.ts` (proyecto Playwright `contrato-api`), incluye
PUT de `primaryColorToken` y ciclo logo tenant (PUT/GET/DELETE). UI:
`tests/e2e/specs/10-admin/white-label-ui.spec.ts`.
