# Hermes OS Print Factory Interface

Hermes OS Print Factory is a single local operating interface for designing, preparing, printing, observing, and auditing 3D print work.

It should feel like an OS control center, not a collection of disconnected scripts.

## App Model

```text
Hermes OS Print Factory
├─ Source OS
├─ Dashboard
├─ Autopilot
├─ Design
├─ 3D Generation
├─ Jobs
├─ Printers
├─ Observe
├─ Voice
├─ Agents
├─ Learning
├─ Artifacts
├─ Approvals
├─ Plugins
├─ Settings
└─ Roadmap
```

Current page count: 16.

Near-term OS page expansion remains below the current shell:

```text
Hermes OS Print Factory
├─ Materials
├─ Calibration
├─ Telemetry
├─ Quality
├─ Trust
└─ Digital Thread
```

## 2026 Feature-Pack View

The interface should make the 2026 roadmap visible through operator workflows:

- Real Print Readiness: readiness checks, profile locks, approval gates, upload-only flow
- OS Control Center: fleet state, active jobs, locked printers, editable camera links, quick actions
- Design Studio: design specs, executable CAD workers, Hermes agent plans, editable parameters, geometry validation
- Compiler/Evidence: slicer provenance, G-code analysis, 3MF print contracts, warnings, approvals, event ledger
- Observer AI: camera discovery, snapshots, first-layer evidence, anomaly policies
- Fleet Digital Twin: inventory, telemetry, maintenance, material/profile compatibility, reliability
- Agentic OS: plugin permissions, trust panel, signed updates, local-first export/import
- Advanced Generation: repair automation, production planning, calibration intelligence, optional photo-to-3D inputs

## Source OS

Purpose: make Hermes3D a source-backed operating system instead of a thin dashboard.

Shows:

- open-source module groups for slicers, modelers, print-farm tools, firmware, generation, orchestration, libraries, materials, hardware, utilities, and research
- selected native-app/source host
- bridge tasks for the selected project
- local checkout path, license, priority, section, and integration status
- group-specific pipeline timeline
- SVG flow diagram with aligned lanes for the selected source group
- readable card fallback for narrow screens

Source OS must keep the workbench visible before long module lists on narrow viewports so mobile or side-panel usage still shows the actual operating surface.

## Digital Thread Flow Map

The Dashboard includes the OS-level flow map:

```text
Source Bench -> Design/CAD -> 3D Generation -> Slicer Compiler
Dispatch -> Observation -> Materials -> Trust/Audit
```

Each flow is rendered as a compact lane with the current gate shape:

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

## Theme System

The interface must avoid plain white backgrounds. It ships with a dark default and saved operator themes:

- Midnight: deep command-center dark with blue and teal accents
- Alloy: neutral graphite workshop theme
- Ember: warm dark theme for long shop sessions
- Forest: green dark theme for calmer monitoring

Themes are available from the topbar and the Settings page. The selected theme is saved in the browser and applied to the full OS shell, cards, forms, badges, evidence surfaces, voice panels, and printer pages.

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
- structured `DesignSpec` fields for dimensions, units, constraints, tolerances, material, and target printer
- Hermes agent plan artifact
- prompt/design brief
- target printer and material intent
- local modeling LLM status
- CadQuery/build123d/OpenSCAD/Blender worker status
- parameter editor for generated models
- preview and validation evidence

Generated or imported models must pass validation before slicing.

The Design page should make the CAD agent loop visible:

```text
Plan -> Generate CAD source -> Execute -> Inspect geometry -> Revise -> Approve model
```

## 3D Generation

Purpose: turn photos or multi-photo input into printability-gated candidate objects.

Includes:

- TRELLIS.2 primary engine status
- Hunyuan3D-2.1 comparison/fallback status
- TripoSR fast preview fallback status
- ComfyUI sidecar URL and workflow templates
- image upload into an existing job
- object intent and scale estimate
- generation metadata, report, and pipeline diagram artifacts
- printability truth gate checklist

ComfyUI is only the generation backend. Hermes remains responsible for repair, validation, slicer dry-run, approvals, printer selection, Moonraker upload, monitoring, voice updates, and evidence.

Generated meshes are evidence only until the truth gate passes:

```text
AI asset -> print-safe geometry -> slicer-approved G-code
```

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
- editable and savable camera URLs per printer
- stream/snapshot health when supported by Moonraker webcams
- first-layer and anomaly evidence snapshots
- observer policy: observe only, alert operator, pause recommended, auto-pause allowed
- locked-printer camera suppression

Camera URLs are edited in Settings and saved to `capabilities.camera_url` in printer config:

```yaml
capabilities:
  camera: integrated
  camera_url: http://192.168.0.10/webcam/?action=stream
```

For USB cameras, expose a local stream with a tool such as MJPEG Streamer, an OctoPrint-compatible webcam proxy, or another LAN-accessible camera service, then place that URL in `camera_url`.

## Voice

Purpose: natural Hermes agent interaction and safety alerts.

Includes:

- Azure Speech status
- 100+ English Azure neural voices when credentials are configured
- per-agent voice assignment
- preview/test buttons
- SSML tone, rate, pitch, pause, and warning support
- push-to-talk STT upload
- staged wake/listen mode
- local transcript log
- safety alert playback

Default voice agents:

```text
factory_operator -> en-GB-MaisieNeural
modeling_agent -> en-US-AriaNeural
print_safety_agent -> en-AU-CarlyNeural
mesh_repair_agent -> en-US-AriaNeural
mesh_qa_agent -> en-AU-CarlyNeural
slicer_qa_agent -> en-US-JennyNeural
print_monitor_agent -> en-GB-RyanNeural
research_agent -> en-US-GuyNeural
privacy_agent -> en-US-AvaNeural
```

## Materials

Purpose: make material readiness explicit before slicing and printing.

Includes:

- spool inventory
- material type, color, brand, lot, and remaining grams
- drying/moisture notes
- nozzle/material compatibility
- profile compatibility
- Spoolman connector state
- OpenPrintTag-ready metadata

## Calibration

Purpose: turn calibration into evidence-backed profile confidence.

Includes:

- temperature tower
- flow calibration
- pressure advance
- max volumetric speed
- dimensional coupon
- measurement capture
- profile confidence and expiry

## Telemetry

Purpose: show the live and historical state of cleared printers.

Includes:

- Moonraker connection freshness
- temperatures and targets
- print state and progress
- queue state
- error state
- camera heartbeat
- material usage
- time-series export

## Quality

Purpose: track evidence and risk for parts, prints, and profiles.

Includes:

- G-code analyzer reports
- first-layer evidence
- anomaly scores
- operator labels
- failure taxonomy
- reliability trends
- dimensional-risk score

## Trust

Purpose: show whether an agent, plugin, or tool is allowed to do something.

Includes:

- plugin manifest
- permissions and scopes
- license
- source repository
- signatures and update channel
- SBOM or dependency summary
- runtime calls and audit events

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
