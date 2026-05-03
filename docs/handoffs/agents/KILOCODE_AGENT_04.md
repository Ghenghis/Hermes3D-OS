# Kilocode Agent 4 — `wire/jobs-search-filter`

You are **kilocode-4**.

## Read first
- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`KILOCODE_WIRING_PROMPT.md`](../KILOCODE_WIRING_PROMPT.md)
- Foundations PRs #11, #12, #13 merged

## Your slot

| Branch | Task ID |
|---|---|
| `wire/jobs-search-filter` | `HP3D-WIRE-JOBS-SEARCH-2026-05-03` |

**Wire:** Add search input + status filter chips to the Jobs tab. Filters update `#jobsList` without page reload.

## DoD

- [ ] HermesProof claim
- [ ] Search input filters by job title / id substring
- [ ] Status chips: `queued | running | done | failed | canceled` (multi-select toggles)
- [ ] State preserved during current session (not persisted across reloads — that would be `setting/jobs-filter` for Windsurf)
- [ ] Playwright spec covers: type "test" → row count drops; click status chip → row count drops; clear → full count restored
- [ ] No new API endpoints — filter purely client-side over existing `/api/jobs/list` payload

## Coordination

Standard claim/branch/ship/spec/evidence/gate/PR/release.

## Hermes evidence chain: PASS — Task ID: `HP3D-WIRE-JOBS-SEARCH-2026-05-03` — gate: tests.e2e
