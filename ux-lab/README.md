# Hermes3D UX Lab

This folder is a throwaway design lab. It is not the production web app.

Goal: design the Hermes OS Print Factory interface first, then port only the useful parts back into `apps/web`.

## Current Prototype

- [print-factory-os-v1.html](print-factory-os-v1.html)
- [proof/print-factory-os-v1.png](proof/print-factory-os-v1.png)
- [source-backed-sections-v1.html](source-backed-sections-v1.html)
- [proof/source-backed-sections-v1.png](proof/source-backed-sections-v1.png)

Open it directly in a browser. It is a single-page static prototype with compact mock telemetry.

`source-backed-sections-v1.html` is the source picker design: slicers, modelers, print-farm tools, firmware, 3D generation, agents, libraries, materials, hardware, utilities, and research catalogs. Each selectable module shows the repo, local source path, license boundary, Hermes section, and bridge tasks.

## Design Rules For This Lab

- one primary operating screen, not many empty text pages
- compact desktop density for a large monitor
- printer farm first: 3 to 6 active printers visible at once
- slicer source bridge visible: PrusaSlicer, OrcaSlicer, FLSUN slicer, Cura
- modeling source bridge visible: CadQuery, OpenSCAD, Blender, TRELLIS/Hunyuan/TripoSR
- event console minimized by default or narrow, never a giant permanent text wall
- status text must earn space by being live, clickable, or actionable
- S1 remains locked and cannot be tested or moved

## Research Sources Used

- FDM Monster: printer farm grid, drag/drop G-code, batch print, maintenance state, thumbnails, SQLite, Moonraker/PrusaLink/OctoPrint support. <https://github.com/fdm-monster/fdm-monster>
- Fluidd: customizable dashboard, themes, multiple printers, G-code viewer, thermal charts, webcams, spool management, file manager, keyboard shortcuts. <https://docs.fluidd.xyz/>
- Fluidd source: open-source Klipper UI with responsive customizable layouts. <https://github.com/fluidd-core/fluidd>
- PrusaSlicer CLI: command-line slicing and profile loading from AMF/3MF. <https://github.com/prusa3d/PrusaSlicer/wiki/Command-Line-Interface>
- OrcaSlicer: open-source slicer with calibration tools, wall/seam controls, Klipper object exclusion note, AGPL license. <https://github.com/OrcaSlicer/OrcaSlicer>
- Cura plugins: Python plugin system and output-device plugin examples for OctoPrint monitoring/upload patterns. <https://github.com/Ultimaker/Cura/wiki/Plugins-And-Packages>
- Moonraker API: API layer used by Fluidd/Mainsail and update/status endpoints for Klipper clients. <https://moonraker.readthedocs.io/en/stable/web_api/>
- Print3r: CLI-oriented multi-slicer print pipeline supporting PrusaSlicer, SuperSlicer, CuraEngine, transforms, preview, and G-code send. <https://github.com/Spiritdude/Print3r>

## Integration Target

Hermes should not merely link out to slicers. It should wrap source-backed capabilities:

- PrusaSlicer tab: profile manager, plate import, CLI slice, thumbnails, upload package
- OrcaSlicer tab: calibration workflows, seam/wall controls, Klipper object metadata
- FLSUN slicer tab: FLSUN printer profiles and simple import/resize/send flow
- Cura tab: plugin/output-device patterns, CuraEngine-compatible slicing where useful
- Blender tab: repair, measure, remesh, export, preview render
- CadQuery/OpenSCAD tabs: AI-editable parametric source, deterministic export
- Print farm tab: Moonraker/PrusaLink/OctoPrint/FDM Monster connectors
