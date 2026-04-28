# Day-To-Day Roadmap

Hermes OS Print Factory is moving from MVP to daily shop-floor operation in 2026. The roadmap below is organized by operator-visible feature packs, not internal milestones.

## Current Operating Baseline

Available now:

- local Hermes OS Print Factory dashboard
- FastAPI backend with SQLite job and evidence ledger
- upload-first workflow gates
- model and print approvals
- editable local printer config
- Moonraker discovery and read-only status checks
- gated Moonraker upload/start path
- Observe page for integrated and USB camera URLs

Still required before unattended confidence:

- user-confirmed Moonraker URLs and API-key requirements
- reviewed slicer profiles for each real printer
- bed/nozzle dimensions and profile locks
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
5. Confirm dry-run or real-printer mode.
6. Review pending approvals.
7. Use `Upload Only` before any `Start Print`.
8. Watch the printer UI or camera before starting motion.

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
- add pause, cancel, retry, and failure-note controls
- separate upload, observation, and start actions
- surface camera links and latest events per printer

### 3. Design Studio

Goal: turn design intake into validated print candidates.

- import STL/3MF designs with job briefs
- connect local modeling LLM status
- add CadQuery and OpenSCAD workers
- provide editable parameters before generation
- create preview artifacts for operator review

### 4. Validation/Evidence

Goal: make every print decision auditable.

- validate meshes and G-code before approval
- capture slicer settings, preview images, and warnings
- record model approval, print approval, upload, start, pause, cancel, and failure events
- keep rejection notes and operator notes in the job ledger

### 5. Fleet Operations

Goal: scale from pilot printers to a managed printer fleet.

- add remaining printer inventory
- integrate FDM Monster as a sidecar when useful
- add material, filament, maintenance, and profile compatibility fields
- show reliability history and recurring maintenance reminders

### 6. Advanced Generation

Goal: support more capable design and repair flows after the core factory is dependable.

- add Blender and Trimesh repair/export automation
- add batch job planning
- evaluate photo-to-3D flows only after validation gates are reliable
- schedule production queues by printer readiness, material, and risk

## 2026 Done Criteria

Hermes OS Print Factory is ready for normal daily use when an operator can:

- see which printers are safe, ready, locked, or busy
- import or generate a model and inspect evidence
- approve the model and print plan separately
- upload without starting motion
- start only after physical or camera confirmation
- pause, cancel, annotate, and repeat jobs from the ledger
