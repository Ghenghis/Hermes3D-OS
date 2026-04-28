from __future__ import annotations

from pydantic import BaseModel, Field


class JobCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=4000)
    target_printer_id: str | None = None


class ApprovalCreate(BaseModel):
    approved: bool = True
    note: str | None = None


class AdvanceRequest(BaseModel):
    target_printer_id: str | None = None


class ApiMessage(BaseModel):
    message: str

