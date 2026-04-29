# Usable Source Map

Hermes3D-OS should not merge whole third-party apps into one tangled UI. The right pattern is to cherry-pick by role: real backend where the project exposes CLI/API/runtime value, UI reference where the project teaches a better layout, and catalog-only where the project is a discovery list.

## Direct Runtime / Backend Sources

These can become real Hermes3D-OS adapters, workers, or service bridges.

| Source | Use in Hermes3D-OS | Why it is usable |
| --- | --- | --- |
| Klipper | Firmware/runtime model reference | Printer object model, macros, config patterns, safety boundaries. |
| Moonraker | Primary printer API connector | HTTP/WebSocket printer status, file upload, job control, service/camera discovery. |
| Klipper | Primary firmware/runtime model | Printer object model, macro/config patterns, command boundaries for the FLSUN/Klipper printers. |
| PrusaSlicer | Primary slicer worker | Strong CLI path, profiles, 3MF/G-code workflows. |
| OrcaSlicer | Primary/alternate slicer worker | Calibration workflows, profiles, device UX, Prusa/Bambu lineage. |
| FLSUN Slicer | FLSUN profile/source bridge | Vendor profiles and FLSUN-specific printer/device defaults. |
| CuraEngine | Alternate headless slicer backend | Engine is usable separately from Cura GUI. |
| CadQuery / build123d | AI parametric CAD workers | Python CAD, editable generated source, STEP/STL export. |
| OpenSCAD | Deterministic parametric CAD worker | CLI render/export and simple editable parameter scripts. |
| Blender | Mesh repair/render/export worker | Headless Python, mesh cleanup, preview renders, STL/3MF/GLB export. |
| Trimesh / Manifold | Printability truth gate | Mesh stats, watertight/manifold checks, repair/boolean operations. |
| ComfyUI | 3D generation workflow runner | Queue/API/workflow pattern for TRELLIS/Hunyuan/TripoSR paths. |
| TRELLIS.2 | Primary image-to-3D engine | Current main generation engine for photo-to-3D. |
| Hunyuan3D-2.1 | Comparison/fallback 3D engine | Open 3D generation stack for compare/fallback/research. |
| TripoSR | Fast preview fallback | Cheap early preview before expensive generation. |
| LangGraph | Agent workflow gates | State graph, approval gates, recoverable jobs. |
| Azure Speech SDK | Voice layer | TTS/STT browser/service integration for agents. |
| Model Context Protocol | Tool protocol reference | Connector pattern for Hermes tools and vision/media services. |
| Manyfold | Local model library/reference vault | Self-hosted asset library patterns for models, tags, metadata, and reuse. |
| Open Filament Database | Material/profile data source | Filament settings and community material data for profile suggestions. |

## UI / Workflow Pattern Sources

These are useful to study and selectively copy ideas from, but Hermes3D should not simply embed their entire UI.

| Source | Cherry-pick |
| --- | --- |
| Fluidd | Compact Moonraker panels, files/macros/console, live telemetry density. |
| Mainsail | Klipper dashboard layout, macro controls, device panels. |
| FDM Monster | Multi-printer fleet dashboard, queue/status patterns. |
| KlipperScreen | Touch-friendly printer controls and safety affordances. |
| OctoPrint | Plugin ecosystem, camera controls, legacy printer flow. |
| OctoFarm | Farm dashboard concepts and printer-card organization. |
| Printrun / Pronterface | Manual jog controls, printcore API, USB/serial fallback host. |
| BotQueue | Older queue/farm dispatch ideas, useful only as a historical queue reference. |
| SuperSlicer / Slic3r | Expert slicing controls, legacy CLI/profile behavior. |
| BambuStudio | Slicer lineage and device workflow reference for Orca-style UX; avoid Bambu network plugin coupling. |
| MatterControl | Desktop all-in-one modeling/slicing/host organization reference. |
| Kiri:Moto | Browser slicer and web preview workflow reference. |
| Cura GUI | Plugin/package structure, machine definitions, output-device ideas. |
| FreeCAD / MeshLab / SolveSpace | CAD/mesh workflow concepts; use carefully due size and license surface. |
| Marlin / Prusa Firmware / RepRapFirmware / Smoothieware / Repetier Firmware | Compatibility references for non-Klipper printers, not active control paths unless a matching printer is onboarded. |
| BoxTurtle / EnragedRabbitProject | Future filament changer and multi-material workflow references. |
| 3D Box Generator | Small utility generator pattern for fast printable templates. |
| Strecs3D / Truck | Research-only candidates for structural infill and geometry-kernel ideas. |

## Catalog / Research Sources

| Source | Use |
| --- | --- |
| Awesome 3D Printing | Discovery index for idle learning mode. Agents should mine this list, score tools by CLI/API/license/activity, and promote only useful candidates into the manifest. |
| Awesome Extruders | Hardware upgrade discovery index for extruder and hotend research. |

## Cherry-pick Rules

1. Runtime first: prefer projects with CLI, HTTP/WebSocket API, Python API, or machine-readable config.
2. UI second: borrow compact workflows and controls, not giant text panels or whole unrelated screens.
3. License gate every source before bundling or copying code.
4. Keep GPL/AGPL source boundaries explicit in the Trust/Plugins screen.
5. For FLSUN printers, prefer FLSUN slicer profiles and start/end G-code, then validate with Prusa/Orca dry-runs.
6. S1 is always locked for movement/testing until the user clears maintenance.
