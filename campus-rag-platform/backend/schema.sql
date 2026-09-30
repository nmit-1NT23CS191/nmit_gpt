-- ============================================================================
-- PHASE 1 / TASK 1.1 — Database Schema & Vector Extension
-- Smart Campus Agentic RAG Event Platform
-- Target: Supabase-hosted PostgreSQL (run via Supabase SQL Editor or the CLI:
--   supabase db execute -f backend/schema.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists vector;      -- pgvector, for embeddings
create extension if not exists pgcrypto;    -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- users
-- Mirrors Supabase auth.users (supabase_uid) with app-level profile data.
-- ----------------------------------------------------------------------------
create table if not exists public.users (
    id              bigint generated always as identity primary key,
    supabase_uid    uuid unique not null references auth.users(id) on delete cascade,
    name            text not null,
    email           text unique not null,
    department      text,
    role            text not null default 'student' check (role in ('student', 'admin')),
    semester        int,
    created_at      timestamptz not null default now()
);

create index if not exists idx_users_supabase_uid on public.users(supabase_uid);
alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check check (role in ('student', 'admin', 'super_admin'));

create index if not exists idx_users_role on public.users(role);

-- ----------------------------------------------------------------------------
-- activity_logs
-- Administrative audit trail for uploads and event changes.
-- ----------------------------------------------------------------------------
create table if not exists public.activity_logs (
    id          bigint generated always as identity primary key,
    admin_email text not null,
    action      text not null,
    target      text not null,
    details     jsonb not null default '{}'::jsonb,
    created_at  timestamptz not null default now()
);

create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);

-- ----------------------------------------------------------------------------
-- documents
-- Raw uploaded posters/schedules, before/after OCR extraction.
-- ----------------------------------------------------------------------------
create table if not exists public.documents (
    id                bigint generated always as identity primary key,
    file_name         text not null,
    file_url          text not null,           -- Supabase Storage object path/URL
    raw_ocr_output    jsonb,
    uploaded_by       uuid references auth.users(id) on delete set null,
    uploaded_at       timestamptz not null default now()
);

create index if not exists idx_documents_uploaded_by on public.documents(uploaded_by);

-- ----------------------------------------------------------------------------
-- events
-- Structured event records, parsed from documents (or entered directly).
-- ----------------------------------------------------------------------------
create table if not exists public.events (
    id              bigint generated always as identity primary key,
    document_id     bigint references public.documents(id) on delete set null,
    title           text not null,
    department      text,
    venue           text not null,
    event_date      timestamptz not null,
    end_date        timestamptz,
    capacity        int default 100,
    latitude        double precision,
    longitude       double precision,
    description     text,
    category        text,
    tags            text,
    is_verified     boolean not null default true,
    created_at      timestamptz not null default now()
);

create index if not exists idx_events_date on public.events(event_date);
create index if not exists idx_events_department on public.events(department);
create index if not exists idx_events_venue_date on public.events(venue, event_date, end_date);
create index if not exists idx_events_is_verified on public.events(is_verified);

-- ----------------------------------------------------------------------------
-- registrations
-- ----------------------------------------------------------------------------
create table if not exists public.registrations (
    id              bigint generated always as identity primary key,
    user_id         uuid not null references auth.users(id) on delete cascade,
    event_id        bigint not null references public.events(id) on delete cascade,
    registered_at   timestamptz not null default now(),
    reminder_sent   boolean not null default false,
    unique (user_id, event_id)
);

create index if not exists idx_registrations_event on public.registrations(event_id);
create index if not exists idx_registrations_user on public.registrations(user_id);

-- ----------------------------------------------------------------------------
-- event_embeddings
-- Vector store for RAG retrieval. 768-dim to match nomic-embed-text via Ollama.
-- ----------------------------------------------------------------------------
create table if not exists public.event_embeddings (
    id          bigint generated always as identity primary key,
    event_id    bigint not null references public.events(id) on delete cascade,
    text_chunk  text not null,
    embedding   vector(768) not null
);

create index if not exists idx_event_embeddings_event_id on public.event_embeddings(event_id);

-- HNSW cosine-distance index — required for fast top-k similarity search.
create index if not exists event_embeddings_hnsw_idx
    on public.event_embeddings
    using hnsw (embedding vector_cosine_ops);
