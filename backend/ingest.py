import os
import sys
import time

sys.stdout.reconfigure(line_buffering=True)
print("Starting ingest script using new RAG pipeline...")

try:
    from pathlib import Path
    import qdrant_service
    from rag.loader import load_knowledge_dir
    from rag.chunk import chunk_text
    from rag.qdrant import upsert_document
    print("Imports successful.")
except Exception as e:
    print(f"Import error: {e}")
    sys.exit(1)

# Ensure collection exists
qdrant_service._init_collections_sync()

knowledge_dir = 'knowledge'
docs = load_knowledge_dir(knowledge_dir)

for doc in docs:
    try:
        print(f"Processing {doc['file_name']}...")
        text = doc['text']
        
        chunks = chunk_text(text)
        print(f"  -> Extracted {len(chunks)} chunks.")
        
        category = doc['category']
        for idx, chunk in enumerate(chunks):
            if len(chunk.strip()) > 50:
                guideline_id = f"{doc['file_name']}_{idx}"
                title = f"{doc['file_name']} - Part {idx+1}"
                
                # Using the new RAG module
                metadata = {"title": title, "category": category}
                upsert_document("clinical_guidelines", guideline_id, chunk, metadata)
                
        print(f"Ingested {doc['file_name']}")
    except Exception as e:
        print(f"Error reading {doc['file_name']}: {e}")

print("Done.")
