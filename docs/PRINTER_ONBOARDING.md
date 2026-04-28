# Printer Onboarding

Printer onboarding should be slow and evidence-based. Start with the two pilot FLSUN T1 printers, then add the rest of the fleet after dispatch and telemetry are stable.

## Pilot Printers

- FLSUN T1-A
- FLSUN T1-B

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

