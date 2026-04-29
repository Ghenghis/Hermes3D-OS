# Hermes3D-OS Idle Learning Mode

Idle Learning Mode lets Hermes3D agents keep researching while the factory is quiet. It is research-only by design: agents may collect sources, write markdown reports, draw diagrams, and propose tickets, but they may not move printers, test S1, upload G-code, start prints, change firmware, or install dependencies without operator approval.

## Agent Queue

The current queued topics are exposed through:

- `GET /api/learning-mode/status`
- `POST /api/learning-mode/next-report`
- `POST /api/learning-mode/report`

Reports are written to `storage/learning/` and listed in the Learning page.

## Queued Research Topics

| Topic | Agent | Purpose |
| --- | --- | --- |
| AI 3D Generation Watch | `research_agent` | Track TRELLIS.2, Hunyuan3D, TripoSR, SPAR3D, InstantMesh, commercial APIs, and ComfyUI workflow updates. |
| Agentic Modeling Automation Watch | `research_agent` | Track autonomous design loops, clarification agents, variant generation, critique/repair loops, and revision UX. |
| Autonomous CAD/CAM Watch | `mesh_repair_agent` | Track editable CAD generation, DFM checks, slicer compiler evidence, calibration coupons, and outcome learning. |
| Private Anonymous Local OS Watch | `factory_operator` | Track local-only operation, redaction, provider privacy labels, signed plugins, permission gates, and secrets handling. |
| Agentic OS Command Center Watch | `factory_operator` | Track command palettes, background-agent status, notifications, project memory, automations, and evidence timelines. |
| Generation UX Provider Watch | `research_agent` | Track Meshy, Tripo, Rodin, Scenario, Kaedim-style QA, provider routing, multi-view intake, variants, and export polish. |
| Printability Truth Gate Watch | `mesh_repair_agent` | Improve repair, validation, slicer dry-run, wall thickness, overhang, orientation, and 3MF evidence. |
| Observer AI And Camera Evidence Watch | `print_safety_agent` | Track camera registry, first-layer checks, anomaly detection, multi-camera roles, and voice safety alerts. |
| Fleet OS And Scheduling Watch | `factory_operator` | Track Moonraker queueing, scheduler logic, printer eligibility, maintenance blocks, spool/material matching, and printer twins. |
| Printer Mods And Calibration Watch | `research_agent` | Track safe FLSUN T1 and V400 upgrades, profiles, macros, calibration notes, and camera/lighting improvements. |

## Game-Changing Feature Backlog

- Provider-agnostic generation router with local-first engines and optional commercial fallback.
- Multi-view intake studio for front/side/back/top photos, pose guidance, cleanup, and consistency scoring.
- Two-speed generation: fast preview first, high-quality refinement after approval.
- Agentic modeling loop with spec clarifier, CAD author, mesh critic, slicer compiler, print safety reviewer, and revision planner agents.
- DesignSpec extractor that records units, dimensions, constraints, tolerances, material, target printer, success criteria, and unresolved questions.
- Variant board with visual/numeric diff: bounding box, volume, support burden, ETA, material use, changed parameters, and print readiness.
- Revision plan artifacts for failed candidates: issue, cause, proposed edit, expected metric improvement, and approval state.
- CAD-first mode for functional brackets, mounts, jigs, adapters, fixtures, and enclosures.
- Anonymous/local-only mode with report redaction, provider privacy labels, signed plugin permissions, and secrets-safe research notes.
- OS command center with command palette, notifications, background-agent status, task queue, project memory, and evidence timeline.
- Hermes PrintBench for visual quality, slicer pass rate, wall validity, support burden, material use, and actual print outcomes.
- 3MF print contract with model, units, materials, profile hash, approvals, thumbnails, and evidence references.
- Scheduler above Moonraker queues with printer eligibility, material/nozzle/profile match, ETA, priority, due date, and risk.
- Observer policy engine: observe only, alert, pause recommended, and approval-gated auto-pause.
- First-layer gate using nozzle/bed camera evidence before unattended continuation.
- Spoolman/OpenPrintTag-ready material tracking and maintenance blockers.

## Sources To Watch

- TRELLIS.2: <https://github.com/microsoft/TRELLIS.2>
- Hunyuan3D-2.1: <https://github.com/tencent-hunyuan/Hunyuan3D-2.1>
- TripoSR: <https://arxiv.org/abs/2403.02151>
- ComfyUI server routes: <https://docs.comfy.org/development/comfyui-server/comms_routes>
- Moonraker job queue: <https://moonraker.readthedocs.io/en/latest/external_api/job_queue/>
- Moonraker webcams: <https://moonraker.readthedocs.io/en/latest/external_api/webcams/>
- Moonraker notifications: <https://moonraker.readthedocs.io/en/latest/external_api/jsonrpc_notifications/>
- Moonraker Spoolman integration: <https://moonraker.readthedocs.io/en/latest/external_api/integrations/#spoolman>
- Obico failure detection: <https://www.obico.io/blog/how-obico-ai-failure-detection-works/>
- Obico first-layer AI: <https://www.obico.io/docs/user-guides/first_layer_ai/nozzle-camera-configuration/>
- Anomalib: <https://github.com/open-edge-platform/anomalib>
- CAD-Coder: <https://arxiv.org/abs/2505.19713>
- Text-to-CadQuery: <https://arxiv.org/abs/2505.06507>
- lib3mf: <https://lib3mf.readthedocs.io/>
- Agent Governance Toolkit: <https://opensource.microsoft.com/blog/2026/04/02/introducing-the-agent-governance-toolkit-open-source-runtime-security-for-ai-agents/>
- ProCAD: <https://arxiv.org/abs/2602.03045>
- CADSmith: <https://arxiv.org/abs/2603.26512>
- ToolCAD: <https://arxiv.org/abs/2604.07960>
- CADCodeVerify: <https://arxiv.org/abs/2410.05340>
- Text-to-CadQuery: <https://github.com/Text-to-CadQuery>
- Zoo Zookeeper: <https://docs.zoo.dev/docs/zoo-design-studio/zookeeper>
- Zoo KCL: <https://docs.zoo.dev/research/introducing-kcl>
- Scenario 3D model comparison: <https://help.scenario.com/en/articles/comparing-generative-3d-models/>

## Safety Boundary

Idle Learning Mode is allowed to:

- write markdown reports and diagrams
- update proposed roadmap tickets
- summarize public sources
- recommend experiments for operator review
- create redacted/share-safe report versions
- label local/cloud/commercial provider use before any job runs

Idle Learning Mode is blocked from:

- probing or moving FLSUN S1 while maintenance locked
- uploading or starting prints
- changing printer firmware or macros
- installing dependencies without explicit operator action
- marking generated meshes printable without validation and slicer dry-run evidence
- leaking printer secrets, API keys, camera URLs, private IP details, or local model endpoints into shareable reports
