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
  groupKey: "slicers",
  selectedIndex: 0,
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
  } catch (error) {
    setSourceHtml(
      "#sourceModuleList",
      `<div class="empty-state">Source manifest could not load: ${sourceEscape(error.message)}</div>`,
    );
    setSourceHtml("#sourceDownloadState", "Source manifest unavailable");
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
  renderSourceGroupTabs();
  renderSourceMix();
  renderSourceModuleList();
  renderSourceModuleDetails();
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
  return `
    <div class="source-native-window source-slicer-window">
      <div class="source-native-title">
        <span class="source-app-dot"></span>
        <strong>*Untitled - ${sourceEscape(slicer.title)}</strong>
        <span class="source-window-controls">- □ ×</span>
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
  if (!module.repo) {
    return "needs user source/profile";
  }
  if (module.priority === "catalog") {
    return "catalog source downloaded";
  }
  if (module.priority === "reference" || module.priority === "research" || module.priority === "future") {
    return "reference source downloaded";
  }
  return "source downloaded / bridge planned";
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
  const groupButton = event.target.closest("[data-source-group]");
  if (groupButton) {
    setSourceGroup(groupButton.dataset.sourceGroup);
    return;
  }

  const moduleButton = event.target.closest("[data-source-index]");
  if (moduleButton) {
    sourceState.selectedIndex = Number(moduleButton.dataset.sourceIndex);
    renderSourceOs();
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
  }
});
