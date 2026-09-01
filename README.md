# MediCore

Sistema clínico web (México): ambulatorio + urgencias, multi-tenant, white-label.

## Fuente de verdad

- Producto / arquitectura: [`docs/analisis/12-propuesta-final.md`](docs/analisis/12-propuesta-final.md)
- Plan: [`docs/analisis/11-plan-de-implementacion.md`](docs/analisis/11-plan-de-implementacion.md)
- Agentes: [`AGENTS.md`](AGENTS.md)

## Estructura

```
backend/     .NET Api + Worker + Business + DataAccess + Models + Common + database/
frontend/    React PWA (migrado desde docs/frontend + api/sync Fase 0)
e2e/         (destino Playwright; scaffolding actual en tests/e2e)
tools/
docs/        análisis + prototipo de referencia (docs/frontend) + ventas
tests/e2e/   scaffolding E2E
```

## Estado — Fase 0 en curso

Vertical fundación:

- Auth JWT + refresh httpOnly
- Cola sync + idempotencia
- Dispositivos (registro pendiente)
- Outbox worker (DGIS canal siempre presente)
- Seed demo sintético (`demo` / `admin` / `Demo123!`)

### Arranque rápido (dev)

1. Base de datos: `./tools/apply-database.ps1 -Environment dev`
2. API: `dotnet run --project backend/Api --launch-profile http`
3. FE: `cd frontend && npm install && npm run dev`
4. Worker: `dotnet run --project backend/Worker`

## Pruebas

Cada módulo deja sus pruebas; la suite completa se corre de una sola vez:

```powershell
./tools/run-all-tests.ps1            # build + dotnet test + type-check/lint + E2E
./tools/run-all-tests.ps1 -Skip e2e  # sin E2E (API no levantada)
```

Niveles, requisitos previos y reglas de aislamiento: [`docs/operacion/pruebas.md`](docs/operacion/pruebas.md).

## Ambientes

Dev, QA y Production con el mismo artefacto; sólo cambia configuración.
Matriz, secretos y promoción: [`docs/operacion/ambientes.md`](docs/operacion/ambientes.md).

| | Dev | QA | Production |
|---|---|---|---|
| Entorno .NET | `Development` | `QA` | `Production` |
| Modo Vite | `development` | `qa` | `production` |
| Base | `MediCore_Dev` | `MediCore_QA` | `MediCore` |
| Datos | sintéticos | sintéticos | reales sólo en entorno dedicado autorizado |

Secretos (`ConnectionStrings__MediCore`, `Jwt__SigningKey`) viven en el host, nunca en el repo.

Remote: https://github.com/javierespinoza2019/medicore.git
