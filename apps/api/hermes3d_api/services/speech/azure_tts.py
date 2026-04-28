from __future__ import annotations

import re
import time
from pathlib import Path
from typing import Any

import httpx

from .ssml_builder import build_ssml, parse_voice_directives


MIME_BY_EXTENSION = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".webm": "audio/webm",
}


def extension_for_output_format(output_format: str) -> str:
    lowered = output_format.lower()
    if "riff" in lowered or "wav" in lowered:
        return ".wav"
    if "ogg" in lowered or "opus" in lowered:
        return ".ogg"
    if "webm" in lowered:
        return ".webm"
    return ".mp3"


class AzureSpeechTts:
    def __init__(self, speech_config: dict[str, Any], storage_dir: Path) -> None:
        self.speech_config = speech_config
        self.azure = speech_config.get("azure", {})
        self.storage_dir = storage_dir

    def configured(self) -> bool:
        return bool(self.azure.get("speech_key") and self.azure.get("region"))

    async def synthesize_to_file(
        self,
        *,
        text: str,
        agent_id: str,
        voice: str,
        style: str | None = None,
        rate: str | None = None,
        pitch: str | None = None,
        tone: str | None = None,
        ssml: str | None = None,
    ) -> dict[str, Any]:
        if not self.configured():
            raise RuntimeError("Azure Speech is not configured. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.")
        parsed = parse_voice_directives(text)
        selected_voice = parsed.voice or voice or self.azure.get("default_voice")
        selected_style = parsed.style or style
        selected_rate = parsed.rate or rate
        selected_pitch = parsed.pitch or pitch
        selected_tone = parsed.tone or tone
        spoken_text = parsed.text or text
        output_format = str(self.azure.get("output_format") or "audio-24khz-96kbitrate-mono-mp3")
        payload_ssml = ssml or build_ssml(
            spoken_text,
            str(selected_voice),
            style=selected_style,
            rate=selected_rate,
            pitch=selected_pitch,
            tone=selected_tone,
        )

        token = await self._fetch_token()
        region = self.azure["region"]
        endpoint = f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": output_format,
            "User-Agent": "Hermes3D-OS",
        }
        async with httpx.AsyncClient(timeout=float(self.azure.get("timeout_seconds") or 30)) as client:
            response = await client.post(endpoint, content=payload_ssml.encode("utf-8"), headers=headers)
            response.raise_for_status()

        audio_dir = self.storage_dir / "speech" / "audio"
        audio_dir.mkdir(parents=True, exist_ok=True)
        extension = extension_for_output_format(output_format)
        filename = f"{int(time.time() * 1000)}-{_safe_name(agent_id)}{extension}"
        audio_path = audio_dir / filename
        audio_path.write_bytes(response.content)
        return {
            "provider": "azure",
            "agent_id": agent_id,
            "voice": selected_voice,
            "text": spoken_text,
            "audio_path": str(audio_path),
            "audio_url": f"/api/speech/audio/{filename}",
            "mime_type": MIME_BY_EXTENSION.get(extension, "audio/mpeg"),
            "output_format": output_format,
            "warnings": parsed.warnings,
        }

    async def _fetch_token(self) -> str:
        region = self.azure["region"]
        url = f"https://{region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
        headers = {
            "Ocp-Apim-Subscription-Key": str(self.azure["speech_key"]),
            "Content-Length": "0",
        }
        async with httpx.AsyncClient(timeout=float(self.azure.get("timeout_seconds") or 30)) as client:
            response = await client.post(url, headers=headers)
            response.raise_for_status()
        return response.text


def _safe_name(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_.-]+", "-", value).strip("-") or "agent"
