import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createInitialExperimentState,
  experimentReducer,
  type ExperimentState,
} from "@/lib/experiment";
import {
  buildSubmitRequest,
  getDemographicsFieldErrors,
  isPayloadValid,
  isStep3GateSatisfied,
  isStep4GateSatisfied,
  normalizeCaseLogs,
  PAYLOAD_CASE_COUNT,
  postSubmitSurvey,
  SubmitRequestError,
} from "@/lib/submit-client";

/** State "running" dengan participantId/treatmentGroupId valid (BETE-6). */
function startSession(state: ExperimentState): ExperimentState {
  return experimentReducer(state, {
    type: "START_SESSION",
    participantId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    treatmentGroupId: 2,
    nowMs: 1_700_000_000_000,
  });
}

/** State lengkap yang lolos seluruh skema zod kontrak API (BETE-7). */
function createCompleteState(): ExperimentState {
  let state = startSession(createInitial());
  state = experimentReducer(state, {
    type: "UPSERT_CASE_LOG",
    caseLog: { caseId: 1, durationSeconds: 45, isSaved: true, rank: 1 },
  });
  state = experimentReducer(state, {
    type: "SET_RECOMMENDATIONS",
    patch: {
      knowHowFee: 250_000_000,
      entertainment: 150_000_000,
      maintenance: 300_000_000,
      marketing: 125_000_000,
      confidenceLevel: 85,
    },
  });
  state = experimentReducer(state, {
    type: "SET_QUESTIONNAIRE",
    patch: { q1: "Pasal 6 dan 9 UU PPh", q2: "Terdapat hubungan istimewa", q3: "Opsi C", manipulationCheck: 4 },
  });
  state = experimentReducer(state, {
    type: "SET_DEMOGRAPHICS",
    patch: {
      username: "partisipan_01",
      age: 28,
      gender: "Laki-laki",
      education: "S1",
      affiliation: "KAP Sejahtera",
      phoneNumber: "081234567890",
    },
  });
  return state;
}

function createInitial(): ExperimentState {
  return createInitialExperimentState();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeCaseLogs", () => {
  it("melengkapi kasus yang belum dibuka menjadi tepat 14 entri terurut", () => {
    const logs = normalizeCaseLogs([
      { caseId: 3, durationSeconds: 30, isSaved: true, rank: 2 },
      { caseId: 1, durationSeconds: 10, isSaved: false, rank: 1 },
    ]);
    expect(logs).toHaveLength(PAYLOAD_CASE_COUNT);
    expect(logs.map((log) => log.caseId)).toEqual(
      Array.from({ length: PAYLOAD_CASE_COUNT }, (_, i) => i + 1),
    );
    expect(logs[0]).toEqual({ caseId: 1, durationSeconds: 10, isSaved: false, rank: 1 });
    expect(logs[2]).toEqual({ caseId: 3, durationSeconds: 30, isSaved: true, rank: 2 });
    // Kasus tanpa catatan: durationSeconds 0, isSaved false, rank null (kontrak API).
    expect(logs[13]).toEqual({ caseId: 14, durationSeconds: 0, isSaved: false, rank: null });
  });

  it("array kosong menghasilkan 14 entri default", () => {
    const logs = normalizeCaseLogs([]);
    expect(logs).toHaveLength(14);
    expect(logs.every((log) => log.durationSeconds === 0 && !log.isSaved && log.rank === null)).toBe(
      true,
    );
  });

  it("dedupe defensif: entri pertama untuk caseId yang menang", () => {
    const logs = normalizeCaseLogs([
      { caseId: 5, durationSeconds: 1, isSaved: false, rank: null },
      { caseId: 5, durationSeconds: 99, isSaved: true, rank: 5 },
    ]);
    expect(logs.filter((log) => log.caseId === 5)).toHaveLength(1);
    expect(logs.find((log) => log.caseId === 5)?.durationSeconds).toBe(1);
  });
});

describe("buildSubmitRequest", () => {
  it("menghasilkan payload dengan caseLogs ternormalisasi 14 entri", () => {
    const state = createCompleteState();
    const request = buildSubmitRequest(state, { isComplete: true });
    expect(request.caseLogs).toHaveLength(14);
    expect(request.sessionData.participantId).toBe("3f2504e0-4f89-41d3-9a0c-0305e82c3301");
    expect(request.recommendations.knowHowFee).toBe(250_000_000);
  });

  it("ikut mengirim manipulationCheck (Likert) untuk penyimpanan backend berikutnya", () => {
    const state = createCompleteState();
    const request = buildSubmitRequest(state, { isComplete: true });
    expect(request.questionnaire.manipulationCheck).toBe(4);
  });
});

describe("isPayloadValid (skema zod yang sama dengan server)", () => {
  it("state lengkap → valid", () => {
    expect(isPayloadValid(createCompleteState())).toBe(true);
  });

  it("state awal tanpa isian → tidak valid", () => {
    expect(isPayloadValid(startSession(createInitial()))).toBe(false);
  });

  it("tanpa affiliation → tidak valid (kolom participants.affiliation NOT NULL)", () => {
    const state = createCompleteState();
    state.demographics.affiliation = null;
    expect(isPayloadValid(state)).toBe(false);
  });

  it("No. HP format non-Indonesia → tidak valid", () => {
    const state = createCompleteState();
    state.demographics.phoneNumber = "12345";
    expect(isPayloadValid(state)).toBe(false);
  });

  it("usia di luar 10–120 → tidak valid", () => {
    const state = createCompleteState();
    state.demographics.age = 9;
    expect(isPayloadValid(state)).toBe(false);
  });

  it("rank duplikat antar kasus → tidak valid", () => {
    const state = createCompleteState();
    state.caseLogs = [
      { caseId: 1, durationSeconds: 10, isSaved: false, rank: 3 },
      { caseId: 2, durationSeconds: 10, isSaved: false, rank: 3 },
    ];
    expect(isPayloadValid(state)).toBe(false);
  });
});

describe("postSubmitSurvey (fetch di-stub)", () => {
  function stubFetchOnce(status: number, body: unknown, throws = false) {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        if (throws) return Promise.reject(new TypeError("Failed to fetch"));
        return Promise.resolve(
          new Response(body === null ? "bukan json" : JSON.stringify(body), {
            status,
            headers: { "content-type": "application/json" },
          }),
        );
      }),
    );
  }

  it("200 created → SubmitOutcome created", async () => {
    stubFetchOnce(200, { status: "created", sessionId: "s1", participantId: "p1" });
    const outcome = await postSubmitSurvey({ sessionData: {} });
    expect(outcome.status).toBe("created");
    expect(outcome.sessionId).toBe("s1");
  });

  it("200 already_submitted → SubmitOutcome already_submitted (retry aman)", async () => {
    stubFetchOnce(200, { status: "already_submitted", sessionId: "s1" });
    const outcome = await postSubmitSurvey({ sessionData: {} });
    expect(outcome.status).toBe("already_submitted");
  });

  it("400 → SubmitRequestError dengan pesan ramah + details zod", async () => {
    stubFetchOnce(400, {
      error: "Validasi payload gagal.",
      details: [{ path: "demographics.phoneNumber", message: "Format tidak valid" }],
    });
    const error = await postSubmitSurvey({}).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(SubmitRequestError);
    expect((error as SubmitRequestError).message).toMatch(/tidak valid/i);
    expect((error as SubmitRequestError).details).toHaveLength(1);
  });

  it("500 → SubmitRequestError dengan pesan umum", async () => {
    stubFetchOnce(500, { error: "Terjadi kesalahan internal saat menyimpan data survei." });
    const error = await postSubmitSurvey({}).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(SubmitRequestError);
    expect((error as SubmitRequestError).message).toMatch(/coba lagi/i);
  });

  it("jaringan gagal → SubmitRequestError pesan koneksi", async () => {
    stubFetchOnce(0, null, true);
    const error = await postSubmitSurvey({}).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(SubmitRequestError);
    expect((error as SubmitRequestError).message).toMatch(/koneksi/i);
  });

  it("respons ok tapi body tak dikenal → SubmitRequestError", async () => {
    stubFetchOnce(200, null);
    const error = await postSubmitSurvey({}).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(SubmitRequestError);
  });
});

describe("isStep3GateSatisfied", () => {
  const baseFees = {
    knowHowFee: 1,
    entertainment: 2,
    maintenance: 3,
    marketing: 4,
    confidenceLevel: 50,
  };

  it("empat biaya + keyakinan terisi → true", () => {
    expect(isStep3GateSatisfied(baseFees)).toBe(true);
  });

  it("nol dianggap terisi (non-negatif), null/angka negatif tidak", () => {
    expect(isStep3GateSatisfied({ ...baseFees, knowHowFee: 0 })).toBe(true);
    expect(isStep3GateSatisfied({ ...baseFees, marketing: null })).toBe(false);
    expect(isStep3GateSatisfied({ ...baseFees, maintenance: -1 })).toBe(false);
  });

  it("keyakinan di luar 0–100 → false", () => {
    expect(isStep3GateSatisfied({ ...baseFees, confidenceLevel: 101 })).toBe(false);
    expect(isStep3GateSatisfied({ ...baseFees, confidenceLevel: null })).toBe(false);
  });
});

describe("isStep4GateSatisfied", () => {
  const baseQuestionnaire = { q1: "a", q2: "b", q3: "c", manipulationCheck: 3 };

  it("q1–q3 + Likert 1–5 terisi → true", () => {
    expect(isStep4GateSatisfied(baseQuestionnaire)).toBe(true);
    expect(isStep4GateSatisfied({ ...baseQuestionnaire, manipulationCheck: 1 })).toBe(true);
    expect(isStep4GateSatisfied({ ...baseQuestionnaire, manipulationCheck: 5 })).toBe(true);
  });

  it("jawaban kosong/whitespace atau Likert di luar 1–5 → false", () => {
    expect(isStep4GateSatisfied({ ...baseQuestionnaire, q1: "  " })).toBe(false);
    expect(isStep4GateSatisfied({ ...baseQuestionnaire, q2: null })).toBe(false);
    expect(isStep4GateSatisfied({ ...baseQuestionnaire, manipulationCheck: 0 })).toBe(false);
    expect(isStep4GateSatisfied({ ...baseQuestionnaire, manipulationCheck: 6 })).toBe(false);
    expect(isStep4GateSatisfied({ ...baseQuestionnaire, manipulationCheck: null })).toBe(false);
  });
});

describe("getDemographicsFieldErrors (aturan identik dengan API)", () => {
  const valid = {
    username: "partisipan_01",
    age: 28,
    gender: "Laki-laki",
    education: "S1",
    affiliation: "KAP Sejahtera",
    phoneNumber: "081234567890",
  };

  it("data valid → tanpa error", () => {
    expect(getDemographicsFieldErrors(valid)).toEqual({});
  });

  it("field kosong menghasilkan pesan per field", () => {
    const errors = getDemographicsFieldErrors({
      username: "partisipan_01",
      age: null,
      gender: null,
      education: null,
      affiliation: null,
      phoneNumber: null,
    });
    expect(Object.keys(errors).sort()).toEqual([
      "affiliation",
      "age",
      "education",
      "gender",
      "phoneNumber",
    ]);
  });

  it("No. HP dengan spasi/strip tetap valid (transform schema API)", () => {
    expect(getDemographicsFieldErrors({ ...valid, phoneNumber: "0812 3456-7890" })).toEqual({});
  });

  it("No. HP salah format → error", () => {
    const errors = getDemographicsFieldErrors({ ...valid, phoneNumber: "08123" });
    expect(errors.phoneNumber).toMatch(/tidak valid/i);
  });

  it("usia 9 atau 121 → error; usia 10 dan 120 → valid", () => {
    expect(getDemographicsFieldErrors({ ...valid, age: 9 }).age).toBeDefined();
    expect(getDemographicsFieldErrors({ ...valid, age: 121 }).age).toBeDefined();
    expect(getDemographicsFieldErrors({ ...valid, age: 10 }).age).toBeUndefined();
    expect(getDemographicsFieldErrors({ ...valid, age: 120 }).age).toBeUndefined();
  });
});
