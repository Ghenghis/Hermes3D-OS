# Codex — Your Half of the GUI (8 of 16 Tabs)

**Repo:** `G:\Github\Hermes3D-OS` (NOT `Hermes3D` — sibling).
**Branch:** off `develop`. Pull `feat/h3dos-fontscale-and-popover` first (Claude's font system + ⚙ Text popover).
**Companions:** `docs/handoffs/CODEX_NOW.md` (Action Window pattern), `docs/handoffs/CODEX_PROMPT_30APP_INSTALL.md` (full 30-app split).

---

## The split — half the tabs each

The GUI has 16 tabs. You own the 8 that need real backend wiring to external systems / hardware / ML / source code. Claude owns the 8 that are UI-flow + render-heavy. **The Action Window pattern is universal across both halves** — every selectable item on every tab renders in the same Action Window region.

| | Codex's 8 tabs | Claude's 8 tabs |
|--|--|--|
| 1 | **Source OS** | Dashboard |
| 2 | **3D Generation** | Autopilot |
| 3 | **Printers** | Design |
| 4 | **Observe** | Jobs |
| 5 | **Voice** | Learning |
| 6 | **Agents** | Artifacts |
| 7 | **Plugins** | Approvals |
| 8 | **Settings** | Roadmap |

Why this split: your tabs are the ones where the Action Window has to talk to a real backend (subprocess, HTTP to Moonraker, ML inference, plugin sandbox, hardware config). Claude's tabs are mostly read-render-mutate flows over data your tabs already produce.

---

## What each of YOUR 8 tabs needs to do

### 1. Source OS (your most important tab — the install machinery lives here)
- Left rail: 11 categories × ~5 apps each = **55 modules total** (already scaffolded)
- Action Window per app: Install / Open / Update / Remove buttons, live status, version, repo SHA
- Backend: `/api/source_os/{install,update,remove,launch,modules/{id}}` per the contract in `CODEX_PROMPT_30APP_INSTALL.md`
- Wave 1–4 install plan: 16 heavy apps to install (Blender, FreeCAD, OpenSCAD, Cura, CuraEngine, SuperSlicer, Slic3r, BambuStudio, MatterControl, Klipper, Marlin, ComfyUI, Hunyuan3D, TripoSR, TRELLIS.2, KlipperScreen)
- Playwright spec per install

### 2. 3D Generation
- Left rail: pipelines (Single shot, Multi-view → mesh, Image → 3D, Text → 3D, Refinement, Export)
- Action Window per pipeline: model picker (ComfyUI / Hunyuan3D / TripoSR / TRELLIS.2 — all your installs), input upload, GPU detection, run-history, output preview, export-as-STL
- Backend: `/api/generation/{pipelines,run,jobs/{id},output/{id}}`
- Stream progress over SSE during generation

### 3. Printers
- Left rail: discovered + configured printers (live from Moonraker / OctoPrint network probes)
- Action Window per printer: connection status, current job, temperatures, axes, **camera feed embed**, deep-link to Mainsail/Fluidd web UI, **Emergency Stop button (real one, calls Moonraker `/printer/emergency_stop`)**, cancel current job
- Backend: `/api/printers/{list,detail/{id},estop/{id},cancel/{id},camera/{id}}`
- Real-time updates over SSE / WebSocket

### 4. Observe
- Left rail: cameras + event sources (printer cameras, OS audit log, gate failures, evidence appends)
- Action Window per source: live MJPEG feed for cameras, scrolling event log for everything else, anomaly highlights, snapshot button
- Backend: `/api/observe/{cameras,events,snapshot/{cam_id}}` + WebSocket for live event stream

### 5. Voice
- Left rail: voice profiles + recent commands
- Action Window per command: transcript, intent classification, action taken, replay button
- Backend: `/api/voice/{commands,replay/{id},profiles}` — wires to Whisper or local STT (mark which one)
- The voice settings already exist in `apps/web/voice-settings.css` — extend, don't replace

### 6. Agents
- Left rail: registered agents (Claude, Codex, Hermes Agent, ComfyUI workers, etc.)
- Action Window per agent: identity, active session, scope, recent tool calls, evidence trail link, revoke session button
- Backend: `/api/agents/{list,detail/{id},revoke/{session_id}}` — direct hookup to HermesProof's anonymous orchestrator + USER session model
- This is where Hermes3D-OS finally **uses** HermesProof properly (today's hardening work pays off)

### 7. Plugins
- Left rail: discovered plugins + plugin marketplace
- Action Window per plugin: manifest, permissions requested, sandbox status, enable/disable toggle, settings panel
- Backend: `/api/plugins/{list,enable/{id},disable/{id},config/{id}}`
- Plugins are 3rd-party MCP servers + Python entry-point packages — discover both

### 8. Settings
- Left rail: setting groups (Hardware, Network, Storage, Hermes Agent, Provider Registry, MCP, Voice, Logging, Theme)
- Action Window per group: form-driven editor with validation, "Apply" / "Revert" buttons, schema-driven from `policies/` YAML
- Backend: `/api/settings/{groups,get/{id},set/{id}}` + JSON Schema validation
- The ⚙ Text popover Claude shipped is OUTSIDE Settings — that's a topbar quick access. Settings is the deep config store.

---

## Universal contract every tab must hit

Every left-sidebar click in any of your 8 tabs:
1. Calls `setSelection({ tabId, itemId, kind })` (Claude's shared Action Window plumbing)
2. The Action Window fetches `GET /api/action-window/{tabId}/{kind}/{itemId}` from your backend
3. The response payload shape is per-tab but always includes:
   ```json
   {
     "tab_id": "printers",
     "kind": "printer",
     "item_id": "voron-2.4-A",
     "title": "Voron 2.4 (A)",
     "subtitle": "Klipper · Moonraker",
     "status_pill": { "label": "printing", "color": "amber" },
     "primary_actions": [ { "id": "estop", "label": "Emergency Stop", "kind": "danger" }, ... ],
     "secondary_actions": [ ... ],
     "panels": [ { "id": "telemetry", "kind": "kv-grid", "data": {...} }, ... ],
     "stream_url": "/api/printers/stream/voron-2.4-A"   // optional SSE for live updates
   }
   ```
4. Claude's renderer takes that payload and draws it consistently across all 16 tabs

You author the data shape per-tab; Claude renders it. As long as you stick to the envelope above, no UI work crosses lanes.

---

## HermesProof coordination — required for every PR

```python
hermes_claim_task(owner="codex-tabs", taskId="HP3D-TAB-<TAB_ID>-<FEATURE>", title=...)
hermes_lock_files(owner="codex-tabs", files=[...])
# work
hermes_run_gate(owner="codex-tabs", gateId="git-status")
hermes_append_evidence(owner="codex-tabs", taskId="...", kind="tab_feature_complete",
  summary="<Tab> · <Feature> shipped; backend at <route>; tests <count>",
  data={"tab_id": "...", "feature": "...", "routes": [...], "tests": [...]})
hermes_release_files(...)
hermes_release_task(...)
```

PR body MUST contain:
- `Task ID: HP3D-TAB-<TAB_ID>-<FEATURE>-2026-05-03`
- `Hermes evidence chain: PASS`
- `hermes_run_gate(gateId="git-status")` reference + run id
- An "Action Window verification" block: paste the JSON response shape from the new endpoint

---

## Sequencing — what to ship first

**Order maximizes user-visible value per hour:**

1. **Source OS Wave 1** (today) — 6 binary-download apps: Blender, FreeCAD, OpenSCAD, SuperSlicer, Slic3r, BambuStudio. Each lands a working **Open** button. Visible win in 3 hours.
2. **Printers tab basics** — connect Moonraker discovery, live status, e-stop button. Highest safety value. Half a day.
3. **Source OS Wave 2** — 2 firmware clones (Klipper, Marlin) + KlipperScreen pip install. Feeds the Printers tab.
4. **Settings tab** — schema-driven editor for Hardware + MCP groups. Unblocks operator config flows.
5. **Source OS Wave 3** — CuraEngine build + Cura binary + MatterControl. Heavier compile work.
6. **3D Generation tab basics** — ComfyUI install + run a single workflow (no weights, demo nodes only).
7. **Observe tab** — camera feed + event log. Essential for unattended printing.
8. **Source OS Wave 4** — ML repos (Hunyuan3D, TripoSR, TRELLIS.2) without weights. Mark weights as optional.
9. **Voice + Agents + Plugins tabs** — these depend on existing Whisper/MCP/plugin scaffolds; lighter than the install work.

Each wave = 1 PR per app/feature. Standing-merge auto-merges green PRs. Cascade pattern hits — pull-rebase before push.

---

## Lane fence with Claude

You **don't touch**:
- `apps/web/action-window.js` (Claude's universal renderer — once it exists)
- Claude's 8 tabs (Dashboard / Autopilot / Design / Jobs / Learning / Artifacts / Approvals / Roadmap)
- The font scale tokens (`--font-scale`, `--font-family-ui`)
- Playwright specs Claude is writing for HER tabs

You **own**:
- All backend routes for your 8 tabs
- All install machinery (`scripts/install_source_os.py`, `vendor/`, `policies/source-os/registry.yaml`)
- Per-tab data payloads in the universal envelope shape
- Playwright specs for YOUR tabs and your installs

Shared files (lock before editing):
- `apps/web/source-os.js` — module data + selection wiring
- `apps/api/hermes3d_api/main.py` — both add routes; lock the file or use a sub-router file pattern
- `policies/` directory — register modules / schema / settings groups

---

## Done definition for the whole wave

- Every left-sidebar click in your 8 tabs produces a correctly-rendered Action Window
- All 16 of your apps from `CODEX_PROMPT_30APP_INSTALL.md` reach `installed` or `launchable`
- 16 Playwright specs pass (one per installed app)
- HermesProof evidence chain shows one entry per install + one per tab feature
- README claims (tool count, gate count, source-module count) match reality

Ping back per PR. Standing by.
