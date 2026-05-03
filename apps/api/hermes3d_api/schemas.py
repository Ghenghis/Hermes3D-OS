from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


class JobCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=4000)
    target_printer_id: str | None = None


class ApprovalCreate(BaseModel):
    approved: bool = True
    note: str | None = None


class PrinterCheckCreate(BaseModel):
    checked: bool = True
    note: str | None = Field(default=None, max_length=1000)


class AdvanceRequest(BaseModel):
    target_printer_id: str | None = None


class ApiMessage(BaseModel):
    message: str


class RuntimeSettingsUpdate(BaseModel):
    api_host: str | None = Field(default=None, min_length=1, max_length=120)
    ports: dict[str, int] = Field(default_factory=dict)
    moonraker_scan_ports: list[int] | None = None
    service_urls: dict[str, str] = Field(default_factory=dict)
    extras: dict[str, Any] = Field(default_factory=dict)

    @field_validator("ports")
    @classmethod
    def validate_ports(cls, ports: dict[str, int]) -> dict[str, int]:
        for name, port in ports.items():
            if not name:
                raise ValueError("Port names cannot be empty")
            if port < 1 or port > 65535:
                raise ValueError(f"{name} must be between 1 and 65535")
        return ports

    @field_validator("moonraker_scan_ports")
    @classmethod
    def validate_scan_ports(cls, ports: list[int] | None) -> list[int] | None:
        if ports is None:
            return None
        for port in ports:
            if port < 1 or port > 65535:
                raise ValueError("Moonraker scan ports must be between 1 and 65535")
        return ports


class RuntimeAutoPortRequest(BaseModel):
    names: list[str] | None = None
    start: int = Field(default=10000, ge=1, le=65535)
    end: int = Field(default=60000, ge=1, le=65535)
    randomize: bool = True


class PrinterPortUpdate(BaseModel):
    port: int = Field(ge=1, le=65535)


class PrinterCameraUrlUpdate(BaseModel):
    camera_url: str | None = Field(default="", max_length=2048)

    @field_validator("camera_url")
    @classmethod
    def validate_camera_url(cls, camera_url: str | None) -> str:
        value = (camera_url or "").strip()
        if value and not value.startswith(("http://", "https://")):
            raise ValueError("Camera URL must start with http:// or https://")
        return value


class AutopilotActionRequest(BaseModel):
    note: str | None = Field(default=None, max_length=1000)


class SpeechSynthesizeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=8000)
    agent_id: str = Field(default="factory_operator", min_length=1, max_length=120)
    voice: str | None = Field(default=None, max_length=120)
    style: str | None = Field(default=None, max_length=80)
    rate: str | None = Field(default=None, max_length=40)
    pitch: str | None = Field(default=None, max_length=40)
    tone: str | None = Field(default=None, max_length=40)
    ssml: str | None = Field(default=None, max_length=12000)
    use_ssml: bool = True


class VoicePreviewRequest(BaseModel):
    agent_id: str = Field(default="factory_operator", min_length=1, max_length=120)
    voice: str | None = Field(default=None, max_length=120)
    text: str = Field(
        default="Dave, Hermes voice is online. I can talk through the print factory now.",
        min_length=1,
        max_length=1000,
    )
    style: str | None = Field(default=None, max_length=80)
    rate: str | None = Field(default=None, max_length=40)
    pitch: str | None = Field(default=None, max_length=40)
    tone: str | None = Field(default=None, max_length=40)


class AgentVoiceUpdate(BaseModel):
    voice: str = Field(min_length=3, max_length=120)


class LearningModeRequest(BaseModel):
    enabled: bool = True
    topic: str | None = Field(default=None, max_length=500)


class GenerationStackRequest(BaseModel):
    object_intent: str = Field(min_length=1, max_length=2000)
    requested_engine: str | None = Field(default=None, max_length=80)
    scale_estimate_mm: str | None = Field(default=None, max_length=200)
    target_printer_id: str | None = Field(default=None, max_length=120)


class UiSettingsUpdate(BaseModel):
    font_scale: float | None = Field(default=None, ge=0.5, le=2.0)
    font_family: str | None = Field(default=None, max_length=80)
    theme: str | None = Field(default=None, max_length=40)
    telemetry_enabled: bool | None = None

    @field_validator("font_family")
    @classmethod
    def validate_font_family(cls, value: str | None) -> str | None:
        if value is None:
            return None
        allowed = ["system-ui", "sans-serif", "monospace", "serif"]
        if value not in allowed:
            raise ValueError(f"font_family must be one of {allowed}")
        return value

    @field_validator("theme")
    @classmethod
    def validate_theme(cls, value: str | None) -> str | None:
        if value is None:
            return None
        allowed = ["midnight", "alloy", "ember", "forest"]
        if value not in allowed:
            raise ValueError(f"theme must be one of {allowed}")
        return value
