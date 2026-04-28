# Hermes OS Print Factory Continuation

Use this after reboot to resume work quickly.

## Current Repo State

- Repository: `G:\Github\Hermes3D-OS`
- GitHub: `https://github.com/Ghenghis/Hermes3D-OS`
- Branch: `develop`
- Latest synced commit before the 2026 research roadmap pass: `cfbeafa`
- Commit message: `feat: add printer camera URL editor`
- Working tree was clean when this file was created.

All tracked branches were synced to `cfbeafa` before the 2026 research roadmap pass:

- `main`
- `develop`
- `feature/docs`
- `feature/api`
- `feature/web-ui`
- `feature/hermes-runtime`
- `feature/workflow-gates`
- `feature/moonraker-connector`
- `feature/slicer-worker`
- `feature/modeling-worker`
- `feature/fdm-monster-sidecar`

## Restart After Reboot

Open PowerShell:

```powershell
cd G:\Github\Hermes3D-OS
git status --short --branch
.\scripts\run-dev.ps1
```

Open the URL printed by `run-dev.ps1`.

The local saved runtime config currently uses:

```text
API/web: http://127.0.0.1:8080
camera_proxy: 43000
telemetry: 43001
model_llm: 1234
fdm_monster: 4000
```

If `8080` is busy, `run-dev.ps1` should automatically find and save an open port in `configs/runtime.local.yaml`.

## Safety State

Do not test or move the FLSUN S1.

S1 is locked because the user said movement may damage the hotend:

```text
FLSUN S1: 192.168.0.12
maintenance_lock: true
do_not_probe: true
```

Current testable printers:

```text
FLSUN T1-A: 192.168.0.10
FLSUN T1-B: 192.168.0.11
FLSUN V400: 192.168.0.34
```

## Verify After Restart

With the server running:

```powershell
.\scripts\smoke-test.ps1
.\scripts\test-configured-printers.ps1
```

Expected:

- Smoke test finishes in `COMPLETE`.
- T1-A, T1-B, and V400 respond through Moonraker.
- S1 shows `SKIP locked` or API status `423`.

Manual S1 lock check:

```powershell
try {
  Invoke-RestMethod http://127.0.0.1:8080/api/printers/flsun-s1/status
} catch {
  $_.Exception.Response.StatusCode.value__
  $_.ErrorDetails.Message
}
```

Expected detail:

```text
Maintenance lock: do not test or move. Movement may damage the hotend.
```

## What Exists Now

- Standalone Hermes OS Print Factory web UI.
- FastAPI backend.
- SQLite job/evidence ledger.
- Printer inventory.
- Moonraker status/upload/start connector.
- Explicit `Upload Only` before `Start Print`.
- Visible `User Checked Printer UI` gate between upload and start.
- Editable/savable runtime ports.
- Auto-assign open local ports.
- Observe page for camera URLs.
- Settings page editor for per-printer camera URLs.
- Autopilot OS tab.
- Autopilot readiness checks.
- Safe Autopilot actions.
- Hermes agent plan artifacts.
- Dry-run pilot job creation.
- Safe Autopilot-to-next-gate that stops at approvals/printer/hardware gates.
- Research-backed 2026 action plan in `docs/RESEARCH_2026_ACTION_PLAN.md`.

## Current Autopilot Readiness

Last known status:

```text
6 of 14 setup checks are ready.
```

Known missing items:

- Camera URLs for T1-A, T1-B, and V400.
- Real reviewed slicer profiles.
- PrusaSlicer/OrcaSlicer/OpenSCAD/Blender/CadQuery installed or on PATH.
- Real local modeling model name in `configs/services.local.yaml`.

## Next Coding Tasks

1. Add model endpoint picker from `/v1/models`.
2. Add `DesignSpec` schema and Design page fields:
   - dimensions and units
   - constraints and tolerances
   - material intent
   - target printer/profile
   - acceptance checks
3. Add executable CAD worker v1:
   - CadQuery or build123d source generation
   - source execution
   - exported STL/STEP/3MF artifact
   - bounding box/volume/export validation
4. Add printer geometry fields:
   - bed size
   - nozzle diameter
   - filament diameter
   - enclosure/camera state
5. Add slicer compiler evidence:
   - slicer version
   - command
   - profile hash
   - input/output hash
   - warnings and estimates
6. Add `GCodeAnalyzer` v1:
   - bounds
   - temperatures
   - extrusion
   - blocked commands
   - layer/object markers
7. Add profile readiness UI for slicer profiles.
8. Add camera object schema and Moonraker webcam discovery.
9. Add evidence snapshots for printer check, start, anomaly, complete, and failure gates.
10. Add structured service-health endpoint for:
   - model server
   - PrusaSlicer
   - OrcaSlicer
   - CadQuery
   - OpenSCAD
   - Blender
   - FDM Monster
   - camera proxy
11. Add Spoolman/material connector stub and material compatibility gate.
12. Draft `Hermes3D Plugin Manifest v0` with permissions/trust data.
13. Add safer operator notes/reject/retry workflow states.
14. Add 3MF print-contract import/export design.

## Useful Files

- API: `apps/api/hermes3d_api/main.py`
- Config loader: `apps/api/hermes3d_api/config.py`
- Schemas: `apps/api/hermes3d_api/schemas.py`
- Workflow: `apps/api/hermes3d_api/workflow.py`
- Moonraker client: `apps/api/hermes3d_api/services/moonraker.py`
- Slicer worker: `apps/api/hermes3d_api/services/slicer.py`
- Web UI: `apps/web/app.js`
- HTML tabs/pages: `apps/web/index.html`
- Styles: `apps/web/styles.css`
- Runtime port helper: `scripts/runtime-ports.ps1`
- Dev launcher: `scripts/run-dev.ps1`
- Printer test: `scripts/test-configured-printers.ps1`
- Smoke test: `scripts/smoke-test.ps1`

## Local Ignored Files

These are intentionally local and ignored by git:

- `.env`
- `configs/services.local.yaml`
- `configs/printers.local.yaml`
- `configs/runtime.local.yaml`
- `data/hermes3d.sqlite`
- `storage/`

Do not commit private API keys, local machine paths, or private printer secrets.
