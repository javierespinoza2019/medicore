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

## Dos proyectos Playwright

| Proyecto | Qué prueba | Qué requiere levantado |
|---|---|---|
| `contrato-api` | Contrato API + mapa SC M12 + specs de carpeta activados (subjects, triage, cola sync, etc.). Sin navegador, sin mocks. 1 worker. | API .NET + base de datos |
| `chromium` | Smokes de UI (login, dos estaciones) y catálogo aún en skip de UI/a11y/caja/roles. | Frontend en `http://localhost:5173` |

`contrato-api` incluye `api-*.spec.ts`, `sc-mapa.spec.ts` y los flujos M12 de pacientes/triage/consulta/offline/multi-tenant que ya hablan API.

## Salvaguardas (léelas antes de correr)

1. **Production está bloqueado por configuración.** `playwright.config.ts` lanza error si
   `MEDICORE_ENVIRONMENT=production` o si `MEDICORE_BASE_URL` / `MEDICORE_API_URL` apuntan a
   `app.medicore.mx` o `api.medicore.mx`.
2. **PHI aborta la suite.** Antes de cada prueba de contrato se consulta `GET /api/health`. Si el
   ambiente responde `allowRealPatientData: true`, la corrida falla con mensaje explícito: estas
   pruebas escriben datos y no se ejecutan contra un ambiente con pacientes reales.
3. **La base de Dev es compartida y no se limpia.** Nada de `DELETE` / `TRUNCATE` ni reinicios.
   Cada corrida genera identificadores propios (`e2e-<caso>-<timestamp>-<aleatorio>`), y la
   idempotencia se verifica por la respuesta del API (`accepted` vs `duplicate`), no contando filas.
4. **La cuenta sintética no se bloquea.** El API bloquea 15 minutos tras 5 fallos. El caso de
   credenciales inválidas corre en modo serial y cierra con un login válido, que resetea el
   contador. Por eso el caso de bloqueo por intentos fallidos queda en `skip`.

## Correr la suite de contrato de API

### Dev (local)

```powershell
# 1. API con la base de Dev (cadena de conexión en user-secrets, ver docs/operacion/ambientes.md)
dotnet run --project backend/Api --launch-profile http    # → http://localhost:5080

# 2. Suite de contrato
cd tests/e2e
npm install
npm run test:api
```

### QA

```powershell
$env:MEDICORE_ENVIRONMENT = "qa"
$env:MEDICORE_API_URL     = "https://qa-api.medicore.mx"
$env:MEDICORE_E2E_PASSWORD = "<password sintética de QA>"
npm run test:api
```

Plantillas: `.env.development.example` y `.env.qa.example` (los `.env` no se versionan; las
variables se exportan en la sesión).

| Variable | Default | Uso |
|---|---|---|
| `MEDICORE_API_URL` | `http://localhost:5080` | API bajo prueba |
| `MEDICORE_TENANT_A` | `demo` | Tenant sintético principal |
| `MEDICORE_TENANT_B` | *(vacío)* | Segundo tenant; vacío ⇒ el caso de lectura cruzada queda en `skip` |
| `MEDICORE_E2E_USER` | `admin` | Usuario sintético |
| `MEDICORE_E2E_PASSWORD` | `Demo123!` | Password sintética (nunca de producción) |

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

# Sólo contrato de API contra el stack real
npm run test:api

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

## Qué corre HOY contra el stack real (`contrato-api`)

| Spec | Qué valida |
|---|---|
| `specs/00-smoke/api-health.spec.ts` | `GET /api/health` con `success:true`, `environment`, `isDemo`, `allowRealPatientData`, `dgisDestination`; ambiente sin PHI y distinto de Production |
| `specs/00-smoke/api-auth.spec.ts` | Login válido (claim `tenant_id`, cookie `mc_refresh` `httponly` y acotada a `/api/auth`), credenciales inválidas indistinguibles, tenant inexistente, `me` con y sin token, token con firma alterada, rotación de refresh y logout por sesión (la segunda estación del mismo usuario sobrevive; logout sin cookie ⇒ 400) |
| `specs/00-smoke/api-sync-idempotencia.spec.ts` | `POST /api/sync/commands` sin token, misma `IdempotencyKey` ⇒ `duplicate` con el mismo `serverEntityId`, claves distintas ⇒ efectos distintos, validaciones 400 |
| `specs/00-smoke/api-multi-tenant.spec.ts` | `TenantId` proviene del claim, alta y lectura de dispositivo dentro del tenant, id ajeno ⇒ 404, endpoints sin token ⇒ 401 |
| `specs/00-smoke/api-professionals.spec.ts` | CRUD profesionales/especialidades (M1): listado seed, alta/update/baja lógica, 409 cédula duplicada, AuthZ médico/caja |

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

## Qué queda en `test.skip` (M12 parcial)

| Carpeta / mapa | Motivo |
|---|---|
| SC-04 | Alta con Rx pendientes: sin SP/contrato en Encounter |
| SC-05 (mapa) | Pleno activo en `sc-ui` (IdentityHeader en detalle/triage/urgencias/consultas); ID conservado en mapa |
| SC-09 / SC-11 (mapa) | Cubiertos en `sc-ui` / `sc-11-indexeddb` (chromium); IDs conservados en mapa |
| `05-caja/` | Cobro/corte offline (Fase 2) |
| PermissionGate UI / corte caja médico | Menú ya filtra en AppLayout; E2E UI no cabe en contrato-api; caja Fase 2 |

Activos recientes (API o Vite+API, sin mocks): SC-08, SC-10, SC-18, SC-20, SC-21, SC-22, SC-24;
UI SC-05 pleno / SC-08 / SC-09 / SC-10; IndexedDB SC-11; axe login WCAG AA; permisos por rol API.

## Estructura

```
tests/e2e/
  package.json
  playwright.config.ts
  README.md
  fixtures/     api (contrato + salvaguarda PHI) · auth · offline · tenants
  helpers/      selectors · assertions
  data/         patients · users
  specs/
    00-smoke/    login (mock) + api-*.spec.ts (contrato contra API real)
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
