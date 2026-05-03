const SOURCE_GROUP_LABELS = {
  slicers: "Slicers",
  modelers: "Modelers",
  print_farm: "Print Farm",
  firmware: "Firmware",
  generation: "3D Generation",
  orchestration: "Agents",
  libraries: "Library",
  materials: "Materials",
  hardware: "Hardware",
  utilities: "Utilities",
  research: "Research",
};

const SOURCE_PIPELINES = {
  slicers: ["import", "profile lock", "slice dry-run", "preview", "G-code QA", "approval", "upload-only"],
  modelers: ["brief", "source CAD", "execute", "preview", "repair", "export", "model gate"],
  print_farm: ["scan", "connect", "telemetry", "queue", "observe", "pause policy", "report"],
  firmware: ["identify board", "map commands", "safety gate", "status model", "profile link", "do-not-probe check"],
  generation: ["photo", "vision", "3D engine", "mesh repair", "printability gate", "slice proof", "evidence"],
  orchestration: ["agent", "permission", "gate", "tool call", "evidence", "voice", "operator handoff"],
  libraries: ["import", "tag", "version", "preview", "reuse", "3MF contract", "archive"],
  materials: ["spool", "material", "profile", "slicer map", "test coupon", "measurement", "approve"],
  hardware: ["research", "fit check", "risk gate", "mod plan", "operator approval", "archive"],
  utilities: ["template", "parameters", "preview", "export", "slice", "evidence"],
  research: ["index", "score", "summarize", "ticket", "prototype", "promote", "audit"],
};

const SOURCE_FLOW_LANES = {
  slicers: [
    ["Profile Contract", "vendor profile", "Hermes lock", "hash", "printer map"],
    ["Compiler Proof", "STL/3MF", "slice", "preview", "G-code report"],
    ["Dispatch Guard", "approval", "upload-only", "operator check", "start gate"],
  ],
  modelers: [
    ["CAD Agent", "brief", "script", "execute", "revise"],
    ["Geometry QA", "bounds", "volume", "manifold", "repair"],
    ["Package", "STEP/STL", "3MF", "preview", "approval"],
  ],
  print_farm: [
    ["Fleet State", "scan", "connect", "temperature", "queue"],
    ["Camera Loop", "stream", "snapshot", "first layer", "alert"],
    ["Job Control", "upload", "human check", "start", "monitor"],
  ],
  firmware: [
    ["Firmware Map", "board", "flavor", "commands", "limits"],
    ["Safety", "lock", "blocked G-code", "probe policy", "operator gate"],
    ["Profiles", "machine", "bed", "nozzle", "slicer link"],
  ],
  generation: [
    ["Image To Mesh", "source", "vision", "engine", "candidate"],
    ["Repair", "scale", "watertight", "bounds", "mesh proof"],
    ["Printability", "slicer", "G-code QA", "approval", "evidence"],
  ],
  orchestration: [
    ["Agent Loop", "intent", "plan", "tool call", "result"],
    ["Permissions", "scope", "gate", "approval", "handoff"],
    ["Ledger", "event", "artifact", "summary", "audit"],
  ],
  libraries: [
    ["Catalog", "import", "tag", "license", "version"],
    ["Reuse", "preview", "variant", "fit", "package"],
    ["Contract", "3MF", "profile", "material", "evidence"],
  ],
  materials: [
    ["Spool", "material", "lot", "remaining", "dry state"],
    ["Calibration", "coupon", "measure", "profile", "expiry"],
    ["Compatibility", "nozzle", "temperature", "flow", "approval"],
  ],
  hardware: [
    ["Mod Plan", "research", "fit", "risk", "approval"],
    ["Install", "steps", "photos", "rollback", "ledger"],
    ["Safety", "lock", "test scope", "operator", "archive"],
  ],
  utilities: [
    ["Template", "params", "preview", "export", "slice"],
    ["Evidence", "image", "diagram", "hash", "report"],
    ["Promotion", "review", "ticket", "merge", "release"],
  ],
  research: [
    ["Watch", "source", "score", "summary", "ticket"],
    ["Prototype", "bench", "risk", "demo", "promote"],
    ["Audit", "claim", "evidence", "drift", "fix queue"],
  ],
};

const SOURCE_PREFERRED_ORDER = {
  slicers: [
    "PrusaSlicer",
    "OrcaSlicer",
    "FLSUN Slicer",
    "UltiMaker Cura",
    "CuraEngine",
    "SuperSlicer",
    "Slic3r",
    "BambuStudio",
    "MatterControl",
    "Kiri:Moto / GridSpace",
    "Strecs3D",
  ],
  modelers: ["Blender", "FreeCAD", "CadQuery", "OpenSCAD", "build123d", "Trimesh", "Manifold", "MeshLab", "SolveSpace", "Truck"],
  print_farm: ["Moonraker", "Klipper", "FDM Monster", "Fluidd", "Mainsail", "OctoPrint", "Printrun / Pronterface", "OctoFarm", "KlipperScreen", "BotQueue"],
  generation: ["ComfyUI", "ComfyUI Frontend", "TRELLIS.2", "ComfyUI-Trellis2", "Hunyuan3D-2.1", "TripoSR"],
};

const sourceState = {
  manifest: null,
  sourceAppsStatus: null,
  groupKey: "slicers",
  selectedIndex: 0,
  layout: localStorage.getItem("hermes3d.sourceLayout") || "wide",
};

loadSourceManifest();

async function loadSourceManifest() {
  try {
    const response = await fetch("/static/source_manifest.json?v=20260428-source", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    sourceState.manifest = await response.json();
    sourceState.groupKey = firstSourceGroup();
    renderSourceOs();
    loadSourceAppsStatus();
  } catch (error) {
    setSourceHtml(
      "#sourceModuleList",
      `<div class="empty-state">Source manifest could not load: ${sourceEscape(error.message)}</div>`,
    );
    setSourceHtml("#sourceDownloadState", "Source manifest unavailable");
  }
}

async function loadSourceAppsStatus() {
  try {
    const response = await fetch("/api/source-apps/status", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    sourceState.sourceAppsStatus = await response.json();
    renderSourceModuleList();
    renderSourceModuleDetails();
  } catch (error) {
    sourceState.sourceAppsStatus = {
      error: error.message,
      apps: [],
    };
    renderSourceModuleDetails();
  }
}

function firstSourceGroup() {
  const groups = sourceGroups();
  return groups.includes("slicers") ? "slicers" : groups[0] || "";
}

function sourceGroups() {
  return Object.keys(sourceState.manifest?.groups || {});
}

function currentSourceGroup() {
  const modules = sourceState.manifest?.groups?.[sourceState.groupKey] || [];
  return [...modules].sort((left, right) => sourcePreferredRank(left) - sourcePreferredRank(right));
}

function currentSourceModule() {
  return currentSourceGroup()[sourceState.selectedIndex] || null;
}

function renderSourceOs() {
  if (!sourceState.manifest) {
    return;
  }
  const root = document.querySelector("#sourceOs");
  if (root) {
    root.dataset.sourceLayout = sourceState.layout;
  }
  renderSourceLayoutControls();
  renderSourceGroupTabs();
  renderSourceMix();
  renderSourceModuleList();
  renderSourceModuleDetails();
}

function renderSourceLayoutControls() {
  const options = [
    ["dock", "Dock"],
    ["wide", "Wide"],
    ["full", "Full"],
  ];
  setSourceHtml(
    "#sourceLayoutControls",
    options
      .map(
        ([value, label]) =>
          `<button class="${sourceState.layout === value ? "active" : ""}" type="button" data-source-layout="${value}">${label}</button>`,
      )
      .join(""),
  );
}

function renderSourceGroupTabs() {
  const groups = sourceGroups();
  setSourceHtml(
    "#sourceGroupTabs",
    groups
      .map(
        (group) =>
          `<button class="${group === sourceState.groupKey ? "active" : ""}" type="button" data-source-group="${sourceEscapeAttr(group)}">${sourceEscape(sourceGroupLabel(group))}</button>`,
      )
      .join(""),
  );
}

function renderSourceMix() {
  const groups = sourceGroups();
  const total = allSourceModules().length;
  const unique = new Set(allSourceModules().map(localSourcePath)).size;
  setSourceHtml("#sourceInventoryCount", `${total} modules`);
  setSourceHtml(
    "#sourceMix",
    groups
      .map(
        (group) =>
          `<button type="button" data-source-group="${sourceEscapeAttr(group)}">${sourceEscape(sourceGroupLabel(group))}</button>`,
      )
      .join(""),
  );
  setSourceHtml("#sourceDownloadState", `${total} source modules / ${unique} local source checkouts`);
}

function renderSourceModuleList() {
  const modules = currentSourceGroup();
  const countLabel = `${modules.length} ${modules.length === 1 ? "module" : "modules"}`;
  setSourceHtml("#sourceGroupTitle", sourceGroupLabel(sourceState.groupKey));
  setSourceHtml("#sourceGroupCount", countLabel);
  setSourceHtml(
    "#sourceModuleList",
    modules
      .map((module, index) => {
        const status = sourceAppStatus(module);
        const mode = checkoutMode(status);
        return `
          <button class="source-module-card ${index === sourceState.selectedIndex ? "active" : ""} ${sourceEscapeAttr(module.priority || "")}" type="button" data-source-index="${index}">
            <b>${sourceEscape(module.name)}</b><i>${sourceEscape(module.priority || "candidate")}</i>
            <span>${sourceEscape(module.uxSection || "Hermes3D module")}</span><span>${sourceEscape(module.license || "unknown")}</span>
            <em class="${sourceEscapeAttr(mode)}">${sourceEscape(mode)}</em><span>${status.launch_available ? "launchable" : "source only"}</span>
          </button>
        `;
      })
      .join(""),
  );
}

function renderSourceModuleDetails() {
  const module = currentSourceModule();
  if (!module) {
    return;
  }
  const bridge = module.bridge || [];
  const pipeline = SOURCE_PIPELINES[sourceState.groupKey] || ["source", "bridge", "setup", "test", "promote"];
  const lanes = SOURCE_FLOW_LANES[sourceState.groupKey] || [
    ["Bridge", "source", "adapter", "dry-run", "promote"],
    ["Evidence", "artifact", "preview", "approval", "ledger"],
    ["Operator", "review", "gate", "handoff", "release"],
  ];
  const appStatus = sourceAppStatus(module);
  setSourceHtml("#sourceModuleName", module.name);
  setSourceHtml("#sourceModuleRole", module.priority || "candidate");
  setSourceHtml("#sourceRepoCell", module.repo || "user-provided source/profile");
  setSourceHtml("#sourceLocalCell", localSourcePath(module));
  setSourceHtml("#sourceLicenseCell", module.license || "unknown");
  setSourceHtml("#sourcePriorityCell", module.priority || "candidate");
  setSourceHtml("#sourceSectionCell", module.uxSection || "Hermes3D module");
  setSourceHtml("#sourceStatusCell", sourceStatus(module));
  setSourceHtml("#sourceTaskCount", `${bridge.length} ${bridge.length === 1 ? "task" : "tasks"}`);
  setSourceHtml("#sourceBridgeTasks", bridge.map((task) => `<li>${sourceEscape(task)}</li>`).join(""));
  updateSourceActionButtons(module, appStatus);
  setSourceHtml("#sourceViewport", renderSourceViewport(module, bridge, pipeline, lanes));
}

function renderSourceViewport(module, bridge, pipeline, lanes) {
  return renderSourceBridgeWorkbench(module, bridge, pipeline, lanes);
}

function renderSourceBridgeWorkbench(module, bridge, pipeline, lanes) {
  const appStatus = sourceAppStatus(module);
  const mode = checkoutMode(appStatus);
  return `
    <div class="source-app-hostbar">
      <strong>${sourceEscape(module.name)} source bridge</strong>
      <span class="${appStatus.source_exists ? "ok" : "warn"}">${appStatus.source_exists ? "source present" : "source missing"}</span>
      <span class="${mode === "full" ? "ok" : "warn"}">${sourceEscape(mode)} checkout</span>
      <span class="${appStatus.installed_executable ? "ok" : "warn"}">${appStatus.installed_executable ? "native app detected" : "native app not detected"}</span>
      <span>CLI ${appStatus.cli_executable ? "ready" : "pending"}</span>
    </div>
    <div class="source-real-workbench">
      <section class="source-workbench-hero">
        <div>
          <strong>${sourceEscape(module.name)}</strong>
          <span>${sourceEscape(module.uxSection || sourceGroupLabel(sourceState.groupKey))}</span>
        </div>
        <div class="source-state-stack">
          <b>${appStatus.source_exists ? "CHECKOUT" : "MISSING"}</b>
          <small>${sourceEscape(appStatus.source_head || "no git head")}</small>
        </div>
      </section>
      <section class="source-action-grid">
        ${sourceActionCard("Upstream", module.repo || "No upstream repo configured", "Opens the GitHub/source repository in a new browser tab.")}
        ${sourceActionCard("Local Source", appStatus.source_path || localSourcePath(module), appStatus.source_exists ? "Opens the real local checkout folder." : "Checkout is missing; run the source downloader.")}
        ${sourceActionCard("Executable", appStatus.installed_executable || "No installed executable detected", appStatus.launch_available ? "Launch button will start the installed native app." : "Configure an executable path or install/build the tool.")}
        ${sourceActionCard("Checkout Mode", `${mode}${appStatus.source_branch ? ` / ${appStatus.source_branch}` : ""}`, mode === "full" ? "Full working tree is available." : "Sparse checkout: useful files only, not full repo.")}
      </section>
      <section class="source-file-strip">
        <strong>Source highlights</strong>
        <div>
          ${(appStatus.source_highlights || []).map((item) => `<span>${sourceEscape(item)}</span>`).join("") || "<span>No source files visible yet</span>"}
        </div>
      </section>
      <section class="source-bridge-notice">
        <strong>Native UI status</strong>
        <span>Hermes3D is not embedding ${sourceEscape(module.name)} inside this browser. Source OS opens the true checkout, detects installed executables, and launches the native app when available.</span>
      </section>
    </div>
    ${renderSourcePipelineBar(bridge, pipeline, lanes)}
  `;
}

function sourceActionCard(title, value, detail) {
  return `
    <article>
      <strong>${sourceEscape(title)}</strong>
      <span>${sourceEscape(value || "Not configured")}</span>
      <small>${sourceEscape(detail || "")}</small>
    </article>
  `;
}

function updateSourceActionButtons(module, appStatus) {
  const repoButton = document.querySelector("#sourceOpenRepo");
  const sourceButton = document.querySelector("#sourceOpenLocal");
  const launchButton = document.querySelector("#sourceLaunchApp");
  if (repoButton) {
    repoButton.disabled = !module.repo;
  }
  if (sourceButton) {
    sourceButton.disabled = !appStatus.open_source_available;
  }
  if (launchButton) {
    launchButton.disabled = !appStatus.launch_available;
  }
}

function checkoutMode(appStatus) {
  if (!appStatus.source_exists) {
    return "missing";
  }
  if (appStatus.checkout_mode) {
    return appStatus.checkout_mode;
  }
  return appStatus.source_has_git ? "git" : "folder";
}

function renderSourcePipelineBar(bridge, pipeline, lanes) {
  return `
    <div class="source-pipeline-board">
      <div class="source-timeline">
        ${pipeline.map((step, index) => `<span class="${index < 3 ? "done" : ""}">${sourceEscape(step)}</span>`).join("")}
        ${bridge.slice(0, 2).map((task) => `<span>${sourceEscape(task)}</span>`).join("")}
      </div>
      ${renderSourceFlowSvg(lanes)}
      <div class="source-flow-lanes">
        ${lanes
          .map(
            ([label, ...steps]) => `
              <article>
                <strong>${sourceEscape(label)}</strong>
                <span>${steps.map(sourceEscape).join(" -> ")}</span>
              </article>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderSourceFlowSvg(lanes) {
  const safeLanes = lanes.slice(0, 4);
  const height = 46 + safeLanes.length * 50;
  const nodeXs = [128, 222, 316, 398];
  return `
    <svg class="source-flow-svg" viewBox="0 0 440 ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Source pipeline flow">
      <defs>
        <linearGradient id="sourceFlowLine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#58a6ff" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#4dd799" stop-opacity="0.85" />
        </linearGradient>
      </defs>
      ${safeLanes
        .map(([label, ...steps], laneIndex) => {
          const y = 38 + laneIndex * 50;
          const safeSteps = steps.slice(0, 4);
          return `
            <text class="source-flow-label" x="16" y="${y}">${sourceEscape(label)}</text>
            <path d="M 110 ${y} H 420" />
            ${safeSteps
              .map((step, stepIndex) => {
                const x = nodeXs[stepIndex] || nodeXs[nodeXs.length - 1];
                return `
                  <g>
                    <rect x="${x - 39}" y="${y - 16}" width="78" height="32" rx="7" />
                    <text x="${x}" y="${y}">${sourceEscape(step)}</text>
                  </g>
                `;
              })
              .join("")}
          `;
        })
        .join("")}
    </svg>
  `;
}

function allSourceModules() {
  return Object.values(sourceState.manifest?.groups || {}).flat();
}

function sourceAppStatus(module) {
  const empty = {
    source_exists: false,
    installed_executable: "",
    cli_executable: "",
  };
  const apps = sourceState.sourceAppsStatus?.apps || [];
  return apps.find((item) => item.id === module.id || item.name === module.name) || empty;
}

function sourcePreferredRank(module) {
  const order = SOURCE_PREFERRED_ORDER[sourceState.groupKey] || [];
  const rank = order.indexOf(module.name);
  return rank === -1 ? order.length + 100 : rank;
}

function sourceGroupLabel(group) {
  return SOURCE_GROUP_LABELS[group] || labelizeSource(group);
}

function localSourcePath(module) {
  if (!module.target) {
    return "source-lab/sources";
  }
  return `${sourceState.manifest?.sourceRoot || "source-lab/sources"}/${module.target}`.replaceAll("\\", "/");
}

function sourceStatus(module) {
  const status = sourceAppStatus(module);
  if (!module.repo) {
    return "needs user source/profile";
  }
  if (status.source_exists && status.installed_executable) {
    return `${checkoutMode(status)} source / native app detected`;
  }
  if (status.source_exists) {
    return `${checkoutMode(status)} source / executable not detected`;
  }
  if (module.priority === "catalog") {
    return "catalog source downloaded";
  }
  if (module.priority === "reference" || module.priority === "research" || module.priority === "future") {
    return "reference source downloaded";
  }
  return "source downloaded / bridge planned";
}

async function sourcePost(path) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || response.statusText);
  }
  return response.json();
}

function setSourceStatus(message) {
  setSourceHtml("#sourceDownloadState", sourceEscape(message));
}

function setSourceGroup(group) {
  if (!sourceState.manifest?.groups?.[group]) {
    return;
  }
  sourceState.groupKey = group;
  sourceState.selectedIndex = 0;
  renderSourceOs();
}

function labelizeSource(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function setSourceHtml(selector, html) {
  const target = document.querySelector(selector);
  if (target) {
    target.innerHTML = html;
  }
}

function sourceEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sourceEscapeAttr(value) {
  return sourceEscape(value).replaceAll("`", "&#96;");
}

document.addEventListener("click", async (event) => {
  const groupButton = event.target.closest("button[data-source-group]");
  if (groupButton) {
    setSourceGroup(groupButton.dataset.sourceGroup);
    return;
  }

  const layoutButton = event.target.closest("button[data-source-layout]");
  if (layoutButton) {
    sourceState.layout = layoutButton.dataset.sourceLayout;
    localStorage.setItem("hermes3d.sourceLayout", sourceState.layout);
    renderSourceOs();
    return;
  }

  const moduleButton = event.target.closest("button[data-source-index]");
  if (moduleButton) {
    sourceState.selectedIndex = Number(moduleButton.dataset.sourceIndex);
    renderSourceOs();
    return;
  }

  const bridgeButton = event.target.closest("#sourceBridgePlan");
  if (bridgeButton) {
    const module = currentSourceModule();
    if (module) {
      const tasks = (module.bridge || []).join("; ");
      setSourceStatus(`${module.name}: bridge tasks visible and sourced from manifest: ${tasks || "none"}`);
    }
    return;
  }

  const setupButton = event.target.closest("#sourceSetupPlan");
  if (setupButton) {
    const module = currentSourceModule();
    if (module) {
      const status = sourceAppStatus(module);
      if (!status.source_exists) {
        setSourceStatus(`${module.name}: source missing. Run source-lab/download-open-source.ps1 -Only ${module.id}`);
      } else if (checkoutMode(status) === "sparse") {
        setSourceStatus(`${module.name}: sparse checkout. Run source-lab/download-open-source.ps1 -Only ${module.id} -FullCheckout for the full working tree.`);
      } else if (!status.launch_available) {
        setSourceStatus(`${module.name}: source is present; no native executable detected. Configure/install/build the app before Launch can run.`);
      } else {
        setSourceStatus(`${module.name}: ready. Source opens the checkout; Launch starts ${status.installed_executable}.`);
      }
    }
    return;
  }

  const repoButton = event.target.closest("#sourceOpenRepo");
  if (repoButton) {
    const module = currentSourceModule();
    if (module?.repo) {
      window.open(module.repo, "_blank", "noopener,noreferrer");
      setSourceStatus(`${module.name}: opened upstream repository ${module.repo}`);
    }
    return;
  }

  const localButton = event.target.closest("#sourceOpenLocal");
  if (localButton) {
    const module = currentSourceModule();
    if (module) {
      localButton.disabled = true;
      try {
        const result = await sourcePost(`/api/source-apps/${encodeURIComponent(module.id)}/open-source`);
        setSourceStatus(`${result.name}: opened local source checkout ${result.source_path}`);
      } catch (error) {
        setSourceStatus(`${module.name}: ${error.message}`);
      } finally {
        updateSourceActionButtons(module, sourceAppStatus(module));
      }
    }
    return;
  }

  const launchButton = event.target.closest("#sourceLaunchApp");
  if (launchButton) {
    const module = currentSourceModule();
    if (module) {
      launchButton.disabled = true;
      try {
        const result = await sourcePost(`/api/source-apps/${encodeURIComponent(module.id)}/launch`);
        setSourceStatus(`${result.name}: launched native application ${result.executable}`);
      } catch (error) {
        setSourceStatus(`${module.name}: ${error.message}`);
      } finally {
        updateSourceActionButtons(module, sourceAppStatus(module));
      }
    }
    return;
  }

  const refreshButton = event.target.closest("#sourceRefresh");
  if (refreshButton) {
    refreshButton.disabled = true;
    try {
      await loadSourceAppsStatus();
      setSourceStatus("Source app status refreshed from backend.");
    } catch (error) {
      setSourceStatus(`Source status refresh failed: ${error.message}`);
    } finally {
      refreshButton.disabled = false;
    }
  }
});
