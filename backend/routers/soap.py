from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models import User, Consultation, SoapNote
from schemas import SOAPRequest, SoapNoteOut, SoapNoteUpdate
from auth import get_current_user
from agents.soap_agent import SOAPAgent
import uuid

router = APIRouter(prefix="/soap", tags=["soap"])
soap_agent = SOAPAgent()


@router.post("", response_model=SoapNoteOut)
async def generate_soap(
    body: SOAPRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Consultation)
        .options(selectinload(Consultation.soap_note), selectinload(Consultation.symptoms))
        .where(Consultation.id == body.consultation_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    soap = soap_agent.run(
        transcript=body.transcript,
        symptoms=body.symptoms or [],
        red_flags=[],
        priority=body.triage_priority or "P3",
    )

    if consultation.soap_note:
        sn = consultation.soap_note
        sn.subjective = soap["subjective"]
        sn.objective = soap["objective"]
        sn.assessment = soap["assessment"]
        sn.plan = soap["plan"]
    else:
        sn = SoapNote(
            id=str(uuid.uuid4()),
            consultation_id=consultation.id,
            **soap,
        )
        db.add(sn)

    await db.commit()
    await db.refresh(sn)
    return sn


@router.put("/{soap_id}", response_model=SoapNoteOut)
async def update_soap(
    soap_id: str,
    body: SoapNoteUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(SoapNote).where(SoapNote.id == soap_id))
    sn = result.scalar_one_or_none()
    if not sn:
        raise HTTPException(status_code=404, detail="SOAP note not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(sn, field, value)

    await db.commit()
    await db.refresh(sn)
    return sn
