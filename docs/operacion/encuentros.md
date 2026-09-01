# Episodio y urgencias (M4 / WS-E)

Contrato HTTP del módulo de episodio. Alineado a [`13-plan-fase-1.md`](../analisis/13-plan-fase-1.md) §M4.

## Endpoints entregados

| Verbo | Ruta | Notas |
|---|---|---|
| `POST` | `/api/encounters` | Sólo `branchId` + `subjectId` (+ tipo) → 200; `MinisterioPublicoNotified` inicia `null` |
| `GET` | `/api/encounters/{id}` | Detalle + etiqueta operativa del sujeto |
| `GET` | `/api/encounters/queue?branchId=` | Cola: sin clasificar → nivel (prioridad escala) → estado → llegada |
| `GET` | `/api/subjects/{subjectId}/encounters` | Historial por sujeto |
| `PUT` | `/api/encounters/{id}/admission` | Vía acceso, circunstancia, valoración MP (sí/no/no valorado) |
| `POST` | `/api/encounters/{id}/state` | Transición; cierre sin triage → **409** (SC-03); cierre con Rx sin firmar y sin `pendingPrescriptionsOverrideReason` → **409** (SC-04); sin justificación → **422** |
| `POST` | `/api/encounters/{id}/assign-professional` | Asigna `AttendingProfessionalId` |
| `POST` | `/api/encounters/{id}/mp-notice` | Hoja NOM-004 10.3; identidad provisional admitida |
| `POST` | `/api/encounters/{id}/care-without-consent` | Dos `ProfessionalId` distintos; mismo id → **409** |

## Offline / SyncService

Handlers Full registrados; el SP corre en la misma TX que idempotencia/outbox.

| `commandType` | SP / acción |
|---|---|
| `encounter.open` | `sp_Encounter_Open` |
| `encounter.admission` | `sp_Encounter_UpdateAdmissionData` |
| `encounter.state` | `sp_Encounter_TransitionState` |
| `encounter.assignProfessional` | `sp_Encounter_AssignProfessional` |
| `encounter.mpNotice` | `sp_MinisterioPublicoNotice_Create` |
| `encounter.careWithoutConsent` | `sp_EncounterCareWithoutConsent_Create` |

UI de ingreso (`NuevoIngresoModal`): escritura siempre a IndexedDB (`subject.create` +
`encounter.open`) con `clientSubjectId` / `clientEncounterId`; sync inmediato si hay enlace;
sin enlace deja pending y el drenado reintenta. El servidor respeta esos ids de estación.

La cola se lee del servidor con enlace; caché con antigüedad visible y empuje en vivo: [`live-cola.md`](live-cola.md) (M10).

## Salvaguardas

- Nada bloquea el ingreso (ni CURP, pago, consentimiento, identidad completa).
- `MinisterioPublicoNotified` = tres estados; nunca `false` por omisión al abrir.
- El sistema **sugiere** valorar aviso al MP; no determina ni bloquea. No se afirma fundamento penal.
- `Disposition` sin default a alta domicilio.
- **SC-04 — alta con recetas pendientes:** pendientes = `Prescription` del encuentro con
  `SignedAtUtc IS NULL`, `IsDeleted = 0`, `CancelledAtUtc IS NULL`. Sin
  `pendingPrescriptionsOverrideReason` → **409**. Con motivo → cierre permitido y, en la misma
  TX del SP, evento de auditoría
  `clinical_exception.discharge_with_pending_prescriptions` (DetailJson: `pendingCount` + `reason`).
  Aplica a HTTP `POST …/state` y a sync `encounter.state` (mismo campo en el payload).
- Monitor de turnos: **sólo número de turno** por omisión (doc 06 #21 ratificada 2026-08-30). Sin nombre/PHI en pantalla pública.
- `HasEmergencyService` en Branch puede ser NULL: el módulo opera igual (capacidad de producto).

## Pruebas

- Unitarias: `EncounterDomainTests` (cola, máquina de estados, care-without-consent, sugerencia MP,
  `PendingPrescriptionCloseRules` SC-04).
- Contrato: `tests/e2e/specs/00-smoke/api-encounters.spec.ts`.
- E2E SC-03/04 activos en `sc-mapa.spec.ts`; SC-07/19/20/24 UI: ver `03-triage-urgencias` / mapa.