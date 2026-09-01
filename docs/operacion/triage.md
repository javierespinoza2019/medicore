# Triage y signos vitales (M5 / WS-F)

Contrato HTTP del módulo de triage. Alineado a [`13-plan-fase-1.md`](../analisis/13-plan-fase-1.md) §M5.

## Endpoints entregados

| Verbo | Ruta | Notas |
|---|---|---|
| `GET` | `/api/branches/{branchId}/triage-scale` | Escala efectiva (cascada **sucursal > tenant**) |
| `PUT` | `/api/tenant/triage-scale` | Upsert ámbito tenant |
| `PUT` | `/api/branches/{branchId}/triage-scale` | Upsert ámbito sucursal (gana sobre tenant) |
| `POST` | `/api/encounters/{id}/triage` | Guarda triage; `level` null = sin clasificar; signos opcionales → 200 |
| `GET` | `/api/encounters/{id}/triage` | Triage vigente del episodio |
| `POST` | `/api/encounters/{id}/triage/reclassify` | Reclasificación (exige `ProfessionalId`; 403 si falta) |
| `POST` | `/api/encounters/{id}/vitals` | Append de set de signos (evolución u otro) |
| `GET` | `/api/encounters/{id}/vitals` | Historial de sets |

## Offline / SyncService

Handlers Full: el SP corre en la misma TX que idempotencia.

| `commandType` | Uso |
|---|---|
| `triage.save` | `sp_Triage_Save` (+ escala efectiva en prep-read) |
| `triage.reclassify` | `sp_Triage_Reclassify` (exige ProfessionalId; 403) |
| `vitals.append` | `sp_VitalSigns_Append` |

La escala efectiva se cachea con antigüedad visible (misma necesidad que establecimiento). Lectura con enlace; sin outbox en Fase 1.

## Salvaguardas

- Escala **configurable** por tenant/sucursal (cascada); cada tenant puede cambiar número y contenido de niveles (doc 06 §63, 2026-08-30).
- Producto **sin** Manchester / ESI / cuatro colores hardcodeados como escala oficial; **no** se afirma cumplimiento de norma mexicana de escala de triage.
- Seed Dev: `escala_sintetica_demo_v1` (5 niveles `prioridad_1`…`prioridad_5`) — ficticia, documentada en `seeds/006_dev_triage_scale.sql`.
- UI clínica (`pages/triage`, cola de urgencias): presenta códigos/etiquetas de la **escala efectiva**. Pantallas residuales con mocks de 4 colores = deuda hasta sacar mocks.
- Ningún signo obligatorio; faltantes = `no_medido` / «no tomado» con razón. Prohibido `?? 0`.
- Ningún nivel por omisión (SC-03). Cierre sin `Level` no nulo → 409 (M4).
- Sexo para rangos: sólo `BiologicalSex` (opción B). No `GenderIdentity`.
- Nada bloquea iniciar triage por falta de identidad.
- Cola: sin clasificar (prioridad 0) → nivel → estado → llegada.

## Pruebas

- Unitarias: `TriageDomainTests` (normalización no_tomado, cascada de nivel, orden de cola con prioridad).
- Contrato: `tests/e2e/specs/00-smoke/api-triage.spec.ts`.
- E2E UI SC-03/08/10/14: siguen en skip hasta Sync handlers + endurecimiento UI (`03-triage-urgencias`).

## Aplicación de BD

Migración `0008_triage_signos.sql`, SPs `procedures/triage/sp_Triage.sql`, seed `006_dev_triage_scale.sql`.
Seed `006` ya corre en `tools/apply-database.ps1` (Dev/QA). Pendiente operativo: incluir
`procedures/triage/sp_Triage.sql` en el mismo script (archivo de alta contención).
