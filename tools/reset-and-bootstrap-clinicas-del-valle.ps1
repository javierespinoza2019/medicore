<#
.SYNOPSIS
    Reinicia (opcional) la BD de demo y siembra el tenant Clínicas del Valle.

.DESCRIPTION
    Flujo por omisión (seguro): solo aplica el seed 010_provision_clinicas_del_valle.sql
    (idempotente, sin DELETE).

    Reinicio desde cero (EXCEPCIONAL): con -IAuthorizeDestructiveReset exige escribir
    BORRAR en consola y entonces ejecuta ops/ops_wipe_business_data.sql (DELETE de
    tablas de negocio, sin DROP/TRUNCATE de objetos). Luego siembra Clínicas del Valle.

    No usar contra Production con PHI. Hosting compartido = solo datos sintéticos/demo.

.EXAMPLE
    # Solo sembrar / alinear tenant (sin borrar)
    ./reset-and-bootstrap-clinicas-del-valle.ps1 -Server sql.ejemplo -Database db_xxx `
      -SqlUser u -SqlPassword *** -SkipCreateDatabase

.EXAMPLE
    # Vaciar filas + sembrar desde cero (pide confirmación BORRAR)
    ./reset-and-bootstrap-clinicas-del-valle.ps1 -Server sql.ejemplo -Database db_xxx `
      -SqlUser u -SqlPassword *** -SkipCreateDatabase -IAuthorizeDestructiveReset
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$Server,

    [Parameter(Mandatory = $true)]
    [string]$Database,

    [string]$SqlUser,
    [string]$SqlPassword,

    # Hosting compartido: no tocar master
    [switch]$SkipCreateDatabase,

    # Aplicar migraciones + SPs antes del seed (recomendado si la base está vacía de esquema)
    [switch]$ApplySchema,

    # EXCEPCIONAL: vaciar filas de negocio antes del seed
    [switch]$IAuthorizeDestructiveReset,

    # Hash bcrypt opcional (tools/hashpwd). Si se omite, el seed usa Demo123!
    [string]$AdminPasswordHash,

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$dbRoot = Join-Path $repoRoot "backend\database"
$wipeSql = Join-Path $dbRoot "ops\ops_wipe_business_data.sql"
$seedSql = Join-Path $dbRoot "seeds\010_provision_clinicas_del_valle.sql"
$applyDb = Join-Path $PSScriptRoot "apply-database.ps1"

if (-not (Test-Path $seedSql)) { throw "No está el seed: $seedSql" }
if ($IAuthorizeDestructiveReset -and -not (Test-Path $wipeSql)) { throw "No está el wipe: $wipeSql" }

$auth = @("-E")
if ($SqlUser) {
    if (-not $SqlPassword) { throw "-SqlPassword es requerido cuando se indica -SqlUser." }
    $auth = @("-U", $SqlUser, "-P", $SqlPassword)
}

function Invoke-SqlFile {
    param(
        [string]$Path,
        [string]$ConnectDb,
        [hashtable]$Vars
    )
    $varArgs = @()
    foreach ($k in $Vars.Keys) {
        $varArgs += @("-v", "$k=$($Vars[$k])")
    }
    Write-Host ">> $Path  ->  [$ConnectDb] en $Server" -ForegroundColor Cyan
    if ($DryRun) {
        Write-Host "   (DryRun) sqlcmd … -i $Path -v $($Vars.Keys -join ',')" -ForegroundColor DarkGray
        return
    }
    & sqlcmd -S $Server -d $ConnectDb @auth -b -I -f 65001 -i $Path @varArgs
    if ($LASTEXITCODE -ne 0) { throw "Falló $Path (exit $LASTEXITCODE)" }
}

Write-Host ""
Write-Host "MediCore — bootstrap Clínicas del Valle" -ForegroundColor Yellow
Write-Host "  Servidor : $Server"
Write-Host "  Base     : $Database"
Write-Host "  Wipe     : $($IAuthorizeDestructiveReset.IsPresent)"
Write-Host "  Schema   : $($ApplySchema.IsPresent)"
Write-Host "  Tenant   : clinicas_del_valle"
Write-Host "  Sucursales: CHALCO (Servicios de Salud - Chalco), SATELITE (Servicios de Salud - Satelite)"
Write-Host ""

if ($IAuthorizeDestructiveReset) {
    Write-Host "ADVERTENCIA: se borrarán TODAS las filas de negocio (pacientes, citas, usuarios, tenants)." -ForegroundColor Red
    Write-Host "El esquema (tablas/SPs) se conserva. Esto viola la regla cotidiana de MediCore;" -ForegroundColor Red
    Write-Host "solo está permitido como reinicio EXCEPCIONAL de demo sin PHI." -ForegroundColor Red
    Write-Host ""
    $confirm = Read-Host "Escribe BORRAR para continuar (otra cosa cancela)"
    if ($confirm -ne "BORRAR") {
        throw "Cancelado: no se escribió BORRAR."
    }
}

if ($ApplySchema) {
    $applyArgs = @{
        Environment = "dev"
        Server      = $Server
        Database    = $Database
        SkipSeed    = $true
    }
    if ($SqlUser) {
        $applyArgs.SqlUser = $SqlUser
        $applyArgs.SqlPassword = $SqlPassword
    }
    if ($SkipCreateDatabase) { $applyArgs.SkipCreateDatabase = $true }
    if ($DryRun) {
        Write-Host ">> (DryRun) apply-database.ps1 -SkipSeed …" -ForegroundColor DarkGray
    }
    else {
        & $applyDb @applyArgs
        if ($LASTEXITCODE -ne 0) { throw "apply-database.ps1 falló" }
    }
}

if ($IAuthorizeDestructiveReset) {
    Invoke-SqlFile -Path $wipeSql -ConnectDb $Database -Vars @{
        DbName      = $Database
        ConfirmWipe = "BORRAR"
    }
}

$seedVars = @{ DbName = $Database }
if ($AdminPasswordHash) { $seedVars.AdminPasswordHash = $AdminPasswordHash }
else { $seedVars.AdminPasswordHash = "" }

Invoke-SqlFile -Path $seedSql -ConnectDb $Database -Vars $seedVars

Write-Host ""
Write-Host "Listo." -ForegroundColor Green
Write-Host "  Login API: tenantCode=clinicas_del_valle  user=admin  password=Demo123! (si no pasaste -AdminPasswordHash)"
Write-Host "  Frontend: VITE_TENANT_CODE=clinicas_del_valle"
Write-Host "  FacilityType/urgencias de sucursal: NULL — capturar vía administración (no inventados)."
Write-Host ""
