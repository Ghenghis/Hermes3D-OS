# Getting Started

This repository is the starting point for Hermes3D OS, a standalone local 3D print factory controller powered by the Hermes agent system.

The current repo state is a project foundation: architecture, workflow gates, example configuration, branch strategy, and package boundaries. Implementation should begin with the manual print pipeline before model generation.

## Requirements

Recommended local tools:

- Python 3.11+
- Node.js 20+
- Git
- PrusaSlicer CLI
- Moonraker/Klipper printers on the local network
- Optional: OrcaSlicer CLI
- Optional: CadQuery
- Optional: OpenSCAD
- Optional: Blender
- Optional: Trimesh
- Optional: FDM Monster

## First Local Setup

```powershell
git clone https://github.com/Ghenghis/Hermes3D-OS.git
cd Hermes3D-OS
copy .env.example .env
copy configs\services.example.yaml configs\services.local.yaml
copy configs\printers.pilot.example.yaml configs\printers.local.yaml
```

Then edit:

- `.env`
- `configs/services.local.yaml`
- `configs/printers.local.yaml`

Do not commit local secrets, printer API keys, or private IP details.

## First Build Goal

The first working milestone should support this flow:

```text
Upload STL/3MF
  -> validate model
  -> approve model
  -> slice with PrusaSlicer CLI
  -> approve G-code
  -> upload to Moonraker
  -> start print
  -> monitor telemetry
```

Model generation should come after this pipeline works safely.

## Pilot Printers

Start with:

- FLSUN T1-A
- FLSUN T1-B

After the pilot workflow is stable, onboard the remaining fleet one printer family at a time.

