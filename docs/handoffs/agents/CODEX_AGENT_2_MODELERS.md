# Codex Agent 2 — Modelers (5 apps)

You are **codex-2**, one of 5 Codex agents installing apps in parallel.

## Read first

- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`CODEX_APP_INSTALLS_PROMPT.md`](../CODEX_APP_INSTALLS_PROMPT.md)
- Wait for foundations PRs #11, #12, #13 to merge to `develop`

Apps install into `G:\Github\Hermes3D\apps\<group>\<App>\` (gitignored, local-only).

## Your slots

| Branch | Task ID | App | Method | Launcher |
|---|---|---|---|---|
| `app/blender-cli` | `HP3D-APP-BLENDER-CLI-2026-05-03` | Blender CLI smoke (Claude owns full GUI install) | clone-shallow + system-blender symlink | `blender --background --version` |
| `app/manifold` | `HP3D-APP-MANIFOLD-2026-05-03` | Manifold | pip install manifold3d | `python -c "import manifold3d"` |
| `app/meshlab` | `HP3D-APP-MESHLAB-2026-05-03` | MeshLab | binary-download | exec |
| `app/solvespace` | `HP3D-APP-SOLVESPACE-2026-05-03` | SolveSpace | binary-download | exec |
| `app/truck` | `HP3D-APP-TRUCK-2026-05-03` | Truck (Rust CAD) | clone-full + cargo build | `target/release/truck --version` |

For each slot:
1. Manifest entry gets the appropriate `install` block (pip / binary-download / clone-full+cargo)
2. Extend dispatcher with `_install_binary_download` and/or `_install_cargo_build` if your slot needs them — register in `_DISPATCH`
3. Launcher endpoint in `main.py`
4. Action Window card with install + launch + Action Window facts panel
5. Playwright spec `tests/e2e/app-<id>.spec.ts`

## Coordination loop

```
1. hermes_list_locks
2. hermes_claim_task("HP3D-APP-<ID>-2026-05-03", agent_id="codex-2")
3. git checkout develop && git pull && git checkout -b app/<id>
4. ship branch (manifest + dispatcher + launcher + Action Window + spec)
5. npm run test:e2e -- app-<id>
6. hermes_append_evidence + hermes_run_gate
7. PR with full DoD
8. on merge: hermes_release_task
```

## Race rule

Claim before code; if locked, pick next. After your 5 slots, check un-claimed groups in `CODEX_APP_INSTALLS_PROMPT.md`.
