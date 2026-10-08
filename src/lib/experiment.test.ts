import { describe, expect, it } from "vitest";
import {
  assignTreatmentGroup,
  buildSubmitPayload,
  clearPersistedState,
  createDeadlineTimestamp,
  createInitialExperimentState,
  createParticipantId,
  EXPERIMENT_DURATION_SECONDS,
  experimentReducer,
  formatClock,
  loadPersistedState,
  PERSISTENCE_KEY,
  PERSISTED_STATE_VERSION,
  pathForStep,
  persistState,
  remainingSeconds,
  stepFromPath,
  type ExperimentAction,
  type ExperimentState,
  type StorageLike,
  type TreatmentGroupId,
} from "@/lib/experiment";

/** PRNG deterministik (mulberry32) supaya uji distribusi tidak flaky di CI. */
function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createFakeStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

function startSession(
  state: ExperimentState,
  overrides: Partial<Extract<ExperimentAction, { type: "START_SESSION" }>> = {},
): ExperimentState {
  return experimentReducer(state, {
    type: "START_SESSION",
    participantId: "00000000-0000-4000-8000-000000000000",
    treatmentGroupId: 2,
    nowMs: 1_700_000_000_000,
    ...overrides,
  });
}

describe("assignTreatmentGroup", () => {
  it("memetakan rentang rng [0,1) ke grup 1-4 secara terbagi rata", () => {
    expect(assignTreatmentGroup(() => 0)).toBe(1);
    expect(assignTreatmentGroup(() => 0.2499)).toBe(1);
    expect(assignTreatmentGroup(() => 0.25)).toBe(2);
    expect(assignTreatmentGroup(() => 0.5)).toBe(3);
    expect(assignTreatmentGroup(() => 0.7499)).toBe(3);
    expect(assignTreatmentGroup(() => 0.75)).toBe(4);
    expect(assignTreatmentGroup(() => 0.9999)).toBe(4);
  });

  it("tetap menghasilkan grup valid walau rng mengembalikan 1 (edge)", () => {
    expect(assignTreatmentGroup(() => 1)).toBe(4);
  });

  it("hanya menghasilkan nilai 1-4", () => {
    const rng = createSeededRng(42);
    for (let i = 0; i < 1000; i++) {
      const group = assignTreatmentGroup(rng);
      expect([1, 2, 3, 4]).toContain(group);
    }
  });

  it("distribusinya merata (±8%) pada sampel besar", () => {
    const rng = createSeededRng(1337);
    const counts = new Map<TreatmentGroupId, number>([
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ]);
    const total = 40_000;
    for (let i = 0; i < total; i++) {
      const group = assignTreatmentGroup(rng);
      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
    const expected = total / 4;
    for (const count of counts.values()) {
      expect(Math.abs(count - expected)).toBeLessThanOrEqual(expected * 0.08);
    }
  });
});

describe("createParticipantId", () => {
  it("menghasilkan UUID v4 yang valid", () => {
    const id = createParticipantId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(createParticipantId()).not.toBe(id);
  });
});

describe("matematika timer", () => {
  const startMs = 1_700_000_000_000;

  it("createDeadlineTimestamp = sekarang + 40 menit", () => {
    expect(createDeadlineTimestamp(startMs)).toBe(startMs + EXPERIMENT_DURATION_SECONDS * 1000);
  });

  it("remainingSeconds tanpa deadline mengembalikan durasi penuh", () => {
    expect(remainingSeconds(null, startMs)).toBe(EXPERIMENT_DURATION_SECONDS);
  });

  it("menghitung sisa waktu dari deadline absolut (anti-drift)", () => {
    const deadline = createDeadlineTimestamp(startMs);
    expect(remainingSeconds(deadline, startMs)).toBe(2400);
    expect(remainingSeconds(deadline, startMs + 60_000)).toBe(2340);
    expect(remainingSeconds(deadline, startMs + 39 * 60_000)).toBe(60);
  });

  it("membulat ke atas agar tampilan tidak pernah lebih lambat dari nyata", () => {
    const deadline = startMs + 10_000; // 10 detik ke depan.
    expect(remainingSeconds(deadline, startMs + 9_400)).toBe(1); // sisa 0.6s → 1
  });

  it("membatasi hasil di 0..2400", () => {
    const deadline = createDeadlineTimestamp(startMs);
    expect(remainingSeconds(deadline, startMs + 41 * 60_000)).toBe(0); // sudah lewat
    expect(remainingSeconds(startMs + 50 * 60_000, startMs)).toBe(2400); // clamp atas
  });

  it("formatClock memformat mm:ss", () => {
    expect(formatClock(2400)).toBe("40:00");
    expect(formatClock(65)).toBe("01:05");
    expect(formatClock(599)).toBe("09:59");
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(-5)).toBe("00:00");
  });
});

describe("navigasi langkah", () => {
  it("stepFromPath mengenali kelima langkah dan mengabaikan path lain", () => {
    expect(stepFromPath("/step-1-scenario")).toBe(1);
    expect(stepFromPath("/step-5-demographics")).toBe(5);
    expect(stepFromPath("/")).toBe(0);
    expect(stepFromPath("/debriefing")).toBe(0);
  });

  it("pathForStep adalah kebalikan stepFromPath", () => {
    for (let step = 1; step <= 5; step++) {
      expect(stepFromPath(pathForStep(step))).toBe(step);
    }
    expect(pathForStep(0)).toBe("/");
    expect(pathForStep(6)).toBe("/");
  });
});

describe("experimentReducer", () => {
  it("START_SESSION mengunci grup treatment & deadline dan mereset jawaban", () => {
    const dirty = createInitialExperimentState();
    const state = startSession(dirty, { treatmentGroupId: 3 });
    expect(state.status).toBe("running");
    expect(state.storageChecked).toBe(true);
    expect(state.sessionData.treatmentGroupId).toBe(3);
    expect(state.sessionData.participantId).toBeTruthy();
    expect(state.sessionData.currentStep).toBe(1);
    expect(state.sessionData.globalTimeRemaining).toBe(2400);
    expect(state.sessionData.deadlineTimestamp).toBe(1_700_000_000_000 + 2_400_000);
    expect(state.caseLogs).toEqual([]);
  });

  it("tidak ada action yang bisa mengubah treatmentGroupId setelah terkunci", () => {
    let state = startSession(createInitialExperimentState(), { treatmentGroupId: 4 });
    const mutations: ExperimentAction[] = [
      { type: "SET_STEP", step: 2 },
      { type: "TICK", nowMs: 1_700_000_100_000 },
      { type: "UPSERT_CASE_LOG", caseLog: { caseId: 1, durationSeconds: 30, isSaved: true, rank: 1 } },
      { type: "SET_RECOMMENDATIONS", patch: { confidenceLevel: 50 } },
      { type: "SET_QUESTIONNAIRE", patch: { q1: "a" } },
      { type: "SET_DEMOGRAPHICS", patch: { age: 30 } },
    ];
    for (const action of mutations) {
      state = experimentReducer(state, action);
    }
    expect(state.sessionData.treatmentGroupId).toBe(4);
  });

  it("SET_STEP hanya maju (monoton)", () => {
    let state = startSession(createInitialExperimentState());
    state = experimentReducer(state, { type: "SET_STEP", step: 3 });
    expect(state.sessionData.currentStep).toBe(3);
    state = experimentReducer(state, { type: "SET_STEP", step: 1 });
    expect(state.sessionData.currentStep).toBe(3); // tidak mundur
  });

  it("TICK selalu menghitung ulang sisa waktu dari deadline (tidak akumulasi)", () => {
    const startMs = 1_700_000_000_000;
    let state = startSession(createInitialExperimentState(), { nowMs: startMs });
    state = experimentReducer(state, { type: "TICK", nowMs: startMs + 2_000 });
    expect(state.sessionData.globalTimeRemaining).toBe(2398);
    state = experimentReducer(state, { type: "TICK", nowMs: startMs + 5_000 });
    expect(state.sessionData.globalTimeRemaining).toBe(2395);
  });

  it("EXPIRE mengunci semua input: mutasi setelah expire diabaikan", () => {
    let state = startSession(createInitialExperimentState());
    state = experimentReducer(state, { type: "EXPIRE" });
    expect(state.status).toBe("expired");
    expect(state.sessionData.globalTimeRemaining).toBe(0);

    state = experimentReducer(state, { type: "SET_STEP", step: 4 });
    state = experimentReducer(state, {
      type: "UPSERT_CASE_LOG",
      caseLog: { caseId: 1, durationSeconds: 30, isSaved: true, rank: 1 },
    });
    state = experimentReducer(state, { type: "SET_RECOMMENDATIONS", patch: { knowHowFee: 1 } });
    state = experimentReducer(state, { type: "TICK", nowMs: 1_700_000_100_000 });
    expect(state.sessionData.currentStep).toBe(1);
    expect(state.caseLogs).toEqual([]);
    expect(state.recommendations.knowHowFee).toBeNull();
  });

  it("MARK_SUBMITTED berlaku dari running maupun expired", () => {
    let state = startSession(createInitialExperimentState());
    state = experimentReducer(state, { type: "MARK_SUBMITTED" });
    expect(state.status).toBe("submitted");

    let expired = startSession(createInitialExperimentState());
    expired = experimentReducer(expired, { type: "EXPIRE" });
    expired = experimentReducer(expired, { type: "MARK_SUBMITTED" });
    expect(expired.status).toBe("submitted");
  });

  it("state awal belum storageChecked; REHYDRATE menandainya", () => {
    expect(createInitialExperimentState().storageChecked).toBe(false);
    const rehydrated = experimentReducer(createInitialExperimentState(), {
      type: "REHYDRATE",
      state: createInitialExperimentState(),
    });
    expect(rehydrated.storageChecked).toBe(true);
  });

  it("UPSERT_CASE_LOG menambah log baru dan memperbarui log kasus yang sama", () => {
    let state = startSession(createInitialExperimentState());
    state = experimentReducer(state, {
      type: "UPSERT_CASE_LOG",
      caseLog: { caseId: 1, durationSeconds: 10, isSaved: false, rank: null },
    });
    state = experimentReducer(state, {
      type: "UPSERT_CASE_LOG",
      caseLog: { caseId: 1, durationSeconds: 45, isSaved: true, rank: 3 },
    });
    expect(state.caseLogs).toHaveLength(1);
    expect(state.caseLogs[0]).toEqual({ caseId: 1, durationSeconds: 45, isSaved: true, rank: 3 });
  });

  it("SAVE_CASE_DURATION membuat log baru dengan default is_saved/rank", () => {
    let state = startSession(createInitialExperimentState());
    state = experimentReducer(state, { type: "SAVE_CASE_DURATION", caseId: 7, durationSeconds: 12 });
    expect(state.caseLogs).toEqual([
      { caseId: 7, durationSeconds: 12, isSaved: false, rank: null },
    ]);
  });

  it("SAVE_CASE_DURATION hanya menyentuh durationSeconds — is_saved/rank tetap", () => {
    let state = startSession(createInitialExperimentState());
    state = experimentReducer(state, {
      type: "UPSERT_CASE_LOG",
      caseLog: { caseId: 3, durationSeconds: 10, isSaved: true, rank: 2 },
    });
    state = experimentReducer(state, { type: "SAVE_CASE_DURATION", caseId: 3, durationSeconds: 55 });
    expect(state.caseLogs).toEqual([
      { caseId: 3, durationSeconds: 55, isSaved: true, rank: 2 },
    ]);
  });

  it("SAVE_CASE_DURATION tetap menyimpan durasi parsial saat expired (BETE-9)", () => {
    let state = startSession(createInitialExperimentState());
    state = experimentReducer(state, {
      type: "UPSERT_CASE_LOG",
      caseLog: { caseId: 5, durationSeconds: 20, isSaved: true, rank: 1 },
    });
    state = experimentReducer(state, { type: "EXPIRE" });
    state = experimentReducer(state, { type: "SAVE_CASE_DURATION", caseId: 5, durationSeconds: 27 });
    // Durasi parsial tersimpan; is_saved/rank tidak berubah.
    expect(state.caseLogs).toEqual([
      { caseId: 5, durationSeconds: 27, isSaved: true, rank: 1 },
    ]);
  });

  it("SAVE_CASE_DURATION diabaikan saat idle dan submitted", () => {
    const idle = experimentReducer(createInitialExperimentState(), {
      type: "SAVE_CASE_DURATION",
      caseId: 1,
      durationSeconds: 10,
    });
    expect(idle.caseLogs).toEqual([]);

    let submitted = startSession(createInitialExperimentState());
    submitted = experimentReducer(submitted, { type: "MARK_SUBMITTED" });
    submitted = experimentReducer(submitted, {
      type: "SAVE_CASE_DURATION",
      caseId: 1,
      durationSeconds: 10,
    });
    expect(submitted.caseLogs).toEqual([]);
  });
});

describe("persistensi", () => {
  it("menyimpan ke semua storage dan membaca ulang sessionStorage lebih dulu", () => {
    const session = createFakeStorage();
    const local = createFakeStorage();
    const nowMs = 1_700_000_000_000;
    let state = startSession(createInitialExperimentState(), { nowMs });
    state = experimentReducer(state, {
      type: "UPSERT_CASE_LOG",
      caseLog: { caseId: 2, durationSeconds: 12, isSaved: false, rank: 14 },
    });

    persistState(state, [session, local]);

    // localStorage berisi snapshot LAMA (sisa 2400), sessionStorage SEGAR.
    const staleLocal = JSON.parse(
      JSON.stringify({ version: PERSISTED_STATE_VERSION, state }),
    ) as { version: number; state: ExperimentState };
    // Ubah remaining di localStorage supaya terlihat mana yang dipakai.
    staleLocal.state = experimentReducer(staleLocal.state, { type: "TICK", nowMs: nowMs });
    local.setItem(PERSISTENCE_KEY, JSON.stringify(staleLocal));

    const loaded = loadPersistedState([session, local], nowMs);
    expect(loaded).not.toBeNull();
    expect(loaded?.storageChecked).toBe(true);
    expect(loaded?.caseLogs).toHaveLength(1);
    expect(loaded?.sessionData.treatmentGroupId).toBe(2);
  });

  it("menghitung ulang sisa waktu dari deadline saat rehidrasi (bukan nilai tersimpan)", () => {
    const storage = createFakeStorage();
    const nowMs = 1_700_000_000_000;
    const state = startSession(createInitialExperimentState(), { nowMs });
    persistState(state, [storage]);

    // Baca 60 detik kemudian: meski snapshot menyimpan 2400, hasil = 2340.
    const loaded = loadPersistedState([storage], nowMs + 60_000);
    expect(loaded?.sessionData.globalTimeRemaining).toBe(2340);
  });

  it("mengembalikan null untuk JSON rusak atau versi berbeda", () => {
    const storage = createFakeStorage();
    storage.setItem(PERSISTENCE_KEY, "{{bukan json");
    expect(loadPersistedState([storage], 0)).toBeNull();

    storage.setItem(PERSISTENCE_KEY, JSON.stringify({ version: 999, state: {} }));
    expect(loadPersistedState([storage], 0)).toBeNull();

    storage.setItem(PERSISTENCE_KEY, JSON.stringify({ version: PERSISTED_STATE_VERSION }));
    expect(loadPersistedState([storage], 0)).toBeNull();
  });

  it("menghapus storage setelah submit final (status submitted)", () => {
    const session = createFakeStorage();
    const local = createFakeStorage();
    let state = startSession(createInitialExperimentState());
    persistState(state, [session, local]);
    expect(session.getItem(PERSISTENCE_KEY)).not.toBeNull();

    state = experimentReducer(state, { type: "MARK_SUBMITTED" });
    persistState(state, [session, local]);
    expect(session.getItem(PERSISTENCE_KEY)).toBeNull();
    expect(local.getItem(PERSISTENCE_KEY)).toBeNull();

    expect(loadPersistedState([session, local], 0)).toBeNull();
    expect(clearPersistedState([session, local])).toBeUndefined();
  });
});

describe("buildSubmitPayload", () => {
  it("memuat kelima slice sesuai payload arsitektur + flag isComplete", () => {
    const state = startSession(createInitialExperimentState());
    const payload = buildSubmitPayload(state, { isComplete: false });
    expect(Object.keys(payload)).toEqual(
      expect.arrayContaining([
        "sessionData",
        "caseLogs",
        "recommendations",
        "questionnaire",
        "demographics",
        "isComplete",
      ]),
    );
    expect(payload.isComplete).toBe(false);
    expect(payload.sessionData).toEqual(state.sessionData);
  });
});
