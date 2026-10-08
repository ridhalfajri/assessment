import { z } from "zod";

/**
 * Kontrak payload POST /api/submit-survey (BETE-7).
 *
 * Bentuknya mengikuti payload JSON state di arsitektur (thread komentar
 * BETE-2) dan disimpan via RPC `submit_survey` (migrasi 0002). Validasi
 * ketat di sini = satu-satunya gerbang sebelum data menyentuh database.
 *
 * Catatan kontrak untuk frontend (BETE-6/BETE-10):
 *  - `caseLogs` harus berisi TEPAT 14 entri, caseId 1–14 masing-masing
 *    tepat sekali. Kasus yang tidak dibuka: durationSeconds 0, isSaved
 *    false, rank null.
 *  - `demographics.username` (dari login, BETE-8) dan
 *    `demographics.affiliation` (form demografi) wajib — kolom
 *    participants keduanya NOT NULL (skema BETE-5).
 *  - `sessionId` tidak ada di payload: identitas sesi diturunkan server
 *    dari participantId (UNIQUE(participant_id)), jadi submit ulang dengan
 *    state yang sama tidak akan menduplikasi baris.
 *  - `questionnaire.manipulationCheck` (Likert 1–5, BETE-14) WAJIB — bukan
 *    nullable — meski kolom `survey_results.manipulation_check` di DB sengaja
 *    NULL (baris lama/uji sebelum migrasi 0003). Alasan: instrumen inti riset
 *    yang harus terregistrasi pada tiap partisipan, gerbang Step 4
 *    (`isStep4GateSatisfied`) menjamin isian sebelum Step 5, dan perlakuannya
 *    konsisten dengan q1–q3 pada objek yang sama. Pelanggaran → 400.
 *
 * Ketat integritas eksperimen (BETE-13 audit):
 *  - `isComplete` (boolean, top-level, default `true`) — `false` HANYA dari
 *    auto-submit saat timer habis (GlobalTimer), agar sesi kadaluarsa
 *    terbedakan di kolom `sessions.is_completed` (migrasi 0004). Default
 *    `true` menjaga payload lama tetap kompatibel.
 *  - Konsistensi waktu: total durasi baca 14 kasus tidak boleh melebihi
 *    waktu sesi yang tersedia (2400 − globalTimeRemaining + toleransi).
 *    Pelanggaran → 400 (data mustahil: "timer penuh tapi kasus terbaca").
 */

/** No. HP Indonesia: 08xx / 62xx / +62xx, 9–13 digit (contoh 081234567890). */
const PHONE_REGEX = /^(?:\+62|62|0)8[1-9]\d{7,11}$/;

/** Jumlah total waktu eksperimen (40 menit) — batas atas sisa timer. */
const GLOBAL_TIMER_BUDGET_SECONDS = 2400;

/**
 * Toleransi konsistensi waktu (detik) antara total durasi baca kasus dan
 * waktu sesi yang tersedia: menutup pembulatan stopwatch/timer klien (ceil
 * detik, tick interval 1 dtk) dan latensi auto-submit di expiry. Jauh di
 * atas penyimpangan aliran wajar, jauh di bawah skala kecurangan.
 */
const TIMING_TOLERANCE_SECONDS = 60;

const caseLogSchema = z.object({
  caseId: z
    .number()
    .int()
    .min(1)
    .max(14)
    .describe("ID kasus acuan, 1–14"),
  durationSeconds: z
    .number()
    .int()
    .min(0)
    .max(86_400)
    .describe("Durasi stopwatch baca kasus dalam detik"),
  isSaved: z.boolean().describe("Jawaban sitasi Ya/Tidak untuk kasus ini"),
  rank: z
    .number()
    .int()
    .min(1)
    .max(14)
    .nullable()
    .optional()
    .describe("Peringkat prioritas 1–14; null jika belum diberi ranking"),
});

const phoneNumberSchema = z
  .string()
  .trim()
  .max(25)
  .transform((value) => value.replace(/[\s-]/g, ""))
  .refine((value) => PHONE_REGEX.test(value), {
    message:
      "Format No. HP Indonesia tidak valid (contoh: 081234567890 atau +6281234567890)",
  });

export const submitSurveyPayloadSchema = z.object({
  sessionData: z.object({
    participantId: z.uuid({
      message: "participantId harus UUID yang valid",
    }),
    treatmentGroupId: z
      .number()
      .int()
      .min(1)
      .max(4)
      .describe("Grup treatment hasil random assignment, 1–4"),
    globalTimeRemaining: z
      .number()
      .int()
      .min(0)
      .max(GLOBAL_TIMER_BUDGET_SECONDS)
      .describe("Sisa detik global timer saat submit (0–2400)"),
    currentStep: z
      .number()
      .int()
      .min(1)
      .max(6)
      .optional()
      .describe("Langkah UI saat submit; tidak disimpan ke database"),
  }),
  caseLogs: z
    .array(caseLogSchema)
    .length(14)
    .describe("Tepat 14 kasus, caseId 1–14 masing-masing tepat sekali")
    .refine(
      (logs) => new Set(logs.map((log) => log.caseId)).size === logs.length,
      {
        message:
          "caseLogs harus memuat caseId 1–14 masing-masing tepat sekali",
      },
    )
    .refine(
      (logs) => {
        const ranks = logs.flatMap((log) => (log.rank == null ? [] : [log.rank]));
        return new Set(ranks).size === ranks.length;
      },
      {
        message: "rank_assigned harus unik (satu peringkat 1–14 hanya untuk satu kasus)",
      },
    ),
  recommendations: z.object({
    knowHowFee: z.number().int().min(0).describe("Jasa konsultasi (Rp)"),
    entertainment: z.number().int().min(0).describe("Entertainment (Rp)"),
    maintenance: z.number().int().min(0).describe("Perbaikan (Rp)"),
    marketing: z.number().int().min(0).describe("Pemasaran (Rp)"),
    confidenceLevel: z
      .number()
      .int()
      .min(0)
      .max(100)
      .describe("Tingkat keyakinan slider 0–100%"),
  }),
  questionnaire: z.object({
    q1: z.string().trim().min(1).max(1000),
    q2: z.string().trim().min(1).max(1000),
    q3: z.string().trim().min(1).max(1000),
    // Wajib (bukan nullable) — kolom DB NULL hanya untuk baris lama/uji;
    // keputusan lengkap di catatan kontrak header file (BETE-14).
    manipulationCheck: z
      .number()
      .int()
      .min(1)
      .max(5)
      .describe("Manipulation check, skala Likert 1–5"),
  }),
  demographics: z.object({
    username: z.string().trim().min(1).max(100),
    age: z.number().int().min(10).max(120),
    gender: z.string().trim().min(1).max(50),
    education: z.string().trim().min(1).max(100),
    affiliation: z.string().trim().min(1).max(200),
    phoneNumber: phoneNumberSchema,
  }),
  isComplete: z
    .boolean()
    .default(true)
    .describe("False hanya dari auto-submit saat timer habis (migrasi 0004)"),
})
  .refine(
    (payload) => {
      const elapsed = GLOBAL_TIMER_BUDGET_SECONDS - payload.sessionData.globalTimeRemaining;
      const readTotal = payload.caseLogs.reduce((sum, log) => sum + log.durationSeconds, 0);
      return readTotal <= elapsed + TIMING_TOLERANCE_SECONDS;
    },
    {
      message:
        "Total durasi baca kasus melebihi waktu sesi yang tersedia (data tidak mungkin).",
      path: ["caseLogs"],
    },
  );

export type SubmitSurveyPayload = z.infer<typeof submitSurveyPayloadSchema>;
