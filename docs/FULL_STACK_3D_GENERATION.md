# Hermes3D-OS Full-Stack 3D Generation

ComfyUI is a generation backend, not the operating system. Hermes3D-OS wraps it in a production image-to-print pipeline with evidence, validation, repair, slicer proof, printer compatibility, voice updates, and reports.

## Pipeline

```text
Photo / multi-photo input
  -> MiniMax-MCP vision analysis
  -> prompt + object intent + scale estimate
  -> background removal / image cleanup
  -> TRELLIS.2 primary generation
  -> Hunyuan3D-2.1 fallback / comparison
  -> TripoSR fast preview fallback
  -> Blender CLI repair
  -> Mesh validation
  -> slicer dry-run
  -> printability truth gate
  -> printer selection
  -> Moonraker upload
  -> live monitoring
  -> Azure voice updates
  -> markdown report + diagrams
```

## Engine Roles

- `TRELLIS.2`: primary image-to-3D engine.
- `Hunyuan3D-2.1`: comparison and fallback engine.
- `TripoSR`: fast preview fallback, never final print authority.

Workflow placeholders live in `workflows/comfyui/`. Replace them with exported ComfyUI API workflow JSON after the local nodes are installed.

## Printability Truth Gate

Every generated object must pass:

- watertight mesh
- manifold mesh
- fixed normals
- repaired holes
- real-world scale
- minimum wall thickness check
- bed-size fit check
- overhang/support estimate
- slicer dry-run success
- material/printer compatibility
- Moonraker-ready upload package

Until those pass, generated meshes are evidence only.

## Generated Object Evidence

Every run produces:

- source image record
- selected engine
- generation parameters
- mesh stats
- repair actions
- slicer result
- printer compatibility score
- final STL/3MF/GLB path fields
- markdown report
- SVG pipeline diagram

API:

- `GET /api/generation-stack/status`
- `POST /api/generation-stack/plan`
- `POST /api/jobs/{job_id}/generate-3d-from-image`

## Why This Is Different From Meshy-Like Tools

Most online generators produce attractive assets. Hermes3D-OS must prove the object can become a physical print:

```text
AI 3D asset generation -> print-safe geometry -> slicer-approved G-code
```

This makes Hermes a printability compiler, not a 3D asset toy.

## Source Patterns

- Microsoft TRELLIS: <https://github.com/microsoft/TRELLIS>
- Microsoft TRELLIS.2: <https://github.com/microsoft/TRELLIS.2>
- Hunyuan3D-2.1: <https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1>
- TripoSR: <https://github.com/VAST-AI-Research/TripoSR>
- ComfyUI server routes: <https://docs.comfy.org/development/comfyui-server/comms_routes>
- ComfyUI-3D-Pack: <https://github.com/MrForExample/ComfyUI-3D-Pack>
- Blender Python API: <https://docs.blender.org/api/current/>
- Trimesh: <https://trimesh.org/>
- Manifold: <https://github.com/elalish/manifold>
- 3MF Core spec: <https://github.com/3MFConsortium/spec_core/blob/master/3MF%20Core%20Specification.md>
- PrusaSlicer CLI: <https://github.com/prusa3d/PrusaSlicer/wiki/Command-Line-Interface>
