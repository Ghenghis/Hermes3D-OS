# Contributing

Hermes3D OS is a local printer-factory controller. Contributions should protect the safety and observability of the print pipeline.

## Priorities

- Make printer actions explicit and auditable.
- Keep workflow gates enforceable.
- Record artifacts and approvals.
- Prefer small service adapters over large hidden integrations.
- Keep examples safe for public repos.

## Branches

Create work from `develop` using focused feature branches:

```powershell
git switch develop
git switch -c feature/<area>
```

Open pull requests back into `develop`.

## Commit Style

Use clear commits:

```text
docs: add printer onboarding guide
api: add printer inventory routes
workflow: enforce print approval gate
connector: add Moonraker status client
worker: add PrusaSlicer command builder
```

## Safety

Do not add code that starts, pauses, cancels, or uploads jobs to a printer without:

- explicit service boundaries
- logged evidence
- validation checks
- approval gate integration

