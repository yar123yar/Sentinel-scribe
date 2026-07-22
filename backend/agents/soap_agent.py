"""
SOAP Note Agent — powered by Lyzr AI (Tier 1) with Gemini/HF fallback.

Generates structured SOAP notes from consultation transcripts.
"""

from typing import Dict, Any, List, Optional
from .llm import llm_call, extract_json
from .lyzr_client import lyzr_chat

SYSTEM_PROMPT = """You are a medical documentation specialist generating SOAP notes.

Based on the consultation information provided, generate a professional SOAP note.

Return ONLY a JSON object with exactly these fields:
{{
  "subjective": "Patient's subjective complaints and history. What the patient reports. Include HPI, PMH, medications, allergies, and social history if mentioned.",
  "objective": "Objective findings. Include vital signs if mentioned, physical examination findings, and any test results. If not mentioned, note 'To be assessed'.",
  "assessment": "Clinical assessment and differential diagnoses. Include primary diagnosis and any secondary considerations.",
  "plan": "Treatment plan including medications, referrals, follow-up, patient education, and monitoring parameters."
}}

Patient Profile (Age, Gender, Allergies, Chronic Conditions):
{patient_profile}

Past Patient Memory / History:
{patient_memory}

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
        "assessment": (
            f"Patient triaged as {priority}. Clinical assessment pending full examination. "
            f"Primary differential based on presenting symptoms of {sym_list}."
        ),
        "plan": (
            "1. Complete physical examination\n"
            "2. Order relevant investigations\n"
            "3. Initiate appropriate treatment based on findings\n"
            "4. Patient education regarding diagnosis and follow-up\n"
            "5. Return precautions discussed"
        ),
    }


class SOAPAgent:
    """Generates clinical SOAP notes from consultation transcripts."""

    name = "SOAPAgent"
    description = "Generates clinical SOAP notes from consultation transcripts"

    def run(
        self,
        transcript: str,
        symptoms: List[Dict],
        red_flags: List[str],
        priority: str = "P3",
        patient_profile: Dict[str, Any] = None,
        patient_memory: List[Dict] = None,
    ) -> Dict[str, str]:
        fallback = _fallback_soap(transcript, symptoms, priority)

        symptoms_text = ", ".join(
            f"{s.get('name')} ({s.get('severity', '?')} severity, {s.get('duration', '?')})"
            for s in symptoms[:6]
        ) or "as per transcript"

        red_flags_text = ", ".join(red_flags) if red_flags else "None identified"

        patient_profile_str = str(patient_profile) if patient_profile else "No demographics available"
        patient_memory_str = "\n".join(
            f"- {m.get('text', '')}" for m in (patient_memory or [])
        ) or "No relevant past history retrieved"

        prompt = SYSTEM_PROMPT.format(
            patient_profile=patient_profile_str,
            patient_memory=patient_memory_str,
            priority=priority,
            symptoms=symptoms_text,
            red_flags=red_flags_text,
            transcript=transcript,
        )

        # ── Tier 1: Lyzr SOAP Agent ───────────────────────────────────────────
        lyzr_raw = lyzr_chat(prompt, agent_key="soap")
        if lyzr_raw:
            result = extract_json(lyzr_raw)
            if result and all(k in result for k in ["subjective", "objective", "assessment", "plan"]):
                print("[SOAPAgent] ✓ Used Lyzr SOAP agent.")
                return result

        # ── Tier 2: Gemini / HuggingFace ─────────────────────────────────────
        print("[SOAPAgent] Lyzr unavailable — falling back to Gemini/HF.")
        raw = llm_call(prompt, fallback=fallback)
        result = extract_json(raw)

        if result and all(k in result for k in ["subjective", "objective", "assessment", "plan"]):
            return result

        return fallback
