const state = {
  activePage: "dashboard",
  jobs: [],
  printers: [],
  artifacts: [],
  approvals: [],
  events: [],
  settings: {},
  health: {},
  printerStatus: {},
  activeJobId: null,
};

const healthEl = document.querySelector("#health");
const printerSelect = document.querySelector("#printerSelect");
const advanceBtn = document.querySelector("#advanceBtn");
const approveModelBtn = document.querySelector("#approveModelBtn");
const approvePrintBtn = document.querySelector("#approvePrintBtn");

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || response.statusText);
  }
  return response.json();
}

async function refresh() {
  try {
    const workspace = await api("/api/workspace");
    state.health = workspace.health;
    state.settings = workspace.settings;
    state.printers = workspace.printers;
    state.jobs = workspace.jobs;
    state.artifacts = workspace.artifacts;
    state.approvals = workspace.approvals;
    state.events = workspace.events;

    healthEl.textContent = state.health.dry_run_printers
      ? "API online. Printer actions are dry-run."
      : "API online. Real printer actions enabled.";

    if (!state.activeJobId && state.jobs.length) {
      state.activeJobId = state.jobs[0].id;
    }

    renderAll();
  } catch (error) {
    healthEl.innerHTML = `<span class="error">${escapeHtml(error.message)}</span>`;
  }
}

function renderAll() {
  renderTabs();
  renderPrinterSelect();
  renderDashboard();
  renderDesign();
  renderJobs();
  renderPrinters();
  renderObserve();
  renderArtifactsPage();
  renderApprovalsPage();
  renderPlugins();
  renderSettings();
  renderRoadmap();
  renderActiveJob();
}

function renderTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.page === state.activePage);
  });
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.id === `page-${state.activePage}`);
  });
}

function renderPrinterSelect() {
  const options = state.printers
    .filter((printer) => !printerLocked(printer))
    .map((printer) => `<option value="${escapeAttr(printer.id)}">${escapeHtml(printer.name)}</option>`);
  printerSelect.innerHTML = [
    '<option value="">Auto-select first available printer</option>',
    ...options,
  ].join("");
}

function renderDashboard() {
  setHtml("#dashboardFleet", renderPrinterCards(state.printers.slice(0, 4), true));
  setHtml("#dashboardJobs", renderJobCards(state.jobs.slice(0, 8)));
  setHtml("#dashboardEvents", renderEventCards(state.events.slice(0, 12)));
}

function renderDesign() {
  setHtml(
    "#designToolchain",
    [
      settingRow("Hermes Agent System", "Job planning, tool calling, evidence summaries"),
      settingRow("Modeling LLM", "Configured through local OpenAI-compatible endpoint"),
      settingRow("CAD Workers", "CadQuery, OpenSCAD, and Blender repair/export planned"),
      settingRow("Slicer Worker", "PrusaSlicer first, OrcaSlicer later"),
      settingRow("Safety Gate", "Generated models require validation and approval before printing"),
    ].join(""),
  );
}

function renderJobs() {
  setHtml("#jobs", renderJobCards(state.jobs));
}

function renderPrinters() {
  setHtml("#printers", renderPrinterCards(state.printers, false));
}

function renderObserve() {
  const cards = state.printers
    .map((printer) => {
      const cameraUrl = cameraUrlFor(printer);
      const locked = printerLocked(printer);
      return `
        <article class="camera-card">
          <div class="row">
            <h3>${escapeHtml(printer.name)}</h3>
            ${locked ? stateBadge("LOCKED") : stateBadge(cameraUrl ? "CAMERA" : "NO CAMERA")}
          </div>
          ${
            cameraUrl && !locked
              ? `<img class="camera-frame" src="${escapeAttr(cameraUrl)}" alt="${escapeAttr(printer.name)} camera" />`
              : `<div class="camera-placeholder">${escapeHtml(locked ? lockReason(printer) : "Add a camera_url in printer capabilities for integrated or USB camera viewing.")}</div>`
          }
          <p class="muted">${escapeHtml(printer.base_url || "No Moonraker URL configured")}</p>
        </article>
      `;
    })
    .join("");
  setHtml("#observeGrid", cards || '<div class="empty-state">No printers configured.</div>');
}

function renderArtifactsPage() {
  const rows = state.artifacts
    .map(
      (artifact) => `
        <article class="artifact-card">
          <div class="row">
            <strong>${escapeHtml(artifact.kind)}</strong>
            <span class="muted">Job #${artifact.job_id}</span>
          </div>
          <p>${escapeHtml(artifact.job_title || "Untitled job")}</p>
          <p class="muted">${escapeHtml(artifact.path)}</p>
        </article>
      `,
    )
    .join("");
  setHtml("#artifactPageList", rows || '<div class="empty-state">No artifacts yet.</div>');
}

function renderApprovalsPage() {
  const pending = state.jobs.filter((job) => job.state === "MODEL_APPROVAL" || job.state === "PRINT_APPROVAL");
  const pendingRows = pending
    .map(
      (job) => `
        <article class="approval-card">
          <div class="row">
            <strong>${escapeHtml(job.title)}</strong>
            ${stateBadge(job.state)}
          </div>
          <p class="muted">Job #${job.id}</p>
        </article>
      `,
    )
    .join("");
  const historyRows = state.approvals
    .map(
      (approval) => `
        <article class="approval-card">
          <div class="row">
            <strong>${escapeHtml(approval.gate)}</strong>
            ${stateBadge(approval.approved ? "APPROVED" : "REJECTED")}
          </div>
          <p>${escapeHtml(approval.job_title || `Job #${approval.job_id}`)}</p>
          <p class="muted">${escapeHtml(approval.note || "No note")}</p>
        </article>
      `,
    )
    .join("");
  setHtml(
    "#approvalsPageList",
    [
      `<div class="section"><h2>Pending</h2>${pendingRows || '<div class="empty-state">No pending approvals.</div>'}</div>`,
      `<div class="section"><h2>History</h2>${historyRows || '<div class="empty-state">No approval history yet.</div>'}</div>`,
    ].join(""),
  );
}

function renderSettings() {
  const safetyLocks = state.printers
    .filter(printerLocked)
    .map((printer) => settingRow(`${printer.name} Safety Lock`, lockReason(printer)))
    .join("");
  setHtml(
    "#settingsPage",
    [
      settingRow("Dry Run Printers", String(state.settings.dry_run_printers)),
      settingRow("Printers Config", state.settings.printers_config),
      settingRow("Services Config", state.settings.services_config),
      settingRow("Storage", state.settings.storage_dir),
      settingRow("Database", state.health.database),
      safetyLocks || settingRow("Safety Locks", "No locked printers configured"),
    ].join(""),
  );
}

function renderPlugins() {
  const plugins = [
    ["Moonraker", "Printer API control, status, upload, telemetry", "active"],
    ["Camera Observer", "Integrated printer cameras and USB camera URLs", "ready"],
    ["PrusaSlicer", "Primary slicer CLI worker for safe G-code generation", "planned"],
    ["OrcaSlicer", "Secondary slicer worker for profile compatibility", "planned"],
    ["CadQuery", "Parametric Python CAD generation", "planned"],
    ["OpenSCAD", "Scripted parametric model generation", "planned"],
    ["Blender / Trimesh", "Mesh repair, validation, previews, exports", "planned"],
    ["Local Modeling LLM", "Hermes design assistant through local model endpoint", "planned"],
    ["FDM Monster", "Fleet sidecar dashboard integration", "planned"],
    ["Maintenance", "Locks, service notes, nozzle/hotend safety, reminders", "active"],
    ["Filament", "Spools, materials, remaining weight, profile matching", "planned"],
    ["Evidence Ledger", "Artifacts, approvals, events, and audit history", "active"],
  ];
  setHtml(
    "#pluginsPage",
    plugins
      .map(
        ([name, description, status]) => `
          <article class="plugin-card">
            <div class="row">
              <h3>${escapeHtml(name)}</h3>
              ${stateBadge(status.toUpperCase())}
            </div>
            <p class="muted">${escapeHtml(description)}</p>
          </article>
        `,
      )
      .join(""),
  );
}

function renderRoadmap() {
  const items = [
    "Confirm safe printer set: T1-A, T1-B, and V400 only while S1 is locked",
    "Add reviewed PrusaSlicer profiles for T1 and V400",
    "Add upload-only workflow before real auto-start printing",
    "Add real STL/3MF validation and preview evidence",
    "Connect local Hermes/modeling LLM",
    "Add CadQuery and OpenSCAD model workers",
    "Add live camera URLs for integrated or USB print observation",
    "Enable plugin cards for slicers, cameras, CAD, filament, maintenance, and fleet dashboards",
    "Add FDM Monster sidecar integration",
  ];
  setHtml(
    "#roadmapPage",
    items.map((item, index) => `<article class="roadmap-item"><strong>${index + 1}</strong><span>${escapeHtml(item)}</span></article>`).join(""),
  );
}

async function renderActiveJob() {
  const activeJobEl = document.querySelector("#activeJob");
  if (!state.activeJobId) {
    activeJobEl.className = "empty-state";
    activeJobEl.textContent = "No job selected.";
    setButtons(null);
    return;
  }

  const job = await api(`/api/jobs/${state.activeJobId}`);
  setButtons(job);
  activeJobEl.className = "detail-grid";
  activeJobEl.innerHTML = `
    <div class="row">
      <div>
        <h3>${escapeHtml(job.title)}</h3>
        <p class="muted">${escapeHtml(job.description)}</p>
      </div>
      ${stateBadge(job.state)}
    </div>
    <section class="section">
      <h2>Workflow</h2>
      <div class="workflow-line">${renderWorkflow(job.state)}</div>
    </section>
    <section class="section">
      <h2>Artifacts</h2>
      <div class="artifact-list">${renderJobArtifacts(job.artifacts)}</div>
    </section>
    <section class="section">
      <h2>Events</h2>
      <div class="event-list">${renderEventCards(job.events)}</div>
    </section>
  `;
}

function renderWorkflow(currentState) {
  const states = [
    "INTAKE",
    "PLAN_JOB",
    "GENERATE_OR_IMPORT_MODEL",
    "VALIDATE_MODEL",
    "MODEL_APPROVAL",
    "SLICE",
    "VALIDATE_GCODE",
    "PRINT_APPROVAL",
    "SELECT_PRINTER",
    "UPLOAD_TO_MOONRAKER",
    "START_PRINT",
    "MONITOR_PRINT",
    "COMPLETE",
  ];
  return states
    .map((item) => `<span class="workflow-step ${item === currentState ? "current" : ""}">${escapeHtml(item)}</span>`)
    .join("");
}

function renderJobArtifacts(artifacts) {
  return (
    artifacts
      .map(
        (artifact) => `
          <article class="artifact-card">
            <div class="row">
              <strong>${escapeHtml(artifact.kind)}</strong>
              <span class="muted">#${artifact.id}</span>
            </div>
            <p class="muted">${escapeHtml(artifact.path)}</p>
          </article>
        `,
      )
      .join("") || '<div class="empty-state">No artifacts yet.</div>'
  );
}

function renderPrinterCards(printers, compact) {
  return (
    printers
      .map((printer) => {
        const locked = printerLocked(printer);
        return `
          <article class="printer-card ${locked ? "locked-card" : ""}">
            <div class="row">
              <h3>${escapeHtml(printer.name)}</h3>
              ${stateBadge(locked ? "LOCKED" : printer.connector)}
            </div>
            <p class="muted">${escapeHtml(printer.vendor || "Unknown vendor")} ${escapeHtml(printer.model || "")}</p>
            <p class="muted">${escapeHtml(printer.base_url || "No Moonraker URL configured")}</p>
            ${compact ? "" : `<div class="printer-actions"><button type="button" data-test-printer="${escapeAttr(printer.id)}" ${locked ? "disabled" : ""}>${locked ? "Locked" : "Test"}</button></div>`}
            ${renderPrinterLock(printer)}
            ${renderPrinterStatus(printer.id)}
          </article>
        `;
      })
      .join("") || '<div class="empty-state">No printers loaded.</div>'
  );
}

function renderJobCards(jobs) {
  const html = jobs
    .map(
      (job) => `
        <article class="job-card ${job.id === state.activeJobId ? "active" : ""}" data-job-id="${job.id}">
          <div class="row">
            <h3>${escapeHtml(job.title)}</h3>
            ${stateBadge(job.state)}
          </div>
          <p class="muted">#${job.id} ${escapeHtml(job.target_printer_id || "no printer selected")}</p>
        </article>
      `,
    )
    .join("");
  return html || '<div class="empty-state">No jobs yet.</div>';
}

function renderEventCards(events) {
  return (
    events
      .map(
        (event) => `
          <article class="event-card">
            <div class="row">
              <strong>${escapeHtml(event.event_type)}</strong>
              <span class="muted">${escapeHtml(event.created_at)}</span>
            </div>
            <p class="muted">${escapeHtml(event.message)}</p>
          </article>
        `,
      )
      .join("") || '<div class="empty-state">No events yet.</div>'
  );
}

function setButtons(job) {
  const hasJob = Boolean(job);
  advanceBtn.disabled =
    !hasJob || job.state === "MODEL_APPROVAL" || job.state === "PRINT_APPROVAL" || job.state === "COMPLETE";
  approveModelBtn.disabled = !hasJob || job.state !== "MODEL_APPROVAL";
  approvePrintBtn.disabled = !hasJob || job.state !== "PRINT_APPROVAL";
}

function stateBadge(value) {
  const text = String(value || "");
  const cls = text === "COMPLETE" || text === "APPROVED" ? "complete" : text.includes("APPROVAL") ? "approval" : text === "LOCKED" ? "locked" : "";
  return `<span class="state ${cls}">${escapeHtml(text)}</span>`;
}

function renderPrinterStatus(printerId) {
  const status = state.printerStatus[printerId];
  if (!status) {
    return "";
  }
  const detail = status.payload?.printer?.state_message || status.payload?.printer?.state || status.message;
  const cls = status.ok ? "status-ok" : status.ok === null ? "status-pending" : "status-bad";
  return `
    <div class="printer-status ${cls}">
      <strong>${status.ok ? "Reachable" : status.ok === null ? "Testing" : "Needs attention"}</strong>
      <span>${escapeHtml(detail || "No detail returned")}</span>
    </div>
  `;
}

function printerLocked(printer) {
  return !printer.enabled || printer.capabilities?.maintenance_lock || printer.capabilities?.do_not_probe;
}

function lockReason(printer) {
  return printer.capabilities?.lock_reason || "Disabled or safety locked.";
}

function renderPrinterLock(printer) {
  if (!printerLocked(printer)) {
    return "";
  }
  return `
    <div class="printer-status status-bad">
      <strong>Safety locked</strong>
      <span>${escapeHtml(lockReason(printer))}</span>
    </div>
  `;
}

function cameraUrlFor(printer) {
  const capabilities = printer.capabilities || {};
  if (capabilities.camera_url && capabilities.camera_url !== "unknown") {
    return capabilities.camera_url;
  }
  if (capabilities.usb_camera_url && capabilities.usb_camera_url !== "unknown") {
    return capabilities.usb_camera_url;
  }
  if (typeof capabilities.camera === "string" && capabilities.camera.startsWith("http")) {
    return capabilities.camera;
  }
  return "";
}

function settingRow(label, value) {
  return `
    <article class="setting-row">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(value || "Not configured")}</span>
    </article>
  `;
}

function setHtml(selector, html) {
  const target = document.querySelector(selector);
  if (target) {
    target.innerHTML = html;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    state.activePage = tab.dataset.page;
    renderTabs();
  });
});

document.addEventListener("click", async (event) => {
  const jobCard = event.target.closest(".job-card");
  if (jobCard) {
    state.activeJobId = Number(jobCard.dataset.jobId);
    state.activePage = "jobs";
    renderAll();
  }

  const printerButton = event.target.closest("[data-test-printer]");
  if (printerButton) {
    const printerId = printerButton.dataset.testPrinter;
    printerButton.disabled = true;
    printerButton.textContent = "Testing";
    state.printerStatus[printerId] = { ok: null, message: "Testing..." };
    renderAll();
    try {
      state.printerStatus[printerId] = await api(`/api/printers/${printerId}/status`);
    } catch (error) {
      state.printerStatus[printerId] = { ok: false, message: error.message };
    }
    renderAll();
  }
});

document.querySelector("#refreshBtn").addEventListener("click", refresh);

document.querySelector("#bootstrapBtn").addEventListener("click", async () => {
  await api("/api/bootstrap", { method: "POST", body: "{}" });
  await refresh();
});

document.querySelector("#jobForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const created = await api("/api/jobs", {
    method: "POST",
    body: JSON.stringify({
      title: form.get("title"),
      description: form.get("description"),
      target_printer_id: form.get("target_printer_id") || null,
    }),
  });
  state.activeJobId = created.id;
  state.activePage = "jobs";
  await refresh();
});

advanceBtn.addEventListener("click", async () => {
  await api(`/api/jobs/${state.activeJobId}/advance`, {
    method: "POST",
    body: JSON.stringify({ target_printer_id: printerSelect.value || null }),
  });
  await refresh();
});

approveModelBtn.addEventListener("click", async () => {
  await api(`/api/jobs/${state.activeJobId}/approvals/MODEL_APPROVAL`, {
    method: "POST",
    body: JSON.stringify({ approved: true, note: "Approved from web dashboard." }),
  });
  await refresh();
});

approvePrintBtn.addEventListener("click", async () => {
  await api(`/api/jobs/${state.activeJobId}/approvals/PRINT_APPROVAL`, {
    method: "POST",
    body: JSON.stringify({ approved: true, note: "Approved from web dashboard." }),
  });
  await refresh();
});

refresh();
