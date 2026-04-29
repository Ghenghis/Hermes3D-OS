# Hermes3D-OS Visual Evidence

Hermes3D agents are vision-enabled, so their claims need local evidence artifacts.

## API

- `GET /api/artifacts/{artifact_id}/file`
- `POST /api/jobs/{job_id}/visual-evidence`

`POST /api/jobs/{job_id}/visual-evidence` accepts multipart form data:

- `evidence`: uploaded image or SVG
- `evidence_kind`: `source_image`, `screenshot`, `mesh_preview`, `slicer_preview`, `gcode_preview`, `camera_snapshot`, or `diagram`
- `agent_id`: Hermes agent that captured or needs the evidence
- `stage`: workflow stage such as `VALIDATE_MODEL` or `VALIDATE_GCODE`
- `gate`: optional approval gate such as `MODEL_APPROVAL` or `PRINT_APPROVAL`
- `label`: operator-facing label
- `notes`: short local notes

The API writes:

- the uploaded evidence file under `storage/jobs/{job_id}/visual-evidence/`
- a `visual_*` artifact with `metadata.evidence`
- a local markdown `visual_evidence_summary`
- a `VISUAL_EVIDENCE_ATTACHED` ledger event

## UI

The Artifacts page has an Attach Visual Evidence form. The Active Job view now shows a Visual Evidence strip before the full artifact list. Visual artifacts are served through the narrow artifact file endpoint instead of exposing arbitrary local paths.

## Evidence Rule

Use visual evidence for:

- uploaded source photos
- screenshots from MiniMax-MCP, ComfyUI, Blender, slicer, Moonraker, or FDM Monster
- mesh preview renders
- slicer preview renders
- printer/camera snapshots
- diagrams used in reports

No Hermes agent should make a printability, safety, or printer-observation claim without linking the relevant artifacts.

## S1 Note

The FLSUN S1 is known at `192.168.0.12` and may power off when inactive, but it remains maintenance locked. Do not probe, upload, start, move, or run tests against S1 until the lock is explicitly cleared.
