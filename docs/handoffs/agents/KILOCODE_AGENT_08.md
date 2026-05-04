# Kilocode Agent 8 — `wire/observe-camera-tile-click`

You are **kilocode-8**.

## Read first
- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`KILOCODE_WIRING_PROMPT.md`](../KILOCODE_WIRING_PROMPT.md)
- Foundations PRs #11, #12, #13 merged

## Your slot

| Branch | Task ID |
|---|---|
| `wire/observe-camera-tile-click` | `HP3D-WIRE-OBSERVE-CAMERA-2026-05-03` |

**Wire:** Camera tiles on the Observe tab → Action Window kind=printer + live SSE log panel + camera iframe panel.

## DoD

- [ ] HermesProof claim
- [ ] Click any camera tile → `actionwindow:render` with kind=printer + camera URL in iframe panel + log panel subscribing to SSE `/api/observe/stream/{printer_id}`
- [ ] When Action Window closes, SSE subscription closes
- [ ] Playwright spec: open Observe, click first camera tile, Action Window visible, iframe src matches camera URL, log panel exists

## Coordination

Standard. Mock SSE if missing.

## Hermes evidence chain: PASS — Task ID: `HP3D-WIRE-OBSERVE-CAMERA-2026-05-03` — gate: tests.e2e
