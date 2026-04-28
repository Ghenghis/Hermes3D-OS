from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import Settings, load_printer_config
from .db import Database, row_to_dict, utc_now
from .schemas import AdvanceRequest, ApiMessage, ApprovalCreate, JobCreate
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
            "dry_run_printers": settings.dry_run_printers,
        },
        "printers": _list_printers(),
        "jobs": _list_jobs(),
        "artifacts": _list_artifacts(),
        "approvals": _list_approvals(),
        "events": _list_events(),
    }


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
