# Windsurf Prompt — Hermes3D-OS Button & Setting Race
**You are SWE 1.6, fast. Take many small E2E branches in parallel.**

You are joining a 4-agent collaborative build of Hermes3D-OS at `G:\Github\Hermes3D-OS`. Your siblings are Claude (foundations + 8 UI tabs + 4 desktop apps), Codex (7 backend tabs + 6 backend apps), and Kilocode (20 pip apps in parallel).

**Your job:** small, fast, fully-E2E branches — one button, one setting, one filter, one chip — each its own branch with a Playwright test.

---

## Read first

1. `docs/handoffs/SPLIT_PLAN.md` — operating principle and Action Window contract.
2. `docs/handoffs/CLAUDE_LANES.md` and `CODEX_LANES.md` — to know which tab files NOT to fight over.

**Wait until foundations merge** (`foundation/action-window`, `foundation/install-endpoint`, `foundation/playwright-harness`).

---

## Branch slots — pick un-claimed ones

Run `hermes_list_locks` first; pick lowest un-claimed task id.

### A. Settings (high-value, persistent)

| Branch | Task ID | What |
|---|---|---|
| `setting/font-scale` | `HP3D-SETTING-FONTSCALE-2026-05-03` | Already partially built on `feat/h3dos-fontscale-and-popover` (PR #9). Take ownership: add backend persistence (`/api/settings/font`), Playwright covering load/change/persist/reload. |
| `setting/font-family` | `HP3D-SETTING-FONTFAMILY-2026-05-03` | Same pattern as font-scale. |
| `setting/theme` | `HP3D-SETTING-THEME-2026-05-03` | Theme dropdown → backend persist → applied on load. |
| `setting/runtime-ports` | `HP3D-SETTING-PORTS-2026-05-03` | Editable ports for API/Moonraker/OctoPrint/ComfyUI. Reuse existing port-edit UI; add Playwright. |
| `setting/printer-camera-url` | `HP3D-SETTING-CAMERA-URL-2026-05-03` | Already partially live (commit cfbeafa). Lock down: validate URL, persist, Playwright. |
| `setting/telemetry-toggle` | `HP3D-SETTING-TELEMETRY-2026-05-03` | Opt-in toggle, persists, defaults off. |

### B. Per-tab small buttons (each its own branch)

| Branch | Task ID | What |
|---|---|---|
| `btn/dashboard-refresh` | `HP3D-BTN-DASHBOARD-REFRESH-2026-05-03` | Refresh icon top-right of Dashboard, re-pulls `/api/dashboard/summary`. |
| `btn/jobs-filter-status` | `HP3D-BTN-JOBS-FILTER-STATUS-2026-05-03` | Status filter chip set on Jobs tab. |
| `btn/jobs-search` | `HP3D-BTN-JOBS-SEARCH-2026-05-03` | Text search box for Jobs. |
| `btn/printers-discover` | `HP3D-BTN-PRINTERS-DISCOVER-2026-05-03` | "Discover printers" button → `/api/printers/discover`. |
| `btn/printers-test-connection` | `HP3D-BTN-PRINTERS-TEST-2026-05-03` | Per-printer Test Connection action in Action Window. |
| `btn/observe-toggle-stream` | `HP3D-BTN-OBSERVE-TOGGLE-2026-05-03` | Start/Stop SSE telemetry stream button. |
| `btn/voice-mute` | `HP3D-BTN-VOICE-MUTE-2026-05-03` | Mic mute button. |
| `btn/agents-dispatch` | `HP3D-BTN-AGENTS-DISPATCH-2026-05-03` | Per-agent Dispatch Task button in Action Window. |
| `btn/learning-bookmark` | `HP3D-BTN-LEARNING-BOOKMARK-2026-05-03` | Bookmark a topic. |
| `btn/artifacts-download` | `HP3D-BTN-ARTIFACTS-DOWNLOAD-2026-05-03` | Per-artifact download. |
| `btn/approvals-approve` | `HP3D-BTN-APPROVALS-APPROVE-2026-05-03` | Approve verdict button. |
| `btn/approvals-reject` | `HP3D-BTN-APPROVALS-REJECT-2026-05-03` | Reject verdict button. |
| `btn/source-os-search` | `HP3D-BTN-SOURCE-OS-SEARCH-2026-05-03` | Search across the app catalog. |
| `btn/source-os-filter-group` | `HP3D-BTN-SOURCE-OS-FILTER-GROUP-2026-05-03` | Filter by group (slicers/modelers/...). |
| `btn/source-os-filter-status` | `HP3D-BTN-SOURCE-OS-FILTER-STATUS-2026-05-03` | Filter by install status. |
| `btn/action-window-pin` | `HP3D-BTN-ACTION-WINDOW-PIN-2026-05-03` | Pin current Action Window so navigation doesn't replace it. |
| `btn/action-window-history` | `HP3D-BTN-ACTION-WINDOW-HISTORY-2026-05-03` | Back/forward through previous Action Window items. |

### C. Reference-only app cards (clone-shallow + source viewer, fast)

Each is one tiny branch — manifest entry + Action Window source-viewer card + readme renderer + Playwright spec. About 5 minutes per branch for an SWE-fast model.

| Branch | App | Branch |
|---|---|---|
| `app/slic3r` | Slic3r | reference |
| `app/bambustudio` | BambuStudio | reference |
| `app/mattercontrol` | MatterControl | reference |
| `app/kiri-moto` | Kiri:Moto | reference |
| `app/strecs3d` | Strecs3D | reference |
| `app/flsun-slicer` | FLSUN Slicer | reference |
| `app/superslicer` | SuperSlicer | reference |
| `app/curaengine` | CuraEngine | reference |
| `app/meshlab` | MeshLab | reference |
| `app/prusa-firmware` | Prusa Firmware | reference |
| `app/reprapfirmware` | RepRapFirmware | reference |
| `app/smoothieware` | Smoothieware | reference |
| `app/repetier-firmware` | Repetier Firmware | reference |
| `app/boxturtle` | BoxTurtle | reference |
| `app/enraged-rabbit` | Enraged Rabbit | reference |
| `app/octofarm` | OctoFarm | reference |
| `app/fdm-monster` | FDM Monster | reference |
| `app/hunyuan3d21` | Hunyuan3D 2.1 | reference |
| `app/trellis2` | Trellis2 | reference |
| `app/comfyui-trellis2` | ComfyUI Trellis2 plugin | reference |
| `app/azure-speech-sdk-js` | Azure Speech SDK JS | reference |

### D. npm-build apps (if Codex doesn't claim)

| Branch | App |
|---|---|
| `app/mainsail` | Mainsail |
| `app/fluidd` | Fluidd |

These need `npm ci && npm run build` + static-serve through API. Larger than reference cards but smaller than backend services.

---

## Per-branch checklist (paste into PR body)

```markdown
## Definition of Done

- [ ] HermesProof claim: `hermes_claim_task("HP3D-<TYPE>-<ID>-2026-05-03")`
- [ ] One file, one feature — no scope creep
- [ ] Backend endpoint reachable + tested (if applicable)
- [ ] Frontend wired into the universal Action Window contract
- [ ] Persistence: localStorage AND backend round-trip (settings only)
- [ ] Playwright spec at `tests/e2e/<branch-scope>.spec.ts` passing
- [ ] All mechanical-review PR body fields filled

## Hermes evidence chain: PASS
## Task ID: `HP3D-<...>-2026-05-03`
## hermes_run_gate: <verdict>
```

---

## Branch / commit naming

- Branch: `setting/<id>` or `btn/<page>-<id>` or `app/<id>`
- Commit: `feat(<scope>): <short one-line>`

Open PR against `develop`. Fill DoD. Move on.

---

## Coordination loop

```
1. hermes_list_locks  -> see un-claimed slots
2. hermes_claim_task(task_id, agent_id="windsurf-1")
3. git checkout -b <branch>
4. work in ONE file scope only — don't touch foundation files
5. write Playwright spec
6. hermes_append_evidence(task_id, ...)
7. hermes_run_gate(task_id, "tests.e2e")
8. push branch, open PR with full DoD
9. on merge: hermes_release_task(task_id, "merged")
10. immediately pick next slot
```

---

## Race target

50+ branches landed in 24h. Each green = one user-visible feature working E2E. Kilocode covers app installs, Codex covers backend tabs + heavy services, Claude covers foundations + UI-flow tabs + desktop apps, you blanket the long tail of buttons + settings + reference cards.

If you finish your slot list before the others, pick from any un-claimed `app/<id>` reference slot in `KILOCODE_PROMPT.md`. The race is on.
