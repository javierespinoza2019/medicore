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
3. Elegir skill satélite si aplica:
   - Arquitectura / sync / hospedaje → `medicore-architecture`
   - Triage, alergias, identidad, recetas, urgencias → `medicore-clinical-safety`
   - NOM, LFPDPPP, DGIS, privacidad → `medicore-regulatory`
4. Confirmar estructura: código vivo en `backend/` y `frontend/` (cuando existan); prototipo de referencia en `docs/frontend`.

## Checklist antes de mergear un cambio

- [ ] No reintroduce Edge ni app BI separada
- [ ] No añade mocks al build demo/prod
- [ ] No fabrica datos clínicos por default
- [ ] SPs / TenantId / idempotencia respetados si hay persistencia
- [ ] DGIS no se convierte en feature flag
- [ ] Urgencias no quedan bloqueadas por campos admin
- [ ] Tests: preferir E2E/API real; actualizar `e2e` o `tests/e2e` si el comportamiento cambia
- [ ] Docs: si cambia una decisión, actualizar doc 12 (y 03/06 si aplica)

## Conflictos documentales

Si `docs/analisis/05` o `07` mencionan Edge como vigente, **ignorar** y seguir el 12. Opcional: corregir el párrafo obsoleto en la misma PR si el usuario lo pide.

## Hospedaje

- Shared (SmarterASP): solo demo sintético.
- No desplegar PHI a shared.
- Worker/outbox durable: entorno dedicado.

## Salida

Resumir qué se cambió, qué fase afecta, y si queda alguna decisión abierta del doc 06.
