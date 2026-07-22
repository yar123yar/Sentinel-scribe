"""
Transcript Agent — powered by Lyzr AI (Tier 1) with Gemini/HF fallback.

Cleans raw consultation transcripts: removes filler words, timestamps,
speaker labels, and normalises formatting.
"""

from .llm import llm_call
from .lyzr_client import lyzr_chat

SYSTEM_PROMPT = """You are a medical transcript cleaning agent.
Clean the following consultation transcript:
- Remove timestamps, filler words (um, uh, like), false starts
- Remove speaker labels (Doctor:, Patient:, Dr., etc.) but keep the content
- Fix obvious transcription errors
- Return only the cleaned transcript text, no explanation
"""


class TranscriptAgent:
    """Cleans and normalises raw consultation transcripts."""

    name = "TranscriptAgent"
    description = "Cleans and normalises raw consultation transcripts"

    def run(self, transcript: str) -> str:
        if not transcript or len(transcript.strip()) < 10:
            return transcript

        prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            f"RAW TRANSCRIPT:\n{transcript}\n\n"
            "CLEANED TRANSCRIPT:"
        )

        # ── Tier 1: Lyzr Transcript Agent ────────────────────────────────────
        result = lyzr_chat(prompt, agent_key="transcript")
        if result and len(result.strip()) > 10:
            print("[TranscriptAgent] ✓ Used Lyzr transcript agent.")
            return result.strip()

        # ── Tier 2: Gemini / HuggingFace ─────────────────────────────────────
        print("[TranscriptAgent] Lyzr unavailable — falling back to Gemini/HF.")
        result = llm_call(prompt, fallback=transcript)
        return result if result else transcript
