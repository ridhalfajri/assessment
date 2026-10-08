/**
 * Uji integrasi BETE-10: alur payload frontend → API → Postgres lokal
 * sungguhan. Tidak seperti pengujian BETE-7 yang memakai payload helper
 * manual, di sini payload dibangun lewat jalur yang SAMA dengan UI:
 *   state engine (reducer) → buildSubmitRequest (normalisasi 14 caseLogs)
 *   → submitSurveyPayloadSchema.safeParse (validasi persis di route)
 *   → RPC submit_survey → 4 tabel.
 *
 * Membutuhkan Postgres lokal dengan migrasi dapat dijalankan, mis.:
 *   docker run -d --name bete10-pg -e POSTGRES_PASSWORD=postgres -p 54329:5432 postgres:16
 *   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:54329/postgres npm test
 *
 * Tanpa TEST_DATABASE_URL, seluruh suite ini di-skip (unit & route test tetap jalan).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import {
  createInitialExperimentState,
  experimentReducer,
  type ExperimentState,
} from "@/lib/experiment";
import { buildSubmitRequest, isPayloadValid } from "@/lib/submit-client";
import { submitSurveyPayloadSchema } from "@/lib/submit-survey";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "";

/** State "running" dengan identitas valid, seperti setelah consent (BETE-8). */
function startSession(state: ExperimentState): ExperimentState {
  return experimentReducer(state, {
    type: "START_SESSION",
    participantId: randomUUID(),
    treatmentGroupId: 3,
    nowMs: Date.now(),
  });
}

/**
 * State lengkap seperti partisipan yang menyelesaikan step 1–5: kasus 1–2
 * dibaca berdurasi, sisanya belum dibuka (dinormalisasi buildSubmitRequest),
 * rekomendasi, kuesioner + Likert, dan demografi lengkap.
 */
function createCompletedState(): ExperimentState {
  let state = startSession(createInitialExperimentState());
  state = experimentReducer(state, {
    type: "UPSERT_CASE_LOG",
    caseLog: { caseId: 1, durationSeconds: 95, isSaved: true, rank: 1 },
  });
  state = experimentReducer(state, {
    type: "UPSERT_CASE_LOG",
    caseLog: { caseId: 2, durationSeconds: 40, isSaved: false, rank: 14 },
  });
  state = experimentReducer(state, {
    type: "SET_RECOMMENDATIONS",
    patch: {
      knowHowFee: 400_000_000,
      entertainment: 200_000_000,
      maintenance: 250_000_000,
      marketing: 150_000_000,
      confidenceLevel: 70,
    },
  });
  state = experimentReducer(state, {
    type: "SET_QUESTIONNAIRE",
    patch: { q1: "Pasal 6 dan 9 UU PPh", q2: "Terdapat hubungan istimewa", q3: "Opsi daftar nominatif", manipulationCheck: 5 },
  });
  state = experimentReducer(state, {
    type: "SET_DEMOGRAPHICS",
    patch: {
      username: "bete10_partisipan",
      age: 35,
      gender: "Perempuan",
      education: "S2",
      affiliation: "Konsultan Pajak Mandiri",
      phoneNumber: "+628123456789",
    },
  });
  return state;
}

describe.skipIf(!TEST_DATABASE_URL)("BETE-10 happy path — payload frontend tersimpan utuh di Postgres lokal", () => {
  let client: Client;

  const call = (payload: unknown) =>
    client.query<{ result: { status: string; sessionId: string; participantId: string } }>(
      "select submit_survey($1::jsonb) as result",
      [JSON.stringify(payload)],
    );

  beforeAll(async () => {
    client = new Client({ connectionString: TEST_DATABASE_URL });
    await client.connect();
    for (const file of ["0001_init.sql", "0002_submit_survey_rpc.sql", "0003_manipulation_check.sql"]) {
      const sql = await readFile(path.join(__dirname, "../supabase/migrations", file), "utf8");
      await client.query(sql);
    }
  });

  it("login → consent → step 1–5 → submit: satu request mengisi keempat tabel dengan nilai yang benar", async () => {
    const state = createCompletedState();
    const participantId = state.sessionData.participantId as string;

    // Payload yang dikirim tombol final Step 5 harus lolos validasi route.
    const request = buildSubmitRequest(state, { isComplete: true });
    const parsed = submitSurveyPayloadSchema.safeParse(request);
    expect(parsed.success).toBe(true);
    expect(isPayloadValid(state)).toBe(true);

    const res = await call(parsed.success ? parsed.data : request);
    expect(res.rows[0].result.status).toBe("created");
    const sessionId = res.rows[0].result.sessionId;

    // participants — demografi (termasuk affiliation & No. HP insentif pulsa)
    const participant = await client.query("select * from public.participants where id = $1", [
      participantId,
    ]);
    expect(participant.rowCount).toBe(1);
    expect(participant.rows[0].username).toBe("bete10_partisipan");
    expect(participant.rows[0].age).toBe(35);
    expect(participant.rows[0].gender).toBe("Perempuan");
    expect(participant.rows[0].education).toBe("S2");
    expect(participant.rows[0].affiliation).toBe("Konsultan Pajak Mandiri");
    expect(participant.rows[0].phone_number).toBe("+628123456789");

    // sessions — treatment_group, global_remaining_seconds, is_completed
    const session = await client.query("select * from public.sessions where participant_id = $1", [
      participantId,
    ]);
    expect(session.rowCount).toBe(1);
    expect(session.rows[0].id).toBe(sessionId);
    expect(session.rows[0].treatment_group).toBe(3);
    expect(session.rows[0].is_completed).toBe(true);
    expect(session.rows[0].global_remaining_seconds).toBe(2400); // timer belum berjalan di state uji

    // case_logs — 14 baris: 2 kasus dibaca, 12 kasus belum dibuka (default kontrak)
    const logs = await client.query(
      "select * from public.case_logs where session_id = $1 order by case_id",
      [sessionId],
    );
    expect(logs.rowCount).toBe(14);
    expect(logs.rows[0].case_id).toBe(1);
    expect(logs.rows[0].duration_seconds).toBe(95);
    expect(logs.rows[0].is_saved).toBe(true);
    expect(logs.rows[0].rank_assigned).toBe(1);
    expect(logs.rows[1].duration_seconds).toBe(40);
    expect(logs.rows[13].case_id).toBe(14);
    expect(logs.rows[13].duration_seconds).toBe(0);
    expect(logs.rows[13].is_saved).toBe(false);
    expect(logs.rows[13].rank_assigned).toBeNull();

    // survey_results — rekomendasi + kuesioner + global timer ikut tercatat
    const survey = await client.query("select * from public.survey_results where session_id = $1", [
      sessionId,
    ]);
    expect(survey.rowCount).toBe(1);
    expect(survey.rows[0].know_how_fee).toBe("400000000"); // bigint → string di pg
    expect(survey.rows[0].entertainment).toBe("200000000");
    expect(survey.rows[0].maintenance).toBe("250000000");
    expect(survey.rows[0].marketing).toBe("150000000");
    expect(survey.rows[0].confidence_level).toBe(70);
    expect(survey.rows[0].q1_answer).toBe("Pasal 6 dan 9 UU PPh");
    expect(survey.rows[0].q2_answer).toBe("Terdapat hubungan istimewa");
    expect(survey.rows[0].q3_answer).toBe("Opsi daftar nominatif");
    // Roundtrip manipulation check (BETE-14): state UI (Likert 5) → skema zod
    // → RPC → kolom survey_results.manipulation_check.
    expect(survey.rows[0].manipulation_check).toBe(5);
  });

  it("submit ganda (retry/double-click) dengan participantId sama → already_submitted, tidak menduplikasi baris", async () => {
    const state = createCompletedState();
    const participantId = state.sessionData.participantId as string;
    const payload = submitSurveyPayloadSchema.parse(buildSubmitRequest(state, { isComplete: true }));

    expect((await call(payload)).rows[0].result.status).toBe("created");

    // Submit ulang — persis payload yang sama (refresh/retry/double-click).
    const second = await call(payload);
    expect(second.rows[0].result.status).toBe("already_submitted");

    // Submit ulang dengan state yang sedikit berbeda (participantId sama).
    const third = await call({ ...payload, isComplete: false });
    expect(third.rows[0].result.status).toBe("already_submitted");

    expect(await countTable("participants", "id", participantId)).toBe(1);
    expect(await countTable("sessions", "participant_id", participantId)).toBe(1);
    const session = await client.query("select id from public.sessions where participant_id = $1", [
      participantId,
    ]);
    expect(await countTable("case_logs", "session_id", session.rows[0].id)).toBe(14);
    expect(await countTable("survey_results", "session_id", session.rows[0].id)).toBe(1);
  });

  it("global_remaining_seconds tersimpan saat partisipan submit di tengah waktu", async () => {
    const state = createCompletedState();
    const participantId = state.sessionData.participantId as string;
    const payload = submitSurveyPayloadSchema.parse(buildSubmitRequest(state, { isComplete: true }));
    payload.sessionData.globalTimeRemaining = 1_234;
    expect((await call(payload)).rows[0].result.status).toBe("created");

    const session = await client.query(
      "select global_remaining_seconds from public.sessions where participant_id = $1",
      [participantId],
    );
    expect(session.rows[0].global_remaining_seconds).toBe(1234);
  });

  async function countTable(table: string, column: string, value: string): Promise<number> {
    const res = await client.query<{ n: string }>(
      `select count(*)::text as n from public.${table} where ${column} = $1`,
      [value],
    );
    return Number(res.rows[0].n);
  }
});
