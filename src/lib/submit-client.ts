/**
 * Klien submit batch (BETE-10): menyiapkan payload state sesuai kontrak ketat
 * API `/api/submit-survey` (zod di src/lib/submit-survey.ts), mengirimnya, dan
 * memetakan hasilnya untuk UI. Satu sumber logika untuk tombol final Step 5
 * dan auto-submit saat timer habis (GlobalTimer) — keduanya wajib menghasilkan
 * payload yang identik bentuknya.
 *
 * Kontrak yang wajib dipenuhi payload (lihat src/lib/submit-survey.ts):
 *  - caseLogs TEPAT 14 entri, caseId 1–14 masing-masing tepat sekali. Kasus
 *    yang tidak dibuka: durationSeconds 0, isSaved false, rank null.
 *  - Semua field recommendations/questionnaire/demographics terisi (kolom DB
 *    NOT NULL) — likert manipulationCheck ikut dikirim walau skema API saat
 *    ini masih men-strip-nya (kolom DB menyusul; lihat catatan di issue).
 *  - globalTimeRemaining (0–2400) ikut dalam sessionData → tersimpan sebagai
 *    sessions.global_remaining_seconds di server.
 *
 * Idempotensi: participantId yang sama → server menjawab 200
 * `already_submitted` tanpa menduplikasi baris, jadi retry/double-click aman.
 */

import { submitSurveyPayloadSchema } from "@/lib/submit-survey";
import {
  buildSubmitPayload,
  type CaseLog,
  type ExperimentState,
} from "@/lib/experiment";

/** Jumlah kasus acuan yang wajib ada di payload (harus sama dengan skema API). */
export const PAYLOAD_CASE_COUNT = 14;

export type SubmitOutcome = {
  status: "created" | "already_submitted";
  sessionId?: string;
  participantId?: string;
};

/** Error ramah-UI dari postSubmitSurvey; `details` berisi path zod (400). */
export class SubmitRequestError extends Error {
  readonly details: { path: string; message: string }[];

  constructor(message: string, details: { path: string; message: string }[] = []) {
    super(message);
    this.name = "SubmitRequestError";
    this.details = details;
  }
}

/**
 * Lengkapi caseLogs menjadi TEPAT 14 entri (caseId 1–14, terurut): kasus yang
 * belum dibuka diisi { durationSeconds: 0, isSaved: false, rank: null } sesuai
 * kontrak API. Reducer menjamin tak ada duplikat caseId, tapi fungsi ini tetap
 * dedupe defensif (entri pertama yang menang).
 */
export function normalizeCaseLogs(caseLogs: CaseLog[]): CaseLog[] {
  const byId = new Map<number, CaseLog>();
  for (const log of caseLogs) {
    if (!byId.has(log.caseId)) byId.set(log.caseId, log);
  }
  return Array.from({ length: PAYLOAD_CASE_COUNT }, (_, index) => {
    const caseId = index + 1;
    return byId.get(caseId) ?? { caseId, durationSeconds: 0, isSaved: false, rank: null };
  });
}

/**
 * Bentuk request lengkap untuk POST /api/submit-survey dari state eksperimen:
 * payload arsitektur (buildSubmitPayload) + caseLogs ternormalisasi 14 entri.
 * Field manipulationCheck (Likert) ikut dikirim; skema API saat ini men-strip
 * field tambahan secara diam — data tidak hilang dari state klien dan sudah
 * siap saat backend menambah kolomnya.
 */
export function buildSubmitRequest(
  state: ExperimentState,
  options: { isComplete: boolean },
): ReturnType<typeof buildSubmitPayload> {
  const payload = buildSubmitPayload(state, options);
  return { ...payload, caseLogs: normalizeCaseLogs(payload.caseLogs) };
}

/**
 * Pre-validasi klien memakai skema zod yang SAMA dengan server (satu sumber
 * kebenaran, tanpa duplikasi aturan). Dipakai untuk:
 *  - memutuskan auto-submit timer: state belum layak simpan → jangan kirim
 *    (menghindari 400 pasti dan menghindari mengarang data riset);
 *  - pengaman terakhir sebelum tombol final mengirim.
 */
export function isPayloadValid(state: ExperimentState): boolean {
  return submitSurveyPayloadSchema.safeParse(buildSubmitRequest(state, { isComplete: false }))
    .success;
}

/**
 * Kirim payload ke /api/submit-survey. Melempar SubmitRequestError dengan
 * pesan Indonesia yang siap ditampilkan untuk 400/500/jaringan; sukses
 * (created maupun already_submitted) mengembalikan SubmitOutcome.
 */
export async function postSubmitSurvey(payload: unknown): Promise<SubmitOutcome> {
  let response: Response;
  try {
    response = await fetch("/api/submit-survey", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new SubmitRequestError(
      "Koneksi ke server gagal. Periksa jaringan Anda, lalu coba lagi.",
    );
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Body non-JSON diperlakukan sebagai kegagalan generik di bawah.
  }

  if (response.ok) {
    const status = (body as SubmitOutcome | null)?.status;
    if (status === "created" || status === "already_submitted") {
      return body as SubmitOutcome;
    }
    throw new SubmitRequestError("Respons server tidak dikenali. Coba lagi.");
  }

  if (response.status === 400) {
    const details = (body as { details?: { path: string; message: string }[] } | null)?.details;
    throw new SubmitRequestError(
      "Data yang dikirim tidak valid. Pastikan semua isian lengkap, lalu coba lagi.",
      Array.isArray(details) ? details : [],
    );
  }
  throw new SubmitRequestError(
    "Server gagal menyimpan data. Data Anda masih tersimpan di halaman ini — coba lagi.",
  );
}

// ---------------------------------------------------------------------------
// Gerbang kelengkapan per langkah (murni, teruji)
// ---------------------------------------------------------------------------

/** Step 3 selesai: keempat nilai biaya terisi non-negatif + keyakinan terisi. */
export function isStep3GateSatisfied(recommendations: ExperimentState["recommendations"]): boolean {
  const fees = [
    recommendations.knowHowFee,
    recommendations.entertainment,
    recommendations.maintenance,
    recommendations.marketing,
  ];
  return fees.every((fee) => typeof fee === "number" && Number.isInteger(fee) && fee >= 0) &&
    typeof recommendations.confidenceLevel === "number" &&
    recommendations.confidenceLevel >= 0 &&
    recommendations.confidenceLevel <= 100;
}

/** Step 4 selesai: q1–q3 terjawab + manipulation check (Likert 1–5) terisi. */
export function isStep4GateSatisfied(questionnaire: ExperimentState["questionnaire"]): boolean {
  const answers = [questionnaire.q1, questionnaire.q2, questionnaire.q3];
  return answers.every((answer) => typeof answer === "string" && answer.trim().length > 0) &&
    typeof questionnaire.manipulationCheck === "number" &&
    Number.isInteger(questionnaire.manipulationCheck) &&
    questionnaire.manipulationCheck >= 1 &&
    questionnaire.manipulationCheck <= 5;
}

export type DemographicsFieldErrors = Partial<
  Record<"age" | "gender" | "education" | "affiliation" | "phoneNumber", string>
>;

const DEMOGRAPHICS_SCHEMA = submitSurveyPayloadSchema.shape.demographics;

/**
 * Validasi per-field demografi dengan ATURAN YANG SAMA dengan API (sub-skema
 * zod kontrak dipakai langsung — tanpa duplikasi regex/range). Return objek
 * pesan per field yang gagal; kosong = semua valid.
 */
export function getDemographicsFieldErrors(
  demographics: ExperimentState["demographics"],
): DemographicsFieldErrors {
  const errors: DemographicsFieldErrors = {};
  const age = demographics.age;
  if (age === null) {
    errors.age = "Usia wajib diisi.";
  } else if (!DEMOGRAPHICS_SCHEMA.shape.age.safeParse(age).success) {
    errors.age = "Usia harus angka bulat 10–120.";
  }
  if (!DEMOGRAPHICS_SCHEMA.shape.gender.safeParse(demographics.gender ?? "").success) {
    errors.gender = "Pilih jenis kelamin.";
  }
  if (!DEMOGRAPHICS_SCHEMA.shape.education.safeParse(demographics.education ?? "").success) {
    errors.education = "Pilih tingkat pendidikan terakhir.";
  }
  if (!DEMOGRAPHICS_SCHEMA.shape.affiliation.safeParse(demographics.affiliation ?? "").success) {
    errors.affiliation = "Afiliasi wajib diisi (maks. 200 karakter).";
  }
  if (demographics.phoneNumber === null) {
    errors.phoneNumber = "No. HP wajib diisi untuk pengiriman insentif pulsa.";
  } else if (!DEMOGRAPHICS_SCHEMA.shape.phoneNumber.safeParse(demographics.phoneNumber).success) {
    errors.phoneNumber =
      "Format No. HP Indonesia tidak valid (contoh: 081234567890 atau +6281234567890).";
  }
  return errors;
}
