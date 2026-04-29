# Roadmap

Hermes OS Print Factory's 2026 roadmap is organized as feature packs that improve daily operator confidence first, then expand design, evidence, fleet, and generation capabilities.

The deeper research-backed action plan is tracked in [2026 Research Action Plan](RESEARCH_2026_ACTION_PLAN.md).

## 2026 Pack Sequence

| Pack | Operator outcome | Key deliverables |
| --- | --- | --- |
| Real Print Readiness | Known-safe jobs can move from model to real upload/start with clear gates. | Confirm Moonraker access, reviewed slicer profiles, printer dimensions, upload-only flow, first calibration print evidence. |
| OS Control Center | The local dashboard becomes the daily command center. | Fleet readiness, Autopilot setup, dry-run/real mode, job queue, pause/cancel controls, editable camera links, locked-printer visibility. |
| Design Studio | Operators can import or generate editable, validated print candidates in one workflow. | DesignSpec, model endpoint picker, executable CAD worker loop, geometry validation, parameter editor, CAD evidence. |
| Compiler/Evidence | Slicing and G-code become auditable compiler outputs. | Slicer provenance, profile hashes, G-code analyzer, 3MF print contracts, thumbnails, warnings, approval records. |
| Vision Evidence | Every agent claim can point to visual proof. | MiniMax-MCP readiness, visual evidence upload, artifact file serving, mesh/slicer/camera thumbnails, multimodal summaries. |
| Observer AI | Cameras become evidence and anomaly sensors, not just live video. | Moonraker webcam discovery, snapshots at gates, first-layer evidence, anomaly policies, optional PrintGuard/Obico/Anomalib adapters. |
| Fleet Digital Twin | The pilot setup scales to a managed printer and material fleet. | Moonraker telemetry, printer twins, Spoolman/OpenPrintTag material state, maintenance intervals, reliability history. |
| Agentic OS | Hermes becomes a safe local OS for extensible factory tools. | Plugin manifest, MCP-style tool contracts, permission scopes, trust panel, signed updates, local-first export/import. |
| Advanced Generation | Higher-end generation and scheduling arrive after the core factory is reliable. | Blender/Trimesh repair, concept mesh intake, production planning, nesting, dimensional-risk scoring, calibration intelligence. |

## Pack Details

### Real Print Readiness

- confirm real Moonraker URLs and API-key needs
- lock slicer profiles to each cleared printer
- keep `Upload Only` separate from `Start Print`
- require model approval, print approval, and user printer check
- complete first repeatable calibration print

### OS Control Center

- show safe, locked, idle, busy, and unreachable printers
- show Autopilot readiness, guardrails, and safe setup actions
- show active jobs, pending approvals, and recent evidence
- add operator controls for pause, cancel, retry, and notes
- keep dangerous actions explicit and logged

### Design Studio

- support imported STL/3MF files and generated CAD
- generate deterministic Hermes agent plan artifacts for every job
- connect local Hermes/modeling LLM status
- run executable CadQuery/build123d/OpenSCAD workers
- store structured design specs with units, dimensions, constraints, tolerances, material, and target printer
- inspect generated geometry for syntax, bounding box, volume, export success, and preview artifacts
- expose parameters before model generation
- send only validated candidates to slicing

### Compiler/Evidence

- validate meshes before slicing and G-code before printing
- capture slicer version, command, profile hashes, model hashes, G-code hashes, estimates, warnings, and repair notes
- analyze G-code for bounds, temperatures, extrusion, object labels, volumetric flow, and blocked commands
- treat 3MF as the long-term print contract for model, profile, material, approvals, and evidence references
- persist approvals and operator decisions in the ledger
- make job history searchable by printer, material, result, and notes

### Vision Evidence

- require every Hermes agent to support image input, screenshots, mesh previews, slicer previews, and camera evidence where applicable
- expose MiniMax-MCP and optional DeepSeek V4 provider readiness
- attach source images, screenshots, mesh previews, slicer previews, G-code previews, camera snapshots, and diagrams to jobs
- serve artifacts through narrow local file endpoints
- show visual evidence before approvals and inside active jobs
- write local multimodal summary artifacts before safety or printability claims

### Observer AI

- discover Moonraker webcam stream/snapshot metadata before manual camera URL entry
- capture gate-level snapshots at printer check, start, anomaly, pause/cancel, completion, and failure
- add first-layer and layer-wise evidence workflows before any auto-pause behavior
- support observer policies: observe only, alert operator, pause recommended, and auto-pause allowed
- keep locked printers suppressed and excluded from readiness

### Fleet Digital Twin

- onboard remaining printers only after readiness data is complete
- track material, spool, nozzle, bed, firmware, calibration age, maintenance, and profile compatibility
- subscribe to Moonraker telemetry and queue events for cleared printers
- integrate Spoolman and OpenPrintTag-ready material records
- integrate FDM Monster where it improves fleet visibility
- report reliability and recurring failure patterns

### Agentic OS

- expose tools through permissioned plugin contracts
- show plugin trust, license, source, permissions, and update status
- sandbox risky plugins through sidecars first and WebAssembly/WASI where practical
- map events and artifacts toward W3C PROV/OpenTelemetry-style digital thread records
- keep local-first storage, export/import, and private config boundaries

### Advanced Generation

- add Blender, Trimesh, and manifold mesh repair/export automation
- evaluate ComfyUI, Hunyuan3D, or TRELLIS flows as optional inputs
- support batch planning, nesting, and production scheduling
- add calibration workflows and dimensional-risk scoring
- keep all generated work behind the same validation and approval gates

## Guiding Rule

No feature should make the printer move sooner. New capability should make readiness, evidence, approval, and operator control clearer.
