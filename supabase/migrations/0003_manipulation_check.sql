-- ============================================================================
-- 0003_manipulation_check.sql — persist manipulation check (Likert 1–5)
-- (BETE-14). Depends on 0001_init.sql + 0002_submit_survey_rpc.sql.
-- Idempotent: safe to run repeatedly.
--
-- Gap found at the BETE-10 stage-gate: the UI collects the Likert
-- manipulation-check answer (state v3, `questionnaire.manipulationCheck`)
-- and sends it in the submit payload, but the zod API schema dropped it
-- (`questionnaire` accepted only q1–q3) and no DB column existed — the
-- answer never reached the database. This migration closes that gap end to
-- end: column → RPC insert → (zod contract lives in src/lib/submit-survey.ts).
--
-- Contract decision (BETE-14, documented in src/lib/submit-survey.ts):
--   * DB column is NULLable ON PURPOSE — rows written before this migration
--     (and manual/test rows) legitimately have no answer.
--   * The zod contract, however, REQUIRES manipulationCheck (int 1–5) on new
--     submissions: it is a core research instrument (evidence that the
--     accountability treatment registered on the participant), the Step 4
--     gate already enforces an answer before Step 5, and the questionnaire
--     items q1–q3 are required the same way.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- survey_results.manipulation_check — Likert 1–5, 1:1 with the session.
-- ---------------------------------------------------------------------------
alter table public.survey_results
    add column if not exists manipulation_check integer;

-- Postgres has no ADD CONSTRAINT IF NOT EXISTS — pg_constraint lookup like
-- the 0002 pattern. Validated on insert/update regardless of the caller
-- (defense in depth against callers bypassing the API's zod validation).
do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'survey_results_manipulation_check_range'
    ) then
        alter table public.survey_results
            add constraint survey_results_manipulation_check_range
            check (manipulation_check between 1 and 5);
    end if;
end
$$;

-- ---------------------------------------------------------------------------
-- submit_survey — replaced to insert questionnaire.manipulationCheck into the
-- new column (one transaction, unchanged otherwise). `create or replace`
-- keeps the signature/return type and the ACLs granted in 0002
-- (REVOKE from public, GRANT execute to service_role).
--
-- Tolerant cast (mirrors rank in 0002): JSON null / missing / "" → NULL
-- column for direct DB callers; the zod-gated API path always sends 1–5.
-- An out-of-range value violates the CHECK above and rolls the whole
-- transaction back — no partial insert.
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
