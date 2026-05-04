# Codex Agent 3 — Print Farm Core (5 apps, services)

You are **codex-3**. Print-farm services are long-running processes — your branches need launcher endpoints that spawn `subprocess.Popen` and a `/api/source-apps/<id>/process-state` endpoint reporting `running | stopped | crashed`.

## Read first

- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`CODEX_APP_INSTALLS_PROMPT.md`](../CODEX_APP_INSTALLS_PROMPT.md)
- Foundations PRs #11, #12, #13 must be merged

Apps install into `G:\Github\Hermes3D\apps\print_farm\<App>\`.

## Your slots

| Branch | Task ID | App | Method | Launcher | Smoke |
|---|---|---|---|---|---|
| `app/octoprint` | `HP3D-APP-OCTOPRINT-2026-05-03` | OctoPrint | pip install OctoPrint (in venv) | `octoprint serve --host 127.0.0.1 --port 5000` | HTTP 200 on `/api/version` |
| `app/moonraker` | `HP3D-APP-MOONRAKER-2026-05-03` | Moonraker | clone-full + venv setup | service `:7125` | HTTP 200 on `/server/info` |
| `app/klipper` | `HP3D-APP-KLIPPER-2026-05-03` | Klipper (source viewer; we don't flash firmware) | clone-shallow | static viewer | README served |
| `app/printrun` | `HP3D-APP-PRINTRUN-2026-05-03` | Printrun | pip install printrun | `pronterface --help` | exit 0 |
| `app/mainsail` | `HP3D-APP-MAINSAIL-2026-05-03` | Mainsail | clone-full + npm ci + npm run build | static-serve `dist/` from API | GET `/static/mainsail/` 200 |

For services: PID tracking lives in `apps/api/hermes3d_api/process_state.py` (create if missing — first agent in this group lands the helper). Register the spawned process; `/api/source-apps/<id>/process-state` returns the status.

## Per-slot DoD

1. Manifest entry with `install` block
2. Dispatcher extension if needed
3. `/api/source-apps/<id>/launch` (POST) + `/api/source-apps/<id>/stop` (POST) + `/api/source-apps/<id>/process-state` (GET)
4. Action Window card with install + launch + stop + open-in-browser link
5. Playwright spec covering install → launch → process-state running → stop → process-state stopped

## Coordination loop

```
1. hermes_list_locks
2. hermes_claim_task("HP3D-APP-<ID>-2026-05-03", agent_id="codex-3")
3. branch app/<id>, ship
4. npm run test:e2e -- app-<id>
5. evidence + gate + PR + release
```

Race rule applies; after 5 slots, look at un-claimed CODEX slots in groups D–F.
