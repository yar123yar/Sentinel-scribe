// TypeScript types mirroring backend Pydantic schemas

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Patient {
  id: string;
  name: string;
  dob?: string;
  gender?: string;
  mrn?: string;
  blood_type?: string;
  allergies: string[];
  chronic_conditions: string[];
  created_at: string;
}

export interface Symptom {
  id: string;
  name: string;
  severity?: string;
  duration?: string;
  is_red_flag: boolean;
}

export interface TriageResult {
  id: string;
  priority: 'P1' | 'P2' | 'P3';
  confidence: number;
  reasoning: string[];
  red_flags: string[];
  guideline_matches: string[];
}

export interface SoapNote {
  id: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface Consultation {
  id: string;
  patient_id: string;
  user_id: string;
  transcript: string;
  cleaned_transcript?: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  chief_complaint?: string;
  created_at: string;
  patient?: Patient;
  symptoms: Symptom[];
  triage_result?: TriageResult;
  soap_note?: SoapNote;
}

export interface DashboardStats {
  total_consultations: number;
  emergency_cases: number;
  soap_notes_generated: number;
  total_patients: number;
  triage_accuracy?: number;
  pending_reviews?: number;
  recent_consultations: Consultation[];
  recent_patients: Patient[];
}

export interface TriageResponse {
  priority: 'P1' | 'P2' | 'P3';
  confidence: number;
  reasoning: string[];
  red_flags: string[];
  symptoms: Array<{
    name: string;
    severity: string;
    duration: string;
    body_system?: string;
  }>;
  guideline_matches: string[];
  soap_note?: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
}

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PatientMemoryEntry {
  patient_id: string;
  consultation_id?: string;
  text: string;
  priority?: string;
  date?: string;
  chief_complaint?: string;
  red_flags?: string[];
}
