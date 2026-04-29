const modules = {
  slicers: {
    label: "Slicers",
    items: [
      moduleItem("PrusaSlicer", "primary", "AGPL-3.0", "https://github.com/prusa3d/PrusaSlicer.git", "source-lab/sources/slicers/PrusaSlicer", "Slicer Bench / Prusa", ["CLI dry-run", "3MF package import", "printer profile copy", "G-code preview bridge"]),
      moduleItem("OrcaSlicer", "primary", "AGPL-3.0", "https://github.com/OrcaSlicer/OrcaSlicer.git", "source-lab/sources/slicers/OrcaSlicer", "Slicer Bench / Orca", ["calibration UX", "device workflow", "profile compare", "3MF/G-code package bridge"]),
      moduleItem("FLSUN Slicer", "profile-first", "AGPL-3.0", "https://github.com/Flsun3d/FlsunSlicer.git", "source-lab/sources/slicers/FLSUN-Slicer", "Slicer Bench / FLSUN", ["import FLSUN T1/V400 profiles", "copy start/end G-code", "remote monitor patterns", "map machine bounds"]),
      moduleItem("Cura", "secondary", "LGPL-3.0", "https://github.com/Ultimaker/Cura.git", "source-lab/sources/slicers/Cura", "Slicer Bench / Cura", ["plugin bridge", "machine definitions", "output-device patterns", "network print patterns"]),
      moduleItem("CuraEngine", "secondary", "AGPL-3.0", "https://github.com/Ultimaker/CuraEngine.git", "source-lab/sources/slicers/CuraEngine", "Slicer Worker / CuraEngine", ["headless slicing engine", "profile-driven CLI", "G-code output", "engine-only dry-run"]),
      moduleItem("SuperSlicer", "reference", "AGPL-3.0", "https://github.com/supermerill/SuperSlicer.git", "source-lab/sources/slicers/SuperSlicer", "Slicer Bench / Compare", ["calibration reference", "advanced options", "profile edge cases"]),
      moduleItem("Slic3r", "reference", "AGPL-3.0", "https://github.com/slic3r/Slic3r.git", "source-lab/sources/slicers/Slic3r", "Slicer Bench / Heritage", ["legacy CLI semantics", "batch export behavior", "mesh repair reference", "profile compatibility"]),
      moduleItem("BambuStudio", "reference", "AGPL-3.0", "https://github.com/bambulab/BambuStudio.git", "source-lab/sources/slicers/BambuStudio", "Slicer Bench / Lineage Reference", ["Orca lineage reference", "device workflow patterns", "calibration UI ideas", "profile/package concepts"]),
      moduleItem("MatterControl", "reference", "AGPL-3.0", "https://github.com/MatterHackers/MatterControl.git", "source-lab/sources/slicers/MatterControl", "Slicer Bench / All-in-One Reference", ["model placement ideas", "library/slicer host flow", "printer connection concepts", "desktop organization"]),
      moduleItem("Kiri:Moto", "reference", "MPL-2.0", "https://github.com/GridSpace/grid-apps.git", "source-lab/sources/slicers/Kiri-Moto", "Slicer Bench / Browser Slicer", ["browser slicing ideas", "web preview patterns", "CNC/laser mode reference", "G-code generation reference"]),
      moduleItem("Strecs3D", "research", "unknown", "https://github.com/tomohiron907/Strecs3D.git", "source-lab/sources/slicers/Strecs3D", "Slicer Bench / Structural Infill", ["structural analysis ideas", "optimized infill research", "strength scoring", "truth-gate candidate"]),
    ],
  },
  modelers: {
    label: "Modelers",
    items: [
      moduleItem("Blender", "primary", "GPL-3.0+", "https://github.com/blender/blender.git", "source-lab/sources/modelers/Blender", "Modeling / Blender", ["background repair CLI", "mesh preview renders", "modifier scripts", "STL/3MF/GLB export"]),
      moduleItem("CadQuery", "primary", "Apache-2.0", "https://github.com/CadQuery/cadquery.git", "source-lab/sources/modelers/CadQuery", "Modeling / CadQuery", ["AI parametric scripts", "STEP/STL export", "dimension-safe parts", "script preview"]),
      moduleItem("OpenSCAD", "primary", "GPL-2.0+", "https://github.com/openscad/openscad.git", "source-lab/sources/modelers/OpenSCAD", "Modeling / OpenSCAD", ["declarative CAD", "CLI render/export", "editable formulas", "fast simple geometry"]),
      moduleItem("build123d", "secondary", "Apache-2.0", "https://github.com/gumyr/build123d.git", "source-lab/sources/modelers/build123d", "Modeling / build123d", ["modern Python CAD", "constraint-like scripting", "AI friendly part generation", "STEP/STL export"]),
      moduleItem("FreeCAD", "secondary", "LGPL-2.0+", "https://github.com/FreeCAD/FreeCAD.git", "source-lab/sources/modelers/FreeCAD", "Modeling / FreeCAD", ["workbench reference", "STEP workflows", "constraint patterns", "Python automation"]),
      moduleItem("Trimesh", "truth-gate", "MIT", "https://github.com/mikedh/trimesh.git", "source-lab/sources/modelers/Trimesh", "Truth Gate / Mesh QA", ["watertight checks", "bounds/volume", "format conversion", "minimum geometry signals"]),
      moduleItem("Manifold", "truth-gate", "Apache-2.0", "https://github.com/elalish/manifold.git", "source-lab/sources/modelers/Manifold", "Truth Gate / Manifold Repair", ["boolean repair", "watertight operations", "solid geometry checks", "printability repair"]),
      moduleItem("MeshLab", "reference", "GPL-3.0", "https://github.com/cnr-isti-vclab/meshlab.git", "source-lab/sources/modelers/MeshLab", "Truth Gate / Mesh Repair", ["mesh filters", "inspection workflows", "repair operation reference", "decimation ideas"]),
      moduleItem("SolveSpace", "reference", "GPL-3.0", "https://github.com/solvespace/solvespace.git", "source-lab/sources/modelers/SolveSpace", "Modeling / Constraint CAD", ["constraint solver UX", "small CAD workflow", "DXF/STL export concepts", "sketch constraint patterns"]),
      moduleItem("Truck", "research", "Apache-2.0", "https://github.com/ricosjp/truck.git", "source-lab/sources/modelers/Truck", "Modeling / Rust CAD Kernel", ["Rust CAD kernel research", "geometry kernel ideas", "future native worker option", "boundary representation ideas"]),
    ],
  },
  print_farm: {
    label: "Print Farm",
    items: [
      moduleItem("Klipper", "core-runtime", "GPL-3.0", "https://github.com/Klipper3d/klipper.git", "source-lab/sources/print-farm/Klipper", "Printer Farm / Firmware Runtime", ["printer object model", "G-code macro patterns", "config file structure", "status/control concepts"]),
      moduleItem("Moonraker", "primary", "GPL-3.0", "https://github.com/Arksine/moonraker.git", "source-lab/sources/print-farm/Moonraker", "Printer Farm / API", ["WebSocket telemetry", "file upload", "printer objects", "camera/service discovery"]),
      moduleItem("FDM Monster", "primary", "AGPL-3.0", "https://github.com/fdm-monster/fdm-monster.git", "source-lab/sources/print-farm/FDM-Monster", "Printer Farm / Fleet", ["multi-printer dashboard", "queue ideas", "operator statuses", "sidecar link"]),
      moduleItem("BotQueue", "reference", "unknown", "https://github.com/Hoektronics/BotQueue.git", "source-lab/sources/print-farm/BotQueue", "Printer Farm / Queue Reference", ["older web queue concepts", "multi-printer dispatch ideas", "job scheduling reference", "farm control history"]),
      moduleItem("Fluidd", "reference", "GPL-3.0", "https://github.com/fluidd-core/fluidd.git", "source-lab/sources/print-farm/Fluidd", "Printer Farm / Device UI", ["compact Klipper UI", "files/macros", "console patterns", "Moonraker UX"]),
      moduleItem("Mainsail", "reference", "GPL-3.0", "https://github.com/mainsail-crew/mainsail.git", "source-lab/sources/print-farm/Mainsail", "Printer Farm / Device UI", ["Klipper dashboard", "macros", "responsive controls", "device panels"]),
      moduleItem("Printrun / Pronterface", "secondary", "GPL-3.0", "https://github.com/kliment/Printrun.git", "source-lab/sources/print-farm/Printrun", "Printer Farm / Serial Host", ["printcore Python API", "USB/serial host", "manual jog controls", "legacy G-code streaming"]),
      moduleItem("OctoPrint", "secondary", "AGPL-3.0", "https://github.com/OctoPrint/OctoPrint.git", "source-lab/sources/print-farm/OctoPrint", "Printer Farm / Plugin Bridge", ["plugin ecosystem", "camera/control", "legacy printer API", "file/job flow"]),
      moduleItem("OctoFarm", "reference", "AGPL-3.0", "https://github.com/OctoFarm/OctoFarm.git", "source-lab/sources/print-farm/OctoFarm", "Printer Farm / Fleet Reference", ["farm dashboard patterns", "queue concepts", "printer cards", "legacy fleet UX"]),
      moduleItem("KlipperScreen", "reference", "GPL-3.0", "https://github.com/KlipperScreen/KlipperScreen.git", "source-lab/sources/print-farm/KlipperScreen", "Printer Farm / Touch Panel", ["touch-friendly printer actions", "local controls", "state-driven controls", "panel layout reference"]),
    ],
  },
  firmware: {
    label: "Firmware",
    items: [
      moduleItem("Klipper", "core-runtime", "GPL-3.0", "https://github.com/Klipper3d/klipper.git", "source-lab/sources/print-farm/Klipper", "Firmware / Klipper", ["printer object model", "G-code macro patterns", "config file structure", "firmware safety boundaries"]),
      moduleItem("Marlin", "secondary", "GPL-3.0", "https://github.com/MarlinFirmware/Marlin.git", "source-lab/sources/firmware/Marlin", "Firmware / Marlin Printers", ["Creality/Tronxy compatibility", "G-code behavior", "configuration options", "safety command boundaries"]),
      moduleItem("Prusa Firmware", "secondary", "GPL-3.0", "https://github.com/prusa3d/Prusa-Firmware.git", "source-lab/sources/firmware/Prusa-Firmware", "Firmware / Prusa MK3S", ["MK3S behavior reference", "Prusa G-code conventions", "safety/status concepts", "legacy LCD flow"]),
      moduleItem("RepRapFirmware", "reference", "GPL-3.0", "https://github.com/Duet3D/RepRapFirmware.git", "source-lab/sources/firmware/RepRapFirmware", "Firmware / Network Reference", ["network firmware model", "macro system reference", "object model ideas", "web-control concepts"]),
      moduleItem("Smoothieware", "reference", "GPL-3.0", "https://github.com/Smoothieware/Smoothieware.git", "source-lab/sources/firmware/Smoothieware", "Firmware / Motion Reference", ["motion-control reference", "config conventions", "legacy compatibility ideas", "G-code behavior"]),
      moduleItem("Repetier Firmware", "reference", "GPL-3.0", "https://github.com/repetier/Repetier-Firmware.git", "source-lab/sources/firmware/Repetier-Firmware", "Firmware / Legacy Reference", ["legacy firmware behavior", "network/control reference", "compatibility map", "host fallback ideas"]),
    ],
  },
  generation: {
    label: "3D Generation",
    items: [
      moduleItem("ComfyUI", "primary", "GPL-3.0", "https://github.com/comfyanonymous/ComfyUI.git", "source-lab/sources/generation/ComfyUI", "Generation / Runner", ["workflow queue", "node graph", "image cleanup", "API runner"]),
      moduleItem("ComfyUI Frontend", "reference", "GPL-3.0", "https://github.com/Comfy-Org/ComfyUI_frontend.git", "source-lab/sources/generation/ComfyUI-Frontend", "Generation / Node UI Reference", ["node canvas patterns", "workflow library", "compact graph UX", "3D workflow layout"]),
      moduleItem("TRELLIS.2", "primary", "MIT", "https://github.com/microsoft/TRELLIS.2.git", "source-lab/sources/generation/TRELLIS.2", "Generation / Primary Engine", ["image-to-3D", "multiview stages", "mesh export", "PBR route"]),
      moduleItem("Hunyuan3D-2.1", "secondary", "community", "https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1.git", "source-lab/sources/generation/Hunyuan3D-2.1", "Generation / Compare", ["fallback engine", "PBR compare", "research mode", "quality scoring"]),
      moduleItem("TripoSR", "fast-preview", "MIT", "https://github.com/VAST-AI-Research/TripoSR.git", "source-lab/sources/generation/TripoSR", "Generation / Fast Preview", ["fast mesh preview", "early reject", "cheap compare", "routing fallback"]),
      moduleItem("ComfyUI TRELLIS.2", "bridge", "unknown", "https://github.com/visualbruno/ComfyUI-Trellis2.git", "source-lab/sources/generation/ComfyUI-Trellis2", "Generation / Node Bridge", ["TRELLIS.2 nodes", "workflow packaging", "Windows route", "source bridge"]),
    ],
  },
  orchestration: {
    label: "Agents",
    items: [
      moduleItem("LangGraph", "primary", "MIT", "https://github.com/langchain-ai/langgraph.git", "source-lab/sources/orchestration/LangGraph", "Agents / Workflow Gates", ["approval gates", "state graph", "recover jobs", "agent handoffs"]),
      moduleItem("LangChain", "reference", "MIT", "https://github.com/langchain-ai/langchain.git", "source-lab/sources/orchestration/LangChain", "Agents / Tool Layer", ["tool patterns", "retrieval", "connectors", "agent examples"]),
      moduleItem("Azure Speech SDK", "primary", "MIT", "https://github.com/microsoft/cognitive-services-speech-sdk-js.git", "source-lab/sources/orchestration/Azure-Speech-SDK-JS", "Agents / Voice", ["TTS/STT bridge", "voice preview", "agent voices", "safety alerts"]),
      moduleItem("Model Context Protocol", "primary", "MIT", "https://github.com/modelcontextprotocol/modelcontextprotocol.git", "source-lab/sources/orchestration/Model-Context-Protocol", "Agents / Tools", ["tool protocol", "vision/media MCP", "service connectors", "Hermes integration"]),
      moduleItem("Kiln", "research", "unknown", "https://github.com/codeofaxel/Kiln.git", "source-lab/sources/orchestration/Kiln", "Agents / Printer MCP Reference", ["AI printer-control MCP ideas", "tool safety patterns", "printer command boundary", "agent integration reference"]),
    ],
  },
  libraries: {
    label: "Library",
    items: [
      moduleItem("Manyfold", "primary", "AGPL-3.0", "https://github.com/manyfold3d/manyfold.git", "source-lab/sources/libraries/Manyfold", "Files / Model Library", ["self-hosted model library", "tagging and collections", "file metadata", "local asset vault patterns"]),
    ],
  },
  materials: {
    label: "Materials",
    items: [
      moduleItem("Open Filament Database", "primary", "unknown", "https://github.com/OpenFilamentCollective/open-filament-database.git", "source-lab/sources/materials/Open-Filament-Database", "Materials / Filament Profiles", ["filament profile data", "material settings reference", "temperature/speed suggestions", "profile comparison"]),
    ],
  },
  hardware: {
    label: "Hardware",
    items: [
      moduleItem("BoxTurtle", "future", "GPL-3.0", "https://github.com/ArmoredTurtle/BoxTurtle.git", "source-lab/sources/hardware/BoxTurtle", "Hardware / Filament Changer", ["multi-material workflow ideas", "filament changer state", "future AMS-style control", "hardware mod planning"]),
      moduleItem("EnragedRabbitProject", "future", "GPL-3.0", "https://github.com/EtteGit/EnragedRabbitProject.git", "source-lab/sources/hardware/EnragedRabbitProject", "Hardware / Filament Changer", ["multi-material Klipper ecosystem", "filament path concepts", "future toolchanger UI", "mod research"]),
      moduleItem("Awesome Extruders", "catalog", "unknown", "https://github.com/SartorialGrunt0/Awesome-Extruders.git", "source-lab/sources/hardware/Awesome-Extruders", "Hardware / Upgrade Research", ["extruder upgrade discovery", "learning-mode research source", "hardware mod catalog", "FLSUN upgrade planning"]),
    ],
  },
  utilities: {
    label: "Utilities",
    items: [
      moduleItem("3D Box Generator", "reference", "unknown", "https://github.com/javisperez/box-stl-generator.git", "source-lab/sources/utilities/Box-STL-Generator", "Modeling / Quick Generators", ["parametric utility generator pattern", "fast printable box workflow", "template-driven part generation", "AI quick-part recipe"]),
    ],
  },
  research: {
    label: "Research",
    items: [
      moduleItem("Awesome 3D Printing", "catalog", "CC0-1.0", "https://github.com/ad-si/awesome-3d-printing.git", "source-lab/sources/research/Awesome-3D-Printing", "Research / Cherry-pick Index", ["discover candidate tools", "rank by CLI/API", "feed learning mode", "promote only proven modules"]),
    ],
  },
};

let groupKey = "slicers";
let selectedIndex = 0;

function moduleItem(name, priority, license, repo, local, section, tasks) {
  return { name, priority, license, repo, local, section, tasks };
}

function renderGroups() {
  const tabs = document.querySelector("#groupTabs");
  tabs.innerHTML = Object.entries(modules)
    .map(([key, group]) => `<button class="${key === groupKey ? "active" : ""}" data-group="${key}">${group.label}</button>`)
    .join("");
}

function renderModules() {
  const group = modules[groupKey];
  document.querySelector("#groupTitle").textContent = group.label;
  document.querySelector("#groupCount").textContent = `${group.items.length} ${group.items.length === 1 ? "module" : "modules"}`;
  document.querySelector("#moduleList").innerHTML = group.items
    .map(
      (item, index) => `
        <button class="module-card ${index === selectedIndex ? "active" : ""} ${item.priority}" data-index="${index}">
          <b>${item.name}</b><i>${item.priority}</i>
          <span>${item.section}</span><span>${item.license}</span>
        </button>
      `,
    )
    .join("");
}

function renderSelected() {
  const item = modules[groupKey].items[selectedIndex];
  document.querySelector("#moduleName").textContent = item.name;
  document.querySelector("#moduleRole").textContent = item.priority;
  document.querySelector("#repoCell").textContent = item.repo;
  document.querySelector("#localCell").textContent = item.local;
  document.querySelector("#licenseCell").textContent = item.license;
  document.querySelector("#priorityCell").textContent = item.priority;
  document.querySelector("#sectionCell").textContent = item.section;
  document.querySelector("#statusCell").textContent = item.repo.startsWith("http") ? "downloadable" : "needs user profile/source";
  document.querySelector("#partLabel").textContent = item.name;
  document.querySelector("#taskCount").textContent = `${item.tasks.length} tasks`;
  document.querySelector("#bridgeTasks").innerHTML = item.tasks.map((task) => `<li>${task}</li>`).join("");
  document.querySelector("#toolFlags").innerHTML = item.tasks.slice(0, 4).map((task, index) => `<span class="${index === 0 ? "primary" : ""}">${task}</span>`).join("");
  document.querySelector("#pipeline").innerHTML = pipelineFor(groupKey).map((step, index) => `<span class="${index < 2 ? "done" : ""}">${step}</span>`).join("");
  const allModules = Object.values(modules).flatMap((group) => group.items);
  const uniqueLocalSources = new Set(allModules.map((module) => module.local)).size;
  document.querySelector("#downloadState").textContent = `${allModules.length} source modules / ${uniqueLocalSources} local source checkouts`;
}

function pipelineFor(group) {
  const pipelines = {
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
  return pipelines[group];
}

document.addEventListener("click", (event) => {
  const groupButton = event.target.closest("[data-group], [data-jump]");
  if (groupButton) {
    groupKey = groupButton.dataset.group || groupButton.dataset.jump;
    selectedIndex = 0;
    render();
  }

  const moduleButton = event.target.closest("[data-index]");
  if (moduleButton) {
    selectedIndex = Number(moduleButton.dataset.index);
    render();
  }

  if (event.target.id === "dryRun") {
    document.querySelector("#downloadState").textContent = `${modules[groupKey].items[selectedIndex].name}: bridge dry-run queued`;
  }
});

function render() {
  renderGroups();
  renderModules();
  renderSelected();
}

render();
