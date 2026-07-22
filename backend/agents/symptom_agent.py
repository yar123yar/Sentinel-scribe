"""
Symptom Extraction Agent (Google ADK style)
Extracts structured symptom data from consultation transcripts.
Returns a list of symptoms with name, severity, and duration.
"""

from typing import List, Dict, Any
from .llm import llm_call, extract_json

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
    """Google ADK-style agent for extracting structured symptom data."""

    name = "SymptomAgent"
    description = "Extracts symptoms, severity, and duration from transcripts"

    def run(self, transcript: str) -> Dict[str, Any]:
        prompt = f"{SYSTEM_PROMPT}\n\nTRANSCRIPT:\n{transcript}\n\nJSON:"

        # Build rule-based fallback
        lower = transcript.lower()
        fallback_symptoms = []
        for sym in COMMON_SYMPTOMS:
            if sym in lower:
                fallback_symptoms.append({
                    "name": sym,
                    "severity": "moderate",
                    "duration": "unknown",
                    "body_system": "general",
                })

        fallback = {
            "symptoms": fallback_symptoms[:5] if fallback_symptoms else [
                {"name": "reported complaint", "severity": "moderate", "duration": "unknown", "body_system": "general"}
            ],
            "chief_complaint": "Patient reported symptoms",
            "duration_of_illness": "unknown",
        }

        raw = llm_call(prompt, fallback=fallback)
        result = extract_json(raw)

        if result and "symptoms" in result:
            return result

        return fallback
