from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from database import get_db
from models import User, Patient, Consultation, SoapNote, TriageResult
from schemas import DashboardStats
from auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # Counts
    total_consultations = (await db.execute(select(func.count(Consultation.id)))).scalar() or 0
    total_patients = (await db.execute(select(func.count(Patient.id)))).scalar() or 0
    soap_notes_generated = (await db.execute(select(func.count(SoapNote.id)))).scalar() or 0
    emergency_cases = (
        await db.execute(
            select(func.count(TriageResult.id)).where(TriageResult.priority == "P1")
        )
    ).scalar() or 0

    # Recent consultations (last 5)
    recent_result = await db.execute(
        select(Consultation)
        .options(
            selectinload(Consultation.patient),
            selectinload(Consultation.symptoms),
            selectinload(Consultation.triage_result),
            selectinload(Consultation.soap_note),
        )
        .order_by(Consultation.created_at.desc())
        .limit(5)
    )
    recent = recent_result.scalars().all()

    return DashboardStats(
        total_consultations=total_consultations,
        emergency_cases=emergency_cases,
        soap_notes_generated=soap_notes_generated,
        total_patients=total_patients,
        recent_consultations=recent,
    )
