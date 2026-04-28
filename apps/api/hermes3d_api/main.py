from __future__ import annotations

import json
import random
import socket
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import Settings, load_printer_config, load_runtime_config, save_runtime_config
from .db import Database, row_to_dict, utc_now
from .schemas import (
    AdvanceRequest,
    ApiMessage,
    ApprovalCreate,
    JobCreate,
    PrinterPortUpdate,
    RuntimeAutoPortRequest,
    RuntimeSettingsUpdate,
)
from .services.artifacts import write_text_artifact
from .services.moonraker import MoonrakerClient
from .services.slicer import SlicerWorker
from .workflow import COMPLETE, MODEL_APPROVAL, PRINT_APPROVAL, SELECT_PRINTER, START_PRINT, next_transition


settings = Settings.load()
settings.data_dir.mkdir(parents=True, exist_ok=True)
settings.storage_dir.mkdir(parents=True, exist_ok=True)

db = Database(settings.database_path)
app = FastAPI(title="Hermes3D OS", version="0.1.0")
slicer = SlicerWorker(settings.storage_dir)
moonraker = MoonrakerClient(dry_run=settings.dry_run_printers)

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
    }


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


@app.post("/api/bootstrap", response_model=ApiMessage)
def bootstrap() -> ApiMessage:
    for printer in load_printer_config(settings):
        db.upsert_printer(printer)
    db.add_event(None, "BOOTSTRAP", "Printer inventory loaded from config.")
    return ApiMessage(message="Printer inventory loaded.")


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
    result["artifacts"] = [row_to_dict(row) for row in artifacts]
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


@app.post("/api/jobs/{job_id}/advance")
async def advance_job(job_id: int, payload: AdvanceRequest | None = None) -> dict[str, Any]:
    job = get_job(job_id)
    state = job["state"]
    transition = next_transition(state)
    if state == COMPLETE:
        return job

    if transition.next_state == MODEL_APPROVAL and not _has_artifact(job_id, "model_evidence"):
        _generate_model_evidence(job_id, job)

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

    if transition.next_state == "START_PRINT":
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


@app.post("/api/jobs/{job_id}/start-print")
async def start_print(job_id: int) -> dict[str, Any]:
    job = get_job(job_id)
    if job["state"] != START_PRINT:
        if job["state"] == "UPLOAD_ONLY":
            _set_job_state(job_id, START_PRINT)
            job = get_job(job_id)
        else:
            raise HTTPException(
                status_code=409,
                detail=f"Job is in {job['state']}; expected UPLOAD_ONLY or START_PRINT",
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
    return [row_to_dict(row) for row in rows]


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
