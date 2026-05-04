# Windsurf Agent 2 — Dashboard + Jobs buttons (3 branches)

You are **windsurf-2**. Three small button branches, fully E2E each.

## Read first
- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`WINDSURF_PROMPT.md`](../WINDSURF_PROMPT.md)
- Foundations PRs #11, #12, #13 merged. Don't conflict with Kilocode 1, 2, 3 (Dashboard fleet/queue/events) or Kilocode 4, 5 (Jobs search/row).

## Your slots

| Branch | Task ID | What |
|---|---|---|
| `btn/dashboard-refresh` | `HP3D-BTN-DASHBOARD-REFRESH-2026-05-03` | Refresh icon top-right of Dashboard; re-pulls `/api/dashboard/summary` (or composite of fleet+queue+events). Independent from topbar refresh (Kilocode 17 — that's global) |
| `btn/jobs-clear-completed` | `HP3D-BTN-JOBS-CLEAR-COMPLETED-2026-05-03` | "Clear Completed" button → POST `/api/jobs/clear-completed` (extend backend); confirm dialog before destructive action |
| `btn/jobs-export-csv` | `HP3D-BTN-JOBS-EXPORT-CSV-2026-05-03` | "Export CSV" button → GET `/api/jobs/export.csv` (extend backend); browser download with confirm dialog (per user_privacy rules) |

## Per-slot DoD
- [ ] HermesProof claim
- [ ] Button rendered in correct location
- [ ] Backend endpoint added if missing (small, in `main.py`)
- [ ] Confirm dialog for destructive/exfiltration actions
- [ ] Playwright spec at `tests/e2e/btn-<id>.spec.ts`

## Coordination

Standard claim/branch/ship/spec/evidence/gate/PR/release.

## Hermes evidence chain: PASS — gate: tests.e2e
