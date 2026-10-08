-- ============================================================================
-- 0001_init.sql — Initial schema: tax-decision experiment (BETE-5)
-- Target: Supabase (PostgreSQL 15+). No extensions required
-- (gen_random_uuid() is core since PG13).
--
-- Idempotent: safe to run multiple times (IF NOT EXISTS / IF EXISTS guards).
--
-- Schema decisions approved by PM (BETE-5):
--   1. treatment_group INT lives on sessions — no treatment_groups lookup
--      table. The treatment matrix text is frontend content (src/content/),
--      per prompt.md Step 1.
--   2. q3_answer added to survey_results — the questionnaire has 3 items;
--      prompt.md only listed q1–q2 in the table (spec gap).
--   3. global_remaining_seconds added to sessions — seconds left on the
--      40-minute global timer at submit; needed for research analysis.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- participants — one row per participant (demographics + PII).
-- ---------------------------------------------------------------------------
create table if not exists public.participants (
    id           uuid        primary key default gen_random_uuid(),
    username     text        not null,
    phone_number text        not null,   -- PII: No. HP for credit incentive
    gender       text        not null,
    age          integer     not null,
    education    text        not null,
    affiliation  text        not null,
    created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- sessions — one experiment run: random treatment assignment + global timer.
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
    id                       uuid        primary key default gen_random_uuid(),
    participant_id           uuid        not null references public.participants (id) on delete cascade,
    treatment_group          integer     not null check (treatment_group between 1 and 4),
    start_time               timestamptz not null default now(),
    is_completed             boolean     not null default false,
    global_remaining_seconds integer,    -- seconds left at submit; null while running
    created_at               timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- case_logs — per-case information-search tracking (14 reference cases).
-- is_saved = citation answer Ya/Tidak for the case (see PRD).
-- UNIQUE (session_id, case_id): one log per case per session; its index also
-- covers FK lookups on session_id.
-- ---------------------------------------------------------------------------
create table if not exists public.case_logs (
    id               bigint generated always as identity primary key,  -- BIGSERIAL equivalent
    session_id       uuid        not null references public.sessions (id) on delete cascade,
    case_id          integer     not null check (case_id between 1 and 14),
    duration_seconds integer     not null check (duration_seconds >= 0),
    is_saved         boolean     not null default false,
    rank_assigned    integer,    -- priority ranking 1–14, set after reading
    created_at       timestamptz not null default now(),
    constraint case_logs_session_case_unique unique (session_id, case_id)
);

-- ---------------------------------------------------------------------------
-- survey_results — tax recommendation + questionnaire, 1:1 with sessions.
-- ---------------------------------------------------------------------------
create table if not exists public.survey_results (
    id               uuid        primary key default gen_random_uuid(),
    session_id       uuid        not null unique references public.sessions (id) on delete cascade,
    know_how_fee     bigint      not null,
    entertainment    bigint      not null,
    maintenance      bigint      not null,
    marketing        bigint      not null,
    confidence_level integer     not null check (confidence_level between 0 and 100),
    q1_answer        text        not null,
    q2_answer        text        not null,
    q3_answer        text        not null,
    created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes: every FK and filter column.
-- case_logs.session_id and survey_results.session_id are already covered by
-- their UNIQUE constraint indexes (session_id is the leading column), so no
-- separate FK index is needed there.
-- ---------------------------------------------------------------------------
create index if not exists idx_sessions_participant_id  on public.sessions (participant_id);
create index if not exists idx_sessions_treatment_group on public.sessions (treatment_group);
create index if not exists idx_sessions_is_completed    on public.sessions (is_completed);
create index if not exists idx_case_logs_case_id        on public.case_logs (case_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — default deny.
-- The app writes everything in one batch from the server (/api/submit-survey)
-- using the service_role key, which bypasses RLS (BYPASSRLS). No client-side
-- (anon/authenticated) read or write is allowed: participant phone numbers
-- are PII. The explicit using (false) / with check (false) policies for
-- anon + authenticated make the deny visible in pg_policies; combined with
-- RLS enabled, any role without BYPASSRLS sees no rows.
-- ---------------------------------------------------------------------------
alter table public.participants   enable row level security;
alter table public.sessions       enable row level security;
alter table public.case_logs      enable row level security;
alter table public.survey_results enable row level security;

-- Supabase always ships the anon/authenticated client roles; create them as
-- NOLOGIN here so this migration also runs on vanilla Postgres (no-op on
-- Supabase). Any other role without BYPASSRLS stays denied by RLS anyway:
-- policies below grant nothing to it.
do $$
begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
    end if;
end
$$;

drop policy if exists deny_all_to_clients on public.participants;
create policy deny_all_to_clients on public.participants
    for all to anon, authenticated using (false) with check (false);

drop policy if exists deny_all_to_clients on public.sessions;
create policy deny_all_to_clients on public.sessions
    for all to anon, authenticated using (false) with check (false);

drop policy if exists deny_all_to_clients on public.case_logs;
create policy deny_all_to_clients on public.case_logs
    for all to anon, authenticated using (false) with check (false);

drop policy if exists deny_all_to_clients on public.survey_results;
create policy deny_all_to_clients on public.survey_results
    for all to anon, authenticated using (false) with check (false);
