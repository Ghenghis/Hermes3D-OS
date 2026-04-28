param(
    [switch]$Json
)

$ErrorActionPreference = "Continue"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$RuntimeConfig = Join-Path $RepoRoot "configs\runtime.local.yaml"
if (-not (Test-Path $RuntimeConfig)) {
    $RuntimeConfig = Join-Path $RepoRoot "configs\runtime.example.yaml"
}

function Get-FirstCommand {
    param(
        [string[]]$Commands,
        [string[]]$KnownPaths = @()
    )

    foreach ($command in $Commands) {
        $found = Get-Command $command -ErrorAction SilentlyContinue
        if ($found) {
            return $found.Source
        }
    }

    foreach ($path in $KnownPaths) {
        if ($path -and (Test-Path $path)) {
            return $path
        }
    }

    return $null
}

function Get-VersionLine {
    param(
        [string]$Path,
        [string[]]$Args = @("--version")
    )

    if (-not $Path) {
        return ""
    }

    $process = $null
    try {
        $info = [System.Diagnostics.ProcessStartInfo]::new()
        $info.FileName = $Path
        $info.Arguments = ($Args | ForEach-Object {
            if ($_ -match '\s') { '"' + $_.Replace('"', '\"') + '"' } else { $_ }
        }) -join " "
        $info.RedirectStandardOutput = $true
        $info.RedirectStandardError = $true
        $info.UseShellExecute = $false
        $info.CreateNoWindow = $true
        $process = [System.Diagnostics.Process]::Start($info)
        if (-not $process.WaitForExit(3000)) {
            $process.Kill()
            return "version check timed out"
        }
        $stdout = $process.StandardOutput.ReadToEnd().Trim()
        $stderr = $process.StandardError.ReadToEnd().Trim()
        $line = ($stdout + "`n" + $stderr).Trim().Split("`n") | Select-Object -First 1
        return [string]$line
    }
    catch {
        return $_.Exception.Message
    }
    finally {
        if ($process) {
            $process.Dispose()
        }
    }
}

function Read-ServiceUrl {
    param(
        [string]$Path,
        [string]$Name
    )

    if (-not (Test-Path $Path)) {
        return ""
    }

    $inUrls = $false
    $indent = -1
    foreach ($line in Get-Content $Path) {
        if ($line -match '^(\s*)service_urls\s*:\s*$') {
            $inUrls = $true
            $indent = $Matches[1].Length
            continue
        }
        if (-not $inUrls) {
            continue
        }
        if ($line -match '^(\s*)[A-Za-z0-9_-]+\s*:') {
            if ($Matches[1].Length -le $indent) {
                break
            }
        }
        if ($line -match "^\s+$([regex]::Escape($Name))\s*:\s*(.+?)\s*$") {
            return $Matches[1].Trim()
        }
    }
    return ""
}

function Test-HttpEndpoint {
    param(
        [string]$Url,
        [string]$Path
    )

    if (-not $Url) {
        return @{ reachable = $false; reason = "not configured" }
    }

    try {
        Invoke-RestMethod -Uri "$($Url.TrimEnd('/'))/$Path" -TimeoutSec 2 | Out-Null
        return @{ reachable = $true; reason = "responded" }
    }
    catch {
        return @{ reachable = $false; reason = $_.Exception.Message }
    }
}

function Get-WorkflowStatus {
    param(
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        return @{ path = $Path; exists = $false; ready = $false; reason = "missing" }
    }

    try {
        $raw = Get-Content $Path -Raw
        $json = $raw | ConvertFrom-Json -ErrorAction Stop
        if ($json.template_status -eq "operator_config_required") {
            return @{
                path = $Path
                exists = $true
                ready = $false
                reason = "replace placeholder with exported ComfyUI API workflow"
            }
        }
        return @{ path = $Path; exists = $true; ready = $true; reason = "json present" }
    }
    catch {
        return @{ path = $Path; exists = $true; ready = $false; reason = $_.Exception.Message }
    }
}

$blender = $env:HERMES3D_BLENDER_PATH
if (-not $blender) {
    $blender = Get-FirstCommand -Commands @("blender") -KnownPaths @(
        "C:\Program Files\Blender Foundation\Blender 4.3\blender.exe",
        "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe",
        "C:\Program Files\Blender Foundation\Blender 4.1\blender.exe"
    )
}

$prusa = $env:HERMES3D_PRUSASLICER_PATH
if (-not $prusa) {
    $prusa = Get-FirstCommand -Commands @("prusa-slicer-console", "prusa-slicer") -KnownPaths @(
        "C:\Program Files\Prusa3D\PrusaSlicer\prusa-slicer-console.exe",
        "C:\Program Files\Prusa3D\PrusaSlicer\prusa-slicer.exe"
    )
}

$orca = $env:HERMES3D_ORCASLICER_PATH
if (-not $orca) {
    $orca = Get-FirstCommand -Commands @("orca-slicer") -KnownPaths @(
        "C:\Program Files\OrcaSlicer\orca-slicer.exe"
    )
}

$docker = Get-FirstCommand -Commands @("docker")
$comfyUrl = $env:HERMES3D_COMFYUI_URL
if (-not $comfyUrl) {
    $comfyUrl = Read-ServiceUrl -Path $RuntimeConfig -Name "comfyui"
}

$report = [ordered]@{
    runtime_config = $RuntimeConfig
    tools = [ordered]@{
        blender = @{ found = [bool]$blender; path = $blender; version = Get-VersionLine -Path $blender }
        prusaslicer = @{ found = [bool]$prusa; path = $prusa; version = Get-VersionLine -Path $prusa }
        orcaslicer = @{ found = [bool]$orca; path = $orca; version = Get-VersionLine -Path $orca }
        docker = @{ found = [bool]$docker; path = $docker; version = Get-VersionLine -Path $docker }
    }
    comfyui = [ordered]@{
        url = $comfyUrl
        system_stats = Test-HttpEndpoint -Url $comfyUrl -Path "system_stats"
        object_info = Test-HttpEndpoint -Url $comfyUrl -Path "object_info"
    }
    workflows = [ordered]@{
        trellis2 = Get-WorkflowStatus -Path (Join-Path $RepoRoot "workflows\comfyui\trellis2-image-to-3d.json")
        hunyuan3d21 = Get-WorkflowStatus -Path (Join-Path $RepoRoot "workflows\comfyui\hunyuan3d-2.1-image-to-3d.json")
        triposr = Get-WorkflowStatus -Path (Join-Path $RepoRoot "workflows\comfyui\triposr-fast-preview.json")
    }
}

if ($Json) {
    $report | ConvertTo-Json -Depth 8
    return
}

Write-Host "Hermes3D 3D generation discovery"
Write-Host "Runtime config: $RuntimeConfig"
Write-Host ""
foreach ($name in $report.tools.Keys) {
    $tool = $report.tools[$name]
    $status = if ($tool.found) { "OK" } else { "MISS" }
    Write-Host "[$status] $name $($tool.path)"
    if ($tool.version) {
        Write-Host "     $($tool.version)"
    }
}
Write-Host ""
Write-Host "ComfyUI: $($report.comfyui.url)"
Write-Host "  system_stats: $($report.comfyui.system_stats.reachable) - $($report.comfyui.system_stats.reason)"
Write-Host "  object_info:  $($report.comfyui.object_info.reachable) - $($report.comfyui.object_info.reason)"
Write-Host ""
foreach ($name in $report.workflows.Keys) {
    $workflow = $report.workflows[$name]
    $status = if ($workflow.ready) { "READY" } else { "ACTION" }
    Write-Host "[$status] workflow $name - $($workflow.reason)"
    Write-Host "         $($workflow.path)"
}
