"""
Transcript Agent (Google ADK style)
Cleans raw consultation transcript — removes filler words,
timestamps, speaker labels, and normalises formatting.
"""

from .llm import llm_call

SYSTEM_PROMPT = """You are a medical transcript cleaning agent.
Clean the following consultation transcript:
- Remove timestamps, filler words (um, uh, like), false starts
- Remove speaker labels (Doctor:, Patient:, Dr., etc.) but keep the content
- Fix obvious transcription errors
- Return only the cleaned transcript text, no explanation
"""


class TranscriptAgent:
    """Google ADK-style agent for cleaning consultation transcripts."""

    name = "TranscriptAgent"
    description = "Cleans and normalises raw consultation transcripts"

    def run(self, transcript: str) -> str:
        if not transcript or len(transcript.strip()) < 10:
            return transcript

        prompt = f"{SYSTEM_PROMPT}\n\nRAW TRANSCRIPT:\n{transcript}\n\nCLEANED TRANSCRIPT:"
        result = llm_call(prompt, fallback=transcript)

        return result if result else transcript
