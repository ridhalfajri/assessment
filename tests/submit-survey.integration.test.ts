/**
 * Uji integrasi BETE-7: RPC `submit_survey` terhadap Postgres lokal sungguhan.
 *
 * Membutuhkan Postgres lokal dengan migrasi dapat dijalankan, mis.:
 *   docker run -d --name bete7-pg -e POSTGRES_PASSWORD=postgres -p 54329:5432 postgres:16
 *   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:54329/postgres npm test
 *
 * Tanpa TEST_DATABASE_URL, seluruh suite ini di-skip (unit & route test tetap jalan).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { buildValidPayload } from "./helpers/payload";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "";

describe.skipIf(!TEST_DATABASE_URL)("submit_survey RPC (integrasi Postgres lokal)", () => {
  let client: Client;

  const call = (payload: unknown) =>
    client.query<{ result: { status: string; sessionId: string; participantId: string } }>(
      "select submit_survey($1::jsonb) as result",
      [JSON.stringify(payload)],
    );

  const count = async (table: string, where: string, param: string) => {
    const res = await client.query<{ n: string }>(
      `select count(*)::text as n from public.${table} where ${where} = $1`,
      [param],
    );
    return Number(res.rows[0].n);
  };

  beforeAll(async () => {
    client = new Client({ connectionString: TEST_DATABASE_URL });
    await client.connect();
    for (const file of ["0001_init.sql", "0002_submit_survey_rpc.sql", "0003_manipulation_check.sql", "0004_integrity_hardening.sql"]) {
      const sql = await readFile(
        path.join(__dirname, "../supabase/migrations", file),
        "utf8",
      );
      await client.query(sql);
    }
  });

  it("payload valid → satu request mengisi keempat tabel dengan nilai yang benar", async () => {
    const payload = buildValidPayload();
    const participantId = randomUUID();
    payload.sessionData.participantId = participantId;

    const before = Date.now();
    const res = await call(payload);
    const after = Date.now();

    expect(res.rows[0].result.status).toBe("created");
    const sessionId = res.rows[0].result.sessionId;
    expect(sessionId).toBeTruthy();

    // participants — demografi tersimpan utuh
    const participant = await client.query(
      "select * from public.participants where id = $1",
      [participantId],
    );
    expect(participant.rowCount).toBe(1);
    expect(participant.rows[0].username).toBe("partisipan_01");
    expect(participant.rows[0].phone_number).toBe("081234567890");
    expect(participant.rows[0].affiliation).toBe("KAP Sejahtera");
    expect(participant.rows[0].age).toBe(28);

    // sessions — treatment, timer, is_completed, start_time turunan
    const session = await client.query(
      "select * from public.sessions where participant_id = $1",
      [participantId],
    );
    expect(session.rowCount).toBe(1);
    expect(session.rows[0].id).toBe(sessionId);
    expect(session.rows[0].treatment_group).toBe(2);
    expect(session.rows[0].is_completed).toBe(true);
    expect(session.rows[0].global_remaining_seconds).toBe(1725);
    // start ≈ submit − (2400 − 1725) = submit − 675 detik
    const startTimeMs = new Date(session.rows[0].start_time).getTime();
    const expectedStart = (before + after) / 2 - 675_000;
    expect(Math.abs(startTimeMs - expectedStart)).toBeLessThan(10_000);

    // case_logs — 14 baris bulk, nilai per kasus benar
    expect(await count("case_logs", "session_id", sessionId)).toBe(14);
    const log = await client.query(
      "select * from public.case_logs where session_id = $1 and case_id = 3",
      [sessionId],
    );
    expect(log.rows[0].duration_seconds).toBe(43);
    expect(log.rows[0].is_saved).toBe(true);
    expect(log.rows[0].rank_assigned).toBe(3);

    // survey_results — 1 baris, rekomendasi + kuesioner utuh
    const survey = await client.query(
      "select * from public.survey_results where session_id = $1",
      [sessionId],
    );
    expect(survey.rowCount).toBe(1);
    expect(survey.rows[0].know_how_fee).toBe("250000000");
    expect(survey.rows[0].entertainment).toBe("150000000");
    expect(survey.rows[0].maintenance).toBe("300000000");
    expect(survey.rows[0].marketing).toBe("125000000");
    expect(survey.rows[0].confidence_level).toBe(85);
    expect(survey.rows[0].q1_answer).toBe("Pasal 6 dan 9 UU PPh");
    expect(survey.rows[0].q3_answer).toContain("daftar nominatif");
    // manipulation check (BETE-14): Likert tersimpan di kolomnya sendiri
    expect(survey.rows[0].manipulation_check).toBe(4);
  });

  it("manipulationCheck di luar 1–5 ditolak DB (CHECK), rollback penuh (BETE-14)", async () => {
    const payload = buildValidPayload();
    const participantId = randomUUID();
    payload.sessionData.participantId = participantId;
    payload.questionnaire.manipulationCheck = 9; // melanggar CHECK 1–5

    await expect(call(payload)).rejects.toThrow();

    expect(await count("participants", "id", participantId)).toBe(0);
    expect(await count("sessions", "participant_id", participantId)).toBe(0);
  });

  it("submit ulang dengan participantId sama → already_submitted, tidak ada duplikasi", async () => {
    const payload = buildValidPayload();
    const participantId = randomUUID();
    payload.sessionData.participantId = participantId;

    const first = await call(payload);
    expect(first.rows[0].result.status).toBe("created");
    const sessionId = first.rows[0].result.sessionId;

    // submit ulang: data demografi dikit diubah — first write wins
    const resubmit = structuredClone(payload);
    resubmit.demographics.username = "berubah";
    resubmit.recommendations.confidenceLevel = 10;
    const second = await call(resubmit);

    expect(second.rows[0].result.status).toBe("already_submitted");
    expect(second.rows[0].result.sessionId).toBe(sessionId);

    expect(await count("participants", "id", participantId)).toBe(1);
    expect(await count("sessions", "participant_id", participantId)).toBe(1);
    expect(await count("case_logs", "session_id", sessionId)).toBe(14);
    expect(await count("survey_results", "session_id", sessionId)).toBe(1);

    const still = await client.query("select username from public.participants where id = $1", [
      participantId,
    ]);
    expect(still.rows[0].username).toBe("partisipan_01");
  });

  it("payload tampered (case_id duplikat) → error, TIDAK ada partial insert", async () => {
    const payload = buildValidPayload();
    const participantId = randomUUID();
    payload.sessionData.participantId = participantId;
    payload.caseLogs[13].caseId = 1; // melanggar UNIQUE(session_id, case_id)

    await expect(call(payload)).rejects.toThrow();

    // rollback penuh: baris participants/sessions dari transaksi itu tidak ada;
    // case_logs/survey_results dengan session_id yang tak pernah tercipta = 0
    const missingSession = randomUUID();
    expect(await count("participants", "id", participantId)).toBe(0);
    expect(await count("sessions", "participant_id", participantId)).toBe(0);
    expect(await count("case_logs", "session_id", missingSession)).toBe(0);
    expect(await count("survey_results", "session_id", missingSession)).toBe(0);
  });

  it("rank duplikat ditolak DB (partial unique index), rollback penuh", async () => {
    const payload = buildValidPayload();
    const participantId = randomUUID();
    payload.sessionData.participantId = participantId;
    payload.caseLogs[1].rank = payload.caseLogs[0].rank;

    await expect(call(payload)).rejects.toThrow();

    expect(await count("participants", "id", participantId)).toBe(0);
    expect(await count("sessions", "participant_id", participantId)).toBe(0);
  });

  it("submit ganda simultan (dua koneksi) → tepat satu created, satu already_submitted", async () => {
    const payload = buildValidPayload();
    const participantId = randomUUID();
    payload.sessionData.participantId = participantId;

    const clientB = new Client({ connectionString: TEST_DATABASE_URL });
    await clientB.connect();
    try {
      const callA = client.query(
        "select submit_survey($1::jsonb) as result",
        [JSON.stringify(payload)],
      );
      const callB = clientB.query(
        "select submit_survey($1::jsonb) as result",
        [JSON.stringify(payload)],
      );
      const results = await Promise.all([callA, callB]);
      const statuses = results.map((r) => r.rows[0].result.status).sort();

      expect(statuses).toEqual(["already_submitted", "created"]);
      expect(await count("participants", "id", participantId)).toBe(1);
      expect(await count("sessions", "participant_id", participantId)).toBe(1);

      const sessionId = results.find((r) => r.rows[0].result.status === "created")!.rows[0]
        .result.sessionId;
      expect(await count("case_logs", "session_id", sessionId)).toBe(14);
      expect(await count("survey_results", "session_id", sessionId)).toBe(1);
    } finally {
      await clientB.end();
    }
  });

  it("isComplete false (auto-submit expiry) → sessions.is_completed = false (BETE-13)", async () => {
    const payload = buildValidPayload();
    const participantId = randomUUID();
    payload.sessionData.participantId = participantId;
    payload.sessionData.globalTimeRemaining = 0;
    payload.isComplete = false;

    await call(payload);

    const session = await client.query(
      "select is_completed, global_remaining_seconds from public.sessions where participant_id = $1",
      [participantId],
    );
    expect(session.rows[0].is_completed).toBe(false);
    expect(session.rows[0].global_remaining_seconds).toBe(0);
  });

  it("payload lama tanpa isComplete → sessions.is_completed = true (default)", async () => {
    const payload = buildValidPayload();
    const participantId = randomUUID();
    payload.sessionData.participantId = participantId;
    delete (payload as Record<string, unknown>).isComplete;

    await call(payload);

    const session = await client.query(
      "select is_completed from public.sessions where participant_id = $1",
      [participantId],
    );
    expect(session.rows[0].is_completed).toBe(true);
  });
});
