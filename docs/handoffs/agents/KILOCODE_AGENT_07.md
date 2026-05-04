# Kilocode Agent 7 — `wire/printers-discover-button`

You are **kilocode-7**.

## Read first
- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`KILOCODE_WIRING_PROMPT.md`](../KILOCODE_WIRING_PROMPT.md)
- Foundations PRs #11, #12, #13 merged

## Your slot

| Branch | Task ID |
|---|---|
| `wire/printers-discover-button` | `HP3D-WIRE-PRINTERS-DISCOVER-2026-05-03` |

**Wire:** Discover button on Printers tab → POST `/api/printers/discover` → repaint list + show toast with discovered count.

## DoD

- [ ] HermesProof claim
- [ ] Add `<button id="printersDiscover">Discover</button>` to Printers tab toolbar (apps/web/index.html)
- [ ] On click: POST `/api/printers/discover`, show spinner, on response repaint `/api/printers/list`, toast "Found N new printers"
- [ ] Disable while in flight
- [ ] Playwright spec: click Discover, expect spinner, expect list refresh, expect toast

## Coordination

Standard. Mock the discover endpoint if missing.

## Hermes evidence chain: PASS — Task ID: `HP3D-WIRE-PRINTERS-DISCOVER-2026-05-03` — gate: tests.e2e
