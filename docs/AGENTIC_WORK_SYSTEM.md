# Hermes3D-OS Agentic Work System

The Agentic Work System is the active planning layer above Idle Learning Mode. It keeps Hermes agents visibly working on research, implementation tickets, blockers, visual evidence, and safety-gated next actions while preventing hardware-adjacent actions unless the operator approves.

All active Hermes agents are vision-enabled. Each agent reports `vision: true`, `multimodal_input: true`, and `evidence_required: true`. MiniMax-MCP is the primary vision provider; DeepSeek V4 can be used for planning, CAD reasoning, code, research summaries, roadmaps, and markdown reports while vision still routes through MiniMax-MCP unless the DeepSeek endpoint is explicitly multimodal.

## API

- `GET /api/agentic-work/status`
- `POST /api/agentic-work/tick`
- `GET /api/providers/status`
- `POST /api/jobs/{job_id}/visual-evidence`
- `GET /api/artifacts/{artifact_id}/file`

The status endpoint exposes:

- active agent roster
- vision contract and provider routing
- MiniMax-MCP and DeepSeek V4 readiness
- queued research and build tracks
- current blockers
- latest learning report
- safe automation policy
- next safe tick

The tick endpoint creates the next queued Learning Mode report and records an `AGENTIC_WORK_TICK` event. It does not move printers, upload G-code, start prints, change firmware, or install dependencies.

## Active Agents

| Agent | Work |
| --- | --- |
| `factory_operator` | OS command center, scheduling, provenance, privacy, visual triage, operator handoff |
| `modeling_agent` | DeepSeek V4 CAD/OpenSCAD/CadQuery reasoning with MiniMax-MCP visual critique |
| `mesh_repair_agent` | CAD/CAM, DFM, tolerance twin, printability truth gate, mesh preview evidence |
| `mesh_qa_agent` | Mesh screenshots, manifold evidence, normals, holes, wall-thickness risks |
| `slicer_qa_agent` | Slicer screenshots, supports, overhangs, estimates, G-code evidence |
| `print_monitor_agent` | Printer and USB camera observation, first-layer checks, anomaly notes |
| `print_safety_agent` | Observer AI, first-layer evidence, anomaly policies, voice safety alerts |
| `research_agent` | DeepSeek V4 research and reports with MiniMax-MCP visual evidence review |
| `privacy_agent` | Anonymous mode, redaction, plugin permissions, secrets, camera privacy, provider routing labels |

## Immediate Work Queue

- DesignSpec v0
- Agentic Modeling Loop v0
- Vision Agent Contract v0
- Anonymous Mode v0
- OS Command Center v0
- Idle Learning Mode research topics

## Safety Policy

Allowed:

- research
- markdown reports
- diagrams
- proposed implementation tickets
- local readiness checks
- visual artifact analysis
- multimodal evidence summaries

Blocked:

- FLSUN S1 testing or movement
- printer movement
- G-code upload
- print start
- firmware changes
- dependency installs without operator approval
- shareable reports containing secrets, local IPs, API keys, camera URLs, or local model endpoints
- text-only printability or safety claims without visual/evidence references

## Current Blockers

- MiniMax-MCP vision provider configuration is required for the full multimodal agent contract
- DeepSeek V4 API key is optional for extra reasoning, but it does not remove the MiniMax-MCP vision requirement
- exported ComfyUI API workflows are still needed for TRELLIS.2, Hunyuan3D-2.1, and TripoSR
- Blender is needed for repair/export worker readiness
- Azure Speech credentials are needed for live TTS/STT
- FLSUN S1 remains maintenance locked

## Research Direction

Agentic work is currently focused on:

- closed-loop text-to-CAD and DesignSpec clarification
- DFM/DFA and tolerance twin rules
- 3MF print contracts
- provenance and telemetry
- command center and background-agent dock
- anonymous/local-only provider routing
- voice-first floor mode
