# AI-Augmented Clinical Triage & Documentation System

> Hackathon MVP — AI-powered clinical triage, SOAP documentation, patient memory, and AI Doctor Copilot

---

## 🚀 Quick Start (3 steps)

### 1. Start infrastructure

```bash
docker-compose up -d
```

> Starts PostgreSQL on `:5432` and Qdrant on `:6333`

---

### 2. Start backend

```bash
cd backend
cp .env.example .env          # edit GOOGLE_API_KEY if you have one
pip install -r requirements.txt
python seed.py                 # seeds 10 patients + Qdrant
python main.py                 # starts API on :8000
```

**Demo login:** `doctor@clinic.ai` / `demo1234`

---

### 3. Start frontend

```bash
cd frontend
cp .env.local.example .env.local
npm run dev                    # starts on :3000
```

---

## 🌐 URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Qdrant Dashboard | http://localhost:6333/dashboard |

---

## 🏗️ Architecture

```
Transcript → TranscriptAgent (clean)
           → RedFlagAgent (emergency detection)
           → SymptomAgent (extract JSON)
           → Qdrant (guideline RAG + patient memory)
           → TriageAgent (P1/P2/P3 + reasoning)
           → SOAPAgent (generate notes)
           → PostgreSQL (persist all results)
           → CopilotAgent (doctor Q&A)
```

## 🤖 AI Agents

| Agent | Framework | Purpose |
|---|---|---|
| TranscriptAgent | Google ADK | Clean raw transcripts |
| RedFlagAgent | Google ADK | Detect emergency symptoms |
| SymptomAgent | Google ADK | Extract structured symptom data |
| TriageAgent | Google ADK | P1/P2/P3 classification with RAG |
| SOAPAgent | Google ADK | Generate SOAP documentation |
| CopilotAgent | Google ADK | Doctor Q&A with context |
| ClinicalPipeline | Lyzr-style | Orchestrate 7-step pipeline |

## 📊 Stack

- **Frontend**: Node.js 14 + TypeScript + Tailwind + Radix UI
- **Backend**: FastAPI + SQLAlchemy (async) + Pydantic
- **Database**: PostgreSQL
- **Vector DB**: Qdrant (patient memory + clinical guidelines RAG)
- **AI**: Google ADK agents + Lyzr pipeline + Gemini 2.5 Flash
- **Auth**: JWT (python-jose + bcrypt)

## 🧪 Graceful Fallback

The system works **without a Gemini API key** — all agents fall back to deterministic rule-based responses, so the demo always runs.
