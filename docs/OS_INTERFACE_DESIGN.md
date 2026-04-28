# Hermes OS Print Factory Interface

Hermes OS Print Factory is a single local operating interface for designing, preparing, printing, observing, and auditing 3D print work.

It should feel like an OS control center, not a collection of disconnected scripts.

## App Model

```text
Hermes OS Print Factory
├─ Dashboard
├─ Autopilot
├─ Design
├─ Jobs
├─ Printers
├─ Observe
├─ Artifacts
├─ Approvals
├─ Plugins
├─ Settings
└─ Roadmap
```

## 2026 Feature-Pack View

The interface should make the 2026 roadmap visible through operator workflows:

- Real Print Readiness: readiness checks, profile locks, approval gates, upload-only flow
- OS Control Center: fleet state, active jobs, locked printers, camera links, quick actions
- Design Studio: imports, prompts, Hermes agent plans, local generation workers, editable parameters, previews
- Validation/Evidence: mesh checks, G-code checks, warnings, approvals, event ledger
- Fleet Operations: inventory, maintenance, material/profile compatibility, reliability
- Advanced Generation: repair automation, batch planning, optional photo-to-3D inputs

## Dashboard

Purpose: daily command center.

Shows:

- dry-run or real-printer mode
- safe, locked, idle, busy, and unreachable printers
- active jobs and pending approvals
- latest evidence and operator notes
- quick links to cameras, artifacts, and printer details

## Autopilot

Purpose: automate safe setup and planning without moving printers.

Shows:

- readiness score
- local config and port checks
- tool and model endpoint checks
- slicer profile and camera readiness
- printer lock checks
- safe setup actions
- Hermes agent plan actions
- guardrails for hardware safety

Allowed actions:

- create runtime config
- auto-assign open local ports
- load printer inventory
- create storage folders
- write setup report
- create dry-run pilot job
- write agent plan
- advance only to the next safe human gate

Autopilot must stop at model approval, print approval, printer selection, upload, start, pause, cancel, or any other hardware-adjacent action.

## Design

Purpose: design and job intake.

Includes:

- import model flow
- Hermes agent plan artifact
- prompt/design brief
- target printer and material intent
- local modeling LLM status
- CadQuery/OpenSCAD/Blender worker status
- parameter editor for generated models
- preview and validation evidence

Generated or imported models must pass validation before slicing.

## Jobs

Purpose: print workflow control.

Includes:

- job queue
- active job state
- workflow gates
- model approval
- print approval
- upload/start actions
- pause, cancel, retry, and failure notes
- job event timeline

Dangerous actions should remain explicit:

```text
Validate Model
Approve Model
Slice
Approve G-code
Upload Only
User Checked Printer UI
Start Print
Pause
Cancel
```

Upload and start must stay separate:

```text
Upload Only -> Observe camera / check printer UI -> Start Print
```

## Printers

Purpose: printer inventory and readiness.

Includes:

- Moonraker URL and API-key state
- status test
- safety locks
- bed/nozzle dimensions
- slicer profile lock
- firmware and capability notes
- maintenance state
- material/profile compatibility

S1 is maintenance locked and must not be tested or moved until cleared.

## Observe

Purpose: watch prints before and during motion.

Supports:

- integrated printer cameras
- USB camera streams
- MJPEG/HTTP camera URLs
- camera slots per printer
- locked-printer camera suppression

Camera URLs live in printer config:

```yaml
capabilities:
  camera: integrated
  camera_url: http://192.168.0.10/webcam/?action=stream
```

For USB cameras, expose a local stream with a tool such as MJPEG Streamer, an OctoPrint-compatible webcam proxy, or another LAN-accessible camera service, then place that URL in `camera_url`.

## Artifacts

Purpose: inspect generated and imported files.

Includes:

- source CAD
- uploaded models
- repaired meshes
- slicer output
- G-code
- previews
- logs
- validation reports

## Approvals

Purpose: make safety gates visible.

Includes:

- pending model approvals
- pending print approvals
- printer-check acknowledgement
- approval history
- rejection notes
- operator notes

## Plugins

Purpose: show available factory capabilities.

Useful plugins/modules:

- Moonraker printer connector
- camera observer
- PrusaSlicer worker
- OrcaSlicer worker
- CadQuery worker
- OpenSCAD worker
- Blender/Trimesh repair worker
- local modeling LLM connector
- FDM Monster sidecar
- filament/spool tracker
- maintenance tracker
- evidence ledger
- notification hooks
- backup/export tool

Plugins should expose health, config, capabilities, and evidence output.

## Settings

Purpose: local configuration.

Includes:

- dry-run mode
- printer config path
- service config path
- local model endpoint
- storage paths
- safety locks
- plugin enablement
- backup/export settings

## Roadmap

Purpose: guide completion toward day-to-day operation.

Shows:

- 2026 feature-pack progress
- current safe printer set
- remaining setup
- next issue links
- safety milestones
- real-print readiness checklist
