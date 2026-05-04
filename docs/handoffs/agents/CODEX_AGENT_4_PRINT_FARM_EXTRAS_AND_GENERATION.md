# Codex Agent 4 — Print Farm Extras + 3D Generation (6 apps)

You are **codex-4**. Mix of npm-build dashboards, Docker-compose fleet managers, and heavy ML services.

## Read first

- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`CODEX_APP_INSTALLS_PROMPT.md`](../CODEX_APP_INSTALLS_PROMPT.md)
- Foundations PRs #11, #12, #13 must be merged

## Your slots

| Branch | Task ID | App | Method | Launcher | Smoke |
|---|---|---|---|---|---|
| `app/fluidd` | `HP3D-APP-FLUIDD-2026-05-03` | Fluidd | clone-full + npm ci + npm run build | static-serve | GET `/static/fluidd/` 200 |
| `app/fdm-monster` | `HP3D-APP-FDM-MONSTER-2026-05-03` | FDM Monster | clone-full + npm + Docker-compose | service launcher | HTTP 200 on `/api/info` |
| `app/octofarm` | `HP3D-APP-OCTOFARM-2026-05-03` | OctoFarm | clone-full + npm ci + npm start | service `:4000` | HTTP 200 |
| `app/klipperscreen` | `HP3D-APP-KLIPPERSCREEN-2026-05-03` | KlipperScreen | clone + pip install -e . | service (Linux-only — document N/A on Win, ship reference card) | import probe |
| `app/comfyui` | `HP3D-APP-COMFYUI-2026-05-03` | ComfyUI | clone-full + venv + requirements + `python main.py --listen 127.0.0.1 --port 8188` | service | HTTP 200 on `/queue` within 30s |
| `app/comfyui-frontend` | `HP3D-APP-COMFYUI-FRONTEND-2026-05-03` | comfyui-frontend-package | pip | module probe | `python -c "import comfyui_frontend_package"` |

Per-slot DoD same as Codex Agent 3 (services need `/launch`, `/stop`, `/process-state`).

For Linux-only slots (KlipperScreen on Windows), still ship: manifest entry + Action Window read-only card + "Linux-only" pill + skipped Playwright with `test.skip()` and reason. Don't sit on impossible.

## Coordination

```
1. hermes_list_locks
2. hermes_claim_task("HP3D-APP-<ID>-2026-05-03", agent_id="codex-4")
3. ship branch (manifest + dispatcher + launcher + Action Window + spec)
4. evidence + gate + PR + release
```

After 6 slots, take un-claimed slots in `CODEX_APP_INSTALLS_PROMPT.md` group E or F.
