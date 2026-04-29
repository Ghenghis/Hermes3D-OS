# Day-To-Day Roadmap

Hermes OS Print Factory is moving from MVP to daily shop-floor operation in 2026. The roadmap below is organized by operator-visible feature packs, not internal milestones.

The research-backed expansion plan is tracked in [2026 Research Action Plan](RESEARCH_2026_ACTION_PLAN.md).

## Current Operating Baseline

Available now:

- local Hermes OS Print Factory dashboard
- Autopilot readiness checks and safe setup actions
- Hermes agent plan artifacts for jobs
- FastAPI backend with SQLite job and evidence ledger
- upload-first workflow gates
- visible `User Checked Printer UI` gate before start print
- model and print approvals
- editable local printer config
- Moonraker discovery and read-only status checks
- gated Moonraker upload/start path
- Observe page with editable integrated and USB camera URLs
- MiniMax-MCP/DeepSeek provider readiness panel
- visual evidence uploader for screenshots, source images, mesh previews, slicer previews, camera snapshots, and diagrams
- Active Job visual evidence strip and local artifact file serving

Still required before unattended confidence:

- user-confirmed Moonraker URLs and API-key requirements
- reviewed slicer profiles for each real printer
- bed/nozzle dimensions and profile locks
- camera stream and snapshot URLs for cleared printers
- MiniMax-MCP runtime analysis connected to visual evidence artifacts
- G-code validation reports before real upload/start
- material/spool records for each real print
- clear S1 maintenance lock before any test or movement

## Daily Operator Path

1. Power on only cleared printers.
2. Start Hermes OS:

```powershell
.\scripts\run-dev.ps1
```

3. Open:

```text
the URL printed by scripts/run-dev.ps1
```

If the saved port is busy, Hermes automatically finds an open local port and saves it to `configs/runtime.local.yaml`.

4. Load printers and run reachability tests.
5. Open `Autopilot` and run safe setup actions.
6. Confirm dry-run or real-printer mode.
7. Review pending approvals.
8. Use `Upload Only` before any `Start Print`.
9. Record `User Checked Printer UI` after watching the printer UI or camera.

Command-line printer check:

```powershell
.\scripts\test-configured-printers.ps1
```

## 2026 Feature Packs

### 1. Real Print Readiness

Goal: make one known-safe printer job repeatable from intake to upload/start.

- confirm T1-A, T1-B, and V400 Moonraker access
- add reviewed PrusaSlicer profiles
- expose a visible `User Checked Printer UI` gate
- complete first small calibration print with evidence
- keep S1 locked until maintenance is cleared

### 2. OS Control Center

Goal: make daily operation possible from one local screen.

- show fleet readiness, dry-run state, locked printers, and active jobs
- show Autopilot readiness score, guardrails, and safe one-click setup actions
- add pause, cancel, retry, and failure-note controls
- separate upload, observation, and start actions
- surface and edit camera links and latest events per printer

### 3. Design Studio

Goal: turn design intake into validated print candidates.

- import STL/3MF designs with job briefs
- connect local modeling LLM status
- create Hermes agent plan artifacts before generation
- add executable CadQuery/build123d/OpenSCAD workers
- capture structured design specs with dimensions, constraints, tolerances, material, and target printer
- validate CAD output with syntax, export, preview, bounding box, volume, and printability evidence
- provide editable parameters before generation
- create preview artifacts for operator review

### 4. Compiler/Evidence

Goal: make every print decision auditable.

- validate meshes and G-code before approval
- capture slicer version, command, profile hashes, preview images, estimates, and warnings
- analyze G-code for bounds, thermal commands, extrusion, object labels, volumetric flow, and blocked commands
- package model/profile/material/approval evidence into 3MF-style print contracts
- record model approval, print approval, upload, start, pause, cancel, and failure events
- keep rejection notes and operator notes in the job ledger

### 5. Observer AI

Goal: turn camera observation into evidence and safety assistance.

- discover Moonraker webcam stream/snapshot metadata
- capture snapshots at printer check, start, first layer, anomaly, pause/cancel, completion, and failure
- add observer policies: observe only, alert operator, pause recommended, auto-pause allowed
- keep locked printers suppressed and excluded from readiness
- collect operator labels for future local failure-detection training

### 6. Fleet Digital Twin

Goal: scale from pilot printers to a managed printer fleet.

- add remaining printer inventory
- subscribe to Moonraker telemetry and queue state for cleared printers
- integrate FDM Monster as a sidecar when useful
- add Spoolman/OpenPrintTag-ready material, filament, maintenance, and profile compatibility fields
- show reliability history and recurring maintenance reminders

### 7. Agentic OS

Goal: make extensions powerful without making the system reckless.

- define a plugin manifest with permissions, source, license, signatures, and update channel
- expose printer, slicer, CAD, camera, material, and quality tools through permissioned contracts
- add a plugin trust panel and dangerous-action scopes
- keep local-first storage with export/import and private ignored config

### 8. Advanced Generation

Goal: support more capable design and repair flows after the core factory is dependable.

- add Blender and Trimesh repair/export automation
- add batch job planning
- evaluate photo-to-3D flows only after validation gates are reliable
- schedule production queues by printer readiness, material, deadline, and risk
- add calibration intelligence and dimensional-risk scoring

## 2026 Done Criteria

Hermes OS Print Factory is ready for normal daily use when an operator can:

- see which printers are safe, ready, locked, or busy
- import or generate a model and inspect evidence
- approve the model and print plan separately
- upload without starting motion
- start only after physical or camera confirmation
- pause, cancel, annotate, and repeat jobs from the ledger
- export a job evidence bundle with hashes, approvals, profiles, snapshots, and operator notes
