# Source Inventory

The source bench currently tracks 55 Hermes3D modules and 54 unique local source checkouts. Klipper appears in both Print Farm and Firmware because it is both the user's active printer runtime and the firmware reference layer.

## Checkout Status

As of 2026-05-03, every manifest entry has a local git checkout under `source-lab/sources`.

- Full source checkouts: PrusaSlicer (`c47697d`), OrcaSlicer (`dae0694e`), FLSUN Slicer (`fb02854`).
- Sparse source checkouts: the remaining 52 modules, kept sparse to limit disk usage until each one is promoted into an active bridge.
- Missing checkouts: none.

Run a full conversion for a specific module with:

```powershell
.\source-lab\download-open-source.ps1 -Only prusaslicer -FullCheckout
```

The downloader now disables sparse checkout for an existing repo when `-FullCheckout` is passed.

## Slicers

- PrusaSlicer
- OrcaSlicer
- UltiMaker Cura
- CuraEngine
- SuperSlicer
- Slic3r
- BambuStudio
- MatterControl
- Kiri:Moto / GridSpace
- Strecs3D
- FLSUN Slicer

## Modelers / Mesh

- Blender
- FreeCAD
- CadQuery
- OpenSCAD
- build123d
- Trimesh
- Manifold
- MeshLab
- SolveSpace
- Truck

## Print Farm / Control

- Klipper
- Moonraker
- FDM Monster
- BotQueue
- Fluidd
- Mainsail
- OctoPrint
- Printrun / Pronterface
- OctoFarm
- KlipperScreen

## Firmware

- Klipper
- Marlin
- Prusa Firmware
- RepRapFirmware
- Smoothieware
- Repetier Firmware

## 3D Generation

- ComfyUI
- ComfyUI Frontend
- Microsoft TRELLIS.2
- ComfyUI TRELLIS.2 Wrapper
- Hunyuan3D-2.1
- TripoSR

## Agents / Orchestration

- LangGraph
- LangChain
- Azure Speech SDK JS
- Model Context Protocol
- Kiln

## Libraries / Materials / Hardware / Utilities

- Manyfold
- Open Filament Database
- BoxTurtle
- EnragedRabbitProject
- Awesome Extruders
- 3D Box Generator
- Awesome 3D Printing

## Current Rule

Anything in this inventory is a candidate source. It only becomes part of Hermes3D-OS production after it passes the cherry-pick gate: useful CLI/API/runtime value, clear license boundary, and a specific UI section or worker role.
