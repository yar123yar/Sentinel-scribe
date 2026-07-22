def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 150) -> list[str]:
    """
    Splits a large text into smaller chunks of approximately `chunk_size` characters,
    with an overlap of `overlap` characters to preserve context across boundaries.
    """
    if not text:
        return []
        
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = start + chunk_size
        
        # If we are not at the end of the text, try to find a natural break point (e.g. newline or space)
        if end < text_length:
            # Look backwards from 'end' for a newline within the last 100 chars
            break_point = text.rfind('\n', max(0, end - 100), end)
            if break_point != -1:
                end = break_point + 1 # Include the newline
            else:
                # Look for a space
                break_point = text.rfind(' ', max(0, end - 50), end)
                if break_point != -1:
                    end = break_point + 1
                    
        chunk = text[start:end].strip()
        if len(chunk) > 50:  # Skip tiny chunks
            chunks.append(chunk)
            
        start = end - overlap

    return chunks
