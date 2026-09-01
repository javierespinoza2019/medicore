# MediCore database

Scripts versionados e idempotentes. Sin `DELETE` / `DROP` / `TRUNCATE`.

## Aplicación por ambiente

Los scripts reciben el nombre de la base por la variable sqlcmd `DbName`
(`MediCore_Dev`, `MediCore_QA`, `MediCore`). Usar el script de despliegue:

```powershell
./tools/apply-database.ps1 -Environment dev
./tools/apply-database.ps1 -Environment qa   -Server sql-qa.interno
./tools/apply-database.ps1 -Environment prod -Server sql-prod.interno   # sin seed
```

Con `sqlcmd` directo hay que pasar la variable: `sqlcmd -S localhost -d master -E -b -i migrations\0001_foundation.sql -v DbName=MediCore_Dev`.

`READ_COMMITTED_SNAPSHOT` se activa sólo si la base se crea en esa corrida; en una base existente
el script avisa para aplicarlo en ventana de mantenimiento (desconecta sesiones activas).

## Orden

1. `migrations/0001_foundation.sql`
2. `procedures/auth/sp_Auth.sql`
3. `procedures/sync/sp_Sync_Outbox.sql`
4. `procedures/device/sp_Device.sql`
5. `seeds/001_demo_tenant.sql` (solo dev/QA; prohibido en producción)
6. `seeds/002_dev_catalogo_equivalente.sql` (catálogo de identidad equivalente al prototipo)

## Demo seed

- Tenant code: `demo`
- User: `admin`
- Password: `Demo123!`

## Reglas

- Solo SPs desde la app (`sp_{Entity}_{Action}`)
- Todo negocio con `TenantId`
- DGIS/SINBA no es feature flag
- Nunca seed con PHI real
