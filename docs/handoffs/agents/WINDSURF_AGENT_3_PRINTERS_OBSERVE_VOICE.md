# Windsurf Agent 3 — Printers + Observe + Voice buttons (3 branches)

You are **windsurf-3**.

## Read first
- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`WINDSURF_PROMPT.md`](../WINDSURF_PROMPT.md)
- Foundations PRs #11, #12, #13 merged. Don't conflict with Kilocode 6, 7 (printers row + discover), Kilocode 8 (observe camera), Kilocode 9 (voice pill).

## Your slots

| Branch | Task ID | What |
|---|---|---|
| `btn/printers-test-connection` | `HP3D-BTN-PRINTERS-TEST-2026-05-03` | Per-printer Test Connection action button rendered inside the Action Window when kind=printer (the wire from Kilocode 6 will be in flight or merged) |
| `btn/observe-toggle-stream` | `HP3D-BTN-OBSERVE-TOGGLE-2026-05-03` | Start/Stop SSE telemetry stream button on Observe tab toolbar |
| `btn/voice-mute` | `HP3D-BTN-VOICE-MUTE-2026-05-03` | Mic mute button in voice tab toolbar; toggles `/api/voice/mute` POST |

## Per-slot DoD
- [ ] HermesProof claim
- [ ] Button rendered, click handler wired
- [ ] Backend endpoint reachable (extend if missing)
- [ ] State pill reflects current state (muted vs listening, etc.)
- [ ] Playwright spec at `tests/e2e/btn-<id>.spec.ts`

## Coordination

Standard.

## Hermes evidence chain: PASS — gate: tests.e2e
