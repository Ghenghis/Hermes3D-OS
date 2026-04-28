# 2026 Research Action Plan

This action plan summarizes the five-agent research pass completed on 2026-04-28. It focuses on open-source, research-backed, and standards-aware patterns that can make Hermes OS Print Factory a local-first 3D printing operating system rather than a simple printer dashboard.

## Product Thesis

Hermes OS Print Factory should become a local, auditable manufacturing OS:

- executable CAD agents that write and validate editable source
- slicer workers treated as deterministic compilers with full provenance
- G-code semantic validation before upload or start
- camera and sensor observers that produce evidence, not just video
- Moonraker telemetry, material state, and maintenance state in one digital twin
- signed, permissioned, sandboxed plugins for every powerful tool
- local-first data ownership with optional export/sync

The guiding rule remains unchanged: no new capability should make a printer move sooner. New capability should make readiness, evidence, approval, and operator control clearer.

## Research-Backed Pillars

| Pillar | Why it matters | Patterns and sources |
| --- | --- | --- |
| Executable CAD agent | Text-to-CAD is strongest when it produces editable CAD code that can be executed, inspected, repaired, and benchmarked. | CadQuery is open-source, script-based, exports STEP/STL/3MF, and is Apache-2.0. CAD-Coder and Text-to-CadQuery show CadQuery code generation as a research direction. Sources: [CadQuery](https://github.com/CadQuery/cadquery), [CAD-Coder text-to-CAD](https://arxiv.org/abs/2505.19713), [Text-to-CadQuery](https://arxiv.org/abs/2505.06507), [CAD-Coder VLM](https://arxiv.org/abs/2505.14646). |
| Slicer as compiler | Slicing should produce a signed evidence bundle: slicer version, command, profile hash, input/output hashes, warnings, estimates, thumbnails, and approval record. | PrusaSlicer has a CLI and AGPL-3.0 source; OrcaSlicer adds calibration workflows; G-code LLM/debugging research shows G-code deserves its own validation layer. Sources: [PrusaSlicer](https://github.com/prusa3d/PrusaSlicer), [PrusaSlicer CLI](https://github.com/prusa3d/PrusaSlicer/wiki/Command-Line-Interface), [G-code debugging paper](https://arxiv.org/abs/2309.02465). |
| G-code semantic validation | Before upload/start, Hermes should parse motions, temperatures, extrusion, bounds, object labels, volumetric flow, blocked commands, and firmware flavor. | This turns `VALIDATE_GCODE` into a real gate instead of a placeholder. Sources: [Moonraker printer objects](https://moonraker.readthedocs.io/en/latest/printer_objects/), [Moonraker Web API](https://moonraker.readthedocs.io/en/stable/web_api/). |
| Observer AI and evidence | Cameras should produce snapshots, heartbeat, anomaly scores, first-layer evidence, and operator-review artifacts. | Layer-wise CV and G-code-rendered reference images are open research patterns; Moonraker webcams already expose stream/snapshot metadata. Sources: [layer-wise CV paper](https://arxiv.org/abs/2003.05660), [G-code reference image anomaly paper](https://arxiv.org/abs/2111.02703), [Moonraker webcam API](https://moonraker.readthedocs.io/en/latest/external_api/webcams/), [Anomalib](https://github.com/open-edge-platform/anomalib). |
| Fleet digital twin | Each printer needs capability, config fingerprint, camera state, maintenance age, calibration evidence, reliability history, and live telemetry. | Moonraker object subscriptions, FDM Monster fleet patterns, MTConnect, and OPC UA Additive Manufacturing all point toward standardized machine state. Sources: [Moonraker printer objects](https://moonraker.readthedocs.io/en/latest/printer_objects/), [FDM Monster](https://docs.fdm-monster.net/), [MTConnect model docs](https://model.mtconnect.org/), [OPC UA Additive Manufacturing](https://reference.opcfoundation.org/AdditiveManufacturing/v100/docs/4). |
| Material and spool intelligence | Print readiness depends on spool, material, remaining grams, moisture/drying notes, profile compatibility, and post-print usage reconciliation. | Spoolman and OpenPrintTag are the most relevant open local patterns. Sources: [Spoolman](https://github.com/Donkie/Spoolman), [OpenPrintTag](https://github.com/OpenPrintTag/openprinttag-specification). |
| 3MF print contract | STL plus loose notes is not enough for an OS. 3MF can carry model/package metadata and becomes the natural contract for jobs, profiles, materials, thumbnails, approvals, and evidence references. | 3MF became the ISO/IEC 25422:2025 direction for additive manufacturing exchange. Source: [3MF specification](https://3mf.io/spec/). |
| Agentic OS plugin layer | Plugins are the moat and the risk. Every powerful action should be a permissioned tool with audit, scopes, timeouts, and sandboxing. | MCP authorization, WebAssembly Component Model/WASI, W3C PROV, OpenTelemetry, Sigstore, and TUF are the right standards family. Sources: [MCP authorization](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization), [WebAssembly Component Model](https://component-model.bytecodealliance.org/), [W3C PROV](https://www.w3.org/TR/prov-overview/), [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/concepts/semantic-conventions/), [Sigstore](https://docs.sigstore.dev/), [TUF](https://theupdateframework.io/spec/). |
| Human-in-the-loop control | Manufacturing agents need pause/resume, approval, edit, reject, evidence, and durable state before irreversible actions. | LangGraph/LangChain HITL patterns map cleanly to Hermes workflow gates. Source: [LangChain HITL docs](https://docs.langchain.com/oss/python/langchain/human-in-the-loop). |

## Missing Capability Backlog

### Design and Modeling

- `DesignSpec` schema: prompt, dimensions, units, constraints, tolerances, material intent, target printer, acceptance checks.
- CAD agent loop: plan, generate code, execute, inspect geometry, revise, validate, persist evidence.
- Build123d/CadQuery/FreeCAD worker comparison behind one modeling-worker contract.
- Stable geometry references for follow-up edits: semantic face/body/edge names.
- Macro/template cache for confirmed reusable shop parts.
- Model benchmark suite with real print-factory prompts and expected measurements.
- Mesh-to-CAD boundary policy: generated meshes are concepts until repaired, converted, or explicitly approved.

### Slicing, G-code, and Profiles

- `GCodeAnalyzer` report artifact before upload/start.
- Slicer provenance: binary path, version, full command, profile hash, warnings, input/output hashes, estimates.
- OrcaSlicer worker for calibration intelligence and profile import/export.
- Profile readiness model: printer, filament, nozzle, slicer profile, calibration evidence, approval, expiry.
- Differential slicing for high-risk jobs: compare PrusaSlicer, OrcaSlicer, and optionally CuraEngine estimates/warnings.
- Object metadata support: object labels, object polygons, object-level risk, object exclusion events.

### Observation and Evidence

- Camera objects: stream URL, snapshot URL, health, FPS, rotation/flip, aspect ratio, view type, calibration state.
- Gate-level snapshots: pre-upload, pre-start, first-layer, periodic, anomaly, pause/cancel, completion.
- Local observer worker: frame sampler, inference adapter, evidence writer, event publisher.
- Detection policies: `OBSERVE_ONLY`, `ALERT_OPERATOR`, `PAUSE_RECOMMENDED`, `AUTO_PAUSE_ALLOWED`.
- Operator label workflow for false positives and failure taxonomy.
- Optional thermal/acoustic/vibration sensor plugins after RGB evidence is stable.

### Fleet, Material, and Maintenance

- Farm scheduler above Moonraker queues: compatibility, material, nozzle, deadline, risk, maintenance state, operator override.
- Spoolman connector and OpenPrintTag-ready material records.
- Moonraker WebSocket subscriber for temperatures, print stats, queue state, errors, and connection state.
- Printer digital twin: config fingerprint, calibration age, reliability score, maintenance risk.
- Maintenance workflows: nozzle counters, belts, bed surface, filament path, recurring failure clustering.
- Reliability dashboard: failed jobs, abort reasons, unreachable time, thermal deviations, maintenance due.

### Agentic OS, Security, and Standards

- `Hermes3D Plugin Manifest v0`: permissions, MCP tools, Wasm interface, signatures, SBOM, update channel.
- Plugin trust panel: license, signature, permissions, source repo, update history, runtime calls.
- Permission scopes: read, upload, start, pause, cancel, emergency stop, power, config, filesystem, network.
- Evidence ledger schema mapped to W3C PROV plus OpenTelemetry trace IDs.
- Signed artifact/update proof of concept using Sigstore/TUF-style metadata.
- OPC UA/MTConnect/AAS read adapters for future industrial integration.
- Local-first data vault: export/import, offline operation, private local storage, optional sync later.

## Prioritized Phases

### Phase 1: Local Modeling Readiness

Outcome: the Design page can detect the local model endpoint and create structured design specs.

Deliverables:

- model endpoint picker from `/v1/models`
- `DesignSpec` schema and storage
- design brief UI fields for dimensions, material, target printer, tolerances, and constraints
- first CAD worker spike using CadQuery or build123d
- CAD validation artifact: syntax, exported files, bounding box, volume, preview path

Acceptance:

- a dry-run design job can produce a source CAD file and a validation JSON artifact
- failed CAD execution produces a clear retry/evidence event
- generated output cannot advance to slicing without model approval

### Phase 2: Slicer Compiler and G-code Evidence

Outcome: slicing is auditable and G-code is checked before upload.

Deliverables:

- slicer metadata capture for PrusaSlicer
- `GCodeAnalyzer` v1 for bounds, temperatures, extrusion, blocked commands, layer markers, object markers
- profile readiness records
- first reviewed profiles for T1-A, T1-B, and V400
- validation report artifact shown in Jobs and Artifacts

Acceptance:

- every generated G-code has SHA256, slicer version, profile hash, estimated time/material, and warnings
- unsafe or out-of-bounds G-code cannot advance to print approval

### Phase 3: Camera Observer and Evidence Snapshots

Outcome: Observe becomes an evidence engine.

Deliverables:

- Moonraker webcam discovery plus manual camera URL fallback
- camera object schema with stream/snapshot/health/orientation
- snapshot capture at `USER_CHECKED_PRINTER_UI`, `START_PRINT`, `MONITOR_PRINT`, `COMPLETE`, `FAILED`
- local observer policy states
- optional PrintGuard/Obico/Anomalib adapter design

Acceptance:

- a cleared printer can save and health-check camera metadata
- S1 remains locked and suppressed
- a job evidence bundle includes camera snapshots when configured

### Phase 4: Fleet Digital Twin and Materials

Outcome: Hermes knows what each printer can safely do today.

Deliverables:

- Moonraker WebSocket telemetry subscriber
- `PrinterEvent`, `TelemetrySample`, `SafetyDecision`, `MaintenanceEvent` schemas
- Spoolman connector spike
- material/profile compatibility gate
- maintenance and reliability records

Acceptance:

- dashboard shows live/last-known telemetry freshness
- jobs can be blocked by missing spool, wrong material, maintenance lock, or stale calibration

### Phase 5: Agentic OS Plugin System

Outcome: new tools can be added safely.

Deliverables:

- plugin manifest v0
- permission scopes and trust panel
- MCP-compatible tool registry design
- sandbox strategy using sidecar process first, Wasm/WASI next
- signed plugin/update metadata proof of concept

Acceptance:

- read-only printer-status plugin can run without write permissions
- dangerous plugin capabilities require explicit approval and are ledgered

### Phase 6: 3MF Print Contracts and Production Planning

Outcome: jobs become portable, signed print contracts and the queue becomes a planner.

Deliverables:

- 3MF import/export evidence bundle
- model/profile/material/job metadata package
- farm scheduler v1: printer eligibility, ETA, risk, priority
- batch planning and plate nesting research spike

Acceptance:

- operator can export a job bundle with model, evidence, approvals, profile hashes, and G-code hash
- scheduler recommends a printer but does not start without gates

### Phase 7: Quality and Calibration Intelligence

Outcome: Hermes improves profiles and predicts risk over time.

Deliverables:

- calibration workflows: flow, temperature, pressure advance, max volumetric speed, dimensional coupon
- measurement capture and profile confidence score
- dimensional-risk score from geometry/material/profile features
- reliability analytics by printer, material, profile, and failure mode

Acceptance:

- profile confidence changes only with evidence
- print failures produce categorized, searchable learning records

## License and Integration Posture

- Prefer MIT, Apache-2.0, BSD, and permissive libraries for in-process code.
- Use AGPL/GPL tools such as PrusaSlicer, OrcaSlicer, FDM Monster, Moonraker, Obico, and PrintGuard as subprocesses, sidecars, or clearly separated services unless the project intentionally adopts compatible obligations.
- Treat custom AI model licenses as review-required before default inclusion.
- Keep generated 3D meshes from text/image models as concept/reference inputs until validated, repaired, and explicitly approved.
- Keep private printer IPs, API keys, camera URLs, spool IDs, and local model endpoints in ignored local config.

## Immediate Next Tasks

1. Add model endpoint picker from `/v1/models`.
2. Add `DesignSpec` schema and Design page fields.
3. Add CAD worker v1 with executable source and validation artifacts.
4. Extend PrusaSlicer evidence metadata and profile hash capture.
5. Implement `GCodeAnalyzer` v1.
6. Add camera object schema and Moonraker webcam discovery.
7. Add evidence snapshots for printer-check/start/complete gates.
8. Add Spoolman service config and connector stub.
9. Add Moonraker WebSocket telemetry subscriber design.
10. Draft `Hermes3D Plugin Manifest v0`.
11. Add plugin trust/permissions model to the Plugins page.
12. Add 3MF print-contract import/export design.
