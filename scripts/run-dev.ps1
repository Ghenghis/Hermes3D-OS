param(
    [int]$Port = 0,
    [switch]$AutoPort = $true
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Python = Join-Path $RepoRoot ".venv\Scripts\python.exe"
$RuntimeConfig = Join-Path $RepoRoot "configs\runtime.local.yaml"

. (Join-Path $PSScriptRoot "runtime-ports.ps1")

Set-Location $RepoRoot

if (-not (Test-Path $Python)) {
    throw "Virtual environment not found. Run .\scripts\setup.ps1 first."
}

$runtimePorts = Get-HermesRuntimePorts -RepoRoot $RepoRoot
$selectedPort = if ($Port -gt 0) { $Port } else { $runtimePorts.api }

if ($selectedPort -lt 1 -or $selectedPort -gt 65535) {
    throw "Port must be between 1 and 65535."
}

if (-not (Test-HermesPortAvailable -Port $selectedPort)) {
    if (-not $AutoPort) {
        throw "Port $selectedPort is already in use. Re-run with -AutoPort or choose a different -Port."
    }

    $startPort = [Math]::Min($selectedPort + 1, 65535)
    $nextPort = Find-HermesOpenPort -StartPort $startPort
    Write-Host "Port $selectedPort is busy; using open port $nextPort."
    $selectedPort = $nextPort
}

Save-HermesRuntimePorts -RepoRoot $RepoRoot -ApiPort $selectedPort -WebPort $selectedPort

$env:HERMES3D_SERVICES_CONFIG = Join-Path $RepoRoot "configs\services.local.yaml"
$env:HERMES3D_PRINTERS_CONFIG = Join-Path $RepoRoot "configs\printers.local.yaml"
$env:HERMES3D_RUNTIME_CONFIG = $RuntimeConfig
$env:PYTHONPATH = Join-Path $RepoRoot "apps\api"

Write-Host "Hermes3D API/web runtime saved to $RuntimeConfig."
Write-Host "Starting Hermes3D dev server on http://127.0.0.1:$selectedPort"

& $Python -m uvicorn hermes3d_api.main:app --host 127.0.0.1 --port $selectedPort --reload

