from __future__ import annotations

import json
import os
import random
import re
import shutil
import socket
import subprocess
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


@app.on_event("startup")
def startup() -> None:
    db.init()
    for printer in load_printer_config(settings):
        db.upsert_printer(printer)
    db.add_event(
        None,
        "SYSTEM_READY",
        "Hermes3D OS API started.",
        {
            "database": str(settings.database_path),
            "printers_config": str(settings.printers_config_path),
            "dry_run_printers": settings.dry_run_printers,
        },
    )


@app.get("/")
def index() -> FileResponse:
    index_path = web_dir / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Web UI is not installed")
    return FileResponse(index_path)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "hermes3d-api",
        "dry_run_printers": settings.dry_run_printers,
        "database": str(settings.database_path),
        "runtime_config": str(settings.runtime_config_path),
    }


@app.get("/api/workspace")
def workspace() -> dict[str, Any]:
    return {
        "health": health(),
        "settings": {
            "services_config": str(settings.services_config_path),
            "printers_config": str(settings.printers_config_path),
            "data_dir": str(settings.data_dir),
            "storage_dir": str(settings.storage_dir),
            "runtime_config": str(settings.runtime_config_path),
            "dry_run_printers": settings.dry_run_printers,
            "runtime": _runtime_payload(),
        },
        "printers": _list_printers(),
        "jobs": _list_jobs(),
        "artifacts": _list_artifacts(),
        "approvals": _list_approvals(),
        "events": _list_events(),
        "autopilot": _autopilot_status(),
    }


@app.get("/api/autopilot/status")
def autopilot_status() -> dict[str, Any]:
    return _autopilot_status()


@app.post("/api/autopilot/actions/{action_id}")
def run_autopilot_action(action_id: str, payload: AutopilotActionRequest | None = None) -> dict[str, Any]:
    note = (payload or AutopilotActionRequest()).note
    if action_id == "ensure_runtime_config":
        runtime = load_runtime_config(settings)
        save_runtime_config(settings, runtime)
        db.add_event(None, "AUTOPILOT_ACTION", "Runtime config ensured.", {"note": note})
    elif action_id == "auto_assign_ports":
        runtime = load_runtime_config(settings)
        port_names = list((runtime.get("ports") or {}).keys())
        share_web_port = "api" in port_names and "web" in port_names
        allocation_names = [name for name in port_names if not (share_web_port and name == "web")]
        assigned = _assign_open_ports(
            allocation_names,
            10000,
            60000,
            str(runtime.get("api_host") or "127.0.0.1"),
            True,
        )
        if share_web_port:
            assigned["web"] = assigned["api"]
        ports = dict(runtime.get("ports", {}))
        ports.update(assigned)
        runtime["ports"] = ports
        runtime["service_urls"] = _service_urls_for_ports(runtime)
        save_runtime_config(settings, runtime)
        db.add_event(None, "AUTOPILOT_ACTION", "Open ports auto-assigned.", {"assigned": assigned})
    elif action_id == "bootstrap_printers":
        for printer in load_printer_config(settings):
            db.upsert_printer(printer)
        db.add_event(None, "AUTOPILOT_ACTION", "Printer inventory loaded from config.", {"note": note})
    elif action_id == "ensure_storage_dirs":
        for path in [
            settings.data_dir,
            settings.storage_dir,
            settings.storage_dir / "jobs",
            settings.storage_dir / "autopilot",
            settings.storage_dir / "speech",
            settings.storage_dir / "learning",
        ]:
            path.mkdir(parents=True, exist_ok=True)
        db.add_event(None, "AUTOPILOT_ACTION", "Storage directories ensured.", {"note": note})
    elif action_id == "create_pilot_job":
        job = _create_autopilot_job(note)
        db.add_event(job["id"], "AUTOPILOT_ACTION", "Dry-run pilot job created.", {"note": note})
    elif action_id == "write_setup_report":
        _write_autopilot_report()
    elif action_id == "autopilot_next_gate":
        job = _active_autopilot_job()
        _autopilot_job_to_next_gate(job["id"])
    elif action_id == "write_agent_plan":
        job = _active_autopilot_job()
        _write_agent_plan(job["id"], job)
    else:
        raise HTTPException(status_code=404, detail="Unknown autopilot action")
    return _autopilot_status()


@app.post("/api/jobs/{job_id}/autopilot-next-gate")
async def autopilot_job_to_next_gate(job_id: int) -> dict[str, Any]:
    _autopilot_job_to_next_gate(job_id)
    return get_job(job_id)


@app.post("/api/jobs/{job_id}/agent-plan")
def create_agent_plan(job_id: int) -> dict[str, Any]:
    job = get_job(job_id)
    _write_agent_plan(job_id, job)
    return get_job(job_id)


@app.get("/api/settings/runtime")
def get_runtime_settings() -> dict[str, Any]:
    return _runtime_payload()


@app.patch("/api/settings/runtime")
def update_runtime_settings(payload: RuntimeSettingsUpdate) -> dict[str, Any]:
    runtime = load_runtime_config(settings)
    if payload.api_host is not None:
        runtime["api_host"] = payload.api_host
    if payload.ports:
        ports = dict(runtime.get("ports", {}))
        ports.update(payload.ports)
        runtime["ports"] = ports
    if payload.moonraker_scan_ports is not None:
        runtime["moonraker_scan_ports"] = sorted(set(payload.moonraker_scan_ports))
    if payload.service_urls:
        service_urls = dict(runtime.get("service_urls", {}))
        service_urls.update(payload.service_urls)
        runtime["service_urls"] = service_urls
    if payload.extras:
        extras = dict(runtime.get("extras", {}))
        extras.update(payload.extras)
        runtime["extras"] = extras
    save_runtime_config(settings, runtime)
    db.add_event(None, "RUNTIME_SETTINGS_UPDATED", "Runtime port settings saved.", _runtime_payload())
    return _runtime_payload()


@app.post("/api/settings/runtime/auto-ports")
def auto_assign_runtime_ports(payload: RuntimeAutoPortRequest) -> dict[str, Any]:
    if payload.start > payload.end:
        raise HTTPException(status_code=400, detail="start must be less than or equal to end")
    runtime = load_runtime_config(settings)
    port_names = payload.names or list((runtime.get("ports") or {}).keys())
    if not port_names:
        raise HTTPException(status_code=400, detail="No runtime port names are configured")
    share_web_port = "api" in port_names and "web" in port_names
    allocation_names = [name for name in port_names if not (share_web_port and name == "web")]

    assigned = _assign_open_ports(
        allocation_names,
        payload.start,
        payload.end,
        str(runtime.get("api_host") or "127.0.0.1"),
        payload.randomize,
    )
    if share_web_port:
        assigned["web"] = assigned["api"]
    ports = dict(runtime.get("ports", {}))
    ports.update(assigned)
    runtime["ports"] = ports
    runtime["service_urls"] = _service_urls_for_ports(runtime)
    save_runtime_config(settings, runtime)
    db.add_event(
        None,
        "RUNTIME_PORTS_AUTO_ASSIGNED",
        "Open runtime ports were auto-assigned and saved.",
        {"assigned": assigned, "config_path": str(settings.runtime_config_path)},
    )
    return _runtime_payload()


@app.patch("/api/printers/{printer_id}/moonraker-port")
def update_printer_moonraker_port(printer_id: str, payload: PrinterPortUpdate) -> dict[str, Any]:
    port = payload.port
    printer = _get_printer(printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    if _printer_config_is_example():
        raise HTTPException(
            status_code=409,
            detail="Create configs/printers.local.yaml before saving printer port changes.",
        )

    updated_printer = _save_printer_base_url(
        printer_id,
        _replace_url_port(printer.get("base_url") or "", port),
    )
    db.upsert_printer(updated_printer)
    db.add_event(
        None,
        "PRINTER_PORT_UPDATED",
        f"{updated_printer.get('name', printer_id)} Moonraker port saved.",
        {"printer_id": printer_id, "base_url": updated_printer.get("moonraker", {}).get("base_url")},
    )
    return _get_printer(printer_id) or {}


@app.patch("/api/printers/{printer_id}/camera-url")
def update_printer_camera_url(printer_id: str, payload: PrinterCameraUrlUpdate) -> dict[str, Any]:
    printer = _get_printer(printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    if _printer_config_is_example():
        raise HTTPException(
            status_code=409,
            detail="Create configs/printers.local.yaml before saving printer camera changes.",
        )

    updated_printer = _save_printer_camera_url(printer_id, payload.camera_url or "")
    db.upsert_printer(updated_printer)
    db.add_event(
        None,
        "PRINTER_CAMERA_URL_UPDATED",
        f"{updated_printer.get('name', printer_id)} camera URL saved.",
        {
            "printer_id": printer_id,
            "camera_url_configured": bool(updated_printer.get("capabilities", {}).get("camera_url")),
            "locked": _printer_locked(updated_printer),
        },
    )
    return _get_printer(printer_id) or {}


@app.post("/api/bootstrap", response_model=ApiMessage)
def bootstrap() -> ApiMessage:
    for printer in load_printer_config(settings):
        db.upsert_printer(printer)
    db.add_event(None, "BOOTSTRAP", "Printer inventory loaded from config.")
    return ApiMessage(message="Printer inventory loaded.")


@app.get("/api/speech/status")
def speech_status() -> dict[str, Any]:
    config = _speech_config()
    azure = config["azure"]
    return {
        "provider": config["provider"],
        "configured": azure_is_configured(config),
        "region": azure.get("region") or "",
        "default_voice": azure.get("default_voice"),
        "fallback_voice": azure.get("fallback_voice"),
        "output_format": azure.get("output_format"),
        "enable_ssml": azure.get("enable_ssml"),
        "enable_stt": azure.get("enable_stt"),
        "agents": list_agent_voices(config),
        "transcript_count": len(_read_transcripts(2000)),
        "learning_mode": _learning_mode_status(),
    }


@app.get("/api/speech/voices")
async def speech_voices() -> dict[str, Any]:
    config = _speech_config()
    try:
        voices, source = await fetch_azure_voice_catalog(config)
    except httpx.HTTPError as exc:
        db.add_event(None, "VOICE_CATALOG_FAILED", str(exc), {"provider": "azure"})
        voices, source = await fetch_azure_voice_catalog({"azure": {}})
    return {
        "provider": "azure",
        "source": source,
        "count": len(voices),
        "voices": voices,
    }


@app.get("/api/speech/agents")
def speech_agents() -> list[dict[str, Any]]:
    return list_agent_voices(_speech_config())


@app.patch("/api/speech/agents/{agent_id}/voice")
def update_agent_voice(agent_id: str, payload: AgentVoiceUpdate) -> dict[str, Any]:
    if settings.services_config_path.name.endswith(".example.yaml"):
        raise HTTPException(
            status_code=409,
            detail="Create configs/services.local.yaml before saving agent voice changes.",
        )
    updated = _save_agent_voice(agent_id, payload.voice)
    db.add_event(
        None,
        "AGENT_VOICE_UPDATED",
        f"{agent_id} voice saved.",
        {"agent_id": agent_id, "voice": payload.voice},
    )
    return updated


@app.post("/api/speech/tts")
async def synthesize_speech(payload: SpeechSynthesizeRequest) -> dict[str, Any]:
    config = _speech_config()
    voice = resolve_agent_voice(config, payload.agent_id, payload.voice)
    tts = AzureSpeechTts(config, settings.storage_dir)
    try:
        result = await tts.synthesize_to_file(
            text=payload.text,
            agent_id=payload.agent_id,
            voice=voice,
            style=payload.style,
            rate=payload.rate,
            pitch=payload.pitch,
            tone=payload.tone,
            ssml=payload.ssml if payload.use_ssml else None,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:500] or f"Azure Speech returned HTTP {exc.response.status_code}"
        raise HTTPException(status_code=502, detail=detail) from exc
    _append_transcript(
        "tts",
        payload.agent_id,
        result["text"],
        audio_url=result.get("audio_url"),
        metadata={"voice": result.get("voice"), "provider": "azure", "tone": payload.tone},
    )
    db.add_event(
        None,
        "VOICE_TTS",
        f"{payload.agent_id} spoke with {result.get('voice')}.",
        {"audio_url": result.get("audio_url"), "warnings": result.get("warnings", [])},
    )
    return result


@app.post("/api/speech/preview")
async def preview_voice(payload: VoicePreviewRequest) -> dict[str, Any]:
    return await synthesize_speech(
        SpeechSynthesizeRequest(
            text=payload.text,
            agent_id=payload.agent_id,
            voice=payload.voice,
            style=payload.style,
            rate=payload.rate,
            pitch=payload.pitch,
            tone=payload.tone,
        )
    )


@app.post("/api/speech/stt")
async def speech_to_text(
    audio: UploadFile = File(...),
    locale: str = Form("en-US"),
    agent_id: str = Form("factory_operator"),
) -> dict[str, Any]:
    config = _speech_config()
    stt = AzureSpeechStt(config)
    try:
        result = await stt.transcribe_bytes(
            audio=await audio.read(),
            filename=audio.filename or "speech.webm",
            content_type=audio.content_type or "application/octet-stream",
            locale=locale,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:500] or f"Azure Speech returned HTTP {exc.response.status_code}"
        raise HTTPException(status_code=502, detail=detail) from exc
    _append_transcript(
        "stt",
        agent_id,
        result.get("text", ""),
        metadata={"locale": locale, "provider": "azure", "filename": audio.filename},
    )
    db.add_event(None, "VOICE_STT", "User speech transcribed.", {"agent_id": agent_id, "locale": locale})
    return result


@app.get("/api/speech/transcripts")
def speech_transcripts(limit: int = 100) -> dict[str, Any]:
    safe_limit = max(1, min(limit, 500))
    return {"items": _read_transcripts(safe_limit)}


@app.get("/api/speech/audio/{filename}")
def speech_audio(filename: str) -> FileResponse:
    audio_dir = (settings.storage_dir / "speech" / "audio").resolve()
    path = (audio_dir / Path(filename).name).resolve()
    if audio_dir not in path.parents or not path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(path)


@app.get("/api/learning-mode/status")
def learning_mode_status() -> dict[str, Any]:
    return _learning_mode_status()


@app.post("/api/learning-mode/report")
def create_learning_mode_report(payload: LearningModeRequest) -> dict[str, Any]:
    report = _write_learning_report(payload.topic or _next_learning_topic()["id"])
    db.add_event(
        None,
        "LEARNING_MODE_REPORT",
        "Learning Mode markdown report created.",
        {"path": str(report), "enabled": payload.enabled, "topic": payload.topic},
    )
    return {"enabled": payload.enabled, "report_path": str(report)}


@app.post("/api/learning-mode/next-report")
def create_next_learning_report() -> dict[str, Any]:
    topic = _next_learning_topic()
    report = _write_learning_report(topic["id"])
    db.add_event(
        None,
        "LEARNING_MODE_REPORT",
        "Idle Learning Mode created the next queued research report.",
        {"path": str(report), "topic": topic["id"], "agent": topic["agent"]},
    )
    return {"enabled": True, "topic": topic, "report_path": str(report)}


@app.get("/api/agentic-work/status")
def agentic_work_status() -> dict[str, Any]:
    return _agentic_work_status()


@app.post("/api/agentic-work/tick")
def agentic_work_tick() -> dict[str, Any]:
    topic = _next_learning_topic()
    report = _write_learning_report(topic["id"])
    db.add_event(
        None,
        "AGENTIC_WORK_TICK",
        "Agentic work loop created the next safe research artifact.",
        {"path": str(report), "topic": topic["id"], "agent": topic["agent"]},
    )
    status = _agentic_work_status()
    status["created_report"] = {"path": str(report), "topic": topic}
    return status


@app.get("/api/providers/status")
def providers_status() -> dict[str, Any]:
    return provider_readiness(load_services_config(settings))


@app.get("/api/generation-stack/status")
def generation_stack_status() -> dict[str, Any]:
    runtime = load_runtime_config(settings)
    services = load_services_config(settings)
    service_urls = runtime.get("service_urls", {}) if isinstance(runtime, dict) else {}
    generation_config = (services.get("workers", {}) or {}).get("generation_stack", {})
    comfyui_url = str(service_urls.get("comfyui", ""))
    comfyui_probe = ComfyUIClient(comfyui_url).probe(timeout_seconds=0.8) if comfyui_url else {
        "configured": False,
        "reachable": False,
        "reason": "No ComfyUI URL configured.",
    }
    workflows = workflow_statuses(settings.repo_root, services)
    blender_path = _tool_path("blender", ["blender"])
    prusaslicer_path = _tool_path("prusaslicer", ["prusa-slicer", "prusa-slicer-console"])
    return {
        "name": "Hermes3D-OS Full-Stack 3D Generation",
        "primary_engine": "trellis2",
        "comparison_engine": "hunyuan3d21",
        "fast_preview_engine": "triposr",
        "engines": GENERATION_ENGINES,
        "pipeline_steps": PIPELINE_STEPS,
        "printability_truth_gate": PRINTABILITY_TRUTH_GATE,
        "service_urls": {
            "comfyui": service_urls.get("comfyui", ""),
            "trellis": service_urls.get("trellis", ""),
            "hunyuan3d": service_urls.get("hunyuan3d", ""),
            "triposr": service_urls.get("triposr", ""),
        },
        "configured": {
            "comfyui": bool(service_urls.get("comfyui")),
            "trellis": bool(service_urls.get("trellis")),
            "hunyuan3d": bool(service_urls.get("hunyuan3d")),
            "triposr": bool(service_urls.get("triposr")),
            "blender": blender_path is not None,
            "prusaslicer": prusaslicer_path is not None,
        },
        "tool_paths": {
            "blender": blender_path or "",
            "prusaslicer": prusaslicer_path or "",
        },
        "runtime_reachable": {"comfyui": comfyui_probe},
        "workflows": workflows,
        "readiness": {
            "services_configured": bool(generation_config),
            "comfyui_reachable": bool(comfyui_probe.get("reachable")),
            "workflows_ready": bool(workflows)
            and all(not item.get("operator_required") for item in workflows),
            "toolchain_ready": blender_path is not None and prusaslicer_path is not None,
            "printability_truth_gate_ready": False,
        },
        "services_configured": bool(generation_config),
    }


@app.get("/api/source-apps/status")
def source_apps_status() -> dict[str, Any]:
    source_root = _source_root()
    apps = []
    for item in _source_modules():
        apps.append(_source_app_payload(item, source_root))
    return {
        "source_root": str(source_root),
        "apps": apps,
        "note": "The browser shell does not embed native slicer GUIs. It exposes real source checkouts, executable detection, and launch/open actions.",
    }


@app.post("/api/source-apps/{app_id}/launch")
def launch_source_app(app_id: str) -> dict[str, Any]:
    source_root = _source_root()
    module = _source_module_by_id(app_id)
    payload = _source_app_payload(module, source_root)
    executable = payload.get("installed_executable")
    if not executable:
        raise HTTPException(
            status_code=409,
            detail=f"{payload['name']} has source available but no installed GUI executable was detected.",
        )
    subprocess.Popen(
        [str(executable)],
        cwd=str(Path(payload["source_path"])) if payload.get("source_exists") else str(settings.repo_root),
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    db.add_event(
        None,
        "SOURCE_APP_LAUNCHED",
        f"{payload['name']} native application launched from Source OS.",
        {"app_id": app_id, "executable": executable, "source_path": payload["source_path"]},
    )
    return {
        "ok": True,
        "action": "launch",
        "id": app_id,
        "name": payload["name"],
        "executable": executable,
    }


@app.post("/api/source-apps/{app_id}/open-source")
def open_source_app(app_id: str) -> dict[str, Any]:
    source_root = _source_root()
    module = _source_module_by_id(app_id)
    payload = _source_app_payload(module, source_root)
    source_path = Path(payload["source_path"])
    if not source_path.exists():
        raise HTTPException(status_code=404, detail=f"{payload['name']} source checkout is not present.")
    _open_local_path(source_path)
    db.add_event(
        None,
        "SOURCE_CHECKOUT_OPENED",
        f"{payload['name']} source checkout opened from Source OS.",
        {"app_id": app_id, "source_path": str(source_path)},
    )
    return {
        "ok": True,
        "action": "open_source",
        "id": app_id,
        "name": payload["name"],
        "source_path": str(source_path),
    }


@app.post("/api/jobs/{job_id}/generate-3d-from-image")
async def generate_3d_from_image(
    job_id: int,
    image: UploadFile = File(...),
    object_intent: str = Form(...),
    requested_engine: str | None = Form(None),
    scale_estimate_mm: str | None = Form(None),
    target_printer_id: str | None = Form(None),
) -> dict[str, Any]:
    job = get_job(job_id)
    destination_dir = settings.storage_dir / "jobs" / str(job_id) / "generation-inputs"
    destination_dir.mkdir(parents=True, exist_ok=True)
    image_path = destination_dir / Path(image.filename or "source-image.png").name
    image_path.write_bytes(await image.read())
    target_id = target_printer_id or job.get("target_printer_id")
    target_printer = _get_printer(target_id) if target_id else None
    worker = GenerationPipelineWorker(
        settings.storage_dir,
        load_runtime_config(settings),
        load_services_config(settings),
        settings.repo_root,
    )
    result = worker.run_image_to_print(
        job_id=job_id,
        image_path=image_path,
        object_intent=object_intent,
        target_printer=target_printer,
        requested_engine=requested_engine,
        scale_estimate_mm=scale_estimate_mm,
    )
    for kind, path in result.artifacts.items():
        _add_artifact(job_id, f"generation_{kind}", path, result.metadata)
    db.add_event(
        job_id,
        "GENERATION_OPERATOR_REQUIRED"
        if result.metadata.get("operator_gates")
        else "GENERATION_STACK_RUN",
        "Image-to-print generation stack produced candidate evidence.",
        {
            "mode": result.mode,
            "selected_engine": result.selected_engine,
            "printable": False,
            "truth_gate_passed": False,
            "operator_gates": result.metadata.get("operator_gates", []),
        },
    )
    return get_job(job_id)


@app.post("/api/generation-stack/plan")
def create_generation_stack_plan(payload: GenerationStackRequest) -> dict[str, Any]:
    target_printer = _get_printer(payload.target_printer_id) if payload.target_printer_id else None
    return {
        "request": payload.model_dump(),
        "selected_engine": payload.requested_engine or "trellis2",
        "target_printer": target_printer,
        "pipeline_steps": PIPELINE_STEPS,
        "printability_truth_gate": PRINTABILITY_TRUTH_GATE,
        "result": "plan-only",
        "note": "Upload an image to /api/jobs/{job_id}/generate-3d-from-image to produce artifacts.",
    }


@app.get("/api/printers")
def list_printers() -> list[dict[str, Any]]:
    return _list_printers()


@app.get("/api/printers/{printer_id}/status")
async def printer_status(printer_id: str) -> dict[str, Any]:
    printer = _get_printer(printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    _require_printer_probe_allowed(printer)

    try:
        result = await moonraker.status(printer, real_probe=True)
    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code
        message = f"Moonraker returned HTTP {status_code}"
        db.add_event(None, "PRINTER_PROBE_FAILED", message, {"printer_id": printer_id})
        return {
            "ok": False,
            "printer_id": printer_id,
            "base_url": printer.get("base_url"),
            "message": message,
            "status_code": status_code,
        }
    except (httpx.RequestError, ValueError) as exc:
        message = str(exc)
        db.add_event(None, "PRINTER_PROBE_FAILED", message, {"printer_id": printer_id})
        return {
            "ok": False,
            "printer_id": printer_id,
            "base_url": printer.get("base_url"),
            "message": message,
        }

    payload = result.payload
    db.add_event(None, "PRINTER_PROBE_OK", result.message, {"printer_id": printer_id, **payload})
    return {
        "ok": result.ok,
        "printer_id": printer_id,
        "base_url": printer.get("base_url"),
        "message": result.message,
        "payload": payload,
    }


@app.get("/api/jobs")
def list_jobs() -> list[dict[str, Any]]:
    return _list_jobs()


@app.post("/api/jobs")
def create_job(payload: JobCreate) -> dict[str, Any]:
    now = utc_now()
    with db.connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO jobs (title, description, state, target_printer_id, created_at, updated_at)
            VALUES (?, ?, 'INTAKE', ?, ?, ?)
            """,
            (payload.title, payload.description, payload.target_printer_id, now, now),
        )
        job_id = int(cursor.lastrowid)
    db.add_event(job_id, "JOB_CREATED", "Job intake created.", payload.model_dump())
    _write_agent_plan(job_id, get_job(job_id))
    return get_job(job_id)


@app.get("/api/jobs/{job_id}")
def get_job(job_id: int) -> dict[str, Any]:
    with db.connect() as conn:
        job = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        artifacts = conn.execute(
            "SELECT * FROM artifacts WHERE job_id = ? ORDER BY id", (job_id,)
        ).fetchall()
        approvals = conn.execute(
            "SELECT * FROM approvals WHERE job_id = ? ORDER BY id", (job_id,)
        ).fetchall()
        events = conn.execute(
            "SELECT * FROM events WHERE job_id = ? ORDER BY id DESC LIMIT 50", (job_id,)
        ).fetchall()

    result = row_to_dict(job)
    result["artifacts"] = [_enrich_artifact(row_to_dict(row)) for row in artifacts]
    result["approvals"] = [row_to_dict(row) for row in approvals]
    result["events"] = [row_to_dict(row) for row in events]
    return result


@app.post("/api/jobs/{job_id}/upload-model")
async def upload_model(job_id: int, file: UploadFile = File(...)) -> dict[str, Any]:
    job = get_job(job_id)
    destination_dir = settings.storage_dir / "jobs" / str(job_id)
    destination_dir.mkdir(parents=True, exist_ok=True)
    destination = destination_dir / Path(file.filename or "uploaded-model").name
    destination.write_bytes(await file.read())

    _add_artifact(job_id, "model", destination, {"uploaded_filename": file.filename})
    _set_job_state(job_id, "VALIDATE_MODEL")
    db.add_event(job_id, "MODEL_UPLOADED", "Model artifact uploaded.", {"path": str(destination)})
    return get_job(job["id"])


@app.post("/api/jobs/{job_id}/visual-evidence")
async def upload_visual_evidence(
    job_id: int,
    evidence: UploadFile = File(...),
    evidence_kind: str = Form("screenshot"),
    agent_id: str = Form("factory_operator"),
    stage: str = Form("INTAKE"),
    gate: str | None = Form(None),
    label: str | None = Form(None),
    notes: str | None = Form(None),
) -> dict[str, Any]:
    job = get_job(job_id)
    normalized_kind = evidence_kind.strip().lower().replace("-", "_")
    if normalized_kind not in VISUAL_EVIDENCE_KINDS:
        raise HTTPException(
            status_code=400,
            detail=f"evidence_kind must be one of: {', '.join(sorted(VISUAL_EVIDENCE_KINDS))}",
        )

    evidence_dir = job_dir(settings.storage_dir, job_id) / "visual-evidence"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    filename = _safe_upload_name(evidence.filename, normalized_kind)
    destination = evidence_dir / filename
    destination.write_bytes(await evidence.read())

    metadata = _visual_evidence_metadata(
        normalized_kind,
        destination,
        evidence.content_type,
        agent_id,
        stage,
        gate,
        label,
        notes,
    )
    _add_artifact(job_id, f"visual_{normalized_kind}", destination, metadata)
    summary_path = _write_visual_evidence_summary(
        job_id=job_id,
        job=job,
        evidence_path=destination,
        metadata=metadata,
    )
    summary_metadata = _visual_summary_metadata(metadata)
    _add_artifact(job_id, "visual_evidence_summary", summary_path, summary_metadata)
    db.add_event(
        job_id,
        "VISUAL_EVIDENCE_ATTACHED",
        "Vision evidence was attached to the job ledger.",
        {
            "kind": normalized_kind,
            "agent_id": agent_id,
            "stage": stage,
            "gate": gate,
            "path": str(destination),
            "evidence_required": True,
        },
    )
    return get_job(job_id)


@app.get("/api/artifacts/{artifact_id}/file")
def artifact_file(artifact_id: int) -> FileResponse:
    artifact = _get_artifact(artifact_id)
    path = _artifact_storage_path(artifact)
    return FileResponse(path)


@app.post("/api/jobs/{job_id}/advance")
async def advance_job(job_id: int, payload: AdvanceRequest | None = None) -> dict[str, Any]:
    job = get_job(job_id)
    state = job["state"]
    transition = next_transition(state)
    if state == COMPLETE:
        return job

    if transition.next_state == MODEL_APPROVAL and not _has_artifact(job_id, "model_evidence"):
        _generate_model_evidence(job_id, job)

    if transition.next_state == "PLAN_JOB" and not _has_artifact(job_id, "agent_plan"):
        _write_agent_plan(job_id, job)

    if transition.next_state == "VALIDATE_GCODE" and not _has_artifact(job_id, "gcode"):
        _run_slicer(job_id)

    if state == SELECT_PRINTER or transition.next_state == SELECT_PRINTER:
        target_printer_id = (payload or AdvanceRequest()).target_printer_id or job.get("target_printer_id")
        if not target_printer_id:
            target_printer_id = _first_printer_id()
        if not target_printer_id:
            raise HTTPException(status_code=409, detail="No printer is available for selection")
        _set_target_printer(job_id, target_printer_id)

    if transition.next_state == "UPLOAD_ONLY":
        raise HTTPException(status_code=409, detail="Use the explicit Upload Only action.")

    if transition.next_state == USER_CHECKED_PRINTER_UI:
        raise HTTPException(status_code=409, detail="Use the explicit User Checked Printer UI action.")

    if transition.next_state == START_PRINT:
        raise HTTPException(status_code=409, detail="Use the explicit Start Print action.")

    if transition.next_state == "MONITOR_PRINT":
        _record_telemetry(job_id, "printing")

    if transition.next_state == COMPLETE:
        _record_telemetry(job_id, "complete")

    _set_job_state(job_id, transition.next_state)
    db.add_event(
        job_id,
        "WORKFLOW_ADVANCED",
        f"Workflow advanced from {state} to {transition.next_state}.",
    )
    return get_job(job_id)


@app.post("/api/jobs/{job_id}/upload-only")
async def upload_only(job_id: int, payload: AdvanceRequest | None = None) -> dict[str, Any]:
    job = get_job(job_id)
    if job["state"] not in {"SELECT_PRINTER", "UPLOAD_ONLY"}:
        raise HTTPException(
            status_code=409,
            detail=f"Job is in {job['state']}; expected SELECT_PRINTER or UPLOAD_ONLY",
        )
    _require_approval(job_id, PRINT_APPROVAL)
    _ensure_target_printer(job_id, job, (payload or AdvanceRequest()).target_printer_id)
    await _upload_to_printer(job_id)
    _set_job_state(job_id, "UPLOAD_ONLY")
    db.add_event(job_id, "WORKFLOW_ADVANCED", "Workflow advanced to UPLOAD_ONLY.")
    return get_job(job_id)


@app.post("/api/jobs/{job_id}/user-printer-check")
def user_printer_check(job_id: int, payload: PrinterCheckCreate | None = None) -> dict[str, Any]:
    payload = payload or PrinterCheckCreate()
    job = get_job(job_id)
    if job["state"] not in {"UPLOAD_ONLY", USER_CHECKED_PRINTER_UI}:
        raise HTTPException(
            status_code=409,
            detail=f"Job is in {job['state']}; expected UPLOAD_ONLY or USER_CHECKED_PRINTER_UI",
        )
    if not payload.checked:
        raise HTTPException(status_code=400, detail="Printer check must be confirmed before start print.")
    printer = _get_printer(job.get("target_printer_id"))
    if not printer:
        raise HTTPException(status_code=409, detail="No printer selected")
    _require_printer_probe_allowed(printer)
    _require_approval(job_id, PRINT_APPROVAL)
    _set_job_state(job_id, USER_CHECKED_PRINTER_UI)
    db.add_event(
        job_id,
        "USER_CHECKED_PRINTER_UI",
        "User confirmed printer UI or camera check after upload-only.",
        {"note": payload.note, "printer_id": printer["id"]},
    )
    db.add_event(job_id, "WORKFLOW_ADVANCED", "Workflow advanced to USER_CHECKED_PRINTER_UI.")
    return get_job(job_id)


@app.post("/api/jobs/{job_id}/start-print")
async def start_print(job_id: int) -> dict[str, Any]:
    job = get_job(job_id)
    if job["state"] != START_PRINT:
        if job["state"] == USER_CHECKED_PRINTER_UI:
            _set_job_state(job_id, START_PRINT)
            job = get_job(job_id)
        else:
            raise HTTPException(
                status_code=409,
                detail=f"Job is in {job['state']}; expected USER_CHECKED_PRINTER_UI or START_PRINT",
            )
    _require_approval(job_id, PRINT_APPROVAL)
    await _start_print(job_id)
    db.add_event(job_id, "PRINT_STARTED", "Print start recorded.", {"dry_run": settings.dry_run_printers})
    return get_job(job_id)


@app.post("/api/jobs/{job_id}/approvals/{gate}")
def approve_gate(job_id: int, gate: str, payload: ApprovalCreate) -> dict[str, Any]:
    normalized_gate = gate.upper()
    if normalized_gate not in {MODEL_APPROVAL, PRINT_APPROVAL}:
        raise HTTPException(status_code=400, detail="Unknown approval gate")

    job = get_job(job_id)
    if job["state"] != normalized_gate:
        raise HTTPException(
            status_code=409,
            detail=f"Job is in {job['state']}; expected {normalized_gate}",
        )

    with db.connect() as conn:
        conn.execute(
            """
            INSERT INTO approvals (job_id, gate, approved, note, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (job_id, normalized_gate, int(payload.approved), payload.note, utc_now()),
        )

    db.add_event(
        job_id,
        "APPROVAL_RECORDED",
        f"{normalized_gate} approval recorded.",
        payload.model_dump(),
    )

    if payload.approved:
        transition = next_transition(job["state"])
        _set_job_state(job_id, transition.next_state)
        db.add_event(
            job_id,
            "WORKFLOW_ADVANCED",
            f"Workflow advanced from {job['state']} to {transition.next_state}.",
        )

    return get_job(job_id)


def _set_job_state(job_id: int, state: str) -> None:
    with db.connect() as conn:
        conn.execute(
            "UPDATE jobs SET state = ?, updated_at = ?, completed_at = ? WHERE id = ?",
            (state, utc_now(), utc_now() if state == COMPLETE else None, job_id),
        )


def _list_printers() -> list[dict[str, Any]]:
    with db.connect() as conn:
        rows = conn.execute("SELECT * FROM printers ORDER BY name").fetchall()
    return [row_to_dict(row) for row in rows]


def _runtime_payload() -> dict[str, Any]:
    runtime = load_runtime_config(settings)
    ports = runtime.get("ports", {})
    duplicates: dict[str, list[str]] = {}
    for name, port in ports.items():
        duplicates.setdefault(str(port), []).append(name)
    allowed_shared = {"api", "web"}
    duplicate_ports = {
        port: names
        for port, names in duplicates.items()
        if len(names) > 1 and set(names) != allowed_shared
    }
    runtime["duplicate_ports"] = duplicate_ports
    runtime["config_path"] = str(settings.runtime_config_path)
    return runtime


def _autopilot_status() -> dict[str, Any]:
    runtime = _runtime_payload()
    printers = _list_printers()
    services = load_services_config(settings)
    model_endpoint = _model_endpoint_status(services)
    speech = speech_config_from_services(services)
    providers = provider_readiness(services)["providers"]
    generation_stack = (services.get("workers", {}) or {}).get("generation_stack", {})
    runtime_urls = runtime.get("service_urls", {})
    checks = [
        _autopilot_check(
            "runtime_config",
            settings.runtime_config_path.exists(),
            "Runtime Port Config",
            "Saved runtime ports exist.",
            "Create runtime.local.yaml so Hermes can remember auto-assigned ports.",
            "ensure_runtime_config",
        ),
        _autopilot_check(
            "storage_dirs",
            settings.data_dir.exists() and settings.storage_dir.exists(),
            "Storage Directories",
            "Data and storage directories exist.",
            "Create local data, storage, jobs, and autopilot directories.",
            "ensure_storage_dirs",
        ),
        _autopilot_check(
            "printer_config",
            not _printer_config_is_example(),
            "Local Printer Config",
            "Using local printer config.",
            "Create configs/printers.local.yaml from the pilot example before saving printer edits.",
            None,
            "manual",
        ),
        _autopilot_check(
            "printers_loaded",
            len(printers) > 0,
            "Printer Inventory",
            f"{len(printers)} printers loaded.",
            "Load printer inventory from config into the local database.",
            "bootstrap_printers",
        ),
        _autopilot_check(
            "s1_locked",
            _printer_locked_by_id(printers, "flsun-s1"),
            "FLSUN S1 Safety Lock",
            "S1 is locked and will not be probed.",
            "S1 must remain locked until maintenance is cleared.",
            None,
            "safety",
        ),
        _autopilot_check(
            "camera_coverage",
            _camera_count(printers) >= max(1, _enabled_printer_count(printers)),
            "Camera Coverage",
            f"{_camera_count(printers)} camera URLs configured.",
            "Add integrated or USB camera URLs for cleared printers.",
            None,
            "manual",
        ),
        _autopilot_check(
            "no_duplicate_ports",
            len(runtime.get("duplicate_ports", {})) == 0,
            "Runtime Port Conflicts",
            "No conflicting saved runtime ports.",
            "Auto-assign open ports for local services.",
            "auto_assign_ports",
        ),
        _tool_check("prusaslicer", "PrusaSlicer CLI", ["prusa-slicer", "prusa-slicer-console"]),
        _tool_check("orcaslicer", "OrcaSlicer CLI", ["orca-slicer", "OrcaSlicer"]),
        _tool_check("openscad", "OpenSCAD", ["openscad"]),
        _tool_check("blender", "Blender", ["blender"]),
        _tool_check("cadquery", "CadQuery CLI", ["cadquery", "cq-cli"]),
        _autopilot_check(
            "model_endpoint_configured",
            model_endpoint["ok"],
            "Modeling LLM Endpoint",
            model_endpoint["detail"],
            model_endpoint["detail"],
            None,
            "manual",
        ),
        _autopilot_check(
            "minimax_mcp_configured",
            bool(providers["minimax_mcp"]["ready"]),
            "MiniMax-MCP Vision",
            providers["minimax_mcp"]["detail"],
            providers["minimax_mcp"]["detail"],
            None,
            "manual",
        ),
        _autopilot_check(
            "deepseek_v4_configured",
            bool(providers["deepseek_v4"]["ready"]),
            "DeepSeek V4 Reasoning",
            providers["deepseek_v4"]["detail"],
            providers["deepseek_v4"]["detail"],
            None,
            "optional",
        ),
        _autopilot_check(
            "azure_speech_configured",
            azure_is_configured(speech),
            "Azure Voice Layer",
            "Azure Speech key and region are configured.",
            "Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in .env for Hermes agent voices.",
            None,
            "manual",
        ),
        _autopilot_check(
            "generation_stack_configured",
            bool(generation_stack.get("enabled", True)) and bool(runtime_urls.get("comfyui")),
            "3D Generation Stack",
            "ComfyUI/TRELLIS generation sidecar URLs are saved.",
            "Save ComfyUI, TRELLIS.2, Hunyuan3D-2.1, and TripoSR service URLs in runtime settings.",
            None,
            "manual",
        ),
        _autopilot_check(
            "slicer_profiles",
            _enabled_printer_count(printers) > 0 and _enabled_printer_profiles_exist(printers),
            "Slicer Profiles",
            "Enabled printers have slicer profile paths that exist.",
            "Add reviewed PrusaSlicer profiles for each cleared printer.",
            None,
            "manual",
        ),
    ]
    ready = sum(1 for check in checks if check["ok"])
    actions = _autopilot_actions(checks)
    return {
        "mode": "safe_setup",
        "ready": ready,
        "total": len(checks),
        "score": round(ready / max(1, len(checks)), 2),
        "summary": f"{ready} of {len(checks)} setup checks are ready.",
        "checks": checks,
        "actions": actions,
        "guardrails": [
            "Autopilot does not move printers.",
            "Autopilot does not probe locked printers.",
            "Autopilot does not upload or start prints.",
            "FLSUN S1 remains locked until the user clears maintenance.",
        ],
    }


def _autopilot_check(
    key: str,
    ok: bool,
    title: str,
    ready_detail: str,
    missing_detail: str,
    action_id: str | None = None,
    kind: str = "setup",
) -> dict[str, Any]:
    return {
        "key": key,
        "title": title,
        "ok": ok,
        "kind": kind,
        "detail": ready_detail if ok else missing_detail,
        "action_id": None if ok else action_id,
    }


def _autopilot_actions(checks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    action_titles = {
        "ensure_runtime_config": "Create Runtime Config",
        "ensure_storage_dirs": "Create Storage Directories",
        "bootstrap_printers": "Load Printer Inventory",
        "auto_assign_ports": "Auto Assign Open Ports",
    }
    actions = []
    seen = set()
    for check in checks:
        action_id = check.get("action_id")
        if action_id and action_id not in seen:
            seen.add(action_id)
            actions.append(
                {
                    "id": action_id,
                    "title": action_titles.get(action_id, action_id.replace("_", " ").title()),
                    "detail": check["detail"],
                    "safe": True,
                }
            )
    actions.extend(
        [
            {
                "id": "autopilot_next_gate",
                "title": "Autopilot To Next Safe Gate",
                "detail": "Advance the active job through safe non-printer steps and stop at approvals or printer actions.",
                "safe": True,
            },
            {
                "id": "write_agent_plan",
                "title": "Write Agent Plan",
                "detail": "Create a Hermes planning artifact for the active job.",
                "safe": True,
            },
            {
                "id": "write_setup_report",
                "title": "Write Setup Report",
                "detail": "Create an agent-readable report in storage/autopilot.",
                "safe": True,
            },
            {
                "id": "create_pilot_job",
                "title": "Create Dry-Run Pilot Job",
                "detail": "Create a safe setup job record without touching hardware.",
                "safe": True,
            },
        ]
    )
    return actions


def _tool_check(key: str, title: str, commands: list[str]) -> dict[str, Any]:
    found = _tool_path(key, commands)
    return _autopilot_check(
        f"tool_{key}",
        found is not None,
        title,
        f"Detected `{found}`.",
        f"Install or add one of these commands to PATH: {', '.join(commands)}.",
        None,
        "tool",
    )


def _tool_path(key: str, commands: list[str]) -> str | None:
    env_names = {
        "blender": "HERMES3D_BLENDER_PATH",
        "prusaslicer": "HERMES3D_PRUSASLICER_PATH",
        "prusaslicer_gui": "HERMES3D_PRUSASLICER_GUI_PATH",
        "orcaslicer": "HERMES3D_ORCASLICER_PATH",
        "orcaslicer_gui": "HERMES3D_ORCASLICER_GUI_PATH",
        "flsunslicer": "HERMES3D_FLSUNSLICER_PATH",
        "flsunslicer_gui": "HERMES3D_FLSUNSLICER_GUI_PATH",
        "cura": "HERMES3D_CURA_PATH",
        "cura_gui": "HERMES3D_CURA_GUI_PATH",
    }
    env_path = os.getenv(env_names.get(key, ""))
    if env_path and Path(env_path).exists():
        return env_path
    for command in commands:
        found = shutil.which(command)
        if found:
            return found
    known_paths = {
        "blender": [
            r"C:\Program Files\Blender Foundation\Blender 4.3\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 4.2\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 4.1\blender.exe",
        ],
        "prusaslicer": [
            r"C:\Program Files\Prusa3D\PrusaSlicer\prusa-slicer-console.exe",
            r"C:\Program Files\Prusa3D\PrusaSlicer\prusa-slicer.exe",
        ],
        "prusaslicer_gui": [
            r"C:\Program Files\Prusa3D\PrusaSlicer\prusa-slicer.exe",
        ],
        "orcaslicer": [
            r"C:\Program Files\OrcaSlicer\orca-slicer.exe",
        ],
        "orcaslicer_gui": [
            r"C:\Program Files\OrcaSlicer\orca-slicer.exe",
        ],
        "flsunslicer": [
            r"C:\Program Files\FlsunSlicer\FlsunSlicer.exe",
            r"C:\Program Files\FLSUN Slicer\FlsunSlicer.exe",
        ],
        "flsunslicer_gui": [
            r"C:\Program Files\FlsunSlicer\FlsunSlicer.exe",
            r"C:\Program Files\FLSUN Slicer\FlsunSlicer.exe",
        ],
        "cura": [
            r"C:\Program Files\UltiMaker Cura 5.9.0\UltiMaker-Cura.exe",
            r"C:\Program Files\UltiMaker Cura 5.8.1\UltiMaker-Cura.exe",
            r"C:\Program Files\Ultimaker Cura 5.7.2\UltiMaker-Cura.exe",
        ],
        "cura_gui": [
            r"C:\Program Files\UltiMaker Cura 5.9.0\UltiMaker-Cura.exe",
            r"C:\Program Files\UltiMaker Cura 5.8.1\UltiMaker-Cura.exe",
            r"C:\Program Files\Ultimaker Cura 5.7.2\UltiMaker-Cura.exe",
        ],
    }
    for candidate in known_paths.get(key, []):
        if Path(candidate).exists():
            return candidate
    return None


def _source_manifest_path() -> Path:
    lab_manifest = settings.repo_root / "source-lab" / "source_manifest.json"
    if lab_manifest.exists():
        return lab_manifest
    return settings.repo_root / "apps" / "web" / "source_manifest.json"


def _source_manifest() -> dict[str, Any]:
    path = _source_manifest_path()
    if not path.exists():
        raise HTTPException(status_code=404, detail="Source manifest is not installed")
    return json.loads(path.read_text(encoding="utf-8"))


def _source_root() -> Path:
    manifest = _source_manifest()
    return settings.repo_root / str(manifest.get("sourceRoot") or "source-lab/sources")


def _source_modules() -> list[dict[str, Any]]:
    manifest = _source_manifest()
    modules: list[dict[str, Any]] = []
    groups = manifest.get("groups") or {}
    for group_name, group_modules in groups.items():
        for module in group_modules or []:
            item = dict(module)
            item["group"] = group_name
            modules.append(item)
    return modules


def _source_module_by_id(app_id: str) -> dict[str, Any]:
    for module in _source_modules():
        if module.get("id") == app_id or module.get("name") == app_id:
            return module
    raise HTTPException(status_code=404, detail="Source module not found")


def _source_executable_config(module: dict[str, Any]) -> dict[str, Any]:
    for item in SOURCE_APP_REGISTRY:
        if item["id"] == module.get("id") or item["name"] == module.get("name"):
            return item
    return {}


def _source_app_payload(module: dict[str, Any], source_root: Path) -> dict[str, Any]:
    executable_config = _source_executable_config(module)
    target = Path(str(module.get("target") or ""))
    source_path = source_root / target
    cli_path = ""
    gui_path = ""
    if executable_config:
        cli_path = _tool_path(executable_config["tool_key"], executable_config["cli_commands"]) or ""
        gui_path = (
            _tool_path(
                executable_config.get("gui_tool_key", executable_config["tool_key"]),
                executable_config["gui_commands"],
            )
            or ""
        )
    source_exists = source_path.exists()
    source_has_git = (source_path / ".git").exists()
    sparse_checkout = _git_output(source_path, ["config", "--bool", "core.sparseCheckout"]) if source_has_git else ""
    checkout_mode = "sparse" if sparse_checkout == "true" else "full" if source_has_git else "folder"
    return {
        "id": module.get("id"),
        "name": module.get("name"),
        "group": module.get("group"),
        "repo": module.get("repo") or "",
        "license": module.get("license") or "unknown",
        "priority": module.get("priority") or "candidate",
        "ux_section": module.get("uxSection") or "",
        "source_path": str(source_path),
        "source_exists": source_exists,
        "source_has_git": source_has_git,
        "checkout_mode": checkout_mode,
        "source_branch": _git_output(source_path, ["branch", "--show-current"]) if source_has_git else "",
        "source_head": _git_output(source_path, ["rev-parse", "--short", "HEAD"]) if source_has_git else "",
        "source_highlights": _source_highlights(source_path) if source_exists else [],
        "cli_executable": cli_path,
        "installed_executable": gui_path or cli_path,
        "launch_available": bool(gui_path or cli_path),
        "open_source_available": source_exists,
        "embed_mode": "not_embedded",
        "ui_host": "Source OS action bridge",
        "safe_actions": [
            "open source checkout",
            "open upstream repository",
            "launch detected native app",
            "refresh source status",
        ],
    }


def _source_highlights(path: Path) -> list[str]:
    try:
        return [item.name for item in sorted(path.iterdir(), key=lambda item: item.name.lower())[:8]]
    except OSError:
        return []


def _git_output(cwd: Path, args: list[str]) -> str:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=str(cwd),
            check=False,
            capture_output=True,
            text=True,
            timeout=3,
        )
    except (OSError, subprocess.SubprocessError):
        return ""
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


def _open_local_path(path: Path) -> None:
    if hasattr(os, "startfile"):
        os.startfile(str(path))  # type: ignore[attr-defined]
        return
    subprocess.Popen(["explorer", str(path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def _camera_count(printers: list[dict[str, Any]]) -> int:
    return sum(
        1
        for printer in printers
        if printer.get("enabled") and not _printer_locked(printer) and camera_url_for_printer(printer)
    )


def _enabled_printer_count(printers: list[dict[str, Any]]) -> int:
    return sum(1 for printer in printers if printer.get("enabled") and not _printer_locked(printer))


def _printer_locked_by_id(printers: list[dict[str, Any]], printer_id: str) -> bool:
    printer = next((item for item in printers if item.get("id") == printer_id), None)
    return bool(printer and _printer_locked(printer))


def _printer_locked(printer: dict[str, Any]) -> bool:
    capabilities = printer.get("capabilities", {})
    return (
        not printer.get("enabled")
        or bool(capabilities.get("maintenance_lock"))
        or bool(capabilities.get("do_not_probe"))
    )


def camera_url_for_printer(printer: dict[str, Any]) -> str:
    capabilities = printer.get("capabilities", {})
    for key in ("camera_url", "usb_camera_url", "camera"):
        value = capabilities.get(key)
        if isinstance(value, str) and value.startswith("http"):
            return value
    return ""


def _model_endpoint_status(services: dict[str, Any]) -> dict[str, Any]:
    hermes = services.get("hermes", {})
    workers = services.get("workers", {})
    modeling = workers.get("modeling", {}) if isinstance(workers, dict) else {}
    model_name = str(modeling.get("model") or hermes.get("model_name") or "")
    base_url = str(modeling.get("base_url") or hermes.get("model_base_url") or "")
    configured = bool(base_url.startswith("http") and model_name and "your-" not in model_name)
    reachable = False
    models: list[str] = []
    if base_url.startswith("http"):
        try:
            response = httpx.get(f"{base_url.rstrip('/')}/models", timeout=1.0)
            response.raise_for_status()
            payload = response.json()
            models = [
                str(item.get("id"))
                for item in payload.get("data", [])
                if isinstance(item, dict) and item.get("id")
            ]
            reachable = True
        except (httpx.HTTPError, ValueError):
            reachable = False
    if configured and reachable:
        matched = model_name in models if models else True
        detail = f"Endpoint reachable at {base_url}; configured model is {model_name}."
        if models and not matched:
            detail = f"Endpoint reachable, but configured model `{model_name}` was not in /models."
        return {"ok": matched, "detail": detail, "models": models}
    if reachable:
        return {
            "ok": False,
            "detail": f"Endpoint reachable at {base_url}, but services config still uses placeholder model names.",
            "models": models,
        }
    if configured:
        return {
            "ok": False,
            "detail": f"Configured as {model_name} at {base_url}, but /models did not answer.",
            "models": models,
        }
    return {
        "ok": False,
        "detail": "Configure the downloaded modeling LLM endpoint and model name.",
        "models": models,
    }


def _enabled_printer_profiles_exist(printers: list[dict[str, Any]]) -> bool:
    enabled = [printer for printer in printers if printer.get("enabled") and not _printer_locked(printer)]
    if not enabled:
        return False
    for printer in enabled:
        profile = printer.get("slicer_profile")
        if not profile:
            return False
        if not (settings.repo_root / profile).exists():
            return False
    return True


def _create_autopilot_job(note: str | None) -> dict[str, Any]:
    now = utc_now()
    description = "Autopilot-created dry-run setup job. This job is for workflow validation only and does not touch hardware."
    if note:
        description = f"{description}\n\nNote: {note}"
    with db.connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO jobs (title, description, state, target_printer_id, created_at, updated_at)
            VALUES (?, ?, 'INTAKE', NULL, ?, ?)
            """,
            ("Autopilot setup dry-run", description, now, now),
        )
        job_id = int(cursor.lastrowid)
    db.add_event(job_id, "JOB_CREATED", "Autopilot dry-run setup job created.", {"note": note})
    return get_job(job_id)


def _write_autopilot_report() -> Path:
    status = _autopilot_status()
    report_dir = settings.storage_dir / "autopilot"
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "setup-report.md"
    lines = [
        "# Hermes OS Print Factory Autopilot Report",
        "",
        status["summary"],
        "",
        "## Checks",
    ]
    for check in status["checks"]:
        marker = "ready" if check["ok"] else "needs attention"
        lines.append(f"- {check['title']}: {marker} - {check['detail']}")
    lines.extend(["", "## Guardrails"])
    lines.extend(f"- {item}" for item in status["guardrails"])
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    db.add_event(
        None,
        "AUTOPILOT_REPORT_WRITTEN",
        "Autopilot setup report written.",
        {"path": str(report_path)},
    )
    return report_path


def _active_autopilot_job() -> dict[str, Any]:
    jobs = _list_jobs()
    if jobs:
        return get_job(jobs[0]["id"])
    return _create_autopilot_job("Autopilot created this job because no active job existed.")


def _autopilot_job_to_next_gate(job_id: int) -> None:
    stop_states = {
        MODEL_APPROVAL,
        PRINT_APPROVAL,
        SELECT_PRINTER,
        "UPLOAD_ONLY",
        USER_CHECKED_PRINTER_UI,
        START_PRINT,
        COMPLETE,
    }
    for _ in range(12):
        job = get_job(job_id)
        if job["state"] in stop_states:
            db.add_event(
                job_id,
                "AUTOPILOT_STOPPED",
                f"Autopilot stopped safely at {job['state']}.",
                {"state": job["state"]},
            )
            return
        transition = next_transition(job["state"])
        if transition.next_state in {"UPLOAD_ONLY", USER_CHECKED_PRINTER_UI, START_PRINT}:
            db.add_event(
                job_id,
                "AUTOPILOT_STOPPED",
                f"Autopilot refused hardware-adjacent transition to {transition.next_state}.",
                {"state": job["state"], "next_state": transition.next_state},
            )
            return
        _advance_safe_step(job_id, job, transition.next_state)
    db.add_event(job_id, "AUTOPILOT_STOPPED", "Autopilot stopped after maximum safe steps.")


def _advance_safe_step(job_id: int, job: dict[str, Any], next_state: str) -> None:
    if next_state == "PLAN_JOB" and not _has_artifact(job_id, "agent_plan"):
        _write_agent_plan(job_id, job)
    if next_state == MODEL_APPROVAL and not _has_artifact(job_id, "model_evidence"):
        _generate_model_evidence(job_id, job)
    if next_state == "VALIDATE_GCODE" and not _has_artifact(job_id, "gcode"):
        _run_slicer(job_id)
    if next_state == SELECT_PRINTER:
        db.add_event(
            job_id,
            "AUTOPILOT_STOPPED",
            "Autopilot stopped before printer selection.",
            {"next_state": next_state},
        )
        return
    _set_job_state(job_id, next_state)
    db.add_event(
        job_id,
        "AUTOPILOT_ADVANCED",
        f"Autopilot advanced safely from {job['state']} to {next_state}.",
    )


def _write_agent_plan(job_id: int, job: dict[str, Any]) -> Path:
    plan_dir = settings.storage_dir / "jobs" / str(job_id)
    plan_dir.mkdir(parents=True, exist_ok=True)
    plan_path = plan_dir / "hermes-agent-plan.md"
    printers = _list_printers()
    runtime = _runtime_payload()
    missing_inputs = []
    if not any(not _printer_locked(printer) for printer in printers):
        missing_inputs.append("No cleared printer is available.")
    if _camera_count(printers) < _enabled_printer_count(printers):
        missing_inputs.append("Camera URLs are missing for one or more cleared printers.")
    if runtime.get("duplicate_ports"):
        missing_inputs.append("Runtime port conflicts need attention.")
    if not _enabled_printer_profiles_exist(printers):
        missing_inputs.append("Reviewed slicer profiles are missing for cleared printers.")
    if not missing_inputs:
        missing_inputs.append("No blocking setup input detected by deterministic checks.")

    lines = [
        "# Hermes Agent Plan",
        "",
        f"Job: {job['title']}",
        f"State: {job['state']}",
        "",
        "## Intent",
        job["description"],
        "",
        "## Assumptions",
        "- Printer movement and print start require explicit user action.",
        "- FLSUN S1 remains locked while maintenance risk is present.",
        "- Simulated slicing is allowed for dry-run workflow evidence.",
        "",
        "## Missing Inputs",
        *[f"- {item}" for item in missing_inputs],
        "",
        "## Evidence Checklist",
        "- Agent plan artifact",
        "- Model evidence artifact",
        "- Slicer or simulated G-code artifact",
        "- Model approval",
        "- Print approval",
        "- Upload-only event before any start request",
        "- User checked printer UI or camera acknowledgement",
        "",
        "## Next Safe Action",
        _next_safe_action_for_job(job),
        "",
    ]
    plan_path.write_text("\n".join(lines), encoding="utf-8")
    existing = _latest_artifact(job_id, "agent_plan")
    if existing and existing.get("path") == str(plan_path):
        db.add_event(
            job_id,
            "AGENT_PLAN_UPDATED",
            "Hermes agent plan artifact updated.",
            {"path": str(plan_path)},
        )
        return plan_path
    _add_artifact(
        job_id,
        "agent_plan",
        plan_path,
        {
            "planner": "hermes3d-deterministic-autopilot",
            "missing_inputs": missing_inputs,
            "next_safe_action": _next_safe_action_for_job(job),
        },
    )
    db.add_event(job_id, "AGENT_PLAN_CREATED", "Hermes agent plan artifact created.", {"path": str(plan_path)})
    return plan_path


def _next_safe_action_for_job(job: dict[str, Any]) -> str:
    state = job["state"]
    if state in {MODEL_APPROVAL, PRINT_APPROVAL}:
        return f"User review is required at {state}."
    if state in {SELECT_PRINTER, "UPLOAD_ONLY", USER_CHECKED_PRINTER_UI, START_PRINT}:
        return f"User printer action is required at {state}."
    if state == COMPLETE:
        return "Job is complete."
    return "Run Autopilot To Next Safe Gate."


def _assign_open_ports(
    names: list[str], start: int, end: int, host: str, randomize: bool
) -> dict[str, int]:
    if len(names) > (end - start + 1):
        raise HTTPException(status_code=400, detail="Port range is too small for requested services")
    candidates = list(range(start, end + 1))
    if randomize:
        random.shuffle(candidates)
    assigned: dict[str, int] = {}
    reserved: set[int] = set()
    for name in names:
        for port in candidates:
            if port in reserved:
                continue
            if _port_is_open(host, port):
                assigned[name] = port
                reserved.add(port)
                break
        if name not in assigned:
            raise HTTPException(status_code=409, detail=f"No open port found for {name}")
    return assigned


def _port_is_open(host: str, port: int) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind((host, port))
        return True
    except OSError:
        return False


def _service_urls_for_ports(runtime: dict[str, Any]) -> dict[str, str]:
    host = str(runtime.get("api_host") or "127.0.0.1")
    ports = runtime.get("ports", {})
    urls = dict(runtime.get("service_urls", {}))
    mapping = {
        "model_llm": ("model_llm", "/v1"),
        "fdm_monster": ("fdm_monster", ""),
        "comfyui": ("comfyui", ""),
        "hunyuan3d": ("hunyuan3d", ""),
        "trellis": ("trellis", ""),
        "triposr": ("triposr", ""),
    }
    for url_name, (port_name, suffix) in mapping.items():
        port = ports.get(port_name)
        if port:
            urls[url_name] = f"http://{host}:{port}{suffix}"
    return urls


def _replace_url_port(base_url: str, port: int) -> str:
    parsed = urlsplit(base_url if "://" in base_url else f"http://{base_url}")
    host = parsed.hostname
    if not host:
        raise HTTPException(status_code=400, detail="Printer base URL has no host")
    netloc = host if port == 80 else f"{host}:{port}"
    if parsed.username:
        auth = parsed.username
        if parsed.password:
            auth = f"{auth}:{parsed.password}"
        netloc = f"{auth}@{netloc}"
    return urlunsplit((parsed.scheme or "http", netloc, parsed.path or "", "", ""))


def _printer_config_is_example() -> bool:
    return settings.printers_config_path.name.endswith(".example.yaml")


def _save_printer_base_url(printer_id: str, base_url: str) -> dict[str, Any]:
    import yaml

    with settings.printers_config_path.open("r", encoding="utf-8") as handle:
        config = yaml.safe_load(handle) or {}
    printers = config.get("printers", [])
    if not isinstance(printers, list):
        raise HTTPException(status_code=500, detail="Printer config is missing a printers list")
    for printer in printers:
        if isinstance(printer, dict) and printer.get("id") == printer_id:
            moonraker = dict(printer.get("moonraker", {}) or {})
            moonraker["base_url"] = base_url
            printer["moonraker"] = moonraker
            with settings.printers_config_path.open("w", encoding="utf-8") as handle:
                yaml.safe_dump(config, handle, sort_keys=False)
            return printer
    raise HTTPException(status_code=404, detail="Printer not found in printer config")


def _save_printer_camera_url(printer_id: str, camera_url: str) -> dict[str, Any]:
    import yaml

    with settings.printers_config_path.open("r", encoding="utf-8") as handle:
        config = yaml.safe_load(handle) or {}
    printers = config.get("printers", [])
    if not isinstance(printers, list):
        raise HTTPException(status_code=500, detail="Printer config is missing a printers list")
    for printer in printers:
        if isinstance(printer, dict) and printer.get("id") == printer_id:
            capabilities = dict(printer.get("capabilities", {}) or {})
            capabilities["camera_url"] = camera_url
            printer["capabilities"] = capabilities
            with settings.printers_config_path.open("w", encoding="utf-8") as handle:
                yaml.safe_dump(config, handle, sort_keys=False)
            return printer
    raise HTTPException(status_code=404, detail="Printer not found in printer config")


def _list_jobs() -> list[dict[str, Any]]:
    with db.connect() as conn:
        rows = conn.execute("SELECT * FROM jobs ORDER BY id DESC").fetchall()
    return [row_to_dict(row) for row in rows]


def _list_artifacts() -> list[dict[str, Any]]:
    with db.connect() as conn:
        rows = conn.execute(
            """
            SELECT artifacts.*, jobs.title AS job_title
            FROM artifacts
            JOIN jobs ON jobs.id = artifacts.job_id
            ORDER BY artifacts.id DESC
            LIMIT 200
            """
        ).fetchall()
    return [_enrich_artifact(row_to_dict(row)) for row in rows]


def _list_approvals() -> list[dict[str, Any]]:
    with db.connect() as conn:
        rows = conn.execute(
            """
            SELECT approvals.*, jobs.title AS job_title
            FROM approvals
            JOIN jobs ON jobs.id = approvals.job_id
            ORDER BY approvals.id DESC
            LIMIT 200
            """
        ).fetchall()
    return [row_to_dict(row) for row in rows]


def _list_events() -> list[dict[str, Any]]:
    with db.connect() as conn:
        rows = conn.execute(
            """
            SELECT events.*, jobs.title AS job_title
            FROM events
            LEFT JOIN jobs ON jobs.id = events.job_id
            ORDER BY events.id DESC
            LIMIT 200
            """
        ).fetchall()
    return [row_to_dict(row) for row in rows]


def _set_target_printer(job_id: int, printer_id: str) -> None:
    with db.connect() as conn:
        conn.execute(
            "UPDATE jobs SET target_printer_id = ?, updated_at = ? WHERE id = ?",
            (printer_id, utc_now(), job_id),
        )


def _ensure_target_printer(job_id: int, job: dict[str, Any], target_printer_id: str | None = None) -> str:
    target_printer_id = target_printer_id or job.get("target_printer_id") or _first_printer_id()
    if not target_printer_id:
        raise HTTPException(status_code=409, detail="No printer is available for selection")
    _set_target_printer(job_id, target_printer_id)
    return target_printer_id


def _add_artifact(job_id: int, kind: str, path: Path, metadata: dict[str, Any] | None = None) -> None:
    with db.connect() as conn:
        conn.execute(
            """
            INSERT INTO artifacts (job_id, kind, path, metadata_json, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (job_id, kind, str(path), json.dumps(metadata or {}, sort_keys=True), utc_now()),
        )


def _get_artifact(artifact_id: int) -> dict[str, Any]:
    with db.connect() as conn:
        row = conn.execute("SELECT * FROM artifacts WHERE id = ?", (artifact_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Artifact not found")
    return _enrich_artifact(row_to_dict(row))


def _enrich_artifact(artifact: dict[str, Any]) -> dict[str, Any]:
    path = Path(str(artifact.get("path") or ""))
    metadata = artifact.get("metadata", {}) if isinstance(artifact.get("metadata"), dict) else {}
    evidence = metadata.get("evidence", {}) if isinstance(metadata.get("evidence"), dict) else {}
    role = evidence.get("role") or _evidence_role_for_artifact(artifact, path)
    is_visual = role in VISUAL_EVIDENCE_KINDS or path.suffix.lower() in VISUAL_FILE_SUFFIXES
    file_url = f"/api/artifacts/{artifact['id']}/file"
    artifact["file_url"] = file_url
    artifact["is_visual"] = is_visual
    if is_visual:
        metadata = dict(metadata)
        evidence = dict(evidence)
        evidence.setdefault("role", role or "screenshot")
        evidence.setdefault("url", file_url)
        evidence.setdefault("thumbnail_url", file_url)
        evidence.setdefault("privacy", "local")
        metadata["evidence"] = evidence
        artifact["metadata"] = metadata
    return artifact


def _evidence_role_for_artifact(artifact: dict[str, Any], path: Path) -> str:
    kind = str(artifact.get("kind") or "")
    if kind.startswith("visual_"):
        return kind.removeprefix("visual_")
    if "source_image" in kind:
        return "source_image"
    if "preview" in kind and path.suffix.lower() in VISUAL_FILE_SUFFIXES:
        return "mesh_preview"
    if path.suffix.lower() == ".svg":
        return "diagram"
    if path.suffix.lower() in VISUAL_FILE_SUFFIXES:
        return "screenshot"
    return ""


def _artifact_storage_path(artifact: dict[str, Any]) -> Path:
    storage_root = settings.storage_dir.resolve()
    path = Path(str(artifact.get("path") or "")).resolve()
    try:
        path.relative_to(storage_root)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail="Artifact is outside Hermes storage") from exc
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Artifact file not found")
    return path


def _safe_upload_name(filename: str | None, prefix: str) -> str:
    original = Path(filename or prefix).name
    suffix = Path(original).suffix or ".bin"
    stem = Path(original).stem or prefix
    safe_stem = re.sub(r"[^A-Za-z0-9._-]+", "-", stem).strip(".-")[:80] or prefix
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    return f"{timestamp}-{prefix}-{safe_stem}{suffix}"


def _visual_evidence_metadata(
    evidence_kind: str,
    path: Path,
    content_type: str | None,
    agent_id: str,
    stage: str,
    gate: str | None,
    label: str | None,
    notes: str | None,
) -> dict[str, Any]:
    return {
        "evidence": {
            "role": evidence_kind,
            "media_type": content_type or _media_type_for_path(path),
            "label": label or evidence_kind.replace("_", " ").title(),
            "stage": stage,
            "gate": gate or "",
            "captured_at": utc_now(),
            "privacy": "local",
            "agent_id": agent_id,
            "evidence_required": True,
        },
        "vision": {
            "provider": "minimax-mcp",
            "analysis_status": "pending_provider_runtime",
            "summary": "Visual evidence attached. MiniMax-MCP analysis should be run before using this as a safety or printability claim.",
        },
        "notes": notes or "",
    }


def _visual_summary_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
    summary = dict(metadata)
    evidence = dict(summary.get("evidence", {}))
    evidence["role"] = "report"
    evidence["media_type"] = "text/markdown"
    evidence["label"] = f"{evidence.get('label', 'Visual evidence')} summary"
    summary["evidence"] = evidence
    return summary


def _media_type_for_path(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".svg":
        return "image/svg+xml"
    if suffix in {".jpg", ".jpeg"}:
        return "image/jpeg"
    if suffix == ".png":
        return "image/png"
    if suffix == ".gif":
        return "image/gif"
    if suffix == ".webp":
        return "image/webp"
    return "application/octet-stream"


def _write_visual_evidence_summary(
    *,
    job_id: int,
    job: dict[str, Any],
    evidence_path: Path,
    metadata: dict[str, Any],
) -> Path:
    evidence = metadata["evidence"]
    summary_dir = job_dir(settings.storage_dir, job_id) / "visual-evidence"
    summary_dir.mkdir(parents=True, exist_ok=True)
    summary_path = summary_dir / f"{evidence['captured_at'].replace(':', '').replace('+', '-')}-summary.md"
    summary_path.write_text(
        "\n".join(
            [
                "# Visual Evidence Summary",
                "",
                f"- Job: {job['title']}",
                f"- Role: {evidence['role']}",
                f"- Agent: {evidence['agent_id']}",
                f"- Stage: {evidence['stage']}",
                f"- Gate: {evidence['gate'] or 'none'}",
                f"- File: {evidence_path}",
                f"- Media type: {evidence['media_type']}",
                f"- Captured at: {evidence['captured_at']}",
                "- Vision provider: minimax-mcp",
                "- Analysis status: pending_provider_runtime",
                "",
                "This artifact is local evidence for a vision-enabled Hermes agent. It must be analyzed before it is used to justify a printability, safety, or printer-observation decision.",
                "",
                f"Notes: {metadata.get('notes') or 'none'}",
                "",
            ]
        ),
        encoding="utf-8",
    )
    return summary_path


def _has_artifact(job_id: int, kind: str) -> bool:
    with db.connect() as conn:
        row = conn.execute(
            "SELECT id FROM artifacts WHERE job_id = ? AND kind = ? LIMIT 1", (job_id, kind)
        ).fetchone()
    return row is not None


def _latest_artifact(job_id: int, kind: str) -> dict[str, Any] | None:
    with db.connect() as conn:
        row = conn.execute(
            "SELECT * FROM artifacts WHERE job_id = ? AND kind = ? ORDER BY id DESC LIMIT 1",
            (job_id, kind),
        ).fetchone()
    return row_to_dict(row) if row else None


def _generate_model_evidence(job_id: int, job: dict[str, Any]) -> None:
    model_artifact = _latest_artifact(job_id, "model")
    evidence = write_text_artifact(
        settings.storage_dir,
        job_id,
        "model-evidence.txt",
        "\n".join(
            [
                "Hermes3D OS model evidence",
                f"Job: {job['title']}",
                f"Description: {job['description']}",
                f"Model artifact: {(model_artifact or {}).get('path', 'not uploaded')}",
                "Validation mode: MVP placeholder",
                "Printable: requires user approval and real validation before hardware use",
                "",
            ]
        ),
    )
    _add_artifact(
        job_id,
        "model_evidence",
        evidence,
        {
            "validator": "mvp-placeholder",
            "model_uploaded": bool(model_artifact),
            "printable": False,
        },
    )
    db.add_event(job_id, "MODEL_EVIDENCE_CREATED", "Model evidence artifact created.")


def _run_slicer(job_id: int) -> None:
    job = get_job(job_id)
    printer = _get_printer(job.get("target_printer_id")) if job.get("target_printer_id") else None
    model = _latest_artifact(job_id, "model")
    result = slicer.slice_or_simulate(job_id, (model or {}).get("path"), printer)
    _add_artifact(job_id, "gcode", result.gcode_path, result.metadata)
    db.add_event(job_id, "SLICER_FINISHED", "Slicer worker completed.", result.metadata)


def _require_approval(job_id: int, gate: str) -> None:
    with db.connect() as conn:
        row = conn.execute(
            """
            SELECT id FROM approvals
            WHERE job_id = ? AND gate = ? AND approved = 1
            ORDER BY id DESC LIMIT 1
            """,
            (job_id, gate),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=409, detail=f"{gate} approval is required")


def _first_printer_id() -> str | None:
    with db.connect() as conn:
        row = conn.execute("SELECT id FROM printers WHERE enabled = 1 ORDER BY name LIMIT 1").fetchone()
    return row["id"] if row else None


def _require_printer_probe_allowed(printer: dict[str, Any]) -> None:
    capabilities = printer.get("capabilities", {})
    reason = capabilities.get("lock_reason") or f"{printer['name']} is safety locked."
    if not printer.get("enabled") or capabilities.get("maintenance_lock") or capabilities.get("do_not_probe"):
        raise HTTPException(status_code=423, detail=reason)


def _get_printer(printer_id: str | None) -> dict[str, Any] | None:
    if not printer_id:
        return None
    with db.connect() as conn:
        row = conn.execute("SELECT * FROM printers WHERE id = ?", (printer_id,)).fetchone()
    return row_to_dict(row) if row else None


async def _upload_to_printer(job_id: int) -> None:
    job = get_job(job_id)
    printer = _get_printer(job.get("target_printer_id"))
    if not printer:
        raise HTTPException(status_code=409, detail="No printer selected")
    _require_printer_probe_allowed(printer)
    gcode = _latest_artifact(job_id, "gcode")
    if not gcode:
        raise HTTPException(status_code=409, detail="No G-code artifact exists")
    if not settings.dry_run_printers and not gcode.get("metadata", {}).get("printable"):
        raise HTTPException(
            status_code=409,
            detail="Real printer dispatch requires a printable G-code artifact from a real slicer.",
        )

    status = await moonraker.status(printer)
    result = await moonraker.upload_gcode(printer, gcode["path"], print_after_upload=False)
    db.add_event(job_id, "PRINTER_STATUS", status.message, status.payload)
    db.add_event(job_id, "PRINTER_UPLOAD_ONLY", result.message, result.payload)


async def _start_print(job_id: int) -> None:
    job = get_job(job_id)
    printer = _get_printer(job.get("target_printer_id"))
    if not printer:
        raise HTTPException(status_code=409, detail="No printer selected")
    _require_printer_probe_allowed(printer)
    gcode = _latest_artifact(job_id, "gcode")
    if not gcode:
        raise HTTPException(status_code=409, detail="No G-code artifact exists")
    if not settings.dry_run_printers and not gcode.get("metadata", {}).get("printable"):
        raise HTTPException(
            status_code=409,
            detail="Real printer start requires a printable G-code artifact from a real slicer.",
        )

    result = await moonraker.start_print(printer, Path(gcode["path"]).name)
    db.add_event(job_id, "PRINTER_START_REQUESTED", result.message, result.payload)


def _record_telemetry(job_id: int, state: str) -> None:
    job = get_job(job_id)
    printer_id = job.get("target_printer_id")
    payload = {"dry_run": settings.dry_run_printers, "state": state}
    with db.connect() as conn:
        conn.execute(
            """
            INSERT INTO telemetry (job_id, printer_id, state, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (job_id, printer_id, state, json.dumps(payload, sort_keys=True), utc_now()),
        )
    db.add_event(job_id, "TELEMETRY_RECORDED", f"Telemetry recorded: {state}.", payload)


def _speech_config() -> dict[str, Any]:
    return speech_config_from_services(load_services_config(settings))


def _save_agent_voice(agent_id: str, voice: str) -> dict[str, Any]:
    import yaml

    config_path = settings.services_config_path
    if not config_path.exists():
        config_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(settings.repo_root / "configs" / "services.example.yaml", config_path)
    with config_path.open("r", encoding="utf-8") as handle:
        config = yaml.safe_load(handle) or {}
    agents = config.setdefault("agents", {})
    if not isinstance(agents, dict):
        raise HTTPException(status_code=500, detail="Services config agents section must be an object")
    agent = agents.setdefault(agent_id, {})
    if not isinstance(agent, dict):
        agent = {}
        agents[agent_id] = agent
    agent["voice"] = voice
    with config_path.open("w", encoding="utf-8") as handle:
        yaml.safe_dump(config, handle, sort_keys=False)
    return {"agent_id": agent_id, "voice": voice, "config_path": str(config_path)}


def _transcript_path() -> Path:
    path = settings.storage_dir / "speech" / "transcripts.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _append_transcript(
    kind: str,
    agent_id: str,
    text: str,
    *,
    audio_url: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    entry = {
        "created_at": utc_now(),
        "kind": kind,
        "agent_id": agent_id,
        "text": text,
        "audio_url": audio_url,
        "metadata": metadata or {},
    }
    with _transcript_path().open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, sort_keys=True) + "\n")


def _read_transcripts(limit: int) -> list[dict[str, Any]]:
    path = _transcript_path()
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines()[-limit:]:
        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(item, dict):
            rows.append(item)
    rows.reverse()
    return rows


def _agentic_work_status() -> dict[str, Any]:
    learning_dir = settings.storage_dir / "learning"
    services = load_services_config(settings)
    providers = provider_readiness(services)
    reports = sorted(learning_dir.glob("*.md"), key=lambda path: path.stat().st_mtime, reverse=True)
    latest_report = None
    if reports:
        latest_report = {
            "path": str(reports[0]),
            "name": reports[0].name,
            "updated_at": datetime.fromtimestamp(reports[0].stat().st_mtime, UTC).isoformat(),
        }
    next_topic = _next_learning_topic()
    return {
        "enabled": True,
        "mode": "active-safe-research-and-planning",
        "summary": (
            "All Hermes agents are vision-enabled. They can research, plan, inspect visual evidence, "
            "write multimodal summaries, and propose tickets while hardware actions stay gated."
        ),
        "vision_contract": _agentic_vision_contract(),
        "provider_readiness": providers,
        "next_tick": {
            "action": "create_next_learning_report",
            "topic": next_topic,
            "hardware_safe": True,
        },
        "agents": _agentic_agent_roster(next_topic),
        "work_queue": _agentic_work_queue(next_topic),
        "blockers": _agentic_work_blockers(),
        "latest_report": latest_report,
        "safety_policy": {
            "allow_research": True,
            "allow_markdown_reports": True,
            "allow_diagrams": True,
            "allow_printer_movement": False,
            "allow_upload_or_start": False,
            "allow_s1_testing": False,
            "require_operator_approval_for_installs": True,
            "require_operator_approval_for_real_moonraker_actions": True,
            "redact_shareable_reports": True,
        },
    }


def _agentic_vision_contract() -> dict[str, Any]:
    return {
        "required_for_all_agents": True,
        "primary_provider": "minimax-mcp",
        "additional_reasoning_provider": "deepseek-v4-pro",
        "deepseek_may_replace_vision": False,
        "required_flags": {
            "vision": True,
            "multimodal_input": True,
            "evidence_required": True,
        },
        "required_inputs": [
            "image input",
            "screenshot analysis",
            "mesh preview analysis",
            "slicer preview analysis",
            "printer/camera observation where applicable",
        ],
        "required_outputs": [
            "multimodal evidence summaries",
            "artifact references",
            "operator-readable markdown reports",
        ],
    }


def _agentic_agent_roster(next_topic: dict[str, Any]) -> list[dict[str, Any]]:
    agent_specs = [
        {
            "id": "factory_operator",
            "provider": "minimax",
            "model": "minimax-mcp",
            "voice": "en-GB-MaisieNeural",
            "current_focus": "OS command center, scheduling, provenance, privacy, visual triage, and operator handoff.",
        },
        {
            "id": "modeling_agent",
            "provider": "deepseek",
            "model": "deepseek-v4-pro",
            "vision_provider": "minimax-mcp",
            "voice": "en-US-AriaNeural",
            "current_focus": "CAD/OpenSCAD/CadQuery reasoning, variants, design specs, and vision-backed modeling critiques.",
        },
        {
            "id": "mesh_repair_agent",
            "provider": "minimax",
            "model": "minimax-mcp",
            "voice": "en-US-AriaNeural",
            "current_focus": "CAD/CAM, DFM, tolerance twin, printability truth gate, and mesh preview evidence.",
        },
        {
            "id": "mesh_qa_agent",
            "provider": "minimax",
            "model": "minimax-mcp",
            "voice": "en-AU-CarlyNeural",
            "current_focus": "Mesh screenshots, manifold evidence, normals, holes, wall-thickness risks, and repair proof.",
        },
        {
            "id": "slicer_qa_agent",
            "provider": "minimax",
            "model": "minimax-mcp",
            "voice": "en-US-JennyNeural",
            "current_focus": "Slicer preview screenshots, supports, overhangs, estimates, and G-code evidence.",
        },
        {
            "id": "print_monitor_agent",
            "provider": "minimax",
            "model": "minimax-mcp",
            "voice": "en-GB-RyanNeural",
            "camera_required": True,
            "current_focus": "Printer and USB camera observation, first-layer checks, anomaly notes, and spoken updates.",
        },
        {
            "id": "print_safety_agent",
            "provider": "minimax",
            "model": "minimax-mcp",
            "voice": "en-AU-CarlyNeural",
            "camera_required": True,
            "current_focus": "Observer AI, first-layer evidence, anomaly policies, and voice safety alerts.",
        },
        {
            "id": "research_agent",
            "provider": "deepseek",
            "model": "deepseek-v4-pro",
            "vision_provider": "minimax-mcp",
            "voice": "en-US-GuyNeural",
            "current_focus": "Research summaries, roadmap generation, diagrams, printer mods, and visual evidence reviews.",
        },
        {
            "id": "privacy_agent",
            "provider": "deepseek",
            "model": "deepseek-v4-pro",
            "vision_provider": "minimax-mcp",
            "voice": "en-US-AvaNeural",
            "current_focus": "Anonymous mode, redaction, plugin permissions, secrets, camera privacy, and provider routing labels.",
        },
    ]
    topic_agent = str(next_topic.get("agent") or "")
    agent_aliases = {
        "mesh_repair_agent": {"mesh_repair_agent", "mesh_qa_agent"},
        "factory_operator": {"factory_operator", "privacy_agent"},
        "research_agent": {"research_agent", "modeling_agent"},
    }
    active_agents = agent_aliases.get(topic_agent, {topic_agent})
    agents = []
    for spec in agent_specs:
        agent_id = spec["id"]
        agents.append(
            {
                "id": agent_id,
                "label": agent_id.replace("_", " ").title(),
                "status": "active" if agent_id in active_agents else "watching",
                "provider": spec["provider"],
                "model": spec["model"],
                "vision_provider": spec.get("vision_provider", "minimax-mcp"),
                "voice": spec["voice"],
                "vision": True,
                "multimodal_input": True,
                "evidence_required": True,
                "camera_required": bool(spec.get("camera_required", False)),
                "current_focus": spec["current_focus"],
                "vision_capabilities": [
                    "image input",
                    "screenshot analysis",
                    "mesh preview analysis",
                    "slicer preview analysis",
                    "printer/camera observation" if spec.get("camera_required") else "visual artifact review",
                    "multimodal evidence summaries",
                ],
                "safe_actions": [
                    "research",
                    "analyze screenshots",
                    "analyze mesh previews",
                    "analyze slicer previews",
                    "write markdown",
                    "propose tickets",
                    "update diagrams",
                    "request approval",
                ],
                "blocked_actions": [
                    "move printers",
                    "test S1",
                    "upload G-code",
                    "start prints",
                    "install dependencies without approval",
                ],
            }
        )
    return agents


def _agentic_work_queue(next_topic: dict[str, Any]) -> list[dict[str, Any]]:
    topic_items = [
        {
            "id": topic["id"],
            "title": topic["title"],
            "owner": topic["agent"],
            "priority": topic["priority"],
            "status": "next" if topic["id"] == next_topic.get("id") else "queued",
            "type": "research",
            "next_action": topic["next_actions"][0] if topic.get("next_actions") else "collect sources",
        }
        for topic in IDLE_RESEARCH_TOPICS
    ]
    implementation_items = [
        {
            "id": "designspec-v0",
            "title": "DesignSpec v0",
            "owner": "factory_operator",
            "priority": "epic",
            "status": "implementation-next",
            "type": "build",
            "next_action": "Add schema fields for dimensions, constraints, tolerances, material, target printer, and unresolved questions.",
        },
        {
            "id": "agentic-modeling-loop-v0",
            "title": "Agentic Modeling Loop v0",
            "owner": "modeling_agent",
            "priority": "epic",
            "status": "implementation-next",
            "type": "build",
            "next_action": "Create clarify, generate, critique, repair, slicer-dry-run, and revision-plan states.",
        },
        {
            "id": "vision-agent-contract-v0",
            "title": "Vision Agent Contract v0",
            "owner": "factory_operator",
            "priority": "epic",
            "status": "active",
            "type": "build",
            "next_action": "Enforce image, screenshot, mesh preview, slicer preview, camera observation, and multimodal evidence requirements for every Hermes agent.",
        },
        {
            "id": "anonymous-mode-v0",
            "title": "Anonymous Mode v0",
            "owner": "privacy_agent",
            "priority": "high",
            "status": "queued",
            "type": "build",
            "next_action": "Add local/cloud provider labels, report redaction, and connector privacy controls.",
        },
        {
            "id": "command-center-v0",
            "title": "OS Command Center v0",
            "owner": "factory_operator",
            "priority": "high",
            "status": "queued",
            "type": "build",
            "next_action": "Add command palette, background-agent dock, triage inbox, and daily operations briefing.",
        },
    ]
    return implementation_items + topic_items


def _agentic_work_blockers() -> list[dict[str, Any]]:
    services = load_services_config(settings)
    provider_status = provider_readiness(services)["providers"]
    minimax_status = provider_status["minimax_mcp"]
    deepseek_status = provider_status["deepseek_v4"]
    return [
        {
            "id": "minimax_mcp_vision_provider",
            "title": "MiniMax-MCP vision provider",
            "detail": "Every Hermes agent requires MiniMax-MCP or an equivalent configured MiniMax vision endpoint for images, screenshots, mesh previews, slicer previews, and camera evidence.",
            "severity": "high",
            "blocked": not bool(minimax_status.get("ready")),
        },
        {
            "id": "deepseek_v4_optional_reasoning",
            "title": "DeepSeek V4 optional reasoning provider",
            "detail": "DeepSeek V4 may support planning, code generation, CAD reasoning, research summaries, roadmaps, and reports; vision still routes through MiniMax-MCP unless the endpoint is explicitly multimodal.",
            "severity": "low",
            "blocked": not bool(deepseek_status.get("ready")),
        },
        {
            "id": "comfyui_workflows_placeholder",
            "title": "ComfyUI workflow exports required",
            "detail": "TRELLIS.2, Hunyuan3D-2.1, and TripoSR workflow JSON files still need exported ComfyUI API workflows.",
            "severity": "medium",
        },
        {
            "id": "blender_missing",
            "title": "Blender path missing",
            "detail": "Blender is required for the repair/export worker and full printability validation.",
            "severity": "medium",
            "blocked": _tool_path("blender", ["blender"]) is None,
        },
        {
            "id": "azure_speech_credentials",
            "title": "Azure Speech credentials",
            "detail": "Voice preview and spoken alerts need AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in local env.",
            "severity": "low",
            "blocked": not azure_is_configured(speech_config_from_services(load_services_config(settings))),
        },
        {
            "id": "s1_maintenance_lock",
            "title": "FLSUN S1 maintenance lock",
            "detail": "S1 remains excluded from tests and motion until the user clears maintenance.",
            "severity": "safety",
            "blocked": True,
        },
    ]


def _learning_mode_status() -> dict[str, Any]:
    learning_dir = settings.storage_dir / "learning"
    learning_dir.mkdir(parents=True, exist_ok=True)
    reports = sorted(learning_dir.glob("*.md"), key=lambda path: path.stat().st_mtime, reverse=True)
    latest_reports = [
        {
            "path": str(path),
            "name": path.name,
            "updated_at": datetime.fromtimestamp(path.stat().st_mtime, UTC).isoformat(),
        }
        for path in reports[:10]
    ]
    return {
        "enabled": True,
        "mode": "idle-research-reporting",
        "cadence": "on-idle or operator-triggered",
        "reports_dir": str(learning_dir),
        "latest_reports": latest_reports,
        "next_topic": _next_learning_topic(),
        "topics": IDLE_RESEARCH_TOPICS,
        "agents": sorted({topic["agent"] for topic in IDLE_RESEARCH_TOPICS}),
        "safe_scope": [
            "research public workflows and papers",
            "write markdown reports and diagrams",
            "redact secrets, printer keys, private camera URLs, and local-only notes from shareable reports",
            "never move or test locked printers",
            "propose changes for approval before hardware actions",
            "never upload or start a print from learning mode",
        ],
    }


def _write_learning_report(topic: str) -> Path:
    learning_dir = settings.storage_dir / "learning"
    learning_dir.mkdir(parents=True, exist_ok=True)
    topic_record = _learning_topic(topic)
    stamp = utc_now().replace(":", "").replace("-", "").replace(".", "")
    safe_topic_base = f"{topic_record['id']}-{topic_record['title']}"
    safe_topic = "".join(ch if ch.isalnum() else "-" for ch in safe_topic_base.lower()).strip("-")[:80]
    path = learning_dir / f"{stamp}-{safe_topic or 'learning-report'}.md"
    source_lines = "\n".join(f"- {source}" for source in topic_record["sources"])
    action_lines = "\n".join(f"- {action}" for action in topic_record["next_actions"])
    output_lines = "\n".join(f"- {output}" for output in topic_record["outputs"])
    path.write_text(
        "\n".join(
            [
                "# Hermes3D-OS Learning Mode Report",
                "",
                f"- Created: {utc_now()}",
                f"- Topic: {topic_record['title']}",
                f"- Topic ID: `{topic_record['id']}`",
                f"- Agent: `{topic_record['agent']}`",
                f"- Priority: `{topic_record['priority']}`",
                "- Mode: research-only idle learning",
                "- Hardware policy: no printer movement, no S1 testing, no upload/start actions",
                "",
                "## Why This Matters",
                "",
                topic_record["why"],
                "",
                "## Research Targets",
                "",
                output_lines,
                "",
                "## Watch Sources",
                "",
                source_lines,
                "",
                "## Next Agent Actions",
                "",
                action_lines,
                "",
                "## Safe Automation Boundary",
                "",
                "- Allowed: public research, markdown reports, diagrams, proposed tickets, local readiness checks",
                "- Blocked: moving printers, testing S1, uploading G-code, starting prints, changing firmware",
                "- Required approval: dependency installs, workflow imports, printer profile changes, real Moonraker actions",
                "",
                "## Diagram",
                "",
                "```mermaid",
                "flowchart LR",
                '  A["Idle trigger"] --> B["Research agent"]',
                '  B --> C["Source notes"]',
                '  C --> D["Feature proposal"]',
                '  D --> E["Roadmap ticket"]',
                '  E --> F["Operator approval"]',
                '  F --> G["Implementation"]',
                "```",
                "",
            ]
        ),
        encoding="utf-8",
    )
    return path


def _next_learning_topic() -> dict[str, Any]:
    learning_dir = settings.storage_dir / "learning"
    reports = " ".join(path.name for path in learning_dir.glob("*.md")) if learning_dir.exists() else ""
    for topic in IDLE_RESEARCH_TOPICS:
        if topic["id"] not in reports:
            return topic
    return IDLE_RESEARCH_TOPICS[0]


def _learning_topic(topic: str) -> dict[str, Any]:
    normalized = topic.strip().lower()
    for item in IDLE_RESEARCH_TOPICS:
        if normalized in {item["id"].lower(), item["title"].lower()}:
            return item
    return {
        "id": "custom-research",
        "title": topic,
        "agent": "research_agent",
        "priority": "operator-requested",
        "why": "The operator requested a custom learning-mode research topic.",
        "outputs": [
            "source collection",
            "feature recommendations",
            "implementation tickets",
        ],
        "sources": [
            "Operator-provided context",
            "Public project documentation and official upstream docs",
        ],
        "next_actions": [
            "collect trustworthy sources",
            "write an evidence-backed summary",
            "turn findings into safe implementation tickets",
        ],
    }


IDLE_RESEARCH_TOPICS: list[dict[str, Any]] = [
    {
        "id": "ai-3d-generation-watch",
        "title": "AI 3D Generation Watch",
        "agent": "research_agent",
        "priority": "high",
        "why": "The AI 3D space is moving quickly; Hermes should track engines that improve image-to-print success without losing local control.",
        "outputs": [
            "TRELLIS.2, Hunyuan3D, TripoSR, Stable Fast 3D, InstantMesh, and ComfyUI node updates",
            "quality, VRAM, license, install, and output-format notes",
            "workflow import tasks for Hermes3D generation runners",
        ],
        "sources": [
            "https://github.com/microsoft/TRELLIS.2",
            "https://github.com/tencent-hunyuan/Hunyuan3D-2.1",
            "https://arxiv.org/abs/2403.02151",
            "https://docs.comfy.org/development/comfyui-server/comms_routes",
        ],
        "next_actions": [
            "watch for runnable ComfyUI workflows that expose image input and mesh output",
            "rank engines by printability, not visual appeal only",
            "propose one import ticket per validated workflow",
        ],
    },
    {
        "id": "agentic-modeling-automation-watch",
        "title": "Agentic Modeling Automation Watch",
        "agent": "research_agent",
        "priority": "epic",
        "why": "Hermes should evolve from prompt-to-model into an autonomous design loop that asks clarifying questions, creates variants, critiques geometry, repairs failures, and learns reusable modeling patterns.",
        "outputs": [
            "autonomous design-loop features for prompt, critique, repair, and revision",
            "multi-agent modeling roles: spec clarifier, CAD author, mesh critic, slicer compiler, print safety reviewer",
            "human approval UX for generated variants and model edits",
        ],
        "sources": [
            "https://docs.zoo.dev/docs/zoo-design-studio/zookeeper",
            "https://docs.zoo.dev/research/introducing-kcl",
            "https://arxiv.org/abs/2602.03045",
            "https://arxiv.org/abs/2603.26512",
            "https://arxiv.org/abs/2410.05340",
            "https://arxiv.org/abs/2604.07960",
            "https://github.com/Text-to-CadQuery",
        ],
        "next_actions": [
            "define a DesignSpec clarifier agent that asks for dimensions, tolerances, use case, material, and printer",
            "propose a variant generator and critic loop for CAD and mesh outputs",
            "turn failed slicer/repair results into revision prompts",
            "store revision plans with issue, cause, proposed edit, and expected metric improvement",
        ],
    },
    {
        "id": "autonomous-cad-cam-watch",
        "title": "Autonomous CAD/CAM Watch",
        "agent": "mesh_repair_agent",
        "priority": "epic",
        "why": "Functional 3D printing needs editable CAD, manufacturing constraints, toolpath evidence, test coupons, and outcome learning rather than opaque decorative meshes.",
        "outputs": [
            "CadQuery/build123d/OpenSCAD feature plan for functional parts",
            "DFM checks for tolerances, fits, wall thickness, inserts, bridges, and assembly",
            "calibration coupon and print-outcome learning loops",
            "visual and numeric variant comparison: dimensions, print time, material use, risk, and changed parameters",
        ],
        "sources": [
            "https://cadquery.readthedocs.io/",
            "https://build123d.readthedocs.io/",
            "https://arxiv.org/abs/2505.19713",
            "https://www.r2clickthrough.com/text-to-cad-open-source-harness/",
            "https://3mf.io/spec/",
            "https://www.nist.gov/publications/design-rules-modularity-additive-manufacturing",
        ],
        "next_actions": [
            "add CAD-first templates for brackets, mounts, adapters, enclosures, jigs, and fixtures",
            "define CAM evidence fields for slicer warnings, support burden, ETA, and material use",
            "design a calibration coupon generator tied to printer/material/profile confidence",
            "add DFM/DFA rule modules for walls, bridges, holes, assemblies, fasteners, and post-processing burden",
        ],
    },
    {
        "id": "tolerance-twin-calibration-watch",
        "title": "Tolerance Twin And Calibration Watch",
        "agent": "mesh_repair_agent",
        "priority": "epic",
        "why": "Hermes needs measured local truth for clearances, fit classes, calibration expiry, and printer/material/profile confidence instead of generic tolerances.",
        "outputs": [
            "empirical clearance tables per printer, material, nozzle, and profile",
            "snap-fit, press-fit, slip-fit, hole, bridge, flow, and dimensional coupon plans",
            "calibration expiry triggers after maintenance, failures, material changes, or drift",
        ],
        "sources": [
            "https://www.nist.gov/topics/additive-manufacturing/resources/additive-manufacturing-test-artifact",
            "https://www.nist.gov/ambench",
            "https://www.klipper3d.org/Resonance_Compensation.html",
            "https://www.orcaslicer.com/wiki/calibration/volumetric-speed-calib/",
        ],
        "next_actions": [
            "define printer/material/profile confidence scores",
            "add coupon generator tickets for dimensional, bridge, flow, hole, and snap-fit checks",
            "connect maintenance and calibration drift to scheduler eligibility",
        ],
    },
    {
        "id": "provenance-ledger-watch",
        "title": "Provenance Ledger And Telemetry Watch",
        "agent": "factory_operator",
        "priority": "high",
        "why": "Every autonomous action should be replayable and attributable through typed artifacts, activities, agents, approvals, telemetry, and outcome labels.",
        "outputs": [
            "PROV-style entity/activity/agent mapping for jobs",
            "OpenTelemetry trace IDs for autonomous workflow runs",
            "print outcome learner fields for snapshots, telemetry, slicer report, operator labels, and measured dimensions",
        ],
        "sources": [
            "https://www.w3.org/TR/prov-overview/",
            "https://opentelemetry.io/docs/concepts/semantic-conventions/",
            "https://moonraker.readthedocs.io/en/stable/web_api/",
            "https://github.com/Donkie/Spoolman",
            "https://openprinttag.org/",
        ],
        "next_actions": [
            "add trace IDs to jobs, agent events, artifacts, approvals, and printer actions",
            "define outcome labels and failure taxonomy",
            "ensure agents recommend profile changes but never silently mutate profiles",
        ],
    },
    {
        "id": "private-anonymous-os-watch",
        "title": "Private Anonymous Local OS Watch",
        "agent": "factory_operator",
        "priority": "epic",
        "why": "Hermes should be trustworthy for a local printer factory: secrets stay local, reports can be redacted, agents have permissions, and cloud/provider use is explicit.",
        "outputs": [
            "anonymous/local-only operation modes",
            "secret redaction, source provenance, and share-safe report controls",
            "plugin permission and signed-tool trust model",
        ],
        "sources": [
            "https://opensource.microsoft.com/blog/2026/04/02/introducing-the-agent-governance-toolkit-open-source-runtime-security-for-ai-agents/",
            "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
            "https://slsa.dev/",
            "https://in-toto.io/",
        ],
        "next_actions": [
            "add an Anonymous Mode design for reports, source notes, screenshots, and camera URLs",
            "define plugin permissions for read, upload, start, pause, power, filesystem, network, and research",
            "propose a provider router that labels local, cloud, commercial, and redacted modes per job",
        ],
    },
    {
        "id": "agentic-os-command-center-watch",
        "title": "Agentic OS Command Center Watch",
        "agent": "factory_operator",
        "priority": "high",
        "why": "Hermes OS Print Factory should feel like a real operating system: command center, background agents, notifications, project memory, evidence timeline, automations, and voice-first flow.",
        "outputs": [
            "OS-level pages, widgets, notifications, and command palette ideas",
            "project memory and evidence timeline patterns",
            "agent status, task queue, and background automation controls",
            "triage inbox, daily operations briefing, automation builder, floor voice mode, kiosk view, and mobile approval mode",
        ],
        "sources": [
            "https://github.blog/changelog/2021-10-27-github-command-palette/",
            "https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent",
            "https://opensource.microsoft.com/blog/2026/04/02/introducing-the-agent-governance-toolkit-open-source-runtime-security-for-ai-agents/",
            "https://docs.comfy.org/development/comfyui-server/comms_routes",
            "https://moonraker.readthedocs.io/en/latest/external_api/jsonrpc_notifications/",
            "https://moonraker.readthedocs.io/en/latest/external_api/job_queue/",
            "https://connect.prusa3d.com/",
        ],
        "next_actions": [
            "design a command palette for jobs, printers, agents, reports, and settings",
            "add background-agent status cards and notification policies",
            "define project memory objects for designs, prompts, printer outcomes, and reusable corrections",
            "draft floor-mode voice confirmations and kiosk/mobile layouts for shop operation",
        ],
    },
    {
        "id": "generation-ux-provider-watch",
        "title": "Generation UX Provider Watch",
        "agent": "research_agent",
        "priority": "high",
        "why": "Top 3D generation tools win through simple intake, fast previews, revision history, multi-view guidance, provider APIs, and export polish; Hermes should copy the useful patterns while owning printability.",
        "outputs": [
            "provider router for Meshy, Tripo, Rodin, Scenario, Kaedim-style QA, TRELLIS, Hunyuan, and ComfyUI",
            "multi-view intake, prompt library, variant board, and revision history ideas",
            "PBR-to-print conversion and 3MF material packaging tasks",
        ],
        "sources": [
            "https://help.scenario.com/en/articles/comparing-generative-3d-models/",
            "https://www.tripo3d.ai/api",
            "https://www.meshy.ai/features/image-to-3d",
            "https://hyper3d.ai/",
        ],
        "next_actions": [
            "draft a provider scorecard: cost, license, privacy, latency, mesh quality, PBR, printability, and export formats",
            "add multi-view upload UX and generated-view consistency scoring",
            "separate visual asset approval from printability approval",
        ],
    },
    {
        "id": "printability-truth-gate-watch",
        "title": "Printability Truth Gate Watch",
        "agent": "mesh_repair_agent",
        "priority": "high",
        "why": "Hermes becomes useful when it proves generated geometry can survive repair, slicing, and real printer constraints.",
        "outputs": [
            "mesh repair libraries and CLI probes",
            "wall-thickness, manifold, normals, overhang, and bed-fit checks",
            "slicer dry-run evidence bundle improvements",
        ],
        "sources": [
            "https://trimesh.org/",
            "https://github.com/elalish/manifold",
            "https://github.com/prusa3d/PrusaSlicer/wiki/Command-Line-Interface",
            "https://github.com/3MFConsortium/spec_core",
        ],
        "next_actions": [
            "propose a mesh validator worker contract",
            "add slicer warning extraction fields",
            "define pass/fail thresholds per printer family",
        ],
    },
    {
        "id": "observer-ai-watch",
        "title": "Observer AI And Camera Evidence Watch",
        "agent": "print_safety_agent",
        "priority": "high",
        "why": "Camera observation should create actionable evidence and safety voice alerts instead of passive video only.",
        "outputs": [
            "Moonraker webcam discovery and snapshot events",
            "local failure detection candidates",
            "first-layer and anomaly evidence report patterns",
        ],
        "sources": [
            "https://moonraker.readthedocs.io/en/latest/external_api/webcams/",
            "https://www.obico.io/failure-detection.html",
            "https://github.com/open-edge-platform/anomalib",
            "https://arxiv.org/abs/2111.02703",
        ],
        "next_actions": [
            "map each printer camera URL to snapshot and stream modes",
            "propose observer policies from alert-only to approval-gated pause",
            "add evidence snapshots for print gates",
        ],
    },
    {
        "id": "fleet-os-watch",
        "title": "Fleet OS And Scheduling Watch",
        "agent": "factory_operator",
        "priority": "medium",
        "why": "A print factory OS needs printer eligibility, materials, maintenance, queue pressure, and risk scoring in one place.",
        "outputs": [
            "Moonraker telemetry and printer-object fields",
            "FDM Monster and fleet dashboard patterns",
            "material/spool/profile compatibility fields",
        ],
        "sources": [
            "https://moonraker.readthedocs.io/en/stable/web_api/",
            "https://docs.fdm-monster.net/",
            "https://github.com/Donkie/Spoolman",
            "https://reference.opcfoundation.org/AdditiveManufacturing/v100/docs/4",
        ],
        "next_actions": [
            "propose printer digital twin fields",
            "add queue scheduler scoring inputs",
            "keep S1 excluded while maintenance lock is active",
        ],
    },
    {
        "id": "printer-mods-watch",
        "title": "Printer Mods And Calibration Watch",
        "agent": "research_agent",
        "priority": "medium",
        "why": "Hermes should learn safe upgrades and calibration patterns for the active FLSUN T1 and V400 printers without touching locked hardware.",
        "outputs": [
            "safe Klipper macro ideas",
            "printer profile and calibration checklist updates",
            "camera, lighting, and enclosure observations",
        ],
        "sources": [
            "https://www.klipper3d.org/",
            "https://moonraker.readthedocs.io/",
            "https://github.com/prusa3d/PrusaSlicer",
            "https://github.com/SoftFever/OrcaSlicer",
        ],
        "next_actions": [
            "collect T1 and V400 profile evidence",
            "draft calibration checklist tickets",
            "never test or move FLSUN S1 until lock is cleared",
        ],
    },
]
