"""
Base Gemini LLM helper used by all agents.
Wraps google-generativeai with a clean call interface and graceful fallback.
"""

import json
import re
from typing import Any, Optional
from config import settings

_model = None


def _get_model():
    global _model
    if _model is None:
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.google_api_key)
            _model = genai.GenerativeModel("gemini-2.5-flash")
        except Exception:
            _model = None
    return _model


def llm_call(prompt: str, fallback: Any = None) -> str:
    """Call Gemini 2.5 Flash. Returns string response or fallback."""
    model = _get_model()
    if not model or not settings.google_api_key:
        if fallback is not None:
            return json.dumps(fallback) if isinstance(fallback, dict) else str(fallback)
        return ""
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"LLM error: {e}")
        if fallback is not None:
            return json.dumps(fallback) if isinstance(fallback, dict) else str(fallback)
        return ""


def extract_json(text: str) -> Optional[dict]:
    """Extract first JSON block from LLM response."""
    # Try direct parse
    try:
        return json.loads(text)
    except Exception:
        pass
    # Try code block
    match = re.search(r"```(?:json)?\s*([\s\S]+?)```", text)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass
    # Try bare JSON object
    match = re.search(r"\{[\s\S]+\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return None
