# Hermes3D-OS Voice Layer

Hermes3D-OS treats voice as a core operator interface for the print factory, not as a cosmetic add-on.

## Architecture

```text
Voice tab / agent event
  -> Hermes speech router
  -> Azure Speech provider
  -> transcript ledger
  -> audio artifact
  -> browser playback / safety alert
```

The implementation follows the useful OpenClaw 2026.4.26 pattern without copying project code: separate provider capability, per-agent overrides, policy-gated `[[tts:...]]` directives, local transcripts, and browser controls that call the backend instead of exposing speech keys.

## Azure Setup

Set these in `.env`:

```text
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=
```

Voice config lives in `configs/services.local.yaml`:

```yaml
speech:
  provider: azure
  azure:
    speech_key: ${AZURE_SPEECH_KEY}
    region: ${AZURE_SPEECH_REGION}
    default_voice: en-GB-MaisieNeural
    fallback_voice: en-US-JennyNeural
    output_format: audio-24khz-96kbitrate-mono-mp3
    enable_ssml: true
    enable_stt: true
```

Hermes fetches the current English voice catalog from Azure when credentials are configured. If credentials are missing, the UI shows a small fallback catalog so voice assignment can still be designed.

## Agent Voices

Default assignments:

- `factory_operator`: `en-GB-MaisieNeural`
- `modeling_agent`: `en-US-AriaNeural`
- `print_safety_agent`: `en-AU-CarlyNeural`
- `mesh_repair_agent`: `en-US-AriaNeural`
- `mesh_qa_agent`: `en-AU-CarlyNeural`
- `slicer_qa_agent`: `en-US-JennyNeural`
- `print_monitor_agent`: `en-GB-RyanNeural`
- `research_agent`: `en-US-GuyNeural`
- `privacy_agent`: `en-US-AvaNeural`

The Voice tab can save per-agent voices back to `configs/services.local.yaml`.

## Directives

Hermes supports OpenClaw-style directives:

```text
[[tts:voice=en-US-JennyNeural;style=cheerful;rate=+8%;tone=success]]
Dave, the mesh repair pass finished.
```

Audio-only text blocks are supported:

```text
[[tts:text]]
Warning. Bed temperature is drifting.
[[/tts:text]]
```

Provider switching is intentionally constrained to Azure for now. Future providers should use the same router contract.

## Safety Defaults

- Push-to-talk is the default.
- Wake/listen mode is staged as a visible local privacy boundary.
- Safety alerts use short SSML warnings and transcript logging.
- Raw audio is not stored by default; generated TTS audio is stored under `storage/speech/audio`.
- Transcript JSONL is stored at `storage/speech/transcripts.jsonl`.

## API

- `GET /api/speech/status`
- `GET /api/speech/voices`
- `GET /api/speech/agents`
- `PATCH /api/speech/agents/{agent_id}/voice`
- `POST /api/speech/preview`
- `POST /api/speech/tts`
- `POST /api/speech/stt`
- `GET /api/speech/transcripts`

## Sources

- Azure Text to Speech REST: <https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech>
- Azure Speech to Text REST: <https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-speech-to-text>
- Azure SSML: <https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup>
- OpenClaw TTS docs: <https://docs.openclaw.ai/tools/tts>
- OpenClaw 2026.4.26 release: <https://github.com/openclaw/openclaw/releases/tag/v2026.4.26>
