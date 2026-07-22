"""
Symptom Extraction Agent — powered by Lyzr AI (Tier 1) with Gemini/HF fallback.

Extracts structured symptom data from consultation transcripts.
Returns a list of symptoms with name, severity, and duration.
"""

from typing import List, Dict, Any
from .llm import llm_call, extract_json
from .lyzr_client import lyzr_chat

SYSTEM_PROMPT = """You are a clinical symptom extraction agent.

Extract ALL symptoms mentioned in the consultation transcript.
For each symptom return:
- name: symptom name (short, medical term preferred)
- severity: "mild" | "moderate" | "severe" (infer from context)
- duration: how long they've had it (e.g., "2 days", "1 week", "since morning")
- body_system: affected body system (e.g., "cardiovascular", "respiratory", "neurological")

Return ONLY a JSON object:
{
  "symptoms": [
    {
      "name": "chest pain",
      "severity": "severe",
      "duration": "2 hours",
      "body_system": "cardiovascular"
    }
  ],
  "chief_complaint": "main complaint in 1 sentence",
  "duration_of_illness": "overall illness duration"
}

If no symptoms found, return {"symptoms": [], "chief_complaint": "", "duration_of_illness": ""}
"""

# Rule-based fallback common symptoms
COMMON_SYMPTOMS = [
    "chest pain", "headache", "fever", "cough", "shortness of breath",
    "nausea", "vomiting", "fatigue", "dizziness", "abdominal pain",
    "back pain", "joint pain", "rash", "swelling", "palpitations",
    "weakness", "numbness", "vision changes", "hearing loss", "sore throat",
]


class SymptomAgent:
    """Extracts structured symptom data from consultation transcripts."""

    name = "SymptomAgent"
    description = "Extracts symptoms, severity, and duration from transcripts"

    def run(self, transcript: str) -> Dict[str, Any]:
        prompt = f"{SYSTEM_PROMPT}\n\nTRANSCRIPT:\n{transcript}\n\nJSON:"

        # Build rule-based fallback with negation awareness
        lower = transcript.lower()
        fallback_symptoms = []
        negation_terms = [
            " no ", " not ", "denied", "denies", "without", "none",
            "negative for", "free of", "no symptoms", "absence of",
            "no history of", "never", "reports no", "patient denied",
            "no complaints", "no concerns",
        ]

        for sym in COMMON_SYMPTOMS:
            idx = lower.find(sym)
            if idx != -1:
                start_idx = max(0, idx - 120)
                context_window = lower[start_idx:idx]
                is_negated = any(neg in context_window for neg in negation_terms)
                if not is_negated:
                    fallback_symptoms.append({
                        "name": sym,
                        "severity": "moderate",
                        "duration": "unknown",
                        "body_system": "general",
                    })

        fallback = {
            "symptoms": fallback_symptoms[:5],
            "chief_complaint": (
                "No symptoms reported — routine health assessment"
                if not fallback_symptoms
                else ((transcript[:57] + "...") if len(transcript) > 60 else transcript)
            ),
            "duration_of_illness": "N/A" if not fallback_symptoms else "unknown",
        }

        # ── Tier 1: Lyzr Symptom Extraction Agent ────────────────────────────
        lyzr_raw = lyzr_chat(prompt, agent_key="symptom")
        if lyzr_raw:
            result = extract_json(lyzr_raw)
            if result and "symptoms" in result:
                print("[SymptomAgent] ✓ Used Lyzr symptom agent.")
                return result

        # ── Tier 2: Gemini / HuggingFace ─────────────────────────────────────
        print("[SymptomAgent] Lyzr unavailable — falling back to Gemini/HF.")
        raw = llm_call(prompt, fallback=fallback)
        result = extract_json(raw)

        if result and "symptoms" in result:
            return result

        return fallback
