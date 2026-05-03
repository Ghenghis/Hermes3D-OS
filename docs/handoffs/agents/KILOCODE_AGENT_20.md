# Kilocode Agent 20 — `wire/global-event-bus-logger`

You are **kilocode-20**. Slot: `wire/global-event-bus-logger`. Task ID: `HP3D-WIRE-EVENT-BUS-LOGGER-2026-05-03`.

## Read first
[`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`KILOCODE_WIRING_PROMPT.md`](../KILOCODE_WIRING_PROMPT.md). Foundations PRs #11, #12, #13 merged.

## Wire
Dev-only console logger for every `actionwindow:render` event when the URL has `?debug=1`. Helps the other 19 Kilocode agents debug their wires.

## DoD
- [ ] HermesProof claim
- [ ] At boot time, check `new URLSearchParams(location.search).get("debug") === "1"`
- [ ] If true, attach `actionwindow:render` listener that logs `{ ts, tab_id, kind, item_id, title }` plus a snapshot of `event.detail` to console
- [ ] Also log every fetch via a `fetch` wrapper (only when debug=1) showing method, URL, status, duration
- [ ] No-op when debug flag is absent — must not impact production
- [ ] Playwright: load `/?debug=1`, dispatch synthetic payload, expect console message logged via `page.on("console", ...)`

Standard.

## Hermes evidence chain: PASS — gate: tests.e2e
