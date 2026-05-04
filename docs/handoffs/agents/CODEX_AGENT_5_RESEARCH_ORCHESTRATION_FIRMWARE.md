# Codex Agent 5 — Research + Orchestration + Firmware (11 light apps)

You are **codex-5**. Long tail of clone-shallow source viewers + pip orchestration libs + research packages. Most slots are 5-10 minutes each — you'll plow through them.

## Read first

- [`SPLIT_PLAN.md`](../SPLIT_PLAN.md), [`CODEX_APP_INSTALLS_PROMPT.md`](../CODEX_APP_INSTALLS_PROMPT.md)
- Foundations PRs #11, #12, #13 must be merged

## Your slots

### Research (3D generation models)

| Branch | Task ID | App | Method |
|---|---|---|---|
| `app/triposr` | `HP3D-APP-TRIPOSR-2026-05-03` | TripoSR | clone-full + pip requirements + venv |
| `app/hunyuan3d21` | `HP3D-APP-HUNYUAN3D21-2026-05-03` | Hunyuan3D 2.1 | clone-shallow (research; install only on GPU host — N/A launcher) |
| `app/trellis2` | `HP3D-APP-TRELLIS2-2026-05-03` | Trellis2 | clone-shallow (research) |
| `app/comfyui-trellis2` | `HP3D-APP-COMFYUI-TRELLIS2-2026-05-03` | ComfyUI-Trellis2 plugin | clone-shallow into ComfyUI custom_nodes |

### Orchestration / agent stack

| Branch | Task ID | App | Method |
|---|---|---|---|
| `app/langgraph` | `HP3D-APP-LANGGRAPH-2026-05-03` | LangGraph | pip |
| `app/langchain` | `HP3D-APP-LANGCHAIN-2026-05-03` | LangChain | pip |
| `app/model-context-protocol` | `HP3D-APP-MCP-2026-05-03` | model-context-protocol | pip install mcp |
| `app/kiln` | `HP3D-APP-KILN-2026-05-03` | Kiln-AI | pip install kiln-ai |
| `app/azure-speech-sdk-js` | `HP3D-APP-AZURE-SPEECH-2026-05-03` | Azure Speech SDK JS (free local SDK; no Azure account required for offline build) | clone-shallow + npm ci |

### Firmware (clone-shallow source viewers, no flashing)

| Branch | Task ID | App | Method |
|---|---|---|---|
| `app/marlin` | `HP3D-APP-MARLIN-2026-05-03` | Marlin | clone-shallow |
| `app/prusa-firmware` | `HP3D-APP-PRUSA-FW-2026-05-03` | Prusa Firmware | clone-shallow |

## DoD per slot (lean — many are source-viewer only)

1. Manifest entry with `install` block
2. (For pip) probe-installed in dispatcher; (for clone-shallow) just clone
3. (Source-viewer apps) launcher = N/A — Action Window shows readme + repo + license panel
4. Action Window card
5. Playwright spec at `tests/e2e/app-<id>.spec.ts` — at minimum: Install button click → installed pill within 60s

## Coordination

```
1. hermes_list_locks
2. hermes_claim_task("HP3D-APP-<ID>-2026-05-03", agent_id="codex-5")
3. ship branch
4. evidence + gate + PR + release
```

11 slots — race through them. If any other Codex agent finishes early and steals from your list, no problem; pick the next un-claimed slot.
