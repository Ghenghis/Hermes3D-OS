$ErrorActionPreference = "Stop"

function Get-HermesRuntimePorts {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )

    $localPath = Join-Path $RepoRoot "configs\runtime.local.yaml"
    $examplePath = Join-Path $RepoRoot "configs\runtime.example.yaml"
    $ports = @{
        api = 8080
        web = 8080
    }

    $configPath = $null
    if (Test-Path $localPath) {
        $configPath = $localPath
    } elseif (Test-Path $examplePath) {
        $configPath = $examplePath
    }

    if ($configPath) {
        $readPorts = Read-HermesYamlPorts -Path $configPath
        foreach ($name in @("api", "web")) {
            if ($readPorts.ContainsKey($name)) {
                $ports[$name] = $readPorts[$name]
            }
        }
    }

    return $ports
}

function Get-HermesMoonrakerScanPorts {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )

    $localPath = Join-Path $RepoRoot "configs\runtime.local.yaml"
    $examplePath = Join-Path $RepoRoot "configs\runtime.example.yaml"
    $configPath = $null
    if (Test-Path $localPath) {
        $configPath = $localPath
    } elseif (Test-Path $examplePath) {
        $configPath = $examplePath
    }

    if (-not $configPath) {
        return @(80, 7125)
    }

    $ports = Read-HermesYamlIntegerList -Path $configPath -Key "moonraker_scan_ports"
    if ($ports.Count -eq 0) {
        return @(80, 7125)
    }

    return $ports
}

function Read-HermesYamlPorts {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $ports = @{}
    $inPorts = $false
    $portsIndent = -1

    foreach ($line in Get-Content -Path $Path) {
        if ($line -match '^(\s*)ports\s*:\s*(?:#.*)?$') {
            $inPorts = $true
            $portsIndent = $Matches[1].Length
            continue
        }

        if (-not $inPorts) {
            continue
        }

        if ($line -match '^\s*(?:#.*)?$') {
            continue
        }

        if ($line -match '^(\s*)[A-Za-z0-9_-]+\s*:') {
            $indent = $Matches[1].Length
            if ($indent -le $portsIndent) {
                break
            }
        }

        if ($line -match '^\s+([A-Za-z0-9_-]+)\s*:\s*([0-9]+)\b') {
            $ports[$Matches[1]] = [int]$Matches[2]
        }
    }

    return $ports
}

function Read-HermesYamlIntegerList {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$Key
    )

    $values = New-Object System.Collections.Generic.List[int]
    $inList = $false
    $listIndent = -1

    foreach ($line in Get-Content -Path $Path) {
        if ($line -match "^(\s*)$([regex]::Escape($Key))\s*:\s*(?:#.*)?$") {
            $inList = $true
            $listIndent = $Matches[1].Length
            continue
        }

        if (-not $inList) {
            continue
        }

        if ($line -match '^\s*(?:#.*)?$') {
            continue
        }

        if ($line -match '^(\s*)[A-Za-z0-9_-]+\s*:') {
            if ($Matches[1].Length -le $listIndent) {
                break
            }
        }

        if ($line -match '^\s*-\s*([0-9]+)\b') {
            $values.Add([int]$Matches[1])
        }
    }

    return $values.ToArray()
}

function Test-HermesPortAvailable {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateRange(1, 65535)]
        [int]$Port
    )

    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
        $listener.Start()
        return $true
    } catch {
        return $false
    } finally {
        if ($listener) {
            $listener.Stop()
        }
    }
}

function Find-HermesOpenPort {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateRange(1, 65535)]
        [int]$StartPort
    )

    for ($port = $StartPort; $port -le 65535; $port++) {
        if (Test-HermesPortAvailable -Port $port) {
            return $port
        }
    }

    for ($port = 1; $port -lt $StartPort; $port++) {
        if (Test-HermesPortAvailable -Port $port) {
            return $port
        }
    }

    throw "No open TCP port found."
}

function Save-HermesRuntimePorts {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,

        [Parameter(Mandatory = $true)]
        [ValidateRange(1, 65535)]
        [int]$ApiPort,

        [Parameter(Mandatory = $true)]
        [ValidateRange(1, 65535)]
        [int]$WebPort
    )

    $configDir = Join-Path $RepoRoot "configs"
    $localPath = Join-Path $configDir "runtime.local.yaml"
    $examplePath = Join-Path $configDir "runtime.example.yaml"

    if (Test-Path $localPath) {
        $lines = @(Get-Content -Path $localPath)
    } elseif (Test-Path $examplePath) {
        $lines = @(Get-Content -Path $examplePath)
    } else {
        $lines = @(
            "api_host: 127.0.0.1",
            "ports:",
            "  api: 8080",
            "  web: 8080"
        )
    }

    $updated = Set-HermesYamlPorts -Lines $lines -ApiPort $ApiPort -WebPort $WebPort

    New-Item -ItemType Directory -Force -Path $configDir | Out-Null
    Set-Content -Path $localPath -Value $updated -Encoding utf8
}

function Set-HermesYamlPorts {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Lines,

        [Parameter(Mandatory = $true)]
        [int]$ApiPort,

        [Parameter(Mandatory = $true)]
        [int]$WebPort
    )

    $portsLine = -1
    $portsIndent = 0

    for ($i = 0; $i -lt $Lines.Count; $i++) {
        if ($Lines[$i] -match '^(\s*)ports\s*:\s*(?:#.*)?$') {
            $portsLine = $i
            $portsIndent = $Matches[1].Length
            break
        }
    }

    if ($portsLine -lt 0) {
        $result = New-Object System.Collections.Generic.List[string]
        $result.AddRange([string[]]$Lines)
        if ($result.Count -gt 0 -and $result[$result.Count - 1].Trim().Length -gt 0) {
            $result.Add("")
        }
        $result.Add("ports:")
        $result.Add("  api: $ApiPort")
        $result.Add("  web: $WebPort")
        return $result.ToArray()
    }

    $blockEnd = $Lines.Count
    for ($i = $portsLine + 1; $i -lt $Lines.Count; $i++) {
        if ($Lines[$i] -match '^\s*(?:#.*)?$') {
            continue
        }
        if ($Lines[$i] -match '^(\s*)[A-Za-z0-9_-]+\s*:') {
            if ($Matches[1].Length -le $portsIndent) {
                $blockEnd = $i
                break
            }
        }
    }

    $childIndent = (" " * ($portsIndent + 2))
    for ($i = $portsLine + 1; $i -lt $blockEnd; $i++) {
        if ($Lines[$i] -match '^(\s+)[A-Za-z0-9_-]+\s*:') {
            $childIndent = $Matches[1]
            break
        }
    }

    $seenApi = $false
    $seenWeb = $false
    $result = New-Object System.Collections.Generic.List[string]

    for ($i = 0; $i -lt $Lines.Count; $i++) {
        if ($i -gt $portsLine -and $i -lt $blockEnd) {
            if ($Lines[$i] -match '^\s+api\s*:') {
                $result.Add("${childIndent}api: $ApiPort")
                $seenApi = $true
                continue
            }
            if ($Lines[$i] -match '^\s+web\s*:') {
                $result.Add("${childIndent}web: $WebPort")
                $seenWeb = $true
                continue
            }
        }

        $result.Add($Lines[$i])

        if ($i -eq $portsLine) {
            if (-not $seenApi -and -not (Test-HermesPortKeyInBlock -Lines $Lines -Start ($portsLine + 1) -End $blockEnd -Name "api")) {
                $result.Add("${childIndent}api: $ApiPort")
                $seenApi = $true
            }
            if (-not $seenWeb -and -not (Test-HermesPortKeyInBlock -Lines $Lines -Start ($portsLine + 1) -End $blockEnd -Name "web")) {
                $result.Add("${childIndent}web: $WebPort")
                $seenWeb = $true
            }
        }
    }

    return $result.ToArray()
}

function Test-HermesPortKeyInBlock {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Lines,

        [Parameter(Mandatory = $true)]
        [int]$Start,

        [Parameter(Mandatory = $true)]
        [int]$End,

        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    for ($i = $Start; $i -lt $End; $i++) {
        if ($Lines[$i] -match "^\s+$([regex]::Escape($Name))\s*:") {
            return $true
        }
    }

    return $false
}
