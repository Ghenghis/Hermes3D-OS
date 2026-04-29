# Local Model Setup

Hermes3D OS can use a local downloaded 3D/modeling LLM through an OpenAI-compatible endpoint or another adapter.

The modeling LLM should be treated as a specialist worker behind Hermes, not as the whole operating system.

All modeling agents must remain vision-enabled. If the reasoning model is text-only, Hermes routes visual evidence through MiniMax-MCP and passes the resulting evidence summary into the modeling worker.

## Recommended Contract

Hermes sends:

- part description
- dimensions and constraints
- material intent
- target printer/profile
- output type requested

The modeling worker returns:

- CadQuery Python, OpenSCAD, or Blender Python
- generated artifact paths
- dimensions
- assumptions
- validation status
- repair notes

## Supported Serving Options

Potential local serving targets:

- LM Studio OpenAI-compatible server
- Ollama
- llama.cpp server
- vLLM
- KoboldCpp/OpenAI-compatible endpoint
- DeepSeek V4 API for optional planning, CAD/OpenSCAD/CadQuery reasoning, code generation, roadmap generation, and markdown reports

## Example Config

```yaml
providers:
  minimax_mcp:
    provider: minimax
    model: minimax-mcp
    base_url: ${MINIMAX_MCP_URL}
    vision: true
    multimodal_input: true
    evidence_required: true
  deepseek_v4:
    provider: deepseek
    model_family: deepseek-v4
    model: deepseek-v4-pro
    fallback_model: deepseek-v4-flash
    api_key: ${DEEPSEEK_API_KEY}
    vision: false
    vision_provider: minimax_mcp

workers:
  modeling:
    enabled: true
    provider: openai_compatible
    base_url: http://127.0.0.1:1234/v1
    model: your-downloaded-3d-modeling-llm
```

## Safe Output Types

Prefer inspectable, reproducible outputs first:

- CadQuery Python
- OpenSCAD source
- Blender Python

Avoid treating a generated mesh as printable until it passes validation and user approval.
