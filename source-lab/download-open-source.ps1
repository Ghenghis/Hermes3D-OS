param(
  [string[]]$Groups = @(),
  [string[]]$Only = @(),
  [switch]$FullCheckout,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")
$manifestPath = Join-Path $scriptDir "source_manifest.json"
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$sourceRoot = Join-Path $repoRoot $manifest.sourceRoot
$reportPath = Join-Path $scriptDir "download-report.md"
$env:GIT_LFS_SKIP_SMUDGE = "1"

New-Item -ItemType Directory -Force -Path $sourceRoot | Out-Null

function Invoke-Git {
  git @args
  if ($LASTEXITCODE -ne 0) {
    throw "git $($args -join ' ') failed with exit code $LASTEXITCODE"
  }
}

$sparsePaths = @(
  "/README.md",
  "/README",
  "/README.txt",
  "/readme.md",
  "/LICENSE",
  "/LICENSE.md",
  "/LICENSE.txt",
  "/license.txt",
  "/COPYING",
  "/app/",
  "/bin/",
  "/client/",
  "/db/",
  "/docs/",
  "/firmware/",
  "/include/",
  "/klippy/",
  "/lib/",
  "/src/",
  "/source/",
  "/packages/",
  "/apps/",
  "/server/",
  "/tests/",
  "/tools/",
  "/frontend/",
  "/backend/",
  "/web/",
  "/resources/",
  "/presets/",
  "/profiles/",
  "/config/",
  "/configs/",
  "/scripts/",
  "/plugins/",
  "/plugins.json",
  "/package.json",
  "/pyproject.toml",
  "/CMakeLists.txt",
  "/setup.py"
)

function Get-Modules {
  $items = @()
  foreach ($group in $manifest.groups.PSObject.Properties) {
    if ($Groups.Count -gt 0 -and $Groups -notcontains $group.Name) {
      continue
    }

    foreach ($module in $group.Value) {
      if ($Only.Count -gt 0 -and ($Only -notcontains $module.id) -and ($Only -notcontains $module.name)) {
        continue
      }

      $module | Add-Member -NotePropertyName group -NotePropertyValue $group.Name -Force
      $items += $module
    }
  }
  return $items
}

function Write-ReportHeader {
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $lines = @()
  $lines += "# Hermes3D-OS Open Source Download Report"
  $lines += ""
  $lines += "Generated: $stamp"
  $lines += ""
  $lines += "Source root: $($manifest.sourceRoot)"
  $lines += ""
  $lines += "| Status | Group | Module | Local path | Notes |"
  $lines += "| --- | --- | --- | --- | --- |"
  Set-Content -LiteralPath $reportPath -Value $lines
}

function Add-ReportLine($status, $group, $name, $target, $notes) {
  $safeNotes = ($notes -replace "\|", "/")
  Add-Content -LiteralPath $reportPath -Value ("| $status | $group | $name | ``$target`` | $safeNotes |")
}

Write-ReportHeader

foreach ($module in Get-Modules) {
  $target = Join-Path $sourceRoot $module.target
  $relativeTarget = Join-Path $manifest.sourceRoot $module.target

  if (-not $module.repo) {
    New-Item -ItemType Directory -Force -Path $target | Out-Null
    $notePath = Join-Path $target "README-HERMES3D.txt"
    Set-Content -LiteralPath $notePath -Value @(
      "$($module.name)",
      "No confirmed public source repository is configured yet.",
      "Use this folder for user-provided installers, profiles, exported printer definitions, or source URLs.",
      "Hermes3D bridge: $($module.bridge -join '; ')"
    )
    Add-ReportLine "profile-needed" $module.group $module.name $relativeTarget "No public repo configured; folder prepared."
    continue
  }

  if ((Test-Path -LiteralPath (Join-Path $target ".git")) -and -not $Force) {
    Push-Location $target
    try {
      Invoke-Git sparse-checkout set --no-cone @sparsePaths
    } catch {
      Write-Warning "Could not refresh sparse paths for $($module.name): $($_.Exception.Message)"
    } finally {
      Pop-Location
    }
    Add-ReportLine "present" $module.group $module.name $relativeTarget "Already cloned; skipped."
    continue
  }

  if ((Test-Path -LiteralPath $target) -and $Force) {
    Remove-Item -LiteralPath $target -Recurse -Force
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null

    try {
    if ($FullCheckout) {
      Invoke-Git clone --depth 1 --no-tags --filter=blob:none $module.repo $target
    } else {
      Invoke-Git clone --depth 1 --no-tags --filter=blob:none --sparse $module.repo $target
      Push-Location $target
      try {
        Invoke-Git sparse-checkout set --no-cone @sparsePaths
      } finally {
        Pop-Location
      }
    }

    Add-ReportLine "cloned" $module.group $module.name $relativeTarget "Repo cloned with $(if ($FullCheckout) { 'full checkout' } else { 'sparse checkout' })."
  } catch {
    Add-ReportLine "failed" $module.group $module.name $relativeTarget $_.Exception.Message
    Write-Warning "Failed to clone $($module.name): $($_.Exception.Message)"
  }
}

Write-Host "Download report: $reportPath"
