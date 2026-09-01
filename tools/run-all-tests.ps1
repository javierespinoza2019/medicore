<#
.SYNOPSIS
    Corre la suite completa de pruebas de MediCore en orden y reporta el estado de cada etapa.

.DESCRIPTION
    Etapas: build (dotnet build) -> test (dotnet test) -> frontend (type-check + lint) -> e2e
    (Playwright: contrato de API + flujos, contra stack real).

    Reglas que aplica (docs/operacion/pruebas.md):
      - Se niega a correr contra Production.
      - Aborta si el API expuesto reporta allowRealPatientData = true.
      - No requiere secretos: la credencial de BD vive en user-secrets.
      - Si no hay proyectos de prueba .NET lo informa; no reporta verde en falso.

.PARAMETER Environment
    dev (por omisión) o qa. prod/production es rechazado.

.PARAMETER Skip
    Etapas a omitir: build, test, frontend, e2e.

.PARAMETER ApiUrl
    URL del API real para contrato/E2E. Default http://localhost:5080.

.PARAMETER BaseUrl
    URL del frontend servido para E2E. Default http://localhost:5173.

.EXAMPLE
    ./tools/run-all-tests.ps1
.EXAMPLE
    ./tools/run-all-tests.ps1 -Skip e2e
.EXAMPLE
    ./tools/run-all-tests.ps1 -Environment qa -ApiUrl https://api-qa.interno
#>
[CmdletBinding()]
param(
    [ValidateSet('dev', 'qa', 'prod', 'production')]
    [string]$Environment = 'dev',

    [string[]]$Skip = @(),

    [string]$ApiUrl = 'http://localhost:5080',
    [string]$BaseUrl = 'http://localhost:5173'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
$solution = Join-Path $repoRoot 'backend/MediCore.sln'
$frontendDir = Join-Path $repoRoot 'frontend'
$e2eDir = Join-Path $repoRoot 'tests/e2e'

$stageOrder = @('build', 'test', 'frontend', 'e2e')

# `powershell -File script.ps1 -Skip frontend,e2e` entrega un solo string: se normaliza aquí.
$Skip = @($Skip | ForEach-Object { $_ -split '[,;\s]+' } | Where-Object { $_ } | ForEach-Object { $_.ToLowerInvariant() })
$desconocidas = @($Skip | Where-Object { $stageOrder -notcontains $_ })
if ($desconocidas.Count -gt 0) {
    throw "Etapa desconocida en -Skip: $($desconocidas -join ', '). Válidas: $($stageOrder -join ', ')."
}

$results = [ordered]@{}
foreach ($s in $stageOrder) { $results[$s] = 'pendiente' }

function Write-Stage([string]$titulo) {
    Write-Host ''
    Write-Host "=== $titulo " -ForegroundColor Cyan
}

function Write-Nota([string]$mensaje) {
    Write-Host "    $mensaje" -ForegroundColor DarkGray
}

function Test-Skipped([string]$stage) {
    if ($Skip -contains $stage) {
        $results[$stage] = 'omitida (-Skip)'
        Write-Stage "Etapa '$stage' omitida por -Skip"
        return $true
    }
    return $false
}

# --- Salvaguardas de ambiente ---------------------------------------------------------------

if ($Environment -in @('prod', 'production')) {
    throw "Suite bloqueada contra Production. La aceptación se corre en Dev o QA (docs/operacion/pruebas.md)."
}

if ($ApiUrl -match '//(app|api)\.medicore\.mx' -or $BaseUrl -match '//(app|api)\.medicore\.mx') {
    throw "URL productiva detectada ($ApiUrl / $BaseUrl). La suite escribe datos: no corre contra Production."
}

$aspnetEnv = if ($Environment -eq 'qa') { 'QA' } else { 'Development' }
Write-Host "MediCore - suite de pruebas | ambiente=$Environment (ASPNETCORE_ENVIRONMENT=$aspnetEnv)" -ForegroundColor White
Write-Nota "API=$ApiUrl | Frontend=$BaseUrl"
Write-Nota "Estrategia: docs/operacion/pruebas.md"

# --- 1. Build -------------------------------------------------------------------------------

if (-not (Test-Skipped 'build')) {
    Write-Stage 'dotnet build (solucion)'
    if (-not (Test-Path $solution)) {
        $results['build'] = 'FALLO (solución no encontrada)'
    }
    else {
        & dotnet build $solution --nologo
        $results['build'] = if ($LASTEXITCODE -eq 0) { 'OK' } else { "FALLO (exit $LASTEXITCODE)" }
    }
}

# --- 2. Pruebas .NET ------------------------------------------------------------------------

if (-not (Test-Skipped 'test')) {
    Write-Stage 'dotnet test (solucion)'
    $testProjects = @()
    if (Test-Path $solution) {
        $testProjects = @(& dotnet sln $solution list |
            Where-Object { $_ -match '\.csproj$' -and $_ -match '\.Tests?(\.|\\|/)' })
    }

    if ($testProjects.Count -eq 0) {
        $results['test'] = 'SIN PROYECTOS DE PRUEBA'
        Write-Nota 'La solución no tiene proyectos de prueba .NET. No hay nada que ejecutar en esta etapa.'
        Write-Nota 'No se reporta verde: cada módulo debe dejar sus pruebas (docs/operacion/pruebas.md).'
    }
    else {
        Write-Nota "Proyectos detectados: $($testProjects.Count)"
        & dotnet test $solution --nologo --no-build
        $results['test'] = if ($LASTEXITCODE -eq 0) { "OK ($($testProjects.Count) proyecto(s))" } else { "FALLO (exit $LASTEXITCODE)" }
    }
}

# --- 3. Frontend: tipos y lint --------------------------------------------------------------

if (-not (Test-Skipped 'frontend')) {
    Write-Stage 'frontend: type-check + lint'
    if (-not (Test-Path (Join-Path $frontendDir 'package.json'))) {
        $results['frontend'] = 'FALLO (frontend/package.json no encontrado)'
    }
    elseif (-not (Test-Path (Join-Path $frontendDir 'node_modules'))) {
        $results['frontend'] = 'NO EJECUTADA (falta npm install en frontend/)'
        Write-Nota 'Ejecute: cd frontend; npm install'
    }
    else {
        Push-Location $frontendDir
        try {
            & npm run type-check
            $tc = $LASTEXITCODE
            & npm run lint
            $lint = $LASTEXITCODE
        }
        finally { Pop-Location }

        $results['frontend'] = if ($tc -eq 0 -and $lint -eq 0) {
            'OK (type-check + lint)'
        }
        else {
            "FALLO (type-check=$tc, lint=$lint)"
        }
    }
}

# --- 4. E2E / contrato de API ---------------------------------------------------------------

if (-not (Test-Skipped 'e2e')) {
    Write-Stage 'E2E + contrato de API (Playwright, stack real)'
    $e2ePackage = Join-Path $e2eDir 'package.json'

    if (-not (Test-Path $e2ePackage)) {
        $results['e2e'] = 'FALLO (tests/e2e/package.json no encontrado)'
    }
    elseif (-not (Test-Path (Join-Path $e2eDir 'node_modules'))) {
        $results['e2e'] = 'NO EJECUTADA (falta npm install en tests/e2e)'
        Write-Nota 'Ejecute: cd tests/e2e; npm install; npx playwright install'
    }
    else {
        $scripts = (Get-Content $e2ePackage -Raw | ConvertFrom-Json).scripts
        if (-not $scripts.PSObject.Properties.Name.Contains('test')) {
            $results['e2e'] = 'FALLO (tests/e2e no expone script npm "test")'
        }
        else {
            # El API es la fuente de verdad del perfil: si permite PHI, no se automatiza contra él.
            $perfil = $null
            try {
                $perfil = (Invoke-RestMethod -Uri "$ApiUrl/api/health" -TimeoutSec 10 -Method Get).data
            }
            catch {
                $results['e2e'] = "NO EJECUTADA (API no responde en $ApiUrl/api/health)"
                Write-Nota 'Levante el API: dotnet run --project backend/Api --launch-profile http'
            }

            if ($perfil) {
                if ($perfil.allowRealPatientData) {
                    $results['e2e'] = 'ABORTADA (allowRealPatientData = true)'
                    Write-Host '    El API autoriza datos reales: la suite no corre contra PHI.' -ForegroundColor Red
                }
                elseif ($perfil.environment -match '^(?i)production$') {
                    $results['e2e'] = 'ABORTADA (API en Production)'
                    Write-Host '    El API reporta ambiente Production: E2E bloqueado.' -ForegroundColor Red
                }
                else {
                    Write-Nota "Perfil del API: environment=$($perfil.environment) isDemo=$($perfil.isDemo) dgis=$($perfil.dgisDestination)"
                    $env:MEDICORE_ENVIRONMENT = if ($Environment -eq 'qa') { 'qa' } else { 'development' }
                    $env:MEDICORE_API_URL = $ApiUrl
                    $env:MEDICORE_BASE_URL = $BaseUrl
                    # Segundo tenant sintético (seed 008). Vacío explícito en el entorno = skip.
                    if (-not $env:MEDICORE_TENANT_B -and $Environment -eq 'dev') {
                        $env:MEDICORE_TENANT_B = 'bravo'
                    }
                    Push-Location $e2eDir
                    try {
                        & npm test
                        $e2eExit = $LASTEXITCODE
                    }
                    finally { Pop-Location }
                    $results['e2e'] = if ($e2eExit -eq 0) { 'OK' } else { "FALLO (exit $e2eExit)" }
                }
            }
        }
    }
}

# --- Resumen --------------------------------------------------------------------------------

Write-Host ''
Write-Host '================ Resumen de la suite ================' -ForegroundColor White
foreach ($stage in $stageOrder) {
    $estado = $results[$stage]
    $color = switch -Regex ($estado) {
        '^OK' { 'Green' }
        '^(FALLO|ABORTADA)' { 'Red' }
        default { 'Yellow' }
    }
    Write-Host ("  {0,-9} {1}" -f $stage, $estado) -ForegroundColor $color
}
Write-Host '=====================================================' -ForegroundColor White

$fallidas = @($results.Keys | Where-Object { $results[$_] -match '^(FALLO|ABORTADA)' })
$incompletas = @($results.Keys | Where-Object { $results[$_] -match '^(NO EJECUTADA|SIN PROYECTOS|pendiente)' })

if ($incompletas.Count -gt 0) {
    Write-Host "Etapas sin ejecutar: $($incompletas -join ', '). La suite NO está completa." -ForegroundColor Yellow
}

if ($fallidas.Count -gt 0) {
    Write-Host "Etapas con falla: $($fallidas -join ', ')" -ForegroundColor Red
    exit 1
}

exit 0
