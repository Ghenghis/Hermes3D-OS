"""
Source-app install dispatcher (foundation/install-endpoint).

One endpoint, many install methods. Each app's source_manifest.json entry
gets an optional `install` block:

    "install": {
      "method": "pip" | "clone-shallow" | "clone-full" | "npm-build" | "binary-download" | "noop",
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
import shutil
import subprocess
import sys
import tempfile
import threading
import urllib.request
import zipfile
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


def probe_installed(app_id: str, entry: dict[str, Any]) -> bool:
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
        # Repo cloned into source-lab/sources/<target>
        return True  # caller folds into source_exists check
    if method == "binary-download":
        return find_installed_binary(entry) is not None
    return False


def install_target_path(entry: dict[str, Any]) -> Path | None:
    install = entry.get("install") or {}
    target_rel = install.get("binary_target") or entry.get("target")
    if not target_rel:
        return None
    return _resolve_apps_root() / target_rel


def find_installed_binary(entry: dict[str, Any]) -> Path | None:
    target = install_target_path(entry)
    if target is None or not target.exists():
        return None
    install = entry.get("install") or {}
    names = install.get("binary_names") or install.get("launch_candidates") or []
    if isinstance(names, str):
        names = [names]
    for name in names:
        candidate = target / str(name)
        if candidate.exists():
            return candidate
    for pattern in ("prusa-slicer.exe", "prusa-slicer-console.exe", "*.exe"):
        found = next(target.rglob(pattern), None)
        if found:
            return found
    return None


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


def _resolve_apps_root() -> Path:
    """Where downloaded apps live. Default: G:\\Github\\Hermes3D\\apps (sibling repo).

    Override with HERMES3D_APPS_ROOT env var. Falls back to local source-lab/sources
    if neither the env var nor the sibling path is available.
    """
    import os as _os

    explicit = _os.environ.get("HERMES3D_APPS_ROOT")
    if explicit:
        return Path(explicit)
    sibling = Path(r"G:\Github\Hermes3D\apps")
    if sibling.exists():
        return sibling
    repo_root = Path(_os.environ.get("HERMES3D_REPO_ROOT", "."))
    return repo_root / "source-lab" / "sources"


def _install_clone(app_id: str, entry: dict[str, Any], depth: int | None) -> tuple[bool, str]:
    install = entry["install"]
    repo = install.get("repo") or entry.get("repo")
    if not repo:
        return False, "manifest install.repo missing"
    target_rel = entry.get("target")
    if not target_rel:
        return False, "manifest target missing"
    apps_root = _resolve_apps_root()
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


def _install_binary_download(app_id: str, entry: dict[str, Any]) -> tuple[bool, str]:
    install = entry["install"]
    url = install.get("binary_url")
    if not url:
        return False, "manifest install.binary_url missing"
    target = install_target_path(entry)
    if target is None:
        return False, "manifest install.binary_target missing"
    existing = find_installed_binary(entry)
    if existing:
        _append_log(app_id, f"already installed: {existing}")
        return True, "already installed"

    target.mkdir(parents=True, exist_ok=True)
    _append_log(app_id, f"download: {url}")
    _append_log(app_id, f"target: {target}")
    try:
        with tempfile.TemporaryDirectory(prefix=f"{app_id}-") as tmp:
            tmp_path = Path(tmp)
            archive = tmp_path / "download.zip"
            with urllib.request.urlopen(url, timeout=120) as response:
                with archive.open("wb") as handle:
                    shutil.copyfileobj(response, handle)
            extract_root = tmp_path / "extract"
            extract_root.mkdir()
            with zipfile.ZipFile(archive) as zip_ref:
                _safe_extract(zip_ref, extract_root)
            payload_root = _single_payload_root(extract_root)
            shutil.copytree(payload_root, target, dirs_exist_ok=True)
    except Exception as exc:  # pragma: no cover - network/filesystem failure
        return False, f"binary download error: {exc}"

    installed = find_installed_binary(entry)
    if not installed:
        return False, f"download extracted but no executable was found in {target}"
    _append_log(app_id, f"installed executable: {installed}")
    return True, "binary download ok"


def _single_payload_root(extract_root: Path) -> Path:
    children = [path for path in extract_root.iterdir() if path.name != "__MACOSX"]
    if len(children) == 1 and children[0].is_dir():
        return children[0]
    return extract_root


def _safe_extract(zip_ref: zipfile.ZipFile, destination: Path) -> None:
    root = destination.resolve()
    for member in zip_ref.infolist():
        resolved = (destination / member.filename).resolve()
        if root != resolved and root not in resolved.parents:
            raise ValueError(f"refusing unsafe archive path: {member.filename}")
    zip_ref.extractall(destination)


def _install_noop(app_id: str, entry: dict[str, Any]) -> tuple[bool, str]:
    _append_log(app_id, "noop: install method is intentionally a no-op (used for tests / reference cards)")
    return True, "noop"


_DISPATCH = {
    "pip": lambda aid, e: _install_pip(aid, e),
    "clone-shallow": lambda aid, e: _install_clone(aid, e, depth=1),
    "clone-full": lambda aid, e: _install_clone(aid, e, depth=None),
    "binary-download": lambda aid, e: _install_binary_download(aid, e),
    "noop": lambda aid, e: _install_noop(aid, e),
    # npm-build lands in its own per-app branch.
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
