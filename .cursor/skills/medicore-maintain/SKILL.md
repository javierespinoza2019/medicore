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
3. Revisar oleadas recientes en `docs/analisis/06-decisiones-abiertas.md` (arriba del doc).
4. Elegir skill satélite si aplica:
   - Arquitectura / sync / hospedaje → `medicore-architecture`
   - Triage, alergias, identidad, recetas, urgencias → `medicore-clinical-safety`
   - NOM, LFPDPPP, DGIS, privacidad → `medicore-regulatory`
5. Confirmar estructura: código vivo en `backend/` y `frontend/`; prototipo de referencia en `docs/frontend`.

## Estado (2026-08-30) — no reabrir sin el cliente

| Tema | Decisión | Pendiente de implementar |
|---|---|---|
| Firma (9/69) | A — integridad hash+sello; sin e.firma/NOM-151 en piloto | — |
| Roles (19) | B — plantillas + permisos por tenant; +`trabajo_social`; SuperAdmin plataforma; audit=admin | — |
| Controlados (64/68) | A — fuera de alcance; 422 = política | — |
| Hospedaje (2/70/71) | **Aplazado** | Proveedor/región Prod+QA |
| Establecimiento (10/L) | A — F1–4 ambulatorio+urgencias; demo Central urgencias | Domicilio/licencia/médico responsable concreto |
| Triage (63) | A — configurable; demo 5 niveles; sin 4 colores de producto | Sacar mocks residuales de 4 colores |
| Monitor (#21) | Solo número de turno | Opt-in nombre = futura |
| Revocación global (#75) | A — política: password / baja admin / «cerrar todos»; no lockout | — |
| Break-glass (#23) | Sí — justificación + alerta auditable | — |
| SaMD (#8) | Fuera de alcance F1–4 — documental/admin | — |

Trabajo de producto reciente: **uno a uno** (sin enjambre). Suite: `docs/operacion/pruebas.md`.

## Checklist antes de mergear un cambio

- [ ] No reintroduce Edge ni app BI separada
- [ ] No añade mocks al build demo/prod
- [ ] No fabrica datos clínicos por default
- [ ] SPs / TenantId / idempotencia respetados si hay persistencia
- [ ] Cero `DELETE` / `DROP` / `TRUNCATE` en SQL, migraciones o scripts (baja lógica + reverso)
- [ ] DGIS no se convierte en feature flag
- [ ] Urgencias no quedan bloqueadas por campos admin
- [ ] No reabre controlados, ni escala fija de triage, ni nombres en monitor, sin decisión escrita
- [ ] Tests: el módulo deja sus pruebas en este mismo cambio (`docs/operacion/pruebas.md`);
      aceptación solo contra stack real; sin `DELETE`/`TRUNCATE` para limpiar; IDs `SC-xx` intactos
- [ ] Memoria viva actualizada según `.cursor/rules/medicore-cierre-de-tarea.mdc` (doc 12, AGENTS,
      reglas, skills, `docs/operacion/**`, doc 06) — o declarar «sin cambios de memoria»

## Conflictos documentales

Si `docs/analisis/05` o `07` mencionan Edge como vigente, **ignorar** y seguir el 12. Opcional: corregir el párrafo obsoleto en la misma PR si el usuario lo pide.

## Hospedaje

- Shared (SmarterASP): solo demo sintético.
- No desplegar PHI a shared.
- Worker/outbox durable: entorno dedicado.
- Prod/QA concretos: **aplazados** (doc 06 §2 / #70 / #71).

## Suite completa

`./tools/run-all-tests.ps1` corre build, pruebas .NET, tipos/lint del frontend y E2E/contrato.
Usar `-Skip e2e` cuando el API no esté levantado. Nunca contra Production.

## Salida

Resumir qué se cambió, qué fase afecta, qué documentos de memoria se actualizaron, qué etapas de la
suite se corrieron realmente con su resultado, y si queda alguna decisión abierta del doc 06.
