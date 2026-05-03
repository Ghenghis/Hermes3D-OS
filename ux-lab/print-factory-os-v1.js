const printers = [
  { id: "t1a", name: "FLSUN T1-A", ip: "192.168.0.10", state: "printing", nozzle: 211, bed: 60, progress: 38 },
  { id: "t1b", name: "FLSUN T1-B", ip: "192.168.0.11", state: "idle", nozzle: 28, bed: 24, progress: 0 },
  { id: "v400", name: "FLSUN V400", ip: "192.168.0.34", state: "ready", nozzle: 32, bed: 25, progress: 0 },
  { id: "s1", name: "FLSUN S1", ip: "192.168.0.12", state: "locked", nozzle: 0, bed: 0, progress: 0 },
  { id: "mk3s", name: "Prusa MK3S", ip: "later", state: "offline", nozzle: 0, bed: 0, progress: 0 },
  { id: "cr6", name: "Creality CR-6 Max", ip: "later", state: "offline", nozzle: 0, bed: 0, progress: 0 },
];

const slicers = {
  prusa: { label: "PrusaSlicer CLI", eta: "2h 18m", part: "bracket.stl" },
  orca: { label: "OrcaSlicer bridge", eta: "2h 06m", part: "bracket.3mf" },
  flsun: { label: "FLSUN slicer profile", eta: "2h 22m", part: "bracket.stl" },
  cura: { label: "CuraEngine / plugin bridge", eta: "2h 31m", part: "bracket.stl" },
};

const modelSnippets = {
  cadquery: {
    title: "CadQuery parametric source",
    code: 'box = cq.Workplane("XY").box(80, 30, 12)\\nholes = box.faces(">Z").workplane().pushPoints([(-25,0),(25,0)]).hole(5)',
  },
  openscad: {
    title: "OpenSCAD quick parametric source",
    code: "difference() {\\n  cube([80,30,12], center=true);\\n  translate([-25,0,0]) cylinder(h=14, d=5);\\n}",
  },
  blender: {
    title: "Blender repair/export command",
    code: "blender --background --python repair_mesh.py -- bracket.stl --export bracket-fixed.3mf",
  },
  trellis: {
    title: "TRELLIS image-to-3D route",
    code: "photo -> MiniMax vision -> TRELLIS.2 -> Blender repair -> slicer dry-run -> printability gate",
  },
};

let selected = printers[0];

function renderPrinters() {
  const grid = document.querySelector("#printerGrid");
  grid.innerHTML = printers
    .map((printer) => {
      const locked = printer.state === "locked";
      return `
        <button class="printer-card ${printer.id === selected.id ? "selected" : ""} ${locked ? "locked" : ""}" data-printer="${printer.id}">
          <span class="printer-name">${printer.name}</span>
          <span class="badge ${locked ? "locked" : ""}">${printer.state}</span>
          <span>${printer.ip}</span>
          <span>${locked ? "do not test" : printer.progress ? `${printer.progress}%` : "ready"}</span>
          <div class="telemetry">
            ${metric("N", printer.nozzle, 260)}
            ${metric("B", printer.bed, 120)}
            ${metric("P", printer.progress, 100)}
            ${metric("Q", locked ? 0 : 92, 100)}
          </div>
        </button>
      `;
    })
    .join("");
}

function metric(label, value, max) {
  const width = Math.max(0, Math.min(100, (value / max) * 100));
  return `
    <span class="metric">
      ${label} ${value}
      <i class="bar"><span style="width:${width}%"></span></i>
    </span>
  `;
}

function updateInspector() {
  document.querySelector("#selectedPrinter").textContent = selected.name;
  document.querySelector("#nozzleTemp").textContent = `${selected.nozzle} C`;
  document.querySelector("#bedTemp").textContent = `${selected.bed} C`;
  document.querySelector("#printProgress").textContent = `${selected.progress}%`;
}

document.addEventListener("click", (event) => {
  const printerButton = event.target.closest("[data-printer]");
  if (printerButton) {
    selected = printers.find((printer) => printer.id === printerButton.dataset.printer) || selected;
    renderPrinters();
    updateInspector();
  }

  const slicerTab = event.target.closest("#slicerTabs [data-tab]");
  if (slicerTab) {
    document.querySelectorAll("#slicerTabs button").forEach((button) => button.classList.remove("active"));
    slicerTab.classList.add("active");
    const slicer = slicers[slicerTab.dataset.tab];
    document.querySelector("#activeSlicer").textContent = slicer.label;
    document.querySelector("#etaCell").textContent = slicer.eta;
    document.querySelector("#partGhost").textContent = slicer.part;
  }

  const modelTab = event.target.closest("#modelTabs [data-model]");
  if (modelTab) {
    document.querySelectorAll("#modelTabs button").forEach((button) => button.classList.remove("active"));
    modelTab.classList.add("active");
    const model = modelSnippets[modelTab.dataset.model];
    document.querySelector("#modelTitle").textContent = model.title;
    document.querySelector("#modelCode").textContent = model.code;
  }

  if (event.target.id === "toggleEvents") {
    document.querySelector("#eventDrawer").classList.toggle("collapsed");
  }

  if (event.target.id === "closeEvents") {
    document.querySelector("#eventDrawer").classList.add("collapsed");
  }
});

["scaleX", "scaleY", "scaleZ"].forEach((id) => {
  document.querySelector(`#${id}`).addEventListener("input", () => {
    const x = document.querySelector("#scaleX").value;
    const y = document.querySelector("#scaleY").value;
    const z = document.querySelector("#scaleZ").value;
    document.querySelector("#partGhost").style.transform = `scale(${x / 100}, ${y / 100})`;
    document.querySelector("#partGhost").title = `Scale ${x}/${y}/${z}%`;
  });
});

setInterval(() => {
  const active = printers[0];
  active.progress = Math.min(99, active.progress + 1);
  active.nozzle += active.nozzle > 213 ? -2 : 1;
  renderPrinters();
  if (selected.id === active.id) {
    selected = active;
    updateInspector();
  }
}, 2500);

renderPrinters();
updateInspector();
