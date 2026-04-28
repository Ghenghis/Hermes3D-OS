from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .artifacts import write_text_artifact


@dataclass(frozen=True)
class SliceResult:
    mode: str
    gcode_path: Path
    metadata: dict[str, Any]


class SlicerWorker:
    def __init__(self, storage_dir: Path) -> None:
        self.storage_dir = storage_dir

    def slice_or_simulate(self, job_id: int, model_path: str | None, printer: dict[str, Any] | None) -> SliceResult:
        prusa = shutil.which("prusa-slicer") or shutil.which("prusa-slicer-console")
        if prusa and model_path and Path(model_path).exists():
            return self._slice_with_prusa(job_id, Path(model_path), printer, prusa)

        gcode = write_text_artifact(
            self.storage_dir,
            job_id,
            "simulated-output.gcode",
            "\n".join(
                [
                    "; Hermes3D OS simulated G-code",
                    "; This file is evidence only and should not be printed.",
                    "M117 Hermes3D simulated job",
                    "G28 ; home all axes",
                    "M84 ; disable motors",
                    "",
                ]
            ),
        )
        return SliceResult(
            mode="simulated",
            gcode_path=gcode,
            metadata={
                "slicer": "simulated",
                "reason": "PrusaSlicer CLI or printable model artifact was not available.",
                "printable": False,
            },
        )

    def _slice_with_prusa(
        self, job_id: int, model_path: Path, printer: dict[str, Any] | None, executable: str
    ) -> SliceResult:
        output_path = self.storage_dir / "jobs" / str(job_id) / f"{model_path.stem}.gcode"
        cmd = [executable, "--export-gcode", str(model_path), "--output", str(output_path)]
        profile = (printer or {}).get("slicer_profile")
        if profile:
            cmd.extend(["--load", profile])

        completed = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if completed.returncode != 0:
            fallback = write_text_artifact(
                self.storage_dir,
                job_id,
                "slicer-failed.txt",
                completed.stderr or completed.stdout or "PrusaSlicer failed without output.",
            )
            return SliceResult(
                mode="failed",
                gcode_path=fallback,
                metadata={
                    "slicer": "prusaslicer",
                    "returncode": completed.returncode,
                    "stdout": completed.stdout[-4000:],
                    "stderr": completed.stderr[-4000:],
                    "printable": False,
                },
            )

        return SliceResult(
            mode="prusaslicer",
            gcode_path=output_path,
            metadata={
                "slicer": "prusaslicer",
                "command": cmd,
                "stdout": completed.stdout[-4000:],
                "stderr": completed.stderr[-4000:],
                "printable": True,
            },
        )

