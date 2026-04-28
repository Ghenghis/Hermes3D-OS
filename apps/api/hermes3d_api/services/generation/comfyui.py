from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import httpx


class OperatorConfigRequired(RuntimeError):
    """Raised when Hermes finds a placeholder or incomplete operator workflow."""


@dataclass(frozen=True)
class WorkflowStatus:
    engine: str
    workflow_path: str
    exists: bool
    ready: bool
    operator_required: bool
    template_status: str
    reason: str

    def model_dump(self) -> dict[str, Any]:
        return {
            "engine": self.engine,
            "workflow_path": self.workflow_path,
            "exists": self.exists,
            "ready": self.ready,
            "operator_required": self.operator_required,
            "template_status": self.template_status,
            "reason": self.reason,
        }


@dataclass(frozen=True)
class ComfyRunResult:
    prompt_id: str
    uploaded_image: dict[str, Any]
    artifacts: dict[str, Path]
    history_path: Path


def generation_stack_config(services: dict[str, Any]) -> dict[str, Any]:
    workers = services.get("workers", {}) if isinstance(services, dict) else {}
    config = workers.get("generation_stack", {}) if isinstance(workers, dict) else {}
    return config if isinstance(config, dict) else {}


def workflow_statuses(repo_root: Path, services: dict[str, Any]) -> list[dict[str, Any]]:
    config = generation_stack_config(services)
    engines = config.get("engines", {}) if isinstance(config, dict) else {}
    statuses: list[dict[str, Any]] = []
    if not isinstance(engines, dict):
        return statuses

    for engine, engine_config in engines.items():
        if not isinstance(engine_config, dict):
            continue
        workflow_path = _resolve_path(repo_root, str(engine_config.get("workflow", "")))
        statuses.append(inspect_workflow(engine, workflow_path).model_dump())
    return statuses


def inspect_workflow(engine: str, workflow_path: Path) -> WorkflowStatus:
    if not workflow_path.exists():
        return WorkflowStatus(
            engine=engine,
            workflow_path=str(workflow_path),
            exists=False,
            ready=False,
            operator_required=True,
            template_status="missing",
            reason="Workflow file is missing.",
        )

    try:
        workflow = json.loads(workflow_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return WorkflowStatus(
            engine=engine,
            workflow_path=str(workflow_path),
            exists=True,
            ready=False,
            operator_required=True,
            template_status="invalid_json",
            reason=f"Workflow JSON could not be parsed: {exc}",
        )

    template_status = str(workflow.get("template_status", "")) if isinstance(workflow, dict) else ""
    if template_status == "operator_config_required":
        return WorkflowStatus(
            engine=engine,
            workflow_path=str(workflow_path),
            exists=True,
            ready=False,
            operator_required=True,
            template_status=template_status,
            reason="Replace the placeholder with an exported ComfyUI API workflow.",
        )

    prompt = extract_prompt(workflow)
    if not _looks_like_comfy_prompt(prompt):
        return WorkflowStatus(
            engine=engine,
            workflow_path=str(workflow_path),
            exists=True,
            ready=False,
            operator_required=True,
            template_status=template_status or "not_comfyui_api",
            reason="Workflow does not look like exported ComfyUI API JSON.",
        )
    if "{{source_image}}" not in json.dumps(prompt):
        return WorkflowStatus(
            engine=engine,
            workflow_path=str(workflow_path),
            exists=True,
            ready=False,
            operator_required=True,
            template_status="image_injection_missing",
            reason="Workflow must contain {{source_image}} in the ComfyUI image input field.",
        )

    return WorkflowStatus(
        engine=engine,
        workflow_path=str(workflow_path),
        exists=True,
        ready=True,
        operator_required=False,
        template_status=template_status or "ready",
        reason="Workflow appears ready for ComfyUI /prompt.",
    )


def load_workflow_prompt(workflow_path: Path, replacements: dict[str, str]) -> dict[str, Any]:
    workflow = json.loads(workflow_path.read_text(encoding="utf-8"))
    prompt = extract_prompt(workflow)
    return _replace_tokens(prompt, replacements)


def extract_prompt(workflow: Any) -> dict[str, Any]:
    if isinstance(workflow, dict) and isinstance(workflow.get("prompt"), dict):
        return workflow["prompt"]
    return workflow if isinstance(workflow, dict) else {}


class ComfyUIClient:
    def __init__(self, base_url: str, timeout_seconds: float = 30.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    def probe(self, timeout_seconds: float = 1.0) -> dict[str, Any]:
        if not self.base_url:
            return {"configured": False, "reachable": False, "reason": "No ComfyUI URL configured."}
        try:
            with httpx.Client(timeout=timeout_seconds) as client:
                response = client.get(f"{self.base_url}/system_stats")
                if response.status_code == 404:
                    response = client.get(f"{self.base_url}/object_info")
                response.raise_for_status()
            return {"configured": True, "reachable": True, "reason": "ComfyUI responded."}
        except httpx.HTTPError as exc:
            return {"configured": True, "reachable": False, "reason": str(exc)}

    def run_workflow(
        self,
        *,
        workflow_path: Path,
        source_image: Path,
        object_intent: str,
        output_dir: Path,
        scale_estimate_mm: str | None = None,
        timeout_seconds: float = 600.0,
    ) -> ComfyRunResult:
        output_dir.mkdir(parents=True, exist_ok=True)
        uploaded = self.upload_image(source_image)
        prompt = load_workflow_prompt(
            workflow_path,
            {
                "source_image": str(uploaded.get("name") or source_image.name),
                "object_intent": object_intent,
                "scale_estimate_mm": scale_estimate_mm or "",
                "seed": str(int(time.time())),
            },
        )
        prompt_id = self.queue_prompt(prompt)
        history = self.wait_for_history(prompt_id, timeout_seconds=timeout_seconds)
        history_path = output_dir / f"comfyui-history-{prompt_id}.json"
        history_path.write_text(json.dumps(history, indent=2, sort_keys=True), encoding="utf-8")
        artifacts = self.download_output_artifacts(history, output_dir)
        return ComfyRunResult(
            prompt_id=prompt_id,
            uploaded_image=uploaded,
            artifacts=artifacts,
            history_path=history_path,
        )

    def upload_image(self, source_image: Path) -> dict[str, Any]:
        with httpx.Client(timeout=self.timeout_seconds) as client:
            with source_image.open("rb") as handle:
                files = {"image": (source_image.name, handle, "application/octet-stream")}
                data = {"type": "input", "overwrite": "true"}
                response = client.post(f"{self.base_url}/upload/image", files=files, data=data)
                response.raise_for_status()
                payload = response.json()
        return payload if isinstance(payload, dict) else {"name": source_image.name}

    def queue_prompt(self, prompt: dict[str, Any]) -> str:
        payload = {"prompt": prompt, "client_id": str(uuid.uuid4())}
        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.post(f"{self.base_url}/prompt", json=payload)
            response.raise_for_status()
            data = response.json()
        prompt_id = data.get("prompt_id") if isinstance(data, dict) else None
        if not prompt_id:
            raise RuntimeError("ComfyUI did not return a prompt_id.")
        return str(prompt_id)

    def wait_for_history(self, prompt_id: str, timeout_seconds: float) -> dict[str, Any]:
        deadline = time.monotonic() + timeout_seconds
        last_payload: dict[str, Any] = {}
        with httpx.Client(timeout=self.timeout_seconds) as client:
            while time.monotonic() < deadline:
                response = client.get(f"{self.base_url}/history/{prompt_id}")
                response.raise_for_status()
                payload = response.json()
                last_payload = payload if isinstance(payload, dict) else {}
                record = last_payload.get(prompt_id)
                if isinstance(record, dict) and record.get("outputs"):
                    return last_payload
                time.sleep(2)
        raise TimeoutError(f"ComfyUI prompt {prompt_id} did not finish before timeout.")

    def download_output_artifacts(self, history: dict[str, Any], output_dir: Path) -> dict[str, Path]:
        artifacts: dict[str, Path] = {}
        for item in _iter_output_files(history):
            filename = str(item.get("filename", "")).strip()
            if not filename:
                continue
            query = urlencode(
                {
                    "filename": filename,
                    "subfolder": item.get("subfolder", ""),
                    "type": item.get("type", "output"),
                }
            )
            safe_filename = Path(filename).name
            target = output_dir / safe_filename
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.get(f"{self.base_url}/view?{query}")
                response.raise_for_status()
                target.write_bytes(response.content)
            artifacts[f"comfyui_{target.stem}"] = target
        return artifacts


def _iter_output_files(history: dict[str, Any]) -> list[dict[str, Any]]:
    files: list[dict[str, Any]] = []
    for prompt_record in history.values():
        if not isinstance(prompt_record, dict):
            continue
        outputs = prompt_record.get("outputs", {})
        if not isinstance(outputs, dict):
            continue
        for node_output in outputs.values():
            if not isinstance(node_output, dict):
                continue
            for key in ("images", "gifs", "files", "meshes", "models"):
                values = node_output.get(key, [])
                if isinstance(values, list):
                    files.extend(value for value in values if isinstance(value, dict))
    return files


def _resolve_path(repo_root: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else repo_root / path


def _looks_like_comfy_prompt(prompt: dict[str, Any]) -> bool:
    return any(
        isinstance(value, dict) and isinstance(value.get("inputs"), dict) and value.get("class_type")
        for value in prompt.values()
    )


def _replace_tokens(value: Any, replacements: dict[str, str]) -> Any:
    if isinstance(value, dict):
        return {key: _replace_tokens(child, replacements) for key, child in value.items()}
    if isinstance(value, list):
        return [_replace_tokens(child, replacements) for child in value]
    if isinstance(value, str):
        result = value
        for key, replacement in replacements.items():
            result = result.replace("{{" + key + "}}", replacement)
        return result
    return value
