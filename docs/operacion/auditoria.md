# Auditoría (M2)

Consulta append-only de `dbo.AuditEvent`. Sin `DELETE`/`UPDATE` de eventos.

## Endpoints

| Verbo | Ruta | Notas |
|---|---|---|
| `GET` | `/api/audit/actor/{userId}?fromUtc&toUtc` | Por actor; rango por defecto ~30 días si el API aplica defaults |
| `GET` | `/api/audit/subject/{subjectId}?fromUtc&toUtc` | Por sujeto de atención |

- AuthZ: permiso efectivo `canVerAuditoria` (o SuperAdmin). Break-glass **no** lo concede.
- **No** hay listado global del tenant (el prototipo Readdy sí lo simulaba).
- No hay columna `resultado` (éxito/error): la UI lo muestra deshabilitado.

## DTO enriquecido

Además de los campos del evento: `actorDisplayName`, `actorUserName` (join a `dbo.User`).

## SPs

`backend/database/procedures/audit/sp_Audit.sql` — `Append`, `ListBySubject`, `ListByActor`.

## Frontend

- `frontend/src/api/audit.ts`
- `frontend/src/pages/seguridad/auditoria/page.tsx` — **layout Readdy**: toolbar (search +
  módulo/acción + Resultado N/D) + tabla (Fecha · Usuario · Acción · Módulo · Detalle ·
  Resultado · IP). Consulta por actor/sujeto + rango en fila secundaria compacta (sin listado
  global). Autocarga de la bitácora del usuario en sesión al abrir.

## Criterio de alineación UI

Layout Readdy + honestidad + API. «Done» no basta con contrato API solo (ver oleada Pacientes /
Auditoría 2026-09-10).

## Pruebas

Contrato / smoke según `docs/operacion/pruebas.md` (auditoría M2).
