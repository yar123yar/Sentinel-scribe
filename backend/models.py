import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Text, DateTime,
    ForeignKey, Boolean, JSON, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from database import Base


class TriagePriority(str, enum.Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"


class ConsultationStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETE = "complete"
    ERROR = "error"


def gen_uuid():
    return str(uuid.uuid4())


# ─── Users ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, default="doctor")
    phone_number = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    consultations = relationship("Consultation", back_populates="user")
    patients = relationship("Patient", back_populates="user")

# ─── Patients ─────────────────────────────────────────────────────────────────

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    dob = Column(String)                     # ISO date string
    gender = Column(String)
    mrn = Column(String, unique=True)        # Medical Record Number
    blood_type = Column(String)
    allergies = Column(JSON, default=list)
    chronic_conditions = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="patients")
    consultations = relationship("Consultation", back_populates="patient", cascade="all, delete-orphan")


# ─── Consultations ────────────────────────────────────────────────────────────

class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(String, primary_key=True, default=gen_uuid)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    transcript = Column(Text, nullable=False)
    cleaned_transcript = Column(Text)
    status = Column(String, default="pending")
    chief_complaint = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="consultations")
    user = relationship("User", back_populates="consultations")
    symptoms = relationship("Symptom", back_populates="consultation", cascade="all, delete-orphan")
    triage_result = relationship("TriageResult", back_populates="consultation", uselist=False, cascade="all, delete-orphan")
    soap_note = relationship("SoapNote", back_populates="consultation", uselist=False, cascade="all, delete-orphan")


# ─── Symptoms ─────────────────────────────────────────────────────────────────

class Symptom(Base):
    __tablename__ = "symptoms"

    id = Column(String, primary_key=True, default=gen_uuid)
    consultation_id = Column(String, ForeignKey("consultations.id"), nullable=False)
    name = Column(String, nullable=False)
    severity = Column(String)       # mild / moderate / severe
    duration = Column(String)
    is_red_flag = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    consultation = relationship("Consultation", back_populates="symptoms")


# ─── Triage Results ───────────────────────────────────────────────────────────

class TriageResult(Base):
    __tablename__ = "triage_results"

    id = Column(String, primary_key=True, default=gen_uuid)
    consultation_id = Column(String, ForeignKey("consultations.id"), nullable=False)
    priority = Column(String, nullable=False)        # P1 / P2 / P3
    confidence = Column(Float, default=0.0)
    reasoning = Column(JSON, default=list)           # list of reason strings
    red_flags = Column(JSON, default=list)           # detected red flag symptoms
    guideline_matches = Column(JSON, default=list)   # matched clinical guidelines
    recommended_action = Column(String)
    differential_diagnosis = Column(JSON, default=list)
    is_accurate = Column(Boolean, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    consultation = relationship("Consultation", back_populates="triage_result")


# ─── SOAP Notes ───────────────────────────────────────────────────────────────

class SoapNote(Base):
    __tablename__ = "soap_notes"

    id = Column(String, primary_key=True, default=gen_uuid)
    consultation_id = Column(String, ForeignKey("consultations.id"), nullable=False)
    subjective = Column(Text)
    objective = Column(Text)
    assessment = Column(Text)
    plan = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    consultation = relationship("Consultation", back_populates="soap_note")
