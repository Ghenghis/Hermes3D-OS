# Web App

Standalone operational OS shell for Hermes3D.

The first screen is **Source OS**, not a landing page. It shows the source-backed module bench, selected source app host, bridge tasks, project inventory, and per-section pipeline flows.

## Live Pages

```text
Source OS
Dashboard
Autopilot
Design
3D Generation
Jobs
Printers
Observe
Voice
Agents
Learning
Artifacts
Approvals
Plugins
Settings
Roadmap
```

## Required Surface Quality

- Keep README, interface docs, tab count, and visual proof aligned with `apps/web/index.html`.
- Keep the Source OS workbench responsive before adding new tabs.
- Do not present a mocked third-party native UI as the real app. Source OS must show real checkout, executable, git head, checkout mode, and action status.
- Keep `Repo`, `Source`, `Launch`, `Bridge`, `Setup`, and `Refresh` backed by real handlers. The root `data-source-layout` container must not intercept all clicks.
- Show production flows as operator-facing surfaces: source, CAD, generation, slicer compiler, dispatch, observation, materials, and audit.
- Treat S1 as maintenance locked in all UI surfaces.
- Keep hardware-adjacent actions explicit and separated: upload only, operator printer check, start print, monitor.
