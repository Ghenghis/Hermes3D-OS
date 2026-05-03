/**
 * Universal Action Window — every selectable item across every tab renders here.
 *
 * Contract (the same envelope for apps, jobs, printers, agents, artifacts, ...):
 *
 *   {
 *     tab_id: string,
 *     kind: "app" | "job" | "printer" | "agent" | "artifact" | "approval"
 *         | "voice" | "plugin" | "setting" | "model" | "topic",
 *     item_id: string,
 *     title: string,
 *     subtitle?: string,
 *     status_pill?: { text: string, tone: "ok" | "warn" | "err" | "info" },
 *     primary_actions: { id, label, endpoint?, method?, confirm? }[],
 *     secondary_actions?: { id, label, endpoint?, method? }[],
 *     panels: { id, label, body_html?, body_url? }[],
 *     stream_url?: string  // SSE for live progress / logs
 *   }
 *
 * Dispatch from any tab via:
 *   document.dispatchEvent(new CustomEvent("actionwindow:render", { detail: payload }));
 *
 * The Action Window listens globally and renders into #actionWindow.
 */
(function actionWindowModule() {
  "use strict";

  const HOST_ID = "actionWindow";
  const KIND_TONES = { ok: "ok", warn: "warn", err: "err", info: "info" };

  function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function host() {
    return document.getElementById(HOST_ID);
  }

  function renderStatusPill(pill) {
    if (!pill || !pill.text) return "";
    const tone = KIND_TONES[pill.tone] || "info";
    return `<span class="action-window__pill action-window__pill--${tone}">${escapeHtml(pill.text)}</span>`;
  }

  function renderActionButton(action, role) {
    const cls = role === "primary" ? "action-window__btn action-window__btn--primary" : "action-window__btn";
    const dataset = [
      action.id ? `data-action-id="${escapeHtml(action.id)}"` : "",
      action.endpoint ? `data-endpoint="${escapeHtml(action.endpoint)}"` : "",
      action.method ? `data-method="${escapeHtml(action.method)}"` : "",
      action.confirm ? `data-confirm="${escapeHtml(action.confirm)}"` : "",
    ].filter(Boolean).join(" ");
    return `<button type="button" class="${cls}" ${dataset}>${escapeHtml(action.label || action.id || "Action")}</button>`;
  }

  function renderPanels(panels) {
    if (!Array.isArray(panels) || panels.length === 0) return "";
    return panels
      .map((p) => {
        const body = p.body_html != null ? p.body_html : (p.body_url ? `<iframe src="${escapeHtml(p.body_url)}" loading="lazy" class="action-window__iframe"></iframe>` : "");
        return `
          <section class="action-window__panel" data-panel-id="${escapeHtml(p.id || "")}">
            <header class="action-window__panel-head"><strong>${escapeHtml(p.label || p.id || "")}</strong></header>
            <div class="action-window__panel-body">${body}</div>
          </section>`;
      })
      .join("");
  }

  /**
   * Render the universal payload into #actionWindow.
   * Returns the host element for testability.
   */
  function renderActionWindow(payload) {
    const root = host();
    if (!root) return null;
    if (!payload || typeof payload !== "object") {
      root.hidden = true;
      root.innerHTML = "";
      return root;
    }

    const primary = (payload.primary_actions || []).map((a) => renderActionButton(a, "primary")).join("");
    const secondary = (payload.secondary_actions || []).map((a) => renderActionButton(a, "secondary")).join("");

    root.dataset.tabId = payload.tab_id || "";
    root.dataset.kind = payload.kind || "";
    root.dataset.itemId = payload.item_id || "";
    root.innerHTML = `
      <header class="action-window__header">
        <div class="action-window__title-block">
          <h2 class="action-window__title">${escapeHtml(payload.title || "")}</h2>
          ${payload.subtitle ? `<p class="action-window__subtitle">${escapeHtml(payload.subtitle)}</p>` : ""}
          ${renderStatusPill(payload.status_pill)}
        </div>
        <button type="button" class="action-window__close" aria-label="Close" data-action-window-close="">&times;</button>
      </header>
      <div class="action-window__actions">
        ${primary}
        ${secondary ? `<span class="action-window__actions-sep"></span>${secondary}` : ""}
      </div>
      <div class="action-window__panels">
        ${renderPanels(payload.panels)}
      </div>
    `;
    root.hidden = false;
    return root;
  }

  function closeActionWindow() {
    const root = host();
    if (!root) return;
    root.hidden = true;
  }

  // Event-bus listener — any tab can dispatch.
  document.addEventListener("actionwindow:render", (event) => {
    renderActionWindow(event && event.detail ? event.detail : null);
  });

  // Close button delegation.
  document.addEventListener("click", (event) => {
    const btn = event.target && event.target.closest && event.target.closest("[data-action-window-close]");
    if (btn) closeActionWindow();
  });

  // Public API on window for non-module callers.
  window.HermesActionWindow = {
    render: renderActionWindow,
    close: closeActionWindow,
    dispatch(payload) {
      document.dispatchEvent(new CustomEvent("actionwindow:render", { detail: payload }));
    },
  };
})();
