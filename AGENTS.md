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
5. Flujo general de mantenimiento: skill `medicore-maintain`.

## No negociables

- **Sin Edge** en clínica. Core central + SPA/PWA.
- **No inventar ni asumir** reglas de negocio o vigencia normativa; preguntar o marcar pendiente.
- **No fabricar datos clínicos** (sexo, alergias, antecedentes, signos vitales por omisión).
- **Sin mocks** en builds demo/staging/prod; datos sintéticos solo vía API → SP → BD.
- **DGIS/SINBA** siempre en el producto (no feature flag). CFDI / FHIR / RENAPO sí son flags.
- Persistencia de negocio solo vía **Stored Procedures** (`sp_{Entity}_{Action}`).
- `TenantId` desde claims JWT; API es fuente de verdad de autorización.
- Offline: escritura siempre a cola local + idempotencia; lectura del servidor con enlace.
- BI = módulo en la app principal con permisos; solo agregados; sin app aparte.
- Estupefacientes/psicotrópicos: **impedir** hasta decisión + Reglamento de Insumos.
- Pacientes reales: solo en entorno dedicado (nunca shared de demo).

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
