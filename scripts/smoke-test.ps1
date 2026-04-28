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

$health = Invoke-RestMethod "$BaseUrl/health"
if (-not $health.ok) {
    throw "Health check failed"
}

$job = Invoke-RestMethod "$BaseUrl/api/jobs" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"title":"Smoke test dry-run job","description":"Verify Hermes3D OS MVP workflow gates."}'

for ($i = 0; $i -lt 4; $i++) {
    $job = Invoke-RestMethod "$BaseUrl/api/jobs/$($job.id)/advance" `
        -Method Post `
        -ContentType "application/json" `
        -Body '{}'
}

$job = Invoke-RestMethod "$BaseUrl/api/jobs/$($job.id)/approvals/MODEL_APPROVAL" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"approved":true,"note":"Smoke test model approval."}'

for ($i = 0; $i -lt 2; $i++) {
    $job = Invoke-RestMethod "$BaseUrl/api/jobs/$($job.id)/advance" `
        -Method Post `
        -ContentType "application/json" `
        -Body '{}'
}

$job = Invoke-RestMethod "$BaseUrl/api/jobs/$($job.id)/approvals/PRINT_APPROVAL" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"approved":true,"note":"Smoke test print approval."}'

$job = Invoke-RestMethod "$BaseUrl/api/jobs/$($job.id)/upload-only" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{}'

$job = Invoke-RestMethod "$BaseUrl/api/jobs/$($job.id)/start-print" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{}'

for ($i = 0; $i -lt 2; $i++) {
    $job = Invoke-RestMethod "$BaseUrl/api/jobs/$($job.id)/advance" `
        -Method Post `
        -ContentType "application/json" `
        -Body '{}'
}

Write-Host "Smoke test job #$($job.id) finished in state $($job.state)"
