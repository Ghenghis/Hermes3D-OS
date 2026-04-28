# Hermes3D OS

Hermes3D OS is a standalone agent-controlled 3D print factory controller.

It uses the Hermes agent system as the printer-agent brain, LangGraph-style workflow gates for controlled execution, Moonraker/Klipper for printer control, slicer/modeling workers for fabrication tasks, and an internal job ledger for evidence, approvals, and telemetry.

This project does not require Goose, OpenHands, or OpenClaw to operate.

## Target Stack

```text
Hermes3D Standalone Web UI
        |
Hermes Agent System
        |
LangGraph workflow gates
        |
Tool / service layer
 ├─ Moonraker connector
 ├─ FDM Monster connector
 ├─ PrusaSlicer CLI worker
 ├─ OrcaSlicer worker
 ├─ CadQuery worker
 ├─ OpenSCAD worker
 ├─ Blender / Trimesh repair worker
 ├─ printer inventory database
 ├─ job/evidence ledger
 └─ safety/approval gate
        |
Pilot printers
 ├─ FLSUN T1-A
 └─ FLSUN T1-B
```

## Core Principle

Hermes decides, workflows gate, services execute.

- Hermes interprets user intent, plans jobs, remembers context, and calls tools.
- Workflow gates prevent unsafe jumps from prompt to print.
- Moonraker performs printer actions through explicit API calls.
- Slicer and modeling workers produce artifacts with captured evidence.
- The job ledger records models, G-code, decisions, approvals, telemetry, and failures.

## First Pilot Workflow

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
│  ├─ printers.pilot.example.yaml
│  └─ services.example.yaml
├─ docs
│  ├─ ARCHITECTURE.md
│  ├─ BRANCHING.md
│  ├─ DEVELOPMENT.md
│  ├─ GETTING_STARTED.md
│  ├─ HERMES_AGENT_SYSTEM.md
│  ├─ LOCAL_MODEL_SETUP.md
│  ├─ PRINTER_ONBOARDING.md
│  ├─ WORKFLOW_GATES.md
│  └─ ROADMAP.md
├─ packages
│  ├─ connectors
│  ├─ db
│  ├─ hermes_runtime
│  ├─ workflows
│  └─ workers
├─ profiles
│  └─ prusaslicer
└─ README.md
```

## Pilot Scope

The first working version should focus on the two FLSUN T1 printers:

- printer inventory records
- Moonraker connectivity
- PrusaSlicer CLI slicing
- manual model upload
- approval-gated print dispatch
- telemetry capture
- job evidence ledger

Model generation with the downloaded 3D/modeling LLM should come after the print pipeline is safe and observable.

## Start Here

For setup and operating context, read:

- [Getting Started](docs/GETTING_STARTED.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Branching Strategy](docs/BRANCHING.md)
- [Printer Onboarding](docs/PRINTER_ONBOARDING.md)
- [Local Model Setup](docs/LOCAL_MODEL_SETUP.md)
- [MVP Runbook](docs/MVP_RUNBOOK.md)
- [Test Printer Data](docs/TEST_PRINTER_DATA.md)
- [Day-To-Day Roadmap](docs/DAY_TO_DAY_ROADMAP.md)
- [2026 Research Action Plan](docs/RESEARCH_2026_ACTION_PLAN.md)
- [OS Interface Design](docs/OS_INTERFACE_DESIGN.md)

## Run The MVP

On Windows:

```powershell
.\scripts\setup.ps1
.\scripts\run-dev.ps1
```

Then open:

```text
the URL printed by scripts/run-dev.ps1
```

If the saved/default port is busy, `run-dev.ps1` automatically finds an open local port, saves it to `configs/runtime.local.yaml`, and prints the new URL.

The MVP runs in printer dry-run mode by default. It can create jobs, move through workflow gates, write evidence artifacts, simulate slicing when PrusaSlicer is unavailable, and simulate Moonraker dispatch without touching hardware.
