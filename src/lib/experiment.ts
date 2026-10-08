/**
 * Engine murni eksperimen: tipe state, random assignment, matematika timer,
 * reducer, dan serialisasi persistensi. Semua fungsi di file ini bebas dari
 * React dan I/O browser agar mudah di-unit-test (lihat experiment.test.ts).
 *
 * Bentuk state mengikuti payload JSON di dokumen arsitektur (BETE-2):
 * { sessionData, caseLogs, recommendations, questionnaire, demographics }.
 * Tambahan mesin (terdokumentasi di issue BETE-6):
 *  - ExperimentState.status  → mesin anti-cheat (idle/running/expired/submitted).
 *  - ExperimentState.storageChecked → gerbang agar persistence/guard tidak
 *    berjalan sebelum storage dibaca (mencegah data tersimpan tertimpa state awal).
 *  - sessionData.deadlineTimestamp → deadline absolut timer (anti-drift setelah F5),
 *    dipersist; globalTimeRemaining tetap dihitung ulang dari deadline saat rehidrasi.
 *  - questionnaire.manipulationCheck → jawaban skala Likert 1–5 manipulation check
 *    (BETE-10; disimpan ke survey_results.manipulation_check sejak BETE-14).
 *  - demographics.affiliation → afiliasi partisipan (BETE-10; kolom participants
 *    affiliation NOT NULL di skema BETE-5, wajib oleh zod kontrak API BETE-7).
 */

export type TreatmentGroupId = 1 | 2 | 3 | 4;

export type ExperimentStatus = "idle" | "running" | "expired" | "submitted";

export type SessionData = {
  /** UUID v4, dibuat saat submit informed consent. */
  participantId: string | null;
  /** 1-4, diacak sekali saat submit consent lalu terkunci di reducer. */
  treatmentGroupId: TreatmentGroupId | null;
  /** Sisa waktu global dalam detik; dihitung dari deadlineTimestamp. */
  globalTimeRemaining: number;
  /** Langkah terjauh yang sudah dicapai (1-5); monoton naik (alur satu arah). */
  currentStep: number;
  /** Deadline absolut (epoch ms) = waktu mulai + 40 menit; sumber kebenaran timer. */
  deadlineTimestamp: number | null;
};

export type CaseLog = {
  caseId: number;
  durationSeconds: number;
  isSaved: boolean;
  rank: number | null;
};

export type Recommendations = {
  knowHowFee: number | null;
  entertainment: number | null;
  maintenance: number | null;
  marketing: number | null;
  confidenceLevel: number | null;
};

export type Questionnaire = {
  q1: string | null;
  q2: string | null;
  q3: string | null;
  /** Jawaban skala Likert 1–5 untuk manipulation check (BETE-10). Wajib di
   * payload & tersimpan di survey_results.manipulation_check (BETE-14);
   * null hanya di state berjalan sebelum butir dijawab. */
  manipulationCheck: number | null;
};

export type Demographics = {
  /** Username dari halaman Login & Informed Consent (BETE-8);
   * kolom participants.username NOT NULL di skema BETE-5. */
  username: string | null;
  age: number | null;
  gender: string | null;
  education: string | null;
  /** Afiliasi partisipan (BETE-10); kolom participants.affiliation NOT NULL. */
  affiliation: string | null;
  phoneNumber: string | null;
};

export type ExperimentState = {
  status: ExperimentStatus;
  /** Marker mesin: true setelah provider membaca storage (rehidrasi selesai);
   * mencegah guard/persistence mengambil keputusan dari state awan kosong.
   * Selalu true pada hasil loadPersistedState dan setelah START_SESSION. */
  storageChecked: boolean;
  sessionData: SessionData;
  caseLogs: CaseLog[];
  recommendations: Recommendations;
  questionnaire: Questionnaire;
  demographics: Demographics;
};

export const EXPERIMENT_DURATION_SECONDS = 40 * 60; // 2400 detik = 40 menit.

export const STEP_PATHS = [
  "/step-1-scenario",
  "/step-2-cases",
  "/step-3-form",
  "/step-4-quiz",
  "/step-5-demographics",
] as const;

/** Kunci penyimpanan yang sama untuk sessionStorage dan localStorage. */
export const PERSISTED_STATE_VERSION = 3; // v3: +manipulationCheck & +affiliation (BETE-10).
export const PERSISTENCE_KEY = "experiment.state.v1";

// ---------------------------------------------------------------------------
// Random assignment & identitas partisipan
// ---------------------------------------------------------------------------

/**
 * Mengacak grup treatment 1-4 secara merata. `rng` bisa disuntik agar hasil
 * deterministik di unit test; default Math.random di produksi.
 * Dipanggil TEPAT SEKALI saat submit informed consent; hasilnya dikunci
 * karena tidak ada action reducer yang bisa mengubah treatmentGroupId.
 */
export function assignTreatmentGroup(rng: () => number = Math.random): TreatmentGroupId {
  const bucket = Math.min(3, Math.floor(rng() * 4)); // 0..3, tetap valid walau rng()===1.
  return (bucket + 1) as TreatmentGroupId;
}

/** UUID v4 dengan fallback untuk konteks non-secure (http di LAN saat pilot). */
export function createParticipantId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // versi 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // varian 10xx
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex
    .slice(8, 10)
    .join("")}-${hex.slice(10, 16).join("")}`;
}

// ---------------------------------------------------------------------------
// Matematika timer (anti-drift)
// ---------------------------------------------------------------------------

/** Deadline absolut = sekarang + 40 menit. Disimpan, bukan sisa detik. */
export function createDeadlineTimestamp(nowMs: number): number {
  return nowMs + EXPERIMENT_DURATION_SECONDS * 1000;
}

/**
 * Sisa waktu (detik) dari deadline absolut — selalu dihitung ulang dari
 * jam dinding sehingga tidak drift setelah refresh/throttling background tab.
 * Bulat ke atas agar tampilan tidak pernah menampilkan lebih lambat dari nyata.
 */
export function remainingSeconds(deadlineTimestamp: number | null, nowMs: number): number {
  if (deadlineTimestamp === null) return EXPERIMENT_DURATION_SECONDS;
  const raw = Math.ceil((deadlineTimestamp - nowMs) / 1000);
  return Math.min(EXPERIMENT_DURATION_SECONDS, Math.max(0, raw));
}

/** Format mm:ss (mis. 40:00, 09:59, 00:00). */
export function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Navigasi langkah (satu arah)
// ---------------------------------------------------------------------------

/** Nomor langkah (1-5) dari path; 0 jika bukan halaman step (mis. /, /debriefing). */
export function stepFromPath(pathname: string): number {
  const index = STEP_PATHS.findIndex((p) => pathname === p || pathname.startsWith(`${p}/`));
  return index === -1 ? 0 : index + 1;
}

/** Path untuk nomor langkah; langkah tak valid → "/" sebagai pengaman. */
export function pathForStep(step: number): string {
  return STEP_PATHS[step - 1] ?? "/";
}

// ---------------------------------------------------------------------------
// State awal, action, dan reducer
// ---------------------------------------------------------------------------

export function createInitialExperimentState(): ExperimentState {
  return {
    status: "idle",
    storageChecked: false,
    sessionData: {
      participantId: null,
      treatmentGroupId: null,
      globalTimeRemaining: EXPERIMENT_DURATION_SECONDS,
      currentStep: 0,
      deadlineTimestamp: null,
    },
    caseLogs: [],
    recommendations: {
      knowHowFee: null,
      entertainment: null,
      maintenance: null,
      marketing: null,
      confidenceLevel: null,
    },
    questionnaire: { q1: null, q2: null, q3: null, manipulationCheck: null },
    demographics: {
      username: null,
      age: null,
      gender: null,
      education: null,
      affiliation: null,
      phoneNumber: null,
    },
  };
}

export type ExperimentAction =
  /** Dipanggil sekali saat submit informed consent; memulai sesi & timer baru. */
  | { type: "START_SESSION"; participantId: string; treatmentGroupId: TreatmentGroupId; nowMs: number }
  /** Dipanggil sekali di effect mount provider: dengan state hasil storage
   * ATAU state awal — baik-baik saja, yang penting menandai storageChecked. */
  | { type: "REHYDRATE"; state: ExperimentState }
  /** Sinkronisasi langkah saat partisipan maju ke halaman berikutnya. */
  | { type: "SET_STEP"; step: number }
  /** Detak timer; sisa waktu selalu dihitung ulang dari deadline absolut. */
  | { type: "TICK"; nowMs: number }
  /** Timer mencapai 00:00 → kunci input; auto-submit & debriefing ditangani UI. */
  | { type: "EXPIRE" }
  | { type: "UPSERT_CASE_LOG"; caseLog: CaseLog }
  /** Simpan durasi stopwatch kasus saat modal ditutup (BETE-9). Boleh dipanggil
   * saat status "running" MAUPUN "expired": keputusan desain BETE-9 — jika
   * timer global habis saat modal terbuka, durasi parsial tetap tersimpan
   * dengan is_saved/rank semula. Hanya menyentuh durationSeconds. */
  | { type: "SAVE_CASE_DURATION"; caseId: number; durationSeconds: number }
  | { type: "SET_RECOMMENDATIONS"; patch: Partial<Recommendations> }
  | { type: "SET_QUESTIONNAIRE"; patch: Partial<Questionnaire> }
  | { type: "SET_DEMOGRAPHICS"; patch: Partial<Demographics> }
  /** Submit final (atau auto-submit saat expired) berhasil dijalankan. */
  | { type: "MARK_SUBMITTED" };

export function experimentReducer(state: ExperimentState, action: ExperimentAction): ExperimentState {
  switch (action.type) {
    case "START_SESSION": {
      // Sesi baru selalu menimpa state lama: participantId baru, grup terkunci,
      // deadline absolut baru. Tidak ada action lain yang bisa menyentuh
      // treatmentGroupId — inilah penguncian random assignment.
      const fresh = createInitialExperimentState();
      return {
        status: "running",
        storageChecked: true,
        sessionData: {
          participantId: action.participantId,
          treatmentGroupId: action.treatmentGroupId,
          globalTimeRemaining: EXPERIMENT_DURATION_SECONDS,
          currentStep: 1,
          deadlineTimestamp: createDeadlineTimestamp(action.nowMs),
        },
        caseLogs: fresh.caseLogs,
        recommendations: fresh.recommendations,
        questionnaire: fresh.questionnaire,
        demographics: fresh.demographics,
      };
    }

    case "REHYDRATE":
      // Hasil pembacaan storage selalu dianggap "sudah diperiksa".
      return { ...action.state, storageChecked: true };

    case "SET_STEP": {
      if (state.status !== "running") return state; // input terkunci setelah expire/submit.
      return {
        ...state,
        // Monoton naik: alur satu arah, tidak pernah mundur.
        sessionData: {
          ...state.sessionData,
          currentStep: Math.max(state.sessionData.currentStep, action.step),
        },
      };
    }

    case "TICK": {
      if (state.status !== "running") return state;
      return {
        ...state,
        sessionData: {
          ...state.sessionData,
          globalTimeRemaining: remainingSeconds(state.sessionData.deadlineTimestamp, action.nowMs),
        },
      };
    }

    case "EXPIRE": {
      if (state.status !== "running") return state;
      return {
        ...state,
        status: "expired",
        sessionData: { ...state.sessionData, globalTimeRemaining: 0 },
      };
    }

    case "UPSERT_CASE_LOG": {
      if (state.status !== "running") return state;
      const index = state.caseLogs.findIndex((c) => c.caseId === action.caseLog.caseId);
      const caseLogs =
        index === -1
          ? [...state.caseLogs, action.caseLog]
          : state.caseLogs.map((c, i) => (i === index ? { ...c, ...action.caseLog } : c));
      return { ...state, caseLogs };
    }

    case "SAVE_CASE_DURATION": {
      // Durasi parsial tetap tersimpan saat "expired" (BETE-9); is_saved dan
      // rank tidak tersentuh. "idle"/"submitted" tetap menolak.
      if (state.status !== "running" && state.status !== "expired") return state;
      const durationIndex = state.caseLogs.findIndex((c) => c.caseId === action.caseId);
      const caseLogs =
        durationIndex === -1
          ? [
              ...state.caseLogs,
              { caseId: action.caseId, durationSeconds: action.durationSeconds, isSaved: false, rank: null },
            ]
          : state.caseLogs.map((c, i) =>
              i === durationIndex ? { ...c, durationSeconds: action.durationSeconds } : c,
            );
      return { ...state, caseLogs };
    }

    case "SET_RECOMMENDATIONS": {
      if (state.status !== "running") return state;
      return { ...state, recommendations: { ...state.recommendations, ...action.patch } };
    }

    case "SET_QUESTIONNAIRE": {
      if (state.status !== "running") return state;
      return { ...state, questionnaire: { ...state.questionnaire, ...action.patch } };
    }

    case "SET_DEMOGRAPHICS": {
      if (state.status !== "running") return state;
      return { ...state, demographics: { ...state.demographics, ...action.patch } };
    }

    case "MARK_SUBMITTED": {
      if (state.status !== "running" && state.status !== "expired") return state;
      return { ...state, status: "submitted" };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Persistensi (sessionStorage + localStorage) & rehidrasi
// ---------------------------------------------------------------------------

/** Subset API Storage yang dipakai; parameter disuntik agar bisa di-unit-test. */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * Simpan state ke SEMUA storage yang diberi (sessionStorage + localStorage).
 * Setelah submit final sukses, storage dibersihkan agar sesi berikutnya mulai
 * dari nol. Kegagalan kuota/private mode di satu storage tidak menggagalkan
 * storage lain (best-effort).
 */
export function persistState(state: ExperimentState, storages: StorageLike[]): void {
  if (state.status === "submitted") {
    clearPersistedState(storages);
    return;
  }
  const envelope = JSON.stringify({ version: PERSISTED_STATE_VERSION, state });
  for (const storage of storages) {
    try {
      storage.setItem(PERSISTENCE_KEY, envelope);
    } catch {
      // Abaikan: kuota penuh / storage dinonaktifkan — integritas data asli
      // tetap dijaga oleh snapshot yang tersimpan di storage yang berhasil.
    }
  }
}

export function clearPersistedState(storages: StorageLike[]): void {
  for (const storage of storages) {
    try {
      storage.removeItem(PERSISTENCE_KEY);
    } catch {
      // Abaikan dengan alasan yang sama seperti persistState.
    }
  }
}

/**
 * Baca ulang state: sessionStorage lebih dulu (data tab aktif paling segar),
 * lalu localStorage. Envelope yang rusak/beda versi dianggap tidak ada.
 * globalTimeRemaining TIDAK dipercaya dari storage — selalu dihitung ulang
 * dari deadlineTimestamp agar countdown tetap akurat setelah refresh.
 */
export function loadPersistedState(storages: StorageLike[], nowMs: number): ExperimentState | null {
  for (const storage of storages) {
    let raw: string | null = null;
    try {
      raw = storage.getItem(PERSISTENCE_KEY);
    } catch {
      continue;
    }
    if (raw === null) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      const state = parsePersistedEnvelope(parsed);
      if (state) return withRecomputedTime(state, nowMs);
    } catch {
      // JSON rusak → coba storage berikutnya.
    }
  }
  return null;
}

function withRecomputedTime(state: ExperimentState, nowMs: number): ExperimentState {
  return {
    ...state,
    sessionData: {
      ...state.sessionData,
      globalTimeRemaining: remainingSeconds(state.sessionData.deadlineTimestamp, nowMs),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Validasi struktural envelope hasil persistensi (tulisan kita sendiri).
 * Struktur tidak sesuai versi/shape → null (dianggap tidak ada data valid).
 */
function parsePersistedEnvelope(parsed: unknown): ExperimentState | null {
  if (!isRecord(parsed) || parsed["version"] !== PERSISTED_STATE_VERSION) return null;
  const state = parsed["state"];
  if (!isRecord(state)) return null;
  const { status, sessionData, caseLogs, recommendations, questionnaire, demographics } = state;
  if (
    typeof status !== "string" ||
    !isExperimentStatus(status) ||
    !isRecord(sessionData) ||
    !Array.isArray(caseLogs) ||
    !isRecord(recommendations) ||
    !isRecord(questionnaire) ||
    !isRecord(demographics)
  ) {
    return null;
  }
  const { participantId, treatmentGroupId, globalTimeRemaining, currentStep, deadlineTimestamp } =
    sessionData;
  if (
    typeof currentStep !== "number" ||
    typeof globalTimeRemaining !== "number" ||
    (participantId !== null && typeof participantId !== "string") ||
    (treatmentGroupId !== null && typeof treatmentGroupId !== "number") ||
    (deadlineTimestamp !== null && typeof deadlineTimestamp !== "number")
  ) {
    return null;
  }
  return {
    status,
    // State yang berhasil dibaca dari storage pasti berasal dari klien yang
    // sudah memeriksa storage — tandai agar guard langsung boleh bertindak.
    storageChecked: true,
    sessionData: {
      participantId,
      treatmentGroupId: treatmentGroupId as TreatmentGroupId | null,
      globalTimeRemaining,
      currentStep,
      deadlineTimestamp,
    },
    caseLogs: caseLogs.filter(isCaseLog),
    recommendations: recommendations as ExperimentState["recommendations"],
    questionnaire: questionnaire as ExperimentState["questionnaire"],
    demographics: demographics as ExperimentState["demographics"],
  };
}

function isExperimentStatus(value: string): value is ExperimentStatus {
  return value === "idle" || value === "running" || value === "expired" || value === "submitted";
}

function isCaseLog(value: unknown): value is CaseLog {
  return (
    isRecord(value) &&
    typeof value["caseId"] === "number" &&
    typeof value["durationSeconds"] === "number" &&
    typeof value["isSaved"] === "boolean" &&
    (value["rank"] === null || typeof value["rank"] === "number")
  );
}

// ---------------------------------------------------------------------------
// Payload submit
// ---------------------------------------------------------------------------

export type SubmitPayload = Pick<
  ExperimentState,
  "sessionData" | "caseLogs" | "recommendations" | "questionnaire" | "demographics"
> & { isComplete: boolean };

/**
 * Payload batch untuk POST /api/submit-survey: kelima slice state sesuai
 * dokumen arsitektur. `isComplete: false` dipakai auto-submit saat timer
 * habis (data tidak lengkap).
 */
export function buildSubmitPayload(
  state: ExperimentState,
  options: { isComplete: boolean },
): SubmitPayload {
  return {
    sessionData: state.sessionData,
    caseLogs: state.caseLogs,
    recommendations: state.recommendations,
    questionnaire: state.questionnaire,
    demographics: state.demographics,
    isComplete: options.isComplete,
  };
}
