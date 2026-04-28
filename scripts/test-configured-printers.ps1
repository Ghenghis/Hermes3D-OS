param(
    [string]$BaseUrl = "http://127.0.0.1:8080"
)

$ErrorActionPreference = "Stop"

Write-Host "Testing configured Hermes3D OS printers through $BaseUrl"
Write-Host ""

$printers = Invoke-RestMethod "$BaseUrl/api/printers"
$results = @()

foreach ($printer in $printers) {
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

