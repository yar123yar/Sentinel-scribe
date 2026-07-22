"""
Red Flag Agent (Google ADK style)
Scans the transcript for life-threatening emergency symptoms.
Returns a list of detected red flags and an emergency boolean.
"""

import re
from typing import TypedDict, List
from .llm import llm_call, extract_json

# Rule-based fallback keywords for offline operation
RED_FLAG_PATTERNS = {
    "Chest pain": r"\b(chest\s*pain|chest\s*tightness|chest\s*pressure|angina)\b",
    "Difficulty breathing": r"\b(can't\s*breathe|difficulty\s*breath|shortness\s*of\s*breath|dyspnea|sob|breathless)\b",
    "Stroke symptoms": r"\b(stroke|facial\s*droop|arm\s*weakness|speech\s*difficult|slurred\s*speech|sudden\s*numbness|aphasia)\b",
    "Severe bleeding": r"\b(severe\s*bleed|profuse\s*bleed|hemorrhage|haemorrhage|blood\s*loss|uncontrolled\s*bleed)\b",
    "Loss of consciousness": r"\b(unconscious|loss\s*of\s*consciousness|faint|syncope|collapse|unresponsive)\b",
    "Severe allergic reaction": r"\b(anaphylaxis|anaphylactic|severe\s*allerg|swelling\s*throat|throat\s*closing)\b",
    "Severe abdominal pain": r"\b(severe\s*abdominal|acute\s*abdomen|rigid\s*abdomen|guarding|rebound\s*tenderness)\b",
    "High fever with stiff neck": r"\b(stiff\s*neck|nuchal\s*rigid|meningit|fever.*stiff|photophobia)\b",
    "Altered mental status": r"\b(confusion|disoriented|altered\s*mental|delerium|delirium)\b",
    "Severe trauma": r"\b(major\s*trauma|head\s*injury|spinal\s*injury|crush\s*injury|penetrating\s*wound)\b",
}

SYSTEM_PROMPT = """You are an emergency triage nurse scanning a consultation transcript for RED FLAG symptoms.

Red flags include:
- Chest pain / cardiac symptoms
- Difficulty breathing / respiratory distress
- Stroke symptoms (FAST: face, arms, speech, time)
- Severe bleeding / hemorrhage
- Loss of consciousness / syncope
- Anaphylaxis / severe allergic reaction
- Severe abdominal pain
- Meningitis signs (stiff neck + fever + photophobia)
- Altered mental status
- Severe trauma

Return ONLY a JSON object:
{
  "has_emergency": true/false,
  "red_flags": ["list of detected red flag names"],
  "emergency_level": "critical" | "urgent" | "none",
  "alert_message": "short message for the clinician or empty string"
}
"""


class RedFlagResult(TypedDict):
    has_emergency: bool
    red_flags: List[str]
    emergency_level: str
    alert_message: str


class RedFlagAgent:
    """Google ADK-style agent for detecting life-threatening symptoms."""

    name = "RedFlagAgent"
    description = "Detects emergency red-flag symptoms in consultation transcripts"

    def run(self, transcript: str) -> RedFlagResult:
        # Always run rule-based check first (fast + offline)
        detected_rule_based = []
        lower = transcript.lower()
        for flag_name, pattern in RED_FLAG_PATTERNS.items():
            if re.search(pattern, lower, re.IGNORECASE):
                detected_rule_based.append(flag_name)

        # Try LLM for richer detection
        prompt = f"{SYSTEM_PROMPT}\n\nTRANSCRIPT:\n{transcript}\n\nJSON:"
        fallback = {
            "has_emergency": len(detected_rule_based) > 0,
            "red_flags": detected_rule_based,
            "emergency_level": "critical" if len(detected_rule_based) >= 2 else ("urgent" if detected_rule_based else "none"),
            "alert_message": f"⚠️ Red flags detected: {', '.join(detected_rule_based)}" if detected_rule_based else "",
        }

        raw = llm_call(prompt, fallback=fallback)
        result = extract_json(raw)

        if result and isinstance(result, dict):
            # Merge rule-based with LLM results
            combined_flags = list(set(result.get("red_flags", []) + detected_rule_based))
            result["red_flags"] = combined_flags
            result["has_emergency"] = bool(combined_flags) or result.get("has_emergency", False)
            return result

        return fallback
