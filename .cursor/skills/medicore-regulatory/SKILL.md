---
name: medicore-regulatory
description: >-
  Applies Mexican health regulatory practice for MediCore using the local
  claude-mx-health-expert pack. Use for NOM-004, NOM-024, LFPDPPP, LGS, DGIS/SINBA,
  privacy, consent, retention, or compliance claims.
---

# MediCore — regulación

## Cargar primero

1. `docs/claude-mx-health-expert/CLAUDE.md`
2. Skill especializado bajo `docs/claude-mx-health-expert/skills/` según tema:
   - Núcleo normativo → `mx-health-regulatory-core`
   - ECE / expediente → `rehr-mexico`
   - Privacidad → `privacy-mx-health`
   - Seguridad info → `health-information-security`
   - Interop → `interop-health-mx`
   - Operación clínica → `clinic-operations-mx`
   - Epidemiología → `epidemiology-mx`
   - Cambio normativo → `regulatory-change-control`
3. Verificaciones ya hechas: `docs/analisis/01-marco-normativo-verificado.md`

## Reglas

- Distinguir Ley / Reglamento / NOM / guía / estándar voluntario.
- No presentar WCAG, FHIR, ISO como obligación mexicana salvo remisión expresa.
- Datos de salud = sensibles (LFPDPPP vigente 2025; INAI ya no es la autoridad).
- DGIS/SINBA: capacidad de producto fija; valores oficiales de desconocimiento en **reporte**, no en modelo clínico.
- No autogenerar CURP (NOM-024 6.5.1); CURP inobtenible = consulta DGIS pendiente.
- No afirmar certificación NOM-024.
- Si no hay fuente oficial verificada hoy: **pendiente**, no hecho.

## Formato de requisito

`requisito → aplicabilidad → control software → control operativo → evidencia → fuente/fecha`
