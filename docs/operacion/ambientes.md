# MediCore — Ambientes (Dev / QA / Production)

Actualizado: **2026-08-27** · Alineado a `docs/analisis/12-propuesta-final.md`.

Un mismo artefacto se despliega en los tres ambientes. Lo único que cambia es configuración:
cadena de conexión, llave de firma, orígenes CORS y el perfil `Platform`.

## Matriz

| | Dev | QA | Production |
|---|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Development` | `QA` | `Production` |
| Modo Vite | `development` | `qa` | `production` |
| Base de datos | compartida del equipo (hosting); `MediCore_Dev` si es local | por definir | por definir |
| Hospedaje | hosting compartido (o SQL local) | **por definir** | **VPS dedicado** antes del primer paciente real |
| Datos | sintéticos | sintéticos | reales sólo con `AllowRealPatientData` autorizado |
| `Platform:IsDemo` | `true` | `true` | `false` |
| `Platform:AllowSyntheticSeed` | `true` | `true` | `false` (bloqueado por validación) |
| `Platform:AllowRealPatientData` | `false` | `false` | `false` hasta entorno dedicado |
| DGIS/SINBA | módulo activo, destino `non-production` | ídem | módulo activo; destino `production` sólo en Fase 4 |
| Banner de ambiente | visible | visible | oculto |
| OpenAPI | expuesto | expuesto | **no** expuesto |
| HSTS / redirección HTTPS | no | sí | sí |
| Seed sintético | sí | sí | prohibido |
| E2E Playwright | sí | sí | **bloqueado por configuración** |

DGIS/SINBA nunca se apaga por ambiente (es capacidad fija, no feature flag): lo que cambia es el
destino del envío. CFDI, FHIR y RENAPO sí son flags.

## Secretos

En el repositorio no vive ningún secreto. `appsettings.QA.json` y `appsettings.Production.json`
sólo traen valores no sensibles. El host aporta:

```
ConnectionStrings__MediCore=Server=...;Database=...;User Id=...;Password=...;Encrypt=True
Jwt__SigningKey=<mínimo 32 caracteres, distinta por ambiente>
```

El API **no arranca** si falta la cadena de conexión, si la llave tiene menos de 32 caracteres,
si se reutiliza una llave de desarrollo fuera de Dev, o si `Cors:Origins` está vacío en QA/Production.
Es intencional: un ambiente mal configurado debe fallar al inicio, no a medias.

En el frontend toda variable `VITE_*` termina embebida en el bundle, por eso los archivos
`.env.development`, `.env.qa` y `.env.production` sí se versionan y **no** admiten secretos.

PWA instalable en demo Site4Now (`medi-core.app`): manifest + service worker + iconos 192/512
en el build (`frontend/out/`). `/api/*` = NetworkOnly (no cachear PHI). Offline clínico completo
sigue pendiente. Guion de instalación y dispositivos: [`pwa-dispositivos.md`](pwa-dispositivos.md).

### Tenant piloto Clínicas del Valle

Reinicio/siembra operativa: `tools/reset-and-bootstrap-clinicas-del-valle.ps1`
(seed `010_provision_clinicas_del_valle.sql`). Código tenant: `clinicas_del_valle`.
Sucursales: `CHALCO`, `SATELITE`. Wipe de filas solo con `-IAuthorizeDestructiveReset`
(doc 06, 2026-09-08). Alinear `VITE_TENANT_CODE` en el build del frontend.

### Hosts demo actuales (Site4Now)

| Pieza | URL |
|---|---|
| SPA | `https://medi-core.app` |
| API | `https://api.medi-core.app` |
| `VITE_API_BASE_URL` (build prod) | `https://api.medi-core.app` |
| CORS / orígenes SPA | `https://medi-core.app` (+ `www` si aplica) |
| `AllowedHosts` (API) | `api.medi-core.app` (y alias del sitio si IIS los usa) |

Comprobación rápida: `GET https://api.medi-core.app/api/health` debe devolver JSON `200`.
Si IIS responde **HTTP 500.30** (*ASP.NET Core app failed to start*), el proceso no arrancó:
casi siempre faltan en el panel del sitio las variables `ConnectionStrings__MediCore` y
`Jwt__SigningKey` (≥32 caracteres, sin la llave `DEV_*` de desarrollo), o el
`ASPNETCORE_ENVIRONMENT` no coincide con el `appsettings` publicado. Revisar el log de
stdout/stderr del Application Pool; no es un fallo de red del frontend.

SPA en IIS: la raíz de `medi-core.app` debe incluir `web.config` (fallback a `index.html`).
Sin eso, F5 en `/app/...` responde 404 de IIS. Detalle: [`pwa-dispositivos.md`](pwa-dispositivos.md).

## Validaciones del perfil `Platform`

`PlatformOptions.Validate()` rechaza combinaciones contradictorias:

- demo con `AllowRealPatientData` (shared/demo no lleva PHI);
- pacientes reales mezclados con seed sintético;
- `AllowSyntheticSeed` en Production;
- destino DGIS `production` sin ambiente autorizado para datos reales.

El Worker además se niega a arrancar con `DgisDestination=production` mientras el envío real
DGIS/SINBA siga pendiente (Fase 4): preferimos no arrancar antes que simular un acuse.

## Despliegue de base de datos

Scripts idempotentes, sin `DELETE` / `DROP` / `TRUNCATE`:

```powershell
# Dev
./tools/apply-database.ps1 -Environment dev

# QA
./tools/apply-database.ps1 -Environment qa -Server sql-qa.interno

# Production (sin seed; falla si se intenta)
./tools/apply-database.ps1 -Environment prod -Server sql-prod.interno -SqlUser deploy_medicore -SqlPassword ***
```

El script aplica **todas** las migraciones de `backend/database/migrations` en orden lexicográfico
(el número del nombre es el orden), luego **todos** los `.sql` bajo `backend/database/procedures` (recursivo; al agregar un SP no hay que tocar el script) y, según ambiente, los seeds automáticos de `backend/database/seeds` en orden (omite `*_provision_*.sql`, que es operación manual). `-DryRun` lista el inventario sin ejecutar `sqlcmd`. La primera migración
es la fundacional y es la única que puede conectarse a `master`, porque es la que crea la base; las
demás corren contra la base destino. Con `-SkipCreateDatabase` nada toca `master`, que es lo que
exige el hosting compartido.

`READ_COMMITTED_SNAPSHOT` se activa sólo cuando la base se crea en esa misma corrida. En una base
existente el script no desconecta sesiones: emite un aviso para aplicarlo en ventana de
mantenimiento. La atención no se interrumpe por una migración.

Los scripts se ejecutan con `sqlcmd -I` (`QUOTED_IDENTIFIER ON`), requisito de los índices filtrados.

### Dev es compartido por el equipo

Decisión 2026-08-27: **una sola base de Dev para todo el equipo**, en hosting compartido, con
datos sintéticos. Consecuencias operativas:

- Nadie reinicia la base borrando filas (además de que `DELETE`/`TRUNCATE` están prohibidos).
  Para volver a un estado limpio se restaura respaldo o se crea una base nueva.
- Los scripts son idempotentes: aplicarlos de nuevo no duplica datos ni pierde lo existente.
- Los cambios de esquema se agregan como migración nueva, nunca editando una ya aplicada,
  porque los demás ya la corrieron.
- Al ser compartida, dos personas pueden pisarse los datos de prueba. Si un escenario necesita
  aislamiento, se usa un tenant propio en lugar de limpiar tablas.
- Sin PHI. Ningún paciente real entra aquí.

Cada integrante registra la credencial localmente (no se versiona):

```powershell
./tools/set-dev-secrets.ps1
```

Pide servidor, base, usuario y contraseña de forma interactiva, y escribe la cadena en
user-secrets de `backend/Api` y `backend/Worker`. La contraseña se comparte por un canal seguro,
nunca por el repositorio.

### Base de desarrollo en hosting compartido

Cuando la base ya existe y el login no tiene acceso a `master` (caso típico de hosting
compartido), se agrega `-SkipCreateDatabase` para que la migración corra directo contra la base:

```powershell
./tools/apply-database.ps1 -Environment dev `
  -Server <servidor> -Database <base> `
  -SqlUser <usuario> -SqlPassword <clave> -SkipCreateDatabase
```

Hosting compartido implica **sin PHI**: sólo datos sintéticos, conforme al doc 12.

La cadena de conexión con credenciales **no** va a `appsettings.Development.json`. Se guarda en
user-secrets, que tiene precedencia sobre los archivos versionados:

```powershell
dotnet user-secrets set "ConnectionStrings:MediCore" "<cadena>" --project backend/Api
dotnet user-secrets set "ConnectionStrings:MediCore" "<cadena>" --project backend/Worker
```

Estado actual de la base de desarrollo hospedada: SQL Server 2022 Web Edition, esquema y SPs de
Fase 0 aplicados, seed sintético cargado y `READ_COMMITTED_SNAPSHOT` activado.

### Usuarios sintéticos de Dev

Tenant `demo` en los tres casos.

| Origen | Usuario | Contraseña | Rol |
|---|---|---|---|
| `seeds/001` | `admin` | `Demo123!` | SuperAdmin |
| `seeds/002` | `laura.torres@medicore.mx` | `Admin123!` | admin |
| `seeds/002` | `alejandro.garcia@medicore.mx` | `Admin123!` | medico |

`seeds/002` carga 15 usuarios (uno o más por cada plantilla de rol, incluido `trabajo_social`) y 3 sucursales
(`CENTRAL`, `NORTE`, `SUR`), equivalentes al catálogo del prototipo. La lista completa está en el
propio script. Verificación rápida: `./tools/smoke-login.ps1`.

El menú de la SPA (`PermissionGate` + `roleRoutes` en `frontend`) usa esos mismos códigos de rol
(`recepcion`, `medico`, `caja`, `admin`, `trabajo_social`, …). Contrato API de denegación: `permisos-por-rol.spec.ts`;
UI: `permisos-por-rol-ui.spec.ts` (chromium). Plantillas cerradas (doc 06 §19); no hay nombres de rol libres fuera del seed.

Los scripts SQL están en UTF-8 y `apply-database.ps1` invoca `sqlcmd -f 65001`. Si se ejecutan a
mano sin esa bandera, los acentos se guardan corruptos.

### Aprovisionar un tenant adicional (operación manual)

No hay API de alta de tenants en Fase 1. Se usa el script parametrizado
`backend/database/seeds/003_provision_tenant.sql` (idempotente, sin `DELETE`). No inventa domicilio,
`FacilityType` ni `HasEmergencyService` por omisión (doc 06 §10: tipología demo solo en seed `002`; aquí quedan NULL hasta captura):

```powershell
sqlcmd -S $Server -d $Database -U $SqlUser -P $SqlPassword -b -I -f 65001 `
  -i backend/database/seeds/003_provision_tenant.sql `
  -v DbName=$Database `
     TenantId="<guid>" TenantCode="cliente1" TenantName="Clínica Ejemplo" `
     BranchId="<guid>" BranchCode="CENTRAL" BranchName="Sucursal central"
```

El frontend provisional usa `VITE_TENANT_CODE` (por omisión `demo`) mientras haya un solo cliente.

## Ejecución local

```powershell
# API en Dev
dotnet run --project backend/Api --launch-profile http

# API con perfil QA en local
dotnet run --project backend/Api --launch-profile qa-local

# Worker
$env:DOTNET_ENVIRONMENT="Development"; dotnet run --project backend/Worker
```

```bash
# Frontend
npm run dev          # modo development, proxy /api → localhost:5080
npm run dev:qa       # apunta al API de QA
npm run build:qa     # bundle QA en out-qa/
npm run build        # bundle Production en out/
```

## Ejecución de la suite E2E

Detalle completo en [`tests/e2e/README.md`](../../tests/e2e/README.md). Resumen operativo:

```powershell
# Dev: API arriba contra la base compartida, luego el contrato de API
dotnet run --project backend/Api --launch-profile http   # → http://localhost:5080
cd tests/e2e; npm install; npm run test:api

# QA: mismo comando apuntando al API desplegado
$env:MEDICORE_ENVIRONMENT = "qa"
$env:MEDICORE_API_URL     = "https://qa-api.medicore.mx"
npm run test:api
```

Tres salvaguardas, en este orden:

1. Playwright **no arranca** con `MEDICORE_ENVIRONMENT=production` ni con URLs de producción.
2. Antes de cada prueba se consulta `GET /api/health`; si el ambiente responde
   `allowRealPatientData=true`, la suite **aborta**: estas pruebas escriben.
3. La base de Dev es compartida, así que la suite no borra ni reinicia nada. Usa identificadores
   propios (`e2e-…`) y verifica la idempotencia por la respuesta del API, no contando filas.

## Pruebas

Niveles, requisitos previos, aislamiento sin borrado y ejecución de la suite completa:
[`pruebas.md`](pruebas.md) (`./tools/run-all-tests.ps1`, bloqueado contra Production).

## Promoción entre ambientes

1. Dev: se implementa y se corre la suite E2E local contra stack real.
2. QA: mismo binario, `ASPNETCORE_ENVIRONMENT=QA`, datos sintéticos, E2E completa.
3. Production: mismo binario, secretos del host, sin seed, sin OpenAPI.

Pendiente de decisión: pipeline de CI/CD y quién autoriza el paso a Production.
Registrar en `docs/analisis/06-decisiones-abiertas.md` cuando se defina.

## Antes del primer paciente real

`AllowRealPatientData=true` no se enciende por conveniencia. Requiere, como mínimo:
VPS dedicado (no shared), respaldos verificados con restauración probada, cifrado en tránsito y
en reposo, bitácora de acceso, aviso de privacidad y consentimiento operando, y el destino DGIS
definido. Mientras algo de eso falte, Production opera con datos sintéticos.
