# Usuarios de tenant (admin)

Contrato HTTP del CRUD de cuentas del tenant. AuthZ: permiso efectivo `canAdminUsers`
(plantillas `admin` / `directivo` + SuperAdmin de plataforma). Break-glass **no** concede
este permiso.

## Endpoints

| Verbo | Ruta | Notas |
|---|---|---|
| `GET` | `/api/users?onlyActive=&search=` | Listado; sin `PasswordHash` |
| `GET` | `/api/users/{id}` | Detalle; **404** si otro tenant o baja lógica |
| `POST` | `/api/users` | Alta; username duplicado → **409**; rol `SuperAdmin` → **400** |
| `PUT` | `/api/users/{id}` | DisplayName, activo, roles, sucursales; desactivar → revoke-all (#75) |
| `DELETE` | `/api/users/{id}` | **Baja lógica** + revoke-all; auto-baja → **400** |
| `POST` | `/api/users/{id}/password` | Restablecimiento admin (sin current); revoke-all |

- `TenantId` desde claims JWT; nunca del cuerpo.
- `IsSuperAdmin` **no** se asigna por API (solo seed/plataforma).
- Roles: al menos uno; código `SuperAdmin` prohibido en admin de tenant.
- Sucursales: opcionales; deben existir y estar vigentes.
- Liga usuario↔profesional: vía [`profesionales.md`](profesionales.md) (`UserId` en médico).

## Persistencia

Migración `0019_user_admin.sql`: `IsDeleted` (+ `UpdatedAtUtc`) en `UserRole` / `UserBranch`
y `UpdatedAtUtc` en `[User]`. Reasignación de roles/sucursales = baja lógica + MERGE
(mismo patrón que consultorios).

SPs: `backend/database/procedures/user/sp_User.sql` (`THROW 503xx`).
Login (`sp_Auth_GetUser*`) filtra `UserRole`/`UserBranch` con `IsDeleted = 0`.

## Frontend

- `frontend/src/api/users.ts`
- `frontend/src/pages/administracion/usuarios/page.tsx` — listado/alta/edición/baja/contraseña

## Pruebas

- Unitarias: `backend/Tests/MediCore.Business.Tests/UserAdmin/TenantUserServiceTests.cs`
- Contrato: `tests/e2e/specs/00-smoke/api-users.spec.ts`
- UI: `tests/e2e/specs/10-admin/usuarios-ui.spec.ts`
