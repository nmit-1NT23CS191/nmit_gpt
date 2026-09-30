-- ============================================================================
-- PHASE 1 / TASK 1.2 — Row Level Security (RLS) & Supabase Storage
-- Run this AFTER schema.sql. Run via Supabase SQL Editor or:
--   supabase db execute -f backend/policies.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Storage bucket: event-docs
-- Holds raw uploaded posters/schedules/notices before and after OCR.
-- Private by default; only authenticated users can write, only admins can
-- write via the app (enforced by app-layer role check + the object policy
-- below), and read access is authenticated-only (not public) since posters
-- may contain student ID data.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('event-docs', 'event-docs', false)
on conflict (id) do nothing;

-- Authenticated users may upload to event-docs.
drop policy if exists "event-docs authenticated write" on storage.objects;
create policy "event-docs authenticated write"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'event-docs');

-- Authenticated users may read objects in event-docs.
drop policy if exists "event-docs authenticated read" on storage.objects;
create policy "event-docs authenticated read"
    on storage.objects for select
    to authenticated
    using (bucket_id = 'event-docs');

-- Only admins (checked against public.users.role) may delete/update objects.
drop policy if exists "event-docs admin manage" on storage.objects;
create policy "event-docs admin manage"
    on storage.objects for all
    to authenticated
    using (
        bucket_id = 'event-docs'
        and exists (
            select 1 from public.users u
            where u.supabase_uid = auth.uid() and u.role = 'admin'
        )
    )
    with check (
        bucket_id = 'event-docs'
        and exists (
            select 1 from public.users u
            where u.supabase_uid = auth.uid() and u.role = 'admin'
        )
    );

-- ----------------------------------------------------------------------------
-- Enable RLS on every application table. Nothing is readable/writable until
-- an explicit policy below grants it — Supabase's default-deny posture.
-- ----------------------------------------------------------------------------
alter table public.users             enable row level security;
alter table public.documents         enable row level security;
alter table public.events            enable row level security;
alter table public.registrations     enable row level security;
alter table public.event_embeddings  enable row level security;

-- ----------------------------------------------------------------------------
-- Helper predicate used across policies: is the current JWT an admin?
-- Defined as a function so it isn't repeated (and re-planned) in every policy.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
    select exists (
        select 1 from public.users u
        where u.supabase_uid = auth.uid() and u.role = 'admin'
    );
$$;

-- ----------------------------------------------------------------------------
-- users: a person can read/update their own row; admins can read/manage all.
-- ----------------------------------------------------------------------------
drop policy if exists "users select own" on public.users;
create policy "users select own"
    on public.users for select
    to authenticated
    using (supabase_uid = auth.uid() or public.is_admin());

drop policy if exists "users update own" on public.users;
create policy "users update own"
    on public.users for update
    to authenticated
    using (supabase_uid = auth.uid())
    with check (supabase_uid = auth.uid());

drop policy if exists "users insert own" on public.users;
create policy "users insert own"
    on public.users for insert
    to authenticated
    with check (supabase_uid = auth.uid());

drop policy if exists "users admin all" on public.users;
create policy "users admin all"
    on public.users for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- documents: admin-only. Raw uploads are an internal ingestion artifact —
-- students never need to read the documents table directly.
-- ----------------------------------------------------------------------------
drop policy if exists "documents admin all" on public.documents;
create policy "documents admin all"
    on public.documents for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- events: public SELECT where is_verified = true (any authenticated user,
-- i.e. any logged-in student); admins get full CRUD including unverified
-- (pending-review) events.
-- ----------------------------------------------------------------------------
drop policy if exists "events public select verified" on public.events;
create policy "events public select verified"
    on public.events for select
    to public
    using (is_verified = true or public.is_admin());

drop policy if exists "events admin all" on public.events;
create policy "events admin all"
    on public.events for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- registrations: a user can only see/insert their own registrations
-- (matched against their own supabase_uid); admins can see all.
-- ----------------------------------------------------------------------------
drop policy if exists "registrations select own" on public.registrations;
create policy "registrations select own"
    on public.registrations for select
    to authenticated
    using (user_id = auth.uid() or public.is_admin());

drop policy if exists "registrations insert own" on public.registrations;
create policy "registrations insert own"
    on public.registrations for insert
    to authenticated
    with check (user_id = auth.uid());

drop policy if exists "registrations admin manage" on public.registrations;
create policy "registrations admin manage"
    on public.registrations for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- event_embeddings: backend service-role read/write only. No policy is
-- granted to the `authenticated` role, so ordinary user/admin JWTs get
-- zero access — only requests made with the Supabase service role key
-- (used server-side by the FastAPI backend, never shipped to the client)
-- can read or write vectors. The service role bypasses RLS entirely by
-- design in Supabase, so no explicit policy is required for it; this
-- comment documents that intentional gap rather than granting `authenticated`
-- any access.
-- ----------------------------------------------------------------------------
-- (Intentionally no policies for the `authenticated` role on this table.)
