# Kilocode Agent 5 — `wire/jobs-row-click-actionwindow`

You are **kilocode-5**.

## Read first
- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`KILOCODE_WIRING_PROMPT.md`](../KILOCODE_WIRING_PROMPT.md)
- Foundations PRs #11, #12, #13 merged

## Your slot

| Branch | Task ID |
|---|---|
| `wire/jobs-row-click-actionwindow` | `HP3D-WIRE-JOBS-ROW-2026-05-03` |

**Wire:** Every job row in Jobs tab dispatches the universal Action Window payload (kind=job). Status pill, primary actions Cancel/Retry, panels: timeline + artifacts.

## DoD

- [ ] HermesProof claim
- [ ] Click on any `#jobsList` row → `actionwindow:render` event with full payload
- [ ] payload.status_pill reflects job.status (mapped to ok/warn/err/info)
- [ ] payload.primary_actions includes Cancel (POST `/api/jobs/{id}/cancel`) when status=running, Retry (POST `/api/jobs/{id}/retry`) when status=failed
- [ ] payload.panels: timeline panel shows `/api/jobs/{id}/events`, artifacts panel lists `/api/jobs/{id}/artifacts`
- [ ] Playwright spec: load Jobs tab, click row, Action Window visible with kind=job, primary action button visible

## Coordination

Standard claim/branch/ship/spec/evidence/gate/PR/release.

## Hermes evidence chain: PASS — Task ID: `HP3D-WIRE-JOBS-ROW-2026-05-03` — gate: tests.e2e
