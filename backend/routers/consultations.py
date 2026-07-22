from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from database import get_db
from models import User, Patient, Consultation, Symptom, TriageResult, SoapNote
from schemas import ConsultationCreate, ConsultationOut
from auth import get_current_user
import uuid

router = APIRouter(prefix="/consultations", tags=["consultations"])


@router.get("", response_model=List[ConsultationOut])
async def list_consultations(
    patient_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Consultation).options(
        selectinload(Consultation.patient),
        selectinload(Consultation.symptoms),
        selectinload(Consultation.triage_result),
        selectinload(Consultation.soap_note),
    ).order_by(Consultation.created_at.desc()).limit(50)
    
    query = query.where(Consultation.user_id == current_user.id)
    if patient_id:
        query = query.where(Consultation.patient_id == patient_id)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{consultation_id}", response_model=ConsultationOut)
async def get_consultation(
    consultation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Consultation)
        .options(
            selectinload(Consultation.patient),
            selectinload(Consultation.symptoms),
            selectinload(Consultation.triage_result),
            selectinload(Consultation.soap_note),
        )
        .where(Consultation.id == consultation_id, Consultation.user_id == current_user.id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return consultation


@router.post("", response_model=ConsultationOut, status_code=201)
async def create_consultation(
    body: ConsultationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Verify patient exists
    patient_result = await db.execute(select(Patient).where(Patient.id == body.patient_id))
    if not patient_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Patient not found")

    consultation = Consultation(
        id=str(uuid.uuid4()),
        patient_id=body.patient_id,
        user_id=user.id,
        transcript=body.transcript,
        chief_complaint=body.chief_complaint,
        status="pending",
    )
    db.add(consultation)
    await db.commit()
    await db.refresh(consultation)

    # Reload with relationships
    result = await db.execute(
        select(Consultation)
        .options(
            selectinload(Consultation.patient),
            selectinload(Consultation.symptoms),
            selectinload(Consultation.triage_result),
            selectinload(Consultation.soap_note),
        )
        .where(Consultation.id == consultation.id)
    )
    return result.scalar_one()

@router.patch("/{consultation_id}/complete", response_model=ConsultationOut)
async def complete_consultation(
    consultation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Consultation)
        .where(Consultation.id == consultation_id, Consultation.user_id == current_user.id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    consultation.status = "completed"
    await db.commit()
    await db.refresh(consultation)

    # Reload with relationships
    res = await db.execute(
        select(Consultation)
        .options(
            selectinload(Consultation.patient),
            selectinload(Consultation.symptoms),
            selectinload(Consultation.triage_result),
            selectinload(Consultation.soap_note),
        )
        .where(Consultation.id == consultation.id)
    )
    return res.scalar_one()
