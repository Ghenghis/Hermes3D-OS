# Kilocode Wiring Prompt — 20 agents, pure wiring, **no installs**
**Updated 2026-05-03 — Kilocode pivots from app-installs to GUI wiring.**

You are joining a 4-agent collaborative build of Hermes3D-OS at `G:\Github\Hermes3D-OS`. Your siblings handle other slices:

- **Codex** installs + sets up half of all apps (~28 apps).
- **Claude (Opus)** owns the foundations + 8 UI-flow tabs + the other half of app installs + 4 desktop-binary apps.
- **Windsurf (SWE 1.6)** owns small settings + reference-only app cards.

**Your job:** with 20 agents in parallel, **wire the GUI**. You do not download, install, or launch anything. You connect existing buttons, lists, click handlers, and panels to existing FastAPI endpoints + the universal Action Window contract. Pure UI wiring + event plumbing + state display.

If a backend endpoint your wire needs doesn't exist yet, your branch may stub it as a TODO comment in `apps/api/hermes3d_api/main.py` AND create a follow-up issue — but never block on Codex/Claude install work.

---

## Read first (foundations land before you start)

1. `docs/handoffs/SPLIT_PLAN.md` — operating principle, Action Window contract, DoD.
2. `docs/handoffs/CODEX_APP_INSTALLS_PROMPT.md` — what Codex is installing so you don't write wires that depend on un-shipped install machinery.
3. Wait for these to merge to `develop`:
   - `foundation/playwright-harness` (PR #11)
   - `foundation/action-window` (PR #12)
   - `foundation/install-endpoint` (PR #13)

When the foundations are in, the universal Action Window renderer + dispatcher + install button + Playwright harness all exist. Your branches just connect tab content to it.

---

## 20 wiring slots — one per agent

Each slot is one branch, one tiny scope, one Playwright spec. Run `hermes_list_locks` first; pick the lowest un-claimed slot.

| # | Branch | Task ID | Wires |
|---|---|---|---|
| 1 | `wire/dashboard-fleet-list` | `HP3D-WIRE-DASHBOARD-FLEET-2026-05-03` | `#dashboardFleet` consumes `/api/printers/list`; click row → Action Window with kind=printer |
| 2 | `wire/dashboard-queue-list` | `HP3D-WIRE-DASHBOARD-QUEUE-2026-05-03` | `#dashboardQueue` consumes `/api/jobs/list`; click row → Action Window with kind=job |
| 3 | `wire/dashboard-events-tail` | `HP3D-WIRE-DASHBOARD-EVENTS-2026-05-03` | live event tail bound to SSE `/api/events/stream`; click event → Action Window with kind=approval |
| 4 | `wire/jobs-search-filter` | `HP3D-WIRE-JOBS-SEARCH-2026-05-03` | search box + status chip filters on `#jobsList`; updates without page reload |
| 5 | `wire/jobs-row-click-actionwindow` | `HP3D-WIRE-JOBS-ROW-2026-05-03` | every job row dispatches the universal payload to Action Window with status pill + Cancel/Retry primary actions |
| 6 | `wire/printers-row-click-actionwindow` | `HP3D-WIRE-PRINTERS-ROW-2026-05-03` | every printer row → Action Window with kind=printer + Test Connection button + camera URL panel |
| 7 | `wire/printers-discover-button` | `HP3D-WIRE-PRINTERS-DISCOVER-2026-05-03` | Discover button → POST `/api/printers/discover` → repaint list + toast |
| 8 | `wire/observe-camera-tile-click` | `HP3D-WIRE-OBSERVE-CAMERA-2026-05-03` | observe-tab camera tiles → Action Window with kind=printer + live SSE log panel |
| 9 | `wire/voice-state-status-pill` | `HP3D-WIRE-VOICE-PILL-2026-05-03` | top-bar voice indicator polls `/api/voice/state`; click pill → Action Window with kind=voice + Mute action |
| 10 | `wire/agents-list-actionwindow` | `HP3D-WIRE-AGENTS-LIST-2026-05-03` | agents-tab list rendered from `/api/agents/list`; click row → Action Window with kind=agent + Health + Dispatch primary actions |
| 11 | `wire/learning-topics-actionwindow` | `HP3D-WIRE-LEARNING-TOPICS-2026-05-03` | learning-tab topic cards → Action Window with kind=topic + linked papers panel |
| 12 | `wire/artifacts-row-click` | `HP3D-WIRE-ARTIFACTS-ROW-2026-05-03` | artifacts list rows → Action Window with kind=artifact + Download (auth-gated) + Open Containing Folder |
| 13 | `wire/approvals-pending-actionwindow` | `HP3D-WIRE-APPROVALS-PENDING-2026-05-03` | approvals tab pending list → Action Window with kind=approval + Approve + Reject buttons that POST verdict |
| 14 | `wire/source-os-search` | `HP3D-WIRE-SOURCE-OS-SEARCH-2026-05-03` | search box on Source OS panel; filters #sourceModuleList without reload |
| 15 | `wire/source-os-group-tabs` | `HP3D-WIRE-SOURCE-OS-GROUPS-2026-05-03` | top-of-panel group chips (slicers/modelers/print_farm/...) — clickable, swap rendered list, persist selection |
| 16 | `wire/source-os-status-pills` | `HP3D-WIRE-SOURCE-OS-STATUS-PILLS-2026-05-03` | per-module install_status pill on each card in `#sourceModuleList` (uses status payload from foundation/install-endpoint) |
| 17 | `wire/topbar-refresh-button` | `HP3D-WIRE-TOPBAR-REFRESH-2026-05-03` | top-bar Refresh button re-pulls all currently-active tab data without full page reload |
| 18 | `wire/action-window-history` | `HP3D-WIRE-AW-HISTORY-2026-05-03` | back/forward arrows on Action Window header; navigates between previous payloads (in-memory ring) |
| 19 | `wire/action-window-pin` | `HP3D-WIRE-AW-PIN-2026-05-03` | pin icon prevents next dispatch from replacing current Action Window |
| 20 | `wire/global-event-bus-logger` | `HP3D-WIRE-EVENT-BUS-LOGGER-2026-05-03` | dev-only console logger for every `actionwindow:render` event when `?debug=1` query param present; helps debugging during multi-agent landings |

If a slot's data source endpoint doesn't exist yet, your spec covers the wiring against a mocked fetch (Playwright route mock) AND your PR notes the missing endpoint as a follow-up. Don't block.

---

## Per-branch Definition of Done (paste into PR body)

```markdown
## Definition of Done

- [ ] HermesProof claim: `hermes_claim_task("HP3D-WIRE-<...>-2026-05-03")`
- [ ] Single file or scoped change in `apps/web/<page-or-shared>.js` (no new pages, no new API endpoints unless explicitly noted in slot)
- [ ] Action Window contract observed (universal payload shape from foundation/action-window)
- [ ] Existing tab/page renders unchanged for unrelated items
- [ ] Playwright spec at `tests/e2e/wire-<scope>.spec.ts` passing
- [ ] All mechanical-review fields filled

## Hermes evidence chain: PASS
## Task ID: `HP3D-WIRE-<...>-2026-05-03`
## hermes_run_gate: tests.e2e
```

---

## Branch + commit naming

- Branch: `wire/<scope>` (lowercase kebab-case, must match the slot table above)
- Commit: `wire(<scope>): <one-line>`

Open PR against `develop`. Don't open against another agent's branch unless you're explicitly stacking.

---

## Coordination loop (per agent)

```
1. hermes_list_locks  -> see un-claimed slots
2. hermes_claim_task("HP3D-WIRE-<ID>-2026-05-03", agent_id="kilocode-N")
3. git checkout develop && git pull && git checkout -b wire/<scope>
4. inspect existing apps/web/<page>.js for the data source you'll wire
5. wire it: data fetch → rendered DOM → click handler → universal Action Window dispatch
6. write Playwright spec at tests/e2e/wire-<scope>.spec.ts
7. npm run test:e2e -- wire-<scope>
8. hermes_append_evidence(task_id, branch=wire/<scope>, e2e=passed)
9. hermes_run_gate(task_id, "tests.e2e")
10. git push, open PR with full DoD checklist
11. on merge: hermes_release_task(task_id, "merged")
12. immediately pick next slot
```

If your slot turns out to depend on a not-yet-shipped endpoint, mock it via Playwright `page.route("**/api/<missing>/**", ...)` so the spec passes; ship the wire AND add a follow-up issue.

---

## What "wiring" means concretely

Wiring is connecting things that already exist:

- A list of items already rendered on a tab page → make every item clickable → dispatch the universal Action Window payload.
- A button already in the DOM → attach a fetch + a state update.
- A status field in an API payload → render it as a pill, badge, or chip.
- An SSE/WebSocket stream → keep the relevant DOM in sync.

Wiring is NOT:

- Installing or downloading any application
- Writing new FastAPI endpoints (unless the slot explicitly says so)
- Creating new tab pages
- Refactoring source-os.js's internals beyond the click delegation already in place

---

## Race target

20 agents × 1 wire branch = 20 user-visible improvements landed in 24h. The GUI starts feeling alive instead of static.

If you finish your slot, **don't pick from Codex's app-install list** — those are heavier and need long-running install dispatchers. Instead, pick another wiring follow-up identified during your own branch.
