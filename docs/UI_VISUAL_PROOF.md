# UI Visual Proof

Captured originally on 2026-04-28 local time against the live local app at `http://127.0.0.1:8081/`.

Updated Source OS verification was performed on 2026-05-03 against `http://127.0.0.1:18081/#sources`.

The current Hermes OS Print Factory UI uses a dark default `Midnight` theme and supports saved theme switching for:

- Midnight
- Alloy
- Ember
- Forest

## Truth Checks

- Live app title: `Hermes OS Print Factory`
- Default theme: `midnight`
- OS tabs present: 16
- Source OS is the first tab and loads all 55 source modules from the manifest
- Source app backend status returns 55 modules, 0 missing checkout folders, 3 full working trees, and 52 sparse working trees
- PrusaSlicer, OrcaSlicer, and FLSUN Slicer are full working-tree source checkouts
- Source OS action buttons are wired through `source-os.js` and `/api/source-apps/*` instead of being swallowed by the root layout click handler
- The embedded fake slicer panel was replaced by real source checkout, executable, git head, checkout mode, and source-highlight status
- Theme selector present in the topbar
- Settings page theme swatches switch the live `body[data-theme]` value
- FLSUN S1 is visible but maintenance locked
- FLSUN S1 test action is disabled
- Runtime, worker, slicer, ComfyUI, TRELLIS, Hunyuan3D, TripoSR, FDM Monster, and Moonraker ports are editable and saved through Settings
- Visual proof was captured without probing, moving, or testing the FLSUN S1

## Pixel Check

The screenshot set was sampled for brightness. Average luminance stayed between `22.4` and `41.1` on a 0-255 scale. The highest near-white pixel percentage was `4.1%`, from text and evidence thumbnails rather than page backgrounds.

## Screenshots

| Page | Proof |
| --- | --- |
| Dashboard | [01-dashboard.png](ui-proof/01-dashboard.png) |
| Autopilot | [02-setup.png](ui-proof/02-setup.png) |
| Design | [03-design.png](ui-proof/03-design.png) |
| 3D Generation | [04-generation.png](ui-proof/04-generation.png) |
| Jobs | [05-jobs.png](ui-proof/05-jobs.png) |
| Printers | [06-printers.png](ui-proof/06-printers.png) |
| Observe | [07-observe.png](ui-proof/07-observe.png) |
| Voice | [08-voice.png](ui-proof/08-voice.png) |
| Agents | [09-agents.png](ui-proof/09-agents.png) |
| Learning | [10-learning.png](ui-proof/10-learning.png) |
| Artifacts | [11-artifacts.png](ui-proof/11-artifacts.png) |
| Approvals | [12-approvals.png](ui-proof/12-approvals.png) |
| Plugins | [13-plugins.png](ui-proof/13-plugins.png) |
| Settings | [14-settings.png](ui-proof/14-settings.png) |
| Roadmap | [15-roadmap.png](ui-proof/15-roadmap.png) |

The screenshot set predates the Source OS tab. Regenerate proof after the next visual pass so the table includes:

| Page | Proof |
| --- | --- |
| Source OS | `00-source-os.png` |

## Dashboard Proof

![Dashboard proof](ui-proof/01-dashboard.png)

## Printer Safety Proof

![Printer safety proof](ui-proof/06-printers.png)

## Theme Settings Proof

![Theme settings proof](ui-proof/14-settings.png)
