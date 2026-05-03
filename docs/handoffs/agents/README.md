# Per-agent prompts

One file per concrete agent instance. Each prompt is self-contained: identity, slot(s), DoD checklist, and HermesProof coordination loop.

## Index

### Codex (5 agents — install + setup half of all apps)

| Agent | File | Slots |
|---|---|---|
| codex-1 | [CODEX_AGENT_1_SLICERS.md](CODEX_AGENT_1_SLICERS.md) | 5 slicer apps |
| codex-2 | [CODEX_AGENT_2_MODELERS.md](CODEX_AGENT_2_MODELERS.md) | 5 modeler apps |
| codex-3 | [CODEX_AGENT_3_PRINT_FARM_CORE.md](CODEX_AGENT_3_PRINT_FARM_CORE.md) | 5 print-farm services |
| codex-4 | [CODEX_AGENT_4_PRINT_FARM_EXTRAS_AND_GENERATION.md](CODEX_AGENT_4_PRINT_FARM_EXTRAS_AND_GENERATION.md) | 6 dashboards + 3D-gen |
| codex-5 | [CODEX_AGENT_5_RESEARCH_ORCHESTRATION_FIRMWARE.md](CODEX_AGENT_5_RESEARCH_ORCHESTRATION_FIRMWARE.md) | 11 research + orchestration + firmware |

### Kilocode (20 agents — pure GUI wiring, no installs)

| Agent | File | Slot |
|---|---|---|
| kilocode-01 | [KILOCODE_AGENT_01.md](KILOCODE_AGENT_01.md) | wire/dashboard-fleet-list |
| kilocode-02 | [KILOCODE_AGENT_02.md](KILOCODE_AGENT_02.md) | wire/dashboard-queue-list |
| kilocode-03 | [KILOCODE_AGENT_03.md](KILOCODE_AGENT_03.md) | wire/dashboard-events-tail |
| kilocode-04 | [KILOCODE_AGENT_04.md](KILOCODE_AGENT_04.md) | wire/jobs-search-filter |
| kilocode-05 | [KILOCODE_AGENT_05.md](KILOCODE_AGENT_05.md) | wire/jobs-row-click-actionwindow |
| kilocode-06 | [KILOCODE_AGENT_06.md](KILOCODE_AGENT_06.md) | wire/printers-row-click-actionwindow |
| kilocode-07 | [KILOCODE_AGENT_07.md](KILOCODE_AGENT_07.md) | wire/printers-discover-button |
| kilocode-08 | [KILOCODE_AGENT_08.md](KILOCODE_AGENT_08.md) | wire/observe-camera-tile-click |
| kilocode-09 | [KILOCODE_AGENT_09.md](KILOCODE_AGENT_09.md) | wire/voice-state-status-pill |
| kilocode-10 | [KILOCODE_AGENT_10.md](KILOCODE_AGENT_10.md) | wire/agents-list-actionwindow |
| kilocode-11 | [KILOCODE_AGENT_11.md](KILOCODE_AGENT_11.md) | wire/learning-topics-actionwindow |
| kilocode-12 | [KILOCODE_AGENT_12.md](KILOCODE_AGENT_12.md) | wire/artifacts-row-click |
| kilocode-13 | [KILOCODE_AGENT_13.md](KILOCODE_AGENT_13.md) | wire/approvals-pending-actionwindow |
| kilocode-14 | [KILOCODE_AGENT_14.md](KILOCODE_AGENT_14.md) | wire/source-os-search |
| kilocode-15 | [KILOCODE_AGENT_15.md](KILOCODE_AGENT_15.md) | wire/source-os-group-tabs |
| kilocode-16 | [KILOCODE_AGENT_16.md](KILOCODE_AGENT_16.md) | wire/source-os-status-pills |
| kilocode-17 | [KILOCODE_AGENT_17.md](KILOCODE_AGENT_17.md) | wire/topbar-refresh-button |
| kilocode-18 | [KILOCODE_AGENT_18.md](KILOCODE_AGENT_18.md) | wire/action-window-history |
| kilocode-19 | [KILOCODE_AGENT_19.md](KILOCODE_AGENT_19.md) | wire/action-window-pin |
| kilocode-20 | [KILOCODE_AGENT_20.md](KILOCODE_AGENT_20.md) | wire/global-event-bus-logger |

### Windsurf (5 agents — settings + buttons + reference cards)

| Agent | File | Scope |
|---|---|---|
| windsurf-1 | [WINDSURF_AGENT_1_SETTINGS.md](WINDSURF_AGENT_1_SETTINGS.md) | 6 settings (font/theme/ports/camera/telemetry) |
| windsurf-2 | [WINDSURF_AGENT_2_DASHBOARD_AND_JOBS_BUTTONS.md](WINDSURF_AGENT_2_DASHBOARD_AND_JOBS_BUTTONS.md) | 3 dashboard/jobs buttons |
| windsurf-3 | [WINDSURF_AGENT_3_PRINTERS_OBSERVE_VOICE.md](WINDSURF_AGENT_3_PRINTERS_OBSERVE_VOICE.md) | 3 printers/observe/voice buttons |
| windsurf-4 | [WINDSURF_AGENT_4_AGENTS_LEARNING_ARTIFACTS_APPROVALS.md](WINDSURF_AGENT_4_AGENTS_LEARNING_ARTIFACTS_APPROVALS.md) | 5 buttons across agents/learning/artifacts/approvals |
| windsurf-5 | [WINDSURF_AGENT_5_REFERENCE_APP_CARDS.md](WINDSURF_AGENT_5_REFERENCE_APP_CARDS.md) | ~24 reference-only app source-viewer cards |

## Foundations (Claude — already in flight)

- [PR #11 foundation/playwright-harness](https://github.com/Ghenghis/Hermes3D-OS/pull/11)
- [PR #12 foundation/action-window](https://github.com/Ghenghis/Hermes3D-OS/pull/12)
- [PR #13 foundation/install-endpoint](https://github.com/Ghenghis/Hermes3D-OS/pull/13)

All 30 agents wait for these to merge to `develop` before starting their parallel work.

## Coordination contract (every agent, every slot)

```
1. hermes_list_locks                               # see who's holding what
2. hermes_claim_task(<task_id>, agent_id="<n>")    # claim before coding
3. git checkout develop && git pull && git checkout -b <branch>
4. ship the slot per its DoD
5. write Playwright spec at tests/e2e/<branch>.spec.ts
6. npm run test:e2e -- <branch>
7. hermes_append_evidence + hermes_run_gate
8. open PR with full DoD checklist
9. on merge: hermes_release_task(<task_id>, "merged")
10. pick next un-claimed slot
```

## Race rule

Claim before code. If a slot is locked, pick the next un-claimed slot in the same agent's list (or any other agent's list if you've finished yours and helping).
