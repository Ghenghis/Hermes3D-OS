# Architecture

Hermes3D OS is a standalone web application and service stack for local printer-fleet control.

It should own its own UI, job database, printer inventory, workflows, Hermes orchestration layer, worker processes, and evidence ledger. External systems such as Moonraker, FDM Monster, slicers, and modeling tools are service dependencies, not the source of truth.

## System Layers

```text
Web UI
  |
API server
  |
Hermes orchestration layer
  |
Workflow engine
  |
Service/tool layer
  |
Local printers and workers
```

## Web UI

The UI should expose practical shop-floor operations first:

- printer status
- job intake
- model artifact review
- slicing evidence
- approval gates
- active print monitoring
- job history
- printer inventory

The UI should not be a marketing page. The first screen should be the operational dashboard.

## API Server

The backend should provide stable internal APIs for:

- jobs
- printers
- artifacts
- approvals
- telemetry
- workflow state
- service health

FastAPI is a good fit for the first backend because the worker stack is Python-heavy and integrates well with local tooling.

## Hermes Orchestration Layer

Hermes is the reasoning and coordination layer. It should:

- turn user requests into structured print jobs
- call modeling, repair, slicing, inventory, and printer tools
- summarize evidence for user approval
- remember printer and job history
- explain failures and suggest next actions
- avoid direct printer mutation outside gated workflow steps

Hermes should not replace deterministic validation. Mesh checks, slicer output checks, temperature checks, and printer readiness checks should be explicit service calls.

All Hermes agents are vision-enabled. MiniMax-MCP is the required primary multimodal layer for image input, screenshots, mesh previews, slicer previews, and camera evidence. DeepSeek V4 may assist with planning, CAD reasoning, code generation, research summaries, roadmaps, and markdown reports, but it does not replace the required vision layer unless the configured endpoint explicitly supports vision.

## Workflow Engine

The workflow engine should encode state transitions and approval gates. LangGraph is suitable because print jobs are naturally stateful and branch on evidence.

The workflow owns allowed transitions. Hermes can recommend or request a transition, but the graph decides whether the job can move forward.

## Service Layer

Services should be small adapters with explicit input/output contracts:

- Moonraker connector: printer status, upload, start, pause, cancel, telemetry
- FDM Monster connector: fleet status/dashboard sidecar sync
- slicer worker: STL/3MF to G-code with profile evidence
- modeling worker: prompt/constraints to CAD or mesh artifacts
- mesh repair worker: validation, repair, export, screenshots/previews
- inventory service: printer capabilities and profiles
- ledger service: durable job evidence and approvals

## Data Ownership

Hermes3D OS should own:

- printer records
- printer capability profiles
- job state
- approvals
- model artifacts
- G-code artifacts
- telemetry snapshots
- error records
- audit/evidence logs

FDM Monster can be used for visibility, but it should not be the only source of truth.
