"""
Central application configuration.
Loaded entirely from environment variables — no secrets hardcoded, unlike
the legacy repo's database.py which had a Postgres password committed
directly in source.
"""
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(BACKEND_DIR / ".env"), str(BACKEND_DIR.parent / ".env")),
        extra="ignore",
    )

    ENVIRONMENT: str = "development"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # --- Local dev auth bypass (set true in backend/.env for testing only) ---
    DEV_BYPASS_AUTH: bool = False

    # --- Supabase ---
    SUPABASE_URL: str
    SUPABASE_KEY: str                  # anon/public key (client-context calls, if ever needed server-side)
    SUPABASE_SERVICE_ROLE_KEY: str     # service role key — bypasses RLS, used for all backend DB/storage writes
    SUPABASE_STORAGE_BUCKET: str = "event-docs"
    SUPABASE_JWT_SECRET: str           # used to verify incoming user JWTs on protected routes

    # --- OCR binaries (leave empty on Linux/Docker — both are on PATH in the container) ---
    # Windows example: C:/Program Files/Tesseract-OCR/tesseract.exe
    TESSERACT_CMD: str = ""
    # Windows example: C:/Program Files/poppler/Library/bin
    POPPLER_PATH: str = ""

    # --- Ollama (local, self-hosted — no external AI APIs) ---
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_CHAT_MODEL: str = "qwen2.5:3b"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    EMBEDDING_DIM: int = 768

    # --- RAG tuning ---
    RAG_TOP_K: int = 2  # Limit to top 2 most relevant docs for faster responses
    RAG_CHUNK_SIZE: int = 400
    RAG_CHUNK_OVERLAP: int = 40

    # --- Voice (full-duplex, local/self-hosted — no external speech APIs) ---
    WHISPER_MODEL_SIZE: str = "base.en"    # faster-whisper (whisper.cpp-backed) model size
    WHISPER_DEVICE: str = "cpu"            # "cuda" if a GPU is available in the container
    WHISPER_COMPUTE_TYPE: str = "int8"     # int8 is fast and accurate enough for CPU inference
    PIPER_MODEL_PATH: str = "/models/piper/en_US-lessac-medium.onnx"
    PIPER_MODEL_CONFIG_PATH: str = "/models/piper/en_US-lessac-medium.onnx.json"
    PIPER_BINARY_PATH: str = "/usr/local/bin/piper"

    # --- Uploads (temp local staging before pushing to Supabase Storage) ---
    UPLOAD_TMP_DIR: str = "C:/Temp/campus-uploads"  # override in .env for Linux/Docker: /tmp/campus-uploads
    VOICE_TMP_DIR: str = "C:/Temp/campus-voice"


@lru_cache
def get_settings() -> Settings:
    return Settings()
