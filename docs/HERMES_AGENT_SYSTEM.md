# Hermes Agent System

Hermes is the printer-agent brain for Hermes3D OS.

It replaces Goose/OpenHands/OpenClaw in this stack. Those tools are not required for operation.

## Responsibilities

Hermes should handle:

- user intent parsing
- job planning
- tool selection
- memory/context
- explanation and evidence summaries
- approval requests
- failure analysis
- recovery planning

Hermes should not directly bypass safety gates.

## Vision Requirement

Every Hermes agent in this project is vision-enabled. Agent configs must include:

```yaml
vision: true
multimodal_input: true
evidence_required: true
```

MiniMax-MCP is the primary vision/multimodal provider. DeepSeek V4 is allowed as an additional reasoning provider for planning, code generation, CAD/OpenSCAD/CadQuery reasoning, research summaries, roadmaps, and markdown reports, but it must not replace the required vision layer unless the configured DeepSeek endpoint explicitly supports vision.

Every agent must be able to handle image input, screenshots, mesh previews, slicer previews, printer/camera evidence where applicable, and multimodal evidence summaries. The detailed contract lives in [VISION_AGENT_CONTRACT.md](VISION_AGENT_CONTRACT.md).

## Safe Autopilot

The first built-in Hermes automation mode is safe setup and gate advancement.

It may:

- inspect local runtime, printer, and service config
- create missing local runtime/storage files
- auto-assign open local ports
- create dry-run setup jobs
- write setup reports
- write per-job agent plan artifacts
- advance workflow steps that do not touch hardware

It must stop at:

- model approval
- print approval
- printer selection
- upload-only
- start print
- pause/cancel
- any locked printer

This makes Hermes useful immediately while preserving operator control.

## Tool Boundary

Hermes calls tools through explicit service adapters.

```text
Hermes
  -> workflow transition request
  -> modeling tool
  -> mesh validation tool
  -> slicer tool
  -> printer inventory tool
  -> Moonraker tool
  -> ledger tool
```

Each tool response should be structured and recorded into the job ledger.

## Local Modeling LLM

The downloaded 3D/modeling LLM should be exposed as a local service, not embedded directly into every workflow node.

Supported local serving targets can include:

- Ollama
- LM Studio OpenAI-compatible API
- llama.cpp server
- vLLM
- KoboldCpp/OpenAI-compatible endpoint

The modeling worker should ask the LLM for durable, inspectable outputs:

- CadQuery Python
- OpenSCAD source
- Blender Python
- model repair plan
- parameterized design variations

Generated code or meshes must pass validation before slicing.

## Memory

Hermes memory should store useful shop context:

- printer nicknames and capabilities
- successful slicer profiles
- failed job causes
- filament behavior
- common user preferences
- recurring part requirements

Operational facts should also be stored in the database so they are queryable without relying only on conversational memory.
