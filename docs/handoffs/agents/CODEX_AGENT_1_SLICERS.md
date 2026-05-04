# Codex Agent 1 — Slicers (5 apps)

You are **codex-1**, one of 5 Codex agents installing apps in parallel for Hermes3D-OS at `G:\Github\Hermes3D-OS`.

## Read before coding

- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md) — operating principle, Action Window contract, Definition of Done
- [`CODEX_APP_INSTALLS_PROMPT.md`](../CODEX_APP_INSTALLS_PROMPT.md) — full Codex lane brief (groups A–F)

Wait for foundations to merge to `develop` before starting:
- foundation/playwright-harness (PR #11)
- foundation/action-window (PR #12)
- foundation/install-endpoint (PR #13) — install dispatcher + Install button + apps install root

Apps install into `G:\Github\Hermes3D\apps\<group>\<App>\` (sibling repo, gitignored, local-only). Configurable via `HERMES3D_APPS_ROOT`.

## Your slots

| Branch | Task ID | App | Method | Launcher smoke |
|---|---|---|---|---|
| `app/prusaslicer` | `HP3D-APP-PRUSASLICER-2026-05-03` | PrusaSlicer | binary-download (release ZIP) | `prusa-slicer.exe --info` exit 0 |
| `app/orcaslicer` | `HP3D-APP-ORCASLICER-2026-05-03` | OrcaSlicer | binary-download | `orcaslicer.exe --version` |
| `app/superslicer` | `HP3D-APP-SUPERSLICER-2026-05-03` | SuperSlicer | binary-download | exec |
| `app/curaengine` | `HP3D-APP-CURAENGINE-2026-05-03` | CuraEngine | binary-download | `CuraEngine help` |
| `app/flsun-slicer` | `HP3D-APP-FLSUN-SLICER-2026-05-03` | FLSUN Slicer | binary-download | exec |

For each slot, ship a fully-working-E2E branch:
1. Add `install: { method: "binary-download", binary_url: "...", binary_target: "<group>/<App>" }` to manifest entry
2. Extend `apps/api/hermes3d_api/source_install.py` with `_install_binary_download` (if not yet present from another Codex agent — coordinate via HermesProof)
3. Add `POST /api/source-apps/<id>/launch` in `main.py` that spawns the binary
4. Action Window card shows install_status pill + Install + Launch + Open Repo
5. Playwright spec at `tests/e2e/app-<id>.spec.ts` covers Install → installed pill → Launch → process running

## Coordination loop (per slot)

```
1. hermes_list_locks → see who's holding what
2. hermes_claim_task("HP3D-APP-<ID>-2026-05-03", agent_id="codex-1")
3. git checkout develop && git pull && git checkout -b app/<id>
4. ship the branch (see DoD above)
5. npm run test:e2e -- app-<id>
6. hermes_append_evidence(task_id, branch=app/<id>, install=ok, launch=ok)
7. hermes_run_gate(task_id, "tests.e2e")
8. git push, open PR with full DoD checklist
9. on merge: hermes_release_task(task_id, "merged")
10. pick next slot
```

## Race rule

If another agent has claimed your slot first (HermesProof shows the task locked), pick the next un-claimed slot in the table. Don't double-claim.

If you finish all 5 slots, look at the un-claimed slots in `CODEX_APP_INSTALLS_PROMPT.md` (groups B–F). Claude races on the other half — check `CLAUDE_LANES.md` to avoid duplicate work.
