# tools

Utilidades de operaciones (base de datos, seed, diagnóstico).

## set-dev-secrets.ps1

Registra la cadena de conexión de Dev en user-secrets (fuera del repositorio). Dev es una base
**compartida por el equipo**, en hosting compartido y sin PHI.

```powershell
.\set-dev-secrets.ps1
```

## reset-and-bootstrap-clinicas-del-valle.ps1

Siembra el tenant piloto **Clínicas del Valle** (`clinicas_del_valle`) con sucursales
`CHALCO` y `SATELITE`. Por omisión **no borra** nada (idempotente).

Reinicio desde cero (demo sin PHI): `-IAuthorizeDestructiveReset` + escribir `BORRAR`
en consola. Vacía filas de negocio conservando esquema; luego siembra. Ver doc 06
(oleada 2026-09-08).

```powershell
# Solo sembrar / alinear
.\reset-and-bootstrap-clinicas-del-valle.ps1 -Server <srv> -Database <db> `
  -SqlUser <u> -SqlPassword <p> -SkipCreateDatabase

# Vaciar filas + sembrar (pide BORRAR)
.\reset-and-bootstrap-clinicas-del-valle.ps1 -Server <srv> -Database <db> `
  -SqlUser <u> -SqlPassword <p> -SkipCreateDatabase -IAuthorizeDestructiveReset -ApplySchema
```

Login sembrado: `admin` / `Demo123!` (o `-AdminPasswordHash` con `tools/hashpwd`).
Frontend: `VITE_TENANT_CODE=clinicas_del_valle`.

## apply-database.ps1

Aplica migraciones, procedimientos y seeds a un ambiente. Requiere `sqlcmd` y acceso al servidor SQL.
Scripts idempotentes; nunca ejecuta `DELETE` / `DROP` / `TRUNCATE`.

Descubrimiento automático (no hace falta editar el script al agregar SQL):

- `backend/database/migrations/*.sql` en orden lexicográfico
- `backend/database/procedures/**/*.sql` recursivo, orden estable por ruta
- `backend/database/seeds/*.sql` en orden (solo dev/qa); omite `*_provision_*.sql` (operación manual)

```powershell
# Dev local (crea MediCore_Dev + seed sintético)
.\apply-database.ps1 -Environment dev

# Solo listar qué aplicaría (sin sqlcmd)
.\apply-database.ps1 -Environment dev -DryRun

# QA
.\apply-database.ps1 -Environment qa -Server sql-qa.interno

# Producción: sin seed; falla si se intenta sembrar datos ficticios
.\apply-database.ps1 -Environment prod -Server sql-prod.interno -SqlUser deploy_medicore -SqlPassword ***
```

Parámetros útiles: `-Database` para sobrescribir el nombre por omisión,
`-SkipSeed` / `-IncludeSeed` para controlar el seed sintético, `-SkipCreateDatabase` cuando la
base ya existe y el login no tiene acceso a `master` (hosting compartido), y `-DryRun` para
verificar el inventario sin ejecutar.

## smoke-login.ps1

Verifica el login real contra el API: prueba un usuario sintético por rol y confirma el rol y las
sucursales que devuelve el servidor, además de que una contraseña incorrecta sea rechazada.
Requiere el API arriba y el seed `002` aplicado.

```powershell
.\smoke-login.ps1                                    # http://localhost:5080, tenant demo
.\smoke-login.ps1 -BaseUrl https://api-qa.interno
```

## run-all-tests.ps1

Corre la suite completa en orden (build .NET, `dotnet test`, `type-check` + `lint` del frontend,
E2E/contrato Playwright) e imprime el estado de cada etapa. Se niega a correr contra Production y
aborta si el API reporta `allowRealPatientData = true`. No requiere secretos en texto plano.

```powershell
.\run-all-tests.ps1                      # Dev, todas las etapas
.\run-all-tests.ps1 -Skip e2e            # sin E2E (API no levantada)
.\run-all-tests.ps1 -Skip frontend,e2e   # solo backend
.\run-all-tests.ps1 -Environment qa -ApiUrl https://api-qa.interno
```

Estrategia y requisitos previos: [`docs/operacion/pruebas.md`](../docs/operacion/pruebas.md).

Detalle de ambientes: [`docs/operacion/ambientes.md`](../docs/operacion/ambientes.md).
