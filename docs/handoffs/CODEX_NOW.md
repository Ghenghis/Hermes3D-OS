# Codex — Start Here Now

**Repo:** `G:\Github\Hermes3D-OS` (NOT `Hermes3D` — sibling).
**Branch:** off `develop`. Pull `feat/h3dos-fontscale-and-popover` first (Claude's font system + ⚙ Text popover landed there).
**Companion:** `docs/handoffs/CODEX_PROMPT_30APP_INSTALL.md` (full 30-app split, Action Window contract, sequencing).

---

## The ONE big idea — Action Window is universal

The center detail panel — the spot where PrusaSlicer/OrcaSlicer cards currently render in the Source OS tab — is the **Action Window**. It is **the** canvas. Every selectable item in **every tab** renders here:

| Tab | What gets clicked on left/sidebar | What renders in the Action Window |
|-----|-----------------------------------|------------------------------------|
| Source OS | An app card (PrusaSlicer, Blender, Moonraker…) | Repo · Local · Executable · Checkout Mode · Native UI status · Install/Open buttons · workflow strip · Profile Contract / Compiler Proof / Dispatch Guard |
| Dashboard | A timeline row / KPI card | The drill-in for that row (related jobs, history, evidence) |
| Autopilot | A profile / preset | Profile detail + edit + activate |
| Design | A model / source CAD asset | Asset preview + lineage + open-in-CAD button |
| 3D Generation | A pipeline / model entry | Generation detail + run-history + outputs |
| Jobs | A job | Job detail (parameters, gcode preview, printer, progress) |
| Printers | A printer | Printer detail (Moonraker/OctoPrint deep-link, status, e-stop, camera) |
| Observe | A camera / event | Live feed + event log |
| Voice | A voice command | Command detail + replay |
| Agents | An agent / module | Agent config + last activity |
| Learning | A lesson / report | Report detail + steps |
| Artifacts | An artifact | Artifact detail + verify chain |
| Approvals | An approval request | Request detail + approve/decline |
| Plugins | A plugin | Plugin detail + enable/disable |
| Settings | A setting group | Group editor |
| Roadmap | A roadmap card | Card detail + linked PRs |

**One UI shape, sixteen pages.** When the user clicks anything anywhere, the Action Window updates. Every action button (Install, Open, Run, Approve, Cancel, etc.) lives in the Action Window — not scattered across pages.

---

## Your immediate next 3 PRs

### 1. Universal selection → Action Window plumbing (FIRST — unblocks everything else)

`apps/web/source-os.js` already does this for Source OS. Lift the pattern into a **shared module** so every tab can use it.

- New: `apps/web/action-window.js` — exports `setSelection({ tabId, itemId, kind })`, renders into `#actionWindow` (a single shared `<section>` element)
- Each tab's left-sidebar onclick handler calls `setSelection(...)` instead of doing its own panel render
- The Action Window asks the backend `GET /api/action-window/{tabId}/{kind}/{itemId}` for the canonical detail payload
- One renderer per `kind` (slicer, modeler, printer, job, etc.) inside `action-window.js`; each renderer just receives the payload + emits HTML

Acceptance: clicking a Slicer card, then a Printer card, then a Job, then a 3D Generation model card — all four render correctly in the same Action Window region with no page jumps.

### 2. Install + Open buttons live in the Action Window

For Source OS specifically (your 30-app wave), the Action Window for any app card must show:
- **Install** button — disabled if `install_status === "installed"` or `"launchable"`
- **Open** button — disabled unless `install_status === "launchable"` and `binary_path` exists
- **Update** button — clones latest, re-installs if SHA changed
- **Remove** button — confirm + delete from `vendor/`
- Live status row: `checkout_mode · install_status · version · last_install_utc` (server-streamed)

Endpoints to add (Action Window contract from `CODEX_PROMPT_30APP_INSTALL.md`):
- `POST /api/source_os/install` — kicks off install in background, returns SSE stream URL
- `GET /api/source_os/install/{task_id}/events` — SSE progress
- `GET /api/source_os/modules/{app_id}` — full module state
- `POST /api/source_os/launch` — spawn native app
- `POST /api/source_os/update` — re-clone + re-install
- `POST /api/source_os/remove` — uninstall

### 3. First batch of real installs (Wave 1 — fastest)

Apps that are pure binary download (no compile, no ML weights):
- **Blender** — download `blender.zip` from blender.org, extract to `vendor/blender/`, detect `blender.exe` / `blender`
- **OpenSCAD** — same pattern
- **FreeCAD** — same pattern
- **SuperSlicer** — GitHub Releases binary
- **Slic3r** — GitHub Releases binary
- **BambuStudio** — installer from BambuLab releases

Six apps × ~30 minutes each = ~3 hours of work. After this lands the user can click any of those six in the Action Window and see `launchable` status with a working **Open** button.

---

## HermesProof coordination — REQUIRED

Before every install:
```python
hermes_claim_task(owner="codex-install", taskId="HP3D-INSTALL-<app_id>", title=...)
hermes_lock_files(owner="codex-install", files=[<files you'll touch>])
# do install
hermes_run_gate(owner="codex-install", gateId="git-status")
hermes_append_evidence(owner="codex-install", taskId="...", kind="install_complete",
  summary="<App> installed; binary at <path>; --version: <line>",
  data={"app_id": "...", "sha": "...", "binary_path": "...", "version": "..."})
hermes_release_files(...)
hermes_release_task(...)
```

Check `hermes_get_state` before editing `apps/web/source-os.js` or `apps/api/hermes3d_api/main.py` — Claude may be holding a lock on either.

PR body MUST contain:
- `Task ID: HP3D-INSTALL-<APP_ID>-2026-05-03`
- `Hermes evidence chain: PASS`
- `hermes_run_gate(gateId="git-status")` reference with run id

---

## Test contract — Playwright per install

Every installed app gets `apps/web/tests/install-<app_id>.spec.ts`:
1. Navigate to `http://127.0.0.1:18081/#sources`
2. Click the left-sidebar app card
3. Assert Action Window shows the app's name + repo URL
4. Assert Install button visible if not installed
5. Click Install → poll `install_status` until `installed`/`launchable`
6. Assert version string present
7. Assert binary_path file exists

---

## Lane split with Claude (file-level, no overlap)

**Codex (you):** all backend install machinery + the 16 heavy-app installs (binaries, ML repos). See `CODEX_PROMPT_30APP_INSTALL.md` for the full 16-app list.

**Claude:** Action Window UI plumbing + 14 light installs (pip / npm / clone-only) + Playwright specs.

Shared files where coordination matters:
- `apps/web/source-os.js` — Codex updates module data; Claude updates UI rendering. Lock before editing.
- `apps/api/hermes3d_api/main.py` — Codex adds install routes; Claude adds Action Window helpers. Lock before editing.
- `apps/web/styles.css` — both can touch; Claude has font tokens at `--font-scale` / `--font-family-ui`. Don't override them.

---

## Definition of done for this wave

- All 30 apps reach `install_status: installed` or `launchable`
- Action Window renders every left-sidebar click across every tab
- Every Codex-installed app has a passing Playwright spec
- `hermes_verify_evidence` shows clean chain with one entry per install
- README's source module count reflects actual install percentage

Standing by. Ping back when each install PR is open.
