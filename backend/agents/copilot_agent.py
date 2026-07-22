"""
Copilot Agent — AI Doctor Copilot powered by Lyzr AI.

Call chain:
  1. Lyzr AI Agent  (primary  — full GPT-quality conversational AI)
  2. Gemini / HF    (fallback — via llm_call())
  3. Rule-based     (last resort — always works, no keys needed)
"""

from typing import Dict, Any, List, Optional
from .lyzr_client import lyzr_chat
from .llm import llm_call, extract_json


# ── Fallback prompt for when Lyzr is down (used by Gemini/HF) ────────────────
FALLBACK_SYSTEM_PROMPT = """You are an expert AI Doctor Copilot — a brilliant, highly knowledgeable clinical assistant built into a hospital triage and consultation system.

You behave like a world-class medical AI (think ChatGPT + clinical expertise). You:
- Answer ANY clinical or medical question with FULL detail and depth
- Engage conversationally — you remember the conversation and build on it
- Use proper medical terminology but always explain it clearly
- Format responses beautifully with markdown: **bold**, bullet points, numbered steps, tables, headings
- Give thorough, comprehensive answers — never cut yourself short unless brevity is appropriate
- When asked about a specific consultation, reference the data provided
- When asked general medical/clinical questions, draw on your full clinical knowledge
- Use emojis sparingly but effectively (for warnings, for confirmations)
- NEVER return raw JSON. Your response must be natural language, human-readable text formatting.

IMPORTANT RULES:
- NEVER fabricate patient data — if not in the context, say so
- ALWAYS highlight red flags prominently with 
- If no consultation is loaded and the question is clinical, answer from medical knowledge

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT CONSULTATION DATA:
{consultation_context}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PATIENT HISTORY (from memory):
{patient_history}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RELEVANT CLINICAL GUIDELINES:
{guidelines}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION SO FAR:
{history}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLINICIAN: {question}

COPILOT:"""


def _build_context_block(
    consultation_context: Dict[str, Any],
    patient_history: List[Dict],
    guidelines: List[Dict],
    conversation_history: List[Dict],
) -> Dict[str, str]:
    """Build the formatted context strings shared by all call paths."""

    # ── Consultation context ─────────────────────────────────────────────────
    ctx_parts = []

    if consultation_context.get("transcript"):
        ctx_parts.append(
            f"TRANSCRIPT:\n{consultation_context['transcript'][:1500]}"
        )

    if consultation_context.get("symptoms"):
        syms = consultation_context["symptoms"][:10]
        lines = []
        for s in syms:
            sev = s.get("severity", "")
            dur = s.get("duration", "")
            detail = " | ".join(filter(None, [sev and f"severity: {sev}", dur and dur != "unknown" and f"duration: {dur}"]))
            lines.append(f"  • {s.get('name', '?')}" + (f" ({detail})" if detail else ""))
        ctx_parts.append("DETECTED SYMPTOMS:\n" + "\n".join(lines))

    if consultation_context.get("red_flags"):
        ctx_parts.append("RED FLAGS: " + ", ".join(consultation_context["red_flags"]))

    if consultation_context.get("triage"):
        t = consultation_context["triage"]
        p  = t.get("priority", "Unknown")
        c  = float(t.get("confidence", 0))
        rs = t.get("reasoning", [])
        ctx_parts.append(
            f"TRIAGE: {p} ({c:.0%} confidence)\n"
            f"REASONING: {'; '.join(str(r) for r in rs[:5])}"
        )

    if consultation_context.get("soap"):
        soap = consultation_context["soap"]
        soap_lines = []
        for label, key in [("S", "subjective"), ("O", "objective"), ("A", "assessment"), ("P", "plan")]:
            val = soap.get(key, "")
            if val:
                soap_lines.append(f"  {label}: {val[:400]}")
        if soap_lines:
            ctx_parts.append("SOAP NOTE:\n" + "\n".join(soap_lines))

    consultation_str = (
        "\n\n".join(ctx_parts)
        if ctx_parts
        else "No active consultation loaded. Answer from general clinical knowledge."
    )

    # ── Patient history ──────────────────────────────────────────────────────
    history_parts = [
        f"  • [{h.get('date', 'Previous visit')}] {str(h.get('text', ''))[:300]}"
        for h in patient_history[:5]
    ]
    patient_history_str = "\n".join(history_parts) if history_parts else "No previous history."

    # ── Guidelines ───────────────────────────────────────────────────────────
    guideline_parts = [
        f"  • {g.get('title', 'Guideline')}: {g.get('text', '')[:300]}"
        for g in guidelines[:4]
    ]
    guidelines_str = "\n".join(guideline_parts) if guideline_parts else "No guidelines retrieved."

    # ── Conversation history (last 10 turns) ─────────────────────────────────
    history_lines = []
    for msg in conversation_history[-10:]:
        role    = "Clinician" if msg.get("role") == "user" else "Copilot"
        content = str(msg.get("content", ""))[:500]
        history_lines.append(f"{role}: {content}")
    history_str = "\n".join(history_lines) if history_lines else "None"

    return {
        "consultation": consultation_str,
        "patient_history": patient_history_str,
        "guidelines": guidelines_str,
        "history": history_str,
    }


def _build_lyzr_message(question: str, ctx: Dict[str, str]) -> str:
    """
    Compose the full message sent to the Lyzr agent.
    Lyzr handles conversation memory server-side via session_id,
    so we embed all relevant context directly in the message.
    """
    parts = [
        "=== CLINICAL CONTEXT ===",
        ctx["consultation"],
        "",
        "=== PATIENT HISTORY ===",
        ctx["patient_history"],
        "",
        "=== CLINICAL GUIDELINES ===",
        ctx["guidelines"],
    ]

    if ctx["history"] and ctx["history"] != "None":
        parts += ["", "=== CONVERSATION HISTORY ===", ctx["history"]]

    parts += ["", "=== CLINICIAN QUESTION ===", question]
    parts += ["", "(IMPORTANT: Reply directly to the clinician in conversational markdown format. DO NOT return raw JSON)"]

    return "\n".join(parts)


class CopilotAgent:
    """AI Doctor Copilot — powered by Lyzr AI with Gemini/HF/rule-based fallback."""

    name = "CopilotAgent"
    description = "Full conversational clinical AI using the Lyzr agent platform"

    def run(
        self,
        question: str,
        consultation_context: Dict[str, Any],
        patient_history: List[Dict],
        guidelines: List[Dict],
        conversation_history: List[Dict],
        consultation_id: Optional[str] = None,
        context: str = "workspace",
        dashboard_stats: Optional[Dict] = None,
    ) -> str:

        ctx = _build_context_block(
            consultation_context, patient_history, guidelines, conversation_history
        )

        # ── Tier 1: Lyzr AI Agent ────────────────────────────────────────────
        lyzr_message = _build_lyzr_message(question, ctx)
        result = lyzr_chat(lyzr_message, agent_key="copilot")
        if result and len(result) > 10:
            parsed = extract_json(result)
            if parsed:
                return self._format_json_response(parsed)
            return result

        # ── Tier 2: Gemini / HuggingFace via llm_call() ──────────────────────
        print("[Copilot] Lyzr unavailable — falling back to Gemini/HF.")
        prompt = FALLBACK_SYSTEM_PROMPT.format(
            consultation_context=ctx["consultation"],
            patient_history=ctx["patient_history"],
            guidelines=ctx["guidelines"],
            history=ctx["history"],
            question=question,
        )
        result = llm_call(prompt)
        if result and len(result) > 10:
            parsed = extract_json(result)
            if parsed:
                return self._format_json_response(parsed)
            return result

        # ── Tier 3: Rich rule-based fallback ─────────────────────────────────
        print("[Copilot] All LLMs unavailable — using rule-based fallback.")
        return self._rule_based_fallback(question, consultation_context, patient_history, guidelines)

    def _format_json_response(self, data: dict) -> str:
        """Format an accidental JSON object into a readable markdown response."""
        if "consultationSummary" in data:
            return str(data["consultationSummary"])
        if "answer" in data:
            return str(data["answer"])
        if "response" in data:
            return str(data["response"])
        if "message" in data:
            return str(data["message"])
        
        parts = []
        for k, v in data.items():
            if isinstance(v, dict):
                parts.append(f"**{k.title()}**\n" + "\n".join(f"- {sk}: {sv}" for sk, sv in v.items()))
            elif isinstance(v, list) and v:
                lines = []
                for item in v:
                    if isinstance(item, dict):
                        lines.append(f"- {item.get('name', item.get('title', str(item)))}")
                    else:
                        lines.append(f"- {item}")
                parts.append(f"**{k.title()}**\n" + "\n".join(lines))
            elif v is not None and v != "":
                parts.append(f"**{k.title()}**: {v}")
        return "\n\n".join(parts) if parts else str(data)

    # ─────────────────────────────────────────────────────────────────────────
    def _rule_based_fallback(
        self,
        question: str,
        consultation_context: Dict[str, Any],
        patient_history: List[Dict],
        guidelines: List[Dict],
    ) -> str:
        q = question.lower()

        if any(w in q for w in ["symptom", "detected", "presenting", "complaint"]):
            syms = consultation_context.get("symptoms", [])
            if syms:
                lines = []
                for s in syms:
                    sev = s.get("severity", "unknown")
                    dur = s.get("duration", "")
                    dur_str = f" — {dur}" if dur and dur != "unknown" else ""
                    lines.append(f"• **{s.get('name', 'Unknown')}** ({sev} severity{dur_str})")
                flags = consultation_context.get("red_flags", [])
                out = f"**Detected Symptoms ({len(syms)} total):**\n\n" + "\n".join(lines)
                if flags:
                    out += f"\n\n **Red Flags:** {', '.join(flags)}"
                return out
            return "No symptoms extracted yet. Process the consultation transcript first."

        if any(w in q for w in ["red flag", "emergency", "critical", "danger"]):
            flags = consultation_context.get("red_flags", [])
            if flags:
                return (
                    f"**{len(flags)} Red Flag(s) Detected:**\n\n"
                    + "\n".join(f"• **{f}**" for f in flags)
                    + "\n\n**Action:** Immediate clinical escalation required."
                )
            return "No red flags detected. Patient appears stable."

        if any(w in q for w in ["priority", "triage", "why", "reason", "classify"]):
            t = consultation_context.get("triage", {})
            if t:
                p    = t.get("priority", "Unknown")
                conf = float(t.get("confidence", 0))
                rs   = t.get("reasoning", [])
                emoji = {"P1": "", "P2": "", "P3": ""}.get(p, "")
                out  = f"{emoji} **Triage: {p}** ({conf:.0%} confidence)\n\n**Reasoning:**\n"
                out += "\n".join(f"• {r}" for r in rs)
                return out
            return "Triage not performed yet. Process the consultation transcript first."

        if any(w in q for w in ["history", "previous", "past", "visit", "record"]):
            if patient_history:
                lines = [
                    f"• **{h.get('date', 'Visit')}:** {str(h.get('text', ''))[:200]}"
                    for h in patient_history[:5]
                ]
                return f"**Patient History ({len(patient_history)} records):**\n\n" + "\n".join(lines)
            return "No previous visit history found in patient memory."

        if any(w in q for w in ["soap", "note", "subjective", "objective", "assessment", "plan", "summar"]):
            soap = consultation_context.get("soap", {})
            if soap:
                parts = []
                for label, key in [("S — Subjective", "subjective"), ("O — Objective", "objective"),
                                    ("A — Assessment", "assessment"), ("P — Plan", "plan")]:
                    val = soap.get(key, "")
                    if val:
                        parts.append(f"**{label}**\n{val}")
                if parts:
                    return "**SOAP Note:**\n\n" + "\n\n".join(parts)
            return "SOAP notes not generated yet. Process the consultation transcript first."

        if any(w in q for w in ["next", "action", "recommend", "what should", "do now"]):
            t = consultation_context.get("triage", {})
            p = t.get("priority", "") if t else ""
            flags = consultation_context.get("red_flags", [])
            if p == "P1" or flags:
                return (
                    "🚨 **Immediate Actions (P1 Emergency):**\n\n"
                    "1. Alert attending physician immediately\n"
                    "2. Activate emergency response team\n"
                    "3. Monitor vitals continuously\n"
                    "4. Establish IV access\n"
                    "5. Document all interventions in real time"
                )
            elif p == "P2":
                return (
                    "**Urgent Actions (P2):**\n\n"
                    "1. Assess patient within 10–30 minutes\n"
                    "2. Order relevant investigations\n"
                    "3. Notify on-call physician\n"
                    "4. Monitor vitals every 15 minutes"
                )
            return (
                "**Standard Actions (P3):**\n\n"
                "1. Queue for standard consultation\n"
                "2. Complete SOAP documentation\n"
                "3. Order routine investigations if required\n"
                "4. Arrange follow-up as indicated"
            )

        has_consultation = bool(consultation_context.get("triage") or consultation_context.get("symptoms"))
        if has_consultation:
            return (
                "I'm ready to help. Try asking:\n\n"
                "• **\"What symptoms were detected?\"**\n"
                "• **\"Why was this priority assigned?\"**\n"
                "• **\"Show me the SOAP notes\"**\n"
                "• **\"Any red flags?\"**\n"
                "• **\"What's the recommended next action?\"**\n"
                "• **\"Has this patient had similar issues?\"**\n"
                "• **Any general medical question**"
            )
        return (
            "I'm your AI Doctor Copilot (powered by Lyzr AI).\n\n"
            "**With an active consultation:** symptom analysis, triage reasoning, SOAP notes, red flags, action plans.\n\n"
            "**General questions:** drug interactions, dosing, differential diagnoses, guidelines, pathophysiology.\n\n"
            "Select a patient and process a transcript to unlock consultation-specific insights."
        )
