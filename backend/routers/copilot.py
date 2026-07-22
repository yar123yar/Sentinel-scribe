from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models import User, Consultation, Symptom, TriageResult, SoapNote
from schemas import CopilotRequest, CopilotResponse
from auth import get_current_user
from agents.copilot_agent import CopilotAgent
import qdrant_service as qdrant

router = APIRouter(prefix="/copilot", tags=["copilot"])
copilot_agent = CopilotAgent()


@router.post("/chat", response_model=CopilotResponse)
async def copilot_chat(
    body: CopilotRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # Build consultation context
    consultation_context = {}
    if body.consultation_id:
        result = await db.execute(
            select(Consultation)
            .options(
                selectinload(Consultation.symptoms),
                selectinload(Consultation.triage_result),
                selectinload(Consultation.soap_note),
            )
            .where(Consultation.id == body.consultation_id)
        )
        consultation = result.scalar_one_or_none()
        if consultation:
            consultation_context = {
                "transcript": consultation.cleaned_transcript or consultation.transcript,
                "symptoms": [
                    {"name": s.name, "severity": s.severity, "duration": s.duration}
                    for s in consultation.symptoms
                ],
                "triage": {
                    "priority": consultation.triage_result.priority if consultation.triage_result else None,
                    "confidence": consultation.triage_result.confidence if consultation.triage_result else None,
                    "reasoning": consultation.triage_result.reasoning if consultation.triage_result else [],
                } if consultation.triage_result else {},
                "red_flags": consultation.triage_result.red_flags if consultation.triage_result else [],
                "soap": {
                    "subjective":  consultation.soap_note.subjective  if consultation.soap_note else "",
                    "objective":   consultation.soap_note.objective   if consultation.soap_note else "",
                    "assessment":  consultation.soap_note.assessment  if consultation.soap_note else "",
                    "plan":        consultation.soap_note.plan        if consultation.soap_note else "",
                } if consultation.soap_note else {},
            }

    # Retrieve patient memory and guidelines in parallel
    import asyncio
    patient_memory, guidelines = await asyncio.gather(
        qdrant.search_patient_memory(body.patient_id, body.message, top_k=4),
        qdrant.search_guidelines(body.message, top_k=2),
    )

    answer = copilot_agent.run(
        question=body.message,
        consultation_context=consultation_context,
        patient_history=patient_memory,
        guidelines=guidelines,
        conversation_history=[m.model_dump() for m in (body.history or [])],
        consultation_id=body.consultation_id,
        context=body.context or "workspace",
    )

    return CopilotResponse(
        answer=answer,
        sources=[g.get("title", "") for g in guidelines if g.get("title")],
    )
