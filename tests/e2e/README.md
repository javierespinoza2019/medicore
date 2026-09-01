# MediCore — pruebas end-to-end (Playwright)

Suite TypeScript de **Playwright** para MediCore (clínica ambulatoria + urgencias, México).  
Este directorio es **sólo el proyecto de pruebas**: no implementa el sistema.

El catálogo de specs es **especificación ejecutable** de los recorridos y de los casos de seguridad clínica del análisis. Cada `test.skip` con ID (`SC-XX`, permisos, tenant, cola…) es un caso acordado que se irá activando (`test` / `test.fix`) cuando exista la capacidad en producto.

## Relación con la documentación

| Documento | Uso en esta suite |
|---|---|
| [`docs/analisis/05-roadmap-qa-riesgos.md`](../../docs/analisis/05-roadmap-qa-riesgos.md) | Plan de QA, puertas de fase, **SC-01…SC-24** (mapa en `specs/06-seguridad-clinica/sc-mapa.spec.ts`), suites multi-tenant / partición de red / SS |
| [`docs/analisis/08-identidad-y-paciente-no-identificado.md`](../../docs/analisis/08-identidad-y-paciente-no-identificado.md) | Paciente no identificado, SC-13…SC-24, etiquetas / vinculación |
| [`docs/analisis/07-modalidades-de-despliegue.md`](../../docs/analisis/07-modalidades-de-despliegue.md) y doc **03** | Offline, cola por dispositivo, dos estaciones, `fixtures/offline.ts` |
| [`docs/frontend`](../../docs/frontend) | Prototipo UI (React 19 + Vite + Tailwind, **mock, sin backend**) — objetivo de las pruebas que corren hoy |

## Requisitos

- Node.js 20+ recomendado  
- Prototipo local (para smoke / dos estaciones):

```bash
cd docs/frontend
npm install
npm run dev
# → http://localhost:5173
```

## Instalar y ejecutar

```bash
cd tests/e2e
npm install
npx playwright install chromium   # browsers (una vez)
```

Variables (ver `.env.example`):

| Variable | Default | Descripción |
|---|---|---|
| `MEDICORE_BASE_URL` | `http://localhost:5173` | Origen del UI bajo prueba |
| `MEDICORE_E2E_MODE` | `mock` | `mock` \| `backend` |
| `MEDICORE_E2E_PASSWORD` | `Admin123!` | Password de usuarios mock |

```bash
# Toda la suite (muchos skip esperados)
npm test

# Sólo smoke (login)
npm run test:smoke

# Mapa SC
npm run test:sc

# Offline / dos estaciones
npm run test:offline

# Accesibilidad
npm run test:a11y

# UI mode / headed
npm run test:ui
npm run test:headed
```

Informe HTML: `npm run report` tras una corrida.

## Qué corre HOY (contra mock / prototipo)

Con `docs/frontend` en `npm run dev` y `MEDICORE_BASE_URL=http://localhost:5173`:

| Spec | Qué valida |
|---|---|
| `specs/00-smoke/login.spec.ts` | Pantalla de login, rechazo de credenciales, login admin → `/app/dashboard` |
| `specs/03-triage-urgencias/dos-estaciones-offline.spec.ts` (1 caso) | Dos `BrowserContext` (Equipo1/Equipo2), `context.setOffline` independiente |

Si el servidor no está arriba, esos tests hacen **`test.skip` condicional** (no fallan la suite por red caída).

Helpers reales ya disponibles:

- `fixtures/offline.ts` — `goOffline` / `goOnline` vía `context.setOffline`
- `fixtures/auth.ts` — login UI e inyección de sesión
- `data/users.ts` — usuarios alineados al mock del prototipo

## Qué queda en `test.skip` hasta backend (o producto completo)

| Carpeta | Motivo |
|---|---|
| `01-auth-seguridad/` | Permisos por rol dinámicos |
| `02-pacientes/` | MPI, CURP, no identificado completo |
| `03-triage-urgencias/triage-sin-bloqueo` + 2º caso dos estaciones | SC-03/14/19, colas SS-08 |
| `04-consulta-receta/` | SOAP + alergias SC-01/02 |
| `05-caja/` | Cobro/corte offline atómico |
| `06-seguridad-clinica/sc-mapa.spec.ts` | **SC-01…SC-24** listados como `test.skip('SC-XX: …')` |
| `07-accesibilidad/` | axe / teclado en CI |
| `08-multi-tenant/` | Aislamiento tenant A/B |
| `09-offline/` | Idempotencia ULID / cola |

Al pasar a `MEDICORE_E2E_MODE=backend`, se irán quitando skips y sustituyendo por aserciones reales — sin reinventar el catálogo: los títulos SC ya están fijados.

## Estructura

```
tests/e2e/
  package.json
  playwright.config.ts
  README.md
  fixtures/     auth · offline · tenants
  helpers/      selectors · assertions
  data/         patients · users
  specs/
    00-smoke/
    01-auth-seguridad/
    02-pacientes/
    03-triage-urgencias/
    04-consulta-receta/
    05-caja/
    06-seguridad-clinica/
    07-accesibilidad/
    08-multi-tenant/
    09-offline/
  utils/        utilidades opcionales (IndexedDB, etc.)
```

## Trazas

Playwright guarda **trace en el primer reintento** (`trace: on-first-retry`).  
Para forzar en local: `npx playwright test --trace on` y luego `npx playwright show-trace <path>`.
