"""
Database + Qdrant seeder
Run: python seed.py
Seeds: 1 demo user, 10 patients, 12 consultations, triage results, SOAP notes, Qdrant vectors
"""

import asyncio
import uuid
from datetime import datetime, timedelta
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from database import AsyncSessionLocal, create_tables
from models import User, Patient, Consultation, Symptom, TriageResult, SoapNote
from auth import hash_password
import qdrant_service as qdrant


# ── Demo Users ──────────────────────────────────────────────────────────────

USERS = [
    {
        "id": "user-001",
        "email": "doctor@clinic.ai",
        "password": "demo1234",
        "name": "Dr. Sarah Mitchell",
        "role": "doctor",
    }
]

# ── 10 Demo Patients ─────────────────────────────────────────────────────────

PATIENTS = [
    {
        "id": "pat-001",
        "name": "Alice Johnson",
        "dob": "1985-03-15",
        "gender": "Female",
        "mrn": "MRN-001",
        "blood_type": "A+",
        "allergies": ["Penicillin"],
        "chronic_conditions": ["Hypertension", "Type 2 Diabetes"],
    },
    {
        "id": "pat-002",
        "name": "Bob Martinez",
        "dob": "1970-07-22",
        "gender": "Male",
        "mrn": "MRN-002",
        "blood_type": "O+",
        "allergies": [],
        "chronic_conditions": ["Coronary Artery Disease", "Hyperlipidemia"],
    },
    {
        "id": "pat-003",
        "name": "Carol White",
        "dob": "1992-11-08",
        "gender": "Female",
        "mrn": "MRN-003",
        "blood_type": "B-",
        "allergies": ["Sulfa drugs", "Latex"],
        "chronic_conditions": ["Asthma"],
    },
    {
        "id": "pat-004",
        "name": "David Chen",
        "dob": "1955-04-30",
        "gender": "Male",
        "mrn": "MRN-004",
        "blood_type": "AB+",
        "allergies": ["Codeine"],
        "chronic_conditions": ["Atrial Fibrillation", "COPD", "Hypertension"],
    },
    {
        "id": "pat-005",
        "name": "Priya Sharma",
        "dob": "1998-09-14",
        "gender": "Female",
        "mrn": "MRN-005",
        "blood_type": "O-",
        "allergies": [],
        "chronic_conditions": ["Migraine"],
    },
    {
        "id": "pat-006",
        "name": "James O'Brien",
        "dob": "1963-01-25",
        "gender": "Male",
        "mrn": "MRN-006",
        "blood_type": "A-",
        "allergies": ["Aspirin", "NSAIDs"],
        "chronic_conditions": ["Peptic Ulcer Disease", "Type 2 Diabetes"],
    },
    {
        "id": "pat-007",
        "name": "Maria Rodriguez",
        "dob": "1978-06-12",
        "gender": "Female",
        "mrn": "MRN-007",
        "blood_type": "B+",
        "allergies": [],
        "chronic_conditions": ["Rheumatoid Arthritis", "Hypothyroidism"],
    },
    {
        "id": "pat-008",
        "name": "Kwame Asante",
        "dob": "1945-12-03",
        "gender": "Male",
        "mrn": "MRN-008",
        "blood_type": "O+",
        "allergies": ["Metformin"],
        "chronic_conditions": ["Chronic Kidney Disease", "Hypertension", "Heart Failure"],
    },
    {
        "id": "pat-009",
        "name": "Yuki Tanaka",
        "dob": "2003-08-19",
        "gender": "Female",
        "mrn": "MRN-009",
        "blood_type": "A+",
        "allergies": ["Shellfish"],
        "chronic_conditions": [],
    },
    {
        "id": "pat-010",
        "name": "Rahul Patel",
        "dob": "1982-02-28",
        "gender": "Male",
        "mrn": "MRN-010",
        "blood_type": "AB-",
        "allergies": ["Cephalosporins"],
        "chronic_conditions": ["Epilepsy", "Depression"],
    },
]

# ── 12 Consultations ─────────────────────────────────────────────────────────

CONSULTATIONS = [
    # P1 — Emergency
    {
        "id": "con-001",
        "patient_id": "pat-002",
        "transcript": "Patient is a 54-year-old male presenting with severe chest pain radiating to the left arm, shortness of breath, and diaphoresis for the past 45 minutes. He describes the pain as crushing, rated 9/10. He has a history of coronary artery disease. He took aspirin at home. He looks pale and anxious.",
        "chief_complaint": "Severe chest pain with radiation",
        "status": "complete",
        "priority": "P1",
        "confidence": 0.97,
        "reasoning": [
            "Chest pain with left arm radiation — classic ACS presentation",
            "Associated diaphoresis and shortness of breath",
            "Known CAD history significantly elevates risk",
            "Pain severity 9/10 for 45 minutes",
            "Matches STEMI/NSTEMI emergency protocol",
        ],
        "red_flags": ["Chest pain", "Difficulty breathing"],
        "symptoms": [
            {"name": "chest pain", "severity": "severe", "duration": "45 minutes", "is_red_flag": True},
            {"name": "shortness of breath", "severity": "severe", "duration": "45 minutes", "is_red_flag": True},
            {"name": "diaphoresis", "severity": "moderate", "duration": "45 minutes", "is_red_flag": False},
        ],
        "soap": {
            "subjective": "54-year-old male with known CAD presents with 45-minute history of crushing chest pain 9/10, radiating to left arm, associated with shortness of breath and diaphoresis. Took aspirin at home. Looks pale and anxious.",
            "objective": "Vitals: To be assessed immediately. Patient appears diaphoretic and pale. Cardiac monitoring required urgently.",
            "assessment": "Acute Coronary Syndrome (STEMI/NSTEMI) — high probability. Differential: Aortic dissection, pulmonary embolism.",
            "plan": "1. Immediate 12-lead ECG\n2. IV access and cardiac monitoring\n3. Troponin, CBC, BMP, coagulation panel\n4. Cardiology consult — activate cath lab if STEMI confirmed\n5. Oxygen therapy if SpO2 < 94%\n6. Heparin per ACS protocol",
        },
        "created_at": datetime.utcnow() - timedelta(hours=2),
    },
    # P1 — Stroke
    {
        "id": "con-002",
        "patient_id": "pat-004",
        "transcript": "A 69-year-old male with atrial fibrillation brought in by family. Sudden onset of right-sided facial drooping, arm weakness, and slurred speech starting 1 hour ago. Family noticed he couldn't lift his right arm. He's on warfarin.",
        "chief_complaint": "Sudden facial drooping and arm weakness",
        "status": "complete",
        "priority": "P1",
        "confidence": 0.95,
        "reasoning": [
            "FAST positive: Face drooping, Arm weakness, Speech difficulty",
            "Sudden onset within 1 hour — within thrombolysis window",
            "Known AF significantly increases stroke risk",
            "On anticoagulation — bleeding risk assessment needed",
            "Stroke protocol activated immediately",
        ],
        "red_flags": ["Stroke symptoms"],
        "symptoms": [
            {"name": "facial drooping", "severity": "severe", "duration": "1 hour", "is_red_flag": True},
            {"name": "arm weakness", "severity": "severe", "duration": "1 hour", "is_red_flag": True},
            {"name": "slurred speech", "severity": "severe", "duration": "1 hour", "is_red_flag": True},
        ],
        "soap": {
            "subjective": "69-year-old male with AF on warfarin. Sudden onset (1 hour ago) of right facial droop, right arm weakness, and slurred speech. Family present, last seen normal 1 hour ago.",
            "objective": "NIHSS assessment required. Right facial droop noted. Right arm unable to lift against gravity. Speech dysarthric. GCS to be assessed.",
            "assessment": "Acute ischemic stroke — high probability. Hemorrhagic stroke possible given warfarin use. Time is brain.",
            "plan": "1. Emergency CT head without contrast\n2. Check INR/PT given warfarin use\n3. Neurology/stroke team activation\n4. CT angiography if INR therapeutic\n5. tPA consideration within 4.5h window if no contraindications\n6. Aspiration precautions\n7. Glucose check — hypoglycemia exclusion",
        },
        "created_at": datetime.utcnow() - timedelta(hours=5),
    },
    # P2 — Urgent
    {
        "id": "con-003",
        "patient_id": "pat-001",
        "transcript": "Patient Alice, a 39-year-old female with hypertension and diabetes, presents with severe headache rated 8/10, started suddenly 30 minutes ago. She describes it as the worst headache of her life. No fever. BP is 180/110 at triage. She has nausea but no vomiting.",
        "chief_complaint": "Thunderclap headache",
        "status": "complete",
        "priority": "P2",
        "confidence": 0.83,
        "reasoning": [
            "Thunderclap headache — worst headache of life — subarachnoid haemorrhage until proven otherwise",
            "BP 180/110 — hypertensive urgency present",
            "Sudden onset raises concern for intracranial pathology",
            "No fever — bacterial meningitis less likely",
            "Requires urgent CT and LP",
        ],
        "red_flags": [],
        "symptoms": [
            {"name": "severe headache", "severity": "severe", "duration": "30 minutes", "is_red_flag": False},
            {"name": "nausea", "severity": "mild", "duration": "30 minutes", "is_red_flag": False},
            {"name": "hypertension", "severity": "severe", "duration": "ongoing", "is_red_flag": False},
        ],
        "soap": {
            "subjective": "39-year-old female with HTN and T2DM. Thunderclap headache 8/10 for 30 minutes, worst of her life, sudden onset. Nausea present. No fever, no neck stiffness reported.",
            "objective": "BP: 180/110 mmHg at triage. HR, RR, SpO2 to be measured. Neurological examination required. Fundoscopy if available.",
            "assessment": "1. Subarachnoid haemorrhage — must exclude urgently. 2. Hypertensive emergency. 3. Migraine (diagnosis of exclusion).",
            "plan": "1. Urgent CT head\n2. Lumbar puncture if CT negative (xanthochromia)\n3. Blood pressure management — labetalol IV\n4. IV access and analgesia\n5. Neurosurgery consult if SAH confirmed\n6. Monitor neuro status every 15 min",
        },
        "created_at": datetime.utcnow() - timedelta(hours=8),
    },
    # P2 — Urgent Asthma
    {
        "id": "con-004",
        "patient_id": "pat-003",
        "transcript": "Carol, 32-year-old female with known asthma, presents with worsening shortness of breath for 2 hours. She has used her salbutamol inhaler 4 times today without improvement. She can speak in short sentences. She reports tight chest. No fever.",
        "chief_complaint": "Worsening asthma attack",
        "status": "complete",
        "priority": "P2",
        "confidence": 0.88,
        "reasoning": [
            "Known asthma with inadequate response to 4 doses of salbutamol",
            "Progressive dyspnea — moderate to severe exacerbation",
            "Short sentence speech — moderate airflow obstruction",
            "No fever — infection less likely primary trigger",
            "Requires urgent bronchodilator and corticosteroid therapy",
        ],
        "red_flags": ["Difficulty breathing"],
        "symptoms": [
            {"name": "shortness of breath", "severity": "severe", "duration": "2 hours", "is_red_flag": True},
            {"name": "chest tightness", "severity": "moderate", "duration": "2 hours", "is_red_flag": False},
            {"name": "wheeze", "severity": "moderate", "duration": "2 hours", "is_red_flag": False},
        ],
        "soap": {
            "subjective": "32-year-old female with asthma. Worsening dyspnea for 2 hours. Salbutamol used 4× today with no relief. Short-sentence speech. Tight chest. No fever. No known triggers identified.",
            "objective": "SpO2 and PEFR to be measured. Auscultation: bilateral wheeze expected. Accessory muscle use to assess. RR likely elevated.",
            "assessment": "Moderate to severe acute asthma exacerbation. Assess for impending respiratory failure.",
            "plan": "1. SpO2 monitoring — oxygen if <94%\n2. Salbutamol nebulisation q20min × 3\n3. Ipratropium bromide nebulisation\n4. Systemic corticosteroids — prednisolone 40mg oral or IV\n5. PEFR before and after treatment\n6. Chest X-ray — exclude pneumothorax\n7. ICU alert if deteriorating",
        },
        "created_at": datetime.utcnow() - timedelta(hours=12),
    },
    # P3 — Routine
    {
        "id": "con-005",
        "patient_id": "pat-005",
        "transcript": "Priya, 25-year-old female, presents with a 3-day history of sore throat, mild fever of 37.8°C, and fatigue. She reports difficulty swallowing. No rash. No recent travel. She works in a school.",
        "chief_complaint": "Sore throat and fever",
        "status": "complete",
        "priority": "P3",
        "confidence": 0.90,
        "reasoning": [
            "Low-grade fever — likely viral or bacterial pharyngitis",
            "3-day duration — subacute presentation",
            "No red flag symptoms identified",
            "School exposure — Strep pharyngitis possible",
            "Stable vitals, standard workup appropriate",
        ],
        "red_flags": [],
        "symptoms": [
            {"name": "sore throat", "severity": "moderate", "duration": "3 days", "is_red_flag": False},
            {"name": "fever", "severity": "mild", "duration": "3 days", "is_red_flag": False},
            {"name": "fatigue", "severity": "mild", "duration": "3 days", "is_red_flag": False},
        ],
        "soap": {
            "subjective": "25-year-old female teacher with 3-day sore throat, low-grade fever 37.8°C, fatigue, and odynophagia. No rash, no travel history.",
            "objective": "Vitals: T 37.8°C. Throat examination — erythema and exudate to be assessed. Lymphadenopathy check. No distress.",
            "assessment": "1. Streptococcal pharyngitis (Centor criteria to be scored). 2. Viral pharyngitis — most likely.",
            "plan": "1. Rapid Strep test / throat swab\n2. If Strep positive — penicillin V 500mg BD for 10 days\n3. Paracetamol for symptom relief\n4. Adequate hydration\n5. Isolation from pupils until 24h post-antibiotic\n6. Return if symptoms worsen or rash develops",
        },
        "created_at": datetime.utcnow() - timedelta(days=1),
    },
    # P3 — Routine
    {
        "id": "con-006",
        "patient_id": "pat-006",
        "transcript": "James, a 61-year-old male with T2DM and peptic ulcer disease, comes for a routine diabetes follow-up. Blood sugar has been running 8-12 mmol/L. He reports mild fatigue. No symptoms of hypoglycemia. He is on metformin and omeprazole.",
        "chief_complaint": "Routine diabetes follow-up",
        "status": "complete",
        "priority": "P3",
        "confidence": 0.94,
        "reasoning": [
            "Routine follow-up appointment",
            "No acute or emergency symptoms",
            "Blood sugars suboptimally controlled but stable",
            "No evidence of acute complications",
            "Standard management review appropriate",
        ],
        "red_flags": [],
        "symptoms": [
            {"name": "fatigue", "severity": "mild", "duration": "ongoing", "is_red_flag": False},
            {"name": "hyperglycemia", "severity": "moderate", "duration": "ongoing", "is_red_flag": False},
        ],
        "soap": {
            "subjective": "61-year-old male with T2DM and PUD on metformin and omeprazole. Reports FBS 8-12 mmol/L on home monitoring. Mild fatigue. No hypoglycemic episodes. Medication compliance good.",
            "objective": "HbA1c, fasting glucose, renal function, lipid panel, urine microalbumin to be reviewed. BP check. Weight and BMI.",
            "assessment": "Type 2 Diabetes Mellitus — suboptimally controlled. Peptic ulcer disease — stable on PPI.",
            "plan": "1. Review HbA1c — target <7%\n2. Consider adding SGLT2 inhibitor if renal function adequate\n3. Continue metformin and omeprazole\n4. Dietitian referral\n5. Annual diabetic eye review and foot exam due\n6. Follow-up in 3 months with HbA1c",
        },
        "created_at": datetime.utcnow() - timedelta(days=2),
    },
    # P1 — Severe bleeding
    {
        "id": "con-007",
        "patient_id": "pat-008",
        "transcript": "Kwame, 79-year-old male with CKD and heart failure, brought by ambulance with profuse haematemesis — vomiting blood — for the past hour. He is pale, sweaty, and confused. BP 85/60. HR 118. He is on aspirin and warfarin.",
        "chief_complaint": "Haematemesis with haemodynamic instability",
        "status": "complete",
        "priority": "P1",
        "confidence": 0.98,
        "reasoning": [
            "Profuse haematemesis — GI emergency",
            "Haemodynamic shock: BP 85/60, HR 118",
            "Altered mental status — confusion",
            "Anticoagulant use (warfarin) complicates bleeding",
            "Requires immediate resuscitation and GI intervention",
        ],
        "red_flags": ["Severe bleeding", "Altered mental status", "Loss of consciousness"],
        "symptoms": [
            {"name": "haematemesis", "severity": "severe", "duration": "1 hour", "is_red_flag": True},
            {"name": "confusion", "severity": "severe", "duration": "1 hour", "is_red_flag": True},
            {"name": "hypotension", "severity": "severe", "duration": "1 hour", "is_red_flag": True},
        ],
        "soap": {
            "subjective": "79-year-old male on warfarin and aspirin. 1-hour history of profuse haematemesis. Brought by ambulance. Altered consciousness. Known CKD and heart failure.",
            "objective": "BP: 85/60 mmHg. HR: 118 bpm. Patient pale, diaphoretic, confused. Active haematemesis. IV access required immediately.",
            "assessment": "Acute upper GI haemorrhage with haemodynamic shock. Likely peptic ulcer or oesophageal varices. Warfarin-related coagulopathy contributing.",
            "plan": "1. ABC — airway protection, 2 large-bore IVs\n2. Immediate fluid resuscitation with crystalloids\n3. Urgent INR and reversal — Vitamin K + PCC if INR elevated\n4. Blood group and crossmatch — transfuse PRBCs\n5. Urgent GI endoscopy\n6. PPI infusion — pantoprazole\n7. ICU admission and monitoring",
        },
        "created_at": datetime.utcnow() - timedelta(hours=1),
    },
    # P2
    {
        "id": "con-008",
        "patient_id": "pat-007",
        "transcript": "Maria, 46-year-old female with rheumatoid arthritis, presents with a 1-week history of increasing swelling and redness of her right knee. She is on methotrexate. She has low-grade fever 38.1°C. The knee is warm and very tender. She cannot bear weight on it.",
        "chief_complaint": "Hot, swollen knee — unable to weight bear",
        "status": "complete",
        "priority": "P2",
        "confidence": 0.82,
        "reasoning": [
            "Single hot swollen joint with fever — septic arthritis until proven otherwise",
            "Immunosuppressed patient on methotrexate — higher infection risk",
            "Inability to weight bear — significant functional limitation",
            "1-week progression suggests evolving infection or RA flare",
            "Joint aspiration required urgently",
        ],
        "red_flags": [],
        "symptoms": [
            {"name": "joint swelling", "severity": "severe", "duration": "1 week", "is_red_flag": False},
            {"name": "fever", "severity": "mild", "duration": "1 week", "is_red_flag": False},
            {"name": "joint pain", "severity": "severe", "duration": "1 week", "is_red_flag": False},
        ],
        "soap": {
            "subjective": "46-year-old female with RA on methotrexate. 1-week right knee swelling, redness, warmth, and pain. Low-grade fever 38.1°C. Non-weight bearing. No recent trauma.",
            "objective": "T: 38.1°C. Right knee: erythematous, warm, effusion palpable, tender. ROM severely limited. Other joints: to be examined.",
            "assessment": "1. Septic arthritis — must exclude in immunocompromised patient. 2. RA flare with secondary infection. 3. Crystal arthropathy (pseudogout).",
            "plan": "1. Joint aspiration — synovial fluid for culture, glucose, WBC, crystals\n2. Blood cultures × 2\n3. CBC, CRP, ESR, uric acid\n4. Hold methotrexate until infection excluded\n5. Empirical IV antibiotics after cultures\n6. Orthopaedics consult\n7. Non-weight bearing and RICE",
        },
        "created_at": datetime.utcnow() - timedelta(days=3),
    },
    # P3
    {
        "id": "con-009",
        "patient_id": "pat-009",
        "transcript": "Yuki, a 22-year-old female student, presents with lower abdominal pain that started 2 days ago, rated 4/10. She is not sexually active. She has regular periods. Last period was 2 weeks ago. She reports constipation for 3 days. No fever, no nausea.",
        "chief_complaint": "Lower abdominal pain and constipation",
        "status": "complete",
        "priority": "P3",
        "confidence": 0.88,
        "reasoning": [
            "Low-grade abdominal pain with constipation — most likely functional",
            "Regular periods, not sexually active — gynecological cause less likely",
            "No fever — acute appendicitis less likely but to be considered",
            "No nausea/vomiting — stable presentation",
            "Standard investigation and constipation management",
        ],
        "red_flags": [],
        "symptoms": [
            {"name": "abdominal pain", "severity": "mild", "duration": "2 days", "is_red_flag": False},
            {"name": "constipation", "severity": "mild", "duration": "3 days", "is_red_flag": False},
        ],
        "soap": {
            "subjective": "22-year-old female with 2-day lower abdominal pain 4/10, associated with 3-day constipation. Regular periods, LMP 2 weeks ago. Not sexually active. No fever, no nausea.",
            "objective": "Vital signs stable. Abdomen: soft, mild lower abdominal tenderness, no guarding, no rebound. Bowel sounds present.",
            "assessment": "1. Constipation — most likely. 2. Irritable bowel syndrome. 3. Appendicitis to be excluded.",
            "plan": "1. Abdominal examination — RIF tenderness assessment\n2. USS abdomen if appendicitis suspected\n3. Osmotic laxative — macrogol\n4. Increase fluid and fibre intake\n5. Return if fever, severe pain, vomiting\n6. Review in 1 week if no improvement",
        },
        "created_at": datetime.utcnow() - timedelta(days=4),
    },
    # P2
    {
        "id": "con-010",
        "patient_id": "pat-010",
        "transcript": "Rahul, a 44-year-old male with epilepsy, was brought by his wife after a witnessed generalised tonic-clonic seizure lasting 3 minutes. He is now post-ictal — drowsy but responsive. This is his second seizure this month. He has been on levetiracetam but missed doses this week.",
        "chief_complaint": "Post-seizure state — missed medication",
        "status": "complete",
        "priority": "P2",
        "confidence": 0.85,
        "reasoning": [
            "Known epileptic — breakthrough seizure from non-compliance",
            "Post-ictal state — neurological assessment required",
            "Second seizure this month — escalating pattern",
            "Medication non-compliance identified — teachable moment",
            "Monitor for 4-6 hours post-seizure",
        ],
        "red_flags": [],
        "symptoms": [
            {"name": "post-ictal drowsiness", "severity": "moderate", "duration": "30 minutes", "is_red_flag": False},
            {"name": "seizure", "severity": "severe", "duration": "3 minutes", "is_red_flag": False},
        ],
        "soap": {
            "subjective": "44-year-old male with epilepsy on levetiracetam. Witnessed GTCS × 3 minutes. Post-ictal — drowsy. Second seizure this month. Missed doses this week. Wife present.",
            "objective": "GCS: 13/15 (drowsy, eyes open to voice). Neurological examination: no focal deficit. Tongue laceration — mild. Vital signs to be checked.",
            "assessment": "Breakthrough seizure secondary to medication non-compliance. Epilepsy — suboptimally controlled.",
            "plan": "1. Continuous monitoring for 4-6 hours\n2. Ensure levetiracetam taken immediately\n3. Serum levetiracetam level if available\n4. CT head if first seizure or focal deficit\n5. Neurology review — consider dose titration\n6. Medication adherence counselling\n7. DVLA driving advice documented\n8. Follow-up in 2 weeks",
        },
        "created_at": datetime.utcnow() - timedelta(days=5),
    },
]

# ── Clinical Guidelines for Qdrant ────────────────────────────────────────────

GUIDELINES = [
    {
        "id": "gl-001",
        "title": "P1 Emergency — Acute Coronary Syndrome",
        "text": "ACS presents with chest pain, dyspnea, diaphoresis, radiation to arm or jaw. Immediate ECG, troponin, aspirin, and cardiology activation. STEMI — cath lab within 90 minutes.",
        "category": "cardiac",
    },
    {
        "id": "gl-002",
        "title": "P1 Emergency — Acute Stroke (FAST Protocol)",
        "text": "FAST: Facial drooping, Arm weakness, Speech difficulty, Time. Immediate CT head, stroke team activation. tPA within 4.5 hours of onset if eligible. Check INR if on anticoagulation.",
        "category": "neurological",
    },
    {
        "id": "gl-003",
        "title": "P1 Emergency — Severe GI Haemorrhage",
        "text": "Haematemesis with haemodynamic instability: two large-bore IVs, crystalloid resuscitation, blood transfusion, reverse anticoagulation, urgent endoscopy, ICU.",
        "category": "gastrointestinal",
    },
    {
        "id": "gl-004",
        "title": "P1 Emergency — Anaphylaxis",
        "text": "Anaphylaxis: IM epinephrine 0.5mg immediately, lay flat, oxygen, IV fluids, antihistamine and steroids after epinephrine. Monitor for biphasic reaction.",
        "category": "allergy",
    },
    {
        "id": "gl-005",
        "title": "P2 Urgent — Acute Asthma Exacerbation",
        "text": "Moderate-severe asthma: Salbutamol nebulisation, ipratropium, systemic corticosteroids, oxygen to SpO2 94-98%, PEFR monitoring. Consider IV magnesium if no improvement.",
        "category": "respiratory",
    },
    {
        "id": "gl-006",
        "title": "P2 Urgent — Septic Arthritis",
        "text": "Hot swollen single joint with fever in immunocompromised patients requires urgent joint aspiration, blood cultures, IV antibiotics, and orthopaedic consult.",
        "category": "musculoskeletal",
    },
    {
        "id": "gl-007",
        "title": "P2 Urgent — Thunderclap Headache",
        "text": "Sudden onset worst headache of life: subarachnoid haemorrhage until proven otherwise. Urgent CT head, LP if CT negative, neurosurgery consult.",
        "category": "neurological",
    },
    {
        "id": "gl-008",
        "title": "P2 Urgent — Breakthrough Seizure",
        "text": "Post-ictal patients: monitor 4-6 hours, ensure anticonvulsant compliance, check drug levels, neurology review. CT head if first seizure or focal deficit.",
        "category": "neurological",
    },
    {
        "id": "gl-009",
        "title": "P3 Non-Urgent — Bacterial Pharyngitis",
        "text": "Centor criteria: exudate, tender anterior cervical nodes, fever, no cough. Score 3-4: rapid Strep test, penicillin V if positive. Score <3: symptomatic treatment.",
        "category": "infectious",
    },
    {
        "id": "gl-010",
        "title": "P3 Non-Urgent — Type 2 Diabetes Management",
        "text": "HbA1c target <7% for most patients. First-line metformin. Consider SGLT2 inhibitor or GLP-1 if cardiovascular risk. Annual retinal screening, foot exam, microalbumin.",
        "category": "endocrine",
    },
    {
        "id": "gl-011",
        "title": "Manchester Triage System — P1 Criteria",
        "text": "Immediate: airway compromise, major haemorrhage, cardiac arrest, unconscious, respiratory arrest, severe burns >20%. Time to see: immediately.",
        "category": "triage",
    },
    {
        "id": "gl-012",
        "title": "Manchester Triage System — P2 Criteria",
        "text": "Very urgent: severe pain, signs of shock not yet critical, altered consciousness, high fever with rash. Time to see: within 10 minutes.",
        "category": "triage",
    },
    {
        "id": "gl-013",
        "title": "Manchester Triage System — P3 Criteria",
        "text": "Urgent: moderate pain, stable vitals, no life threat. Time to see: within 60 minutes. Standard assessment and investigation pathway.",
        "category": "triage",
    },
]


# ── Seed Functions ────────────────────────────────────────────────────────────

async def seed_db():
    async with AsyncSessionLocal() as db:
        # Clear existing data
        from sqlalchemy import text, delete
        await db.execute(delete(SoapNote))
        await db.execute(delete(TriageResult))
        await db.execute(delete(Symptom))
        await db.execute(delete(Consultation))
        await db.execute(delete(Patient))
        await db.execute(delete(User))
        await db.commit()
        print("🗑️  Cleared existing data")

        # Users
        for u in USERS:
            user = User(
                id=u["id"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                name=u["name"],
                role=u["role"],
            )
            db.add(user)
        await db.commit()
        print(f"✅ Seeded {len(USERS)} user(s)")

        # Patients
        for p in PATIENTS:
            patient = Patient(**p)
            db.add(patient)
        await db.commit()
        print(f"✅ Seeded {len(PATIENTS)} patients")

        # Consultations, Symptoms, Triage, SOAP
        for c in CONSULTATIONS:
            consultation = Consultation(
                id=c["id"],
                patient_id=c["patient_id"],
                user_id="user-001",
                transcript=c["transcript"],
                chief_complaint=c["chief_complaint"],
                status=c["status"],
                cleaned_transcript=c["transcript"],
                created_at=c["created_at"],
            )
            db.add(consultation)

            for s in c["symptoms"]:
                sym = Symptom(
                    id=str(uuid.uuid4()),
                    consultation_id=c["id"],
                    name=s["name"],
                    severity=s["severity"],
                    duration=s["duration"],
                    is_red_flag=s["is_red_flag"],
                )
                db.add(sym)

            triage = TriageResult(
                id=str(uuid.uuid4()),
                consultation_id=c["id"],
                priority=c["priority"],
                confidence=c["confidence"],
                reasoning=c["reasoning"],
                red_flags=c["red_flags"],
                guideline_matches=[],
            )
            db.add(triage)

            soap = SoapNote(
                id=str(uuid.uuid4()),
                consultation_id=c["id"],
                subjective=c["soap"]["subjective"],
                objective=c["soap"]["objective"],
                assessment=c["soap"]["assessment"],
                plan=c["soap"]["plan"],
            )
            db.add(soap)

        await db.commit()
        print(f"✅ Seeded {len(CONSULTATIONS)} consultations with symptoms, triage, and SOAP notes")


async def seed_qdrant():
    await qdrant.init_collections()

    # Seed clinical guidelines
    for g in GUIDELINES:
        await qdrant.upsert_guideline(
            guideline_id=g["id"],
            title=g["title"],
            text=g["text"],
            category=g["category"],
        )
    print(f"✅ Seeded {len(GUIDELINES)} clinical guidelines to Qdrant")

    # Seed patient memory for each consultation
    memory_entries = [
        {
            "patient_id": c["patient_id"],
            "consultation_id": c["id"],
            "text": f"Visit on {c['created_at'].strftime('%Y-%m-%d')}: {c['chief_complaint']}. "
                    f"Triaged {c['priority']}. "
                    f"Symptoms: {', '.join(s['name'] for s in c['symptoms'][:3])}. "
                    f"Assessment: {c['soap']['assessment'][:100]}",
            "metadata": {
                "priority": c["priority"],
                "chief_complaint": c["chief_complaint"],
                "red_flags": c["red_flags"],
                "date": c["created_at"].strftime("%Y-%m-%d"),
            }
        }
        for c in CONSULTATIONS
    ]

    for entry in memory_entries:
        await qdrant.upsert_patient_memory(
            patient_id=entry["patient_id"],
            consultation_id=entry["consultation_id"],
            text=entry["text"],
            metadata=entry["metadata"],
        )
    print(f"✅ Seeded {len(memory_entries)} patient memory entries to Qdrant")


async def main():
    print("🌱 Starting seed process...")
    await create_tables()
    await seed_db()
    await seed_qdrant()
    print("\n🎉 Seed complete!")
    print("📧 Demo login: doctor@clinic.ai / demo1234")
    print("🌐 API docs: http://localhost:8000/docs")


if __name__ == "__main__":
    asyncio.run(main())
