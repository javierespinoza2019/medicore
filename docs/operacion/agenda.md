# Agenda (M9 / WS-J)

Contrato HTTP del módulo de agenda. Alineado a [`13-plan-fase-1.md`](../analisis/13-plan-fase-1.md) §M9.

## Endpoints entregados

| Verbo | Ruta | Notas |
|---|---|---|
| `GET` | `/api/consulting-rooms` | `branchId?`, `onlyActive` |
| `PUT` | `/api/consulting-rooms/{id}` | Upsert (entidad, no string) |
| `POST` | `/api/appointments` | Agendar; sujeto basta con `subjectId` (sin identidad completa) |
| `GET` | `/api/appointments` | `branchId`, `from`, `to`, `professionalId?`, `roomId?`, `mine?` |
| `GET` | `/api/appointments/{id}` | Detalle |
| `PUT` | `/api/appointments/{id}` | Reprogramar (horario / profesional / consultorio) |
| `POST` | `/api/appointments/{id}/state` | Cambio de estado; **cancelar exige motivo** |
| `GET` | `/api/appointments/by-subject/{subjectId}` | Historial del sujeto |

Códigos: 200, 400, 401, 404, **409** (traslape de profesional o consultorio).

## Fail closed «mi agenda»

Con `mine=true`, si la sesión **no** trae claim de profesional sanitario, la lista es **vacía**
(no el padrón completo). En UI, rol `medico` sin `doctorId` muestra el mismo criterio.

## Estados

`agendada | confirmada | atendida | no_asistio | cancelada`. Sin `DELETE` físico;
`AppointmentEvent` es append-only.

## Offline / SyncService

Handlers Full; SP en la misma TX que idempotencia.

| `commandType` | SP / acción |
|---|---|
| `appointment.create` | `sp_Appointment_Create` |
| `appointment.state` | `sp_Appointment_ChangeState` |

La UI puede escribir online por API o encolar offline.

## Seed Dev

`backend/database/seeds/005_dev_consulting_rooms.sql` — consultorios C-101 y C-102 en sucursal
CENTRAL (idempotente). Incluido en `tools/apply-database.ps1` (Dev/QA).

## Frontend

- `frontend/src/pages/agenda/page.tsx` — citas y consultorios por API; profesionales vía
  `listProfessionals` (sin `@/mocks/doctors` ni seed hardcodeado en UI).
- Componentes auxiliares de agenda (impreso ticket, tabs config, vista consultorios) consumen
  `useAgendaProfessionalsCatalog` → `/api/professionals` + `/api/specialties`.
- Cédula en ticket solo si el API la trae; no se fabrica.

## Pruebas

- Contrato: `tests/e2e/specs/00-smoke/api-appointments.spec.ts` (incluye caso
  «profesional del catálogo API»).
- UI: `tests/e2e/specs/05-agenda/agenda-ui.spec.ts` (chromium; Vite + API).

## Herramientas

`tools/apply-database.ps1` aplica la migración `0012_agenda.sql` (orden lexicográfico),
`procedures/schedule/sp_Appointment.sql` y el seed `005_dev_consulting_rooms.sql`.

Códigos SQL de negocio de agenda: `THROW 502xx` (rango propio; no colisiona con M4 `501xx`).
