from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterator


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


class Database:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def init(self) -> None:
        with self.connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS printers (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    vendor TEXT,
                    model TEXT,
                    role TEXT,
                    connector TEXT NOT NULL DEFAULT 'moonraker',
                    base_url TEXT,
                    api_key_env TEXT,
                    slicer_profile TEXT,
                    capabilities_json TEXT NOT NULL DEFAULT '{}',
                    enabled INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    state TEXT NOT NULL,
                    target_printer_id TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    completed_at TEXT,
                    FOREIGN KEY(target_printer_id) REFERENCES printers(id)
                );

                CREATE TABLE IF NOT EXISTS artifacts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id INTEGER NOT NULL,
                    kind TEXT NOT NULL,
                    path TEXT NOT NULL,
                    metadata_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS approvals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id INTEGER NOT NULL,
                    gate TEXT NOT NULL,
                    approved INTEGER NOT NULL,
                    note TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id INTEGER,
                    event_type TEXT NOT NULL,
                    message TEXT NOT NULL,
                    payload_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS telemetry (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id INTEGER,
                    printer_id TEXT,
                    state TEXT NOT NULL,
                    payload_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE SET NULL,
                    FOREIGN KEY(printer_id) REFERENCES printers(id) ON DELETE SET NULL
                );
                """
            )

    def upsert_printer(self, printer: dict[str, Any]) -> None:
        now = utc_now()
        moonraker = printer.get("moonraker", {}) or {}
        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO printers (
                    id, name, vendor, model, role, connector, base_url, api_key_env,
                    slicer_profile, capabilities_json, enabled, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    vendor=excluded.vendor,
                    model=excluded.model,
                    role=excluded.role,
                    connector=excluded.connector,
                    base_url=excluded.base_url,
                    api_key_env=excluded.api_key_env,
                    slicer_profile=excluded.slicer_profile,
                    capabilities_json=excluded.capabilities_json,
                    enabled=excluded.enabled,
                    updated_at=excluded.updated_at
                """,
                (
                    printer["id"],
                    printer.get("name", printer["id"]),
                    printer.get("vendor"),
                    printer.get("model"),
                    printer.get("role"),
                    printer.get("connector", "moonraker"),
                    moonraker.get("base_url"),
                    moonraker.get("api_key_env"),
                    printer.get("slicer_profile"),
                    json.dumps(printer.get("capabilities", {}), sort_keys=True),
                    int(bool(printer.get("enabled", True))),
                    now,
                    now,
                ),
            )

    def add_event(
        self, job_id: int | None, event_type: str, message: str, payload: dict[str, Any] | None = None
    ) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO events (job_id, event_type, message, payload_json, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (job_id, event_type, message, json.dumps(payload or {}, sort_keys=True), utc_now()),
            )


def row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    item = dict(row)
    for key in ("capabilities_json", "metadata_json", "payload_json"):
        if key in item:
            target = key.removesuffix("_json")
            item[target] = json.loads(item.pop(key) or "{}")
    return item

