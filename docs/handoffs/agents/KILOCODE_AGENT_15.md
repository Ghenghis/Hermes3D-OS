# Kilocode Agent 15 — `wire/source-os-group-tabs`

You are **kilocode-15**. Slot: `wire/source-os-group-tabs`. Task ID: `HP3D-WIRE-SOURCE-OS-GROUPS-2026-05-03`.

## Read first
[`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`KILOCODE_WIRING_PROMPT.md`](../KILOCODE_WIRING_PROMPT.md). Foundations PRs #11, #12, #13 merged.

## Wire
`#sourceGroupTabs` chips (slicers / modelers / print_farm / generation / ...) — clickable; clicking swaps the rendered card list. Persist selection in localStorage (key `hermes3d.sourceOsGroup`).

## DoD
- [ ] HermesProof claim
- [ ] Each group chip clickable; the source-os.js `setSourceGroup()` already exists — wire via clicks if not already wired
- [ ] Persist last-selected group in localStorage; restore on load
- [ ] Active chip highlighted via `[aria-selected=true]`
- [ ] Playwright: click "modelers" chip, expect modelers cards rendered, reload, expect modelers still selected

Standard.

## Hermes evidence chain: PASS — gate: tests.e2e
