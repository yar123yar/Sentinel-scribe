"""
SOAP Note Agent (Google ADK style)
Generates structured SOAP notes from consultation transcripts.
"""

from typing import Dict, Any, List, Optional
from .llm import llm_call, extract_json

SYSTEM_PROMPT = """You are a medical documentation specialist generating SOAP notes.

Based on the consultation information provided, generate a professional SOAP note.

Return ONLY a JSON object with exactly these fields:
{{
  "subjective": "Patient's subjective complaints and history. What the patient reports. Include HPI, PMH, medications, allergies, and social history if mentioned.",
  "objective": "Objective findings. Include vital signs if mentioned, physical examination findings, and any test results. If not mentioned, note 'To be assessed'.",
  "assessment": "Clinical assessment and differential diagnoses. Include primary diagnosis and any secondary considerations.",
  "plan": "Treatment plan including medications, referrals, follow-up, patient education, and monitoring parameters."
}}

Patient Priority: {priority}
Symptoms: {symptoms}
Red Flags: {red_flags}
Transcript: {transcript}

JSON:"""


def _fallback_soap(transcript: str, symptoms: List[Dict], priority: str) -> Dict[str, str]:
    sym_list = ", ".join(s.get("name", "") for s in symptoms[:5]) or "reported symptoms"
    return {
        "subjective": f"Patient presents with {sym_list}. Full history obtained from consultation transcript.",
        "objective": "Vital signs: To be assessed. Physical examination: To be performed. Additional investigations as indicated.",
        "assessment": f"Patient triaged as {priority}. Clinical assessment pending full examination. Primary differential based on presenting symptoms of {sym_list}.",
        "plan": "1. Complete physical examination\n2. Order relevant investigations\n3. Initiate appropriate treatment based on findings\n4. Patient education regarding diagnosis and follow-up\n5. Return precautions discussed",
    }


class SOAPAgent:
    """Google ADK-style agent for generating structured SOAP notes."""

    name = "SOAPAgent"
    description = "Generates clinical SOAP notes from consultation transcripts"

    def run(
        self,
        transcript: str,
        symptoms: List[Dict],
        red_flags: List[str],
        priority: str = "P3",
    ) -> Dict[str, str]:
        fallback = _fallback_soap(transcript, symptoms, priority)

        symptoms_text = ", ".join(
            f"{s.get('name')} ({s.get('severity', '?')} severity, {s.get('duration', '?')})"
            for s in symptoms[:6]
        ) or "as per transcript"

        red_flags_text = ", ".join(red_flags) if red_flags else "None identified"

        prompt = SYSTEM_PROMPT.format(
            priority=priority,
            symptoms=symptoms_text,
            red_flags=red_flags_text,
            transcript=transcript[:2000],
        )

        raw = llm_call(prompt, fallback=fallback)
        result = extract_json(raw)

        if result and all(k in result for k in ["subjective", "objective", "assessment", "plan"]):
            return result

        return fallback
