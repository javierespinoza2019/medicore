# MediCore frontend

PWA clínica. Migrado desde `docs/frontend` (prototipo de referencia).

## Fase 0 añadido

| Ruta | Rol |
|---|---|
| `src/api/client.ts` | HTTP + Bearer + refresh cookie |
| `src/sync/outboxQueue.ts` | Cola IndexedDB + idempotencia |
| `src/auth/session.ts` | Traduce la respuesta del API al modelo de sesión de la app |
| `src/config/environment.ts` | Variables por ambiente (API, tenant, banner) |

## Autenticación

El acceso ya **no** usa datos simulados: `useAuth` autentica contra `POST /api/auth/login` y
reanuda la sesión con la cookie `httpOnly` de refresh (`POST /api/auth/refresh`). El usuario no se
rehidrata desde `localStorage`; sólo se recuerda la sucursal seleccionada.

Rol y sucursales vienen del servidor. Los campos que el backend todavía no modela (correo,
teléfono, cédula, especialidad, `doctorId`) quedan vacíos a propósito; el pendiente está registrado
en `docs/analisis/06-decisiones-abiertas.md` (19-bis).

## Importante

- `src/mocks/` es **legado del prototipo**. No usar en builds demo/staging/prod.
  El módulo de sesión aún depende de `src/mocks/users.ts` sólo para el tipo `User` y las etiquetas
  de rol.
- Escritura de negocio: cola local → `POST /api/sync/commands`.
- Logout debe purgar caché de lectura; **no** borrar la cola de salida.

## Dev

```bash
npm install
npm run dev
```

Proxy `/api` → `http://localhost:5080`.
