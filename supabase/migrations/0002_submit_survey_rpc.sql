-- ============================================================================
-- 0002_submit_survey_rpc.sql — transactional batch-submit for /api/submit-survey
-- (BETE-7). Depends on 0001_init.sql. Idempotent: safe to run repeatedly.
--
-- Why an RPC: supabase-js talks to PostgREST, one HTTP statement at a time —
-- there is no client-side multi-statement transaction. Writing participants →
-- sessions → case_logs (bulk) → survey_results as a single function call keeps
-- the whole submit in ONE Postgres transaction: either every row lands or
-- none does (no partial inserts on validation/DB errors).
--
-- Idempotency contract (double submit: refresh, timeout auto-submit, retry):
--   * sessions gets UNIQUE (participant_id) — one experiment session per
--     participant (participantId is generated once at login and persisted in
--     client state, so a resubmit carries the same id). The second insert
--     conflicts, nothing is written, and the function returns
--     `already_submitted` with 200.
--   * Enforced at the DB level, so concurrent double-clicks are also safe:
--     the loser of the unique-index race blocks until the winner commits,
--     then returns already_submitted.
--   * case_logs UNIQUE (session_id, case_id) (0001) plus the new partial
--     unique index on rank keep the data consistent even for callers that
--     bypass the API's zod validation (defense in depth).
--
-- Schema decisions (BETE-7, built on the payload JSON architecture in BETE-2):
--   * sessionData carries no sessionId — the session identity is derived from
--     participantId via UNIQUE (participant_id). One login = one run.
--   * start_time is derived from globalTimeRemaining: the global timer is
--     wall-clock with a 2400 s (40 min) budget, so
--     start_time ≈ submit time − (2400 − remaining). Using now() would log
--     the submit moment, ~40 min late.
--   * is_completed is set true at submit (timer stops when submit succeeds).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- UNIQUE (participant_id) on sessions — the idempotency anchor.
-- Replaces the plain FK index from 0001 (the unique index covers it).
-- ---------------------------------------------------------------------------
do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'sessions_participant_id_unique'
    ) then
        alter table public.sessions
            add constraint sessions_participant_id_unique unique (participant_id);
    end if;
end
$$;

drop index if exists idx_sessions_participant_id;

-- ---------------------------------------------------------------------------
-- Ranks are a priority permutation: unique per session when present
-- (rank_assigned stays nullable — auto-submit at timeout may rank fewer).
-- ---------------------------------------------------------------------------
create unique index if not exists case_logs_session_rank_unique
    on public.case_logs (session_id, rank_assigned)
    where rank_assigned is not null;

-- ---------------------------------------------------------------------------
-- submit_survey(payload jsonb) → jsonb
--
-- Payload shape = frontend state (BETE-2 architecture), validated by zod in
-- src/lib/submit-survey.ts before this function is ever called:
-- {
--   "sessionData":     { "participantId", "treatmentGroupId", "globalTimeRemaining", ["currentStep"] },
--   "caseLogs":        [ { "caseId", "durationSeconds", "isSaved", "rank": number|null } × 14 ],
--   "recommendations": { "knowHowFee", "entertainment", "maintenance", "marketing", "confidenceLevel" },
--   "questionnaire":   { "q1", "q2", "q3" },
--   "demographics":    { "username", "age", "gender", "education", "affiliation", "phoneNumber" }
-- }
--
-- Returns: { "status": "created" | "already_submitted", "sessionId", "participantId" }
--
-- Executable only by service_role (the API route's server-side client).
-- ---------------------------------------------------------------------------
create or replace function public.submit_survey(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_participant_id  uuid;
    v_treatment_group integer;
    v_remaining       integer;
    v_session_id      uuid;
begin
    v_participant_id  := (p_payload->'sessionData'->>'participantId')::uuid;
    v_treatment_group := (p_payload->'sessionData'->>'treatmentGroupId')::integer;
    v_remaining       := coalesce(
        (p_payload->'sessionData'->>'globalTimeRemaining')::integer, 0);

    -- 1. participant — resubmit keeps the first demographics on file.
    insert into public.participants (id, username, phone_number, gender, age, education, affiliation)
    values (
        v_participant_id,
        p_payload->'demographics'->>'username',
        p_payload->'demographics'->>'phoneNumber',
        p_payload->'demographics'->>'gender',
        (p_payload->'demographics'->>'age')::integer,
        p_payload->'demographics'->>'education',
        p_payload->'demographics'->>'affiliation'
    )
    on conflict (id) do nothing;

    -- 2. session — UNIQUE (participant_id) detects a resubmitted session.
    insert into public.sessions
        (participant_id, treatment_group, start_time, is_completed, global_remaining_seconds)
    values (
        v_participant_id,
        v_treatment_group,
        now() - make_interval(secs => greatest(0, 2400 - v_remaining)),
        true,
        v_remaining
    )
    on conflict (participant_id) do nothing
    returning id into v_session_id;

    if v_session_id is null then
        select s.id into v_session_id
        from public.sessions s
        where s.participant_id = v_participant_id;

        return jsonb_build_object(
            'status',        'already_submitted',
            'sessionId',     v_session_id,
            'participantId', v_participant_id
        );
    end if;

    -- 3. case_logs — bulk insert, 14 rows, one statement.
    insert into public.case_logs (session_id, case_id, duration_seconds, is_saved, rank_assigned)
    select
        v_session_id,
        (c->>'caseId')::integer,
        (c->>'durationSeconds')::integer,
        (c->>'isSaved')::boolean,
        nullif(c->>'rank', '')::integer
    from jsonb_array_elements(p_payload->'caseLogs') as c;

    -- 4. survey_results — recommendation + questionnaire (1:1 with session).
    insert into public.survey_results
        (session_id, know_how_fee, entertainment, maintenance, marketing,
         confidence_level, q1_answer, q2_answer, q3_answer)
    values (
        v_session_id,
        (p_payload->'recommendations'->>'knowHowFee')::bigint,
        (p_payload->'recommendations'->>'entertainment')::bigint,
        (p_payload->'recommendations'->>'maintenance')::bigint,
        (p_payload->'recommendations'->>'marketing')::bigint,
        (p_payload->'recommendations'->>'confidenceLevel')::integer,
        p_payload->'questionnaire'->>'q1',
        p_payload->'questionnaire'->>'q2',
        p_payload->'questionnaire'->>'q3'
    );

    return jsonb_build_object(
        'status',        'created',
        'sessionId',     v_session_id,
        'participantId', v_participant_id
    );
end
$$;

revoke all on function public.submit_survey(jsonb) from public;

do $$
begin
    -- Mirror Supabase's service_role so the grant below also works on a
    -- vanilla local Postgres (no-op on Supabase, where the role exists).
    -- BYPASSRLS is required: the RPC is security invoker, so its inserts run
    -- as service_role — without it, RLS default-deny would block every write
    -- on a vanilla Postgres (real Supabase's service_role has bypassrls too).
    if not exists (select 1 from pg_roles where rolname = 'service_role') then
        create role service_role nologin bypassrls;
    elsif not exists (
        select 1 from pg_roles where rolname = 'service_role' and rolbypassrls
    ) then
        alter role service_role bypassrls;
    end if;
end
$$;

-- Mirror Supabase's default privileges: real Supabase implicitly grants ALL
-- on tables/sequences to service_role, a vanilla Postgres does not. Without
-- these, the RPC (security invoker, runs as service_role via the REST API)
-- fails with "permission denied for table ..." even with BYPASSRLS — table
-- ACLs are separate from row-level security. No-op on Supabase (already held).
grant all on public.participants, public.sessions, public.case_logs,
  public.survey_results to service_role;
grant usage, select on all sequences in schema public to service_role;

grant execute on function public.submit_survey(jsonb) to service_role;
