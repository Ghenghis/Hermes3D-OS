# Codex Prompt — Hermes3D-OS 30-App Install Wave (with Action Window + Playwright)

**Repo:** `G:\Github\Hermes3D-OS` (NOT `Hermes3D` — that's the design-spec sibling).
**Branch base:** `develop` (Codex's most recent merged work) — branch off as `codex/install-wave-N-...` per app group.
**Prereqs read first:**
- `apps/web/source-os.js` — current Source OS UI logic, where Codex's wiring landed
- `apps/api/hermes3d_api/main.py` — FastAPI bridge serving the Source OS endpoints
- `policies/` (if it exists) or wherever the source registry lives — module list with repo URLs, license, designation
- `apps/web/index.html`, `apps/web/styles.css`, `apps/web/app.js` — note the new gear popover at `feat/h3dos-fontscale-and-popover` (Claude's branch — pull-merge before you start)

---

## TL;DR for Codex

You already linked the source repos and got **3 of 11 slicers to "full" working tree** (PrusaSlicer / OrcaSlicer / FLSUN), 2 of those launchable. The rest are **sparse placeholders** — clone-shells without real install. **The user needs them ACTUALLY installed** (full clone + build/binary + executable detection + run-probe) so Playwright can drive every "Install / Open / Launch" button on every left-sidebar app.

This wave covers **30 apps total**, split between you (16) and Claude (14). You take the heavy installs (compiled binaries, ML repos, build chains). Claude takes pip-install lightweight work + the Action Window UI plumbing + Playwright specs.

**Both agents use HermesProof for coordination** — claim task, append evidence, check `hermes_get_state` before stepping into a file the other might be editing. File-level lanes don't overlap.

---

## 1. HermesProof coordination — required for every PR

Before editing:
```python
hermes_claim_task(owner="codex-install", taskId="HP3D-INSTALL-<APP_ID>", title="Install <App>", reason="...")
hermes_lock_files(owner="codex-install", files=[<every file you'll touch>])
# work...
hermes_run_gate(owner="codex-install", gateId="git-status")
hermes_append_evidence(owner="codex-install", taskId="...", kind="install_complete",
  summary="<App> at SHA <X>, binary at <path>, --version: <line>", data={...})
hermes_release_files(...)
hermes_release_task(...)
```

PR body MUST contain:
- `Task ID: HP3D-INSTALL-<APP_ID>-2026-05-03`
- `Hermes evidence chain: PASS` (run `hermes_verify_evidence`)
- A `hermes_run_gate(gateId=git-status)` reference with run id
- An "Install verification" block: exact CLI command + expected output line proving the binary works

Standing-merge auto-merges green PRs.

---

## 2. The 30 apps — your 16 + Claude's 14

Status legend:
- **sparse** — repo linked, sparse checkout only. Need to convert to **full**.
- **full** — full working tree on disk.
- **installed** — full + post-install run (build / pip / npm / extract) succeeded.
- **launchable** — binary detected on PATH or local install dir; --version returns expected.

Goal for THIS wave: every app reaches **launchable** OR **installed** (where "launchable" means GUI executable, "installed" means importable Python lib / runnable web app).

### CODEX OWNS (16) — heavy installs, binaries, ML

| # | App | Cat | License | Method | Verify |
|---|-----|-----|---------|--------|--------|
| 1 | **UltiMaker Cura** | Slicers | LGPL-3.0 | Binary download (AppImage Linux / installer .exe Windows) → place in `vendor/cura/` → detect `cura.exe`/`UltiMaker-Cura.AppImage` | `cura --version` |
| 2 | **CuraEngine** | Slicers | AGPL-3.0 | Promote sparse→full clone, build via `cmake -S . -B build && cmake --build build` | `vendor/CuraEngine/build/CuraEngine help` |
| 3 | **SuperSlicer** | Slicers | AGPL-3.0 | Binary release download (GitHub Releases) → extract → detect `superslicer.exe` | `superslicer --version` |
| 4 | **Slic3r** | Slicers | AGPL-3.0 | Binary release download → detect | `slic3r --version` |
| 5 | **BambuStudio** | Slicers | AGPL-3.0 | Binary installer download → detect `bambu-studio.exe` | `bambu-studio --version` |
| 6 | **MatterControl** | Slicers | reference (AGPL-3.0) | Binary release; if not feasible cleanly mark as "source only" + reference | doc gap if so |
| 7 | **Blender** | Modelers | GPL-3.0-or-later | Binary download from blender.org → place in `vendor/blender/` → detect | `blender --version` (returns `Blender 4.x.x`) |
| 8 | **FreeCAD** | Modelers | LGPL-2.0-or-later | Binary download (AppImage / installer) → detect | `FreeCAD --version` (or `freecadcmd`) |
| 9 | **OpenSCAD** | Modelers | GPL-2.0-or-later | Binary download → detect | `openscad --version` |
| 10 | **Klipper** | Firmware | GPL-3.0 | Promote sparse→full clone (firmware source) → no build (per-printer) | repo at expected SHA, README detected |
| 11 | **Marlin** | Firmware | GPL-3.0 | Promote sparse→full clone → no build | same |
| 12 | **ComfyUI** | 3D Generation | GPL-3.0 | Full clone + `pip install -r requirements.txt` in `vendor/ComfyUI/.venv/` (isolated) → run `python main.py --quick-test` | `python -c "import comfy"` succeeds |
| 13 | **Hunyuan3D-2.1** | 3D Generation | Tencent community | Full clone; **mark weights as optional** (gate behind `--include-weights` flag because of GB-scale download); install Python deps | `python -c "import hunyuan3d"` succeeds (without weights load) |
| 14 | **TripoSR** | 3D Generation | MIT | Full clone + pip install; weights optional | `python -c "import tsr"` |
| 15 | **Microsoft TRELLIS.2** | 3D Generation | MIT | Full clone + pip install; weights optional + GPU detection | `python -c "import trellis"` |
| 16 | **KlipperScreen** | Print Farm | GPL-3.0 | Full clone + `pip install -r scripts/KlipperScreen-requirements.txt` | `python -m KlipperScreen --help` |

### CLAUDE OWNS (14) — pip installs + UI plumbing + Playwright

| # | App | Cat | License | Method |
|---|-----|-----|---------|--------|
| 17 | **CadQuery** | Modelers | Apache-2.0 | `pip install cadquery` (or full clone if pin-needed) |
| 18 | **build123d** | Modelers | Apache-2.0 | `pip install build123d` |
| 19 | **Trimesh** | Modelers/Truth Gate | MIT | `pip install trimesh` |
| 20 | **Manifold** | Modelers/Truth Gate | Apache-2.0 | `pip install manifold3d` |
| 21 | **MeshLab** | Modelers | GPL-3.0 | Binary download (reference) — detect, mark "source only" if unclean |
| 22 | **Moonraker** | Print Farm | GPL-3.0 | Full clone + pip install (already partially done by Codex earlier — verify state) |
| 23 | **OctoPrint** | Print Farm | AGPL-3.0 | Full clone + `pip install -e .` in venv |
| 24 | **Mainsail** | Print Farm | GPL-3.0 | Full clone + `npm install && npm run build`; serve `dist/` |
| 25 | **Fluidd** | Print Farm | GPL-3.0 | Full clone + `npm install && npm run build`; serve `dist/` |
| 26 | **Printrun/Pronterface** | Print Farm | GPL-3.0 | Full clone + `pip install -r requirements.txt` |
| 27 | **Prusa Firmware** | Firmware | GPL-3.0 | Full clone, no build (per-printer) |
| 28 | **RepRapFirmware** | Firmware | GPL-3.0 | Full clone, no build |
| 29 | **Smoothieware** | Firmware | GPL-3.0 | Full clone, no build |
| 30 | **Repetier Firmware** | Firmware | GPL-3.0 | Full clone, no build |

### Out of scope for this wave (defer)

- Hunyuan3D weights (GB-scale download — separate wave)
- TRELLIS.2 weights (same)
- BlenderMCP (per ADR-014 — REJECTed)
- BotQueue (license unknown — research first)

---

## 3. Action Window contract — Codex must respect Claude's API

The user names the center detail panel the **Action Window**. When a user clicks any left-sidebar app, the Action Window renders that app's install/launch/open state. Claude is plumbing the Action Window UI (Install button → progress → status panel → Open button). **You do not touch the Action Window UI** — but every install endpoint you build must conform to this contract:

### Endpoint contract (Codex provides, Claude consumes)

**`POST /api/source_os/install`**
```json
// request
{ "app_id": "cura", "force": false }
// response (immediate; install runs in background)
{ "ok": true, "task_id": "install-cura-1730204", "stream_url": "/api/source_os/install/install-cura-1730204/events" }
```

**`GET /api/source_os/install/{task_id}/events`** (Server-Sent Events stream)
```
event: progress
data: {"phase":"clone","pct":12,"msg":"Cloning UltiMaker/Cura..."}

event: progress
data: {"phase":"build","pct":68,"msg":"Compiling CuraEngine..."}

event: complete
data: {"ok":true,"binary_path":"vendor/cura/UltiMaker-Cura.AppImage","version":"5.6.0"}
```

**`GET /api/source_os/modules/{app_id}`**
```json
{
  "id": "cura",
  "category": "Slicers",
  "designation": "secondary",
  "license": "LGPL-3.0",
  "checkout_mode": "full",       // sparse | full
  "install_status": "installed", // not_installed | installing | installed | failed | launchable
  "binary_path": "vendor/cura/UltiMaker-Cura.AppImage",
  "version": "5.6.0",
  "last_install_utc": "2026-05-03T...",
  "install_log_tail": ["last 50 lines of stdout/stderr"]
}
```

**`POST /api/source_os/launch`**
```json
// request
{ "app_id": "prusaslicer" }
// response
{ "ok": true, "pid": 12345, "binary": "...", "started_utc": "..." }
```

If you change the contract, edit this prompt's contract block AND ping back. Otherwise Claude's UI silently breaks.

---

## 4. Playwright test contract — every install must be verifiable

For each app you install, also add **one Playwright test** that:
1. Opens `http://127.0.0.1:18081/#sources`
2. Clicks the left-sidebar app card
3. Asserts the Action Window renders `install_status: not_installed`
4. Clicks "Install"
5. Polls `install_status` until `installed` or `launchable`
6. Asserts version string matches `^[0-9]+\.[0-9]+`
7. Asserts binary_path exists

Test files live at `apps/web/tests/install-<app_id>.spec.ts`. Naming required so Claude's Action Window UI tests don't collide.

---

## 5. Sequencing

**Wave 1 (Codex parallel):** apps that are pure binary download (no compile) — fastest, lowest risk
- Blender, FreeCAD, OpenSCAD, BambuStudio, SuperSlicer, Slic3r → binary detect → 6 PRs

**Wave 2 (Codex parallel):** firmware clones (no build)
- Klipper, Marlin → 2 PRs

**Wave 3 (Codex sequential, heavier):** compiled / built apps
- CuraEngine (cmake build), Cura (binary or build), KlipperScreen (pip), MatterControl (research) → 4 PRs

**Wave 4 (Codex):** ML repos (no weights this wave)
- ComfyUI, TripoSR, TRELLIS.2, Hunyuan3D → 4 PRs

**Wave A (Claude parallel with Codex Wave 1):** pip installs + Action Window UI scaffolding
- Trimesh, Manifold, CadQuery, build123d, MeshLab → 5 PRs
- Action Window install/progress/launch UI (`source-os.js`) → 1 PR

**Wave B (Claude after Codex's contract is stable):** Print Farm + remaining firmware
- Moonraker, OctoPrint, Mainsail, Fluidd, Printrun, KlipperScreen → 6 PRs (pip + npm)
- Prusa, RepRap, Smoothieware, Repetier firmware clones → 4 PRs

**Wave C (Claude):** Playwright spec for every Codex-installed app
- 16 specs covering Codex's apps → 1-2 PRs

---

## 6. Coordination protocol when files overlap

Both agents touch:
- `apps/web/source-os.js` (Codex updates module data, Claude updates UI rendering)
- `apps/api/hermes3d_api/main.py` (Codex adds install routes, Claude adds Action Window helpers)

When you need to edit either:
1. Run `hermes_get_state` first
2. If the other agent holds an active lock on the file → call `hermes_request_handoff` OR pick a different lane and come back
3. If unlocked → `hermes_lock_files` BEFORE editing

Never force-push the other agent's branch.

---

## 7. Acceptance for this wave

The wave is "done" when:
- All 30 apps have `install_status: installed` or `launchable` per the manifest
- Every Codex-installed app has a passing Playwright spec
- The Action Window renders correct state for every left-sidebar click
- `hermes_verify_evidence` shows a clean chain with one entry per install
- README's "55 source modules" claim updates to reflect actual install percentage

Standing by — message back when each wave's PRs are open or if the contract needs revision.
