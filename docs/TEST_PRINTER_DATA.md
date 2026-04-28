# Test Printer Data

Use this checklist while the two FLSUN T1 printers and the FLSUN V400 are powered on.

The goal is to replace every guessed or mocked value with user-confirmed data before enabling real printer dispatch.

## Test Printers

| Printer | Current expected URL | Needs confirmation |
| --- | --- | --- |
| FLSUN T1-A | `http://192.168.0.10` | yes |
| FLSUN T1-B | `http://192.168.0.11` | yes |
| FLSUN S1 | `http://192.168.0.12` | confirmed reachable |
| FLSUN V400 | `http://192.168.0.34` | confirmed reachable |
| FLSUN V400 alternate | `http://192.168.0.36` | maybe |
| FLSUN V400 Speeder Pad history | `http://192.168.1.146` | old network |

## Where To Find The Needed Data

### Printer Screen

Look for network or Wi-Fi details on the printer touchscreen:

- IP address
- printer hostname, if shown
- firmware or Klipper/Moonraker status

### Router / Network App

Open the router admin page or network app and look at connected devices.

Useful names may include:

- `flsun`
- `t1`
- `v400`
- `mks`
- `klipper`
- `moonraker`
- `fluidd`
- `mainsail`

Record:

- IP address
- MAC address if visible
- hostname/device name

### Mainsail / Fluidd Browser Page

Try these URLs in a browser:

```text
http://192.168.0.10
http://192.168.0.11
http://192.168.0.12
http://192.168.0.34
http://192.168.0.36
http://192.168.1.146
```

If the printer UI opens, the base URL is probably correct.

### Moonraker API Probe

Try:

```text
http://192.168.0.10/server/info
http://192.168.0.11/server/info
http://192.168.0.12/server/info
http://192.168.0.34/server/info
http://192.168.0.36/server/info
http://192.168.1.146/server/info
```

If port `80` does not respond, also try Moonraker's common direct port:

```text
http://192.168.0.10:7125/server/info
http://192.168.0.11:7125/server/info
http://192.168.0.12:7125/server/info
http://192.168.0.34:7125/server/info
http://192.168.0.36:7125/server/info
http://192.168.1.146:7125/server/info
```

## Scanner Script

With the printers powered on, run:

```powershell
.\scripts\find-moonraker-printers.ps1
```

By default this checks the known candidates:

```text
192.168.0.10
192.168.0.11
192.168.0.12
192.168.0.34
192.168.0.36
```

To check the old V400 Speeder Pad address:

```powershell
.\scripts\find-moonraker-printers.ps1 -Subnet 192.168.1 -Hosts 146
```

To scan another subnet:

```powershell
.\scripts\find-moonraker-printers.ps1 -Subnet 192.168.1
```

To scan every address in the subnet:

```powershell
.\scripts\find-moonraker-printers.ps1 -FullScan
```

The script prints any detected Moonraker base URLs. Copy confirmed values into:

```text
configs\printers.local.yaml
```

After Hermes3D OS is running, test the configured printer records:

```powershell
.\scripts\test-configured-printers.ps1
```

## Editable Mock / Local Values

The MVP deliberately keeps guessed values in editable local config files:

- `configs\printers.local.yaml`: printer names, IPs, slicer profiles, capability notes
- `configs\services.local.yaml`: dry-run mode, model endpoint, worker settings
- `.env`: API keys and local secrets

The committed examples are templates:

- `configs\printers.pilot.example.yaml`
- `configs\services.example.yaml`
- `.env.example`

## Ask The User For These Values

Before real printer dispatch is enabled, confirm:

- Is T1-A definitely `192.168.0.10`?
- Is T1-B definitely `192.168.0.11`?
- Is S1 Moonraker available at `192.168.0.12` on port `80` or `7125`? Yes, latest scan found both.
- Is V400 definitely `192.168.0.34`? Yes.
- Does V400 Moonraker answer on port `80` or `7125`? Yes, latest scan found both.
- Does Moonraker answer on port `80` or `7125`?
- Does Moonraker require an API key?
- What slicer profile should each printer use?
- What bed size and nozzle size should be recorded for each printer?

If the user does not know, use the scanner script, printer screen, router connected-device list, and Mainsail/Fluidd pages to find the answers.

## Current Scan Result

The first scan found the two T1 printers:

```text
http://192.168.0.10
http://192.168.0.10:7125
http://192.168.0.11
http://192.168.0.11:7125
```

The latest scan found:

```text
http://192.168.0.12
http://192.168.0.12:7125
http://192.168.0.34
http://192.168.0.34:7125
```

Hermes also read status successfully for T1-A, T1-B, S1, and V400 through `scripts\test-configured-printers.ps1`.
