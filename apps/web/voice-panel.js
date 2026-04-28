const voiceState = {
  status: {},
  voices: [],
  transcripts: [],
  recorder: null,
  chunks: [],
  micStatus: "Idle",
};

async function voiceApi(path, options = {}) {
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

async function voiceFormApi(path, formData) {
  const response = await fetch(path, { method: "POST", body: formData });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || response.statusText);
  }
  return response.json();
}

async function refreshVoicePanel() {
  const target = document.querySelector("#voicePanel");
  if (!target) {
    return;
  }
  try {
    const [status, voiceCatalog, transcripts] = await Promise.all([
      voiceApi("/api/speech/status"),
      voiceApi("/api/speech/voices"),
      voiceApi("/api/speech/transcripts?limit=20"),
    ]);
    voiceState.status = status;
    voiceState.voices = voiceCatalog.voices || [];
    voiceState.transcripts = transcripts.items || [];
    renderVoicePanel();
  } catch (error) {
    target.innerHTML = `<div class="empty-state error">${voiceEscape(error.message)}</div>`;
  }
}

function renderVoicePanel() {
  const status = voiceState.status || {};
  const agents = status.agents || [];
  const configured = status.configured;
  document.querySelector("#voicePanel").innerHTML = `
    <div class="voice-shell">
      <section class="voice-status-grid">
        ${voiceSetting("Provider", status.provider || "azure")}
        ${voiceSetting("Azure Region", status.region || "Not configured")}
        ${voiceSetting("Speech Status", configured ? "Ready" : "Missing AZURE_SPEECH_KEY or AZURE_SPEECH_REGION")}
        ${voiceSetting("Voices", String(voiceState.voices.length || 0))}
        ${voiceSetting("SSML", String(Boolean(status.enable_ssml)))}
        ${voiceSetting("STT", String(Boolean(status.enable_stt)))}
      </section>

      <section class="voice-controls">
        <div class="panel-header">
          <h2>Agent Voices</h2>
          <span class="muted">Per-agent assignment and preview</span>
        </div>
        <div class="voice-agent-grid">
          ${agents.map(renderVoiceAgent).join("")}
        </div>
      </section>

      <section class="voice-controls">
        <div class="panel-header">
          <h2>Push To Talk</h2>
          <span id="voiceMicStatus" class="muted">${voiceEscape(voiceState.micStatus)}</span>
        </div>
        <div class="voice-command-grid">
          <button type="button" id="voiceRecordBtn">${voiceState.recorder ? "Stop Recording" : "Start Recording"}</button>
          <label>
            <span>Wake/listen mode</span>
            <select id="voiceWakeMode">
              <option value="push">Push-to-talk default</option>
              <option value="local-wake">Local wake detection planned</option>
            </select>
          </label>
        </div>
        <p class="muted">Wake mode is staged as a visible local privacy boundary. The browser only uploads audio when you start recording.</p>
      </section>

      <section class="voice-controls">
        <div class="panel-header">
          <h2>Transcript Log</h2>
          <button type="button" id="voiceRefreshBtn">Refresh Voice</button>
        </div>
        <div class="voice-transcripts">
          ${voiceState.transcripts.map(renderTranscript).join("") || '<div class="empty-state">No voice transcripts yet.</div>'}
        </div>
      </section>
    </div>
  `;
}

function renderVoiceAgent(agent) {
  const voiceOptions = voiceState.voices
    .map((voice) => {
      const id = voice.ShortName || voice.Name || voice.id;
      const label = `${id} ${voice.Locale || voice.locale || ""}`;
      const selected = id === agent.voice ? "selected" : "";
      return `<option value="${voiceEscapeAttr(id)}" ${selected}>${voiceEscape(label)}</option>`;
    })
    .join("");
  return `
    <article class="voice-agent-card" data-voice-agent="${voiceEscapeAttr(agent.id)}">
      <div class="row">
        <h3>${voiceEscape(agent.label || agent.id)}</h3>
        <span class="state">${voiceEscape(agent.id)}</span>
      </div>
      <p class="muted">${voiceEscape(agent.role || "")}</p>
      <label>
        <span>Voice</span>
        <select data-agent-voice-select="${voiceEscapeAttr(agent.id)}">
          ${voiceOptions}
        </select>
      </label>
      <label>
        <span>Preview Text</span>
        <textarea rows="3" data-agent-preview-text="${voiceEscapeAttr(agent.id)}">${voiceEscape(defaultPreviewText(agent.id))}</textarea>
      </label>
      <div class="voice-button-row">
        <button type="button" data-save-agent-voice="${voiceEscapeAttr(agent.id)}">Save</button>
        <button type="button" data-preview-agent-voice="${voiceEscapeAttr(agent.id)}">Preview</button>
        <button type="button" data-safety-agent-voice="${voiceEscapeAttr(agent.id)}">Safety Alert</button>
      </div>
    </article>
  `;
}

function renderTranscript(item) {
  return `
    <article class="event-card">
      <div class="row">
        <strong>${voiceEscape(item.kind || "voice")}</strong>
        <span class="muted">${voiceEscape(item.created_at || "")}</span>
      </div>
      <p>${voiceEscape(item.text || "")}</p>
      <p class="muted">${voiceEscape(item.agent_id || "")}</p>
    </article>
  `;
}

function defaultPreviewText(agentId) {
  const examples = {
    factory_operator: "Dave, I found three mesh problems and repaired two automatically.",
    print_safety_agent: "Warning: bed temperature is drifting. I paused the job for safety.",
    mesh_repair_agent: "The mesh is repaired, but wall thickness still needs operator review.",
    research_agent: "Learning mode finished. I created a markdown report for printer upgrades.",
  };
  return examples[agentId] || "Hermes voice preview is ready.";
}

function voiceSetting(label, value) {
  return `
    <article class="setting-row">
      <strong>${voiceEscape(label)}</strong>
      <span>${voiceEscape(value)}</span>
    </article>
  `;
}

async function playVoiceResult(result) {
  if (!result.audio_url) {
    return;
  }
  const audio = new Audio(result.audio_url);
  await audio.play();
}

document.addEventListener("click", async (event) => {
  const refresh = event.target.closest("#voiceRefreshBtn");
  if (refresh) {
    await refreshVoicePanel();
  }

  const save = event.target.closest("[data-save-agent-voice]");
  if (save) {
    const agentId = save.dataset.saveAgentVoice;
    const select = document.querySelector(`[data-agent-voice-select="${cssEscape(agentId)}"]`);
    await voiceApi(`/api/speech/agents/${agentId}/voice`, {
      method: "PATCH",
      body: JSON.stringify({ voice: select.value }),
    });
    await refreshVoicePanel();
  }

  const preview = event.target.closest("[data-preview-agent-voice]");
  if (preview) {
    const agentId = preview.dataset.previewAgentVoice;
    const select = document.querySelector(`[data-agent-voice-select="${cssEscape(agentId)}"]`);
    const text = document.querySelector(`[data-agent-preview-text="${cssEscape(agentId)}"]`);
    const result = await voiceApi("/api/speech/preview", {
      method: "POST",
      body: JSON.stringify({
        agent_id: agentId,
        voice: select.value,
        text: text.value,
      }),
    });
    await playVoiceResult(result);
    await refreshVoicePanel();
  }

  const safety = event.target.closest("[data-safety-agent-voice]");
  if (safety) {
    const agentId = safety.dataset.safetyAgentVoice;
    const select = document.querySelector(`[data-agent-voice-select="${cssEscape(agentId)}"]`);
    const result = await voiceApi("/api/speech/tts", {
      method: "POST",
      body: JSON.stringify({
        agent_id: agentId,
        voice: select.value,
        tone: "warning",
        text: "Warning: printer safety alert. Review the active job before continuing.",
      }),
    });
    await playVoiceResult(result);
    await refreshVoicePanel();
  }

  const record = event.target.closest("#voiceRecordBtn");
  if (record) {
    await toggleVoiceRecording();
  }
});

async function toggleVoiceRecording() {
  if (voiceState.recorder) {
    voiceState.recorder.stop();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    setMicStatus("Browser recording APIs are unavailable");
    return;
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  voiceState.chunks = [];
  const recorder = new MediaRecorder(stream);
  voiceState.recorder = recorder;
  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size) {
      voiceState.chunks.push(event.data);
    }
  });
  recorder.addEventListener("stop", async () => {
    setMicStatus("Uploading");
    const blob = new Blob(voiceState.chunks, { type: recorder.mimeType || "audio/webm" });
    stream.getTracks().forEach((track) => track.stop());
    voiceState.recorder = null;
    const formData = new FormData();
    formData.append("audio", blob, "voice.webm");
    formData.append("locale", "en-US");
    formData.append("agent_id", "factory_operator");
    try {
      const result = await voiceFormApi("/api/speech/stt", formData);
      setMicStatus(result.text || "No speech detected");
    } catch (error) {
      setMicStatus(error.message);
    }
    await refreshVoicePanel();
  });
  recorder.start();
  renderVoicePanel();
  setMicStatus("Recording");
}

function setMicStatus(text) {
  voiceState.micStatus = text;
  const target = document.querySelector("#voiceMicStatus");
  if (target) {
    target.textContent = text;
  }
}

function cssEscape(value) {
  if (window.CSS?.escape) {
    return CSS.escape(value);
  }
  return String(value).replaceAll('"', '\\"');
}

function voiceEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function voiceEscapeAttr(value) {
  return voiceEscape(value).replaceAll("`", "&#96;");
}

refreshVoicePanel();
