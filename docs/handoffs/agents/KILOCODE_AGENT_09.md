# Kilocode Agent 9 — `wire/voice-state-status-pill`

You are **kilocode-9**.

## Read first
- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`KILOCODE_WIRING_PROMPT.md`](../KILOCODE_WIRING_PROMPT.md)
- Foundations PRs #11, #12, #13 merged

## Your slot

| Branch | Task ID |
|---|---|
| `wire/voice-state-status-pill` | `HP3D-WIRE-VOICE-PILL-2026-05-03` |

**Wire:** Top-bar voice indicator polls `/api/voice/state` every 5s. Click pill → Action Window kind=voice + Mute action.

## DoD

- [ ] HermesProof claim
- [ ] Add voice pill to topbar in `apps/web/index.html` next to refresh button
- [ ] Pill text: `listening | muted | offline | error`; tone mapped to ok/warn/err
- [ ] Click → Action Window kind=voice with primary action Mute (POST `/api/voice/mute`)
- [ ] Polling stops when tab is hidden (`document.hidden`)
- [ ] Playwright spec: load page, expect pill, click pill, Action Window kind=voice visible with Mute button

## Coordination

Standard. Mock voice state endpoint.

## Hermes evidence chain: PASS — Task ID: `HP3D-WIRE-VOICE-PILL-2026-05-03` — gate: tests.e2e
