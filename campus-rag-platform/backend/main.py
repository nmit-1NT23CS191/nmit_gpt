"""
Task 2.2 — FastAPI Backend Core.

Configures CORS, a health check endpoint, and registers the Phase 3
routers (OCR ingestion, agentic RAG chat). All AI inference (chat,
tool-calling, embeddings) runs against the self-hosted Ollama container
configured in config.py — this backend makes zero calls to any external
commercial AI API.
"""
import logging

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from backend.config import get_settings
from backend.agents.ocr_engine import router as ocr_router
from backend.agents.rag_agent import router as rag_router
from backend.agents.events_router import router as events_router
from backend.voice.voice_router import router as voice_router
from backend.super_admin_router import router as super_admin_router
from backend.login_router import router as login_router


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
settings = get_settings()

app = FastAPI(title="NMIT Smart Campus — Agentic RAG Platform")

# CORS Configuration - Allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Users frontend
        "http://localhost:3001",  # Admin frontend
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        *settings.CORS_ORIGINS
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "ollama_chat_model": settings.OLLAMA_CHAT_MODEL,
        "ollama_embed_model": settings.OLLAMA_EMBED_MODEL,
        "ollama_base_url": settings.OLLAMA_BASE_URL,
    }


@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> Response:
    return Response(content=b"", media_type="image/x-icon", status_code=204)


# Register routers
app.include_router(ocr_router)
app.include_router(rag_router)
app.include_router(events_router)
app.include_router(voice_router)
app.include_router(super_admin_router)
app.include_router(login_router)

logger.info("🚀 NMIT Smart Campus backend started successfully")
