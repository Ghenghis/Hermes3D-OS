# AI 3D Generation Research 2026

Research date: April 28, 2026.

## Market Pattern

Most online tools are asset generators, not print-factory systems. They produce attractive GLB/OBJ/STL/3MF exports, but they rarely prove real FDM printability.

Useful benchmark products:

- Meshy: text/image/multi-image to 3D, remesh, rig, animation, exports including STL and 3MF. <https://www.meshy.ai/features/text-to-3d>
- Tripo AI: text/image/multiview, batch, low-poly, skeleton, exports including STL and 3MF. <https://www.tripo3d.ai/api>
- Hyper3D Rodin: image/text to 3D with PBR and topology focus. <https://hyper3d.io/>
- Kaedim: AI plus human QA for production assets. <https://docs.kaedim3d.com/welcome/faq>
- CSM/Cube: chat/image/text to 3D, Blender workflow hooks. <https://www.csm.ai/pricing>
- Scenario 3D: API-first asset generation, Hunyuan model IDs, PBR workflows. <https://docs.scenario.com/docs/3d-model-generation>
- 3D AI Studio: API aggregation with conversion, repair, hollowing, scaling, STL/3MF support. <https://www.3daistudio.com/Platform/API/Documentation/3d-generation>
- Autodesk Wonder 3D: Flow Studio text/image-to-3D for pro DCC pipelines. <https://blogs.autodesk.com/media-and-entertainment/2026/03/04/introducing-wonder-3d-text-and-image-to-3d-in-flow-studio/>
- Roblox Cube 3D: platform-bound mesh and future functional object generation. <https://github.com/Roblox/cube>

Hermes3D-OS should copy the short UX path:

```text
prompt/image -> preview -> repair/optimize -> material/color -> STL/3MF/GLB -> slicer/printer handoff
```

But Hermes must add the part they do not own:

```text
visual mesh -> manufacturing solid -> slicer-approved G-code -> monitored physical print
```

## Open Local Model Shortlist

Priority order for Hermes:

1. TRELLIS.2: primary high-quality image-to-3D where local NVIDIA hardware allows. <https://github.com/microsoft/TRELLIS.2>
2. Hunyuan3D-2.1: comparison/fallback with open local deployment and PBR workflow. <https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1>
3. Stable Fast 3D: fast GLB preview route with lower VRAM needs, license review required. <https://github.com/Stability-AI/stable-fast-3d>
4. InstantMesh / CRM: research baselines and multiview comparison. <https://github.com/TencentARC/InstantMesh>
5. TripoSR: very fast preview fallback only. <https://github.com/VAST-AI-Research/TripoSR>

ComfyUI integration hub:

- ComfyUI-3D-Pack: <https://github.com/MrForExample/ComfyUI-3D-Pack>
- ComfyUI Hunyuan3D wrapper: <https://github.com/kijai/ComfyUI-Hunyuan3DWrapper>
- ComfyUI TRELLIS wrapper: <https://github.com/smthemex/ComfyUI_TRELLIS>
- ComfyUI TripoSR node: <https://github.com/flowtyone/ComfyUI-Flowty-TripoSR>

## Papers and Benchmarks

- TRELLIS / Structured 3D Latents: <https://arxiv.org/abs/2412.01506>
- Hunyuan3D 2.5: <https://arxiv.org/abs/2506.16504>
- TripoSR: <https://arxiv.org/abs/2403.02151>
- InstantMesh: <https://arxiv.org/abs/2404.07191>
- CRM: <https://arxiv.org/abs/2403.05034>
- Text2CAD: <https://arxiv.org/abs/2409.17106>
- CADCodeVerify: <https://arxiv.org/abs/2410.05340>
- 3DGen-Bench: <https://arxiv.org/abs/2503.21745>
- HY3D-Bench: <https://arxiv.org/abs/2602.03907>

## Implementation Rule

Generated meshes are concept artifacts until Hermes proves:

- manifold and watertight geometry
- real-world scale
- minimum wall thickness
- bed fit
- support/overhang risk
- printer/material/profile compatibility
- slicer dry-run success
- evidence report and approval

This is the difference between an image-to-3D demo and Hermes as an autonomous print factory operator.
