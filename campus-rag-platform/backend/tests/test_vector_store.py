"""
Unit tests for tools/vector_store.py's pure-logic pieces (chunking) and
the async embedding call, mocked so this suite runs in CI without a live
Ollama instance.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from unittest.mock import AsyncMock, patch

os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret")

from tools import vector_store  # noqa: E402


def test_chunk_text_short_input_returns_single_chunk():
    text = "Hackfest is a 24-hour build sprint for CS students."
    chunks = vector_store.chunk_text(text, chunk_size=400, overlap=40)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_chunk_text_long_input_splits_with_overlap():
    words = [f"word{i}" for i in range(1000)]
    text = " ".join(words)
    chunks = vector_store.chunk_text(text, chunk_size=400, overlap=40)
    assert len(chunks) > 1
    # Every chunk should be non-empty and within a reasonable word bound.
    for chunk in chunks:
        assert chunk.strip()
        assert len(chunk.split()) <= 400


def test_chunk_text_empty_string_returns_single_empty_chunk():
    chunks = vector_store.chunk_text("   ", chunk_size=400, overlap=40)
    assert chunks == [""]


@pytest.mark.asyncio
async def test_embed_text_rejects_empty_input():
    with pytest.raises(ValueError):
        await vector_store.embed_text("")


@pytest.mark.asyncio
async def test_embed_text_raises_on_dimension_mismatch():
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json = lambda: {"embedding": [0.1, 0.2, 0.3]}  # wrong dim, expects 768

    with patch("httpx.AsyncClient.post", return_value=mock_response):
        with pytest.raises(vector_store.EmbeddingError):
            await vector_store.embed_text("some event description")
