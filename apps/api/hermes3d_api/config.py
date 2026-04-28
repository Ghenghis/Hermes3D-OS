from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


REPO_ROOT = Path(__file__).resolve().parents[3]


def _load_yaml(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    if not isinstance(data, dict):
        raise ValueError(f"Expected YAML object in {path}")
    return data


@dataclass(frozen=True)
class Settings:
    repo_root: Path
    data_dir: Path
    storage_dir: Path
    database_path: Path
    services_config_path: Path
    printers_config_path: Path
    dry_run_printers: bool

    @classmethod
    def load(cls) -> "Settings":
        services_path = Path(
            os.getenv("HERMES3D_SERVICES_CONFIG", REPO_ROOT / "configs" / "services.local.yaml")
        )
        if not services_path.exists():
            services_path = REPO_ROOT / "configs" / "services.example.yaml"

        printers_path = Path(
            os.getenv("HERMES3D_PRINTERS_CONFIG", REPO_ROOT / "configs" / "printers.local.yaml")
        )
        if not printers_path.exists():
            printers_path = REPO_ROOT / "configs" / "printers.pilot.example.yaml"

        data_dir = Path(os.getenv("HERMES3D_DATA_DIR", REPO_ROOT / "data"))
        storage_dir = Path(os.getenv("HERMES3D_STORAGE_DIR", REPO_ROOT / "storage"))
        db_path = Path(os.getenv("HERMES3D_DATABASE_PATH", data_dir / "hermes3d.sqlite"))

        services = _load_yaml(services_path)
        moonraker_config = services.get("connectors", {}).get("moonraker", {})
        dry_run = str(os.getenv("HERMES3D_DRY_RUN_PRINTERS", "")).lower() in {"1", "true", "yes"}
        dry_run = dry_run or bool(moonraker_config.get("dry_run", True))

        return cls(
            repo_root=REPO_ROOT,
            data_dir=data_dir,
            storage_dir=storage_dir,
            database_path=db_path,
            services_config_path=services_path,
            printers_config_path=printers_path,
            dry_run_printers=dry_run,
        )


def load_printer_config(settings: Settings) -> list[dict[str, Any]]:
    data = _load_yaml(settings.printers_config_path)
    printers = data.get("printers", [])
    if not isinstance(printers, list):
        raise ValueError("Printer config must contain a printers list")
    return [printer for printer in printers if isinstance(printer, dict)]

