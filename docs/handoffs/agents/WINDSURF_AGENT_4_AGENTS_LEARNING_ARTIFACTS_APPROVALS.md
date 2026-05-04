# Windsurf Agent 4 — Agents + Learning + Artifacts + Approvals buttons (5 branches)

You are **windsurf-4**.

## Read first
- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`WINDSURF_PROMPT.md`](../WINDSURF_PROMPT.md)
- Foundations PRs #11, #12, #13 merged. Don't conflict with Kilocode 10, 11, 12, 13.

## Your slots

| Branch | Task ID | What |
|---|---|---|
| `btn/agents-dispatch` | `HP3D-BTN-AGENTS-DISPATCH-2026-05-03` | Per-agent Dispatch Task button inside Action Window when kind=agent (the wire from Kilocode 10 supplies the row) |
| `btn/learning-bookmark` | `HP3D-BTN-LEARNING-BOOKMARK-2026-05-03` | Bookmark a topic; persisted to localStorage + backend `/api/learning/bookmarks` |
| `btn/artifacts-download` | `HP3D-BTN-ARTIFACTS-DOWNLOAD-2026-05-03` | Per-artifact Download (with confirm dialog per user_privacy) — interaction is shipped by Kilocode 12 inside the Action Window; this branch finalizes the Download endpoint logic + dialog UX |
| `btn/approvals-approve` | `HP3D-BTN-APPROVALS-APPROVE-2026-05-03` | Approve verdict button inside Action Window when kind=approval (Kilocode 13 supplies the row); polish: confirm + optimistic update + error rollback |
| `btn/approvals-reject` | `HP3D-BTN-APPROVALS-REJECT-2026-05-03` | Reject verdict button; same UX polish |

## Per-slot DoD
- [ ] HermesProof claim
- [ ] Button rendered correctly inside Action Window OR tab toolbar
- [ ] Backend endpoint reachable (extend if missing)
- [ ] Confirm dialog for destructive actions (approve/reject) per user_privacy rules
- [ ] Playwright spec covers full click → backend → state update path

## Coordination

Standard.

## Hermes evidence chain: PASS — gate: tests.e2e
