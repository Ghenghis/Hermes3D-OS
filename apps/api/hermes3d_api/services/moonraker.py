from __future__ import annotations

import os
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

    async def status(self, printer: dict[str, Any]) -> MoonrakerResult:
        if self.dry_run:
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
            response = await client.get(f"{base_url.rstrip('/')}/printer/info")
            response.raise_for_status()
            payload = response.json()
        return MoonrakerResult(False, True, "Moonraker status read.", payload)

    async def upload_and_start(self, printer: dict[str, Any], gcode_path: str) -> MoonrakerResult:
        if self.dry_run:
            return MoonrakerResult(
                dry_run=True,
                ok=True,
                message="Dry-run upload/start completed. No hardware was touched.",
                payload={
                    "printer_id": printer["id"],
                    "gcode_path": gcode_path,
                    "action": "upload_and_start",
                    "hardware_mutated": False,
                },
            )

        base_url = printer.get("base_url")
        if not base_url:
            raise ValueError(f"Printer {printer['id']} has no Moonraker base_url")

        # Real upload/start support is intentionally explicit and can be hardened
        # once printer-specific paths and Moonraker auth are confirmed.
        raise NotImplementedError(
            "Real Moonraker upload/start is gated until printer URLs and API keys are configured."
        )

    def _headers(self, printer: dict[str, Any]) -> dict[str, str]:
        api_key_env = printer.get("api_key_env")
        if not api_key_env:
            return {}
        api_key = os.getenv(api_key_env)
        return {"X-Api-Key": api_key} if api_key else {}

