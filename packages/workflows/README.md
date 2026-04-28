# Workflows Package

Workflow definitions and transition rules for Hermes3D OS.

LangGraph is the intended workflow engine.

Initial graph:

```text
INTAKE -> PLAN_JOB -> VALIDATE_MODEL -> MODEL_APPROVAL -> SLICE -> VALIDATE_GCODE -> PRINT_APPROVAL -> SELECT_PRINTER -> UPLOAD_TO_MOONRAKER -> START_PRINT -> MONITOR_PRINT
```

