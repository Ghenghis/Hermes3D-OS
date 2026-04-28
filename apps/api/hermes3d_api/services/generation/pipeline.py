from __future__ import annotations

import json
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from ..artifacts import job_dir
from .comfyui import ComfyUIClient, generation_stack_config, inspect_workflow


PRINTABILITY_TRUTH_GATE: list[dict[str, str]] = [
    {"id": "watertight_mesh", "label": "Watertight mesh"},
    {"id": "manifold_mesh", "label": "Manifold mesh"},
    {"id": "fixed_normals", "label": "Fixed normals"},
    {"id": "repaired_holes", "label": "Repaired holes"},
    {"id": "real_world_scale", "label": "Real-world scale"},
    {"id": "minimum_wall_thickness", "label": "Minimum wall thickness"},
    {"id": "bed_size_fit", "label": "Bed-size fit"},
    {"id": "overhang_support_estimate", "label": "Overhang/support estimate"},
    {"id": "slicer_dry_run_success", "label": "Slicer dry-run success"},
    {"id": "material_printer_compatibility", "label": "Material/printer compatibility"},
    {"id": "moonraker_ready_package", "label": "Moonraker-ready upload package"},
]

GENERATION_ENGINES: list[dict[str, Any]] = [
    {
        "id": "trellis2",
        "label": "TRELLIS.2",
        "role": "primary",
        "backend": "comfyui",
        "status": "planned-primary",
        "outputs": ["glb", "obj", "mesh", "pbr"],
        "notes": "Highest-ceiling primary engine when the local GPU sidecar is installed.",
    },
    {
        "id": "hunyuan3d21",
        "label": "Hunyuan3D-2.1",
        "role": "comparison-fallback",
        "backend": "comfyui",
        "status": "planned-fallback",
        "outputs": ["glb", "obj", "pbr"],
        "notes": "Open local comparison engine with strong texture/material workflow.",
    },
    {
        "id": "triposr",
        "label": "TripoSR",
        "role": "fast-preview",
        "backend": "comfyui",
        "status": "planned-preview",
        "outputs": ["obj", "mesh"],
        "notes": "Fast preview only; never treated as final printable output by itself.",
    },
]

PIPELINE_STEPS: list[dict[str, str]] = [
    {"id": "photo_input", "label": "Photo / multi-photo input"},
    {"id": "vision_analysis", "label": "MiniMax-MCP vision analysis"},
    {"id": "intent_scale", "label": "Object intent and scale estimate"},
    {"id": "image_cleanup", "label": "Background removal and image cleanup"},
    {"id": "trellis2_generation", "label": "TRELLIS.2 primary generation"},
    {"id": "hunyuan_compare", "label": "Hunyuan3D-2.1 fallback / comparison"},
    {"id": "triposr_preview", "label": "TripoSR fast preview fallback"},
    {"id": "blender_repair", "label": "Blender CLI repair/export"},
    {"id": "mesh_validation", "label": "Mesh validation"},
    {"id": "slicer_dry_run", "label": "Slicer dry-run validation"},
    {"id": "printability_truth_gate", "label": "Printability truth gate"},
    {"id": "printer_selection", "label": "Printer compatibility scoring"},
    {"id": "moonraker_package", "label": "Moonraker upload package"},
    {"id": "voice_updates", "label": "Azure voice updates"},
    {"id": "reporting", "label": "Markdown report and diagrams"},
]


@dataclass(frozen=True)
class GenerationRunResult:
    mode: str
    selected_engine: str
    artifacts: dict[str, Path]
    metadata: dict[str, Any]


class GenerationPipelineWorker:
    def __init__(
        self,
        storage_dir: Path,
        runtime: dict[str, Any],
        services: dict[str, Any],
        repo_root: Path | None = None,
    ) -> None:
        self.storage_dir = storage_dir
        self.runtime = runtime
        self.services = services
        self.repo_root = repo_root or storage_dir.parent

    def run_image_to_print(
        self,
        *,
        job_id: int,
        image_path: Path,
        object_intent: str,
        target_printer: dict[str, Any] | None,
        requested_engine: str | None = None,
        scale_estimate_mm: str | None = None,
    ) -> GenerationRunResult:
        run_dir = job_dir(self.storage_dir, job_id) / "generation"
        run_dir.mkdir(parents=True, exist_ok=True)
        source_copy = run_dir / f"source-image{image_path.suffix or '.image'}"
        if image_path.resolve() != source_copy.resolve():
            shutil.copyfile(image_path, source_copy)

        selected_engine = self._select_engine(requested_engine)
        backend = self._run_generation_backend(
            run_dir=run_dir,
            source_image=source_copy,
            object_intent=object_intent,
            selected_engine=selected_engine,
            scale_estimate_mm=scale_estimate_mm,
        )
        artifacts: dict[str, Path] = {"source_image": source_copy}
        artifacts.update(backend.get("artifacts", {}))

        candidate_mesh = _first_mesh_artifact(artifacts)
        if candidate_mesh is None:
            candidate_mesh = run_dir / "candidate-mesh.obj"
            candidate_mesh.write_text(_placeholder_obj(), encoding="utf-8")
        artifacts["candidate_mesh"] = candidate_mesh

        mode = str(backend.get("mode") or "operator_required")
        evidence = self._build_evidence(
            job_id=job_id,
            source_image=source_copy,
            object_intent=object_intent,
            target_printer=target_printer,
            selected_engine=selected_engine,
            scale_estimate_mm=scale_estimate_mm,
            candidate_mesh=candidate_mesh,
            backend=backend,
            mode=mode,
            artifacts=artifacts,
        )
        metadata_path = run_dir / "generation-metadata.json"
        metadata_path.write_text(json.dumps(evidence, indent=2, sort_keys=True), encoding="utf-8")
        report_path = run_dir / "generation-report.md"
        report_path.write_text(_markdown_report(evidence), encoding="utf-8")
        diagram_path = run_dir / "generation-pipeline.svg"
        diagram_path.write_text(_svg_diagram(), encoding="utf-8")
        operator_gate_path = run_dir / "operator-gates.json"
        operator_gate_path.write_text(
            json.dumps(evidence.get("operator_gates", []), indent=2, sort_keys=True),
            encoding="utf-8",
        )

        return GenerationRunResult(
            mode=mode,
            selected_engine=selected_engine,
            artifacts={
                **artifacts,
                "metadata": metadata_path,
                "report": report_path,
                "diagram": diagram_path,
                "operator_gate": operator_gate_path,
            },
            metadata=evidence,
        )

    def _select_engine(self, requested_engine: str | None) -> str:
        engine_ids = {engine["id"] for engine in GENERATION_ENGINES}
        if requested_engine in engine_ids:
            return str(requested_engine)
        return "trellis2"

    def _comfyui_configured(self) -> bool:
        service_urls = self.runtime.get("service_urls", {}) if isinstance(self.runtime, dict) else {}
        return bool(service_urls.get("comfyui"))

    def _run_generation_backend(
        self,
        *,
        run_dir: Path,
        source_image: Path,
        object_intent: str,
        selected_engine: str,
        scale_estimate_mm: str | None,
    ) -> dict[str, Any]:
        config = generation_stack_config(self.services)
        service_urls = self.runtime.get("service_urls", {}) if isinstance(self.runtime, dict) else {}
        comfy_config = config.get("comfyui", {}) if isinstance(config.get("comfyui", {}), dict) else {}
        engine_configs = config.get("engines", {}) if isinstance(config.get("engines", {}), dict) else {}
        engine_config = (
            engine_configs.get(selected_engine, {}) if isinstance(engine_configs, dict) else {}
        )
        base_url = str(comfy_config.get("base_url") or service_urls.get("comfyui") or "").rstrip("/")

        backend: dict[str, Any] = {
            "name": "comfyui",
            "engine": selected_engine,
            "comfyui_url": base_url,
            "attempted": False,
            "reachable": None,
            "workflow": {},
            "operator_gates": [],
            "artifacts": {},
            "mode": "operator_required",
        }

        if not config or not bool(config.get("enabled", True)):
            backend["operator_gates"].append(_operator_gate("generation_stack_disabled"))
            return backend
        if not bool(comfy_config.get("enabled", True)):
            backend["operator_gates"].append(_operator_gate("comfyui_disabled"))
            return backend
        if not base_url:
            backend["operator_gates"].append(_operator_gate("comfyui_url_missing"))
            return backend
        if not isinstance(engine_config, dict) or not bool(engine_config.get("enabled", True)):
            backend["operator_gates"].append(_operator_gate("engine_disabled", selected_engine))
            return backend

        workflow_path = _resolve_path(self.repo_root, str(engine_config.get("workflow", "")))
        workflow_status = inspect_workflow(selected_engine, workflow_path)
        backend["workflow"] = workflow_status.model_dump()
        if not workflow_status.ready:
            backend["operator_gates"].append(
                _operator_gate("comfyui_workflow_export_required", workflow_status.reason)
            )
            return backend

        client = ComfyUIClient(base_url, timeout_seconds=float(comfy_config.get("timeout_seconds", 30)))
        probe = client.probe(timeout_seconds=float(comfy_config.get("probe_timeout_seconds", 1.0)))
        backend["reachable"] = bool(probe.get("reachable"))
        backend["probe"] = probe
        if not backend["reachable"]:
            backend["operator_gates"].append(_operator_gate("comfyui_unreachable", probe["reason"]))
            return backend

        output_dir = run_dir / "comfyui"
        try:
            result = client.run_workflow(
                workflow_path=workflow_path,
                source_image=source_image,
                object_intent=object_intent,
                scale_estimate_mm=scale_estimate_mm,
                output_dir=output_dir,
                timeout_seconds=float(comfy_config.get("generation_timeout_seconds", 600)),
            )
        except Exception as exc:  # noqa: BLE001 - preserve evidence for operator review.
            backend["attempted"] = True
            backend["operator_gates"].append(_operator_gate("comfyui_run_failed", str(exc)))
            return backend

        artifacts = {"comfyui_history": result.history_path}
        artifacts.update(_classify_comfy_artifacts(result.artifacts))
        backend.update(
            {
                "attempted": True,
                "prompt_id": result.prompt_id,
                "uploaded_image": result.uploaded_image,
                "artifacts": artifacts,
                "mode": "comfyui_generated_unvalidated",
            }
        )
        if not _first_mesh_artifact(artifacts):
            backend["operator_gates"].append(_operator_gate("comfyui_mesh_output_missing"))
        return backend

    def _build_evidence(
        self,
        *,
        job_id: int,
        source_image: Path,
        object_intent: str,
        target_printer: dict[str, Any] | None,
        selected_engine: str,
        scale_estimate_mm: str | None,
        candidate_mesh: Path,
        backend: dict[str, Any],
        mode: str,
        artifacts: dict[str, Path],
    ) -> dict[str, Any]:
        target_name = (target_printer or {}).get("name") or "Auto-select after printability gate"
        mesh_exists = bool(candidate_mesh.exists())
        generated_mesh = candidate_mesh.name != "candidate-mesh.obj"
        return {
            "job_id": job_id,
            "source_image_record": str(source_image),
            "selected_engine": selected_engine,
            "generation_backend": _backend_for_metadata(backend),
            "operator_gates": backend.get("operator_gates", []),
            "generation_parameters": {
                "object_intent": object_intent,
                "scale_estimate_mm": scale_estimate_mm or "operator-required-before-print",
                "primary_engine": "trellis2",
                "comparison_engine": "hunyuan3d21",
                "fast_preview_engine": "triposr",
            },
            "mesh_stats": {
                "mode": "generated-unvalidated" if generated_mesh else "placeholder-evidence",
                "watertight": False,
                "manifold": False,
                "triangles": "unknown" if generated_mesh else 12,
                "units": "mm",
                "candidate_mesh": str(candidate_mesh),
                "exists": mesh_exists,
            },
            "repair_actions": [
                "Blender CLI repair pending",
                "Meshlib/Manifold repair pending",
                "wall thickness analysis pending",
            ],
            "slicer_result": {
                "status": "not_run",
                "printable": False,
                "reason": "Real generated mesh has not passed validation yet.",
            },
            "printer_compatibility_score": {
                "printer": target_name,
                "score": 0,
                "reason": "Deferred until mesh scale, bounds, material, and slicer dry-run are known.",
            },
            "final_paths": {
                "stl": _artifact_by_suffix(artifacts, ".stl"),
                "3mf": _artifact_by_suffix(artifacts, ".3mf"),
                "glb": _artifact_by_suffix(artifacts, ".glb"),
                "obj": _artifact_by_suffix(artifacts, ".obj"),
            },
            "truth_gate": [
                {**gate, "passed": False, "required": True} for gate in PRINTABILITY_TRUTH_GATE
            ],
            "mode": mode,
        }


def _markdown_report(evidence: dict[str, Any]) -> str:
    gates = "\n".join(
        f"- [{'x' if gate['passed'] else ' '}] {gate['label']}" for gate in evidence["truth_gate"]
    )
    operator_gates = evidence.get("operator_gates", [])
    operator_gate_lines = "\n".join(
        f"- {gate.get('id', 'operator_gate')}: {gate.get('message', '')}" for gate in operator_gates
    )
    backend = evidence.get("generation_backend", {})
    return "\n".join(
        [
            "# Hermes3D-OS 3D Generation Report",
            "",
            f"- Job: {evidence['job_id']}",
            f"- Source image: `{evidence['source_image_record']}`",
            f"- Selected engine: `{evidence['selected_engine']}`",
            f"- Mode: `{evidence['mode']}`",
            f"- Backend: `{backend.get('name', 'unknown')}`",
            f"- ComfyUI URL: `{backend.get('comfyui_url', '')}`",
            "",
            "## Generation Parameters",
            "",
            f"- Object intent: {evidence['generation_parameters']['object_intent']}",
            f"- Scale estimate: {evidence['generation_parameters']['scale_estimate_mm']}",
            "",
            "## Operator Gates",
            "",
            operator_gate_lines or "- No operator gates reported by the generation backend.",
            "",
            "## Printability Truth Gate",
            "",
            gates,
            "",
            "## Result",
            "",
            "This run is not printable until every required truth-gate item passes and a slicer dry-run produces validated G-code.",
            "",
        ]
    )


def _svg_diagram() -> str:
    labels = [step["label"] for step in PIPELINE_STEPS]
    width = 980
    height = 70 + len(labels) * 42
    rows = []
    for index, label in enumerate(labels):
        y = 36 + index * 42
        rows.append(
            f'<rect x="28" y="{y}" width="420" height="28" rx="6" fill="#ffffff" stroke="#d7dde6"/>'
            f'<text x="42" y="{y + 19}" font-family="Arial" font-size="13" fill="#18202a">{_xml(label)}</text>'
        )
        if index < len(labels) - 1:
            rows.append(
                f'<line x1="238" y1="{y + 28}" x2="238" y2="{y + 42}" stroke="#2563eb" stroke-width="2"/>'
            )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">'
        '<rect width="100%" height="100%" fill="#f6f7f9"/>'
        '<text x="28" y="24" font-family="Arial" font-size="16" font-weight="700" fill="#18202a">'
        'Hermes3D-OS Image-to-Print Pipeline</text>'
        + "".join(rows)
        + "</svg>"
    )


def _placeholder_obj() -> str:
    return "\n".join(
        [
            "# Hermes3D-OS placeholder mesh evidence",
            "# This is not printable and must be replaced by a generated/repaired mesh.",
            "o hermes_placeholder_cube",
            "v 0 0 0",
            "v 10 0 0",
            "v 10 10 0",
            "v 0 10 0",
            "v 0 0 10",
            "v 10 0 10",
            "v 10 10 10",
            "v 0 10 10",
            "f 1 2 3 4",
            "f 5 8 7 6",
            "f 1 5 6 2",
            "f 2 6 7 3",
            "f 3 7 8 4",
            "f 4 8 5 1",
            "",
        ]
    )


def _xml(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _resolve_path(repo_root: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else repo_root / path


def _operator_gate(gate_id: str, detail: str | None = None) -> dict[str, Any]:
    messages = {
        "generation_stack_disabled": "Generation stack is disabled in services config.",
        "comfyui_disabled": "ComfyUI backend is disabled in services config.",
        "comfyui_url_missing": "ComfyUI service URL is missing.",
        "engine_disabled": "Selected generation engine is disabled or missing.",
        "comfyui_workflow_export_required": "A real exported ComfyUI API workflow is required.",
        "comfyui_unreachable": "ComfyUI did not respond at the configured URL.",
        "comfyui_run_failed": "ComfyUI workflow execution failed.",
        "comfyui_mesh_output_missing": "ComfyUI finished but no mesh-like output artifact was found.",
    }
    message = messages.get(gate_id, "Operator action required.")
    if detail:
        message = f"{message} {detail}"
    return {"id": gate_id, "message": message, "passed": False, "required": True}


def _classify_comfy_artifacts(artifacts: dict[str, Path]) -> dict[str, Path]:
    classified: dict[str, Path] = {}
    for key, path in artifacts.items():
        suffix = path.suffix.lower()
        if suffix in {".png", ".jpg", ".jpeg", ".webp"} and "preview_image" not in classified:
            classified["preview_image"] = path
        elif suffix == ".glb":
            classified["glb"] = path
        elif suffix == ".obj":
            classified["obj"] = path
        elif suffix == ".stl":
            classified["stl"] = path
        elif suffix == ".3mf":
            classified["3mf"] = path
        else:
            classified[key] = path
    return classified


def _first_mesh_artifact(artifacts: dict[str, Path]) -> Path | None:
    for preferred in ("stl", "3mf", "obj", "glb"):
        path = artifacts.get(preferred)
        if isinstance(path, Path):
            return path
    for path in artifacts.values():
        if isinstance(path, Path) and path.suffix.lower() in {".stl", ".3mf", ".obj", ".glb"}:
            return path
    return None


def _artifact_by_suffix(artifacts: dict[str, Path], suffix: str) -> str:
    suffix = suffix.lower()
    for path in artifacts.values():
        if isinstance(path, Path) and path.suffix.lower() == suffix:
            return str(path)
    return ""


def _backend_for_metadata(backend: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in backend.items()
        if key not in {"artifacts"} and _json_safe(value)
    }


def _json_safe(value: Any) -> bool:
    try:
        json.dumps(value)
        return True
    except TypeError:
        return False
