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

Check local readiness with:

```powershell
.\scripts\discover-3d-tools.ps1
```

The script reports Blender, PrusaSlicer, OrcaSlicer, Docker, ComfyUI reachability, and whether the TRELLIS.2, Hunyuan3D-2.1, and TripoSR workflow files are still placeholders.

When replacing a placeholder with an exported ComfyUI API workflow, put `{{source_image}}` in the image input field that should receive the uploaded user photo. Hermes replaces that token with the uploaded ComfyUI input filename before calling `/prompt`.

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

Runner behavior:

- placeholder workflows stop at `operator_required`
- exported ComfyUI API workflows can upload the source image, queue `/prompt`, poll `/history/{prompt_id}`, and collect `/view` artifacts
- downloaded meshes remain unprintable evidence until Blender repair, mesh validation, scale confirmation, and slicer dry-run all pass

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
