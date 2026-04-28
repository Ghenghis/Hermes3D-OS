param(
    [switch]$InstallDesktopTools
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$VenvPath = Join-Path $RepoRoot ".venv"
$Python = Join-Path $VenvPath "Scripts\python.exe"
$BundledPython = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

Set-Location $RepoRoot

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example"
}

if (-not (Test-Path "configs\services.local.yaml")) {
    Copy-Item "configs\services.example.yaml" "configs\services.local.yaml"
    Write-Host "Created configs\services.local.yaml"
}

if (-not (Test-Path "configs\printers.local.yaml")) {
    Copy-Item "configs\printers.pilot.example.yaml" "configs\printers.local.yaml"
    Write-Host "Created configs\printers.local.yaml"
}

if (-not (Test-Path $VenvPath)) {
    $BasePython = $null
    if (Get-Command py -ErrorAction SilentlyContinue) {
        $BasePython = "py"
        & py -3.11 -m venv $VenvPath
    }
    elseif (Test-Path $BundledPython) {
        $BasePython = $BundledPython
        & $BundledPython -m venv $VenvPath
    }
    elseif (Get-Command python -ErrorAction SilentlyContinue) {
        $BasePython = "python"
        & python -m venv $VenvPath
    }
    elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
        $BasePython = "python3"
        & python3 -m venv $VenvPath
    }
    else {
        throw "Python was not found. Install Python 3.11+ or run inside an environment with Python available."
    }
    Write-Host "Created Python virtual environment"
}

& $Python -m pip install --upgrade pip
& $Python -m pip install -r requirements.txt

if ($InstallDesktopTools) {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        Write-Warning "winget was not found. Install desktop tools manually."
    }
    else {
        $packages = @(
            "Prusa3D.PrusaSlicer",
            "OpenSCAD.OpenSCAD",
            "BlenderFoundation.Blender"
        )
        foreach ($package in $packages) {
            Write-Host "Installing/checking $package through winget"
            winget install --id $package --source winget --accept-package-agreements --accept-source-agreements
        }
    }
}

Write-Host ""
Write-Host "Hermes3D OS setup complete."
Write-Host "Run: .\scripts\run-dev.ps1"
