"""
Triage Agent (Google ADK style)
Classifies patient urgency as P1 / P2 / P3 with confidence and reasoning.
Uses Qdrant RAG to retrieve matching clinical guidelines.
"""

import asyncio
from typing import Dict, Any, List
from .llm import llm_call, extract_json

SYSTEM_PROMPT = """You are an expert clinical triage agent following Manchester Triage System guidelines.

Based on the transcript, extracted symptoms, red flags, and retrieved clinical guidelines,
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
  "recommended_action": "brief action text"
}}

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
    }


class TriageAgent:
    """Google ADK-style agent for patient triage classification."""

    name = "TriageAgent"
    description = "Classifies patient urgency P1/P2/P3 using clinical guidelines and RAG"

    async def run(
        self,
        transcript: str,
        symptoms: List[Dict],
        red_flags: List[str],
        guidelines: List[Dict],
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

        prompt = SYSTEM_PROMPT.format(
            guidelines=guideline_text,
            symptoms=symptoms_text,
            red_flags=red_flags_text,
            transcript=transcript[:1500],  # Truncate for token limit
        )

        raw = llm_call(prompt, fallback=fallback)
        result = extract_json(raw)

        if result and "priority" in result:
            # Validate priority
            if result["priority"] not in ["P1", "P2", "P3"]:
                result["priority"] = fallback["priority"]
            # Clamp confidence
            result["confidence"] = max(0.0, min(1.0, float(result.get("confidence", 0.8))))
            return result

        return fallback
