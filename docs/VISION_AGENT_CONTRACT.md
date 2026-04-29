# Hermes3D-OS Vision Agent Contract

Hard requirement: every Hermes3D agent is vision-enabled.

Hermes3D-OS stays standalone. It uses the Hermes agent system with Moonraker, FDM Monster as a sidecar, PrusaSlicer/OrcaSlicer, CadQuery/OpenSCAD, Blender/Trimesh, ComfyUI, TRELLIS.2, Hunyuan3D, and TripoSR. Goose, OpenHands, and OpenClaw are not required for operation.

## Required Agent Flags

Every Hermes agent config must include:

```yaml
vision: true
multimodal_input: true
evidence_required: true
```

Every agent must support:

- image input
- screenshot analysis
- mesh preview analysis
- slicer preview analysis
- printer/camera observation where applicable
- multimodal evidence summaries

## Providers

Primary vision and multimodal reasoning:

- `minimax-mcp`

Additional API provider:

- DeepSeek V4 family (`deepseek-v4-pro` preferred, `deepseek-v4-flash` fallback on the official API)

DeepSeek V4 may be used for planning, code generation, research summaries, CadQuery/OpenSCAD reasoning, roadmap generation, and markdown/report generation. It does not replace the required vision layer unless the configured DeepSeek endpoint explicitly supports vision. The default project rule is:

```yaml
deepseek_may_replace_vision: false
```

Provider readiness is exposed through:

- `GET /api/providers/status`
- the Agents page Provider Readiness panel
- Autopilot setup checks

Configure MiniMax-MCP with one of:

```text
MINIMAX_MCP_URL=
MINIMAX_MCP_COMMAND=
```

Configure optional DeepSeek V4 reasoning with:

```text
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

## Default Agents

```yaml
agents:
  factory_operator:
    provider: minimax
    model: minimax-mcp
    vision: true
    multimodal_input: true
    evidence_required: true
    voice: en-GB-MaisieNeural

  modeling_agent:
    provider: deepseek
    model: deepseek-v4-pro
    fallback_model: deepseek-v4-flash
    vision: true
    vision_provider: minimax_mcp
    multimodal_input: true
    evidence_required: true
    voice: en-US-AriaNeural

  mesh_qa_agent:
    provider: minimax
    model: minimax-mcp
    vision: true
    multimodal_input: true
    evidence_required: true
    voice: en-AU-CarlyNeural

  slicer_qa_agent:
    provider: minimax
    model: minimax-mcp
    vision: true
    multimodal_input: true
    evidence_required: true
    voice: en-US-JennyNeural

  print_monitor_agent:
    provider: minimax
    model: minimax-mcp
    vision: true
    multimodal_input: true
    evidence_required: true
    camera_required: true
    voice: en-GB-RyanNeural

  research_agent:
    provider: deepseek
    model: deepseek-v4-pro
    fallback_model: deepseek-v4-flash
    vision: true
    vision_provider: minimax_mcp
    multimodal_input: true
    evidence_required: true
    voice: en-US-GuyNeural
```

## Evidence Rule

No agent should make a printability, safety, visual quality, or printer-observation claim without evidence references. Evidence can be:

- source image artifact
- mesh preview screenshot
- Blender repair preview
- slicer preview screenshot
- G-code/slicer dry-run report
- printer camera snapshot
- operator-uploaded screenshot
- markdown report with artifact paths

This makes Hermes3D-OS a multimodal print-factory operator, not a text-only job planner.

## Sources

- MiniMax-MCP: <https://github.com/MiniMax-AI/MiniMax-MCP>
- DeepSeek API docs: <https://api-docs.deepseek.com/>
- DeepSeek V4 preview release: <https://api-docs.deepseek.com/news/news260424>
