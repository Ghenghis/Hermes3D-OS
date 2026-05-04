# Hermes3D-OS Multi-Agent Split Plan
**Date:** 2026-05-03
**Trunk:** `develop` (all branches PR into `develop`; `develop` → `main` on milestones)
**Coordinator:** HermesProof MCP (every branch claims a task and emits evidence)

---

## Operating principle

**One branch = one fully-working E2E unit.** No half-done branches. A branch is mergeable only when:

1. Manifest / config landed (if applicable)
2. Backend endpoint reachable + tested (if applicable)
3. Frontend rendered + click handlers wired
4. Action Window integration works (if applicable — every selectable item across every tab renders in the same shared center panel)
5. Launcher implemented (if the app launches a process / opens a window / starts a server)
6. Playwright E2E spec passes locally
7. HermesProof task claim + evidence chain `PASS`
8. PR body has all mechanical-review fields (Task ID, evidence chain, `hermes_run_gate` reference)

A branch shipping only manifest config but not the install endpoint, or the install endpoint without the launcher, is **not** done.

---

## Branch types

| Type | Naming | Owner pattern | DoD includes |
|---|---|---|---|
| App | `app/<id>` | Kilocode (parallel pip), Codex (clone-full), Claude (heavy build) | manifest install block + endpoint dispatch + install button + launcher + Action Window card + Playwright |
| Tab | `tab/<page-id>` | Claude (UI-flow), Codex (backend-heavy) | tab content + per-tab data envelope + Action Window dispatch + Playwright |
| Button / option | `btn/<page>-<button>` | Windsurf | button rendered + handler + endpoint (if any) + state update + Playwright |
| Setting | `setting/<id>` | Windsurf | persistence + apply + reset + Playwright |
| Feature (cross-cutting) | `feat/<scope>-<verb>` | Claude or Codex | full slice + Playwright |
| Foundation | `foundation/<id>` | Claude or Codex | infra used by other branches; ships before its consumers |

---

## Universal Action Window contract (all tabs, all apps)

Every selectable item — anywhere in the GUI — emits a payload of this shape and the **single shared center panel** (where Prusa/Orca cards render today) renders it:

```ts
{
  tab_id: string,
  kind: "app" | "job" | "printer" | "agent" | "artifact" | "approval" | "voice" | "plugin" | "setting" | "model" | "topic",
  item_id: string,
  title: string,
  subtitle?: string,
  status_pill?: { text: string, tone: "ok" | "warn" | "err" | "info" },
  primary_actions: { id: string, label: string, endpoint?: string, method?: "GET"|"POST", confirm?: string }[],
  secondary_actions?: { id: string, label: string, endpoint?: string }[],
  panels: { id: string, label: string, body_html?: string, body_url?: string }[],
  stream_url?: string  // SSE for live logs / progress
}
```

Foundation branch `foundation/action-window` lands this contract. All later tab/app branches consume it.

---

## Lane summary (4 agents)

| Agent | Lane focus | Branch count target | Coordination |
|---|---|---|---|
| **Claude** | UI shell, Action Window foundation, 8 UI-flow tabs, 4 heavy-build apps | ~14 branches | `CLAUDE_LANES.md` |
| **Codex** | 7 backend-heavy tabs + Source OS panel, 6 critical clone/binary apps | ~14 branches | `CODEX_LANES.md` |
| **Kilocode** (20 agents in parallel) | 20 pip-installable apps, one per agent | 20 branches | `KILOCODE_PROMPT.md` |
| **Windsurf** (fast SWE 1.6) | Small buttons, settings, options, filters, refresh chips | 25-40 branches | `WINDSURF_PROMPT.md` |

**Race rule:** if two agents pick up the same `app/<id>` or `tab/<id>`, the second-claimer sees the HermesProof lock and picks the next un-claimed item. Claim before you code.

---

## Tab catalogue (15 tabs + Source OS panel)

| Tab id | Page id | Owner |
|---|---|---|
| Dashboard | `dashboard` | Claude |
| Autopilot | `setup` | Claude |
| Design | `design` | Claude |
| 3D Generation | `generation` | Codex |
| Jobs | `jobs` | Claude |
| Printers | `printers` | Codex |
| Observe | `observe` | Codex |
| Voice | `voice` | Codex |
| Agents | `agents` | Codex |
| Learning | `learning` | Claude |
| Artifacts | `artifacts` | Claude |
| Approvals | `approvals` | Claude |
| Plugins | `plugins` | Codex |
| Settings | `settings` | Codex |
| Roadmap | `roadmap` | Claude |
| (panel) Source OS | `#sourceOs` | Codex |

---

## App catalogue → install method → owner

Install methods: `pip` (PyPI install), `clone-shallow` (git clone for source viewing), `clone-full` (git clone + build), `npm-build` (Node build), `binary-download` (release artifact).

### pip — Kilocode (20 parallel slots)

| Slot | App id | Group | Package | Launcher type |
|---|---|---|---|---|
| 1 | `trimesh` | modelers | `trimesh` | Python module probe |
| 2 | `manifold` | modelers | `manifold3d` | Python module probe |
| 3 | `cadquery` | modelers | `cadquery` | Python module probe + GUI cmd `cq-editor` |
| 4 | `build123d` | modelers | `build123d` | Python module probe |
| 5 | `printrun` | print_farm | `printrun` | CLI launcher `pronterface` |
| 6 | `mainsail` | print_farm | (npm-build alt → handle as Codex) | — |
| 7 | `fluidd` | print_farm | (npm-build alt → handle as Codex) | — |
| 8 | `comfyui-frontend` | generation | `comfyui-frontend-package` | module probe |
| 9 | `triposr` | generation | clone+pip-install requirements | module probe |
| 10 | `langchain` | orchestration | `langchain` | module probe |
| 11 | `langgraph` | orchestration | `langgraph` | module probe |
| 12 | `model-context-protocol` | orchestration | `mcp` | module probe |
| 13 | `kiln` | orchestration | `kiln-ai` | module probe |
| 14 | `azure-speech-sdk-js` | orchestration | (npm — handle as Windsurf) | — |
| 15 | `manyfold` | libraries | `manyfold` (if PyPI) else clone | module probe |
| 16 | `box-stl-generator` | utilities | clone+pip from repo | CLI |
| 17 | `solvespace` | modelers | binary-download (handle as Codex) | — |
| 18 | `truck` | modelers | clone+cargo (Rust — handle as Codex) | — |
| 19 | `klipperscreen` | print_farm | clone+pip | service launcher |
| 20 | `botqueue` | print_farm | clone+pip | service launcher |

Slots that turn out to be non-pip get reassigned to Codex; Kilocode picks the next available slot.

### clone-full / binary-download — Codex (6 hot apps)

| App id | Group | Method | Launcher |
|---|---|---|---|
| `prusaslicer` | slicers | binary-download (release ZIP) | exec `prusa-slicer.exe` |
| `orcaslicer` | slicers | binary-download | exec |
| `comfyui` | generation | clone-full + Python venv + `main.py` | service `:8188` |
| `octoprint` | print_farm | pip + service | service `:5000` |
| `klipper` | print_farm + firmware | clone-shallow (source viewer; firmware not flashed by us) | static viewer |
| `moonraker` | print_farm | clone-full + Python venv | service `:7125` |

### heavy-build — Claude (4 desktop apps)

| App id | Group | Method | Launcher |
|---|---|---|---|
| `blender` | modelers | binary-download (LTS) | exec |
| `freecad` | modelers | binary-download | exec |
| `openscad` | modelers | binary-download | exec |
| `cura` | slicers | binary-download | exec |

### npm-build — Windsurf or Codex (assigned in agent prompts)

`mainsail`, `fluidd`, `azure-speech-sdk-js`, `comfyui-frontend` (pure-JS bits).

### reference-only (clone-shallow source-viewer, no launcher)

`slic3r`, `bambustudio`, `mattercontrol`, `kiri-moto`, `strecs3d`, `flsun-slicer`, `superslicer`, `curaengine`, `meshlab`, `marlin`, `prusa-firmware`, `reprapfirmware`, `smoothieware`, `repetier-firmware`, `boxturtle`, `enraged-rabbit`, `awesome-extruders`, `open-filament-database`, `awesome-3d-printing`, `hunyuan3d21`, `trellis2`, `comfyui-trellis2`, `octofarm`, `fdm-monster`. Each is one tiny branch (`app/<id>`) that lands a clone-shallow + Action Window source-viewer card. Distributed to Windsurf as filler work.

---

## HermesProof task naming

Per-branch task id (claim-before-you-code, mandatory):

```
HP3D-<TYPE>-<ID>-2026-05-03
```

Examples:
- `HP3D-APP-TRIMESH-2026-05-03`
- `HP3D-TAB-DASHBOARD-2026-05-03`
- `HP3D-BTN-DASHBOARD-REFRESH-2026-05-03`
- `HP3D-SETTING-FONTSCALE-2026-05-03`
- `HP3D-FOUNDATION-ACTION-WINDOW-2026-05-03`

Required PR body fields (mechanical-review-check):
- `Task ID: \`HP3D-...-2026-05-03\``
- `Hermes evidence chain: PASS`
- `hermes_run_gate` referenced
- HermesProof workspace points at `G:\Github\Hermes3D` (sibling) — file locks for `G:\Github\Hermes3D-OS` are advisory only; claim+evidence is the real coordination signal.

---

## Per-branch checklist (paste in PR description)

```markdown
## Definition of Done

- [ ] HermesProof task claimed: `HP3D-<...>-2026-05-03`
- [ ] Manifest / config updated (if applicable)
- [ ] Backend endpoint reachable + manual smoke
- [ ] Frontend rendered, click handler wired
- [ ] Action Window card renders the universal payload
- [ ] Launcher works (process spawns / window opens / service responds) OR documented N/A
- [ ] Playwright E2E spec landed under `tests/e2e/<branch-scope>.spec.ts` and passes
- [ ] HermesProof evidence appended (`hermes_append_evidence`)
- [ ] HermesProof gate run (`hermes_run_gate`) — output pasted below

## Hermes evidence chain: PASS
## Task ID: `HP3D-<...>-2026-05-03`
```

---

## File-level lock zones (avoid merge collisions)

Each agent locks only inside its zone. Foundations are exclusive — no other agent edits them while the foundation branch is open.

| Zone | Files | Owner during foundation |
|---|---|---|
| Action Window foundation | `apps/web/action-window.js`, `apps/web/index.html` (action-window slot only) | Claude |
| Install endpoint foundation | `apps/api/hermes3d_api/main.py` (`/api/source-apps/{id}/install` only) | Claude (lands first PR) |
| Universal manifest schema bump | `source-lab/source_manifest.json` (schema field only) | Claude |
| Per-app manifest entries | `source-lab/source_manifest.json` (one entry only) | per-branch owner |
| Per-tab content | `apps/web/<page>.js` + `apps/web/index.html` (one `<section data-page>` only) | per-branch owner |
| Per-button | one button + one handler in the owning page file | per-branch owner |

After foundations land, all four agents work in parallel without collisions.

---

## Sequence

1. **Foundation wave (Claude, sequential):**
   - `foundation/action-window` — Action Window contract + shared renderer
   - `foundation/install-endpoint` — `/api/source-apps/{id}/install` dispatch + install_status field + Install button shell
   - `foundation/playwright-harness` — Playwright config + smoke test harness

2. **Parallel wave (all 4 agents, simultaneous):**
   - Kilocode: 20 app branches in parallel
   - Codex: tabs + heavy apps + Source OS panel
   - Claude: 8 UI-flow tabs + 4 desktop apps
   - Windsurf: buttons + settings + reference-only app cards

3. **Convergence:** `develop` → `main` cut weekly when N branches merged green.

---

See per-agent docs for exact branch lists:
- [`CLAUDE_LANES.md`](./CLAUDE_LANES.md)
- [`CODEX_LANES.md`](./CODEX_LANES.md)
- [`KILOCODE_PROMPT.md`](./KILOCODE_PROMPT.md)
- [`WINDSURF_PROMPT.md`](./WINDSURF_PROMPT.md)
