# Kilocode Agent 1 — `wire/dashboard-fleet-list`

You are **kilocode-1**. One slot, one branch, one Playwright spec.

## Read first
- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md) — operating principle, Action Window contract, DoD
- [`KILOCODE_WIRING_PROMPT.md`](../KILOCODE_WIRING_PROMPT.md) — full wiring lane brief
- Wait for foundations PRs #11, #12, #13 to merge to `develop`

## Your slot

| Branch | Task ID |
|---|---|
| `wire/dashboard-fleet-list` | `HP3D-WIRE-DASHBOARD-FLEET-2026-05-03` |

**Wire:** `#dashboardFleet` consumes `/api/printers/list`. Render rows. Each row click dispatches `actionwindow:render` with kind=printer (universal Action Window payload).

## DoD

- [ ] HermesProof claim: `hermes_claim_task("HP3D-WIRE-DASHBOARD-FLEET-2026-05-03", agent_id="kilocode-1")`
- [ ] Single change in `apps/web/app.js` (or split out `apps/web/dashboard.js` if cleaner)
- [ ] Real fetch of `/api/printers/list`, rendered into `#dashboardFleet`
- [ ] Click any row → universal Action Window payload, kind=printer, primary actions: Test Connection / Open Camera
- [ ] Playwright spec `tests/e2e/wire-dashboard-fleet-list.spec.ts`: load Dashboard tab, expect printer rows ≥ 1, click first row, expect Action Window visible with kind=printer
- [ ] Endpoint missing? Mock with `page.route("**/api/printers/list", ...)` in spec; flag in PR

## Coordination

```
1. hermes_list_locks → confirm slot un-claimed
2. hermes_claim_task("HP3D-WIRE-DASHBOARD-FLEET-2026-05-03", agent_id="kilocode-1")
3. git checkout develop && git pull && git checkout -b wire/dashboard-fleet-list
4. wire it
5. npm run test:e2e -- wire-dashboard-fleet-list
6. hermes_append_evidence + hermes_run_gate
7. PR with full DoD checklist
8. on merge: hermes_release_task
9. pick next un-claimed wire slot in KILOCODE_WIRING_PROMPT.md if you finish
```

## Hermes evidence chain: PASS — Task ID: `HP3D-WIRE-DASHBOARD-FLEET-2026-05-03` — gate: tests.e2e
