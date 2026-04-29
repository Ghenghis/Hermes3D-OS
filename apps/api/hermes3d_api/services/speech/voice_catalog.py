from __future__ import annotations

import os
from typing import Any

import httpx


AGENT_VOICE_DEFAULTS: dict[str, str] = {
    "factory_operator": "en-GB-MaisieNeural",
    "modeling_agent": "en-US-AriaNeural",
    "print_safety_agent": "en-AU-CarlyNeural",
    "mesh_repair_agent": "en-US-AriaNeural",
    "mesh_qa_agent": "en-AU-CarlyNeural",
    "slicer_qa_agent": "en-US-JennyNeural",
    "print_monitor_agent": "en-GB-RyanNeural",
    "research_agent": "en-US-GuyNeural",
    "privacy_agent": "en-US-AvaNeural",
}

FALLBACK_ENGLISH_VOICES: list[dict[str, Any]] = [
    {
        "Name": "en-GB-MaisieNeural",
        "DisplayName": "Maisie",
        "LocalName": "Maisie",
        "ShortName": "en-GB-MaisieNeural",
        "Gender": "Female",
        "Locale": "en-GB",
        "VoiceType": "Neural",
    },
    {
        "Name": "en-US-JennyNeural",
        "DisplayName": "Jenny",
        "LocalName": "Jenny",
        "ShortName": "en-US-JennyNeural",
        "Gender": "Female",
        "Locale": "en-US",
        "VoiceType": "Neural",
    },
    {
        "Name": "en-AU-CarlyNeural",
        "DisplayName": "Carly",
        "LocalName": "Carly",
        "ShortName": "en-AU-CarlyNeural",
        "Gender": "Female",
        "Locale": "en-AU",
        "VoiceType": "Neural",
    },
    {
        "Name": "en-US-AriaNeural",
        "DisplayName": "Aria",
        "LocalName": "Aria",
        "ShortName": "en-US-AriaNeural",
        "Gender": "Female",
        "Locale": "en-US",
        "VoiceType": "Neural",
    },
    {
        "Name": "en-US-GuyNeural",
        "DisplayName": "Guy",
        "LocalName": "Guy",
        "ShortName": "en-US-GuyNeural",
        "Gender": "Male",
        "Locale": "en-US",
        "VoiceType": "Neural",
    },
    {
        "Name": "en-GB-RyanNeural",
        "DisplayName": "Ryan",
        "LocalName": "Ryan",
        "ShortName": "en-GB-RyanNeural",
        "Gender": "Male",
        "Locale": "en-GB",
        "VoiceType": "Neural",
    },
    {
        "Name": "en-US-AvaNeural",
        "DisplayName": "Ava",
        "LocalName": "Ava",
        "ShortName": "en-US-AvaNeural",
        "Gender": "Female",
        "Locale": "en-US",
        "VoiceType": "Neural",
    },
    {
        "Name": "en-US-AndrewNeural",
        "DisplayName": "Andrew",
        "LocalName": "Andrew",
        "ShortName": "en-US-AndrewNeural",
        "Gender": "Male",
        "Locale": "en-US",
        "VoiceType": "Neural",
    },
    {
        "Name": "en-CA-ClaraNeural",
        "DisplayName": "Clara",
        "LocalName": "Clara",
        "ShortName": "en-CA-ClaraNeural",
        "Gender": "Female",
        "Locale": "en-CA",
        "VoiceType": "Neural",
    },
    {
        "Name": "en-IE-ConnorNeural",
        "DisplayName": "Connor",
        "LocalName": "Connor",
        "ShortName": "en-IE-ConnorNeural",
        "Gender": "Male",
        "Locale": "en-IE",
        "VoiceType": "Neural",
    },
    {
        "Name": "en-IN-NeerjaNeural",
        "DisplayName": "Neerja",
        "LocalName": "Neerja",
        "ShortName": "en-IN-NeerjaNeural",
        "Gender": "Female",
        "Locale": "en-IN",
        "VoiceType": "Neural",
    },
]


def resolve_env_value(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    text = value.strip()
    if text.startswith("${") and text.endswith("}") and len(text) > 3:
        return os.getenv(text[2:-1], "")
    return value


def speech_config_from_services(services: dict[str, Any]) -> dict[str, Any]:
    raw_speech = services.get("speech", {})
    speech = raw_speech if isinstance(raw_speech, dict) else {}
    raw_azure = speech.get("azure", {})
    azure = raw_azure if isinstance(raw_azure, dict) else {}
    normalized_azure = {key: resolve_env_value(value) for key, value in azure.items()}

    raw_agents = services.get("agents", {})
    agents = raw_agents if isinstance(raw_agents, dict) else {}
    for agent_id, voice in AGENT_VOICE_DEFAULTS.items():
        if not isinstance(agents.get(agent_id), dict):
            agents[agent_id] = {"voice": voice}
        elif not agents[agent_id].get("voice"):
            agents[agent_id]["voice"] = voice

    return {
        "provider": speech.get("provider", "azure"),
        "azure": {
            "speech_key": normalized_azure.get("speech_key") or os.getenv("AZURE_SPEECH_KEY", ""),
            "region": normalized_azure.get("region") or os.getenv("AZURE_SPEECH_REGION", ""),
            "default_voice": normalized_azure.get("default_voice", "en-GB-MaisieNeural"),
            "fallback_voice": normalized_azure.get("fallback_voice", "en-US-JennyNeural"),
            "output_format": normalized_azure.get(
                "output_format", "audio-24khz-96kbitrate-mono-mp3"
            ),
            "enable_ssml": _as_bool(normalized_azure.get("enable_ssml", True)),
            "enable_stt": _as_bool(normalized_azure.get("enable_stt", True)),
            "timeout_seconds": float(normalized_azure.get("timeout_seconds", 30)),
        },
        "agents": agents,
        "raw": speech,
    }


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() not in {"0", "false", "no", "off"}
    return bool(value)


def azure_is_configured(config: dict[str, Any]) -> bool:
    azure = config.get("azure", {})
    return bool(azure.get("speech_key") and azure.get("region"))


def _voice_id(voice: dict[str, Any]) -> str:
    return str(voice.get("ShortName") or voice.get("Name") or voice.get("id") or "")


def english_voices_only(voices: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for voice in voices:
        locale = str(voice.get("Locale") or voice.get("locale") or "")
        short_name = _voice_id(voice)
        if locale.lower().startswith("en-") or short_name.lower().startswith("en-"):
            result.append(voice)
    return result


async def fetch_azure_voice_catalog(config: dict[str, Any]) -> tuple[list[dict[str, Any]], str]:
    azure = config.get("azure", {})
    key = azure.get("speech_key")
    region = azure.get("region")
    if not key or not region:
        return FALLBACK_ENGLISH_VOICES, "fallback"

    url = f"https://{region}.tts.speech.microsoft.com/cognitiveservices/voices/list"
    async with httpx.AsyncClient(timeout=float(azure.get("timeout_seconds") or 30)) as client:
        response = await client.get(url, headers={"Ocp-Apim-Subscription-Key": str(key)})
        response.raise_for_status()
    voices = response.json()
    if not isinstance(voices, list):
        return FALLBACK_ENGLISH_VOICES, "fallback"
    english = english_voices_only([voice for voice in voices if isinstance(voice, dict)])
    return english or FALLBACK_ENGLISH_VOICES, "azure"
