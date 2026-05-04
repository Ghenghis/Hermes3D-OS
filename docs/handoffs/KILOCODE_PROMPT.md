# Kilocode Prompt — Hermes3D-OS App Race
**You have 20 agents. Each agent picks ONE app slot, owns ONE branch end-to-end.**

You are joining a 4-agent collaborative build of Hermes3D-OS — a 3D-printing meta-OS at `G:\Github\Hermes3D-OS`. Your siblings are Claude (Opus, UI shell + foundations + 8 tabs + 4 desktop apps), Codex (7 tabs + 6 backend apps), and Windsurf (small buttons/settings).

**Your job:** install + launch + Action-Window-render + Playwright-test ONE pip-installable open-source 3D-tool app per agent. Each agent works on its own branch independently, in parallel.

---

## Read first

1. `docs/handoffs/SPLIT_PLAN.md` — the operating principle (one branch = one fully-working E2E unit) and Action Window contract.
2. `docs/handoffs/CLAUDE_LANES.md` — what Claude is doing, so you know the foundation files NOT to edit.
3. `source-lab/source_manifest.json` — the app catalog.

**Wait until these three foundation PRs merge to `develop` before starting:**
- `foundation/action-window`
- `foundation/install-endpoint`
- `foundation/playwright-harness`

When they merge, the install dispatcher, the Action Window renderer, and the Playwright harness all exist — your branches just register a method in the manifest and add a launcher.

---

## Agent slot table — pick one un-claimed slot per agent

Before starting, run `hermes_list_locks` (HermesProof MCP) to see which `HP3D-APP-<ID>-2026-05-03` task IDs are already claimed. Pick the lowest un-claimed slot.

| Slot | App id | Group | Install method | Launcher | Smoke command |
|---|---|---|---|---|---|
| 1 | `trimesh` | modelers | `pip install trimesh` | python module probe | `python -c "import trimesh; print(trimesh.__version__)"` |
| 2 | `manifold` | modelers | `pip install manifold3d` | module probe | `python -c "import manifold3d"` |
| 3 | `cadquery` | modelers | `pip install cadquery` | module probe + optional `cq-editor` | `python -c "import cadquery"` |
| 4 | `build123d` | modelers | `pip install build123d` | module probe | `python -c "import build123d"` |
| 5 | `printrun` | print_farm | `pip install printrun` | CLI `pronterface --help` | exit 0 |
| 6 | `comfyui-frontend` | generation | `pip install comfyui-frontend-package` | module probe | `python -c "import comfyui_frontend_package"` |
| 7 | `triposr` | generation | clone + `pip install -r requirements.txt` (in vendored venv) | module probe | `python -c "import tsr"` |
| 8 | `langchain` | orchestration | `pip install langchain` | module probe | `python -c "import langchain"` |
| 9 | `langgraph` | orchestration | `pip install langgraph` | module probe | `python -c "import langgraph"` |
| 10 | `model-context-protocol` | orchestration | `pip install mcp` | module probe | `python -c "import mcp"` |
| 11 | `kiln` | orchestration | `pip install kiln-ai` | module probe | `python -c "import kiln_ai"` |
| 12 | `manyfold` | libraries | `pip install manyfold` (else clone-fallback) | module probe | best-effort |
| 13 | `box-stl-generator` | utilities | clone + `pip install -e .` | CLI invocation | `--help` exit 0 |
| 14 | `klipperscreen` | print_farm | clone + `pip install -e .` | service `KlipperScreen` (skip on win — document) | import probe |
| 15 | `botqueue` | print_farm | clone + `pip install -e .` | service launcher | import probe |
| 16 | `octoprint` (alt — only if Codex hasn't claimed) | print_farm | `pip install OctoPrint` | service `octoprint serve` | HTTP 200 |
| 17 | `awesome-3d-printing` (research read-only) | research | clone-shallow | static md viewer | `README.md` exists |
| 18 | `awesome-extruders` (hardware read-only) | hardware | clone-shallow | static md viewer | `README.md` exists |
| 19 | `open-filament-database` | materials | clone-shallow + parse JSON | data viewer | DB file exists |
| 20 | `marlin` (firmware read-only) | firmware | clone-shallow | source viewer | `Marlin/Marlin.ino` exists |

If a slot turns out to be impossible on Windows (Linux-only services), still ship the manifest entry + Action Window read-only card with a "Linux-only" pill. Don't leave the slot half-done.

---

## Per-branch checklist (paste into PR body)

```markdown
## Definition of Done

- [ ] HermesProof claim: `hermes_claim_task("HP3D-APP-<ID>-2026-05-03")`
- [ ] Manifest entry in `source-lab/source_manifest.json` gets `install: { method: "pip", package: "<pkg>" }` (or appropriate)
- [ ] `/api/source-apps/<id>/install` POST works (foundation dispatcher already routes by method)
- [ ] `install_status` returns `installed` after install
- [ ] Launcher: `/api/source-apps/<id>/launch` runs the smoke command, returns success
- [ ] Action Window: when user clicks the app card, Action Window shows: name, install status pill, Install button, Launch button, primary panels (about, version)
- [ ] Playwright spec at `tests/e2e/app-<id>.spec.ts`: open Source OS panel → click <id> card → click Install → wait for `installed` pill → click Launch → assert success toast
- [ ] All 4 mechanical-review fields in PR body

## Hermes evidence chain: PASS
## Task ID: `HP3D-APP-<ID>-2026-05-03`
## hermes_run_gate: <paste verdict>
```

---

## Branch / commit naming

- Branch: `app/<id>` (e.g., `app/trimesh`)
- Commit: `feat(app/<id>): install + launcher + Action Window + e2e`

Push branch, open PR against `develop`, fill the DoD checklist.

---

## Coordination loop (per agent)

```
1. hermes_list_locks  -> see what's taken
2. hermes_claim_task("HP3D-APP-<ID>-2026-05-03", agent_id="kilocode-<n>")
3. git checkout -b app/<id>
4. edit manifest, verify install endpoint dispatches, add launcher, write Playwright spec
5. npm run test:e2e -- app-<id>
6. hermes_append_evidence(task_id, branch=app/<id>, e2e=passed)
7. hermes_run_gate(task_id, "tests.e2e")
8. git push, open PR with full DoD checklist
9. await mechanical-review-check, await CI green
10. hermes_release_task(task_id, "merged") on merge
```

If your agent gets stuck (smoke fails, Windows-only blocker), append evidence with the failure mode and `hermes_release_task(..., "blocked")` so the slot frees up — don't sit on it. Another Kilocode agent or a human takes over.

---

## What "fully E2E" means here

A green PR ships:
1. Manifest config
2. Install actually installing (not stubbed)
3. Launcher actually launching (or documented N/A with reason)
4. Action Window actually rendering when card clicked
5. Playwright spec actually passing in CI

If any of those are missing, the branch is not done. Keep working.
