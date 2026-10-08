-- ============================================================================
-- 0004_integrity_hardening.sql — audit hardening BETE-13.
-- Depends on 0001_init.sql + 0002_submit_survey_rpc.sql (+ 0003). Idempotent:
-- safe to run repeatedly.
--
-- 1. `sessions.is_completed` follows the payload's `isComplete` (default
--    true). The zod contract (src/lib/submit-survey.ts) accepts the boolean:
--    the final Step-5 button sends true, the GlobalTimer auto-submit at
--    expiry sends false (BETE-11 finding) — expired sessions are now
--    distinguishable directly on the column for research analysis.
--    Missing/empty/null → true, so payloads from older clients keep the old
--    behavior (the value the RPC hardcoded before this migration).
--
-- 2. Explicit REVOKE from anon/authenticated. 0002 only revoked from PUBLIC,
--    but Supabase's default privileges also grant EXECUTE on new functions
--    in schema public directly to the anon/authenticated roles. Harmless
--    today (the RPC is security invoker, and RLS deny-all blocks every
--    client write), but it must not be callable from client keys at all —
--    revoke explicitly as defense in depth (audit BETE-13).
-- ============================================================================

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
    v_is_complete     boolean;
    v_session_id      uuid;
begin
    v_participant_id  := (p_payload->'sessionData'->>'participantId')::uuid;
    v_treatment_group := (p_payload->'sessionData'->>'treatmentGroupId')::integer;
    v_remaining       := coalesce(
        (p_payload->'sessionData'->>'globalTimeRemaining')::integer, 0);
    -- Missing / "" / JSON null → true: legacy payloads keep old behavior
    -- (BETE-13 contract, see src/lib/submit-survey.ts header).
    v_is_complete     := coalesce(
        nullif(p_payload->>'isComplete', ''), 'true')::boolean;

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
    --    is_completed comes from the payload: false on the timer-expiry
    --    auto-submit path (BETE-11/BETE-13).
    insert into public.sessions
        (participant_id, treatment_group, start_time, is_completed, global_remaining_seconds)
    values (
        v_participant_id,
        v_treatment_group,
        now() - make_interval(secs => greatest(0, 2400 - v_remaining)),
        v_is_complete,
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

    -- 4. survey_results — recommendation + questionnaire (1:1 with session),
    -- including the manipulation check (BETE-14).
    insert into public.survey_results
        (session_id, know_how_fee, entertainment, maintenance, marketing,
         confidence_level, q1_answer, q2_answer, q3_answer, manipulation_check)
    values (
        v_session_id,
        (p_payload->'recommendations'->>'knowHowFee')::bigint,
        (p_payload->'recommendations'->>'entertainment')::bigint,
        (p_payload->'recommendations'->>'maintenance')::bigint,
        (p_payload->'recommendations'->>'marketing')::bigint,
        (p_payload->'recommendations'->>'confidenceLevel')::integer,
        p_payload->'questionnaire'->>'q1',
        p_payload->'questionnaire'->>'q2',
        p_payload->'questionnaire'->>'q3',
        nullif(p_payload->'questionnaire'->>'manipulationCheck', '')::integer
    );

    return jsonb_build_object(
        'status',        'created',
        'sessionId',     v_session_id,
        'participantId', v_participant_id
    );
end
$$;

-- EXECUTE only for service_role. Revoke from PUBLIC (0002) AND explicitly
-- from the client roles (Supabase default privileges grant them EXECUTE on
-- new public-schema functions — audit BETE-13, defense in depth).
revoke all on function public.submit_survey(jsonb) from public;
revoke all on function public.submit_survey(jsonb) from anon;
revoke all on function public.submit_survey(jsonb) from authenticated;
grant execute on function public.submit_survey(jsonb) to service_role;
