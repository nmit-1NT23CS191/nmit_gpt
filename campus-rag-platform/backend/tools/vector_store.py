"""
Vector store integration.

Fixed:
  Bug 3 — Wrong Ollama embedding API:
    The old code called POST /api/embeddings with {"prompt": ...}.
    Modern Ollama (≥0.1.26) uses POST /api/embed with {"input": ...}.
    This module now tries /api/embed first and falls back to /api/embeddings
    for older Ollama installs, so it works with any version.
"""
import logging

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from backend.config import get_settings
from backend.supabase_client import get_supabase

logger = logging.getLogger(__name__)
settings = get_settings()


class EmbeddingError(RuntimeError):
    pass


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type(EmbeddingError),
    reraise=True,
)
async def embed_text(content: str) -> list[float]:
    """Generate a vector embedding via the local Ollama embedding model.

    Tries the modern /api/embed endpoint first (Ollama ≥0.1.26), then falls
    back to the legacy /api/embeddings endpoint for older installs.
    """
    if not content or not content.strip():
        raise ValueError("Cannot embed empty text")

    async with httpx.AsyncClient(base_url=settings.OLLAMA_BASE_URL, timeout=60.0) as client:
        # --- Try modern API first (Ollama ≥ 0.1.26) ---
        resp = await client.post(
            "/api/embed",
            json={"model": settings.OLLAMA_EMBED_MODEL, "input": content},
        )

        if resp.status_code == 404:
            # Fall back to legacy endpoint for older Ollama installs
            logger.debug("Ollama /api/embed returned 404 — falling back to /api/embeddings")
            resp = await client.post(
                "/api/embeddings",
                json={"model": settings.OLLAMA_EMBED_MODEL, "prompt": content},
            )

        if resp.status_code != 200:
            raise EmbeddingError(
                f"Ollama embedding call failed: {resp.status_code} {resp.text[:200]}"
            )

        data = resp.json()
        # Modern API returns {"embeddings": [[...]]} (list of lists, one per input)
        # Legacy API returns {"embedding": [...]}
        embedding = (
            data.get("embeddings", [[]])[0]   # modern: first (and only) input
            or data.get("embedding")           # legacy
        )

        if not embedding:
            raise EmbeddingError("Ollama returned an empty embedding vector")
        if len(embedding) != settings.EMBEDDING_DIM:
            raise EmbeddingError(
                f"Unexpected embedding dimension: got {len(embedding)}, "
                f"expected {settings.EMBEDDING_DIM}. "
                f"Check OLLAMA_EMBED_MODEL and EMBEDDING_DIM in backend/.env."
            )
        return embedding


def chunk_text(content: str, chunk_size: int | None = None, overlap: int | None = None) -> list[str]:
    chunk_size = chunk_size or settings.RAG_CHUNK_SIZE
    overlap = overlap or settings.RAG_CHUNK_OVERLAP
    words = content.split()
    if len(words) <= chunk_size:
        return [content.strip()]

    chunks = []
    step = max(chunk_size - overlap, 1)
    for i in range(0, len(words), step):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk.strip())
        if i + chunk_size >= len(words):
            break
    return chunks


async def store_event_embeddings(event_id: int, full_text: str) -> int:
    """Chunk event text, embed each chunk locally, and persist to
    event_embeddings via the Supabase service-role client (which bypasses
    RLS — the intentional design from policies.sql)."""
    db = get_supabase()
    chunks = chunk_text(full_text)
    stored = 0

    for chunk in chunks:
        try:
            vector = await embed_text(chunk)
        except (EmbeddingError, ValueError) as e:
            logger.error("Embedding failed for event %s chunk: %s", event_id, e)
            continue

        try:
            db.table("event_embeddings").insert(
                {"event_id": event_id, "text_chunk": chunk, "embedding": vector}
            ).execute()
            stored += 1
        except Exception as e:
            logger.error("DB insert failed for event %s embedding: %s", event_id, e)

    return stored


async def search_events(query: str, top_k: int | None = None) -> list[dict]:
    """Embed the query locally, then call the match_events Postgres RPC
    function for cosine-similarity top-k retrieval."""
    top_k = top_k or settings.RAG_TOP_K
    try:
        query_vector = await embed_text(query)
    except EmbeddingError as e:
        logger.error("Could not embed search query: %s", e)
        return []

    db = get_supabase()
    try:
        result = db.rpc(
            "match_events",
            {"query_embedding": query_vector, "match_count": top_k},
        ).execute()
    except Exception as e:
        logger.error("match_events RPC failed: %s", e)
        return []

    matches = result.data or []
    if not matches:
        return []

    event_ids = [m["event_id"] for m in matches]
    events_result = db.table("events").select("*").in_("id", event_ids).execute()
    events_by_id = {e["id"]: e for e in (events_result.data or [])}

    enriched = []
    for m in matches:
        event = events_by_id.get(m["event_id"])
        if not event:
            continue
        enriched.append({**m, "event": event})
    return enriched
