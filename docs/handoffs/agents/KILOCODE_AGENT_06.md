# Kilocode Agent 6 — `wire/printers-row-click-actionwindow`

You are **kilocode-6**.

## Read first
- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`KILOCODE_WIRING_PROMPT.md`](../KILOCODE_WIRING_PROMPT.md)
- Foundations PRs #11, #12, #13 merged

## Your slot

| Branch | Task ID |
|---|---|
| `wire/printers-row-click-actionwindow` | `HP3D-WIRE-PRINTERS-ROW-2026-05-03` |

**Wire:** Every printer row in Printers tab dispatches Action Window payload (kind=printer). Includes Test Connection button + camera URL panel.

## DoD

- [ ] HermesProof claim
- [ ] Click row → `actionwindow:render` event with kind=printer
- [ ] payload.status_pill mapped from printer.status (online/offline/error)
- [ ] payload.primary_actions: Test Connection (POST `/api/printers/{id}/test`), Open Camera (opens camera URL in iframe panel)
- [ ] payload.panels: facts (model/IP/firmware) + camera (iframe) + recent jobs
- [ ] Playwright spec: open Printers tab, click first printer row, Action Window kind=printer, Test Connection button present

## Coordination

Standard. Mock endpoints if missing.

## Hermes evidence chain: PASS — Task ID: `HP3D-WIRE-PRINTERS-ROW-2026-05-03` — gate: tests.e2e
