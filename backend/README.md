# MediCore backend

Monolito modular .NET (`net10.0`).

```
Api/         Controllers, JWT, CORS, health
Business/    Orquestación (Auth, Sync, Device)
DataAccess/  Dapper + Stored Procedures únicamente
Models/      DTOs
Common/      ApiResponse, claims, ULID
Worker/      Outbox (DGIS siempre; CFDI/FHIR/RENAPO al encolar)
database/    Migraciones, SPs, seeds
```

## Arranque local

1. Crear BD con scripts en `database/` (ver README ahí).
2. Ajustar `Api/appsettings.Development.json` (connection string + Jwt:SigningKey).
3. API:

```bash
dotnet run --project Api --launch-profile http
```

4. Worker (entorno con proceso durable; en shared demo puede degradarse):

```bash
dotnet run --project Worker
```

## Ambientes

Tres ambientes con el mismo binario: `Development`, `QA`, `Production` (`ASPNETCORE_ENVIRONMENT`
y `DOTNET_ENVIRONMENT` para el Worker). Detalle y matriz completa en
[`docs/operacion/ambientes.md`](../docs/operacion/ambientes.md).

- `appsettings.{Development,QA,Production}.json` traen sólo valores no sensibles.
- QA y Production reciben secretos por variables de entorno:
  `ConnectionStrings__MediCore` y `Jwt__SigningKey`.
- El perfil `Platform` gobierna demo/PHI/seed y el destino DGIS; `PlatformOptions.Validate()`
  impide combinaciones contradictorias y el proceso **no arranca** si la configuración es inválida.
- Perfil de ejecución con configuración QA en local: `dotnet run --project Api --launch-profile qa-local`.

## Vertical Fase 0

| Endpoint | Auth | Notas |
|---|---|---|
| `GET /api/health` | no | Liveness |
| `POST /api/auth/login` | no | Refresh en cookie httpOnly |
| `POST /api/auth/refresh` | cookie | Rota refresh |
| `POST /api/auth/logout` | sí | Invalida refresh |
| `GET /api/auth/me` | sí | Claims |
| `POST /api/sync/commands` | sí | Idempotencia |
| `POST /api/devices/register` | sí | Pendiente de aprobación admin |
