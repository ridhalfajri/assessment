/**
 * BETE-11 Tugas 3 — Idempotensi & error (API langsung):
 *   - submit valid → 200 created, keempat tabel terisi;
 *   - submit ganda (participantId sama) → 200 already_submitted, tidak duplikat;
 *   - payload tampered → 400 + TIDAK ada insert parsial;
 *   - body non-JSON → 400.
 */
import { expect, test } from "@playwright/test";
import { dbCount } from "../helpers/db";
import { buildValidPayload, postSubmit } from "../helpers/payload";

test("submit valid → created; submit ulang participantId sama → already_submitted tanpa duplikasi", async ({ request }) => {
  const username = `api_idem_${Date.now().toString(36)}`;
  const payload = buildValidPayload(username);

  const first = await postSubmit(request, payload);
  expect(first.status).toBe(200);
  expect(first.body).toMatchObject({ status: "created" });

  const participantId = (first.body as { participantId: string }).participantId;
  expect(await dbCount("participants", "username = $1", [username])).toBe(1);
  expect(await dbCount("sessions", "participant_id = $1", [participantId])).toBe(1);
  const session = (await dbCount("sessions", "participant_id = $1", [participantId])) && true;
  expect(session).toBe(true);
  expect(await dbCount("case_logs", "session_id = (select id from public.sessions where participant_id = $1)", [participantId])).toBe(14);
  expect(await dbCount("survey_results", "session_id = (select id from public.sessions where participant_id = $1)", [participantId])).toBe(1);

  // Submit ganda: klik ganda / retry / refresh — tidak boleh menduplikasi.
  const second = await postSubmit(request, payload);
  expect(second.status).toBe(200);
  expect(second.body).toMatchObject({ status: "already_submitted" });

  expect(await dbCount("participants", "username = $1", [username])).toBe(1);
  expect(await dbCount("sessions", "participant_id = $1", [participantId])).toBe(1);
  expect(await dbCount("case_logs", "session_id = (select id from public.sessions where participant_id = $1)", [participantId])).toBe(14);
  expect(await dbCount("survey_results", "session_id = (select id from public.sessions where participant_id = $1)", [participantId])).toBe(1);
});

const TAMPER_CASES: { name: string; mutate: (payload: ReturnType<typeof buildValidPayload>) => unknown }[] = [
  {
    name: "treatmentGroupId di luar 1–4",
    mutate: (p) => ({ ...p, sessionData: { ...p.sessionData, treatmentGroupId: 5 } }),
  },
  {
    name: "rank duplikat di caseLogs",
    mutate: (p) => ({ ...p, caseLogs: p.caseLogs.map((c, i) => (i === 1 ? { ...c, rank: 1 } : c)) }),
  },
  {
    name: "confidenceLevel di luar 0–100",
    mutate: (p) => ({ ...p, recommendations: { ...p.recommendations, confidenceLevel: 101 } }),
  },
  {
    name: "format No. HP tidak valid",
    mutate: (p) => ({ ...p, demographics: { ...p.demographics, phoneNumber: "12345" } }),
  },
  {
    name: "caseLogs kurang dari 14",
    mutate: (p) => ({ ...p, caseLogs: p.caseLogs.slice(0, 13) }),
  },
  {
    name: "manipulationCheck di luar 1–5",
    mutate: (p) => ({ ...p, questionnaire: { ...p.questionnaire, manipulationCheck: 9 } }),
  },
  {
    name: "durationSeconds negatif",
    mutate: (p) => ({ ...p, caseLogs: p.caseLogs.map((c, i) => (i === 0 ? { ...c, durationSeconds: -5 } : c)) }),
  },
  {
    name: "username kosong",
    mutate: (p) => ({ ...p, demographics: { ...p.demographics, username: "" } }),
  },
];

for (const tc of TAMPER_CASES) {
  test(`payload tampered (${tc.name}) → 400, tanpa insert parsial`, async ({ request }) => {
    const username = `api_tamper_${Date.now().toString(36)}`;
    const payload = buildValidPayload(username);
    const tampered = tc.mutate(payload);

    const res = await postSubmit(request, tampered);
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: expect.any(String) });
    expect((res.body as { details?: unknown }).details).toBeDefined();

    // Tidak ada partial insert: tidak ada baris untuk partisipan ini.
    expect(await dbCount("participants", "username = $1", [username])).toBe(0);
    expect(await dbCount("sessions", "participant_id = $1", [(payload as { sessionData: { participantId: string } }).sessionData.participantId])).toBe(0);
  });
}

test("body bukan JSON valid → 400", async ({ request }) => {
  const res = await postSubmit(request, "{not-json");
  expect(res.status).toBe(400);
  expect((res.body as { error: string }).error).toBeTruthy();
});
