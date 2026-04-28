# Printer Onboarding

Printer onboarding should be slow and evidence-based. Start with the two pilot FLSUN T1 printers, then add the rest of the fleet after dispatch and telemetry are stable.

## Pilot Printers

- FLSUN T1-A: `http://192.168.0.10`
- FLSUN T1-B: `http://192.168.0.11`

## Next Known Addresses

- FLSUN S1 confirmed IP: `http://192.168.0.12`
- FLSUN V400 Speeder Pad: `http://192.168.1.146`
- FLSUN V400 old candidates: `http://192.168.0.34` or `http://192.168.0.36`

## Later Fleet

- FLSUN V400
- FLSUN QQ-S Pro
- FLSUN Super Racer
- Creality CR-10S
- FLSUN S1
- Tronxy D01 Pro Enclosed
- Tronxy X5SA Pro
- Creality CR-6 Max
- Prusa MK3S
- Sovol SV-01

## Onboarding Checklist

For each printer, capture:

- printer ID
- display name
- vendor and model
- firmware type
- Moonraker URL
- Moonraker API key environment variable
- slicer profile path
- bed size
- nozzle diameter
- filament diameter
- camera URL if available
- enclosure state if available
- known limitations

## Immediate Test Data Needed

For the two FLSUN T1 printers and the FLSUN V400, ask the user if they already know:

- the exact IP address
- whether Moonraker responds on port `80` or `7125`
- whether Moonraker requires an API key
- the preferred slicer profile
- bed size
- nozzle size

If they do not know, collect it from the printer screen, the router connected-device list, or by running:

```powershell
.\scripts\find-moonraker-printers.ps1
```

Keep guessed values in `configs\printers.local.yaml` and update them as soon as the real values are known.

Current note: S1 IP is confirmed as `192.168.0.12`, but Moonraker did not answer on port `80` or `7125` during the latest test.

## Safety Validation

Before enabling dispatch:

- confirm Moonraker status endpoint works
- confirm printer is correctly named in the UI
- confirm uploaded file appears on the correct printer
- confirm pause/cancel commands work
- confirm telemetry reads temperatures and state
- confirm slicer profile matches printer dimensions
- run a small manual test print

## Inventory Source of Truth

Hermes3D OS should own the printer inventory. FDM Monster may mirror or display fleet state, but it should not be the only source of truth.
