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
  slicers: ["import", "profile", "slice dry-run", "preview", "upload"],
  modelers: ["script/model", "preview", "repair", "export", "truth gate"],
  print_farm: ["scan", "connect", "telemetry", "queue", "observe"],
  firmware: ["identify board", "map commands", "safety gate", "status model", "profile link"],
  generation: ["photo", "vision", "3D engine", "repair", "slice proof"],
  orchestration: ["agent", "gate", "tool call", "evidence", "voice"],
  libraries: ["import", "tag", "version", "preview", "reuse"],
  materials: ["material", "profile", "slicer map", "test coupon", "approve"],
  hardware: ["research", "fit check", "risk gate", "mod plan", "archive"],
  utilities: ["template", "parameters", "preview", "export", "slice"],
  research: ["index", "score", "cherry-pick", "prototype", "promote"],
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
      .map(
        (module, index) => `
          <button class="source-module-card ${index === sourceState.selectedIndex ? "active" : ""} ${sourceEscapeAttr(module.priority || "")}" type="button" data-source-index="${index}">
            <b>${sourceEscape(module.name)}</b><i>${sourceEscape(module.priority || "candidate")}</i>
            <span>${sourceEscape(module.uxSection || "Hermes3D module")}</span><span>${sourceEscape(module.license || "unknown")}</span>
          </button>
        `,
      )
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
  setSourceHtml("#sourceViewport", renderSourceViewport(module, bridge, pipeline));
}

function renderSourceViewport(module, bridge, pipeline) {
  if (sourceState.groupKey === "slicers") {
    return renderSlicerViewport(module, bridge, pipeline);
  }
  return renderGenericSourceViewport(module, bridge, pipeline);
}

function renderSlicerViewport(module, bridge, pipeline) {
  const slicer = slicerUiProfile(module);
  const appStatus = sourceAppStatus(module);
  return `
    <div class="source-app-hostbar">
      <strong>${sourceEscape(module.name)} app host</strong>
      <span class="${appStatus.source_exists ? "ok" : "warn"}">source ${appStatus.source_exists ? "ready" : "missing"}</span>
      <span class="${appStatus.installed_executable ? "ok" : "warn"}">app ${appStatus.installed_executable ? "detected" : "not built/installed"}</span>
      <span>CLI ${appStatus.cli_executable ? "ready" : "pending"}</span>
      <button type="button" data-source-layout="wide">wide</button>
      <button type="button" data-source-layout="full">maximize</button>
    </div>
    <div class="source-native-window source-slicer-window">
      <div class="source-native-title">
        <span class="source-app-dot"></span>
        <strong>*Untitled - ${sourceEscape(slicer.title)}</strong>
        <span class="source-window-controls"><button type="button" data-source-layout="dock">-</button><button type="button" data-source-layout="full">□</button><button type="button">×</button></span>
      </div>
      <div class="source-native-menu">
        <span>File</span><span>Edit</span><span>Window</span><span>View</span><span>Configuration</span><span>Help</span>
      </div>
      <div class="source-slicer-tabs">
        ${["Plater", "Print Settings", "Filaments", "Printers", "Printables"].map((tab, index) => `<button class="${index === 0 ? "active" : ""}" type="button">${tab}</button>`).join("")}
        <input aria-label="Search ${sourceEscapeAttr(slicer.title)}" value="${sourceEscapeAttr(slicer.search)}" readonly />
        <span class="source-expert-chip">⬢ Expert mode</span>
      </div>
      <div class="source-slicer-shell">
        <aside class="source-tool-strip">
          ${["□+", "↔", "⌫", "▦", "⧉", "○", "↶", "↷"].map((icon) => `<button type="button">${icon}</button>`).join("")}
        </aside>
        <section class="source-slicer-plate">
          <div class="source-perspective-bed">
            <span>${sourceEscape(slicer.bed)}</span>
            <i class="axis-red"></i>
            <i class="axis-green"></i>
            <i class="axis-blue"></i>
          </div>
          <div class="source-view-cube">□</div>
          <div class="source-layer-toggle">▣<br />▤</div>
        </section>
        <aside class="source-slicer-settings">
          ${sourceSlicerSelect("Print settings", slicer.printSettings)}
          ${sourceSlicerSelect("Filament", slicer.filament)}
          ${sourceSlicerSelect("Printer", slicer.printer)}
          ${sourceSlicerSelect("Supports", slicer.supports)}
          <div class="source-compact-row">
            <label>Infill <select><option>${sourceEscape(slicer.infill)}</option></select></label>
            <label>Brim <input type="checkbox" /></label>
          </div>
          <div class="source-object-list">
            <div><span>Name</span><span>Editing</span></div>
            <button type="button">${sourceEscape(slicer.object)}</button>
          </div>
          <button class="source-slice-now" type="button">Slice now</button>
        </aside>
      </div>
    </div>
    ${renderSourcePipelineBar(bridge, pipeline)}
  `;
}

function sourceSlicerSelect(label, value) {
  return `
    <label class="source-slicer-select">
      <span>${sourceEscape(label)}:</span>
      <select>
        <option>${sourceEscape(value)}</option>
      </select>
    </label>
  `;
}

function slicerUiProfile(module) {
  const name = module.name || "Slicer";
  const profiles = {
    PrusaSlicer: {
      title: "PrusaSlicer 2.9 source bridge",
      search: "Enter a search term",
      printSettings: "0.30mm QUALITY",
      filament: "Prusament PLA",
      printer: "FLSUN T1 / V400 profile target",
      supports: "None",
      infill: "15%",
      bed: "FLSUN / PRUSA PLATER",
      object: "bracket.stl",
    },
    OrcaSlicer: {
      title: "OrcaSlicer source bridge",
      search: "Calibration, profile, device",
      printSettings: "0.20mm QUALITY",
      filament: "PLA profile",
      printer: "FLSUN T1 Klipper target",
      supports: "Tree / Auto",
      infill: "15%",
      bed: "ORCA CALIBRATION PLATER",
      object: "calibration.3mf",
    },
    "FLSUN Slicer": {
      title: "FLSUN Slicer profile bridge",
      search: "T1 / V400 vendor profile",
      printSettings: "FLSUN T1 PLA",
      filament: "FLSUN PLA",
      printer: "FLSUN T1 / V400",
      supports: "None",
      infill: "15%",
      bed: "FLSUN DELTA PLATER",
      object: "vendor-profile.stl",
    },
    "UltiMaker Cura": {
      title: "UltiMaker Cura plugin bridge",
      search: "Machine definition",
      printSettings: "Standard Quality",
      filament: "Generic PLA",
      printer: "FLSUN / Creality profile",
      supports: "Generate Supports Off",
      infill: "20%",
      bed: "CURA BUILD PLATE",
      object: "cura-import.stl",
    },
    Cura: {
      title: "Cura plugin bridge",
      search: "Machine definition",
      printSettings: "Standard Quality",
      filament: "Generic PLA",
      printer: "FLSUN / Creality profile",
      supports: "Generate Supports Off",
      infill: "20%",
      bed: "CURA BUILD PLATE",
      object: "cura-import.stl",
    },
    CuraEngine: {
      title: "CuraEngine headless worker",
      search: "CLI profile",
      printSettings: "engine dry-run",
      filament: "material json",
      printer: "machine definition",
      supports: "profile driven",
      infill: "20%",
      bed: "CURAENGINE DRY-RUN",
      object: "engine-output.gcode",
    },
  };
  return profiles[name] || {
    title: `${name} source bridge`,
    search: "profile / import / preview",
    printSettings: "default profile",
    filament: "PLA",
    printer: "Hermes printer target",
    supports: "Profile default",
    infill: "15%",
    bed: `${name} PLATER`,
    object: "candidate.3mf",
  };
}

function renderGenericSourceViewport(module, bridge, pipeline) {
  return `
    <div class="source-plate">
      <div class="source-part">
        <span>${sourceEscape(module.name)}</span>
      </div>
      <div class="source-tool-flags">
        ${bridge
          .slice(0, 4)
          .map((task, index) => `<span class="${index === 0 ? "primary" : ""}">${sourceEscape(task)}</span>`)
          .join("")}
      </div>
    </div>
    ${renderSourcePipelineBar(bridge, pipeline)}
  `;
}

function renderSourcePipelineBar(bridge, pipeline) {
  return `
    <div class="source-timeline">
      ${pipeline.map((step, index) => `<span class="${index < 2 ? "done" : ""}">${sourceEscape(step)}</span>`).join("")}
      ${bridge.slice(0, 2).map((task) => `<span>${sourceEscape(task)}</span>`).join("")}
    </div>
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
    install_method: module.install?.method || null,
    install_status: "not_installed",
    install_state: { status: "not_installed", log_tail: [] },
  };
  const apps = sourceState.sourceAppsStatus?.apps || [];
  const status = apps.find((item) => item.id === module.id || item.name === module.name) || empty;
  return {
    ...status,
    install_method: status.install_method || module.install?.method || null,
    install_state: status.install_state || empty.install_state,
  };
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
  const status = sourceAppStatus(module);
  if (status.source_path) {
    return status.source_path.replaceAll("\\", "/");
  }
  return `${sourceState.manifest?.sourceRoot || "source-lab/sources"}/${module.target}`.replaceAll("\\", "/");
}

function sourceStatus(module) {
  if (!module.repo) {
    return "needs user source/profile";
  }
  if (sourceState.groupKey === "slicers") {
    const status = sourceAppStatus(module);
    if (status.source_exists && status.installed_executable) {
      return "source ready / installed app detected";
    }
    if (status.source_exists) {
      return "source checkout ready / native app bridge required";
    }
  }
  if (module.priority === "catalog") {
    return "catalog source downloaded";
  }
  if (module.priority === "reference" || module.priority === "research" || module.priority === "future") {
    return "reference source downloaded";
  }
  return "source downloaded / bridge planned";
}

function dispatchSourceModuleToActionWindow() {
  const module = currentSourceModule();
  if (!module) return;
  const status = sourceAppStatus(module);
  const installStatus = status.install_status || "not_installed";
  const installMethod = status.install_method || null;
  const installToneMap = { installed: "ok", installing: "info", failed: "err" };
  const processStatus = status.process_state?.status || (status.process_state?.running ? "running" : "stopped");
  const serviceUrl = status.service_url || "";
  const tone = processStatus === "running" ? "ok" : installToneMap[installStatus]
    || (status.installed_executable ? "ok" : (status.source_exists ? "info" : "warn"));
  const pillText = processStatus === "running"
    ? "running"
    : installStatus !== "not_installed"
    ? installStatus
    : status.installed_executable
      ? "installed"
      : status.source_exists
        ? "source ready"
        : "not installed";
  const primary = [];
  const launchUrl = status.launch_url || status.process_state?.url || module.install?.static_url || "";
  if (installMethod) {
    primary.push({ id: "install-app", label: installStatus === "installing" ? "Installing…" : "Install", endpoint: `/api/source-apps/${module.id}/install`, method: "POST" });
  }
  if (status.launch_supported) {
    primary.push({ id: "launch-app", label: launchUrl && status.process_state?.running ? "Open" : "Launch", endpoint: `/api/source-apps/${module.id}/launch`, method: "POST" });
  }
  if (status.process_state?.kind === "managed-process") {
    primary.push({ id: "stop-app", label: "Stop", endpoint: `/api/source-apps/${module.id}/stop`, method: "POST" });
  }
  primary.push({ id: "open-repo", label: "Open Repo", endpoint: module.repo, method: "GET" });
  if (serviceUrl) {
    primary.push({ id: "open-browser", label: "Open Browser", endpoint: serviceUrl, method: "GET" });
  }
  const logTail = status.install_state?.log_tail || [];
  const installNote = module.install?.note || "Local open-source install; no cloud service required.";
  const launcherText = module.id === "triposr"
    ? "N/A; TripoSR is prepared as a local research module and probed through its Python setup."
    : status.launch_supported
      ? launchUrl
        ? `${status.process_state?.running ? "running" : "ready"} at ${launchUrl}`
        : `${status.launch_status || "stopped"}${status.launch_pid ? ` pid ${status.launch_pid}` : ""}`
      : "Native or service launch wiring depends on this app's adapter.";
  const triposrPanels = module.id === "triposr"
    ? [
        {
          id: "install",
          label: "Install",
          body_html: `
            <ul style="margin:0;padding-left:1.1rem;line-height:1.55;">
              <li><b>Target:</b> ${localSourcePath(module)}</li>
              <li><b>Method:</b> ${installMethod || "none"}</li>
              <li><b>Status:</b> ${installStatus}</li>
              <li><b>Note:</b> ${sourceEscape(installNote)}</li>
            </ul>
            ${logTail.length ? `<pre style="white-space:pre-wrap;margin:.75rem 0 0;">${sourceEscape(logTail.join("\n"))}</pre>` : ""}`,
        },
        {
          id: "readme",
          label: "README",
          body_html: `
            <p style="margin:0;line-height:1.55;">TripoSR is the MIT-licensed VAST-AI-Research single-image 3D reconstruction codebase. Hermes installs it locally as source plus a Python venv, then probes the runnable scripts without starting a cloud service.</p>`,
        },
        {
          id: "license",
          label: "License",
          body_html: `<p style="margin:0;line-height:1.55;">${sourceEscape(module.license || "unknown")}</p>`,
        },
      ]
    : [];
  const payload = {
    tab_id: "sources",
    kind: "app",
    item_id: module.id,
    title: module.name,
    subtitle: module.uxSection || "Hermes3D module",
    status_pill: { text: pillText, tone },
    primary_actions: primary,
    secondary_actions: [
      { id: "open-local", label: "Open Local", endpoint: localSourcePath(module) },
    ],
    panels: [
      {
        id: "facts",
        label: "Facts",
        body_html: `
          <ul style="margin:0;padding-left:1.1rem;line-height:1.55;">
            <li><b>Repo:</b> ${module.repo || "user-provided"}</li>
            <li><b>License:</b> ${module.license || "unknown"}</li>
            <li><b>Priority:</b> ${module.priority || "candidate"}</li>
            <li><b>Section:</b> ${module.uxSection || "Hermes3D module"}</li>
            <li><b>Install:</b> ${installMethod ? `${installMethod} → ${installStatus}` : "no install block"}</li>
            <li><b>Launcher:</b> ${sourceEscape(launcherText)}</li>
            <li><b>Process:</b> ${sourceEscape(processStatus)}</li>
            <li><b>URL:</b> ${sourceEscape(serviceUrl || launchUrl || "not launched")}</li>
          </ul>`,
      },
      ...triposrPanels,
    ],
  };
  if (window.HermesActionWindow && typeof window.HermesActionWindow.dispatch === "function") {
    window.HermesActionWindow.dispatch(payload);
  } else {
    document.dispatchEvent(new CustomEvent("actionwindow:render", { detail: payload }));
  }
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

document.addEventListener("click", (event) => {
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
    dispatchSourceModuleToActionWindow();
    return;
  }

  const bridgeButton = event.target.closest("#sourceBridgePlan");
  if (bridgeButton) {
    const module = currentSourceModule();
    if (module) {
      setSourceHtml("#sourceDownloadState", `${module.name}: adapter bridge queued for the next implementation pass`);
    }
    return;
  }

  const setupButton = event.target.closest("#sourceSetupPlan");
  if (setupButton) {
    const module = currentSourceModule();
    if (module) {
      setSourceHtml("#sourceDownloadState", `${module.name}: setup requires adapter review before running third-party code`);
    }
    return;
  }

  const repoButton = event.target.closest("#sourceOpenRepo");
  if (repoButton) {
    const module = currentSourceModule();
    if (module) {
      setSourceHtml("#sourceDownloadState", `${module.name}: ${module.repo || localSourcePath(module)}`);
    }
    return;
  }

  const installButton = event.target.closest("#sourceInstallApp");
  if (installButton) {
    const module = currentSourceModule();
    if (module) {
      installSourceModule(module);
    }
    return;
  }

  const launchButton = event.target.closest("#sourceLaunchApp");
  if (launchButton) {
    const module = currentSourceModule();
    if (module) {
      launchSourceModule(module);
    }
    return;
  }

  const awInstallButton = event.target.closest("#actionWindow [data-action-id='install-app']");
  if (awInstallButton) {
    const moduleId = awInstallButton.closest("#actionWindow")?.dataset?.itemId;
    const module = allSourceModules().find((m) => m.id === moduleId);
    if (module) installSourceModule(module);
    return;
  }

  const awLaunchButton = event.target.closest("#actionWindow [data-action-id='launch-app']");
  if (awLaunchButton) {
    const moduleId = awLaunchButton.closest("#actionWindow")?.dataset?.itemId;
    const module = allSourceModules().find((m) => m.id === moduleId);
    if (module) launchSourceModule(module);
    return;
  }

  const awStopButton = event.target.closest("#actionWindow [data-action-id='stop-app']");
  if (awStopButton) {
    const moduleId = awStopButton.closest("#actionWindow")?.dataset?.itemId;
    const module = allSourceModules().find((m) => m.id === moduleId);
    if (module) runSourceProcessAction(module, "stop");
    return;
  }

  const awOpenBrowserButton = event.target.closest("#actionWindow [data-action-id='open-browser']");
  if (awOpenBrowserButton) {
    const url = awOpenBrowserButton.dataset.endpoint;
    if (url) {
      window.open(url, "_blank", "noopener");
    }
    return;
  }
});

async function installSourceModule(module) {
  if (!module || !module.id) return;
  setSourceHtml("#sourceDownloadState", `${module.name}: install requested`);
  try {
    const response = await fetch(`/api/source-apps/${encodeURIComponent(module.id)}/install`, {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      const reason = payload.error || `HTTP ${response.status}`;
      setSourceHtml("#sourceDownloadState", `${module.name}: install failed — ${reason}`);
      return;
    }
    setSourceHtml("#sourceDownloadState", `${module.name}: install ${payload.status || "running"}`);
    await pollSourceInstall(module);
  } catch (err) {
    setSourceHtml("#sourceDownloadState", `${module.name}: install error — ${err}`);
  }
}

async function pollSourceInstall(module) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    await loadSourceAppsStatus();
    const status = sourceAppStatus(module);
    setSourceHtml("#sourceDownloadState", `${module.name}: install ${status.install_status || "not_installed"}`);
    const aw = document.getElementById("actionWindow");
    if (aw && aw.dataset.itemId === module.id) {
      dispatchSourceModuleToActionWindow();
    }
    if (status.install_status === "installed" || status.install_status === "failed") {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function launchSourceModule(module) {
  if (!module || !module.id) return;
  setSourceHtml("#sourceDownloadState", `${module.name}: launch requested`);
  try {
    const response = await fetch(`/api/source-apps/${encodeURIComponent(module.id)}/launch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      const reason = payload.detail || payload.error || `HTTP ${response.status}`;
      setSourceHtml("#sourceDownloadState", `${module.name}: launch failed - ${sourceEscape(reason)}`);
      return;
    }
    const launchUrl = payload.url || payload.state?.url || "";
    if (launchUrl) {
      setSourceHtml("#sourceDownloadState", `${module.name}: running at ${launchUrl}`);
    } else {
      setSourceHtml("#sourceDownloadState", `${module.name}: launch ${payload.launch_status || payload.status || "running"}${payload.pid ? ` pid ${payload.pid}` : ""}`);
    }
    await loadSourceAppsStatus();
    const aw = document.getElementById("actionWindow");
    if (aw && aw.dataset.itemId === module.id) {
      dispatchSourceModuleToActionWindow();
    }
  } catch (err) {
    setSourceHtml("#sourceDownloadState", `${module.name}: launch error - ${sourceEscape(err)}`);
  }
}

async function runSourceProcessAction(module, action) {
  if (!module || !module.id) return;
  setSourceHtml("#sourceDownloadState", `${module.name}: ${action} requested`);
  try {
    const response = await fetch(`/api/source-apps/${encodeURIComponent(module.id)}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      const reason = payload.detail || payload.error || `HTTP ${response.status}`;
      setSourceHtml("#sourceDownloadState", `${module.name}: ${action} failed - ${sourceEscape(reason)}`);
      return;
    }
    const status = payload.state?.status || payload.status || action;
    setSourceHtml("#sourceDownloadState", `${module.name}: ${status}`);
    await loadSourceAppsStatus();
    const aw = document.getElementById("actionWindow");
    if (aw && aw.dataset.itemId === module.id) {
      dispatchSourceModuleToActionWindow();
    }
  } catch (err) {
    setSourceHtml("#sourceDownloadState", `${module.name}: ${action} error - ${sourceEscape(err)}`);
  }
}

document.getElementById("sourceSearch")?.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase();
  document.querySelectorAll("#sourceModuleList .source-module-btn, #sourceModuleList button").forEach(btn => {
    const text = btn.textContent.toLowerCase();
    btn.style.display = text.includes(query) ? "" : "none";
  });
});
