param(
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Python = Join-Path $RepoRoot ".venv\Scripts\python.exe"

Set-Location $RepoRoot

if (-not (Test-Path $Python)) {
    throw "Virtual environment not found. Run .\scripts\setup.ps1 first."
}

$env:HERMES3D_SERVICES_CONFIG = Join-Path $RepoRoot "configs\services.local.yaml"
$env:HERMES3D_PRINTERS_CONFIG = Join-Path $RepoRoot "configs\printers.local.yaml"
$env:PYTHONPATH = Join-Path $RepoRoot "apps\api"

& $Python -m uvicorn hermes3d_api.main:app --host 127.0.0.1 --port $Port --reload

