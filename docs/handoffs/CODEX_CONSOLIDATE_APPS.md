# Codex — Vendored-Apps Folder Consolidation

**Repo:** `G:\Github\Hermes3D-OS`
**Branch:** off `develop`. Target branch name: `chore/consolidate-vendored-apps-under-apps-external`
**Estimated time:** ~30 minutes (mechanical file move + ~5 reference updates).
**Status:** standalone — not blocked by anything else, can land before or after any of the install waves.

---

## Why

Right now vendored externals live at `source-lab/sources/<category>/<app>/` while in-house code lives at `apps/web/` + `apps/api/`. The user wants everything app-related under a single root `apps/` folder. We're moving externals to **`apps/external/<category>/<app>/`** so:

- One root folder (`apps/`) for everything app-shaped
- In-house code (`apps/web/`, `apps/api/`) stays clearly separated from third-party (`apps/external/`)
- The `apps/external/<cat>/` taxonomy already matches the GUI's left-rail categorization (slicers / modelers / printfarm / firmware / generation / agents / etc.)

After this PR, when a user clicks PrusaSlicer in the Source OS tab, the Action Window resolves to `apps/external/slicers/PrusaSlicer/` — one path, predictable, and the GUI's "Local" field gets shorter.

---

## HermesProof coordination

```python
hermes_claim_task(
  owner="codex-consolidate",
  taskId="HP3D-VENDOR-APPS-CONSOLIDATE-2026-05-03",
  title="Move vendored externals from source-lab/sources to apps/external",
  reason="User directive: single root apps/ folder for all app-shaped content"
)
hermes_lock_files(owner="codex-consolidate", files=[
  "apps/web/source-os.js",
  "apps/api/hermes3d_api/main.py",
  "source-lab/source_manifest.json",
  "source-lab/download-open-source.ps1",
  ".gitignore"
])
# do the work
hermes_run_gate(owner="codex-consolidate", gateId="git-status")
hermes_append_evidence(
  owner="codex-consolidate",
  taskId="HP3D-VENDOR-APPS-CONSOLIDATE-2026-05-03",
  kind="vendor_consolidation_complete",
  summary="Moved N externals from source-lab/sources/ to apps/external/; updated 5 reference sites; .gitignore updated; smoke test passes",
  data={"app_count": N, "files_changed": [...]}
)
hermes_release_files(...)
hermes_release_task(...)
```

PR body MUST contain:
- `Task ID: HP3D-VENDOR-APPS-CONSOLIDATE-2026-05-03`
- `Hermes evidence chain: PASS` (run `hermes_verify_evidence` first)
- `hermes_run_gate(gateId="git-status")` reference + run id

---

## Concrete steps

### 1. Move vendored sources on disk (preserve git metadata)

```powershell
# Create target dir
New-Item -Path "apps\external" -ItemType Directory -Force

# Move EVERY subdir of source-lab/sources/ into apps/external/
# Each <app>/ folder contains its own .git/ (or sparse-checkout config) — keep intact.
Move-Item -Path "source-lab\sources\*" -Destination "apps\external\" -Force

# source-lab/sources/ should now be empty
Remove-Item -Path "source-lab\sources" -Recurse -Force
```

**Verify after move:** `git -C apps/external/slicers/PrusaSlicer rev-parse HEAD` returns `c47697d...` (same SHA Codex's earlier commit recorded). If the SHA changes, the move corrupted git metadata — STOP and investigate.

### 2. Update `source-lab/source_manifest.json`

```json
{
  "sourceRoot": "apps/external",   // was "source-lab/sources"
  "modules": [ ... unchanged ... ]
}
```

Optionally also move the manifest itself: `source-lab/source_manifest.json` → `apps/external/source_manifest.json` (and update the `repo_root / ...` reference in `main.py` if so). **Recommendation: keep the manifest at `source-lab/source_manifest.json` for this PR** — it's the "registry" of what to install, conceptually separate from the installed payloads. Pure path move = lower risk.

### 3. Update `apps/web/source-os.js`

Three sites flagged in the current file (line numbers approximate — grep before edit):

```javascript
// Line ~452
return "apps/external";   // was "source-lab/sources"

// Line ~454
return `${sourceState.manifest?.sourceRoot || "apps/external"}/${module.target}`.replaceAll("\\", "/");

// Line ~569 (user-facing hint string)
setSourceStatus(`${module.name}: source missing. Run scripts/download-open-source.ps1 -Only ${module.id}`);
// ^ also update the script path if you move it (see step 5)
```

Search for any other `source-lab/sources` literal strings in `apps/web/` — fix all.

### 4. Update `apps/api/hermes3d_api/main.py`

Two sites flagged:

```python
# Line ~1453 — the manifest path; if you kept manifest at source-lab/, no change needed
lab_manifest = settings.repo_root / "source-lab" / "source_manifest.json"

# Line ~1468 — the fallback sourceRoot
return settings.repo_root / str(manifest.get("sourceRoot") or "apps/external")
#                                                            ^^^^^^^^^^^^^^
#                                                            was "source-lab/sources"
```

Search the whole `apps/api/` tree for any other `source-lab/sources` references.

### 5. Update `source-lab/download-open-source.ps1` (optionally rename + relocate)

The script's default `-OutDir` (or equivalent) should be `apps/external`. If you also want to move the script itself to `scripts/download-open-source.ps1` (so `source-lab/` only holds the manifest), update any docs/handoffs that reference the old path. Search:

```bash
grep -rn "source-lab/download-open-source\|source-lab\\\\download-open-source" .
```

### 6. Update `.gitignore`

```diff
-source-lab/sources/
+apps/external/
```

The intent stays the same: vendored full clones aren't checked in; only the manifest + script + apps/web + apps/api are.

### 7. Smoke verify

```powershell
# Start the API
.\scripts\smoke-test.ps1 -BaseUrl http://127.0.0.1:18081

# Hit the source-OS endpoint, confirm Local paths now read apps/external/...
curl http://127.0.0.1:18081/api/source_os/modules | python -m json.tool | head -40

# Open the GUI in browser, click PrusaSlicer card, confirm Action Window's
# "Local" field reads "apps/external/slicers/PrusaSlicer" (not "source-lab/sources/...")
```

### 8. Update README + any handoff docs that mention the old path

```bash
grep -rln "source-lab/sources" .
# fix every match (likely README.md, possibly docs/handoffs/*.md)
```

The handoff docs I just shipped (`CODEX_NOW.md`, `CODEX_TABS.md`, `CODEX_PROMPT_30APP_INSTALL.md`) reference `vendor/` as a placeholder — update those to `apps/external/` for consistency.

---

## Acceptance criteria

- `apps/external/<category>/<app>/` exists for every app that was previously in `source-lab/sources/<category>/<app>/`
- `git -C apps/external/slicers/PrusaSlicer rev-parse HEAD` returns the same SHA Codex recorded earlier (`c47697d...`)
- `source-lab/sources/` no longer exists (or is empty)
- `curl http://127.0.0.1:18081/api/source_os/modules` returns JSON where every `local_path` starts with `apps/external/`
- GUI Action Window for PrusaSlicer shows `apps/external/slicers/PrusaSlicer` as its Local path
- `.gitignore` excludes `apps/external/` (not `source-lab/sources/`)
- `npm test` (if any in apps/web/) and `python -m py_compile apps/api/hermes3d_api/main.py` both pass
- **No file in the working tree references `source-lab/sources` anywhere** (`grep -rln source-lab/sources` returns nothing under tracked files)

---

## What this PR explicitly does NOT do

- Doesn't rename the manifest itself (`source-lab/source_manifest.json` stays put)
- Doesn't rename the installer script (`source-lab/download-open-source.ps1` stays put — defer to a follow-up if user wants `scripts/`)
- Doesn't change the registry contents (which apps are listed, their categories, designations)
- Doesn't trigger any new installs — just relocates existing clones

Those are separate, smaller PRs if the user wants them. Keep this PR mechanical so review is fast.

---

## Lane fence

- Don't touch `apps/web/styles.css` (Claude's font system lives there)
- Don't touch `apps/web/action-window.js` if it exists yet (Claude's universal renderer)
- Coordinate `apps/web/source-os.js` and `apps/api/hermes3d_api/main.py` via HermesProof lock — Claude may be editing them concurrently for unrelated reasons

---

## After merge

Update the queue:
- Mark `HP3D-VENDOR-APPS-CONSOLIDATE-2026-05-03` resolved in any tracking docs
- Future install PRs (Wave 1, Wave 2 from `CODEX_PROMPT_30APP_INSTALL.md`) target `apps/external/<cat>/<app>/` directly — no path-string updates needed in those PRs

Standing by.
