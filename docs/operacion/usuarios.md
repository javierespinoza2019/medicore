# Usuarios de tenant (admin)

Contrato HTTP del CRUD de cuentas del tenant. AuthZ: permiso efectivo `canAdminUsers`
(plantillas `admin` / `directivo` + SuperAdmin de plataforma). Break-glass **no** concede
este permiso.

UI alineada al prototipo Readdy (`docs/frontend` / preview administracion/usuarios).

## Endpoints

| Verbo | Ruta | Notas |
|---|---|---|
| `GET` | `/api/users?onlyActive=&search=` | Listado enriquecido; sin `PasswordHash` |
| `GET` | `/api/users/{id}` | Detalle; **404** si otro tenant o baja lógica |
| `POST` | `/api/users` | Alta; username duplicado → **409**; rol `SuperAdmin` → **400** |
| `PUT` | `/api/users/{id}` | DisplayName, `status`/`isActive`, roles, sucursales; desactivar o bloquear → revoke-all (#75) |
| `DELETE` | `/api/users/{id}` | **Baja lógica** + revoke-all; auto-baja → **400** |
| `POST` | `/api/users/{id}/password` | Restablecimiento admin (sin current); limpia lockout + revoke-all |

- `TenantId` desde claims JWT; nunca del cuerpo.
- `IsSuperAdmin` **no** se asigna por API (solo seed/plataforma).
- Roles: al menos uno; código `SuperAdmin` prohibido en admin de tenant.
- Sucursales: en UI se exige ≥1; API sigue aceptando lista vacía en contrato.
- Liga usuario↔profesional: vía [`profesionales.md`](profesionales.md) (`UserId` en médico) → cédula/especialidad en listado.

## Campos de listado (DTO)

| Campo | Origen |
|---|---|
| `userName` / `displayName` | `[User]` — acceso (suele ser correo) y nombre visible |
| `status` | Derivado: `bloqueado` si `LockoutUntilUtc` vigente; si no, `activo`/`inactivo` por `IsActive` |
| `isLockedOut` / `lockoutUntilUtc` | Lockout de auth (intentos o bloqueo admin) |
| `roleCodes` / `branchIds` | `UserRole` / `UserBranch` vigentes |
| `professionalLicense` / `specialtyName` | `HealthcareProfessional` + `Specialty` ligados (nullable) |
| `lastAccessUtc` | `MAX(RefreshToken.CreatedAtUtc)` — proxy de último acceso; no inventa si nunca hubo token |

`PUT` acepta `status`: `activo` | `inactivo` | `bloqueado` (bloqueado = `IsActive=1` + `LockoutUntilUtc` lejano). Compat: si `status` omite, usa `isActive`.

## Persistencia

Migración `0019_user_admin.sql`: `IsDeleted` (+ `UpdatedAtUtc`) en `UserRole` / `UserBranch`
y `UpdatedAtUtc` en `[User]`. Sin migración nueva para listado enriquecido (usa columnas/tablas existentes).

SPs: `backend/database/procedures/user/sp_User.sql` (`THROW 503xx`).
Aplicar `sp_User.sql` en cada ambiente al desplegar.

## Frontend

- `frontend/src/api/users.ts`
- `frontend/src/pages/administracion/usuarios/page.tsx` — listado Readdy + modal:
  - Nombre / Apellidos → `displayName`
  - Correo → `userName` (acceso)
  - Rol (select único) → `roleCodes[0]`
  - Estado → `status`
  - Sucursales (tarjetas) → `branchIds`
  - Teléfono: visible deshabilitado (aún no hay campo en cuenta)
  - Cédula/especialidad (rol médico): solo lectura si hay profesional ligado
  - Contraseña inicial: solo alta (requerida por API)

## Pruebas

- Unitarias: `backend/Tests/MediCore.Business.Tests/UserAdmin/TenantUserServiceTests.cs`
- Contrato: `tests/e2e/specs/00-smoke/api-users.spec.ts`
- UI: `tests/e2e/specs/10-admin/usuarios-ui.spec.ts`
