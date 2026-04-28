from __future__ import annotations

from dataclasses import dataclass


INTAKE = "INTAKE"
PLAN_JOB = "PLAN_JOB"
GENERATE_OR_IMPORT_MODEL = "GENERATE_OR_IMPORT_MODEL"
VALIDATE_MODEL = "VALIDATE_MODEL"
MODEL_APPROVAL = "MODEL_APPROVAL"
SLICE = "SLICE"
VALIDATE_GCODE = "VALIDATE_GCODE"
PRINT_APPROVAL = "PRINT_APPROVAL"
SELECT_PRINTER = "SELECT_PRINTER"
UPLOAD_ONLY = "UPLOAD_ONLY"
USER_CHECKED_PRINTER_UI = "USER_CHECKED_PRINTER_UI"
START_PRINT = "START_PRINT"
MONITOR_PRINT = "MONITOR_PRINT"
COMPLETE = "COMPLETE"


ORDER = [
    INTAKE,
    PLAN_JOB,
    GENERATE_OR_IMPORT_MODEL,
    VALIDATE_MODEL,
    MODEL_APPROVAL,
    SLICE,
    VALIDATE_GCODE,
    PRINT_APPROVAL,
    SELECT_PRINTER,
    UPLOAD_ONLY,
    USER_CHECKED_PRINTER_UI,
    START_PRINT,
    MONITOR_PRINT,
    COMPLETE,
]

APPROVAL_STATES = {MODEL_APPROVAL: "MODEL_APPROVAL", PRINT_APPROVAL: "PRINT_APPROVAL"}


@dataclass(frozen=True)
class Transition:
    current: str
    next_state: str
    requires_approval: bool = False


def next_transition(state: str) -> Transition:
    if state == COMPLETE:
        return Transition(state, COMPLETE)
    if state not in ORDER:
        raise ValueError(f"Unknown workflow state: {state}")
    next_state = ORDER[ORDER.index(state) + 1]
    return Transition(state, next_state, next_state in APPROVAL_STATES)

