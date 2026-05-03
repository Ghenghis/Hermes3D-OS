from __future__ import annotations

import json
import os
import random
import re
import shutil
import socket
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import (
    Settings,
    load_printer_config,
    load_runtime_config,
    load_services_config,
    save_runtime_config,
)
from .db import Database, row_to_dict, utc_now
from .schemas import (
    AdvanceRequest,
    AgentVoiceUpdate,
    ApiMessage,
    AutopilotActionRequest,
    ApprovalCreate,
    GenerationStackRequest,
    JobCreate,
    LearningModeRequest,
    PrinterCameraUrlUpdate,
    PrinterPortUpdate,
    PrinterCheckCreate,
    RuntimeAutoPortRequest,
    RuntimeSettingsUpdate,
    SpeechSynthesizeRequest,
    UiSettingsUpdate,
    VoicePreviewRequest,
)
from .services.artifacts import job_dir, write_text_artifact
from .services.generation.pipeline import (
    GENERATION_ENGINES,
    PIPELINE_STEPS,
    PRINTABILITY_TRUTH_GATE,
    GenerationPipelineWorker,
)
from .services.generation.comfyui import ComfyUIClient, workflow_statuses
from .services.moonraker import MoonrakerClient
from .services.providers import provider_readiness
from .services.slicer import SlicerWorker
from .services.speech.agent_voice_router import list_agent_voices, resolve_agent_voice
from .services.speech.azure_stt import AzureSpeechStt
from .services.speech.azure_tts import AzureSpeechTts
from .services.speech.voice_catalog import (
    azure_is_configured,
    fetch_azure_voice_catalog,
    speech_config_from_services,
)
from .ui_settings import router as ui_settings_router
from .workflow import (
    COMPLETE,
    MODEL_APPROVAL,
    PRINT_APPROVAL,
    SELECT_PRINTER,
    START_PRINT,
    USER_CHECKED_PRINTER_UI,
    next_transition,
)


settings = Settings.load()
settings.data_dir.mkdir(parents=True, exist_ok=True)
settings.storage_dir.mkdir(parents=True, exist_ok=True)

db = Database(settings.database_path)
app = FastAPI(title="Hermes3D OS", version="0.1.0")
slicer = SlicerWorker(settings.storage_dir)
moonraker = MoonrakerClient(dry_run=settings.dry_run_printers)

VISUAL_EVIDENCE_KINDS = {
    "source_image",
    "screenshot",
    "mesh_preview",
    "slicer_preview",
    "gcode_preview",
    "camera_snapshot",
    "diagram",
}
VISUAL_FILE_SUFFIXES = {".gif", ".jpg", ".jpeg", ".png", ".svg", ".webp"}

SOURCE_APP_REGISTRY = [
    {
        "id": "prusaslicer",
        "name": "PrusaSlicer",
        "target": Path("slicers") / "PrusaSlicer",
        "tool_key": "prusaslicer",
        "gui_tool_key": "prusaslicer_gui",
        "cli_commands": ["prusa-slicer-console", "prusa-slicer"],
        "gui_commands": ["prusa-slicer"],
    },
    {
        "id": "orcaslicer",
        "name": "OrcaSlicer",
        "target": Path("slicers") / "OrcaSlicer",
        "tool_key": "orcaslicer",
        "gui_tool_key": "orcaslicer_gui",
        "cli_commands": ["orca-slicer", "OrcaSlicer"],
        "gui_commands": ["orca-slicer", "OrcaSlicer"],
    },
    {
        "id": "flsun-slicer",
        "name": "FLSUN Slicer",
        "target": Path("slicers") / "FLSUN-Slicer",
        "tool_key": "flsunslicer",
        "gui_tool_key": "flsunslicer_gui",
        "cli_commands": ["FlsunSlicer", "flsun-slicer"],
        "gui_commands": ["FlsunSlicer", "flsun-slicer"],
    },
    {
        "id": "cura",
        "name": "UltiMaker Cura",
        "target": Path("slicers") / "Cura",
        "tool_key": "cura",
        "gui_tool_key": "cura_gui",
        "cli_commands": ["cura"],
        "gui_commands": ["cura"],
    },
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

web_dir = settings.repo_root / "apps" / "web"
if web_dir.exists():
    app.mount("/static", StaticFiles(directory=web_dir), name="static")

app.include_router(ui_settings_router)