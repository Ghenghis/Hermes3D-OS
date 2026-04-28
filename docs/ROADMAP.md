# Roadmap

Hermes OS Print Factory's 2026 roadmap is organized as feature packs that improve daily operator confidence first, then expand design, evidence, fleet, and generation capabilities.

## 2026 Pack Sequence

| Pack | Operator outcome | Key deliverables |
| --- | --- | --- |
| Real Print Readiness | Known-safe jobs can move from model to real upload/start with clear gates. | Confirm Moonraker access, reviewed slicer profiles, printer dimensions, upload-only flow, first calibration print evidence. |
| OS Control Center | The local dashboard becomes the daily command center. | Fleet readiness, Autopilot setup, dry-run/real mode, job queue, pause/cancel controls, camera links, locked-printer visibility. |
| Design Studio | Operators can import or generate print candidates in one workflow. | Model intake, Hermes agent plans, job briefs, local modeling LLM status, CadQuery/OpenSCAD workers, parameter editor, previews. |
| Validation/Evidence | Every safety and quality decision is reviewable later. | Mesh/G-code validation, slicer warnings, previews, approval records, event timeline, rejection and failure notes. |
| Fleet Operations | The pilot setup scales to a managed printer fleet. | Printer inventory, FDM Monster sidecar, material/profile compatibility, maintenance reminders, reliability history. |
| Advanced Generation | Higher-end generation and scheduling arrive after the core factory is reliable. | Blender/Trimesh repair, batch planning, photo-to-3D experiments, production queue scheduling. |

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
- run CadQuery and OpenSCAD workers
- expose parameters before model generation
- send only validated candidates to slicing

### Validation/Evidence

- validate meshes before slicing and G-code before printing
- capture previews, slicer settings, warnings, and repair notes
- persist approvals and operator decisions in the ledger
- make job history searchable by printer, material, result, and notes

### Fleet Operations

- onboard remaining printers only after readiness data is complete
- track material, nozzle, bed, firmware, maintenance, and profile compatibility
- integrate FDM Monster where it improves fleet visibility
- report reliability and recurring failure patterns

### Advanced Generation

- add Blender and Trimesh repair/export automation
- evaluate ComfyUI, Hunyuan3D, or TRELLIS flows as optional inputs
- support batch planning and production scheduling
- keep all generated work behind the same validation and approval gates

## Guiding Rule

No feature should make the printer move sooner. New capability should make readiness, evidence, approval, and operator control clearer.
