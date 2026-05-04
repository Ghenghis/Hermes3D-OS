from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import ValidationError

from .config import Settings, load_runtime_config, save_runtime_config
from .schemas import UiSettingsUpdate

router = APIRouter(prefix="/api/settings/ui", tags=["ui-settings"])

DEFAULT_UI_SETTINGS = {
    "font_scale": 1.0,
    "font_family": "system-ui",
    "theme": "midnight",
    "telemetry_enabled": False,
}


@router.get("")
def get_ui_settings(settings: Settings) -> dict[str, Any]:
    runtime = load_runtime_config(settings)
    ui_settings = dict(runtime.get("extras", {}).get("ui", {}))
    merged = {**DEFAULT_UI_SETTINGS, **ui_settings}
    return merged


@router.patch("")
def update_ui_settings(payload: UiSettingsUpdate, settings: Settings) -> dict[str, Any]:
    runtime = load_runtime_config(settings)
    extras = dict(runtime.get("extras", {}))
    ui_settings = dict(extras.get("ui", {}))
    
    if payload.font_scale is not None:
        ui_settings["font_scale"] = payload.font_scale
    if payload.font_family is not None:
        ui_settings["font_family"] = payload.font_family
    if payload.theme is not None:
        ui_settings["theme"] = payload.theme
    if payload.telemetry_enabled is not None:
        ui_settings["telemetry_enabled"] = payload.telemetry_enabled
    
    extras["ui"] = ui_settings
    runtime["extras"] = extras
    save_runtime_config(settings, runtime)
    
    merged = {**DEFAULT_UI_SETTINGS, **ui_settings}
    return merged
