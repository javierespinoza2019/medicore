---
name: medicore-maintain
description: >-
  Maintains the MediCore codebase safely. Use when the user asks to maintain,
  fix, refactor, continue MediCore, resume work, implement a phase, or touch
  backend/frontend/e2e/docs in this repo. Enforces proposal 12 and project rules.
---

# MediCore — mantenimiento

## Al iniciar cualquier tarea

1. Leer `AGENTS.md` y `docs/analisis/12-propuesta-final.md`.
2. Identificar fase (0/D/1–4) y no expandir alcance (hospital, Edge, estupefacientes).
3. Revisar oleadas recientes en `docs/analisis/06-decisiones-abiertas.md` (arriba del doc)
   y el board `docs/operacion/agent-coordination-board.md`.
4. Elegir skill satélite si aplica:
   - Arquitectura / sync / hospedaje / PWA deploy → `medicore-architecture`
   - Triage, alergias, identidad, recetas, urgencias → `medicore-clinical-safety`
   - NOM, LFPDPPP, DGIS, privacidad → `medicore-regulatory`
5. Confirmar estructura: código vivo en `backend/` y `frontend/`; prototipo de referencia en `docs/frontend`.

## Estado de producto (2026-09-10)

### Decisiones ratificadas (no reabrir sin el cliente)

| Tema | Decisión | Pendiente |
|---|---|---|
| Firma (9/69) | A — integridad hash+sello; sin e.firma/NOM-151 en piloto | — |
| Roles (19) | B — plantillas + permisos por tenant; +`trabajo_social`; SuperAdmin plataforma; audit=admin | — |
| Controlados (64/68) | A — fuera de alcance; 422 = política | — |
| Hospedaje (2/70/71) | **Aplazado** | Proveedor/región Prod+QA |
| Establecimiento (10/L) | A — F1–4 ambulatorio+urgencias | Domicilio/licencia/médico responsable concreto |
| Triage (63) | A — configurable; demo 5 niveles | — |
| Monitor (#21) | Solo número de turno | Opt-in nombre = futura |
| Revocación global (#75) | A — política entregada (endpoints) | — |
| Break-glass (#23) | Sí | — |
| Foto paciente (#44) | Sí — entregada | — |
| IVA / servicios (#7/#67) | Abierto | No inventar tasas en UI |

### Oleada UI vs Readdy (2026-09-08 → 09-10)

Alineación menú completo con **API real + honestidad** (sin mocks). Docs de módulo en `docs/operacion/`:
`usuarios`, `establecimiento`/`catalogos`, `roles-permisos`, `auditoria`, `normatividad`,
`finanzas`, `clinico`, `pacientes`, `operacion`, `dashboard`.

**Criterio de «alineado» (obligatorio — corrección 2026-09-10):**

1. Leer el **JSX/return** de `docs/frontend/.../page.tsx` (no solo mocks/API).
2. Checklist de **layout**: header/acciones, ribbon/stats, toolbar, filas/tabla, empty, acciones.
3. Campos sin API → disabled / «No capturado» / N/D — **no omitir el chrome** del prototipo.
4. «Done» = **layout + honestidad + API** (si hay contrato). Solo contrato ≠ alineado.

Fallos ya corregidos con ese criterio: listado Pacientes; Auditoría (toolbar + orden columnas).

Pendiente UX (decidido diferir): etiquetas ES de `eventType` en auditoría (`medication.upsert` etc.).

### Ciclo de calidad

Plan por módulos listo para ejecución: [`docs/operacion/plan-pruebas-ciclo-calidad.md`](../../docs/operacion/plan-pruebas-ciclo-calidad.md).
Oleadas O1–O5; seguridad «pentest light» automatizable (IDOR/JWT/roles) — **sin** ataques ofensivos a demo/prod.
Estado board: plan **ready** (aún sin ejecución completa al 2026-09-10).

Trabajo: **uno a uno** (sin enjambre). Suite base: `docs/operacion/pruebas.md` + `tools/run-all-tests.ps1`.

## Checklist antes de mergear un cambio

- [ ] No reintroduce Edge ni app BI separada
- [ ] No añade mocks al build demo/prod
- [ ] No fabrica datos clínicos por default
- [ ] SPs / TenantId / idempotencia respetados si hay persistencia
- [ ] Cero `DELETE` / `DROP` / `TRUNCATE` en SQL, migraciones o scripts (baja lógica + reverso)
- [ ] DGIS no se convierte en feature flag
- [ ] Urgencias no quedan bloqueadas por campos admin
- [ ] No reabre controlados, ni escala fija de triage, ni nombres en monitor, sin decisión escrita
- [ ] Si toca UI vs prototipo: criterio layout Readdy (arriba) aplicado o explícitamente N/A
- [ ] Tests: el módulo deja sus pruebas (`pruebas.md` / plan ciclo); aceptación solo stack real
- [ ] Memoria viva actualizada según `.cursor/rules/medicore-cierre-de-tarea.mdc` — o «sin cambios de memoria»

## Conflictos documentales

Si `docs/analisis/05` o `07` mencionan Edge como vigente, **ignorar** y seguir el 12.

## Hospedaje / demo

- Shared (Site4Now / SmarterASP): solo demo sintético — SPA `medi-core.app`, API `api.medi-core.app`.
- Tras republicar SPA: hard refresh / clear SW si Workbox `bad-precaching-response` 403 (asset hash viejo).
- Worker/outbox durable: entorno dedicado. Prod/QA concretos: **aplazados**.

## Suite completa

`./tools/run-all-tests.ps1` → build → test → frontend → e2e.  
`-Skip e2e` si API no está arriba. Nunca Production. Plan enriquecido: `plan-pruebas-ciclo-calidad.md`.

## Salida

Resumir qué se cambió, fase, documentos de memoria, etapas de suite **realmente** corridas con resultado,
decisiones abiertas del doc 06 si aplica.
