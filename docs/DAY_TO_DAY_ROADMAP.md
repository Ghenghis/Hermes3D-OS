# Day-To-Day Roadmap

This roadmap is the interactive path from the current MVP to daily printer-fleet use.

## Current Status

Done:

- local web dashboard
- FastAPI backend
- SQLite job/evidence ledger
- editable local printer config
- dry-run workflow gates
- model and print approvals
- Moonraker discovery script
- real read-only Moonraker status checks
- gated real Moonraker upload/start code path

## GitHub Action Tracker

- [#1 Confirm live Moonraker addresses for T1-A, T1-B, and V400](https://github.com/Ghenghis/Hermes3D-OS/issues/1)
- [#2 Add reviewed PrusaSlicer profiles for the test printers](https://github.com/Ghenghis/Hermes3D-OS/issues/2)
- [#3 Add upload-only workflow before real auto-start printing](https://github.com/Ghenghis/Hermes3D-OS/issues/3)
- [#4 Add real STL/3MF validation and preview evidence](https://github.com/Ghenghis/Hermes3D-OS/issues/4)
- [#5 Add local Hermes/modeling LLM connector](https://github.com/Ghenghis/Hermes3D-OS/issues/5)
- [#6 Add CadQuery and OpenSCAD model workers](https://github.com/Ghenghis/Hermes3D-OS/issues/6)
- [#7 Add day-to-day printer controls and telemetry](https://github.com/Ghenghis/Hermes3D-OS/issues/7)
- [#8 Add FDM Monster sidecar integration](https://github.com/Ghenghis/Hermes3D-OS/issues/8)

Still needs user-confirmed data:

- S1 Moonraker reachability at `http://192.168.0.12`
- V400 Speeder Pad reachability at `http://192.168.1.146`
- Moonraker API-key requirements
- real slicer profiles
- bed/nozzle dimensions
- whether each printer should use port `80` or `7125`

## Daily Startup Checklist

1. Power on the test printers.
2. Start Hermes3D OS:

```powershell
.\scripts\run-dev.ps1
```

3. Open:

```text
http://127.0.0.1:8080
```

4. Click `Load Printers`.
5. Click `Test` on each printer card.
6. Confirm the two T1 printers are reachable.
7. Confirm whether the S1 responds at `192.168.0.12`.
8. Confirm whether the V400 Speeder Pad responds at `192.168.1.146`.

Command-line version:

```powershell
.\scripts\test-configured-printers.ps1
```

## Phase 1: Confirm Printers

Goal: three real test printers appear as reachable.

Printers:

- FLSUN T1-A
- FLSUN T1-B
- FLSUN V400

Collect:

- exact Moonraker base URL
- API-key requirement
- bed size
- nozzle size
- slicer profile
- camera URL if available

## Phase 2: Real Slicer Profiles

Goal: Hermes3D OS can produce real printable G-code.

Tasks:

- install PrusaSlicer
- export or create FLSUN T1 profile
- export or create FLSUN V400 profile
- place reviewed profiles under `profiles/prusaslicer`
- verify `scripts/check-prereqs.ps1` sees PrusaSlicer CLI
- slice a known safe calibration STL

## Phase 3: First Real Upload Without Auto-Print

Goal: upload G-code to one printer without starting it.

This should be added as a separate workflow action before day-to-day printing:

```text
SLICE -> VALIDATE_GCODE -> PRINT_APPROVAL -> UPLOAD_ONLY -> USER_CHECKS_PRINTER_UI -> START_PRINT
```

## Phase 4: First Real Print

Goal: print a small known-safe calibration job on one T1.

Requirements:

- dry-run disabled only after user confirms
- real slicer-generated G-code
- model approval recorded
- print approval recorded
- printer reachable
- printer idle/ready
- user physically present

## Phase 5: Day-To-Day Queue

Goal: normal use for small shop-floor jobs.

Add:

- upload-only mode
- pause/cancel controls
- job history search
- filament/material fields
- per-printer profile locks
- camera links
- failure notes
- repeat job button

## Phase 6: Hermes Modeling

Goal: Hermes can generate or modify printable designs.

Add:

- local modeling LLM connector
- CadQuery worker
- OpenSCAD worker
- Trimesh validation
- preview generation
- user parameter editor

## Phase 7: Fleet Operations

Goal: operate the larger printer fleet.

Add:

- FDM Monster sidecar
- remaining printer inventory
- fleet health dashboard
- maintenance reminders
- historical reliability notes
- profile compatibility checks
