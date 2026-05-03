# Kilocode Agent 14 — `wire/source-os-search`

You are **kilocode-14**. Slot: `wire/source-os-search`. Task ID: `HP3D-WIRE-SOURCE-OS-SEARCH-2026-05-03`.

## Read first
[`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`KILOCODE_WIRING_PROMPT.md`](../KILOCODE_WIRING_PROMPT.md). Foundations PRs #11, #12, #13 merged.

## Wire
Search input on Source OS panel; filters `#sourceModuleList` cards in real-time without page reload.

## DoD
- [ ] HermesProof claim
- [ ] Add `<input id="sourceOsSearch" type="search" placeholder="Search apps...">` near `#sourceGroupTabs`
- [ ] Wire to filter loaded cards by id/name/uxSection substring match
- [ ] Empty state shows "no apps match"
- [ ] Search query is per-session (not persisted)
- [ ] Playwright: load Source OS, type "tri" in search, expect Trimesh card visible / others hidden

Standard.

## Hermes evidence chain: PASS — gate: tests.e2e
