# Kilocode Agent 3 — `wire/dashboard-events-tail`

You are **kilocode-3**.

## Read first
- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`KILOCODE_WIRING_PROMPT.md`](../KILOCODE_WIRING_PROMPT.md)
- Foundations PRs #11, #12, #13 merged

## Your slot

| Branch | Task ID |
|---|---|
| `wire/dashboard-events-tail` | `HP3D-WIRE-DASHBOARD-EVENTS-2026-05-03` |

**Wire:** Live event tail bound to SSE `/api/events/stream`. Click event → Action Window with kind=approval (or relevant kind).

## DoD

- [ ] HermesProof claim
- [ ] EventSource subscription to `/api/events/stream`, render last N events into a tail UI
- [ ] Click event → Action Window with kind matching event type; payload includes the event metadata
- [ ] Cleanup: close EventSource on tab switch
- [ ] Playwright spec: load Dashboard, mock SSE with `page.route` + ReadableStream, post a synthetic event, expect tail to grow, click event, Action Window visible
- [ ] If `/api/events/stream` not yet implemented, mock entirely

## Coordination

Standard claim/branch/ship/spec/evidence/gate/PR/release.

## Hermes evidence chain: PASS — Task ID: `HP3D-WIRE-DASHBOARD-EVENTS-2026-05-03` — gate: tests.e2e
