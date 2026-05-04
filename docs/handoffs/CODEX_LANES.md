# Codex Lanes — Hermes3D-OS
**Reads:** `SPLIT_PLAN.md` (operating principle, DoD, HermesProof contract)
**Foundations land first — wait for `foundation/action-window`, `foundation/install-endpoint`, `foundation/playwright-harness` to merge to `develop` before starting parallel work.**

---

## Phase 2 — Tabs (7 of 15 + Source OS panel)

Each tab branch wires the page section to the universal Action Window contract. Branch DoD requires the Playwright spec to drive the tab end-to-end.

| Branch | Task ID | Page id | Selectable items | Endpoint |
|---|---|---|---|---|
| `tab/generation` | `HP3D-TAB-GENERATION-2026-05-03` | `generation` | text→3D prompts, models (TRELLIS2, Hunyuan3D, TripoSR), recent generations | `/api/generation/models`, `/api/generation/jobs`, `/api/generation/run` |
| `tab/printers` | `HP3D-TAB-PRINTERS-2026-05-03` | `printers` | configured printers, discovery, status | `/api/printers/list`, `/api/printers/{id}/status`, `/api/printers/{id}/connect` |
| `tab/observe` | `HP3D-TAB-OBSERVE-2026-05-03` | `observe` | live cameras, telemetry streams, log tail | `/api/observe/cameras`, `/api/observe/telemetry`, SSE `/api/observe/stream/{printer_id}` |
| `tab/voice` | `HP3D-TAB-VOICE-2026-05-03` | `voice` | wake-word state, recognized commands log, mic devices | `/api/voice/state`, `/api/voice/commands`, `/api/voice/devices` |
| `tab/agents` | `HP3D-TAB-AGENTS-2026-05-03` | `agents` | configured agents, A2A tasks, agent health | `/api/agents/list`, `/api/agents/{id}/health`, `/api/agents/{id}/dispatch` |
| `tab/plugins` | `HP3D-TAB-PLUGINS-2026-05-03` | `plugins` | installed plugins, marketplace items | `/api/plugins/installed`, `/api/plugins/available` |
| `tab/settings` | `HP3D-TAB-SETTINGS-2026-05-03` | `settings` | runtime ports, theme, font, telemetry toggles | `/api/settings/get`, `/api/settings/set` |
| `panel/source-os` | `HP3D-PANEL-SOURCE-OS-2026-05-03` | `#sourceOs` (in-page) | every app card from manifest | `/api/source-apps/status` (already lives) |

Each tab branch DoD:
- Section in `index.html` populated with real data from endpoint
- Click any row → emits `actionwindow:render` payload → center Action Window renders it
- Per-tab Playwright spec covers: load tab → row count > 0 → click first row → Action Window renders title + at least one primary action button

---

## Phase 3 — Heavy backend apps (6)

| Branch | Task ID | App | Method | Launcher | Smoke |
|---|---|---|---|---|---|
| `app/prusaslicer` | `HP3D-APP-PRUSASLICER-2026-05-03` | PrusaSlicer | `binary-download` (release ZIP) | `subprocess.Popen([prusa_slicer_path, "--info"])` | exit 0 + version line on stdout |
| `app/orcaslicer` | `HP3D-APP-ORCASLICER-2026-05-03` | OrcaSlicer | binary-download | exec | `--version` |
| `app/comfyui` | `HP3D-APP-COMFYUI-2026-05-03` | ComfyUI | `clone-full` + venv + pip install + `python main.py --listen 127.0.0.1 --port 8188` | service launcher | HTTP `GET 127.0.0.1:8188/queue` returns 200 within 30s |
| `app/octoprint` | `HP3D-APP-OCTOPRINT-2026-05-03` | OctoPrint | `pip install OctoPrint` (in venv) + `octoprint serve --host 127.0.0.1 --port 5000` | service launcher | HTTP `GET /api/version` 200 |
| `app/klipper` | `HP3D-APP-KLIPPER-2026-05-03` | Klipper | `clone-shallow` (we don't flash firmware here; we expose source viewer + docs) | static viewer | repo cloned + README rendered |
| `app/moonraker` | `HP3D-APP-MOONRAKER-2026-05-03` | Moonraker | `clone-full` + venv + `scripts/install-moonraker.sh` Windows-equivalent (or pure-Python install) | service `:7125` | HTTP `GET /server/info` 200 |

Each app branch DoD:
- Manifest entry gets `install: {...}` block with method-specific keys
- Backend dispatcher streams progress over SSE
- Action Window card shows: install progress, Open Repo, Launch, View Logs
- For services: launcher uses `subprocess.Popen`, registers PID in `apps/api/hermes3d_api/process_state.py`, `/api/source-apps/{id}/process-state` returns `running` post-launch
- Playwright: install → status `installed` → Launch → process-state `running` → Stop → process-state `stopped`

---

## Phase 4 — npm-build apps (Codex if Windsurf doesn't claim first)

| Branch | App | Method |
|---|---|---|
| `app/mainsail` | Mainsail | `clone-full` + `npm ci` + `npm run build` + serve dist statically through API |
| `app/fluidd` | Fluidd | same pattern |

If Windsurf claims these first, skip.

---

## Coordination protocol

```
1. hermes_claim_task("HP3D-<...>-2026-05-03")
2. hermes_lock_files([files]) - advisory
3. work
4. hermes_append_evidence(task_id, ...)
5. hermes_run_gate(task_id, "tests.e2e")
6. open PR with required body fields:
   - Task ID: `HP3D-<...>-2026-05-03`
   - Hermes evidence chain: PASS
   - hermes_run_gate: <verdict>
7. on merge: hermes_release_task(task_id, "merged")
```

PR body **must** include the exact Definition-of-Done checklist from `SPLIT_PLAN.md` and tick every item.

---

## Estimated count: ~14 Codex branches (8 tabs incl Source OS panel + 6 backend apps).

Race rule: if a branch is claimed (HermesProof shows the task active), pick the next one. Don't double-claim.
