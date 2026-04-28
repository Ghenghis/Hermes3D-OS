from __future__ import annotations

import re
from dataclasses import dataclass, field
from html import escape


DIRECTIVE_RE = re.compile(r"\[\[\s*tts\s*:\s*([^\]]+)\]\]", re.IGNORECASE)
HIDDEN_TEXT_RE = re.compile(
    r"\[\[\s*tts\s*:\s*text\s*\]\]([\s\S]*?)\[\[\s*/\s*tts\s*:\s*text\s*\]\]",
    re.IGNORECASE,
)
PLAIN_TTS_RE = re.compile(
    r"\[\[\s*tts\s*\]\]([\s\S]*?)\[\[\s*/\s*tts\s*\]\]",
    re.IGNORECASE,
)
TTS_TAG_RE = re.compile(r"\[\[\s*/?\s*tts(?:\s*:\s*[^\]]*)?\]\]", re.IGNORECASE)


@dataclass
class VoiceDirectives:
    text: str
    voice: str | None = None
    style: str | None = None
    rate: str | None = None
    pitch: str | None = None
    tone: str | None = None
    provider: str | None = None
    warnings: list[str] = field(default_factory=list)
    has_directive: bool = False


def parse_voice_directives(text: str) -> VoiceDirectives:
    result = VoiceDirectives(text=text)

    hidden = HIDDEN_TEXT_RE.search(result.text)
    if hidden:
        result.text = hidden.group(1).strip()
        result.has_directive = True
    else:
        plain = PLAIN_TTS_RE.search(result.text)
        if plain:
            visible = plain.group(1).strip()
            result.text = PLAIN_TTS_RE.sub(visible, result.text).strip()
            result.has_directive = True

    def replace_directive(match: re.Match[str]) -> str:
        result.has_directive = True
        body = match.group(1)
        tokens = re.split(r"[;\s]+", body)
        for token in tokens:
            if "=" not in token:
                continue
            key, value = token.split("=", 1)
            key = key.strip().lower()
            value = value.strip().strip("\"'")
            if not value:
                continue
            if key in {"voice", "voiceid", "voice_id"}:
                result.voice = value
            elif key == "style":
                result.style = value
            elif key == "rate":
                result.rate = value
            elif key == "pitch":
                result.pitch = value
            elif key == "tone":
                result.tone = value
            elif key == "provider":
                result.provider = value
                if value.lower() != "azure":
                    result.warnings.append("Hermes3D currently routes browser voice through Azure.")
        return ""

    result.text = DIRECTIVE_RE.sub(replace_directive, result.text)
    result.text = TTS_TAG_RE.sub("", result.text).strip()
    return result


def build_ssml(
    text: str,
    voice: str,
    *,
    style: str | None = None,
    rate: str | None = None,
    pitch: str | None = None,
    tone: str | None = None,
) -> str:
    locale = "-".join(voice.split("-")[:2]) if "-" in voice else "en-US"
    body = _tone_prefix(tone) + escape(text, quote=False) + _tone_suffix(tone)
    prosody_attrs = []
    if rate:
        prosody_attrs.append(f'rate="{escape(rate, quote=True)}"')
    if pitch:
        prosody_attrs.append(f'pitch="{escape(pitch, quote=True)}"')
    if prosody_attrs:
        body = f"<prosody {' '.join(prosody_attrs)}>{body}</prosody>"
    if style:
        body = f'<mstts:express-as style="{escape(style, quote=True)}">{body}</mstts:express-as>'
    return (
        f'<speak version="1.0" xml:lang="{escape(locale, quote=True)}" '
        'xmlns="http://www.w3.org/2001/10/synthesis" '
        'xmlns:mstts="https://www.w3.org/2001/mstts">'
        f'<voice name="{escape(voice, quote=True)}">{body}</voice></speak>'
    )


def _tone_prefix(tone: str | None) -> str:
    if tone == "warning":
        return '<break time="250ms"/>Warning. <break time="200ms"/>'
    if tone == "success":
        return '<break time="120ms"/>'
    if tone == "excited":
        return '<break time="80ms"/>'
    return ""

def _tone_suffix(tone: str | None) -> str:
    if tone == "warning":
        return '<break time="250ms"/>'
    return ""
