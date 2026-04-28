# MVP Runbook

This runbook covers the current runnable Hermes3D OS MVP.

## What Works Now

- FastAPI backend
- SQLite job/evidence ledger
- standalone web dashboard
- pilot printer inventory from YAML
- job creation
- workflow gate advancement
- model approval gate
- print approval gate
- simulated slicing fallback
- dry-run Moonraker dispatch
- telemetry/event recording
- smoke test script

## Start The App

```powershell
.\scripts\setup.ps1
.\scripts\run-dev.ps1
```

Open:

```text
http://127.0.0.1:8080
```

## Run The Smoke Test

Start the app first, then run:

```powershell
.\scripts\smoke-test.ps1
```

Expected result:

```text
Smoke test job #<id> finished in state COMPLETE
```

## Dry-Run Safety

Printer actions are dry-run by default.

The MVP records upload/start events but does not mutate printer hardware. This keeps the UI and workflow testable before real Moonraker dispatch is enabled.

## Local Files

Setup creates local-only files:

- `.env`
- `configs/services.local.yaml`
- `configs/printers.local.yaml`
- `data/hermes3d.sqlite`
- `storage/jobs/...`

These are intentionally ignored by Git.

## Next Implementation Tasks

1. Add automated tests for workflow gates.
2. Add real Moonraker upload/start support behind dry-run config.
3. Add PrusaSlicer profile validation.
4. Add real STL/3MF validation through Trimesh.
5. Add Hermes runtime tool contracts.
6. Add local modeling LLM connector.
7. Add CadQuery/OpenSCAD model generation worker.
8. Add FDM Monster sidecar connector.

