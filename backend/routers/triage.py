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
    # Verify consultation exists — load with relationships eagerly
    result = await db.execute(
        select(Consultation)
        .options(
            selectinload(Consultation.patient),
            selectinload(Consultation.symptoms),
            selectinload(Consultation.triage_result),
            selectinload(Consultation.soap_note),
        )
        .where(Consultation.id == body.consultation_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # Update status to processing
    consultation.status = "processing"
    await db.commit()

    try:
        # Pass patient profile if available
        patient_profile = {}
        if consultation.patient:
            patient_profile = {
                "name": consultation.patient.name,
                "dob": consultation.patient.dob,
                "gender": consultation.patient.gender,
                "allergies": consultation.patient.allergies,
                "chronic_conditions": consultation.patient.chronic_conditions,
            }

        # Run the full pipeline (all blocking I/O runs in thread executors)
        pipeline_result = await pipeline.run(
            transcript=consultation.transcript,
            patient_id=body.patient_id,
            consultation_id=body.consultation_id,
            patient_profile=patient_profile,
        )

        # Refresh consultation to get latest state (avoid stale cache)
        await db.refresh(consultation)

        # Update cleaned transcript
        consultation.cleaned_transcript = pipeline_result.get("cleaned_transcript", consultation.transcript)
        consultation.chief_complaint = pipeline_result.get("chief_complaint", "")

        # Delete old symptoms before adding new ones
        for sym in consultation.symptoms:
            await db.delete(sym)
        await db.flush()

        # Save new symptoms
        red_flag_list = pipeline_result["red_flags"].get("red_flags", [])
        red_flags_lower = [r.lower() for r in red_flag_list]

        for sym_data in pipeline_result["symptoms"]:
            symptom = Symptom(
                id=str(uuid.uuid4()),
                consultation_id=consultation.id,
                name=sym_data.get("name", ""),
                severity=sym_data.get("severity", "moderate"),
                duration=sym_data.get("duration", ""),
                is_red_flag=sym_data.get("name", "").lower() in red_flags_lower,
            )
            db.add(symptom)

        # Save/update triage result
        triage = pipeline_result["triage"]
        if consultation.triage_result:
            tr = consultation.triage_result
            tr.priority = triage["priority"]
            tr.confidence = float(triage["confidence"])
            tr.reasoning = triage["reasoning"]
            tr.red_flags = red_flag_list
            tr.guideline_matches = triage.get("guideline_matches", [])
            tr.recommended_action = triage.get("recommended_action")
            tr.differential_diagnosis = triage.get("differential_diagnosis", [])
        else:
            tr = TriageResult(
                id=str(uuid.uuid4()),
                consultation_id=consultation.id,
                priority=triage["priority"],
                confidence=float(triage["confidence"]),
                reasoning=triage["reasoning"],
                red_flags=red_flag_list,
                guideline_matches=triage.get("guideline_matches", []),
                recommended_action=triage.get("recommended_action"),
                differential_diagnosis=triage.get("differential_diagnosis", []),
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
            confidence=float(triage["confidence"]),
            reasoning=triage["reasoning"],
            red_flags=red_flag_list,
            symptoms=pipeline_result["symptoms"],
            guideline_matches=triage.get("guideline_matches", []),
            recommended_action=triage.get("recommended_action"),
            differential_diagnosis=triage.get("differential_diagnosis", []),
            soap_note=soap,
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        try:
            consultation.status = "error"
            await db.commit()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")

from pydantic import BaseModel

class AccuracyUpdate(BaseModel):
    is_accurate: bool

@router.patch("/{consultation_id}/accuracy")
async def update_triage_accuracy(
    consultation_id: str,
    body: AccuracyUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TriageResult)
        .join(Consultation)
        .where(
            TriageResult.consultation_id == consultation_id,
            Consultation.user_id == user.id
        )
    )
    triage = result.scalar_one_or_none()
    if not triage:
        raise HTTPException(status_code=404, detail="Triage result not found")

    triage.is_accurate = body.is_accurate
    await db.commit()
    return {"status": "success", "is_accurate": triage.is_accurate}
