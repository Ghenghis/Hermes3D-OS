# Hermes OS Print Factory Interface

Hermes OS Print Factory is a single local operating interface for designing, preparing, printing, observing, and auditing 3D print work.

It should feel like an OS control center, not a collection of disconnected scripts.

## App Model

```text
Hermes OS Print Factory
├─ Dashboard
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

## Dashboard

Purpose: daily command center.

Shows:

- safe printer fleet
- active jobs
- pending approvals
- latest evidence/events
- dry-run or real-printer mode
- locked printers such as S1

## Design

Purpose: design and job intake.

Includes:

- prompt/design brief
- target printer selection
- local modeling LLM status
- CadQuery/OpenSCAD/Blender worker status
- import model flow
- generated design evidence

Generated models must pass validation before slicing.

## Jobs

Purpose: print workflow control.

Includes:

- job queue
- active job state
- workflow gates
- model approval
- print approval
- upload/start actions
- job event timeline

Dangerous actions should become explicit buttons before real printing:

```text
Validate Model
Approve Model
Slice
Approve G-code
Upload Only
Start Print
Pause
Cancel
```

## Printers

Purpose: printer inventory and readiness.

Includes:

- Moonraker URL
- status test
- safety locks
- slicer profile
- firmware/capability notes
- maintenance state

S1 is maintenance locked and must not be tested or moved until cleared.

## Observe

Purpose: watch prints while they run.

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

For USB cameras, expose a local stream with a tool such as MJPEG Streamer, OctoPrint-compatible webcam proxy, or another LAN-accessible camera service, then place that URL in `camera_url`.

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

## Approvals

Purpose: make safety gates visible.

Includes:

- pending model approvals
- pending print approvals
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

## Roadmap

Purpose: guide completion toward day-to-day operation.

Shows:

- current safe printer set
- remaining setup
- next issue links
- safety milestones
- real-print readiness checklist

