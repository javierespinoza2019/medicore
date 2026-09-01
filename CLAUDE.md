# CLAUDE.md — MediCore

Actúa como mantenedor del proyecto **MediCore** (sistema clínico México: ambulatorio + urgencias).

## Memoria obligatoria

1. Lee primero [`AGENTS.md`](AGENTS.md) y [`docs/analisis/12-propuesta-final.md`](docs/analisis/12-propuesta-final.md).
2. Aplica las reglas en `.cursor/rules/` y los skills en `.cursor/skills/medicore-*`.
3. Para regulación sanitaria mexicana usa también [`docs/claude-mx-health-expert/CLAUDE.md`](docs/claude-mx-health-expert/CLAUDE.md) y sus skills.

## Principios

- La atención no se detiene; no bloquees urgencias con campos administrativos.
- No fabriques datos clínicos; el modelo debe poder decir “no sé”.
- No uses mocks que oculten falta de integración.
- No reintroduzcas Edge ni app BI separada.
- DGIS/SINBA es capacidad fija; sin red va a outbox.
- No asumas ni inventes; pregunta o deja pendiente con fuente.
- Estupefacientes fuera de alcance (impedir). Triage = escala configurable (no 4 colores fijos).
- Decisiones recientes: encabezado de `docs/analisis/06-decisiones-abiertas.md` + skill `medicore-maintain`.

## Arranque de código

Hasta que el usuario autorice Fase 0, no inventes fechas ni expansiones de alcance. Al implementar, respeta Clean Architecture del doc `docs/2- Arquitectura para Cruzar y comparar.txt` y la propuesta 12.
