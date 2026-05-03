"""
Source-app install dispatcher (foundation/install-endpoint).

One endpoint, many install methods. Each app's source_manifest.json entry
gets an optional `install` block:

    "install": {
      "method": "pip" | "clone-shallow" | "clone-full" | "clone-full-venv" | "npm-build" | "binary-download" | "noop",
      "package": "<pypi-name>",          # for pip
      "import_name": "<python module>",  # optional pip probe
      "repo": "<git url>",               # for clone-*
      "build_cmd": ["npm", "ci"],        # for npm-build
      "binary_url": "...",               # for binary-download
      "binary_target": "<vendor path>"   # for binary-download
    }

This module handles dispatch and in-memory state tracking. Per-app
branches (Kilocode/Codex/Claude lanes) just add the manifest entry and
write the Playwright spec — the dispatcher already routes their method.
"""
from __future__ import annotations

import importlib
import json
import os
import subprocess
import sys
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class InstallState:
    status: str = "not_installed"  # not_installed | installing | installed | failed
    log: list[str] = field(default_factory=list)
    error: str | None = None
    started_at: float | None = None
    ended_at: float | None = None


_states: dict[str, InstallState] = {}
_lock = threading.Lock()


def _manifest_path(repo_root: Path) -> Path:
    return repo_root / "source-lab" / "source_manifest.json"


def load_manifest(repo_root: Path) -> dict[str, Any]:
    path = _manifest_path(repo_root)
    if not path.exists():
        return {"groups": {}}
    return json.loads(path.read_text(encoding="utf-8"))


def find_app(repo_root: Path, app_id: str) -> dict[str, Any] | None:
    manifest = load_manifest(repo_root)
    for entries in manifest.get("groups", {}).values():
        for entry in entries:
            if entry.get("id") == app_id:
                return entry
    return None


def get_state(app_id: str) -> InstallState:
    with _lock:
        return _states.setdefault(app_id, InstallState())


def _set_status(app_id: str, status: str, *, error: str | None = None) -> None:
    import time

    with _lock:
        state = _states.setdefault(app_id, InstallState())
        state.status = status
        if error is not None:
            state.error = error
        if status == "installing":
            state.started_at = time.time()
        elif status in ("installed", "failed"):
            state.ended_at = time.time()


def _append_log(app_id: str, line: str) -> None:
    with _lock:
        state = _states.setdefault(app_id, InstallState())
        state.log.append(line)


def resolve_apps_root(repo_root: Path | None = None) -> Path:
    """Where downloaded apps live.

    Default: G:\\Github\\Hermes3D\\apps. Override with HERMES3D_APPS_ROOT.
    """
    explicit = os.environ.get("HERMES3D_APPS_ROOT")
    if explicit:
        return Path(explicit)
    sibling = Path(r"G:\Github\Hermes3D\apps")
    if sibling.exists():
        return sibling
    return (repo_root or Path(os.environ.get("HERMES3D_REPO_ROOT", "."))) / "source-lab" / "sources"


def app_install_path(repo_root: Path | None, entry: dict[str, Any]) -> Path | None:
    target_rel = entry.get("target")
    if not target_rel:
        return None
    return resolve_apps_root(repo_root) / target_rel


def _venv_python(venv: Path) -> Path:
    if os.name == "nt":
        return venv / "Scripts" / "python.exe"
    return venv / "bin" / "python"


def probe_installed(app_id: str, entry: dict[str, Any], repo_root: Path | None = None) -> bool:
    """Best-effort detection — used by status endpoint."""
    install = entry.get("install") or {}
    method = install.get("method")
    if method == "pip":
        import_name = install.get("import_name") or install.get("package")
        if not import_name:
            return False
        try:
            importlib.import_module(import_name.replace("-", "_"))
            return True
        except Exception:
            return False
    if method in ("clone-shallow", "clone-full"):
        target = app_install_path(repo_root, entry)
        return bool(target and (target / ".git").exists())
    if method == "clone-full-venv":
        target = app_install_path(repo_root, entry)
        if not target or not (target / ".git").exists():
            return False
        venv = target / install.get("venv", ".venv")
        if not _venv_python(venv).exists():
            return False
        marker = target / install.get("setup_marker", ".hermes3d-venv-ready")
        return marker.exists()
    return False


# ─── Dispatchers ───────────────────────────────────────────────────────────

def _install_pip(app_id: str, entry: dict[str, Any]) -> tuple[bool, str]:
    install = entry["install"]
    package = install.get("package")
    if not package:
        return False, "manifest install.package missing"
    cmd = [sys.executable, "-m", "pip", "install", "--disable-pip-version-check", package]
    _append_log(app_id, f"$ {' '.join(cmd)}")
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    except Exception as exc:  # pragma: no cover - subprocess failure
        return False, f"pip subprocess error: {exc}"
    _append_log(app_id, proc.stdout[-2000:])
    if proc.returncode != 0:
        _append_log(app_id, proc.stderr[-2000:])
        return False, f"pip exit {proc.returncode}"
    return True, "pip install ok"


def _install_clone(app_id: str, entry: dict[str, Any], depth: int | None) -> tuple[bool, str]:
    install = entry["install"]
    repo = install.get("repo") or entry.get("repo")
    if not repo:
        return False, "manifest install.repo missing"
    target_rel = entry.get("target")
    if not target_rel:
        return False, "manifest target missing"
    apps_root = resolve_apps_root()
    target = apps_root / target_rel
    target.parent.mkdir(parents=True, exist_ok=True)
    if (target / ".git").exists():
        _append_log(app_id, f"already cloned: {target}")
        return True, "already cloned"
    cmd = ["git", "clone"]
    if depth:
        cmd.extend(["--depth", str(depth)])
    cmd.extend([repo, str(target)])
    _append_log(app_id, f"$ {' '.join(cmd)}")
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    except Exception as exc:  # pragma: no cover
        return False, f"git subprocess error: {exc}"
    _append_log(app_id, (proc.stdout or "")[-2000:])
    if proc.returncode != 0:
        _append_log(app_id, (proc.stderr or "")[-2000:])
        return False, f"git exit {proc.returncode}"
    return True, "clone ok"


def _run_setup_command(app_id: str, cmd: list[str], cwd: Path, timeout: int = 900) -> tuple[bool, str]:
    _append_log(app_id, f"$ {' '.join(cmd)}")
    try:
        proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    except Exception as exc:  # pragma: no cover
        return False, f"setup subprocess error: {exc}"
    _append_log(app_id, (proc.stdout or "")[-2000:])
    if proc.returncode != 0:
        _append_log(app_id, (proc.stderr or "")[-2000:])
        return False, f"setup exit {proc.returncode}"
    return True, "ok"


def _install_clone_full_venv(app_id: str, entry: dict[str, Any]) -> tuple[bool, str]:
    ok, message = _install_clone(app_id, entry, depth=None)
    if not ok:
        return ok, message

    install = entry["install"]
    target = app_install_path(None, entry)
    if target is None:
        return False, "manifest target missing"

    venv = target / install.get("venv", ".venv")
    python_exe = _venv_python(venv)
    if not python_exe.exists():
        ok, message = _run_setup_command(app_id, [sys.executable, "-m", "venv", str(venv)], target)
        if not ok:
            return ok, message

    ok, message = _run_setup_command(
        app_id,
        [str(python_exe), "-m", "pip", "install", "--disable-pip-version-check", "--upgrade", "setuptools"],
        target,
    )
    if not ok:
        return ok, message

    requirements = install.get("requirements")
    if requirements:
        req_path = target / requirements
        if not req_path.exists():
            return False, f"requirements file missing: {requirements}"
        ok, message = _run_setup_command(
            app_id,
            [str(python_exe), "-m", "pip", "install", "--disable-pip-version-check", "-r", str(req_path)],
            target,
            timeout=1800,
        )
        if not ok:
            return ok, message

    probe_files = install.get("probe_files") or []
    for rel_path in probe_files:
        probe_path = target / rel_path
        if not probe_path.exists():
            return False, f"probe file missing: {rel_path}"
        if probe_path.suffix == ".py":
            ok, message = _run_setup_command(app_id, [str(python_exe), "-m", "py_compile", str(probe_path)], target)
            if not ok:
                return ok, message

    marker = target / install.get("setup_marker", ".hermes3d-venv-ready")
    marker.write_text("ok\n", encoding="utf-8")
    return True, "clone + venv requirements ok"


def _install_noop(app_id: str, entry: dict[str, Any]) -> tuple[bool, str]:
    _append_log(app_id, "noop: install method is intentionally a no-op (used for tests / reference cards)")
    return True, "noop"


_DISPATCH = {
    "pip": lambda aid, e: _install_pip(aid, e),
    "clone-shallow": lambda aid, e: _install_clone(aid, e, depth=1),
    "clone-full": lambda aid, e: _install_clone(aid, e, depth=None),
    "clone-full-venv": lambda aid, e: _install_clone_full_venv(aid, e),
    "noop": lambda aid, e: _install_noop(aid, e),
    # binary-download and npm-build land in their own per-app branches.
}


def supported_methods() -> list[str]:
    return sorted(_DISPATCH.keys())


def start_install(repo_root: Path, app_id: str) -> dict[str, Any]:
    """Kick off install in a background thread; return current state."""
    entry = find_app(repo_root, app_id)
    if entry is None:
        return {"ok": False, "error": f"unknown app id: {app_id}", "status": "not_installed"}
    install = entry.get("install")
    if not install or not isinstance(install, dict):
        return {"ok": False, "error": "manifest entry has no install block", "status": "not_installed"}
    method = install.get("method")
    handler = _DISPATCH.get(method)
    if handler is None:
        return {
            "ok": False,
            "error": f"install method '{method}' not yet supported by dispatcher",
            "supported": supported_methods(),
            "status": "not_installed",
        }

    state = get_state(app_id)
    if state.status == "installing":
        return {"ok": True, "status": "installing", "note": "already running"}

    _set_status(app_id, "installing")

    def _run() -> None:
        import os as _os

        _os.environ["HERMES3D_REPO_ROOT"] = str(repo_root)
        try:
            ok, message = handler(app_id, entry)
        except Exception as exc:  # pragma: no cover
            _set_status(app_id, "failed", error=str(exc))
            return
        if ok:
            _set_status(app_id, "installed")
        else:
            _set_status(app_id, "failed", error=message)

    threading.Thread(target=_run, daemon=True, name=f"install-{app_id}").start()
    return {"ok": True, "status": "installing", "method": method}


def install_state_payload(app_id: str) -> dict[str, Any]:
    state = get_state(app_id)
    return {
        "status": state.status,
        "log_tail": state.log[-12:],
        "error": state.error,
        "started_at": state.started_at,
        "ended_at": state.ended_at,
    }
