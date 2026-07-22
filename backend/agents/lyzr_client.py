"""
Lyzr AI Agent client for the Doctor Copilot.

Wraps the Lyzr v3 inference/chat API:
  POST https://agent-prod.studio.lyzr.ai/v3/inference/chat/

Each specialized agent has its own agent_id and a fixed session_id as
configured in Lyzr Studio. Pass the agent_key to route to the right agent:

  agent_key values:
    "copilot"    — Doctor Copilot Main Agent
    "soap"       — SOAP Note Agent
    "triage"     — Triage Agent
    "symptom"    — Symptom Extraction Agent
    "red_flag"   — Red Flag Agent
    "transcript" — Transcript Cleaning Agent
"""

import json
import urllib.request
import urllib.error
from typing import Optional, Literal
from config import settings

# ---------------------------------------------------------------------------
# Agent registry — maps agent_key → (agent_id, session_id)
# Values are read from config/settings (populated from .env or defaults).
# ---------------------------------------------------------------------------

AgentKey = Literal["copilot", "soap", "triage", "symptom", "red_flag", "transcript"]


def _get_agent_config(agent_key: AgentKey) -> tuple[str, str]:
    """Return (agent_id, session_id) for the given agent key."""
    registry = {
        "copilot":    (settings.lyzr_copilot_agent_id,    settings.lyzr_copilot_session_id),
        "soap":       (settings.lyzr_soap_agent_id,        settings.lyzr_soap_session_id),
        "triage":     (settings.lyzr_triage_agent_id,      settings.lyzr_triage_session_id),
        "symptom":    (settings.lyzr_symptom_agent_id,     settings.lyzr_symptom_session_id),
        "red_flag":   (settings.lyzr_red_flag_agent_id,    settings.lyzr_red_flag_session_id),
        "transcript": (settings.lyzr_transcript_agent_id,  settings.lyzr_transcript_session_id),
    }
    return registry.get(agent_key, (settings.lyzr_copilot_agent_id, settings.lyzr_copilot_session_id))


def lyzr_chat(
    message: str,
    agent_key: AgentKey = "copilot",
) -> Optional[str]:
    """
    Send a message to a specific Lyzr AI agent and return its text response.

    Args:
        message:   The full message / prompt to send to the agent.
        agent_key: Which Lyzr agent to call. Defaults to "copilot".
                   Options: "copilot" | "soap" | "triage" | "symptom" | "red_flag" | "transcript"

    Returns:
        The agent's reply string, or None on any error.
    """
    api_key  = settings.lyzr_api_key
    user_id  = settings.lyzr_user_id
    base_url = settings.lyzr_base_url.rstrip("/")

    if not api_key:
        print("[Lyzr] SKIPPED: LYZR_API_KEY not configured.")
        return None

    agent_id, session_id = _get_agent_config(agent_key)

    if not agent_id:
        print(f"[Lyzr] SKIPPED: No agent_id configured for key '{agent_key}'.")
        return None

    payload = json.dumps({
        "user_id":    user_id,
        "agent_id":   agent_id,
        "session_id": session_id,
        "message":    message,
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{base_url}/v3/inference/chat/",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-api-key":    api_key,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read().decode("utf-8"))

        # Lyzr response shape: {"response": "...", ...}  or  {"message": "..."}
        for key in ("response", "message", "answer", "text", "output", "content"):
            val = body.get(key)
            if val and isinstance(val, str) and len(val.strip()) > 5:
                print(f"[Lyzr:{agent_key}] ✓ Response received ({len(val)} chars, session={session_id})")
                return val.strip()

        # Some versions nest inside choices
        choices = body.get("choices") or []
        if choices and isinstance(choices, list):
            text = (
                choices[0].get("message", {}).get("content")
                or choices[0].get("text")
                or ""
            )
            if text:
                return text.strip()

        print(f"[Lyzr:{agent_key}] Unexpected response shape: {list(body.keys())}")
        return None

    except urllib.error.HTTPError as e:
        error_body = ""
        try:
            error_body = e.read().decode("utf-8")[:300]
        except Exception:
            pass
        print(f"[Lyzr:{agent_key}] HTTP {e.code} error: {e.reason} — {error_body}")
        return None
    except urllib.error.URLError as e:
        print(f"[Lyzr:{agent_key}] Network error: {e.reason}")
        return None
    except Exception as e:
        print(f"[Lyzr:{agent_key}] Unexpected error: {e}")
        return None
