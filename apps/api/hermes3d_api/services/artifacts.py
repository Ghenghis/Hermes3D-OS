from __future__ import annotations

from pathlib import Path


def job_dir(storage_dir: Path, job_id: int) -> Path:
    path = storage_dir / "jobs" / str(job_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_text_artifact(storage_dir: Path, job_id: int, filename: str, content: str) -> Path:
    path = job_dir(storage_dir, job_id) / filename
    path.write_text(content, encoding="utf-8")
    return path

