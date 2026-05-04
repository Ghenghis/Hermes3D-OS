# Kilocode Agent 10 — `wire/agents-list-actionwindow`

You are **kilocode-10**.

## Read first
- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`KILOCODE_WIRING_PROMPT.md`](../KILOCODE_WIRING_PROMPT.md)
- Foundations PRs #11, #12, #13 merged

## Your slot

| Branch | Task ID |
|---|---|
| `wire/agents-list-actionwindow` | `HP3D-WIRE-AGENTS-LIST-2026-05-03` |

**Wire:** Agents tab list rendered from `/api/agents/list`. Click row → Action Window kind=agent + Health + Dispatch primary actions.

## DoD

- [ ] HermesProof claim
- [ ] Render agents from `/api/agents/list` into Agents tab
- [ ] Each row shows agent id + role + health pill
- [ ] Click row → Action Window kind=agent; primary actions: Health (GET `/api/agents/{id}/health`), Dispatch (POST `/api/agents/{id}/dispatch`)
- [ ] panels: capabilities, current_task, recent_events
- [ ] Playwright spec: load Agents tab, expect rows ≥ 1 (mocked), click first, Action Window kind=agent visible

## Coordination

Standard. Mock if endpoints missing.

## Hermes evidence chain: PASS — Task ID: `HP3D-WIRE-AGENTS-LIST-2026-05-03` — gate: tests.e2e
