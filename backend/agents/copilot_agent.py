"""
Copilot Agent (Google ADK style)
Answers clinician questions using current consultation context,
patient memory from Qdrant, and clinical guidelines.
"""

from typing import Dict, Any, List, Optional
from .llm import llm_call

SYSTEM_PROMPT = """You are an AI Doctor Copilot — an intelligent clinical assistant helping a doctor during a consultation.

You have access to:
1. The current consultation transcript and analysis
2. The patient's previous visit history
3. Clinical guidelines

Answer the clinician's question concisely and clinically. Be specific and reference the available data.
If information is not available, say so clearly. Do not make up clinical data.

CURRENT CONSULTATION:
{consultation_context}

PATIENT HISTORY:
{patient_history}

CLINICAL GUIDELINES RELEVANT:
{guidelines}

CONVERSATION HISTORY:
{history}

CLINICIAN QUESTION: {question}

ANSWER:"""


class CopilotAgent:
    """Google ADK-style AI Doctor Copilot agent."""

    name = "CopilotAgent"
    description = "Answers clinician questions using consultation context, patient memory, and guidelines"

    def run(
        self,
        question: str,
        consultation_context: Dict[str, Any],
        patient_history: List[Dict],
        guidelines: List[Dict],
        conversation_history: List[Dict],
    ) -> str:
        # Build context string
        ctx_parts = []
        if consultation_context.get("transcript"):
            ctx_parts.append(f"Transcript excerpt: {consultation_context['transcript'][:600]}")
        if consultation_context.get("triage"):
            t = consultation_context["triage"]
            ctx_parts.append(f"Triage: {t.get('priority')} (confidence: {t.get('confidence', 0):.0%})")
            ctx_parts.append(f"Reasoning: {'; '.join(t.get('reasoning', [])[:3])}")
        if consultation_context.get("symptoms"):
            syms = [s.get("name", "") for s in consultation_context["symptoms"][:5]]
            ctx_parts.append(f"Symptoms: {', '.join(syms)}")
        if consultation_context.get("red_flags"):
            ctx_parts.append(f"RED FLAGS: {', '.join(consultation_context['red_flags'])}")

        consultation_str = "\n".join(ctx_parts) or "No consultation data available"

        # Patient history
        history_parts = []
        for h in patient_history[:3]:
            history_parts.append(f"- {h.get('date', 'Previous visit')}: {h.get('text', '')[:200]}")
        patient_history_str = "\n".join(history_parts) or "No previous visit history available"

        # Guidelines
        guideline_parts = []
        for g in guidelines[:2]:
            guideline_parts.append(f"- {g.get('title', '')}: {g.get('text', '')[:150]}")
        guidelines_str = "\n".join(guideline_parts) or "Standard clinical guidelines apply"

        # Conversation history
        history_str = ""
        for msg in conversation_history[-4:]:  # Last 4 turns
            role = "Doctor" if msg.get("role") == "user" else "Copilot"
            history_str += f"{role}: {msg.get('content', '')}\n"

        fallback_answers = {
            "symptoms": f"Based on the consultation, the following symptoms were detected: {', '.join([s.get('name','') for s in consultation_context.get('symptoms', [])])}" if consultation_context.get('symptoms') else "No symptoms have been extracted yet. Please process the consultation transcript first.",
            "p1": "This patient is classified P1 (Emergency) due to the presence of critical red-flag symptoms requiring immediate intervention.",
            "previous": f"Based on patient memory, I found {len(patient_history)} previous visit(s). " + (patient_history[0].get('text', '') if patient_history else "No history available."),
            "default": "I can help answer questions about the current consultation, patient history, or clinical guidelines. Please process a consultation transcript first.",
        }

        q_lower = question.lower()
        if not consultation_context and not patient_history:
            return fallback_answers["default"]

        prompt = SYSTEM_PROMPT.format(
            consultation_context=consultation_str,
            patient_history=patient_history_str,
            guidelines=guidelines_str,
            history=history_str or "None",
            question=question,
        )

        result = llm_call(prompt)

        if result:
            return result

        # Rule-based fallback
        if "symptom" in q_lower:
            return fallback_answers["symptoms"]
        elif "p1" in q_lower or "emergency" in q_lower or "why" in q_lower:
            return fallback_answers["p1"]
        elif "previous" in q_lower or "history" in q_lower or "before" in q_lower:
            return fallback_answers["previous"]
        else:
            return fallback_answers["default"]
