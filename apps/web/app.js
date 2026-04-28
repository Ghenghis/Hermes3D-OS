const state = {
  activePage: "dashboard",
  jobs: [],
  printers: [],
  artifacts: [],
  approvals: [],
  events: [],
  settings: {},
  autopilot: {},
  health: {},
  printerStatus: {},
  activeJobId: null,
};

const healthEl = document.querySelector("#health");
const printerSelect = document.querySelector("#printerSelect");
const advanceBtn = document.querySelector("#advanceBtn");
const approveModelBtn = document.querySelector("#approveModelBtn");
const approvePrintBtn = document.querySelector("#approvePrintBtn");
const uploadOnlyBtn = document.querySelector("#uploadOnlyBtn");
const userPrinterCheckBtn = document.querySelector("#userPrinterCheckBtn");
const startPrintBtn = document.querySelector("#startPrintBtn");

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
    state.autopilot = workspace.autopilot || {};

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
  renderSetup();
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

function renderSetup() {
  const autopilot = state.autopilot || {};
  const checks = autopilot.checks || [];
  const actions = autopilot.actions || [];
  const guardrails = autopilot.guardrails || [];
  setHtml("#autopilotScore", autopilot.summary || "Setup readiness unavailable");
  setHtml(
    "#setupChecks",
    checks.map(renderSetupCheck).join("") || '<div class="empty-state">No setup checks available.</div>',
  );
  setHtml(
    "#setupActions",
    actions.map(renderSetupAction).join("") || '<div class="empty-state">No safe actions available.</div>',
  );
  setHtml(
    "#setupGuardrails",
    guardrails.map((item) => settingRow("Guardrail", item)).join("") || settingRow("Guardrails", "No guardrails reported."),
  );
}

function renderSetupCheck(check) {
  const stateText = check.ok ? "READY" : check.kind === "safety" ? "LOCKED" : "NEEDS SETUP";
  return `
    <article class="setup-card ${check.ok ? "setup-ready" : "setup-needed"}">
      <div class="row">
        <h3>${escapeHtml(check.title)}</h3>
        ${stateBadge(stateText)}
      </div>
      <p class="muted">${escapeHtml(check.detail)}</p>
    </article>
  `;
}

function renderSetupAction(action) {
  return `
    <article class="setup-card">
      <div class="row">
        <h3>${escapeHtml(action.title)}</h3>
        ${stateBadge(action.safe ? "SAFE" : "REVIEW")}
      </div>
      <p class="muted">${escapeHtml(action.detail)}</p>
      <div class="printer-actions">
        <button type="button" data-autopilot-action="${escapeAttr(action.id)}">${escapeHtml(action.title)}</button>
      </div>
    </article>
  `;
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
  const runtime = state.settings.runtime || {};
  const ports = runtime.ports || {};
  const serviceUrls = runtime.service_urls || {};
  const duplicatePorts = runtime.duplicate_ports || {};
  const safetyLocks = state.printers
    .filter(printerLocked)
    .map((printer) => settingRow(`${printer.name} Safety Lock`, lockReason(printer)))
    .join("");
  setHtml(
    "#settingsPage",
    [
      `
        <form id="runtimeSettingsForm" class="settings-form">
          <div class="settings-toolbar">
            <div>
              <h3>Runtime Ports</h3>
              <p class="muted">Saved to ${escapeHtml(runtime.config_path || state.settings.runtime_config || "configs/runtime.local.yaml")}</p>
              <p class="muted">API/web port changes apply on the next launcher restart; worker ports are saved for their services.</p>
            </div>
            <div class="actions">
              <button type="button" id="autoPortsBtn">Auto Assign Open Ports</button>
              <button type="submit">Save Ports</button>
            </div>
          </div>
          <label>
            <span>API Host</span>
            <input name="api_host" value="${escapeAttr(runtime.api_host || "127.0.0.1")}" />
          </label>
          <div class="settings-grid">
            ${Object.entries(ports)
              .map(([name, port]) => runtimePortInput(name, port, duplicatePorts))
              .join("")}
          </div>
          <label>
            <span>Moonraker Scan Ports</span>
            <input name="moonraker_scan_ports" value="${escapeAttr((runtime.moonraker_scan_ports || []).join(", "))}" />
          </label>
          <div class="settings-grid">
            ${Object.entries(serviceUrls)
              .map(([name, url]) => runtimeUrlInput(name, url))
              .join("")}
          </div>
        </form>
      `,
      `
        <section class="section">
          <h2>Printer Connections</h2>
          <div class="settings-grid">
            ${state.printers.map(printerConnectionInput).join("")}
          </div>
        </section>
      `,
      `<section class="section">${[
        settingRow("Dry Run Printers", String(state.settings.dry_run_printers)),
        settingRow("Printers Config", state.settings.printers_config),
        settingRow("Services Config", state.settings.services_config),
        settingRow("Storage", state.settings.storage_dir),
        settingRow("Database", state.health.database),
        safetyLocks || settingRow("Safety Locks", "No locked printers configured"),
      ].join("")}</section>`,
    ].join(""),
  );
}

function runtimePortInput(name, port, duplicatePorts) {
  const duplicate = Object.entries(duplicatePorts).some(([, names]) => names.includes(name));
  return `
    <label class="${duplicate ? "port-warning" : ""}">
      <span>${escapeHtml(labelize(name))}</span>
      <input name="port:${escapeAttr(name)}" type="number" min="1" max="65535" value="${escapeAttr(port)}" />
      ${duplicate ? '<small>Duplicate port</small>' : ""}
    </label>
  `;
}

function runtimeUrlInput(name, url) {
  return `
    <label>
      <span>${escapeHtml(labelize(name))} URL</span>
      <input name="url:${escapeAttr(name)}" value="${escapeAttr(url)}" />
    </label>
  `;
}

function printerConnectionInput(printer) {
  const port = portFromUrl(printer.base_url);
  const locked = printerLocked(printer);
  const cameraUrl = printer.capabilities?.camera_url || "";
  return `
    <article class="setting-row">
      <div class="row">
        <strong>${escapeHtml(printer.name)}</strong>
        ${locked ? stateBadge("LOCKED") : stateBadge("MOONRAKER")}
      </div>
      <p class="muted">${escapeHtml(printer.base_url || "No Moonraker URL configured")}</p>
      <form class="printer-port-form" data-printer-port-form="${escapeAttr(printer.id)}">
        <label>
          <span>Moonraker Port</span>
          <input name="port" type="number" min="1" max="65535" value="${escapeAttr(port)}" ${locked ? "disabled" : ""} />
        </label>
        <button type="submit" ${locked ? "disabled" : ""}>Save Printer Port</button>
      </form>
      <form class="printer-camera-form" data-printer-camera-form="${escapeAttr(printer.id)}">
        <label>
          <span>Camera URL</span>
          <input name="camera_url" value="${escapeAttr(cameraUrl)}" placeholder="http://printer-or-camera:8080/?action=stream" />
        </label>
        <button type="submit">Save Camera URL</button>
      </form>
      <p class="muted">
        Camera URLs save as local metadata. Locked printers remain hidden from Observe and are not probed.
      </p>
    </article>
  `;
}

function renderPlugins() {
  const plugins = [
    ["Moonraker", "Printer API control, status, upload, telemetry", "active"],
    ["Autopilot Setup", "Readiness checks, safe setup actions, and agent plan artifacts", "active"],
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
    "Add model endpoint picker from /v1/models",
    "Add DesignSpec fields for dimensions, constraints, tolerances, material, and target printer",
    "Add executable CAD worker with source, preview, bounding box, volume, and export validation",
    "Add reviewed PrusaSlicer profiles for T1-A, T1-B, and V400",
    "Add slicer compiler evidence: version, command, profile hash, warnings, estimates, and G-code hash",
    "Add G-code semantic analyzer for bounds, thermal commands, extrusion, object labels, and blocked commands",
    "Add Moonraker webcam discovery plus snapshot evidence at printer-check, start, anomaly, complete, and failure gates",
    "Add Spoolman/OpenPrintTag-ready material and spool readiness gates",
    "Add Moonraker telemetry subscriber and printer digital twin records",
    "Add plugin permissions/trust manifest for agentic OS tools",
    "Add 3MF print-contract import/export with model, profile, material, approvals, and evidence references",
    "Add production planner with printer eligibility, material/nozzle matching, ETA, priority, and risk",
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
    "UPLOAD_ONLY",
    "USER_CHECKED_PRINTER_UI",
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
    !hasJob ||
    job.state === "MODEL_APPROVAL" ||
    job.state === "PRINT_APPROVAL" ||
    job.state === "SELECT_PRINTER" ||
    job.state === "UPLOAD_ONLY" ||
    job.state === "USER_CHECKED_PRINTER_UI" ||
    job.state === "START_PRINT" ||
    job.state === "COMPLETE";
  approveModelBtn.disabled = !hasJob || job.state !== "MODEL_APPROVAL";
  approvePrintBtn.disabled = !hasJob || job.state !== "PRINT_APPROVAL";
  uploadOnlyBtn.disabled = !hasJob || (job.state !== "SELECT_PRINTER" && job.state !== "UPLOAD_ONLY");
  userPrinterCheckBtn.disabled =
    !hasJob || (job.state !== "UPLOAD_ONLY" && job.state !== "USER_CHECKED_PRINTER_UI");
  startPrintBtn.disabled =
    !hasJob || (job.state !== "USER_CHECKED_PRINTER_UI" && job.state !== "START_PRINT");
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

function labelize(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function portFromUrl(value) {
  try {
    const url = new URL(value);
    if (url.port) {
      return Number(url.port);
    }
    return url.protocol === "https:" ? 443 : 80;
  } catch {
    return 80;
  }
}

function runtimePayloadFromForm(form) {
  const data = new FormData(form);
  const payload = {
    api_host: data.get("api_host") || "127.0.0.1",
    ports: {},
    service_urls: {},
    moonraker_scan_ports: [],
  };
  for (const [name, value] of data.entries()) {
    if (name.startsWith("port:")) {
      payload.ports[name.slice(5)] = Number(value);
    }
    if (name.startsWith("url:")) {
      payload.service_urls[name.slice(4)] = String(value);
    }
  }
  payload.moonraker_scan_ports = String(data.get("moonraker_scan_ports") || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((port) => Number.isInteger(port) && port > 0);
  return payload;
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

  const autoPortsButton = event.target.closest("#autoPortsBtn");
  if (autoPortsButton) {
    autoPortsButton.disabled = true;
    autoPortsButton.textContent = "Finding Ports";
    await api("/api/settings/runtime/auto-ports", {
      method: "POST",
      body: JSON.stringify({ start: 10000, end: 60000, randomize: true }),
    });
    await refresh();
  }

  const autopilotButton = event.target.closest("[data-autopilot-action]");
  if (autopilotButton) {
    const actionId = autopilotButton.dataset.autopilotAction;
    autopilotButton.disabled = true;
    autopilotButton.textContent = "Running";
    await api(`/api/autopilot/actions/${actionId}`, {
      method: "POST",
      body: JSON.stringify({ note: "Triggered from Hermes OS Autopilot page." }),
    });
    await refresh();
  }
});

document.addEventListener("submit", async (event) => {
  const runtimeForm = event.target.closest("#runtimeSettingsForm");
  if (runtimeForm) {
    event.preventDefault();
    await api("/api/settings/runtime", {
      method: "PATCH",
      body: JSON.stringify(runtimePayloadFromForm(runtimeForm)),
    });
    await refresh();
  }

  const printerPortForm = event.target.closest("[data-printer-port-form]");
  if (printerPortForm) {
    event.preventDefault();
    await api(`/api/printers/${printerPortForm.dataset.printerPortForm}/moonraker-port`, {
      method: "PATCH",
      body: JSON.stringify({ port: Number(new FormData(printerPortForm).get("port")) }),
    });
    await refresh();
  }

  const printerCameraForm = event.target.closest("[data-printer-camera-form]");
  if (printerCameraForm) {
    event.preventDefault();
    await api(`/api/printers/${printerCameraForm.dataset.printerCameraForm}/camera-url`, {
      method: "PATCH",
      body: JSON.stringify({ camera_url: new FormData(printerCameraForm).get("camera_url") || "" }),
    });
    await refresh();
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

uploadOnlyBtn.addEventListener("click", async () => {
  await api(`/api/jobs/${state.activeJobId}/upload-only`, {
    method: "POST",
    body: JSON.stringify({ target_printer_id: printerSelect.value || null }),
  });
  await refresh();
});

userPrinterCheckBtn.addEventListener("click", async () => {
  await api(`/api/jobs/${state.activeJobId}/user-printer-check`, {
    method: "POST",
    body: JSON.stringify({
      checked: true,
      note: "User confirmed printer UI or camera from web dashboard.",
    }),
  });
  await refresh();
});

startPrintBtn.addEventListener("click", async () => {
  await api(`/api/jobs/${state.activeJobId}/start-print`, {
    method: "POST",
    body: "{}",
  });
  await refresh();
});

refresh();
