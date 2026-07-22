from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime


# ─── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    name: str
    role: str
    email: str
    phone_number: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ─── Users ────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    phone_number: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Patients ─────────────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    name: str
    dob: Optional[str] = None
    gender: Optional[str] = None
    mrn: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[List[str]] = []
    chronic_conditions: Optional[List[str]] = []


class PatientOut(BaseModel):
    id: str
    name: str
    dob: Optional[str] = None
    gender: Optional[str] = None
    mrn: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[List[str]] = []
    chronic_conditions: Optional[List[str]] = []
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Symptoms ─────────────────────────────────────────────────────────────────

class SymptomOut(BaseModel):
    id: str
    name: str
    severity: Optional[str] = None
    duration: Optional[str] = None
    is_red_flag: bool = False

    class Config:
        from_attributes = True


# ─── Triage ───────────────────────────────────────────────────────────────────

class TriageResultOut(BaseModel):
    id: str
    priority: str
    confidence: float
    reasoning: List[str]
    red_flags: List[str]
    guideline_matches: List[str]
    recommended_action: Optional[str] = None
    differential_diagnosis: Optional[List[str]] = []

    class Config:
        from_attributes = True


# ─── SOAP ─────────────────────────────────────────────────────────────────────

class SoapNoteOut(BaseModel):
    id: str
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None

    class Config:
        from_attributes = True


class SoapNoteUpdate(BaseModel):
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None


# ─── Consultations ────────────────────────────────────────────────────────────

class ConsultationCreate(BaseModel):
    patient_id: str
    transcript: str
    chief_complaint: Optional[str] = None


class ConsultationOut(BaseModel):
    id: str
    patient_id: str
    user_id: str
    transcript: str
    cleaned_transcript: Optional[str] = None
    status: str
    chief_complaint: Optional[str] = None
    created_at: datetime
    patient: Optional[PatientOut] = None
    symptoms: Optional[List[SymptomOut]] = []
    triage_result: Optional[TriageResultOut] = None
    soap_note: Optional[SoapNoteOut] = None

    class Config:
        from_attributes = True


# ─── Triage Request ───────────────────────────────────────────────────────────

class TriageRequest(BaseModel):
    consultation_id: str
    patient_id: str


class TriageResponse(BaseModel):
    priority: str
    confidence: float
    reasoning: List[str]
    red_flags: List[str]
    symptoms: List[dict]
    guideline_matches: List[str]
    recommended_action: Optional[str] = None
    differential_diagnosis: Optional[List[str]] = []
    soap_note: Optional[dict] = None


# ─── SOAP Request ─────────────────────────────────────────────────────────────

class SOAPRequest(BaseModel):
    consultation_id: str
    transcript: str
    symptoms: Optional[List[dict]] = []
    triage_priority: Optional[str] = None


# ─── Copilot ──────────────────────────────────────────────────────────────────

class CopilotMessage(BaseModel):
    role: str  # user | assistant
    content: str


class CopilotRequest(BaseModel):
    patient_id: str
    consultation_id: Optional[str] = None
    transcript: Optional[str] = None
    message: str
    history: Optional[List[CopilotMessage]] = []
    context: Optional[str] = "workspace"  # 'workspace' | 'dashboard'


class CopilotResponse(BaseModel):
    answer: str
    sources: Optional[List[str]] = []


# ─── Dashboard ────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_consultations: int
    emergency_cases: int
    soap_notes_generated: int
    total_patients: int
    triage_accuracy: float = 94.0
    pending_reviews: int = 0
    recent_consultations: List[ConsultationOut]
    recent_patients: List[PatientOut] = []
