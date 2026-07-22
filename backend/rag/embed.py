import hashlib
from typing import List
from config import settings

VECTOR_SIZE = 768

def embed_text(text: str) -> List[float]:
    """
    Embed text via Gemini text-embedding-004.
    Falls back to a deterministic mock vector if Gemini is unavailable.
    """
    try:
        if not settings.google_api_key or not settings.google_api_key.startswith("AIza"):
            raise ValueError("No valid Google API key")
            
        import google.generativeai as genai
        genai.configure(api_key=settings.google_api_key)
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document",
        )
        return result["embedding"]
    except Exception as e:
        # Mock: hash-based deterministic vector (works for demo without API key)
        h = hashlib.sha256(text.encode()).digest()
        base = [((b / 255.0) * 2 - 1) for b in h]
        repeated = (base * (VECTOR_SIZE // len(base) + 1))[:VECTOR_SIZE]
        return repeated
