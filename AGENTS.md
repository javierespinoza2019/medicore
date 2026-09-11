# MediCore — Guía para agentes (Claude / Cursor)

Fuente de verdad de producto: [`docs/analisis/12-propuesta-final.md`](docs/analisis/12-propuesta-final.md).  
Si un documento antiguo contradice el 12 (Edge, app BI aparte, DGIS como flag), **prevalece el 12**.

## Rol

Mantener y construir MediCore: sistema clínico web (ambulatorio + urgencias) para México, multi-tenant, white-label, misión crítica para la continuidad de la atención.

## Antes de implementar

1. Leer `docs/analisis/12-propuesta-final.md`.
2. Si el cambio es clínico/normativo: cargar skill `medicore-regulatory` y/o `docs/claude-mx-health-expert`.
3. Si toca triage, alergias, identidad, recetas, urgencias: cargar skill `medicore-clinical-safety`.
4. Si toca arquitectura, sync, hospedaje, SPs: cargar skill `medicore-architecture`.
5. Flujo general de mantenimiento: skill `medicore-maintain` (incluye criterio UI Readdy + ciclo calidad).
6. Si alinea pantallas al prototipo: **layout JSX de `docs/frontend` + honestidad + API**; no marcar
   «done» solo por cablear contrato. Detalle en skill `medicore-maintain` y regla frontend.

## Al cerrar la tarea

Actualizar la memoria viva del repo (doc 12, este archivo, reglas, skills, `docs/operacion/**`,
`docs/analisis/06-decisiones-abiertas.md`) **cuando el cambio lo amerite**, y dejar las pruebas del
módulo tocado. Qué se actualiza en cada caso: [`.cursor/rules/medicore-cierre-de-tarea.mdc`](.cursor/rules/medicore-cierre-de-tarea.mdc).
Estrategia y suite: [`docs/operacion/pruebas.md`](docs/operacion/pruebas.md) — se corre completa con
`./tools/run-all-tests.ps1`. Ciclo de calidad por módulos:
[`docs/operacion/plan-pruebas-ciclo-calidad.md`](docs/operacion/plan-pruebas-ciclo-calidad.md).

## No negociables

- **Sin Edge** en clínica. Core central + SPA/PWA.
- **No inventar ni asumir** reglas de negocio o vigencia normativa; preguntar o marcar pendiente.
- **No fabricar datos clínicos** (sexo, alergias, antecedentes, signos vitales por omisión).
- **Sin mocks** en builds demo/staging/prod; datos sintéticos solo vía API → SP → BD.
- **DGIS/SINBA** siempre en el producto (no feature flag). CFDI / FHIR / RENAPO sí son flags.
- Persistencia de negocio solo vía **Stored Procedures** (`sp_{Entity}_{Action}`).
- **Prohibido `DELETE`, `DROP` y `TRUNCATE`** contra la base de datos (SP, script, migración o consola). Baja lógica (`IsDeleted`, reverso/`void`, addendum); el esquema se deprecia, no se destruye. Si una tarea parece exigirlo: **preguntar** y registrar la decisión.
- `TenantId` desde claims JWT; API es fuente de verdad de autorización.
- Offline: escritura siempre a cola local + idempotencia; lectura del servidor con enlace.
- BI = módulo en la app principal con permisos; solo agregados; sin app aparte.
- Estupefacientes/psicotrópicos: **fuera de alcance** (Fases 1–4); el sistema debe **impedir** su prescripción/surtido. Reabrir solo con decisión escrita + Reglamento de Insumos verificado (doc 06 §64/68).
- Pacientes reales: solo en entorno dedicado (nunca shared de demo).
- Triage: escala **configurable**; no hardcodear 4 colores de producto (doc 06 §63).
- Monitor de turnos: **solo número** por omisión (doc 06 #21).
- Logout: solo sesión actual (#73); revocación global según política #75 (`docs/operacion/auth-sesiones.md`).

## Oleada de decisiones 2026-08-30 (resumen)

Ratificadas en doc 06: firma A · roles B (+`trabajo_social`) · controlados A · establecimiento A ·
triage A · monitor #21 · revocación global #75 (política) · **foto paciente #44 (sí)**. **Aplazado:** hospedaje Prod (#2/#70/#71).
Índice vivo: encabezado de [`docs/analisis/06-decisiones-abiertas.md`](docs/analisis/06-decisiones-abiertas.md).

## Ambientes

Dev, QA y Production con el mismo artefacto; sólo cambia configuración
([`docs/operacion/ambientes.md`](docs/operacion/ambientes.md)).

- Secretos nunca en el repositorio: `ConnectionStrings__MediCore` y `Jwt__SigningKey` por variable de entorno.
- El perfil `Platform` (demo, seed sintético, PHI, destino DGIS) se valida al arrancar; configuración contradictoria **no arranca**.
- Seed sintético prohibido en Production; E2E bloqueado contra Production.
- `AllowRealPatientData=true` requiere entorno dedicado y decisión explícita.

## Estructura objetivo del repo

```
backend/   → .NET (Api, Worker, Business, DataAccess, Models, Common) + database/
frontend/  → React PWA + features/bi
e2e/       → Playwright contra stack real
docs/      → análisis + claude-mx-health-expert + prototipo de referencia
```

El prototipo vivo de referencia está en `docs/frontend` hasta migrar a `frontend/`.

## Comunicación

Español de México. Tono profesional y directo. No afirmar cumplimiento legal sin fuente oficial y fecha.
