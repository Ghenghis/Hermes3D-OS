from __future__ import annotations

import os
from typing import Any


def provider_readiness(services: dict[str, Any]) -> dict[str, Any]:
    vision = services.get("vision", {}) if isinstance(services.get("vision"), dict) else {}
    return {
        "vision_contract": {
            "required_for_all_agents": bool(vision.get("required_for_all_agents", True)),
            "primary_provider": vision.get("primary_provider", "minimax_mcp"),
            "additional_reasoning_provider": vision.get(
                "additional_reasoning_provider", "deepseek_v4"
            ),
            "deepseek_may_replace_vision": bool(vision.get("deepseek_may_replace_vision", False)),
        },
        "providers": {
            "minimax_mcp": minimax_mcp_readiness(services),
            "deepseek_v4": deepseek_v4_readiness(services),
        },
    }


def minimax_mcp_readiness(services: dict[str, Any]) -> dict[str, Any]:
    providers = services.get("providers", {}) if isinstance(services.get("providers"), dict) else {}
    config = providers.get("minimax_mcp", {}) if isinstance(providers.get("minimax_mcp"), dict) else {}
    base_url = _resolve_env(config.get("base_url")) or os.getenv("MINIMAX_MCP_URL", "")
    command = _resolve_env(config.get("command")) or os.getenv("MINIMAX_MCP_COMMAND", "")
    configured = bool(base_url or command)
    transport = "http" if base_url else "stdio" if command else "missing"
    vision = bool(config.get("vision", True))
    multimodal = bool(config.get("multimodal_input", True))
    evidence = bool(config.get("evidence_required", True))
    ready = configured and vision and multimodal and evidence
    return {
        "id": "minimax_mcp",
        "label": "MiniMax-MCP Vision",
        "required": True,
        "configured": configured,
        "ready": ready,
        "provider": config.get("provider", "minimax"),
        "model": config.get("model", "minimax-mcp"),
        "transport": transport,
        "base_url_configured": bool(base_url),
        "command_configured": bool(command),
        "vision": vision,
        "multimodal_input": multimodal,
        "evidence_required": evidence,
        "detail": (
            "MiniMax-MCP vision provider is configured."
            if ready
            else "Configure MINIMAX_MCP_URL or MINIMAX_MCP_COMMAND for required vision evidence."
        ),
    }


def deepseek_v4_readiness(services: dict[str, Any]) -> dict[str, Any]:
    providers = services.get("providers", {}) if isinstance(services.get("providers"), dict) else {}
    config = providers.get("deepseek_v4", {}) if isinstance(providers.get("deepseek_v4"), dict) else {}
    api_key = _resolve_env(config.get("api_key")) or os.getenv("DEEPSEEK_API_KEY", "")
    base_url = _resolve_env(config.get("base_url")) or os.getenv("DEEPSEEK_BASE_URL", "")
    configured = bool(api_key)
    return {
        "id": "deepseek_v4",
        "label": "DeepSeek V4 Reasoning",
        "required": False,
        "configured": configured,
        "ready": configured,
        "provider": config.get("provider", "deepseek"),
        "model_family": config.get("model_family", "deepseek-v4"),
        "model": config.get("model", "deepseek-v4-pro"),
        "fallback_model": config.get("fallback_model", "deepseek-v4-flash"),
        "base_url": base_url or "https://api.deepseek.com",
        "api_key_configured": configured,
        "vision_provider": config.get("vision_provider", "minimax_mcp"),
        "vision": bool(config.get("vision", False)),
        "detail": (
            "DeepSeek V4 reasoning provider is configured."
            if configured
            else "Optional: set DEEPSEEK_API_KEY for planning, CAD reasoning, research, roadmaps, and reports."
        ),
    }


def _resolve_env(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    text = value.strip()
    if text.startswith("${") and text.endswith("}") and len(text) > 3:
        return os.getenv(text[2:-1], "")
    return text
