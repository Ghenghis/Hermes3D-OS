# Windsurf Agent 5 — Reference-only app source-viewer cards (~24 branches)

You are **windsurf-5**. Long tail of clone-shallow source-viewer apps. Each branch is tiny (~5-10 minutes for an SWE-fast model): manifest entry + Action Window source-viewer + readme renderer + Playwright spec.

## Read first
- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`WINDSURF_PROMPT.md`](../WINDSURF_PROMPT.md)
- Foundations PRs #11, #12, #13 merged
- Don't claim apps already on Codex's lane (CODEX_APP_INSTALLS_PROMPT.md) or Claude's heavy-build lane (CLAUDE_LANES.md)

## Your slots (race through them)

| Branch | App |
|---|---|
| `app/slic3r` | Slic3r — clone-shallow |
| `app/bambustudio` | BambuStudio — clone-shallow |
| `app/mattercontrol` | MatterControl — clone-shallow |
| `app/kiri-moto` | Kiri:Moto — clone-shallow |
| `app/strecs3d` | Strecs3D — clone-shallow |
| `app/curaengine` (if Codex 1 not claimed) | CuraEngine — clone-shallow |
| `app/superslicer` (if Codex 1 not claimed) | SuperSlicer — clone-shallow |
| `app/meshlab` (if Codex 2 not claimed) | MeshLab — clone-shallow |
| `app/marlin` (if Codex 5 not claimed) | Marlin — clone-shallow |
| `app/prusa-firmware` (if Codex 5 not claimed) | Prusa FW — clone-shallow |
| `app/reprapfirmware` | RepRapFirmware — clone-shallow |
| `app/smoothieware` | Smoothieware — clone-shallow |
| `app/repetier-firmware` | Repetier FW — clone-shallow |
| `app/boxturtle` | BoxTurtle — clone-shallow |
| `app/enraged-rabbit` | Enraged Rabbit — clone-shallow |
| `app/awesome-extruders` | Awesome Extruders — clone-shallow |
| `app/awesome-3d-printing` | Awesome 3D Printing — clone-shallow |
| `app/open-filament-database` | Open Filament Database — clone-shallow + parse JSON |
| `app/octofarm` (if Codex 4 not claimed) | OctoFarm — clone-shallow viewer |
| `app/fdm-monster` (if Codex 4 not claimed) | FDM Monster — clone-shallow viewer |
| `app/hunyuan3d21` (if Codex 5 not claimed) | Hunyuan3D 2.1 — clone-shallow research |
| `app/trellis2` (if Codex 5 not claimed) | Trellis2 — clone-shallow research |
| `app/comfyui-trellis2` (if Codex 5 not claimed) | ComfyUI-Trellis2 plugin — clone-shallow |
| `app/azure-speech-sdk-js` (if Codex 5 not claimed) | Azure Speech SDK JS — clone-shallow |

Task ID format: `HP3D-APP-<ID>-2026-05-03`.

## Per-slot DoD (tiny scope)

- [ ] HermesProof claim
- [ ] Manifest entry gets `install: { method: "clone-shallow", repo: "<from existing entry>" }`
- [ ] Action Window when card clicked: shows facts + opens README.md (rendered as iframe to `/api/source-apps/<id>/readme` or via marked.js client-side)
- [ ] Launcher: N/A (these are source-viewers, not runnable apps) — explicitly documented
- [ ] Playwright spec: open Source OS, find card, click Install → installed pill within 60s, click Open README → readme panel visible

## Coordination

```
1. hermes_list_locks
2. hermes_claim_task("HP3D-APP-<ID>-2026-05-03", agent_id="windsurf-5")
3. ship branch (~5-10 min)
4. evidence + gate + PR + release
5. next slot — race through them
```

## Race target

24 reference cards in 4-6 hours for a fast SWE model. Quality over quantity, but ship steadily.

## Hermes evidence chain: PASS — gate: tests.e2e
