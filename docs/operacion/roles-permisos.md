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

## Auditoría

Consulta de bitácora (`GET /api/audit/*`) sigue restringida a `admin` + SuperAdmin hasta fase posterior, independiente de la matriz.

## Break-glass (#23)

Ratificado e implementado (2026-08-31). Contrato en [`auth-sesiones.md`](auth-sesiones.md). No sustituye esta matriz; concede permisos grantables temporalmente.
