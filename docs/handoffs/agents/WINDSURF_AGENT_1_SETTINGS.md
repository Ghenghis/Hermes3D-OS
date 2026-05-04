# Windsurf Agent 1 — Settings (6 settings, persistent + UI)

You are **windsurf-1**, fast SWE 1.6 model. Pick all 6 settings; ship one branch each.

## Read first
- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`WINDSURF_PROMPT.md`](../WINDSURF_PROMPT.md)
- Foundations PRs #11, #12, #13 merged
- Coordinate with PR #9 (font-scale popover already shipped some of slot 1)

## Your slots

| Branch | Task ID | What |
|---|---|---|
| `setting/font-scale` | `HP3D-SETTING-FONTSCALE-2026-05-03` | Take ownership of PR #9; add backend persistence (`/api/settings/font`); Playwright spec covers load → change slider → reload → value persists |
| `setting/font-family` | `HP3D-SETTING-FONTFAMILY-2026-05-03` | Same pattern; persists across reloads |
| `setting/theme` | `HP3D-SETTING-THEME-2026-05-03` | `#themeSelect` already exists; persist to backend + apply on load |
| `setting/runtime-ports` | `HP3D-SETTING-PORTS-2026-05-03` | Editable ports for API/Moonraker/OctoPrint/ComfyUI; reuse existing port-edit UI; lock down + Playwright |
| `setting/printer-camera-url` | `HP3D-SETTING-CAMERA-URL-2026-05-03` | Already partially live (commit cfbeafa); validate URL, persist, Playwright |
| `setting/telemetry-toggle` | `HP3D-SETTING-TELEMETRY-2026-05-03` | Opt-in toggle; persists; defaults off |

## Per-slot DoD

- [ ] HermesProof claim
- [ ] Settings tab shows the control
- [ ] Backend `GET/POST /api/settings/<key>` round-trip (extend `apps/api/hermes3d_api/main.py`)
- [ ] localStorage cache for instant first-paint; backend is source of truth on subsequent loads
- [ ] Reset button restores default
- [ ] Playwright spec at `tests/e2e/setting-<id>.spec.ts`: change setting → reload → value persists

## Coordination

```
1. hermes_list_locks
2. hermes_claim_task("HP3D-SETTING-<ID>-2026-05-03", agent_id="windsurf-1")
3. branch setting/<id>, ship, spec
4. evidence + gate + PR + release
5. next slot
```

## Hermes evidence chain: PASS — gate: tests.e2e
