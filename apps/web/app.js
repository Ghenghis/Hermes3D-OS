const state = {
  jobs: [],
  printers: [],
  printerStatus: {},
  activeJobId: null,
};

const healthEl = document.querySelector("#health");
const jobsEl = document.querySelector("#jobs");
const printersEl = document.querySelector("#printers");
const activeJobEl = document.querySelector("#activeJob");
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
    const health = await api("/health");
    healthEl.textContent = health.dry_run_printers
      ? "API online. Printer actions are dry-run."
      : "API online. Real printer actions enabled.";
    state.printers = await api("/api/printers");
    state.jobs = await api("/api/jobs");
    renderPrinters();
    renderJobs();
    await renderActiveJob();
  } catch (error) {
    healthEl.innerHTML = `<span class="error">${escapeHtml(error.message)}</span>`;
  }
}

function renderPrinters() {
  printerSelect.innerHTML = [
    '<option value="">Auto-select first available printer</option>',
    ...state.printers.map(
      (printer) => `<option value="${escapeAttr(printer.id)}">${escapeHtml(printer.name)}</option>`,
    ),
  ].join("");

  printersEl.innerHTML =
    state.printers
      .map(
        (printer) => `
          <article class="printer-card">
            <div class="row">
              <h3>${escapeHtml(printer.name)}</h3>
              <span class="state">${escapeHtml(printer.connector)}</span>
            </div>
            <p class="muted">${escapeHtml(printer.vendor || "Unknown vendor")} ${escapeHtml(printer.model || "")}</p>
            <p class="muted">${escapeHtml(printer.base_url || "No Moonraker URL configured")}</p>
            <div class="printer-actions">
              <button type="button" data-test-printer="${escapeAttr(printer.id)}">Test</button>
            </div>
            ${renderPrinterStatus(printer.id)}
          </article>
        `,
      )
      .join("") || '<div class="empty-state">No printers loaded.</div>';

  document.querySelectorAll("[data-test-printer]").forEach((button) => {
    button.addEventListener("click", async () => {
      const printerId = button.dataset.testPrinter;
      button.disabled = true;
      button.textContent = "Testing";
      state.printerStatus[printerId] = { ok: null, message: "Testing..." };
      renderPrinters();
      try {
        state.printerStatus[printerId] = await api(`/api/printers/${printerId}/status`);
      } catch (error) {
        state.printerStatus[printerId] = { ok: false, message: error.message };
      }
      renderPrinters();
    });
  });
}

function renderJobs() {
  jobsEl.innerHTML =
    state.jobs
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
      .join("") || '<div class="empty-state">No jobs yet.</div>';

  document.querySelectorAll(".job-card").forEach((card) => {
    card.addEventListener("click", async () => {
      state.activeJobId = Number(card.dataset.jobId);
      renderJobs();
      await renderActiveJob();
    });
  });

  if (!state.activeJobId && state.jobs.length) {
    state.activeJobId = state.jobs[0].id;
    renderJobs();
  }
}

async function renderActiveJob() {
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
      <h2>Artifacts</h2>
      <div class="artifact-list">
        ${
          job.artifacts
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
        }
      </div>
    </section>

    <section class="section">
      <h2>Events</h2>
      <div class="event-list">
        ${
          job.events
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
        }
      </div>
    </section>
  `;
}

function setButtons(job) {
  const hasJob = Boolean(job);
  advanceBtn.disabled = !hasJob || job.state === "MODEL_APPROVAL" || job.state === "PRINT_APPROVAL" || job.state === "COMPLETE";
  approveModelBtn.disabled = !hasJob || job.state !== "MODEL_APPROVAL";
  approvePrintBtn.disabled = !hasJob || job.state !== "PRINT_APPROVAL";
}

function stateBadge(value) {
  const cls = value === "COMPLETE" ? "complete" : value.includes("APPROVAL") ? "approval" : "";
  return `<span class="state ${cls}">${escapeHtml(value)}</span>`;
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

