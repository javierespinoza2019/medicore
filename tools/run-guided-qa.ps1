<#
.SYNOPSIS
    Ciclo guiado QA con overlay en vivo (perfil distinto a run-all-tests).

.DESCRIPTION
    Corre Playwright proyecto guided-qa (headed por omision) con barra inferior
    CP-MC-* inyectada por el test. No sustituye la suite de regresion.

    Requisitos: API + Vite Dev (igual que E2E chromium).
    Bloquea Production / allowRealPatientData via health del API.

.PARAMETER Cycle
    Ciclo: smoke | sc-rx | urg | off | authz

.PARAMETER Headless
    Sin ventana (overlay no es visible; util en CI del perfil guiado).

.PARAMETER ApiUrl / BaseUrl
    Defaults localhost:5080 / 127.0.0.1:5173

.EXAMPLE
    ./tools/run-guided-qa.ps1
.EXAMPLE
    ./tools/run-guided-qa.ps1 -Cycle urg -SlowMo 300
#>
[CmdletBinding()]
param(
    [ValidateSet('smoke', 'sc-rx', 'urg', 'off', 'authz')]
    [string]$Cycle = 'smoke',

    [switch]$Headless,

    [string]$ApiUrl = 'http://localhost:5080',
    [string]$BaseUrl = 'http://127.0.0.1:5173',

    [int]$SlowMo = 250
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
$e2eDir = Join-Path $repoRoot 'tests/e2e'

Write-Host "MediCore - QA guiado | ciclo=$Cycle" -ForegroundColor Cyan
Write-Host "    API=$ApiUrl | Frontend=$BaseUrl | headed=$(-not $Headless)" -ForegroundColor DarkGray

$perfil = $null
try {
    $perfil = (Invoke-RestMethod -Uri "$ApiUrl/api/health" -TimeoutSec 10 -Method Get).data
}
catch {
    throw "API no responde en $ApiUrl/api/health. Levante: dotnet run --project backend/Api --launch-profile http"
}

if ($perfil.allowRealPatientData) {
    throw 'ABORTADO: allowRealPatientData=true - no se corre QA guiado contra PHI.'
}
if ($perfil.environment -match '^(?i)production$') {
    throw 'ABORTADO: API en Production.'
}

try {
    $null = Invoke-WebRequest -Uri $BaseUrl -UseBasicParsing -TimeoutSec 5
}
catch {
    throw "Frontend no responde en $BaseUrl. Levante Vite en frontend/ (npm run dev)."
}

$env:MEDICORE_E2E_GUIDED = '1'
$env:MEDICORE_ENVIRONMENT = 'development'
$env:MEDICORE_API_URL = $ApiUrl
$env:MEDICORE_BASE_URL = $BaseUrl
$env:MEDICORE_SLOW_MO = "$SlowMo"
# Dev: IDOR S.2 / multi-tenant (mismo criterio que run-all-tests.ps1).
if (-not $env:MEDICORE_TENANT_B) {
    $env:MEDICORE_TENANT_B = 'bravo'
}
if ($Headless) {
    $env:MEDICORE_E2E_GUIDED_HEADLESS = '1'
}
else {
    Remove-Item Env:MEDICORE_E2E_GUIDED_HEADLESS -ErrorAction SilentlyContinue
}

$spec = switch ($Cycle) {
    'smoke' { 'specs/guided/smoke-operador.spec.ts' }
    'sc-rx' { 'specs/guided/sc-rx.spec.ts' }
    'urg' { 'specs/guided/urgencias.spec.ts' }
    'off' { 'specs/guided/offline.spec.ts' }
    'authz' { 'specs/guided/authz.spec.ts' }
    default { throw "Ciclo no soportado: $Cycle" }
}

Push-Location $e2eDir
try {
    Write-Host "=== guided-qa | $spec ===" -ForegroundColor Cyan
    & npx playwright test $spec --project=guided-qa --workers=1
    $code = $LASTEXITCODE
}
finally {
    Pop-Location
    Remove-Item Env:MEDICORE_E2E_GUIDED -ErrorAction SilentlyContinue
    Remove-Item Env:MEDICORE_E2E_GUIDED_HEADLESS -ErrorAction SilentlyContinue
}

if ($code -ne 0) {
    Write-Host "QA guiado FALLO (exit $code)" -ForegroundColor Red
    exit $code
}

Write-Host "QA guiado OK - ciclo $Cycle" -ForegroundColor Green
exit 0
