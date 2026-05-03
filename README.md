# Hermes3D OS

Hermes3D OS is a local-first, agent-controlled 3D print factory operating surface. It is not just a printer dashboard: it ties source-backed tools, CAD/modeling workers, generation engines, slicers, printer dispatch, camera evidence, approvals, and audit history into one operator shell.

The current web app starts on **Source OS** because Hermes3D now treats open-source slicers, modelers, print-farm tools, firmware, generation engines, material systems, and research projects as first-class factory modules.

## Current OS Surface

The live app exposes 16 pages:

```text
Source OS -> Dashboard -> Autopilot -> Design -> 3D Generation
Jobs -> Printers -> Observe -> Voice -> Agents -> Learning
Artifacts -> Approvals -> Plugins -> Settings -> Roadmap
```

Source inventory status on 2026-05-03:

- 55 manifest modules.
- 0 missing local checkout folders.
- 3 full working-tree slicer checkouts: PrusaSlicer, OrcaSlicer, FLSUN Slicer.
- 52 sparse working-tree checkouts held as reference modules until promoted.

The main digital thread is:

```text
Source Bench
  -> Design/CAD
  -> 3D Generation
  -> Slicer Compiler
  -> Dispatch
  -> Observation
  -> Materials/Calibration
  -> Trust/Audit
```

## Factory Flows

Hermes3D OS keeps the important production flows visible instead of hiding them behind one "print" button:

| Flow | Gate shape |
| --- | --- |
| Source Bench | repo -> adapter -> checkout -> bridge -> promote |
| Design/CAD | brief -> source CAD -> execute -> geometry QA -> model approval |
| 3D Generation | image -> 3D engine -> repair -> printability -> candidate |
| Slicer Compiler | profile lock -> slice -> preview -> G-code QA -> print approval |
| Dispatch | select printer -> upload only -> operator check -> start -> monitor |
| Observation | snapshot -> first layer -> anomaly -> event -> report |
| Materials | spool -> profile -> coupon -> measurement -> confidence |
| Trust/Audit | scope -> permission -> ledger -> artifact -> export |

## Runtime Stack

```text
Hermes3D OS web shell
        |
FastAPI local service layer
        |
Hermes agent system and workflow gates
        |
Workers, connectors, and evidence stores
 ├─ Source OS module registry
 ├─ Moonraker / Klipper connector
 ├─ FDM Monster sidecar connector
 ├─ PrusaSlicer / OrcaSlicer / FLSUN profile bridge
 ├─ TRELLIS.2 / Hunyuan3D / TripoSR generation stack
 ├─ CadQuery / OpenSCAD / Blender / Trimesh workers
 ├─ printer inventory database
 ├─ job, artifact, approval, and event ledger
 ├─ camera and visual-evidence surfaces
 ├─ voice provider adapter
 └─ safety and approval gates
        |
Pilot printers
 ├─ FLSUN T1-A
 ├─ FLSUN T1-B
 ├─ FLSUN V400
 └─ FLSUN S1 maintenance locked
```

## Core Principle

Hermes decides, workflows gate, services execute.

- Hermes interprets user intent, plans jobs, remembers context, and calls tools.
- Workflow gates prevent unsafe jumps from prompt to print.
- Moonraker performs printer actions through explicit API calls.
- Slicer and modeling workers produce artifacts with captured evidence.
- The ledger records models, G-code, decisions, approvals, telemetry, and failures.

## Pilot Workflow

```text
INTAKE
  -> PLAN_JOB
  -> GENERATE_OR_IMPORT_MODEL
  -> VALIDATE_MODEL
  -> MODEL_APPROVAL
  -> SLICE
  -> VALIDATE_GCODE
  -> PRINT_APPROVAL
  -> SELECT_PRINTER
  -> UPLOAD_ONLY
  -> USER_CHECKED_PRINTER_UI
  -> START_PRINT
  -> MONITOR_PRINT
  -> COMPLETE / PAUSE / FAIL / CANCEL
```

## Repository Layout

```text
Hermes3D-OS
├─ apps
│  ├─ api
│  └─ web
├─ configs
├─ docs
├─ packages
├─ profiles
├─ scripts
├─ source-lab
│  └─ sources       # local checkouts, kept out of git
├─ storage
└─ README.md
```

## Run The MVP

On Windows:

```powershell
.\scripts\setup.ps1
.\scripts\run-dev.ps1
```

Then open the URL printed by `scripts/run-dev.ps1`.

If the saved/default port is busy, `run-dev.ps1` automatically finds an open local port, saves it to `configs/runtime.local.yaml`, and prints the new URL.

For local 3D generation readiness:

```powershell
.\scripts\discover-3d-tools.ps1
```

The MVP runs in printer dry-run mode by default. It can create jobs, move through workflow gates, write evidence artifacts, simulate slicing when PrusaSlicer is unavailable, and simulate Moonraker dispatch without touching hardware.

## Start Here

- [Getting Started](docs/GETTING_STARTED.md)
- [MVP Runbook](docs/MVP_RUNBOOK.md)
- [OS Interface Design](docs/OS_INTERFACE_DESIGN.md)
- [Source-backed UI proof](docs/UI_VISUAL_PROOF.md)
- [Full-Stack 3D Generation](docs/FULL_STACK_3D_GENERATION.md)
- [Idle Learning Mode](docs/IDLE_LEARNING_MODE.md)
- [Agentic Work System](docs/AGENTIC_WORK_SYSTEM.md)
- [Day-To-Day Roadmap](docs/DAY_TO_DAY_ROADMAP.md)
- [2026 Research Action Plan](docs/RESEARCH_2026_ACTION_PLAN.md)
