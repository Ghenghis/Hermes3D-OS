# Kilocode Agent 13 — `wire/approvals-pending-actionwindow`

You are **kilocode-13**. Slot: `wire/approvals-pending-actionwindow`. Task ID: `HP3D-WIRE-APPROVALS-PENDING-2026-05-03`.

## Read first
[`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`KILOCODE_WIRING_PROMPT.md`](../KILOCODE_WIRING_PROMPT.md). Foundations PRs #11, #12, #13 merged.

## Wire
Approvals tab pending list → Action Window kind=approval + Approve + Reject buttons.

## DoD
- [ ] HermesProof claim
- [ ] Render `/api/approvals/pending` rows with kind, requester, summary, age
- [ ] Click row → Action Window kind=approval; primary actions: Approve (POST `/api/approvals/{id}/verdict` body={verdict:"approved"}) + Reject (verdict:"rejected")
- [ ] After verdict, list refreshes; if 0 pending, show empty state
- [ ] Playwright: open Approvals, click first pending row, Action Window kind=approval visible, both buttons present

Standard.

## Hermes evidence chain: PASS — gate: tests.e2e
