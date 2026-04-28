param(
    [string]$BaseUrl = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "runtime-ports.ps1")

if (-not $BaseUrl) {
    $runtimePorts = Get-HermesRuntimePorts -RepoRoot $RepoRoot
    $BaseUrl = "http://127.0.0.1:$($runtimePorts.api)"
}

Write-Host "Testing configured Hermes3D OS printers through $BaseUrl"
Write-Host ""

$printers = Invoke-RestMethod "$BaseUrl/api/printers"
$results = @()

foreach ($printer in $printers) {
    if (($printer.enabled -eq 0) -or $printer.capabilities.maintenance_lock -or $printer.capabilities.do_not_probe) {
        $message = $printer.capabilities.lock_reason
        if (-not $message) {
            $message = "Disabled or safety locked."
        }
        $results += [pscustomobject]@{
            Printer = $printer.name
            Url = $printer.base_url
            Ok = "SKIP"
            State = "locked"
            Message = $message
        }
        continue
    }

    try {
        $status = Invoke-RestMethod "$BaseUrl/api/printers/$($printer.id)/status"
        $printerState = $status.payload.printer.state
        $message = $status.payload.printer.state_message
        if (-not $message) {
            $message = $status.message
        }

        $results += [pscustomobject]@{
            Printer = $printer.name
            Url = $printer.base_url
            Ok = $status.ok
            State = $printerState
            Message = $message
        }
    }
    catch {
        $results += [pscustomobject]@{
            Printer = $printer.name
            Url = $printer.base_url
            Ok = $false
            State = "unknown"
            Message = $_.Exception.Message
        }
    }
}

$results | Format-Table -AutoSize

if ($results.Ok -contains $false) {
    exit 1
}

