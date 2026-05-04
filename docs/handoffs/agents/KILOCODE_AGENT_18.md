# Kilocode Agent 18 — `wire/action-window-history`

You are **kilocode-18**. Slot: `wire/action-window-history`. Task ID: `HP3D-WIRE-AW-HISTORY-2026-05-03`.

## Read first
[`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`KILOCODE_WIRING_PROMPT.md`](../KILOCODE_WIRING_PROMPT.md), [`apps/web/action-window.js`](../../../apps/web/action-window.js) (foundation/action-window). Foundations PRs #11, #12, #13 merged.

## Wire
Add Back/Forward arrows to the Action Window header; navigates between previous payloads (in-memory ring of last 12).

## DoD
- [ ] HermesProof claim
- [ ] Extend `apps/web/action-window.js` with a small ring buffer + `back()` / `forward()` API on `window.HermesActionWindow`
- [ ] Each `actionwindow:render` event pushes the payload onto the ring (max 12, FIFO)
- [ ] Add `←` and `→` buttons in `.action-window__header`; disabled state when at end of ring
- [ ] Closing the Action Window does NOT clear the ring (so user can re-open and navigate back)
- [ ] Playwright: dispatch 3 synthetic payloads, click Back twice, assert title matches the first; click Forward once, assert title matches the second

Standard.

## Hermes evidence chain: PASS — gate: tests.e2e
