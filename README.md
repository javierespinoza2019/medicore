# MediCore

Sistema clínico web para México: clínica ambulatoria + urgencias, multi-tenant, white-label.

## Fuente de verdad

- Producto / arquitectura: [`docs/analisis/12-propuesta-final.md`](docs/analisis/12-propuesta-final.md)
- Plan por fases: [`docs/analisis/11-plan-de-implementacion.md`](docs/analisis/11-plan-de-implementacion.md)
- Guía para agentes: [`AGENTS.md`](AGENTS.md)

## Estructura objetivo

```
MedicalCore/
├── backend/          # Api, Worker, Business, DataAccess, Models, Common, database/
├── frontend/         # PWA clínica + features/bi
├── e2e/              # Playwright (aceptación contra stack real)
├── tools/
├── docs/             # análisis, ventas, prototipo de referencia (docs/frontend)
└── tests/e2e/        # scaffolding E2E actual (migrar a e2e/ en Fase 0)
```

## Estado actual

- Análisis y arquitectura: **cerrados** (docs 01–12)
- Prototipo UI: `docs/frontend`
- Implementación backend/frontend: **pendiente** (Fase 0)
- Remote: `https://github.com/javierespinoza2019/medicore.git`

## Arranque (cuando se autorice Fase 0)

1. Scaffold `backend/` + `frontend/`
2. Auth multi-tenant + cola offline + idempotencia
3. Vertical E2E mínimo contra API real (sin mocks en demo/staging/prod)
