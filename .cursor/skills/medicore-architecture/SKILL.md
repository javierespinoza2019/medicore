---
name: medicore-architecture
description: >-
  Applies MediCore architecture decisions (no Edge, offline queue, outbox,
  multi-tenant SPs, PWA, hosting). Use when designing or coding APIs, workers,
  sync/offline, deployment, on-prem portability, or debating topology.
---

# MediCore — arquitectura

## Fuente

`docs/analisis/12-propuesta-final.md` + `docs/analisis/03-arquitectura-propuesta.md` + `docs/2- Arquitectura para Cruzar y comparar.txt`.

## Topología vigente

```
Estaciones (SPA/PWA) → Core API (.NET) → SQL Server (SPs)
                      ↘ Worker (outbox: DGIS fijo, CFDI/FHIR/RENAPO flags)
```

**Prohibido:** nodo Edge por sucursal, sync de expediente Edge↔Core, broker de mensajes en MVP, microservicios, BD-por-tenant.

## Offline

| Acción | Regla |
|---|---|
| Escribir | Siempre cola local + `IdempotencyKey` al capturar |
| Confirmar UI | Contra IndexedDB, no contra la red |
| Leer online | Servidor (verdad) |
| Leer offline | Caché mínima + antigüedad visible (SC-09) |
| Live | SignalR `/hubs/clinical-queue` para colas/sala cuando hay red (invalidación; ver `docs/operacion/live-cola.md`) |
| Logout | Purga lecturas; **no** borra cola de salida |

No prometas coordinación multiusuario offline.

## Capas .NET

Api → Business → DataAccess(SPs) → SQL. Worker separado para outbox.

## Integraciones

- **DGIS/SINBA:** siempre; outbox si no hay red; demo → destino no productivo.
- **CFDI / FHIR / RENAPO:** feature flags.
- On-prem: mismo artefacto; sin consolidar expediente al centro.

## Hospedaje

Shared = ventas. Dedicado antes de paciente real. Deploy escalonado de API solo en controlado.
Proveedor/región de Production y QA: **aplazados** (doc 06 §2 / #70 / #71) — no inventar.

## Sesiones (auth)

- Logout ordinario: **solo esta estación** (doc 06 #73).
- Revocación global (SP listo; endpoints pendientes): cambio de contraseña, bloqueo/baja admin,
  botón «cerrar en todos…»; **no** lockout por intentos (doc 06 #75).
  Detalle: `docs/operacion/auth-sesiones.md`.

## Roles (AuthZ)

Plantillas fijas (+ `trabajo_social`); permisos ajustables por tenant (matriz UI/API pendiente);
SuperAdmin solo plataforma; consulta de auditoría = admin/SuperAdmin (doc 06 §19).

## Portabilidad (Fase 0)

Sin APIs exclusivas de cloud en SPs; storage abstracto; `TenantId` siempre; diagnóstico exportable.
