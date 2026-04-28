from __future__ import annotations

import os
from pathlib import Path
from dataclasses import dataclass
from typing import Any

import httpx


@dataclass(frozen=True)
class MoonrakerResult:
    dry_run: bool
    ok: bool
    message: str
    payload: dict[str, Any]


class MoonrakerClient:
    def __init__(self, dry_run: bool = True, timeout: float = 30.0) -> None:
        self.dry_run = dry_run
        self.timeout = timeout

    async def status(self, printer: dict[str, Any], real_probe: bool = False) -> MoonrakerResult:
        if self.dry_run and not real_probe:
            return MoonrakerResult(
                dry_run=True,
                ok=True,
                message="Dry-run printer status is ready.",
                payload={"state": "ready", "printer_id": printer["id"]},
            )

        base_url = printer.get("base_url")
        if not base_url:
            raise ValueError(f"Printer {printer['id']} has no Moonraker base_url")

        headers = self._headers(printer)
        async with httpx.AsyncClient(timeout=self.timeout, headers=headers) as client:
            printer_response = await client.get(f"{base_url.rstrip('/')}/printer/info")
            printer_response.raise_for_status()
            server_response = await client.get(f"{base_url.rstrip('/')}/server/info")
            server_response.raise_for_status()
            payload = {
                "printer": printer_response.json(),
                "server": server_response.json(),
                "base_url": base_url,
            }
        return MoonrakerResult(False, True, "Moonraker status read.", payload)

    async def upload_gcode(
        self, printer: dict[str, Any], gcode_path: str, print_after_upload: bool = False
    ) -> MoonrakerResult:
        if self.dry_run:
            action = "upload_and_start" if print_after_upload else "upload_only"
            return MoonrakerResult(
                dry_run=True,
                ok=True,
                message="Dry-run upload completed. No hardware was touched.",
                payload={
                    "printer_id": printer["id"],
                    "gcode_path": gcode_path,
                    "filename": Path(gcode_path).name,
                    "action": action,
                    "hardware_mutated": False,
                },
            )

        base_url = printer.get("base_url")
        if not base_url:
            raise ValueError(f"Printer {printer['id']} has no Moonraker base_url")

        path = Path(gcode_path)
        if not path.exists():
            raise FileNotFoundError(f"G-code artifact does not exist: {gcode_path}")

        headers = self._headers(printer)
        async with httpx.AsyncClient(timeout=self.timeout, headers=headers) as client:
            with path.open("rb") as handle:
                response = await client.post(
                    f"{base_url.rstrip('/')}/server/files/upload",
                    data={"root": "gcodes", "print": "true" if print_after_upload else "false"},
                    files={
                        "file": (
                            path.name,
                            handle,
                            "application/octet-stream",
                        )
                    },
                )
            response.raise_for_status()
            payload = response.json()

        return MoonrakerResult(
            dry_run=False,
            ok=True,
            message="G-code uploaded to Moonraker.",
            payload={
                "printer_id": printer["id"],
                "base_url": base_url,
                "gcode_path": gcode_path,
                "filename": path.name,
                "print_after_upload": print_after_upload,
                "moonraker": payload,
                "hardware_mutated": True,
            },
        )

    async def start_print(self, printer: dict[str, Any], filename: str) -> MoonrakerResult:
        if self.dry_run:
            return MoonrakerResult(
                dry_run=True,
                ok=True,
                message="Dry-run print start recorded. No hardware was touched.",
                payload={
                    "printer_id": printer["id"],
                    "filename": filename,
                    "action": "start_print",
                    "hardware_mutated": False,
                },
            )

        base_url = printer.get("base_url")
        if not base_url:
            raise ValueError(f"Printer {printer['id']} has no Moonraker base_url")

        headers = self._headers(printer)
        async with httpx.AsyncClient(timeout=self.timeout, headers=headers) as client:
            response = await client.post(
                f"{base_url.rstrip('/')}/printer/print/start",
                params={"filename": filename},
            )
            response.raise_for_status()
            payload = response.json()

        return MoonrakerResult(
            dry_run=False,
            ok=True,
            message="Moonraker print start requested.",
            payload={
                "printer_id": printer["id"],
                "base_url": base_url,
                "filename": filename,
                "moonraker": payload,
                "hardware_mutated": True,
            },
        )

    def _headers(self, printer: dict[str, Any]) -> dict[str, str]:
        api_key_env = printer.get("api_key_env")
        if not api_key_env:
            return {}
        api_key = os.getenv(api_key_env)
        return {"X-Api-Key": api_key} if api_key else {}

