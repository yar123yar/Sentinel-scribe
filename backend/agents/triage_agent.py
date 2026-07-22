"""
Triage Agent — powered by Lyzr AI (Tier 1) with Gemini/HF + rule-based fallback.

Classifies patient urgency as P1 / P2 / P3 with confidence and reasoning.
Uses Qdrant RAG to retrieve matching clinical guidelines.
"""

import asyncio
from typing import Dict, Any, List
from .llm import llm_call, extract_json
from .lyzr_client import lyzr_chat

SYSTEM_PROMPT = """You are an expert clinical triage agent following Manchester Triage System guidelines.

Based on the transcript, extracted symptoms, red flags, retrieved clinical guidelines, and patient history,
classify the patient into:

P1 - IMMEDIATE (Emergency): Life-threatening, requires immediate intervention
P2 - URGENT: Serious condition, requires care within 10-30 minutes
P3 - NON-URGENT: Stable, can wait for standard consultation

Return ONLY a JSON object:
{{
  "priority": "P1" | "P2" | "P3",
  "confidence": 0.0-1.0,
  "reasoning": [
    "Reason 1",
    "Reason 2",
    "Reason 3"
  ],
  "guideline_matches": ["matched guideline titles"],
  "recommended_action": "brief action text (e.g. 'Dispatch Ambulance', 'Schedule within 24h')",
  "differential_diagnosis": [
    "Most likely diagnosis",
    "Alternative diagnosis 1",
    "Alternative diagnosis 2"
  ]
}}

Patient Profile (Age, Gender, Allergies, Chronic Conditions):
{patient_profile}

Past Patient Memory / History:
{patient_memory}

Guidelines context:
{guidelines}

Symptoms: {symptoms}
Red flags: {red_flags}
Transcript: {transcript}

JSON:"""

# Rule-based triage fallback
def _rule_based_triage(red_flags: List[str], symptoms: List[Dict]) -> Dict[str, Any]:
    if red_flags and len(red_flags) >= 2:
        return {
            "priority": "P1",
            "confidence": 0.92,
            "reasoning": [
                f"Red flag detected: {red_flags[0]}",
                f"Additional red flag: {red_flags[1]}" if len(red_flags) > 1 else "Multiple serious symptoms",
                "Immediate emergency intervention required",
            ],
            "guideline_matches": ["P1 Emergency Criteria"],
            "recommended_action": "Immediate resuscitation and specialist alert",
            "differential_diagnosis": ["Pending Evaluation - Emergency"],
        }
    elif red_flags:
        return {
            "priority": "P1",
            "confidence": 0.85,
            "reasoning": [
                f"Red flag symptom detected: {red_flags[0]}",
                "Requires immediate clinical assessment",
                "Per Manchester Triage System — immediate category",
            ],
            "guideline_matches": ["P1 Emergency Criteria"],
            "recommended_action": "Immediate assessment and monitoring",
            "differential_diagnosis": ["Pending Evaluation - Emergency"],
        }

    severe_count = sum(1 for s in symptoms if s.get("severity") == "severe")
    if severe_count >= 2:
        return {
            "priority": "P2",
            "confidence": 0.78,
            "reasoning": [
                f"{severe_count} severe symptoms identified",
                "No immediate life threat, but urgent evaluation needed",
                "Vitals monitoring recommended",
            ],
            "guideline_matches": ["P2 Urgent Criteria"],
            "recommended_action": "Evaluation within 30 minutes",
            "differential_diagnosis": ["Pending Evaluation - Urgent"],
        }

    return {
        "priority": "P3",
        "confidence": 0.82,
        "reasoning": [
            "No red flags identified",
            "Symptoms appear stable and non-urgent",
            "Standard consultation appropriate",
        ],
        "guideline_matches": ["P3 Non-Urgent Criteria"],
        "recommended_action": "Standard consultation queue",
        "differential_diagnosis": ["Pending Evaluation"],
    }


class TriageAgent:
    """Classifies patient urgency P1/P2/P3 using clinical guidelines and RAG."""

    name = "TriageAgent"
    description = "Classifies patient urgency P1/P2/P3 using clinical guidelines and RAG"

    async def run(
        self,
        transcript: str,
        symptoms: List[Dict],
        red_flags: List[str],
        guidelines: List[Dict],
        patient_profile: Dict[str, Any] = None,
        patient_memory: List[Dict] = None,
    ) -> Dict[str, Any]:
        fallback = _rule_based_triage(red_flags, symptoms)

        guideline_text = "\n".join(
            f"- {g.get('title', '')}: {g.get('text', '')}"
            for g in guidelines[:3]
        ) or "Standard Manchester Triage System guidelines apply"

        symptoms_text = ", ".join(
            f"{s.get('name')} ({s.get('severity', 'unknown')} severity)"
            for s in symptoms[:8]
        ) or "No specific symptoms extracted"

        red_flags_text = ", ".join(red_flags) if red_flags else "None"

        patient_profile_str = str(patient_profile) if patient_profile else "No demographics available"
        patient_memory_str = "\n".join(
            f"- {m.get('text', '')}" for m in (patient_memory or [])
        ) or "No relevant past history retrieved"

        prompt = SYSTEM_PROMPT.format(
            patient_profile=patient_profile_str,
            patient_memory=patient_memory_str,
            guidelines=guideline_text,
            symptoms=symptoms_text,
            red_flags=red_flags_text,
            transcript=transcript,
        )

        # ── Tier 1: Lyzr Triage Agent ─────────────────────────────────────────
        lyzr_raw = lyzr_chat(prompt, agent_key="triage")
        if lyzr_raw:
            result = extract_json(lyzr_raw)
            if result and "priority" in result:
                print("[TriageAgent] ✓ Used Lyzr triage agent.")
                if result["priority"] not in ["P1", "P2", "P3"]:
                    result["priority"] = fallback["priority"]
                result["confidence"] = max(0.0, min(1.0, float(result.get("confidence", 0.8))))
                return result

        # ── Tier 2: Gemini / HuggingFace ─────────────────────────────────────
        print("[TriageAgent] Lyzr unavailable — falling back to Gemini/HF.")
        raw = llm_call(prompt, fallback=fallback)
        result = extract_json(raw)

        if result and "priority" in result:
            if result["priority"] not in ["P1", "P2", "P3"]:
                result["priority"] = fallback["priority"]
            result["confidence"] = max(0.0, min(1.0, float(result.get("confidence", 0.8))))
            return result

        return fallback
