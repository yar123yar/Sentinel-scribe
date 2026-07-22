import os
from pathlib import Path
from pypdf import PdfReader

def load_pdf(file_path: str | Path) -> str:
    """Reads a PDF file and returns its text content."""
    try:
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        return text
    except Exception as e:
        print(f"[Loader] Error reading {file_path}: {e}")
        return ""

def load_knowledge_dir(knowledge_dir: str | Path) -> list[dict]:
    """Recursively loads all PDFs in a directory and its subdirectories."""
    documents = []
    base_path = Path(knowledge_dir)
    for pdf_file in base_path.rglob("*.pdf"):
        text = load_pdf(pdf_file)
        if text:
            # Determine category based on parent folder name
            category = pdf_file.parent.name
            documents.append({
                "file_name": pdf_file.name,
                "category": category,
                "text": text,
                "path": str(pdf_file)
            })
    return documents
