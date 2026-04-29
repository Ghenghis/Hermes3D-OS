from __future__ import annotations

from typing import Any

from .voice_catalog import AGENT_VOICE_DEFAULTS


def list_agent_voices(speech_config: dict[str, Any]) -> list[dict[str, Any]]:
    agents = speech_config.get("agents", {})
    result: list[dict[str, Any]] = []
    for agent_id, default_voice in AGENT_VOICE_DEFAULTS.items():
        agent = agents.get(agent_id, {}) if isinstance(agents, dict) else {}
        result.append(
            {
                "id": agent_id,
                "label": agent_id.replace("_", " ").title(),
                "voice": agent.get("voice") or default_voice,
                "role": agent.get("role") or _default_role(agent_id),
            }
        )
    if isinstance(agents, dict):
        for agent_id, agent in agents.items():
            if agent_id in AGENT_VOICE_DEFAULTS or not isinstance(agent, dict):
                continue
            result.append(
                {
                    "id": agent_id,
                    "label": str(agent.get("label") or agent_id).replace("_", " ").title(),
                    "voice": agent.get("voice") or speech_config["azure"]["default_voice"],
                    "role": agent.get("role") or "Hermes3D agent",
                }
            )
    return result


def resolve_agent_voice(
    speech_config: dict[str, Any],
    agent_id: str | None,
    requested_voice: str | None = None,
) -> str:
    if requested_voice:
        return requested_voice
    agents = speech_config.get("agents", {})
    if agent_id and isinstance(agents, dict):
        agent = agents.get(agent_id)
        if isinstance(agent, dict) and agent.get("voice"):
            return str(agent["voice"])
    azure = speech_config.get("azure", {})
    return str(azure.get("default_voice") or azure.get("fallback_voice") or "en-US-JennyNeural")


def _default_role(agent_id: str) -> str:
    roles = {
        "factory_operator": "Print factory narrator and operator guide",
        "modeling_agent": "CAD/OpenSCAD/CadQuery reasoning and vision-backed modeling critique",
        "print_safety_agent": "Short safety alerts and warnings",
        "mesh_repair_agent": "Model validation, repair, and slicing updates",
        "mesh_qa_agent": "Mesh preview analysis, manifold evidence, repair proof, and visual QA",
        "slicer_qa_agent": "Slicer preview analysis, support risk, overhang review, and G-code evidence",
        "print_monitor_agent": "Printer and camera observation, first-layer checks, and live print summaries",
        "research_agent": "Idle learning reports and upgrade research",
        "privacy_agent": "Anonymous mode, redaction, camera privacy, provider routing, and secrets policy",
    }
    return roles.get(agent_id, "Hermes3D agent")
