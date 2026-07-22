from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_secret_key: str = "supersecret-hackathon-key"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    # PostgreSQL
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/clinical_db"

    # Qdrant
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_api_key: str = ""   # Leave empty for local Docker. Set in .env for Qdrant Cloud.

    # Gemini (primary LLM)
    google_api_key: str = ""   # Set in .env — get a key at https://aistudio.google.com/app/apikey

    # HuggingFace (fallback LLM)
    hf_api_token: str = ""     # Set in .env — get a free token at https://huggingface.co/settings/tokens
    hf_model: str = "mistralai/Mistral-7B-Instruct-v0.3"  # Change to any HF Inference-supported model

    # Lyzr AI — shared credentials
    lyzr_api_key: str = "sk-default-ccCrjKz9PTY79O93334rAMmj1HBsUD7L"
    lyzr_user_id: str = "yarthem.muivah@arts.christuniversity.in"
    lyzr_base_url: str = "https://agent-prod.studio.lyzr.ai"

    # Lyzr AI — individual agent IDs
    lyzr_copilot_agent_id: str = "6a607de665649b0e4938c6f8"
    lyzr_copilot_session_id: str = "6a607de665649b0e4938c6f8-o046zcdl"

    lyzr_soap_agent_id: str = "6a607d9965649b0e4938c6f2"
    lyzr_soap_session_id: str = "6a607d9965649b0e4938c6f2-qtirj2co"

    lyzr_triage_agent_id: str = "6a607d646d88906f06ecb4e4"
    lyzr_triage_session_id: str = "6a607d646d88906f06ecb4e4-nxbv1tnw"

    lyzr_symptom_agent_id: str = "6a607d275380d93fa955f33a"
    lyzr_symptom_session_id: str = "6a607d275380d93fa955f33a-6s35o5fx"

    lyzr_red_flag_agent_id: str = "6a607cde81a646f98f3c311a"
    lyzr_red_flag_session_id: str = "6a607cde81a646f98f3c311a-d9uk948b"

    lyzr_transcript_agent_id: str = "6a607c8dfc0548a914ae4f76"
    lyzr_transcript_session_id: str = "6a607c8dfc0548a914ae4f76-ydkvfzby"

    # Legacy — kept for backward compat, maps to copilot agent
    lyzr_agent_id: str = "6a607de665649b0e4938c6f8"

    # JWT
    jwt_secret: str = "clinical-jwt-secret-2024"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
