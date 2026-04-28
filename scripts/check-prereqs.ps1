$ErrorActionPreference = "Continue"

function Test-Tool {
    param(
        [string]$Name,
        [string[]]$Commands,
        [string]$Purpose
    )

    $found = $false
    foreach ($command in $Commands) {
        if (Get-Command $command -ErrorAction SilentlyContinue) {
            $found = $true
            break
        }
    }

    if ($found) {
        Write-Host "[OK] $Name - $Purpose"
    }
    else {
        Write-Host "[MISS] $Name - $Purpose"
    }
}

Write-Host "Hermes3D OS prerequisite check"
Write-Host ""

Test-Tool -Name "Python" -Commands @("py", "python") -Purpose "API server and workers"
Test-Tool -Name "Git" -Commands @("git") -Purpose "source control"
Test-Tool -Name "PrusaSlicer CLI" -Commands @("prusa-slicer", "prusa-slicer-console") -Purpose "first slicer worker"
Test-Tool -Name "OrcaSlicer" -Commands @("orca-slicer") -Purpose "future slicer worker"
Test-Tool -Name "OpenSCAD" -Commands @("openscad") -Purpose "parametric model worker"
Test-Tool -Name "Blender" -Commands @("blender") -Purpose "mesh repair/export worker"
Test-Tool -Name "Docker" -Commands @("docker") -Purpose "optional sidecars"

Write-Host ""
Write-Host "Missing desktop tools are optional for the dry-run MVP."
Write-Host "Run .\scripts\setup.ps1 -InstallDesktopTools to install supported desktop tools through winget."

