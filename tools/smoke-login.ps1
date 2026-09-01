<#
.SYNOPSIS
    Verificación rápida del login real contra el API (ambiente Dev).

.DESCRIPTION
    Prueba un usuario sintético por rol y confirma rol y sucursales devueltos.
    No usa mocks: pega contra el API y su base.
#>
param(
    [string]$BaseUrl = "http://localhost:5080",
    [string]$TenantCode = "demo",
    [string]$Password = "Admin123!"
)

$ErrorActionPreference = "Stop"

$usuarios = @(
    "alejandro.garcia@medicore.mx",
    "laura.torres@medicore.mx",
    "jose.ramirez@medicore.mx",
    "carmen.vargas@medicore.mx",
    "monica.soto@medicore.mx",
    "luis.hernandez@medicore.mx",
    "diana.lopez@medicore.mx",
    "omar.flores@medicore.mx",
    "alejandra.vega@medicore.mx"
)

$fallos = 0

foreach ($usuario in $usuarios) {
    $body = @{ tenantCode = $TenantCode; userName = $usuario; password = $Password } | ConvertTo-Json
    try {
        $res = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $body
        if ($res.success) {
            "{0,-32} rol={1,-12} sucursales={2}" -f $usuario, ($res.data.roles -join ","), ($res.data.branchCodes -join ",")
        }
        else {
            $fallos++
            "{0,-32} FALLO: {1}" -f $usuario, $res.message
        }
    }
    catch {
        $fallos++
        "{0,-32} ERROR: {1}" -f $usuario, $_.Exception.Message
    }
}

# Contraseña incorrecta debe ser rechazada.
$bodyMal = @{ tenantCode = $TenantCode; userName = $usuarios[0]; password = "incorrecta" } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $bodyMal | Out-Null
    $fallos++
    Write-Host "FALLO: se aceptó una contraseña incorrecta." -ForegroundColor Red
}
catch {
    Write-Host "Contraseña incorrecta rechazada correctamente." -ForegroundColor Green
}

if ($fallos -gt 0) { throw "$fallos verificaciones fallaron." }
Write-Host "Login real verificado para todos los roles." -ForegroundColor Green
