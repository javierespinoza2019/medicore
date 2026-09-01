# Auth — sesiones (logout y revocación)

Política de producto (doc 06):

| Decisión | Regla |
|---|---|
| **#73** | `POST /api/auth/logout` revoca **solo** el refresh de esa estación. |
| **#75** (2026-08-30, opción A) | Revocación **global** (`sp_Auth_RevokeAllRefreshTokensForUser`) en: cambio de contraseña (cuando exista); bloqueo/baja admin; autogestión «cerrar en todos». **No** en lockout por intentos fallidos. |

## Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/logout` | Bearer + cookie refresh | Cierra **solo** esta estación (#73). Sin cookie válida → **400**. |
| `POST` | `/api/auth/sessions/revoke-all` | Bearer | Revoca **todas** las sesiones del usuario autenticado (#75 autogestión). Limpia la cookie de la estación que invoca. |
| `POST` | `/api/auth/users/{userId}/sessions/revoke-all` | Bearer, rol `admin` o SuperAdmin | Revoca todas las sesiones del usuario indicado (mismo tenant). Para baja/bloqueo admin. |
| `POST` | `/api/auth/change-password` | Bearer | Cambia contraseña; revoca **todas** las sesiones (#75). Body: `currentPassword`, `newPassword` (mín. 8). |
| `POST` | `/api/auth/break-glass` | Bearer | Acceso de emergencia #23. Body: `justification` (mín. 15), `permissionKeys[]` (máx. 5). Registra auditoría `security.break_glass.started`. |
| `GET` | `/api/auth/me` | Bearer | Snapshot de sesión: roles, permisos efectivos del tenant, concesiones break-glass activas. |

### Respuestas

- **200** `ApiResponse` con `success: true` y mensaje descriptivo.
- **401** sin token o token inválido.
- **403** admin intentando revocar sin permiso.
- **404** usuario objetivo no existe en el tenant (admin).

### Notas

- El cambio de contraseña debe invocar `revoke-all` del propio usuario cuando se implemente ese flujo.
- El lockout por 5 intentos fallidos **no** dispara revocación global (continuidad multi-estación en urgencias).
- Tras `sessions/revoke-all`, el access token actual sigue válido hasta expirar (~15 min); el cliente debe limpiar token local y redirigir a login.

## Break-glass — alerta y AuthZ API

- Tras `POST /api/auth/break-glass` exitoso, el servicio encola un mensaje en outbox canal **`security.alert`** (payload JSON con usuario, justificación y permisos concedidos).
- El **OutboxWorker** (`backend/Worker`) procesa ese canal con log de nivel **Warning** hasta existir canal de notificación real (correo, webhook, etc.).
- Los controllers clínicos (expediente, notas, recetas, triage, sujetos, auditoría, profesionales) evalúan **permisos efectivos** (`matriz tenant` + concesiones break-glass activas) vía `EffectivePermissionAccess`; break-glass **no** concede `canAdminUsers` ni `canVerAuditoria`.
- El frontend filtra menú y deep-links con `canAccessRoute(role, path, permissions)` cuando la sesión trae `permissions` de `/api/auth/me` o login/refresh.
