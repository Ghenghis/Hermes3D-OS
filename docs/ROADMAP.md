# Roadmap

## Phase 0: Repository Foundation

- define architecture
- define workflow gates
- define pilot printer inventory
- define service configuration

## Phase 1: Manual Print Pipeline

- create backend API
- add database schema for jobs, printers, artifacts, approvals, telemetry
- add Moonraker connector
- add pilot printer records for FLSUN T1-A and FLSUN T1-B
- upload existing STL/3MF files
- run PrusaSlicer CLI
- approve and dispatch G-code to Moonraker
- monitor telemetry

## Phase 2: Hermes-Orchestrated Jobs

- wrap job intake with Hermes
- add structured job plans
- add evidence summaries
- add approval prompts
- persist Hermes decisions into the ledger

## Phase 3: LangGraph Workflow Engine

- encode print workflow state graph
- enforce transition rules
- add retry/repair branches
- add pause/cancel/fail handling

## Phase 4: Modeling Worker

- connect local downloaded modeling LLM
- generate CadQuery/OpenSCAD outputs
- render STL/3MF artifacts
- validate and repair meshes
- create preview images

## Phase 5: Fleet Operations

- add FDM Monster sidecar/dashboard integration
- onboard additional printers
- add per-printer slicer profiles
- add filament/material profiles
- add historical success/failure analytics

## Phase 6: Advanced Generation

- add Blender repair/export automation
- add Trimesh analysis
- add photo-to-3D flow through ComfyUI/Hunyuan3D/TRELLIS if desired
- add batch job planning
- add production queue scheduling

