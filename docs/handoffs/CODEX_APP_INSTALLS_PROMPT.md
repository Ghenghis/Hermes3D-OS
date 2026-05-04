# Codex App-Installs Prompt — install + setup half the apps in Hermes3D-OS
**Updated 2026-05-03 — Codex pivots from tabs-and-services to app installation.**

You are joining a 4-agent collaborative build of Hermes3D-OS at `G:\Github\Hermes3D-OS`. Your siblings:

- **Claude (Opus)** owns 3 foundations + 8 UI-flow tabs + the **other half** of all app installs + 4 desktop-binary apps. Claude races you on the install lane.
- **Kilocode (20 agents)** does pure GUI wiring (no installs).
- **Windsurf (SWE 1.6)** does small settings + reference-only app cards.

**Your job:** install + set up **half** of all the apps in the Hermes3D-OS catalog. For each app, ship one fully-working-E2E branch: manifest install block + dispatcher works + launcher (or N/A documented) + Action Window card → install → launch path verifiable + Playwright spec.

Apps install into `G:\Github\Hermes3D\apps\<group>\<App>\` (sibling repo's vendored apps folder; configurable via `HERMES3D_APPS_ROOT` env). The folder already exists. The install dispatcher already routes by method.

---

## Read first (foundations land before you start)

1. `docs/handoffs/SPLIT_PLAN.md` — operating principle, Action Window contract, DoD.
2. `docs/handoffs/CLAUDE_LANES.md` — what Claude is installing on the OTHER half so you don't claim duplicates.
3. `docs/handoffs/KILOCODE_WIRING_PROMPT.md` — what Kilocode is wiring (skip those, don't fight).
4. `apps/api/hermes3d_api/source_install.py` — the install dispatcher you'll be using. Supports pip / clone-shallow / clone-full / noop today; binary-download + npm-build dispatchers land per-app inside the apps that need them (see slot table).

Wait for these PRs to merge to `develop` before starting:
- `foundation/playwright-harness` (PR #11)
- `foundation/action-window` (PR #12)
- `foundation/install-endpoint` (PR #13)

After they merge, every per-app branch is just: add the manifest `install` block, optionally extend the dispatcher with a method-specific helper, write a launcher endpoint if needed, write the Playwright spec.

---

## Codex's half — ~28 apps (60% of the catalog by complexity)

These are the heavier apps. Claude takes the simpler/lighter half. Race rule: claim before coding via `hermes_claim_task`. If Claude claimed one of yours already, skip and pick another.

### A. Slicer apps (binary-download, exec launcher)

| Branch | Task ID | App | Method | Launcher smoke |
|---|---|---|---|---|
| `app/prusaslicer` | `HP3D-APP-PRUSASLICER-2026-05-03` | PrusaSlicer | binary-download (release ZIP) | `prusa-slicer.exe --info` exit 0 |
| `app/orcaslicer` | `HP3D-APP-ORCASLICER-2026-05-03` | OrcaSlicer | binary-download | `orcaslicer.exe --version` |
| `app/superslicer` | `HP3D-APP-SUPERSLICER-2026-05-03` | SuperSlicer | binary-download | exec |
| `app/curaengine` | `HP3D-APP-CURAENGINE-2026-05-03` | CuraEngine | binary-download | `CuraEngine help` |
| `app/flsun-slicer` | `HP3D-APP-FLSUN-SLICER-2026-05-03` | FLSUN Slicer | binary-download | exec |

### B. Modelers (heavy build / native)

| Branch | Task ID | App | Method | Launcher |
|---|---|---|---|---|
| `app/blender-cli` | `HP3D-APP-BLENDER-CLI-2026-05-03` | Blender (CLI smoke only — Claude owns the GUI install) | clone-shallow + symlink to system blender | `blender --background --version` |
| `app/manifold` | `HP3D-APP-MANIFOLD-2026-05-03` | Manifold | pip install manifold3d | module probe |
| `app/meshlab` | `HP3D-APP-MESHLAB-2026-05-03` | MeshLab | binary-download | exec |
| `app/solvespace` | `HP3D-APP-SOLVESPACE-2026-05-03` | SolveSpace | binary-download | exec |
| `app/truck` | `HP3D-APP-TRUCK-2026-05-03` | Truck (Rust CAD) | clone-full + cargo build | `target/release/truck --version` |

### C. Print farm / monitoring (services)

| Branch | Task ID | App | Method | Launcher |
|---|---|---|---|---|
| `app/octoprint` | `HP3D-APP-OCTOPRINT-2026-05-03` | OctoPrint | pip install OctoPrint (in venv) | `octoprint serve --host 127.0.0.1 --port 5000` → HTTP 200 on `/api/version` |
| `app/moonraker` | `HP3D-APP-MOONRAKER-2026-05-03` | Moonraker | clone-full + Python venv setup | service `:7125` → HTTP 200 on `/server/info` |
| `app/klipper` | `HP3D-APP-KLIPPER-2026-05-03` | Klipper (source viewer; firmware not flashed by us) | clone-shallow | static viewer + README |
| `app/mainsail` | `HP3D-APP-MAINSAIL-2026-05-03` | Mainsail | clone-full + npm ci + npm run build | static-serve `dist/` from API |
| `app/fluidd` | `HP3D-APP-FLUIDD-2026-05-03` | Fluidd | clone-full + npm ci + npm run build | static-serve |
| `app/fdm-monster` | `HP3D-APP-FDM-MONSTER-2026-05-03` | FDM Monster | clone-full + npm + Docker-compose | service launcher |
| `app/octofarm` | `HP3D-APP-OCTOFARM-2026-05-03` | OctoFarm | clone-full + npm | service |
| `app/printrun` | `HP3D-APP-PRINTRUN-2026-05-03` | Printrun | pip install printrun | `pronterface --help` exit 0 |
| `app/klipperscreen` | `HP3D-APP-KLIPPERSCREEN-2026-05-03` | KlipperScreen | clone + pip install -e . | service (Linux-only — document) |

### D. 3D generation (heavy ML, GPU)

| Branch | Task ID | App | Method | Launcher |
|---|---|---|---|---|
| `app/comfyui` | `HP3D-APP-COMFYUI-2026-05-03` | ComfyUI | clone-full + venv + requirements + `python main.py --listen 127.0.0.1 --port 8188` | HTTP 200 on `/queue` |
| `app/comfyui-frontend` | `HP3D-APP-COMFYUI-FRONTEND-2026-05-03` | comfyui-frontend-package | pip | module probe |
| `app/triposr` | `HP3D-APP-TRIPOSR-2026-05-03` | TripoSR | clone-full + pip requirements + venv | module probe |
| `app/hunyuan3d21` | `HP3D-APP-HUNYUAN3D21-2026-05-03` | Hunyuan3D 2.1 | clone-shallow (research; install only on GPU host) | source viewer |
| `app/trellis2` | `HP3D-APP-TRELLIS2-2026-05-03` | Trellis2 | clone-shallow (research) | source viewer |
| `app/comfyui-trellis2` | `HP3D-APP-COMFYUI-TRELLIS2-2026-05-03` | ComfyUI-Trellis2 plugin | clone-shallow into ComfyUI custom_nodes | plugin probe |

### E. Orchestration / agent stack

| Branch | Task ID | App | Method | Launcher |
|---|---|---|---|---|
| `app/langgraph` | `HP3D-APP-LANGGRAPH-2026-05-03` | LangGraph | pip install langgraph | module probe |
| `app/langchain` | `HP3D-APP-LANGCHAIN-2026-05-03` | LangChain | pip install langchain | module probe |
| `app/model-context-protocol` | `HP3D-APP-MCP-2026-05-03` | model-context-protocol | pip install mcp | module probe |
| `app/kiln` | `HP3D-APP-KILN-2026-05-03` | Kiln-AI | pip install kiln-ai | module probe |
| `app/azure-speech-sdk-js` | `HP3D-APP-AZURE-SPEECH-2026-05-03` | Azure Speech SDK JS (NPM, free local SDK; no Azure account required for offline build) | clone-shallow + npm ci | reference card |

### F. Firmware (clone-shallow source viewers — we don't flash firmware)

| Branch | Task ID | App | Method |
|---|---|---|---|
| `app/marlin` | `HP3D-APP-MARLIN-2026-05-03` | Marlin | clone-shallow |
| `app/prusa-firmware` | `HP3D-APP-PRUSA-FW-2026-05-03` | Prusa Firmware | clone-shallow |

(If Claude claims one of these first, skip.)

---

## Per-branch Definition of Done (paste into PR body)

```markdown
## Definition of Done

- [ ] HermesProof claim: `hermes_claim_task("HP3D-APP-<ID>-2026-05-03")`
- [ ] Manifest entry in `source-lab/source_manifest.json` gets the appropriate `install` block (method + repo/package/binary_url + import_name as needed)
- [ ] If method needs new dispatcher logic (binary-download, npm-build, cargo, custom): add a `_install_<method>` function to `apps/api/hermes3d_api/source_install.py` and register it in `_DISPATCH`
- [ ] Backend launcher endpoint at `/api/source-apps/<id>/launch` (POST) — spawns the process / starts the service / does the equivalent. For source-viewer-only apps, document N/A in the PR body.
- [ ] Action Window card: when user clicks the app in Source OS, the Action Window shows install_status pill + Install button + Launch button + facts panel
- [ ] Playwright spec at `tests/e2e/app-<id>.spec.ts`: open Source OS panel → click `<id>` card → click Install → wait for `installed` pill → (if launcher) click Launch → assert running
- [ ] Apps install into `G:\Github\Hermes3D\apps\<group>\<App>\` (HERMES3D_APPS_ROOT default) — confirmed by inspecting the directory after install
- [ ] All mechanical-review fields filled

## Hermes evidence chain: PASS
## Task ID: `HP3D-APP-<ID>-2026-05-03`
## hermes_run_gate: tests.e2e
```

---

## Branch + commit naming

- Branch: `app/<id>` (must match the slot table id, lowercase kebab-case)
- Commit: `feat(app/<id>): install + launcher + Action Window + e2e`

Open PR against `develop`. Don't stack on another agent's branch unless explicitly noted.

---

## Coordination loop (per app)

```
1. hermes_list_locks  -> see un-claimed slots
2. hermes_claim_task("HP3D-APP-<ID>-2026-05-03", agent_id="codex-1")
3. git checkout develop && git pull && git checkout -b app/<id>
4. add manifest install block; if a new install method is needed,
   extend source_install._DISPATCH first
5. add /api/source-apps/<id>/launch (and any per-app helpers) in main.py
6. test the install end-to-end against G:\Github\Hermes3D\apps\<target>
7. write Playwright spec at tests/e2e/app-<id>.spec.ts
8. npm run test:e2e -- app-<id>
9. hermes_append_evidence(task_id, branch=app/<id>, install=ok, launch=ok|na)
10. hermes_run_gate(task_id, "tests.e2e")
11. git push, open PR with full DoD
12. on merge: hermes_release_task(task_id, "merged")
```

---

## What "fully E2E" means for an app branch

A green PR ships:
1. Manifest config landed
2. Install actually installing (real download, real pip, real clone — not stubbed)
3. Launcher actually launching (or documented N/A with explicit reason)
4. Action Window actually rendering when the card is clicked
5. Playwright spec actually passing in CI

If any are missing, the branch isn't done. Keep working — don't stop at "the install endpoint accepts the request."

---

## Race target

~28 apps, one branch each, in 24-48h. Claude races you on the other half. The user will rate each landed app. Quality > quantity, but ship fast.

If your slot fails on a Windows-specific blocker (Linux-only service), still ship the manifest entry + Action Window read-only card with a "Linux-only" pill + skipped Playwright with a `test.skip()` and reason. Don't sit on an impossible slot.
