-- ============================================================================
-- match_events — cosine-similarity RPC used by backend/tools/vector_store.py
-- Run this after schema.sql and policies.sql (Supabase SQL Editor or CLI).
-- ============================================================================

create or replace function public.match_events(
    query_embedding vector(768),
    match_count int default 4
)
returns table (
    event_id    bigint,
    text_chunk  text,
    similarity  float
)
language sql
stable
as $$
    select
        ee.event_id,
        ee.text_chunk,
        1 - (ee.embedding <=> query_embedding) as similarity
    from public.event_embeddings ee
    join public.events e on e.id = ee.event_id
    where e.is_verified = true
    order by ee.embedding <=> query_embedding
    limit match_count;
$$;

-- This function runs with the privileges of the caller by default (no
-- `security definer`), which is intentional: it's only ever invoked by the
-- backend using the service role key, which already bypasses RLS. Keeping
-- it as SECURITY INVOKER (the default) avoids accidentally widening access
-- if this RPC is ever exposed to the `authenticated` role in the future.
