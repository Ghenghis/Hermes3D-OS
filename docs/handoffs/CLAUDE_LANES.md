# Claude Lanes — Hermes3D-OS
**Reads:** `SPLIT_PLAN.md` (operating principle, DoD, HermesProof contract)

---

## Phase 1 — Foundations (sequential, Claude only)

These three branches land before parallel work starts. No other agent edits these files until the PRs merge to `develop`.

### `foundation/action-window` — `HP3D-FOUNDATION-ACTION-WINDOW-2026-05-03`

- New file `apps/web/action-window.js` exporting `renderActionWindow(payload)` that takes the universal payload (see `SPLIT_PLAN.md`) and renders into `#actionWindow` in `apps/web/index.html`.
- Replace the Prusa/Orca card-rendering block with a single `#actionWindow` slot that delegates to `renderActionWindow`.
- Wire a global event bus: clicking any selectable item anywhere emits `actionwindow:render` with the payload.
- Playwright spec: clicks one item per pre-existing tab, asserts Action Window renders the title.

### `foundation/install-endpoint` — `HP3D-FOUNDATION-INSTALL-ENDPOINT-2026-05-03`

- `apps/api/hermes3d_api/main.py`: add `POST /api/source-apps/{app_id}/install` with method dispatch (`pip`, `clone-shallow`, `clone-full`, `npm-build`, `binary-download`).
- Add `install_status` to the existing `/api/source-apps/status` payload (`not_installed | installing | installed | failed`).
- Bump manifest schema: add optional `install: { method, package?, repo?, build_cmd?, binary_url? }` field.
- Add `<button id="sourceInstallApp">Install</button>` to `apps/web/index.html` source-actions block; wire in `apps/web/source-os.js` to POST and refresh status.
- Playwright spec: trimesh card → Install → status flips to `installed`.

### `foundation/playwright-harness` — `HP3D-FOUNDATION-PLAYWRIGHT-2026-05-03`

- Install Playwright (npm-only, free), add `playwright.config.ts`, `tests/e2e/smoke.spec.ts`.
- npm script `test:e2e` boots the API + serves `apps/web/`, runs Playwright headless, captures screenshots on failure.
- CI workflow `.github/workflows/e2e.yml` runs `test:e2e` on PRs touching `apps/**`.

---

## Phase 2 — Tabs (8 of 15)

Each tab branch wires the tab to the universal Action Window contract. Branch DoD requires the Playwright spec to drive the tab end-to-end.

| Branch | Task ID | Page id | Selectable items | Endpoint |
|---|---|---|---|---|
| `tab/dashboard` | `HP3D-TAB-DASHBOARD-2026-05-03` | `dashboard` | active jobs, printers, alerts, KPIs | `/api/dashboard/summary` |
| `tab/autopilot` | `HP3D-TAB-AUTOPILOT-2026-05-03` | `setup` | autopilot steps, dependency rows | `/api/autopilot/state`, `/api/autopilot/run/{step}` |
| `tab/design` | `HP3D-TAB-DESIGN-2026-05-03` | `design` | design files, prompts, recent renders | `/api/design/list`, `/api/design/{id}` |
| `tab/jobs` | `HP3D-TAB-JOBS-2026-05-03` | `jobs` | print jobs, filters | `/api/jobs/list`, `/api/jobs/{id}` |
| `tab/learning` | `HP3D-TAB-LEARNING-2026-05-03` | `learning` | research topics, papers, models | `/api/learning/topics`, `/api/learning/topic/{id}` |
| `tab/artifacts` | `HP3D-TAB-ARTIFACTS-2026-05-03` | `artifacts` | g-code, stl, screenshots, evidence files | `/api/artifacts/list` |
| `tab/approvals` | `HP3D-TAB-APPROVALS-2026-05-03` | `approvals` | approval requests, gate verdicts | `/api/approvals/pending`, `/api/approvals/{id}/verdict` |
| `tab/roadmap` | `HP3D-TAB-ROADMAP-2026-05-03` | `roadmap` | roadmap items, milestones | `/api/roadmap/items` |

Each tab branch DoD:
- Page section in `index.html` populated with real data from endpoint
- Click any row → emits `actionwindow:render` payload → center panel shows it
- Per-tab Playwright spec covers: load tab → row count > 0 → click first row → Action Window renders title

---

## Phase 3 — Heavy desktop apps (4)

These are large native binaries, downloaded once, launched as OS processes.

| Branch | Task ID | App | Method | Launcher |
|---|---|---|---|---|
| `app/blender` | `HP3D-APP-BLENDER-2026-05-03` | Blender | `binary-download` (LTS .zip / .msi) | `subprocess.Popen([blender_path, "--background", "--version"])` smoke + foreground exec for user |
| `app/freecad` | `HP3D-APP-FREECAD-2026-05-03` | FreeCAD | binary-download | exec |
| `app/openscad` | `HP3D-APP-OPENSCAD-2026-05-03` | OpenSCAD | binary-download | exec, `--version` smoke |
| `app/cura` | `HP3D-APP-CURA-2026-05-03` | UltiMaker Cura | binary-download | exec |

Each app branch DoD:
- Manifest entry gets `install: { method: "binary-download", binary_url: "...", binary_target: "<vendored-path>" }`
- Backend dispatcher: stream download progress over SSE
- Action Window for the app shows: install progress bar, Open Binary, Open Vendor Page, Launch (post-install)
- Launcher: `subprocess.Popen` with `creationflags=DETACHED_PROCESS` on Windows
- Playwright: install → wait status `installed` → click Launch → assert `/api/source-apps/<id>/process-state` returns `running`

---

## Phase 4 — Reference-only Hermes3D-OS owned (assigned later)

If Windsurf saturates, Claude picks up: `hunyuan3d21`, `trellis2`, `comfyui-trellis2`. (These are research artifacts — clone-shallow + Action Window source-viewer + readme renderer.)

---

## Coordination protocol

For every branch:

```
1. hermes_claim_task("HP3D-<...>-2026-05-03")
2. hermes_lock_files([list of files this branch will edit])  # advisory; HP workspace ≠ this repo, so non-fatal
3. work
4. hermes_append_evidence(task_id, "branch=<name>", "tests=<spec path>")
5. hermes_run_gate(task_id, "tests.unit" | "tests.e2e")
6. open PR with required body fields
7. hermes_release_files()
8. on merge: hermes_release_task(task_id, "merged")
```

---

## Estimated count: ~14 Claude branches (3 foundation + 8 tabs + 4 apps).
