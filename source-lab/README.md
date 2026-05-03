# Hermes3D-OS Source Lab

This folder turns the UX lab into a source-backed design bench.

- `source_manifest.json` defines the open-source slicers, modelers, print-farm tools, generation engines, and orchestration projects Hermes3D-OS should bridge.
- `download-open-source.ps1` clones those projects into `source-lab/sources/`.
- `source-lab/sources/` is intentionally gitignored because these repos are large vendor/source checkouts.
- `download-report.md` is generated when the downloader runs.
- `SOURCE_INVENTORY.md` lists the included projects by Hermes3D section.
- `USABLE_SOURCE.md` explains what is direct runtime source, what is UI/reference source, and what stays research-only.

Default clone mode is sparse to keep the first pass fast. Use `-FullCheckout` only when we are ready to inspect or patch a specific project deeply.

Examples:

```powershell
.\source-lab\download-open-source.ps1 -Groups slicers,print_farm,orchestration
.\source-lab\download-open-source.ps1 -Only prusaslicer,orcaslicer,moonraker,langgraph
.\source-lab\download-open-source.ps1 -Only blender -FullCheckout
```

Design rule: Hermes3D owns the single OS shell. Each imported project gets a compact selectable section, a local source path, and a bridge task list. We do not dump whole third-party UIs into one messy page.
