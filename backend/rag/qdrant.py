import uuid
from typing import Optional, Dict, Any, List
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct

from config import settings
from .embed import VECTOR_SIZE, embed_text

def get_qdrant_client() -> Optional[QdrantClient]:
    try:
        client = QdrantClient(
            host=settings.qdrant_host,
            port=settings.qdrant_port,
            api_key=settings.qdrant_api_key or None,
            timeout=5,
        )
        client.get_collections()  # test connectivity
        return client
    except Exception:
        return None

def init_collection(collection_name: str):
    """Creates a collection if it doesn't exist."""
    client = get_qdrant_client()
    if not client:
        print(f"[WARN] Qdrant unavailable - skipping init for {collection_name}")
        return

    existing = {c.name for c in client.get_collections().collections}
    if collection_name not in existing:
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
        print(f"[OK] Created Qdrant collection: {collection_name}")
    client.close()

def upsert_document(collection_name: str, doc_id: str, text: str, metadata: Dict[str, Any]):
    """Embeds text and upserts a document into the specified collection."""
    client = get_qdrant_client()
    if not client:
        return

    vector = embed_text(text)
    
    # Use uuid5 to generate a stable ID for the document based on the doc_id string
    point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, doc_id))
    
    payload = {"id": doc_id, "text": text, **metadata}
    point = PointStruct(id=point_id, vector=vector, payload=payload)
    
    client.upsert(collection_name=collection_name, points=[point])
    client.close()
