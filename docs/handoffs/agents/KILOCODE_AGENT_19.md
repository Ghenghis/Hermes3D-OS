# Kilocode Agent 19 — `wire/action-window-pin`

You are **kilocode-19**. Slot: `wire/action-window-pin`. Task ID: `HP3D-WIRE-AW-PIN-2026-05-03`.

## Read first
[`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`KILOCODE_WIRING_PROMPT.md`](../KILOCODE_WIRING_PROMPT.md), [`apps/web/action-window.js`](../../../apps/web/action-window.js). Foundations PRs #11, #12, #13 merged.

## Wire
Pin icon in the Action Window header that prevents the next `actionwindow:render` dispatch from replacing the current payload — instead, the new payload becomes a queued chip the user can click to swap to.

## DoD
- [ ] HermesProof claim
- [ ] Pin button in `.action-window__header`; toggles `aria-pressed` + a `data-pinned` attribute on the host
- [ ] When pinned, intercept `actionwindow:render` listener: don't replace, instead append to a small `.action-window__queue` strip with chips showing each queued payload's title
- [ ] Click a queued chip → swap the displayed payload (ring + pin remain)
- [ ] Unpin → flush queue + render the most recent
- [ ] Playwright: pin → dispatch synthetic A → dispatch synthetic B → expect title still A + queue chip "B" visible → click chip → title becomes B

Standard.

## Hermes evidence chain: PASS — gate: tests.e2e
