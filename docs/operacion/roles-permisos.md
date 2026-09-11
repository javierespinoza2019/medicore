# Roles y permisos por tenant

Decisión doc 06 §19 (opción B): plantillas fijas; permisos ajustables por tenant. Sin nombres de rol libres.

## Plantillas de rol (tenant)

| Code | Nombre |
|---|---|
| `admin` | Administrador |
| `medico` | Médico |
| `recepcion` | Recepción |
| `enfermeria` | Enfermería |
| `caja` | Caja y Cobros |
| `farmacia` | Farmacia |
| `laboratorio` | Laboratorio |
| `directivo` | Directivo |
| `trabajo_social` | Trabajo social |

`SuperAdmin` es **solo de plataforma** (no aparece en la matriz de tenant).

## API

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/roles/permission-matrix` | `admin` o SuperAdmin | Matriz efectiva: plantillas, catálogo de permisos y flags por rol. |
| `PUT` | `/api/roles/{roleCode}/permissions` | `admin` o SuperAdmin | Guarda permisos efectivos de una plantilla para el tenant. |

### Permisos (`PermissionKey`)

Alineados con `frontend/src/utils/permissions.ts`:

`canCreatePatient`, `canEditPatient`, `canDeletePatient`, `canCreateConsulta`, `canEditConsulta`, `canCreateReceta`, `canDispensar`, `canCobrar`, `canCerrarCaja`, `canAdminUsers`, `canAdminMedicos`, `canAdminCatalogos`, `canVerAuditoria`, `canEditTriage`, `canAtenderUrgencia`, `canVerEstadisticas`, `canExportar`.

Sin fila en `TenantRolePermissionConfig` → se usan los defaults de plantilla (misma matriz que el prototipo).

Login, refresh y `GET /api/auth/me` devuelven `permissions` efectivos del tenant; el front los usa en `PermissionGate` (sustituyen `rolePermissions` estático cuando el servidor los envía).

## Frontend

`frontend/src/pages/seguridad/roles/page.tsx` — cards estilo Readdy (stats, cobertura, preview
de matriz, modal de edición). **Nuevo / Duplicar / Eliminar** deshabilitados (plantillas
cerradas §19). Catálogo de permisos = API, no el mock granular del prototipo.

## Auditoría

Consulta: permiso efectivo `canVerAuditoria` (ver [`auditoria.md`](auditoria.md)). Doc 06 §19
hablaba de admin+SuperAdmin; la matriz puede conceder el bit a otras plantillas.

## Búsqueda por descripción (SC-23)

AuthZ efectiva (`EffectivePermissionAccess.CanSearchSubjectByDescription`):

- **Sí:** SuperAdmin, `canAdminUsers` (admin/directivo), o `canEditPatient` **sin**
  `canCreateConsulta`/`canEditConsulta` (recepción / trabajo social).
- **No:** médico (u otros con consulta clínica), aunque tengan `canEditPatient`.

Alineado a `SubjectAccess` (org vs sucursal). Doc 06 §48 sigue abierto para rol definitivo.

## Break-glass (#23)

Ratificado e implementado (2026-08-31). Contrato en [`auth-sesiones.md`](auth-sesiones.md). No sustituye esta matriz; concede permisos grantables temporalmente.
