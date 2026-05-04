# Kilocode Agent 12 — `wire/artifacts-row-click`

You are **kilocode-12**. Slot: `wire/artifacts-row-click`. Task ID: `HP3D-WIRE-ARTIFACTS-ROW-2026-05-03`.

## Read first
[`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`KILOCODE_WIRING_PROMPT.md`](../KILOCODE_WIRING_PROMPT.md). Foundations PRs #11, #12, #13 merged.

## Wire
Artifacts tab rows → Action Window kind=artifact + Download (auth-gated user confirm) + Open Containing Folder + Inspect (if g-code/stl).

## DoD
- [ ] HermesProof claim
- [ ] Rows rendered from `/api/artifacts/list` with size + type + job link
- [ ] Click row → Action Window kind=artifact; primary actions: Download (with confirm dialog per user_privacy rules), Open Folder, Inspect
- [ ] Inspect panel embeds preview for stl/g-code (best-effort, can be a stub iframe to a render service)
- [ ] Playwright: open Artifacts, click first row, Action Window visible kind=artifact, Download button shows

Standard claim/branch/ship/spec/evidence/gate/PR/release.

## Hermes evidence chain: PASS — gate: tests.e2e
