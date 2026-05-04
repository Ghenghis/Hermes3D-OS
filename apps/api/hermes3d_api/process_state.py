from __future__ import annotations

import subprocess
import threading
import time
from dataclasses import dataclass
from typing import Any


@dataclass
class ManagedProcess:
    process: subprocess.Popen[Any] | None = None
    command: list[str] | None = None
    url: str | None = None
    started_at: float | None = None
    stopped_at: float | None = None
    last_error: str | None = None


_processes: dict[str, ManagedProcess] = {}
_lock = threading.Lock()


def register_process(app_id: str, process: subprocess.Popen[Any], command: list[str], url: str | None = None) -> None:
    with _lock:
        _processes[app_id] = ManagedProcess(
            process=process,
            command=command,
            url=url,
            started_at=time.time(),
        )


def set_error(app_id: str, error: str) -> None:
    with _lock:
        current = _processes.setdefault(app_id, ManagedProcess())
        current.last_error = error
        current.stopped_at = time.time()


def status(app_id: str) -> str:
    with _lock:
        current = _processes.get(app_id)
        if current is None or current.process is None:
            return "stopped"
        code = current.process.poll()
        if code is None:
            return "running"
        if current.stopped_at is not None:
            return "stopped"
        return "crashed"


def payload(app_id: str) -> dict[str, Any]:
    with _lock:
        current = _processes.get(app_id)
        if current is None or current.process is None:
            return {
                "app_id": app_id,
                "status": "stopped",
                "pid": None,
                "url": None,
                "command": [],
                "returncode": None,
                "started_at": None,
                "stopped_at": None,
                "error": None,
            }
        code = current.process.poll()
        if code is None:
            state = "running"
        elif current.stopped_at is not None:
            state = "stopped"
        else:
            state = "crashed"
        return {
            "app_id": app_id,
            "status": state,
            "pid": current.process.pid,
            "url": current.url,
            "command": current.command or [],
            "returncode": code,
            "started_at": current.started_at,
            "stopped_at": current.stopped_at,
            "error": current.last_error,
        }


def stop_process(app_id: str, timeout: float = 10.0) -> dict[str, Any]:
    with _lock:
        current = _processes.get(app_id)
        process = current.process if current else None
    if process is None or process.poll() is not None:
        with _lock:
            if current:
                current.stopped_at = time.time()
        return payload(app_id)
    process.terminate()
    try:
        process.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=timeout)
    with _lock:
        current = _processes.setdefault(app_id, ManagedProcess())
        current.stopped_at = time.time()
    return payload(app_id)
