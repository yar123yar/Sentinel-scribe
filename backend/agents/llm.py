"""
Base LLM helper used by all agents.

Three-tier fallback chain:
  Tier 1 — Google Gemini 2.5 Flash  (best quality, requires GOOGLE_API_KEY)
  Tier 2 — HuggingFace Inference API (free fallback, requires HF_API_TOKEN)
  Tier 3 — Rule-based hardcoded      (always works, no keys needed)
"""

import json
import re
import time
import urllib.request
import urllib.error
from typing import Any, Optional
from config import settings

# ── Sentinel: distinguishes "not yet tried" (None) from "tried and failed" ──
_FAILED = object()
_gemini_model = None   # None | _FAILED | actual model


# ─── Tier 1: Google Gemini ───────────────────────────────────────────────────

def _get_gemini():
    global _gemini_model
    if _gemini_model is None:
        api_key = settings.google_api_key
        if not api_key or not api_key.startswith("AIza"):
            print(
                "[LLM] Gemini SKIPPED: GOOGLE_API_KEY missing or invalid "
                "(expected 'AIza...'). Get a free key → https://aistudio.google.com/app/apikey"
            )
            _gemini_model = _FAILED
        else:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                _gemini_model = genai.GenerativeModel("gemini-2.5-flash")
                print("[LLM] ✓ Gemini 2.5 Flash initialised.")
            except Exception as e:
                print(f"[LLM] Gemini init ERROR: {e}")
                _gemini_model = _FAILED
    return None if _gemini_model is _FAILED else _gemini_model


def _call_gemini(prompt: str) -> Optional[str]:
    model = _get_gemini()
    if model is None:
        return None
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[LLM] Gemini call ERROR: {e}")
        return None


# ─── Tier 2: HuggingFace Inference API ───────────────────────────────────────

# Sentinel for HF availability (same pattern as Gemini)
_hf_available = None   # None = not checked yet, True / False after first check


def _check_hf() -> bool:
    global _hf_available
    if _hf_available is None:
        token = settings.hf_api_token
        if not token or not token.startswith("hf_"):
            print(
                "[LLM] HuggingFace SKIPPED: HF_API_TOKEN missing or invalid "
                "(expected 'hf_...'). Get a free token → https://huggingface.co/settings/tokens"
            )
            _hf_available = False
        else:
            _hf_available = True
            print(f"[LLM] ✓ HuggingFace fallback ready (model: {settings.hf_model}).")
    return _hf_available


def _call_hf(prompt: str) -> Optional[str]:
    if not _check_hf():
        return None

    token = settings.hf_api_token
    model = settings.hf_model
    url = f"https://api-inference.huggingface.co/models/{model}"

    payload = json.dumps({
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 1024,
            "temperature": 0.1,
            "return_full_text": False,
            "do_sample": False,
        },
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))

        # HF returns a list of generated texts
        if isinstance(body, list) and body:
            text = body[0].get("generated_text", "")
            return text.strip() if text else None

        # Some models return a dict directly
        if isinstance(body, dict):
            if "error" in body:
                # Model may be loading — HF returns {"error": "...", "estimated_time": N}
                wait = body.get("estimated_time", 0)
                if wait:
                    print(f"[LLM] HF model loading, retrying in {wait:.0f}s…")
                    time.sleep(min(wait, 20))
                    return _call_hf(prompt)  # one retry
                print(f"[LLM] HF API error: {body['error']}")
                return None
            text = body.get("generated_text", "")
            return text.strip() if text else None

        return None

    except urllib.error.HTTPError as e:
        print(f"[LLM] HF HTTP error {e.code}: {e.reason}")
        return None
    except Exception as e:
        print(f"[LLM] HF call ERROR: {e}")
        return None


# ─── Public interface ─────────────────────────────────────────────────────────

def llm_call(prompt: str, fallback: Any = None) -> str:
    """
    Call the best available LLM. Tries Gemini → HuggingFace → rule-based fallback.
    Always returns a string (never raises).
    """
    # Tier 1: Gemini
    result = _call_gemini(prompt)
    if result:
        return result

    # Tier 2: HuggingFace
    result = _call_hf(prompt)
    if result:
        print("[LLM] Used HuggingFace fallback.")
        return result

    # Tier 3: Rule-based
    print("[LLM] Used rule-based fallback (no LLM available).")
    if fallback is not None:
        return json.dumps(fallback) if isinstance(fallback, dict) else str(fallback)
    return ""


def extract_json(text: str) -> Optional[dict]:
    """Extract first JSON object from an LLM response string."""
    # Direct parse
    try:
        return json.loads(text)
    except Exception:
        pass
    # Fenced code block: ```json ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]+?)```", text)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass
    # Bare JSON object anywhere in the string
    match = re.search(r"\{[\s\S]+\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return None
