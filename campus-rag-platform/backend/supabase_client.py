"""
Supabase client, initialized once with the service role key.

The service role key bypasses Row Level Security entirely — that's by
design (see backend/policies.sql, which grants zero `authenticated`-role
access to event_embeddings). This client must NEVER be exposed to the
frontend; only this backend process holds it.
"""
from functools import lru_cache
from supabase import create_client, Client

from backend.config import get_settings

settings = get_settings()


@lru_cache
def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
