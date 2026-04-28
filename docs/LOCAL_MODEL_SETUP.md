# Local Model Setup

Hermes3D OS can use a local downloaded 3D/modeling LLM through an OpenAI-compatible endpoint or another adapter.

The modeling LLM should be treated as a specialist worker behind Hermes, not as the whole operating system.

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

## Example Config

```yaml
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

