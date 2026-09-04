<#
.SYNOPSIS
    Aplica migraciones + SPs de MediCore a un ambiente (dev, qa, prod).

.DESCRIPTION
    Aplica todas las migraciones de backend/database/migrations en orden lexicográfico,
    luego los SPs y (según ambiente) el seed sintético.
    Scripts idempotentes: CREATE OR ALTER en SPs, CREATE ... IF NULL en objetos.
    Nunca ejecuta DELETE / DROP / TRUNCATE.
    El seed sintético sólo corre en dev/qa (o con -IncludeSeed explícito en un ambiente permitido).

.EXAMPLE
    ./apply-database.ps1 -Environment dev
    ./apply-database.ps1 -Environment qa -Server sql-qa.interno
    ./apply-database.ps1 -Environment prod -Server sql-prod.interno -SqlUser deploy_medicore
#>
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("dev", "qa", "prod")]
    [string]$Environment,

    [string]$Server = "localhost",

    # Por omisión: MediCore_Dev / MediCore_QA / MediCore
    [string]$Database,

    # Autenticación SQL (si se omite, se usa autenticación integrada de Windows)
    [string]$SqlUser,
    [string]$SqlPassword,

    # Hosting compartido: la base ya existe y no hay acceso a master.
    [switch]$SkipCreateDatabase,

    [switch]$IncludeSeed,
    [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot "..\backend\database"

if (-not $Database) {
    $Database = switch ($Environment) {
        "dev" { "MediCore_Dev" }
        "qa" { "MediCore_QA" }
        "prod" { "MediCore" }
    }
}

# Seed sintético: nunca en producción.
$runSeed = switch ($Environment) {
    "dev" { $true }
    "qa" { $true }
    "prod" { $false }
}
if ($IncludeSeed) { $runSeed = $true }
if ($SkipSeed) { $runSeed = $false }

if ($runSeed -and $Environment -eq "prod") {
    throw "Seed sintético prohibido en producción (doc 12: sin datos ficticios en un ambiente con pacientes reales)."
}

$auth = @("-E")
if ($SqlUser) {
    if (-not $SqlPassword) { throw "-SqlPassword es requerido cuando se indica -SqlUser." }
    $auth = @("-U", $SqlUser, "-P", $SqlPassword)
}

function Invoke-SqlFile([string]$path, [string]$connectDb) {
    Write-Host ">> $path  ->  [$Database] en $Server" -ForegroundColor Cyan
    # -I: QUOTED_IDENTIFIER ON, requerido por índices filtrados.
    # -f 65001: los scripts son UTF-8; sin esto los acentos se guardan corruptos.
    & sqlcmd -S $Server -d $connectDb @auth -b -I -f 65001 -i $path -v DbName=$Database
    if ($LASTEXITCODE -ne 0) { throw "Falló $path" }
}

Write-Host "Ambiente: $Environment | Servidor: $Server | Base: $Database | Seed: $runSeed" -ForegroundColor Yellow

# Todas las migraciones, en orden lexicográfico: el nombre (0001, 0002, …) es el orden de
# aplicación. Enumerar archivo por archivo dejaba a QA y Production con esquema atrasado.
$migrations = @(Get-ChildItem (Join-Path $root "migrations") -Filter "*.sql" -File | Sort-Object Name)
if ($migrations.Count -eq 0) { throw "No hay migraciones en $root\migrations." }
Write-Host "Migraciones a aplicar: $($migrations.Name -join ', ')" -ForegroundColor Yellow

# La primera migración es la fundacional: es la única que crea la base, y por eso es la única
# que puede necesitar conectarse a master. Todas traen `USE [$(DbName)]`, así que a partir de
# ahí se conectan directo a la base destino.
# - Local (base nueva): la fundacional corre en master, la crea, y las demás ya la encuentran.
# - Hosting compartido (-SkipCreateDatabase): nada toca master; el login sólo necesita su base.
$primeraEsFundacional = $true
foreach ($migration in $migrations) {
    $connectDb = if ($primeraEsFundacional -and -not $SkipCreateDatabase) { "master" } else { $Database }
    Invoke-SqlFile $migration.FullName $connectDb
    $primeraEsFundacional = $false
}

Invoke-SqlFile (Join-Path $root "procedures\auth\sp_Auth.sql") $Database
Invoke-SqlFile (Join-Path $root "procedures\auth\sp_BreakGlass.sql") $Database
Invoke-SqlFile (Join-Path $root "procedures\user\sp_User.sql") $Database
Invoke-SqlFile (Join-Path $root "procedures\role\sp_Role.sql") $Database
Invoke-SqlFile (Join-Path $root "procedures\sync\sp_Sync_Outbox.sql") $Database
Invoke-SqlFile (Join-Path $root "procedures\device\sp_Device.sql") $Database
Invoke-SqlFile (Join-Path $root "procedures\professional\sp_HealthcareProfessional.sql") $Database
Invoke-SqlFile (Join-Path $root "procedures\professional\sp_Specialty.sql") $Database
Invoke-SqlFile (Join-Path $root "procedures\audit\sp_Audit.sql") $Database
Invoke-SqlFile (Join-Path $root "procedures\tenant\sp_Tenant.sql") $Database
Invoke-SqlFile (Join-Path $root "procedures\tenant\sp_Branch.sql") $Database
Invoke-SqlFile (Join-Path $root "procedures\subject\sp_Subject.sql") $Database
Invoke-SqlFile (Join-Path $root "procedures\encounter\sp_Encounter.sql") $Database
Invoke-SqlFile (Join-Path $root "procedures\schedule\sp_Appointment.sql") $Database

if ($runSeed) {
    Invoke-SqlFile (Join-Path $root "seeds\001_demo_tenant.sql") $Database
    Invoke-SqlFile (Join-Path $root "seeds\002_dev_catalogo_equivalente.sql") $Database
    Invoke-SqlFile (Join-Path $root "seeds\003_dev_profesional_sanitario.sql") $Database
    Invoke-SqlFile (Join-Path $root "seeds\004_dev_unidentified_label.sql") $Database
    Invoke-SqlFile (Join-Path $root "seeds\005_dev_consulting_rooms.sql") $Database
    Invoke-SqlFile (Join-Path $root "seeds\006_dev_triage_scale.sql") $Database
    Invoke-SqlFile (Join-Path $root "seeds\007_dev_medications.sql") $Database
    Invoke-SqlFile (Join-Path $root "seeds\008_dev_tenant_bravo.sql") $Database
    # 003_provision_tenant.sql es script de OPERACIÓN manual (nuevos tenants); no corre en el seed automático.
    Write-Host "Base $Database lista. Login demo: tenant=demo user=admin pass=Demo123!" -ForegroundColor Green
    Write-Host "Usuarios por rol: <correo>@medicore.mx / Admin123! (ver seeds/002)." -ForegroundColor Green
    Write-Host "Segundo tenant: bravo / admin / Demo123! (MEDICORE_TENANT_B=bravo)." -ForegroundColor Green
}
else {
    Write-Host "Base $Database lista (sin seed sintético)." -ForegroundColor Green
}
