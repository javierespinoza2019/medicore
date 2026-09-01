<#
.SYNOPSIS
    Configura los secretos del ambiente Dev en user-secrets (fuera del repositorio).

.DESCRIPTION
    La base de Dev es compartida por el equipo y vive en hosting compartido: datos sintéticos,
    sin PHI. La cadena de conexión no se versiona; cada integrante la registra localmente con
    este script. El servidor y la contraseña se piden de forma interactiva y no quedan en el
    historial de la terminal.

.EXAMPLE
    ./set-dev-secrets.ps1
    ./set-dev-secrets.ps1 -Server SQL0000.ejemplo.net -Database db_medicore -SqlUser medicore_admin
#>
param(
    [string]$Server,
    [string]$Database,
    [string]$SqlUser,
    [string]$JwtSigningKey
)

$ErrorActionPreference = "Stop"
$repo = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not $Server) { $Server = Read-Host "Servidor SQL de Dev" }
if (-not $Database) { $Database = Read-Host "Base de datos de Dev" }
if (-not $SqlUser) { $SqlUser = Read-Host "Usuario SQL" }

$securePassword = Read-Host "Contraseña SQL" -AsSecureString
$plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))

if ([string]::IsNullOrWhiteSpace($plainPassword)) { throw "La contraseña no puede quedar vacía." }

$connectionString = "Data Source=$Server;Initial Catalog=$Database;User Id=$SqlUser;Password=$plainPassword;Encrypt=True;TrustServerCertificate=True;Connect Timeout=30"

foreach ($project in @("backend/Api", "backend/Worker")) {
    $projectPath = Join-Path $repo $project
    Write-Host ">> user-secrets en $project" -ForegroundColor Cyan
    dotnet user-secrets set "ConnectionStrings:MediCore" $connectionString --project $projectPath | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Falló user-secrets en $project" }
}

if ($JwtSigningKey) {
    if ($JwtSigningKey.Length -lt 32) { throw "Jwt:SigningKey requiere al menos 32 caracteres." }
    dotnet user-secrets set "Jwt:SigningKey" $JwtSigningKey --project (Join-Path $repo "backend/Api") | Out-Null
}

Remove-Variable plainPassword, connectionString

Write-Host "Secretos de Dev configurados. No quedaron en el repositorio." -ForegroundColor Green
Write-Host "Recuerde: Dev es compartido y sin PHI. No capture pacientes reales." -ForegroundColor Yellow
