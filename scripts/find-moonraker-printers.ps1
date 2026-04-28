param(
    [string]$Subnet = "192.168.0",
    [int[]]$Hosts = @(10, 11, 34, 36),
    [int[]]$Ports = @(80, 7125),
    [int]$TimeoutSeconds = 2,
    [switch]$FullScan
)

$ErrorActionPreference = "Continue"

$HostList = if ($FullScan) { 1..254 } else { $Hosts }

Write-Host "Scanning $Subnet hosts: $($HostList -join ', ')"
Write-Host "Ports: $($Ports -join ', ')"
Write-Host ""

$results = @()

foreach ($hostId in $HostList) {
    $ip = "$Subnet.$hostId"
    foreach ($port in $Ports) {
        $baseUrl = if ($port -eq 80) { "http://$ip" } else { "http://$ip`:$port" }
        foreach ($path in @("/server/info", "/printer/info")) {
            $url = "$baseUrl$path"
            try {
                $response = Invoke-RestMethod `
                    -Uri $url `
                    -Method Get `
                    -TimeoutSec $TimeoutSeconds `
                    -ErrorAction Stop

                $results += [pscustomobject]@{
                    Ip = $ip
                    Port = $port
                    BaseUrl = $baseUrl
                    Endpoint = $path
                    Software = $response.software_version
                    Hostname = $response.hostname
                    State = $response.state
                }

                Write-Host "[FOUND] $baseUrl $path"
                break
            }
            catch {
                # Keep scanning quietly; powered-off printers and closed ports are expected.
            }
        }
    }
}

Write-Host ""

if ($results.Count -eq 0) {
    Write-Host "No Moonraker endpoints found."
    Write-Host "Confirm the printers are powered on, joined to Wi-Fi/Ethernet, and on the $Subnet.x network."
    Write-Host "Use -FullScan to scan $Subnet.1-254."
    exit 1
}

$results | Sort-Object Ip, Port | Format-Table -AutoSize

Write-Host ""
Write-Host "Copy the matching BaseUrl values into configs\printers.local.yaml."
