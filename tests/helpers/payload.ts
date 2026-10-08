import type { SubmitSurveyPayload } from "@/lib/submit-survey";

/** Payload valid lengkap: 14 kasus, ranking 1–14 unik, data demografi utuh. */
export function buildValidPayload(): SubmitSurveyPayload {
  return {
    sessionData: {
      participantId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
      treatmentGroupId: 2,
      globalTimeRemaining: 1_725,
      currentStep: 5,
    },
    caseLogs: Array.from({ length: 14 }, (_, i) => ({
      caseId: i + 1,
      durationSeconds: 45 - i,
      isSaved: i % 2 === 0,
      rank: i + 1,
    })),
    recommendations: {
      knowHowFee: 250_000_000,
      entertainment: 150_000_000,
      maintenance: 300_000_000,
      marketing: 125_000_000,
      confidenceLevel: 85,
    },
    questionnaire: {
      q1: "Pasal 6 dan 9 UU PPh",
      q2: "Terdapat hubungan istimewa",
      q3: "Semua biaya entertainment yang dilengkapi daftar nominatif",
      manipulationCheck: 4,
    },
    demographics: {
      username: "partisipan_01",
      age: 28,
      gender: "Laki-laki",
      education: "S1",
      affiliation: "KAP Sejahtera",
      phoneNumber: "081234567890",
    },
    isComplete: true,
  };
}

/** Varian payload valid dengan sebagian kasus belum diranking (auto-submit). */
export function buildPartialRankPayload(): SubmitSurveyPayload {
  const payload = buildValidPayload();
  for (const log of payload.caseLogs) {
    if (log.caseId > 8) log.rank = null;
  }
  return payload;
}
