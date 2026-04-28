# Branching Strategy

Hermes3D OS uses a simple branch model while the project is young.

## Long-Lived Branches

```text
main
  Stable project foundation and releases.

develop
  Integration branch for active work.
```

## Feature Branches

```text
feature/web-ui
feature/api
feature/hermes-runtime
feature/workflow-gates
feature/moonraker-connector
feature/slicer-worker
feature/modeling-worker
feature/fdm-monster-sidecar
feature/docs
```

Use feature branches for focused work, then merge into `develop`. Merge `develop` into `main` only when the integrated build is usable.

## Release Branches

Later, when the app has runnable versions:

```text
release/v0.1.0
release/v0.2.0
```

## Hotfix Branches

For urgent fixes against `main`:

```text
hotfix/<short-description>
```

## First Branch Set

The initial local branches should be:

- `main`
- `develop`
- `feature/docs`
- `feature/api`
- `feature/web-ui`
- `feature/hermes-runtime`
- `feature/workflow-gates`
- `feature/moonraker-connector`
- `feature/slicer-worker`
- `feature/modeling-worker`

