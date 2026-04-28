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


class AutopilotActionRequest(BaseModel):
    note: str | None = Field(default=None, max_length=1000)

