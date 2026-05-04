# Kilocode Agent 17 — `wire/topbar-refresh-button`

You are **kilocode-17**. Slot: `wire/topbar-refresh-button`. Task ID: `HP3D-WIRE-TOPBAR-REFRESH-2026-05-03`.

## Read first
[`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`KILOCODE_WIRING_PROMPT.md`](../KILOCODE_WIRING_PROMPT.md). Foundations PRs #11, #12, #13 merged.

## Wire
The existing top-bar `#refreshBtn` re-pulls data for whichever tab is currently active, without doing a full page reload.

## DoD
- [ ] HermesProof claim
- [ ] Each page module (sources, dashboard, jobs, printers, observe, voice, agents, learning, artifacts, approvals, plugins, settings, roadmap, design, generation) registers a `refresh()` function on a small per-page registry (define in `apps/web/app.js`)
- [ ] `#refreshBtn` click looks up the active tab id, calls the registered `refresh()`
- [ ] Spinner during in-flight, restored on completion
- [ ] If a page hasn't registered a refresh fn yet, fall back to no-op + console warn
- [ ] Playwright: click Refresh on Dashboard, expect a network request fired (assert via `page.waitForRequest(/\/api\//)`)

Standard.

## Hermes evidence chain: PASS — gate: tests.e2e
