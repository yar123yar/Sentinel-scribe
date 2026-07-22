from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models import User, Consultation, Symptom, TriageResult, SoapNote
from schemas import TriageRequest, TriageResponse
from auth import get_current_user
from agents.pipeline import ClinicalPipeline
import uuid

router = APIRouter(prefix="/triage", tags=["triage"])
pipeline = ClinicalPipeline()


@router.post("", response_model=TriageResponse)
async def run_triage(
    body: TriageRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Verify consultation exists
    result = await db.execute(
        select(Consultation)
        .options(selectinload(Consultation.symptoms), selectinload(Consultation.triage_result))
        .where(Consultation.id == body.consultation_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # Update status to processing
    consultation.status = "processing"
    await db.commit()

    try:
        # Run the full pipeline
        pipeline_result = await pipeline.run(
            transcript=body.transcript,
            patient_id=body.patient_id,
            consultation_id=body.consultation_id,
        )

        # Update cleaned transcript
        consultation.cleaned_transcript = pipeline_result["cleaned_transcript"]
        consultation.chief_complaint = pipeline_result.get("chief_complaint", "")

        # Save symptoms
        for sym_data in pipeline_result["symptoms"]:
            red_flags = pipeline_result["red_flags"].get("red_flags", [])
            symptom = Symptom(
                id=str(uuid.uuid4()),
                consultation_id=consultation.id,
                name=sym_data.get("name", ""),
                severity=sym_data.get("severity", "moderate"),
                duration=sym_data.get("duration", ""),
                is_red_flag=sym_data.get("name", "").lower() in [r.lower() for r in red_flags],
            )
            db.add(symptom)

        # Save/update triage result
        triage = pipeline_result["triage"]
        if consultation.triage_result:
            tr = consultation.triage_result
            tr.priority = triage["priority"]
            tr.confidence = triage["confidence"]
            tr.reasoning = triage["reasoning"]
            tr.red_flags = pipeline_result["red_flags"].get("red_flags", [])
            tr.guideline_matches = triage.get("guideline_matches", [])
        else:
            tr = TriageResult(
                id=str(uuid.uuid4()),
                consultation_id=consultation.id,
                priority=triage["priority"],
                confidence=triage["confidence"],
                reasoning=triage["reasoning"],
                red_flags=pipeline_result["red_flags"].get("red_flags", []),
                guideline_matches=triage.get("guideline_matches", []),
            )
            db.add(tr)

        # Save/update SOAP note
        soap = pipeline_result["soap"]
        if consultation.soap_note:
            sn = consultation.soap_note
            sn.subjective = soap.get("subjective", "")
            sn.objective = soap.get("objective", "")
            sn.assessment = soap.get("assessment", "")
            sn.plan = soap.get("plan", "")
        else:
            sn = SoapNote(
                id=str(uuid.uuid4()),
                consultation_id=consultation.id,
                subjective=soap.get("subjective", ""),
                objective=soap.get("objective", ""),
                assessment=soap.get("assessment", ""),
                plan=soap.get("plan", ""),
            )
            db.add(sn)

        consultation.status = "complete"
        await db.commit()

        return TriageResponse(
            priority=triage["priority"],
            confidence=triage["confidence"],
            reasoning=triage["reasoning"],
            red_flags=pipeline_result["red_flags"].get("red_flags", []),
            symptoms=pipeline_result["symptoms"],
            guideline_matches=triage.get("guideline_matches", []),
            soap_note=soap,
        )

    except Exception as e:
        consultation.status = "error"
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")
