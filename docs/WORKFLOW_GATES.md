# Workflow Gates

Print jobs must move through explicit gates. The goal is to make every high-impact step evidence-based, observable, and reversible where possible.

## Gate List

```text
INTAKE
PLAN_JOB
GENERATE_OR_IMPORT_MODEL
VALIDATE_MODEL
MODEL_APPROVAL
SLICE
VALIDATE_GCODE
PRINT_APPROVAL
SELECT_PRINTER
UPLOAD_ONLY
USER_CHECKED_PRINTER_UI
START_PRINT
MONITOR_PRINT
COMPLETE
```

Failure branches:

```text
NEEDS_USER_INPUT
MODEL_REPAIR_REQUIRED
SLICE_FAILED
PRINTER_NOT_READY
USER_REJECTED
PAUSED
CANCELLED
FAILED
```

## Required Evidence

### Model Approval

Before model approval, capture:

- source prompt or imported file
- generated CAD source if applicable
- STL/3MF path
- dimensions
- bounding box
- manifold/watertight status
- repair notes
- preview image

### Print Approval

Before print approval, capture:

- slicer name/version
- slicer profile
- target printer profile
- estimated print time
- filament estimate
- G-code path
- warnings
- preview image if available

### Start Print

Before starting a print, capture:

- selected printer
- printer online state
- idle/ready state
- bed and hotend temperatures
- currently loaded filament if known
- uploaded file confirmation
- print approval
- user checked printer UI or camera acknowledgement

### Upload Only

Before start print, upload the G-code without auto-starting it.

Capture:

- selected printer
- uploaded filename
- Moonraker upload response
- operator/camera/printer UI check status

### User Checked Printer UI

Before start print, the operator must confirm they checked the printer UI or camera after upload-only.

Capture:

- selected printer
- uploaded file already recorded
- operator note if provided
- acknowledgement timestamp

## Safety Rules

- Hermes may not start a print without a print approval record.
- G-code may not be uploaded before slicing validation passes.
- Slicing may not start before model validation passes.
- Generated models may not be printed without at least one preview/evidence artifact.
- Moonraker mutation calls must be recorded in the ledger.
- Real print start must be separate from upload.
- Real print start must require `USER_CHECKED_PRINTER_UI`.
- Failed or cancelled jobs should preserve artifacts for debugging.
