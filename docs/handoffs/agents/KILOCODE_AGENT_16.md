# Kilocode Agent 16 — `wire/source-os-status-pills`

You are **kilocode-16**. Slot: `wire/source-os-status-pills`. Task ID: `HP3D-WIRE-SOURCE-OS-STATUS-PILLS-2026-05-03`.

## Read first
[`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`KILOCODE_WIRING_PROMPT.md`](../KILOCODE_WIRING_PROMPT.md). Foundations PRs #11, #12, #13 merged. Pay special attention to PR #13 — it adds the `install_status` field to `/api/source-apps/status`.

## Wire
Per-module install_status pill rendered on each card in `#sourceModuleList`. Tone: ok=installed, info=installing, warn=not_installed, err=failed.

## DoD
- [ ] HermesProof claim
- [ ] Read `install_status` from the API response (already plumbed by PR #13)
- [ ] Add a small pill `<span class="source-module-card__status">` to each card showing the status
- [ ] CSS in `apps/web/styles.css` for `.source-module-card__status--{ok,info,warn,err}`
- [ ] Pill updates live: poll `/api/source-apps/status` every 4s while at least one app is `installing`; otherwise on tab visibility/focus only
- [ ] Playwright: load Source OS, expect every card to have a pill; pill text matches API status

Standard.

## Hermes evidence chain: PASS — gate: tests.e2e
