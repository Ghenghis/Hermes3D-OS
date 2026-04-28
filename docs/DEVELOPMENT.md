# Development Guide

Hermes3D OS should be built in thin, testable layers.

## Recommended Implementation Order

1. Backend API skeleton. Done in MVP.
2. Database schema for printers, jobs, artifacts, approvals, and telemetry. Done in MVP.
3. Moonraker connector. Dry-run connector done in MVP.
4. Manual job upload and slicing worker. Simulated slicer fallback done in MVP.
5. Approval-gated dispatch. Done in MVP.
6. Telemetry monitor. Dry-run telemetry done in MVP.
7. Hermes orchestration wrapper.
8. Workflow graph.
9. Modeling worker.
10. Fleet dashboard integrations.

## Application Boundaries

```text
apps/api
  Backend service and API routes.

apps/web
  Standalone operational dashboard.

packages/hermes_runtime
  Hermes agent wrapper and prompt/tool contracts.

packages/workflows
  LangGraph workflow definitions and transition rules.

packages/connectors
  Moonraker, FDM Monster, local model, and future external adapters.

packages/workers
  Slicing, modeling, mesh validation, repair, and preview workers.

packages/db
  Database schema, migrations, repositories, and typed records.
```

## Development Rules

- Keep printer mutation behind explicit service methods.
- Record every artifact-producing step in the ledger.
- Require approval records before starting prints.
- Prefer deterministic validators over agent judgment for safety checks.
- Keep example configs safe and generic.
- Do not commit generated STL, 3MF, or G-code files unless they are tiny test fixtures intentionally added later.

## Testing Targets

Early tests should focus on:

- workflow transition rules
- Moonraker API request formatting
- slicer command construction
- model/G-code validation result parsing
- approval gate enforcement
- database persistence for job evidence
