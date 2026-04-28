# Printer Onboarding

Printer onboarding should be slow and evidence-based. Start with the two pilot FLSUN T1 printers, then add the rest of the fleet after dispatch and telemetry are stable.

## Pilot Printers

- FLSUN T1-A: `http://192.168.0.10`
- FLSUN T1-B: `http://192.168.0.11`

## Next Known Addresses

- FLSUN S1 maintenance locked, do not test or move: `http://192.168.0.12`
- FLSUN V400 confirmed and reachable: `http://192.168.0.34`
- FLSUN V400 alternates/history: `http://192.168.0.36` or `http://192.168.1.146`

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

Current note: S1 is in maintenance and must not be tested or moved because movement may damage the hotend. V400 is reachable through Moonraker on both port `80` and direct port `7125`.

## Safety Locks

The FLSUN S1 is disabled in `configs/printers.local.yaml` and `configs/printers.pilot.example.yaml`.

Do not run status tests, movement tests, upload tests, print tests, pause/resume tests, or cancel tests against S1 until the maintenance lock is removed.

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
