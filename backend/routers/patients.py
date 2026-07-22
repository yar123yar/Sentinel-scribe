from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from database import get_db
from models import User, Patient, Consultation
from schemas import PatientCreate, PatientOut
from auth import get_current_user
import uuid

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=List[PatientOut])
async def list_patients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Patient)
        .where(Patient.user_id == current_user.id)
        .order_by(Patient.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{patient_id}", response_model=PatientOut)
async def get_patient(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Patient)
        .where(Patient.id == patient_id, Patient.user_id == current_user.id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.post("", response_model=PatientOut, status_code=201)
async def create_patient(
    body: PatientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = Patient(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        mrn=body.mrn or f"MRN-{uuid.uuid4().hex[:8].upper()}",
        **body.model_dump(exclude={"mrn"}),
    )
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return patient


@router.delete("/{patient_id}", status_code=204)
async def delete_patient(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Patient)
        .where(Patient.id == patient_id, Patient.user_id == current_user.id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    await db.delete(patient)
    await db.commit()
    return None
