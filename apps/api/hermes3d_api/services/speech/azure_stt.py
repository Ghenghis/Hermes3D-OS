from __future__ import annotations

import json
from typing import Any

import httpx


class AzureSpeechStt:
    def __init__(self, speech_config: dict[str, Any]) -> None:
        self.speech_config = speech_config
        self.azure = speech_config.get("azure", {})

    def configured(self) -> bool:
        return bool(
            self.azure.get("enable_stt", True)
            and self.azure.get("speech_key")
            and self.azure.get("region")
        )

    async def transcribe_bytes(
        self,
        *,
        audio: bytes,
        filename: str,
        content_type: str,
        locale: str = "en-US",
    ) -> dict[str, Any]:
        if not self.configured():
            raise RuntimeError("Azure Speech STT is not configured or is disabled.")
        region = self.azure["region"]
        endpoint = (
            f"https://{region}.api.cognitive.microsoft.com"
            "/speechtotext/transcriptions:transcribe?api-version=2025-10-15"
        )
        definition = {
            "locales": [locale],
            "profanityFilterMode": "Masked",
            "channels": [0, 1],
        }
        files = {
            "audio": (filename, audio, content_type or "application/octet-stream"),
            "definition": (None, json.dumps(definition), "application/json"),
        }
        async with httpx.AsyncClient(timeout=float(self.azure.get("timeout_seconds") or 30)) as client:
            response = await client.post(
                endpoint,
                headers={"Ocp-Apim-Subscription-Key": str(self.azure["speech_key"])},
                files=files,
            )
            response.raise_for_status()
        payload = response.json()
        return {
            "provider": "azure",
            "locale": locale,
            "text": _extract_transcript(payload),
            "raw": payload,
        }


def _extract_transcript(payload: dict[str, Any]) -> str:
    combined = payload.get("combinedPhrases")
    if isinstance(combined, list):
        text = " ".join(
            str(item.get("text") or item.get("display") or "")
            for item in combined
            if isinstance(item, dict)
        ).strip()
        if text:
            return text
    phrases = payload.get("phrases")
    if isinstance(phrases, list):
        text = " ".join(
            str(item.get("text") or item.get("display") or "")
            for item in phrases
            if isinstance(item, dict)
        ).strip()
        if text:
            return text
    return str(payload.get("text") or payload.get("displayText") or "").strip()
