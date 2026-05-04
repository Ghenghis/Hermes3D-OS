const THEME_OPTIONS = [
  ["midnight", "Midnight", "Deep command-center dark with blue and teal accents"],
  ["alloy", "Alloy", "Neutral graphite workshop theme"],
  ["ember", "Ember", "Warm dark theme for long shop sessions"],
  ["forest", "Forest", "Green dark theme for calmer monitoring"],
];
const DEFAULT_THEME = "midnight";
const PAGE_IDS = [
  "sources",
  "dashboard",
  "setup",
  "design",
  "generation",
  "jobs",
  "printers",
  "observe",
  "voice",
  "agents",
  "learning",
  "artifacts",
  "approvals",
  "plugins",
  "settings",
  "roadmap",
];

const state = {
  activePage: pageFromHash(),
  theme: savedTheme(),
  jobs: [],
  printers: [],
  artifacts: [],
  approvals: [],
  events: [],
  settings: {},
  autopilot: {},
  generationStack: {},
  learningMode: {},
  agenticWork: {},
  providerStatus: {},
  health: {},
  printerStatus: {},
  activeJobId: null,
};

applyTheme(state.theme);

const healthEl = document.querySelector("#health");
const themeSelect = document.querySelector("#themeSelect");
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

async function apiForm(path, formData) {
  const response = await fetch(path, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || response.statusText);
  }
  return response.json();
}

async function refresh() {
  try {
    const [workspace, generationStack, learningMode, agenticWork, providerStatus] = await Promise.all([
      api("/api/workspace"),
      api("/api/generation-stack/status").catch(() => ({})),
      api("/api/learning-mode/status").catch(() => ({})),
      api("/api/agentic-work/status").catch(() => ({})),
      api("/api/providers/status").catch(() => ({})),
    ]);
    state.health = workspace.health;
    state.settings = workspace.settings;
    state.printers = workspace.printers;
    state.jobs = workspace.jobs;
    state.artifacts = workspace.artifacts;
    state.approvals = workspace.approvals;
    state.events = workspace.events;
    state.autopilot = workspace.autopilot || {};
    state.generationStack = generationStack || {};
    state.learningMode = learningMode || {};
    state.agenticWork = agenticWork || {};
    state.providerStatus = providerStatus || {};

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
  renderThemeSelect();
  renderPrinterSelect();
  renderDashboard();
  renderSetup();
  renderDesign();
  renderGenerationStack();
  renderAgenticWork();
  renderLearningMode();
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

function savedTheme() {
  const stored = localStorage.getItem("hermes3d-theme");
  return THEME_OPTIONS.some(([id]) => id === stored) ? stored : DEFAULT_THEME;
}

function applyTheme(theme) {
  const nextTheme = THEME_OPTIONS.some(([id]) => id === theme) ? theme : DEFAULT_THEME;
  state.theme = nextTheme;
  document.body.dataset.theme = nextTheme;
  localStorage.setItem("hermes3d-theme", nextTheme);
}

function renderThemeSelect() {
  if (!themeSelect) {
    return;
  }
  themeSelect.value = state.theme;
}

function pageFromHash() {
  const page = window.location.hash.replace(/^#/, "");
  return PAGE_IDS.includes(page) ? page : "sources";
}

function setActivePage(page) {
  state.activePage = PAGE_IDS.includes(page) ? page : "sources";
  const nextHash = `#${state.activePage}`;
  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, "", nextHash);
  }
}

function renderGenerationStack() {
  const stack = state.generationStack || {};
  const engines = stack.engines || [];
  const steps = stack.pipeline_steps || [];
  const truthGate = stack.printability_truth_gate || [];
  const workflows = stack.workflows || [];
  const configured = stack.configured || {};
  const readiness = stack.readiness || {};
  const comfyProbe = stack.runtime_reachable?.comfyui || {};
  setHtml(
    "#generationStackStatus",
    [
      `<div class="readiness-grid">
        ${readinessCard("ComfyUI", comfyProbe.reachable ? "CONNECTED" : configured.comfyui ? "URL SET" : "NEEDS URL", comfyProbe.reason || stack.service_urls?.comfyui || "Backend not configured", comfyProbe.reachable ? "ok" : configured.comfyui ? "pending" : "bad")}
        ${readinessCard("Workflows", readiness.workflows_ready ? "READY" : "OPERATOR REQUIRED", readiness.workflows_ready ? "Exported API workflows found" : "Replace placeholders with exported ComfyUI API workflows", readiness.workflows_ready ? "ok" : "pending")}
        ${readinessCard("Toolchain", readiness.toolchain_ready ? "READY" : "MISSING TOOLS", `Blender: ${configured.blender ? "found" : "missing"} · PrusaSlicer: ${configured.prusaslicer ? "found" : "missing"}`, readiness.toolchain_ready ? "ok" : "pending")}
        ${readinessCard("Truth Gate", readiness.printability_truth_gate_ready ? "PASSING" : "PENDING", "No generated mesh becomes printable until every required gate passes", readiness.printability_truth_gate_ready ? "ok" : "pending")}
      </div>`,
      `<div class="section"><h2>Services</h2>
        ${settingRow("Primary Engine", stack.primary_engine || "trellis2")}
        ${settingRow("Comparison Engine", stack.comparison_engine || "hunyuan3d21")}
        ${settingRow("Fast Preview", stack.fast_preview_engine || "triposr")}
        ${settingRow("ComfyUI", stack.service_urls?.comfyui || "Not configured")}
        ${settingRow("TRELLIS.2", stack.service_urls?.trellis || "Not configured")}
        ${settingRow("Hunyuan3D-2.1", stack.service_urls?.hunyuan3d || "Not configured")}
        ${settingRow("TripoSR", stack.service_urls?.triposr || "Not configured")}
      </div>`,
      `<div class="section"><h2>Workflow Readiness</h2>${workflows.map(renderWorkflowStatus).join("") || '<div class="empty-state">No workflows configured.</div>'}</div>`,
      `<div class="section"><h2>Engines</h2>${engines.map(renderGenerationEngine).join("")}</div>`,
      `<div class="section"><h2>Pipeline</h2>${steps.map((step, index) => `<article class="roadmap-item"><strong>${index + 1}</strong><span>${escapeHtml(step.label)}</span></article>`).join("")}</div>`,
    ].join(""),
  );
  setHtml(
    "#generationTruthGate",
    truthGate
      .map((gate, index) => `<article class="roadmap-item"><strong>${index + 1}</strong><span>${escapeHtml(gate.label)}</span></article>`)
      .join("") || '<div class="empty-state">Truth gate unavailable.</div>',
  );
  const jobOptions = state.jobs
    .map((job) => `<option value="${escapeAttr(job.id)}">#${job.id} ${escapeHtml(job.title)}</option>`)
    .join("");
  setHtml("#generationJobSelect", jobOptions || '<option value="">Create a job first</option>');
  setHtml(
    "#generationEngineSelect",
    engines
      .map((engine) => `<option value="${escapeAttr(engine.id)}">${escapeHtml(engine.label)} · ${escapeHtml(engine.role)}</option>`)
      .join("") || '<option value="trellis2">TRELLIS.2</option>',
  );
}

function renderGenerationEngine(engine) {
  return `
    <article class="plugin-card">
      <div class="row">
        <h3>${escapeHtml(engine.label)}</h3>
        ${stateBadge(String(engine.role || "engine").toUpperCase())}
      </div>
      <p class="muted">${escapeHtml(engine.notes || "")}</p>
      <p class="muted">${escapeHtml((engine.outputs || []).join(", "))}</p>
    </article>
  `;
}

function readinessCard(label, status, detail, tone) {
  return `
    <article class="status-card status-${escapeAttr(tone)}">
      <div class="row">
        <strong>${escapeHtml(label)}</strong>
        ${stateBadge(status)}
      </div>
      <p class="muted">${escapeHtml(detail)}</p>
    </article>
  `;
}

function renderWorkflowStatus(workflow) {
  const status = workflow.ready ? "READY" : workflow.operator_required ? "OPERATOR REQUIRED" : "PENDING";
  return `
    <article class="status-card ${workflow.ready ? "status-ok" : "status-pending"}">
      <div class="row">
        <strong>${escapeHtml(workflow.engine)}</strong>
        ${stateBadge(status)}
      </div>
      <p class="muted">${escapeHtml(workflow.reason || "")}</p>
      <p class="muted">${escapeHtml(workflow.workflow_path || "")}</p>
    </article>
  `;
}

function renderAgenticWork() {
  const work = state.agenticWork || {};
  const next = work.next_tick?.topic || {};
  setHtml(
    "#agenticStatus",
    [
      settingRow("Mode", work.mode || "active-safe-research-and-planning"),
      settingRow("Summary", work.summary || "Agents research, plan, and propose changes while hardware stays gated."),
      settingRow("Next Tick", next.title || "Next queued research report"),
      settingRow("Latest Report", work.latest_report?.name || "No report yet"),
      `<div class="section"><h2>Vision Contract</h2>${renderAgenticVisionContract(work.vision_contract || {})}</div>`,
      `<div class="section"><h2>Provider Readiness</h2>${renderProviderReadiness(work.provider_readiness || state.providerStatus || {})}</div>`,
      `<div class="section"><h2>Safety Policy</h2>${renderAgenticPolicy(work.safety_policy || {})}</div>`,
    ].join(""),
  );
  setHtml(
    "#agenticAgents",
    (work.agents || []).map(renderAgentCard).join("") || '<div class="empty-state">No active agents reported.</div>',
  );
  setHtml(
    "#agenticQueue",
    (work.work_queue || []).map(renderAgenticQueueItem).join("") || '<div class="empty-state">No work queued.</div>',
  );
  setHtml(
    "#agenticBlockers",
    (work.blockers || []).map(renderAgenticBlocker).join("") || '<div class="empty-state">No blockers reported.</div>',
  );
}

function renderProviderReadiness(status) {
  const providers = status.providers || {};
  const cards = Object.values(providers)
    .map(
      (provider) => `
        <article class="setup-card ${provider.ready ? "setup-ready" : provider.required ? "setup-needed" : "status-pending"}">
          <div class="row">
            <strong>${escapeHtml(provider.label || provider.id)}</strong>
            ${stateBadge(provider.ready ? "READY" : provider.required ? "REQUIRED" : "OPTIONAL")}
          </div>
          <p class="muted">${escapeHtml(provider.detail || "")}</p>
          <p class="muted">${escapeHtml(provider.model || provider.model_family || "")} · ${escapeHtml(provider.transport || provider.base_url || "")}</p>
        </article>
      `,
    )
    .join("");
  return cards || '<div class="empty-state">No provider readiness reported.</div>';
}

function renderAgenticVisionContract(contract) {
  const flags = contract.required_flags || {};
  const rows = [
    settingRow("Required For All Agents", contract.required_for_all_agents ? "yes" : "no"),
    settingRow("Primary Vision", contract.primary_provider || "minimax-mcp"),
    settingRow("Additional Reasoning", contract.additional_reasoning_provider || "deepseek-v4-pro"),
    settingRow("DeepSeek Replaces Vision", contract.deepseek_may_replace_vision ? "yes" : "no"),
    settingRow("Vision", flags.vision ? "yes" : "no"),
    settingRow("Multimodal Input", flags.multimodal_input ? "yes" : "no"),
    settingRow("Evidence Required", flags.evidence_required ? "yes" : "no"),
  ];
  const inputs = (contract.required_inputs || []).join(", ");
  const outputs = (contract.required_outputs || []).join(", ");
  return [
    ...rows,
    settingRow("Inputs", inputs || "image, screenshot, mesh, slicer, camera"),
    settingRow("Outputs", outputs || "multimodal evidence summaries"),
  ].join("");
}

function renderAgenticPolicy(policy) {
  return Object.entries(policy)
    .map(([key, value]) => settingRow(key.replaceAll("_", " "), value ? "yes" : "no"))
    .join("");
}

function renderAgentCard(agent) {
  return `
    <article class="setup-card">
      <div class="row">
        <h3>${escapeHtml(agent.label || agent.id)}</h3>
        ${stateBadge(String(agent.status || "watching").toUpperCase())}
      </div>
      <p class="muted">${escapeHtml(agent.current_focus || "")}</p>
      <p class="muted">Provider: ${escapeHtml(agent.provider || "minimax")} / ${escapeHtml(agent.model || "minimax-mcp")} · Vision: ${agent.vision ? "yes" : "no"} via ${escapeHtml(agent.vision_provider || "minimax-mcp")}</p>
      <p class="muted">Evidence: ${agent.evidence_required ? "required" : "optional"} · Multimodal: ${agent.multimodal_input ? "yes" : "no"} · Camera: ${agent.camera_required ? "required" : "as applicable"}</p>
      <p class="muted">Vision: ${escapeHtml((agent.vision_capabilities || []).join(", "))}</p>
      <p class="muted">Safe: ${escapeHtml((agent.safe_actions || []).join(", "))}</p>
    </article>
  `;
}

function renderAgenticQueueItem(item) {
  return `
    <article class="setup-card">
      <div class="row">
        <h3>${escapeHtml(item.title)}</h3>
        ${stateBadge(String(item.status || "queued").toUpperCase())}
      </div>
      <p class="muted">${escapeHtml(item.type || "work")} · ${escapeHtml(item.owner || "agent")} · ${escapeHtml(item.priority || "normal")}</p>
      <p class="muted">${escapeHtml(item.next_action || "")}</p>
    </article>
  `;
}

function renderAgenticBlocker(blocker) {
  const blocked = blocker.blocked === undefined ? true : blocker.blocked;
  return `
    <article class="setup-card ${blocked ? "setup-needed" : "setup-ready"}">
      <div class="row">
        <h3>${escapeHtml(blocker.title)}</h3>
        ${stateBadge(blocked ? String(blocker.severity || "BLOCKED").toUpperCase() : "CLEAR")}
      </div>
      <p class="muted">${escapeHtml(blocker.detail || "")}</p>
    </article>
  `;
}

function renderLearningMode() {
  const learning = state.learningMode || {};
  const topics = learning.topics || [];
  const reports = learning.latest_reports || [];
  const nextTopic = learning.next_topic || {};
  setHtml(
    "#learningStatus",
    [
      settingRow("Mode", learning.mode || "idle-research-reporting"),
      settingRow("Cadence", learning.cadence || "operator-triggered"),
      settingRow("Reports Directory", learning.reports_dir || "storage/learning"),
      settingRow("Next Topic", nextTopic.title || "AI 3D Generation Watch"),
      settingRow("Agents", (learning.agents || []).join(", ") || "research_agent"),
      `<div class="section"><h2>Safety Scope</h2>${(learning.safe_scope || []).map((item) => settingRow("Scope", item)).join("")}</div>`,
    ].join(""),
  );
  setHtml(
    "#learningTopics",
    topics.map(renderLearningTopic).join("") || '<div class="empty-state">No learning topics configured.</div>',
  );
  setHtml(
    "#learningReports",
    reports
      .map(
        (report) => `
          <article class="artifact-card">
            <div class="row">
              <strong>${escapeHtml(report.name || "learning report")}</strong>
              ${stateBadge("MD")}
            </div>
            <p class="muted">${escapeHtml(report.path || "")}</p>
            <p class="muted">${escapeHtml(report.updated_at || "")}</p>
          </article>
        `,
      )
      .join("") || '<div class="empty-state">No learning reports yet.</div>',
  );
}

function renderLearningTopic(topic) {
  return `
    <article class="setup-card">
      <div class="row">
        <h3>${escapeHtml(topic.title)}</h3>
        ${stateBadge(String(topic.priority || "queued").toUpperCase())}
      </div>
      <p class="muted">${escapeHtml(topic.why || "")}</p>
      <p class="muted">Agent: ${escapeHtml(topic.agent || "research_agent")}</p>
    </article>
  `;
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
  const visualEvidenceJobSelect = document.querySelector("#visualEvidenceJobSelect");
  if (visualEvidenceJobSelect) {
    const jobOptions = state.jobs
      .map((job) => `<option value="${escapeAttr(job.id)}">${escapeHtml(job.title)} (#${job.id})</option>`)
      .join("");
    visualEvidenceJobSelect.innerHTML = jobOptions || '<option value="">Create a job first</option>';
  }
  const rows = state.artifacts
    .map((artifact) => renderArtifactCard(artifact, true))
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
      renderAppearanceSettings(),
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
    ["TRELLIS.2", "Primary image-to-3D generation engine through ComfyUI", "planned"],
    ["Hunyuan3D-2.1", "Comparison/fallback image-to-3D engine", "planned"],
    ["TripoSR", "Fast preview fallback for early shape review", "planned"],
    ["Blender / Trimesh", "Mesh repair, validation, previews, exports", "planned"],
    ["Azure Voice", "Agent TTS/STT, safety alerts, preview, and transcripts", "active"],
    ["MiniMax-MCP Vision", "Required multimodal layer for image, screenshot, mesh, slicer, and camera evidence", "active"],
    ["DeepSeek V4", "Optional planning, CAD reasoning, research summaries, roadmaps, and reports", "ready"],
    ["Visual Evidence", "Job-scoped evidence uploads, local file serving, and thumbnails", "active"],
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
    "Complete OS shell navigation and visual proof: themes, page deep links, responsive layout, UI screenshots",
    "Add model endpoint picker from /v1/models",
    "Add DesignSpec fields for dimensions, constraints, tolerances, material, and target printer",
    "Add executable CAD worker with source, preview, bounding box, volume, and export validation",
    "Add full image-to-print generation stack: TRELLIS.2 primary, Hunyuan3D-2.1 comparison, TripoSR preview",
    "Add Printability Truth Gate for generated meshes before slicer approval",
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
      <h2>Visual Evidence</h2>
      <div class="artifact-list">${renderVisualEvidence(job.artifacts)}</div>
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
      .map((artifact) => renderArtifactCard(artifact, false))
      .join("") || '<div class="empty-state">No artifacts yet.</div>'
  );
}

function renderAppearanceSettings() {
  return `
    <section class="section">
      <div class="settings-toolbar">
        <div>
          <h3>Appearance</h3>
          <p class="muted">Saved in this browser for the Hermes OS shell.</p>
        </div>
      </div>
      <div class="theme-grid">
        ${THEME_OPTIONS.map(
          ([id, label, description]) => `
            <button type="button" class="theme-choice ${state.theme === id ? "active" : ""}" data-theme-choice="${escapeAttr(id)}">
              <strong>${escapeHtml(label)}</strong>
              <span>${escapeHtml(description)}</span>
            </button>
          `,
        ).join("")}
      </div>
    </section>
  `;
}

function renderVisualEvidence(artifacts) {
  return (
    artifacts
      .filter((artifact) => artifact.is_visual || artifact.metadata?.evidence)
      .map((artifact) => renderArtifactCard(artifact, false))
      .join("") || '<div class="empty-state">No visual evidence attached yet.</div>'
  );
}

function renderArtifactCard(artifact, includeJob) {
  const evidence = artifact.metadata?.evidence || {};
  return `
    <article class="artifact-card">
      <div class="row">
        <strong>${escapeHtml(evidence.label || artifact.kind)}</strong>
        <span class="muted">${includeJob ? `Job #${escapeHtml(artifact.job_id)}` : `#${escapeHtml(artifact.id)}`}</span>
      </div>
      ${renderEvidenceAttachment(artifact)}
      ${includeJob ? `<p>${escapeHtml(artifact.job_title || "Untitled job")}</p>` : ""}
      <p class="muted">${escapeHtml(evidence.role || artifact.kind)}${evidence.agent_id ? ` · ${escapeHtml(evidence.agent_id)}` : ""}</p>
      <p class="muted">${escapeHtml(artifact.path)}</p>
    </article>
  `;
}

function renderEvidenceAttachment(artifact) {
  if (!artifact.is_visual || !artifact.file_url) {
    return "";
  }
  const evidence = artifact.metadata?.evidence || {};
  const role = evidence.role || artifact.kind;
  return `<img class="evidence-thumb" src="${escapeAttr(artifact.file_url)}" alt="${escapeAttr(role)}" loading="lazy" />`;
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
    setActivePage(tab.dataset.page);
    renderTabs();
  });
});

window.addEventListener("hashchange", () => {
  state.activePage = pageFromHash();
  renderTabs();
});

document.addEventListener("click", async (event) => {
  if (!event.target.closest("#page-jobs")) return;
  const jobCard = event.target.closest(".job-card");
  if (jobCard) {
    state.activeJobId = Number(jobCard.dataset.jobId);
    setActivePage("jobs");
    renderAll();
    const jobId = jobCard.dataset.jobId;
    const job = state.jobs.find((j) => String(j.id) === String(jobId)) || { id: jobId };
    const awPayload = {
      tab_id: "jobs",
      kind: "job",
      item_id: String(job.id),
      title: job.title || job.name || `Job #${job.id}`,
      subtitle: job.state || job.status || "",
      status_pill: job.state || job.status || "queued",
      primary_actions: [
        { id: "cancel", label: "Cancel", endpoint: `/api/jobs/${job.id}/cancel`, method: "POST" },
        { id: "retry", label: "Retry", endpoint: `/api/jobs/${job.id}/retry`, method: "POST" },
      ],
      secondary_actions: [],
      panels: [
        {
          id: "details",
          title: "Details",
          body: `Status: ${job.state || job.status || "n/a"}\nNotes: ${job.notes || ""}`,
        },
      ],
      stream_url: null,
    };
    if (window.HermesActionWindow?.dispatch) {
      window.HermesActionWindow.dispatch(awPayload);
    } else {
      document.dispatchEvent(new CustomEvent("actionwindow:render", { detail: awPayload }));
    }
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

  const themeChoice = event.target.closest("[data-theme-choice]");
  if (themeChoice) {
    applyTheme(themeChoice.dataset.themeChoice);
    renderAll();
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

  const generationForm = event.target.closest("#generationForm");
  if (generationForm) {
    event.preventDefault();
    const formData = new FormData(generationForm);
    const jobId = formData.get("job_id");
    if (!jobId) {
      throw new Error("Create or select a job before running generation.");
    }
    await apiForm(`/api/jobs/${jobId}/generate-3d-from-image`, formData);
    state.activeJobId = Number(jobId);
    setActivePage("jobs");
    await refresh();
  }

  const visualEvidenceForm = event.target.closest("#visualEvidenceForm");
  if (visualEvidenceForm) {
    event.preventDefault();
    const formData = new FormData(visualEvidenceForm);
    const jobId = formData.get("job_id");
    if (!jobId) {
      throw new Error("Create or select a job before attaching visual evidence.");
    }
    await apiForm(`/api/jobs/${jobId}/visual-evidence`, formData);
    state.activeJobId = Number(jobId);
    setActivePage("jobs");
    visualEvidenceForm.reset();
    await refresh();
  }

  const learningReportForm = event.target.closest("#learningReportForm");
  if (learningReportForm) {
    event.preventDefault();
    const form = new FormData(learningReportForm);
    await api("/api/learning-mode/report", {
      method: "POST",
      body: JSON.stringify({ enabled: true, topic: form.get("topic") || null }),
    });
    learningReportForm.reset();
    await refresh();
  }

});

document.querySelector("#refreshBtn").addEventListener("click", refresh);

themeSelect?.addEventListener("change", () => {
  applyTheme(themeSelect.value);
  renderAll();
});

document.querySelector("#bootstrapBtn").addEventListener("click", async () => {
  await api("/api/bootstrap", { method: "POST", body: "{}" });
  await refresh();
});

document.querySelector("#learningNextBtn")?.addEventListener("click", async () => {
  await api("/api/learning-mode/next-report", { method: "POST", body: "{}" });
  await refresh();
});

document.querySelector("#agenticTickBtn")?.addEventListener("click", async () => {
  await api("/api/agentic-work/tick", { method: "POST", body: "{}" });
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
  setActivePage("jobs");
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
