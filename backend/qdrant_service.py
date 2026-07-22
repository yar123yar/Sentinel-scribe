"""
Qdrant vector database service.
Manages two collections:
  - clinical_guidelines : embedded triage/clinical rules for RAG
  - patient_memory      : per-patient consultation history
"""

import uuid
import json
from typing import Optional, List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue, SearchParams,
)
from config import settings

VECTOR_SIZE = 768   # text-embedding-004 / fallback hash-based mock

# Collection names
GUIDELINES_COLLECTION = "clinical_guidelines"
PATIENT_MEMORY_COLLECTION = "patient_memory"


def _get_client() -> Optional[QdrantClient]:
    try:
        client = QdrantClient(
            host=settings.qdrant_host,
            port=settings.qdrant_port,
            api_key=settings.qdrant_api_key or None,
            timeout=5,
        )
        client.get_collections()   # connectivity test
        return client
    except Exception:
        return None


def _embed_text(text: str) -> List[float]:
    """
    Embed text via Gemini text-embedding-004.
    Falls back to a deterministic mock vector if Gemini is unavailable.
    """
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.google_api_key)
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document",
        )
        return result["embedding"]
    except Exception:
        # Mock: hash-based deterministic vector (works for demo without API key)
        import hashlib
        h = hashlib.sha256(text.encode()).digest()
        base = [((b / 255.0) * 2 - 1) for b in h]
        # Repeat to fill VECTOR_SIZE
        repeated = (base * (VECTOR_SIZE // len(base) + 1))[:VECTOR_SIZE]
        return repeated


# ─── Collection Setup ────────────────────────────────────────────────────────

async def init_collections():
    client = _get_client()
    if not client:
        print("⚠️  Qdrant unavailable — skipping collection init")
        return

    existing = {c.name for c in client.get_collections().collections}

    for name in [GUIDELINES_COLLECTION, PATIENT_MEMORY_COLLECTION]:
        if name not in existing:
            client.create_collection(
                collection_name=name,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
            )
            print(f"✅ Created Qdrant collection: {name}")

    client.close()


# ─── Patient Memory ──────────────────────────────────────────────────────────

async def upsert_patient_memory(
    patient_id: str,
    consultation_id: str,
    text: str,                  # summary text to embed
    metadata: Dict[str, Any],
):
    client = _get_client()
    if not client:
        return

    vector = _embed_text(text)
    point = PointStruct(
        id=str(uuid.uuid5(uuid.NAMESPACE_URL, consultation_id)),
        vector=vector,
        payload={
            "patient_id": patient_id,
            "consultation_id": consultation_id,
            "text": text,
            **metadata,
        },
    )
    client.upsert(collection_name=PATIENT_MEMORY_COLLECTION, points=[point])
    client.close()


async def search_patient_memory(
    patient_id: str,
    query: str,
    top_k: int = 5,
) -> List[Dict[str, Any]]:
    client = _get_client()
    if not client:
        return _mock_patient_memory(patient_id)

    vector = _embed_text(query)
    results = client.search(
        collection_name=PATIENT_MEMORY_COLLECTION,
        query_vector=vector,
        query_filter=Filter(
            must=[FieldCondition(key="patient_id", match=MatchValue(value=patient_id))]
        ),
        limit=top_k,
        with_payload=True,
    )
    client.close()
    return [r.payload for r in results]


# ─── Clinical Guidelines RAG ─────────────────────────────────────────────────

async def search_guidelines(query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    client = _get_client()
    if not client:
        return _mock_guidelines(query)

    vector = _embed_text(query)
    results = client.search(
        collection_name=GUIDELINES_COLLECTION,
        query_vector=vector,
        limit=top_k,
        with_payload=True,
    )
    client.close()
    return [r.payload for r in results]


async def upsert_guideline(guideline_id: str, title: str, text: str, category: str):
    client = _get_client()
    if not client:
        return

    vector = _embed_text(text)
    point = PointStruct(
        id=str(uuid.uuid5(uuid.NAMESPACE_URL, guideline_id)),
        vector=vector,
        payload={"id": guideline_id, "title": title, "text": text, "category": category},
    )
    client.upsert(collection_name=GUIDELINES_COLLECTION, points=[point])
    client.close()


# ─── Mock Fallbacks ──────────────────────────────────────────────────────────

def _mock_patient_memory(patient_id: str) -> List[Dict]:
    return [
        {
            "patient_id": patient_id,
            "text": "Previous visit: Chest pain — triaged P1. ECG normal.",
            "priority": "P1",
            "date": "2024-10-15",
        },
        {
            "patient_id": patient_id,
            "text": "Follow-up: Hypertension monitoring — BP 145/90. Medications adjusted.",
            "priority": "P2",
            "date": "2024-11-02",
        },
    ]


def _mock_guidelines(query: str) -> List[Dict]:
    guidelines = [
        {
            "title": "P1 Emergency Criteria",
            "text": "Chest pain with diaphoresis, dyspnea, or syncope — immediate resuscitation.",
            "category": "triage",
        },
        {
            "title": "Stroke Protocol",
            "text": "FAST: Face drooping, Arm weakness, Speech difficulty, Time to call. Activate stroke team.",
            "category": "triage",
        },
        {
            "title": "P2 Urgent Criteria",
            "text": "Moderate pain, stable vitals, requires evaluation within 30 minutes.",
            "category": "triage",
        },
    ]
    return [g for g in guidelines if any(w in query.lower() for w in g["text"].lower().split()[:5])] or guidelines[:2]
