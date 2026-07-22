"""
Lyzr-style Pipeline Orchestrator
Runs the full consultation pipeline sequentially:
  Transcript → RedFlag → Symptom → Qdrant RAG → Triage → SOAP → Save
"""

import asyncio
from typing import Dict, Any, Optional

from agents.transcript_agent import TranscriptAgent
from agents.red_flag_agent import RedFlagAgent
from agents.symptom_agent import SymptomAgent
from agents.triage_agent import TriageAgent
from agents.soap_agent import SOAPAgent
import qdrant_service as qdrant


class ClinicalPipeline:
    """
    Lyzr-style multi-agent orchestrator for clinical consultation analysis.
    Each step is logged and the full result is returned.
    """

    def __init__(self):
        self.transcript_agent = TranscriptAgent()
        self.red_flag_agent = RedFlagAgent()
        self.symptom_agent = SymptomAgent()
        self.triage_agent = TriageAgent()
        self.soap_agent = SOAPAgent()

    async def run(
        self,
        transcript: str,
        patient_id: str,
        consultation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        steps = []

        # ── Step 1: Clean Transcript ─────────────────────────────────────────
        print("🔄 [Pipeline] Step 1: TranscriptAgent")
        cleaned = self.transcript_agent.run(transcript)
        steps.append({"step": "transcript_cleaning", "status": "done"})

        # ── Step 2: Red Flag Detection ────────────────────────────────────────
        print("🔄 [Pipeline] Step 2: RedFlagAgent")
        red_flag_result = self.red_flag_agent.run(cleaned)
        steps.append({
            "step": "red_flag_detection",
            "status": "done",
            "has_emergency": red_flag_result.get("has_emergency", False),
        })

        # ── Step 3: Symptom Extraction ────────────────────────────────────────
        print("🔄 [Pipeline] Step 3: SymptomAgent")
        symptom_result = self.symptom_agent.run(cleaned)
        symptoms = symptom_result.get("symptoms", [])
        steps.append({"step": "symptom_extraction", "status": "done", "count": len(symptoms)})

        # ── Step 4: Qdrant RAG (Guidelines + Patient Memory) ──────────────────
        print("🔄 [Pipeline] Step 4: Qdrant RAG")
        symptom_query = " ".join(
            s.get("name", "") for s in symptoms[:5]
        ) + " " + " ".join(red_flag_result.get("red_flags", []))

        guidelines, patient_memory = await asyncio.gather(
            qdrant.search_guidelines(symptom_query, top_k=3),
            qdrant.search_patient_memory(patient_id, symptom_query, top_k=4),
        )
        steps.append({"step": "qdrant_retrieval", "status": "done"})

        # ── Step 5: Triage Classification ─────────────────────────────────────
        print("🔄 [Pipeline] Step 5: TriageAgent")
        triage_result = await self.triage_agent.run(
            transcript=cleaned,
            symptoms=symptoms,
            red_flags=red_flag_result.get("red_flags", []),
            guidelines=guidelines,
        )
        steps.append({"step": "triage_classification", "status": "done", "priority": triage_result.get("priority")})

        # ── Step 6: SOAP Note Generation ──────────────────────────────────────
        print("🔄 [Pipeline] Step 6: SOAPAgent")
        soap_result = self.soap_agent.run(
            transcript=cleaned,
            symptoms=symptoms,
            red_flags=red_flag_result.get("red_flags", []),
            priority=triage_result.get("priority", "P3"),
        )
        steps.append({"step": "soap_generation", "status": "done"})

        # ── Step 7: Save to Qdrant Patient Memory ─────────────────────────────
        if consultation_id:
            print("🔄 [Pipeline] Step 7: Saving to Qdrant")
            summary = (
                f"Consultation: {symptom_result.get('chief_complaint', 'General visit')}. "
                f"Priority: {triage_result.get('priority')}. "
                f"Symptoms: {', '.join(s.get('name','') for s in symptoms[:5])}. "
                f"Plan: {soap_result.get('plan', '')[:200]}"
            )
            await qdrant.upsert_patient_memory(
                patient_id=patient_id,
                consultation_id=consultation_id,
                text=summary,
                metadata={
                    "priority": triage_result.get("priority"),
                    "chief_complaint": symptom_result.get("chief_complaint", ""),
                    "red_flags": red_flag_result.get("red_flags", []),
                },
            )
            steps.append({"step": "memory_save", "status": "done"})

        print("✅ [Pipeline] Complete")
        return {
            "cleaned_transcript": cleaned,
            "red_flags": red_flag_result,
            "symptoms": symptoms,
            "chief_complaint": symptom_result.get("chief_complaint", ""),
            "triage": triage_result,
            "soap": soap_result,
            "patient_memory": patient_memory,
            "guidelines_used": guidelines,
            "pipeline_steps": steps,
        }
