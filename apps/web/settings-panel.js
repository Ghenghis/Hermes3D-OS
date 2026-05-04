const DEFAULT_UI_SETTINGS = {
  font_scale: 1.0,
  font_family: "system-ui",
  theme: "midnight",
  telemetry_enabled: false,
};

const FONT_FAMILY_OPTIONS = [
  ["system-ui", "System UI"],
  ["sans-serif", "Sans Serif"],
  ["monospace", "Monospace"],
  ["serif", "Serif"],
];

let uiSettings = { ...DEFAULT_UI_SETTINGS };

async function loadUiSettings() {
  try {
    const cached = localStorage.getItem("hermes3d-ui-settings");
    if (cached) {
      uiSettings = { ...DEFAULT_UI_SETTINGS, ...JSON.parse(cached) };
    }
    const response = await fetch("/api/settings/ui");
    if (response.ok) {
      const serverSettings = await response.json();
      const localOverrides = cached ? JSON.parse(cached) : {};
      uiSettings = { ...DEFAULT_UI_SETTINGS, ...serverSettings, ...localOverrides };
      localStorage.setItem("hermes3d-ui-settings", JSON.stringify(uiSettings));
    }
  } catch (error) {
    console.error("Failed to load UI settings:", error);
  }
  applyUiSettings();
  renderSettingsPanel();
}

async function saveUiSettings(updates) {
  Object.assign(uiSettings, updates);
  localStorage.setItem("hermes3d-ui-settings", JSON.stringify(uiSettings));
  try {
    const response = await fetch("/api/settings/ui", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (response.ok) {
      const serverSettings = await response.json();
      uiSettings = { ...DEFAULT_UI_SETTINGS, ...serverSettings, ...updates };
      localStorage.setItem("hermes3d-ui-settings", JSON.stringify(uiSettings));
      return true;
    }
  } catch (error) {
    console.error("Failed to save UI settings:", error);
  }
  return false;
}

function applyUiSettings() {
  document.documentElement.style.setProperty("--font-scale", uiSettings.font_scale);
  document.body.style.fontFamily = uiSettings.font_family;
  document.body.dataset.theme = uiSettings.theme;
}

function resetUiSettings() {
  uiSettings = { ...DEFAULT_UI_SETTINGS };
  saveUiSettings(DEFAULT_UI_SETTINGS);
  applyUiSettings();
}

function renderSettingsPanel() {
  const panel = document.getElementById("uiSettingsContainer");
  if (!panel) return;

  panel.innerHTML = `
    <div class="settings-grid">
      <article class="setting-row">
        <label>
          <strong>Font Scale</strong>
          <input type="range" id="fontScaleSlider" min="0.5" max="2.0" step="0.1" value="${parseFloat(uiSettings.font_scale).toFixed(1)}" />
          <span id="fontScaleValue">${parseFloat(uiSettings.font_scale).toFixed(1)}x</span>
        </label>
        <button type="button" data-reset="font_scale">Reset</button>
      </article>

      <article class="setting-row">
        <label>
          <strong>Font Family</strong>
          <select id="fontFamilySelect">
            ${FONT_FAMILY_OPTIONS.map(([id, label]) => 
              `<option value="${id}" ${uiSettings.font_family === id ? "selected" : ""}>${label}</option>`
            ).join("")}
          </select>
        </label>
        <button type="button" data-reset="font_family">Reset</button>
      </article>

      <article class="setting-row">
        <label>
          <strong>Theme</strong>
          <select id="uiPanelThemeSelect">
            <option value="midnight" ${uiSettings.theme === "midnight" ? "selected" : ""}>Midnight</option>
            <option value="alloy" ${uiSettings.theme === "alloy" ? "selected" : ""}>Alloy</option>
            <option value="ember" ${uiSettings.theme === "ember" ? "selected" : ""}>Ember</option>
            <option value="forest" ${uiSettings.theme === "forest" ? "selected" : ""}>Forest</option>
          </select>
        </label>
        <button type="button" data-reset="theme">Reset</button>
      </article>

      <article class="setting-row">
        <label>
          <strong>Telemetry</strong>
          <select id="telemetrySelect">
            <option value="false" ${!uiSettings.telemetry_enabled ? "selected" : ""}>Disabled</option>
            <option value="true" ${uiSettings.telemetry_enabled ? "selected" : ""}>Enabled</option>
          </select>
        </label>
        <button type="button" data-reset="telemetry_enabled">Reset</button>
      </article>
    </div>
  `;

  panel.querySelector("#fontScaleSlider")?.addEventListener("input", (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById("fontScaleValue").textContent = value.toFixed(1) + "x";
    uiSettings.font_scale = value;
    applyUiSettings();
    saveUiSettings({ font_scale: value });
  });

  panel.querySelector("#fontFamilySelect")?.addEventListener("change", (e) => {
    uiSettings.font_family = e.target.value;
    applyUiSettings();
    saveUiSettings({ font_family: e.target.value });
  });

  panel.querySelector("#uiPanelThemeSelect")?.addEventListener("change", (e) => {
    uiSettings.theme = e.target.value;
    applyUiSettings();
    saveUiSettings({ theme: e.target.value });
  });

  panel.querySelector("#telemetrySelect")?.addEventListener("change", (e) => {
    uiSettings.telemetry_enabled = e.target.value === "true";
    saveUiSettings({ telemetry_enabled: uiSettings.telemetry_enabled });
  });

  panel.querySelectorAll("[data-reset]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.reset;
      uiSettings[key] = DEFAULT_UI_SETTINGS[key];
      applyUiSettings();
      saveUiSettings({ [key]: uiSettings[key] });
      renderSettingsPanel();
    });
  });
}

window.hermesSettingsPanel = {
  load: loadUiSettings,
  render: renderSettingsPanel,
  reset: resetUiSettings,
  getSettings: () => uiSettings,
};
