# Empuje en vivo (M10 / WS-K)

Hub SignalR de colas. Alineado a [`13-plan-fase-1.md`](../analisis/13-plan-fase-1.md) §M10.

## Endpoint

| Recurso | Notas |
|---|---|
| Hub `/hubs/clinical-queue` | JWT Bearer (también `?access_token=` para WebSocket). Autorizado. |
| `JoinBranch(branchId)` | Une al grupo `tenant:{tenantId}:branch:{branchId}` usando **TenantId del token**, nunca del body. |
| `LeaveBranch(branchId)` | Sale del grupo. |

## Eventos (payload sin PHI)

| Evento | Contenido |
|---|---|
| `queueChanged` | `branchId`, `encounterId?`, `reason`, `atUtc` |
| `triageChanged` | `branchId`, `encounterId`, `level?`, `levelPriority?`, `atUtc` |
| `appointmentChanged` | `branchId`, `appointmentId`, `state`, `atUtc` |
| `encounterStateChanged` | `branchId`, `encounterId`, `state`, `triageLevel?`, `atUtc` |

Quien recibe **vuelve a consultar la API** (fuente de verdad). El live es mejora de latencia.

## Offline / sin enlace

Sin conexión al hub: la UI muestra antigüedad de la última lectura y declara que no hay empuje en vivo (SC-09). No hay cola offline ni outbox para live (no es escritura).

## Monitor de turnos

Por omisión **sólo número de turno** (doc 06 #21 ratificada 2026-08-30). El hub no envía nombres.

## Pruebas

- Unitarias: `ClinicalQueueGroupsTests` (formato de grupo; aislamiento por tenant).
- Contrato: `tests/e2e/specs/00-smoke/api-clinical-queue-hub.spec.ts` (negotiate 401/200; `queueChanged` sin PHI; skip de aislamiento cruzado sin `MEDICORE_TENANT_B`).
- E2E SC-07 / SC-09 UI con dos contextos: siguen en mapa hasta Sync/M12; el producto ya muestra antigüedad en urgencias / sala / monitor.
