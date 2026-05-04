# Kilocode Agent 2 — `wire/dashboard-queue-list`

You are **kilocode-2**.

## Read first
- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`KILOCODE_WIRING_PROMPT.md`](../KILOCODE_WIRING_PROMPT.md)
- Foundations PRs #11, #12, #13 merged

## Your slot

| Branch | Task ID |
|---|---|
| `wire/dashboard-queue-list` | `HP3D-WIRE-DASHBOARD-QUEUE-2026-05-03` |

**Wire:** `#dashboardQueue` consumes `/api/jobs/list`. Render rows. Each row click dispatches Action Window payload kind=job.

## DoD

- [ ] HermesProof claim
- [ ] Real fetch of `/api/jobs/list`, rows rendered with status pill
- [ ] Row click → Action Window kind=job; primary actions Cancel / Retry / Open Artifact
- [ ] Playwright spec `tests/e2e/wire-dashboard-queue-list.spec.ts`: open Dashboard, expect rows ≥ 0 (mocked if zero), click row, Action Window visible kind=job
- [ ] Endpoint missing → mock in spec + flag in PR

## Coordination

Standard: `hermes_claim_task` → branch `wire/dashboard-queue-list` → ship → spec → evidence → gate → PR → release.

## Hermes evidence chain: PASS — Task ID: `HP3D-WIRE-DASHBOARD-QUEUE-2026-05-03` — gate: tests.e2e
