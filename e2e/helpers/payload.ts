/**
 * Helper payload API BETE-11 — payload valid sesuai kontrak
 * POST /api/submit-survey (zod di src/lib/submit-survey.ts), independen dari
 * implementasi frontend (dibangun dari kontrak di README + migrasi DB).
 * Dipakai untuk uji idempotensi & payload tampered via HTTP langsung.
 */
import { randomUUID } from "node:crypto";

export type ApiPayload = {
  sessionData: { participantId: string; treatmentGroupId: number; globalTimeRemaining: number; currentStep: number };
  caseLogs: { caseId: number; durationSeconds: number; isSaved: boolean; rank: number | null }[];
  recommendations: { knowHowFee: number; entertainment: number; maintenance: number; marketing: number; confidenceLevel: number };
  questionnaire: { q1: string; q2: string; q3: string; manipulationCheck: number };
  demographics: { username: string; age: number; gender: string; education: string; affiliation: string; phoneNumber: string };
  isComplete: boolean;
};

export function buildValidPayload(username: string, overrides: Partial<ApiPayload> = {}): ApiPayload {
  const caseLogs = Array.from({ length: 14 }, (_, i) => ({
    caseId: i + 1,
    durationSeconds: (i + 1) * 3,
    isSaved: (i + 1) % 3 !== 0,
    rank: i + 1,
  }));
  return {
    sessionData: {
      participantId: randomUUID(),
      treatmentGroupId: 2,
      globalTimeRemaining: 1500,
      currentStep: 5,
    },
    caseLogs,
    recommendations: {
      knowHowFee: 250_000_000,
      entertainment: 150_000_000,
      maintenance: 300_000_000,
      marketing: 125_000_000,
      confidenceLevel: 70,
    },
    questionnaire: { q1: "opsi-a", q2: "opsi-a", q3: "opsi-a", manipulationCheck: 3 },
    demographics: {
      username,
      age: 29,
      gender: "Perempuan",
      education: "S2",
      affiliation: "KAP QA E2E",
      phoneNumber: "081234567890",
    },
    isComplete: true,
    ...overrides,
  };
}

/** POST /api/submit-survey pada aplikasi yang diuji. */
export async function postSubmit(
  request: import("@playwright/test").APIRequestContext,
  payload: unknown,
): Promise<{ status: number; body: unknown }> {
  const res = await request.post("/api/submit-survey", {
    data: typeof payload === "string" ? payload : (payload as object),
    headers: typeof payload === "string" ? { "content-type": "application/json" } : undefined,
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status(), body };
}
