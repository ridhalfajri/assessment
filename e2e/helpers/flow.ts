/**
 * Helper alur E2E BETE11 — pemilihan elemen + langkah alur lengkap.
 *
 * Determinisme grup treatment: aplikasi memanggil assignTreatmentGroup()
 * (default rng = Math.random) TEPAT SEKALI saat consent disetujui. Suite
 * men-stub Math.random via addInitScript (berlaku sebelum skrip aplikasi,
 * pada setiap navigasi) sehingga grup hasil assignment deterministik per tes:
 *   seed 0.125 → grup 1, 0.375 → 2, 0.625 → 3, 0.875 → 4.
 * Ini adalah stub level browser (bukan override internal aplikasi) sehingga
 * build produksi yang diuji tetap identik dengan yang dirilis.
 */
import { expect, type Page } from "@playwright/test";

export type TreatmentGroup = 1 | 2 | 3 | 4;

export const GROUP_SEEDS: Record<TreatmentGroup, number> = { 1: 0.125, 2: 0.375, 3: 0.625, 4: 0.875 };

/** Penanda teks unik per kondisi matriks 2×2 (konten placeholder BETE-8). */
export const CONDITION_MARKERS = {
  implicitClient: "sangat diperhatikan dan dievaluasi",
  explicitClient: "konsisten dengan draft usulan",
  weakMemo: "diperbolehkan anonim",
  strongMemo: "harus mencantumkan nama dan email",
} as const;

export const GROUP_CONDITIONS: Record<TreatmentGroup, { client: string; memo: string }> = {
  1: { client: CONDITION_MARKERS.implicitClient, memo: CONDITION_MARKERS.weakMemo },
  2: { client: CONDITION_MARKERS.explicitClient, memo: CONDITION_MARKERS.weakMemo },
  3: { client: CONDITION_MARKERS.implicitClient, memo: CONDITION_MARKERS.strongMemo },
  4: { client: CONDITION_MARKERS.explicitClient, memo: CONDITION_MARKERS.strongMemo },
};

/** Pasang stub Math.random → grup treatment deterministik pada submit consent. */
export async function stubTreatmentGroup(page: Page, group: TreatmentGroup): Promise<void> {
  await page.addInitScript(`Math.random = () => ${GROUP_SEEDS[group]};`);
}

/** Baca state eksperimen dari storage yang dipersist aplikasi (localStorage). */
export async function readExperimentState(page: Page): Promise<{
  status: string;
  sessionData: { participantId: string | null; treatmentGroupId: number | null; globalTimeRemaining: number; currentStep: number; deadlineTimestamp: number | null };
  caseLogs: { caseId: number; durationSeconds: number; isSaved: boolean; rank: number | null }[];
  recommendations: Record<string, number | null>;
  questionnaire: Record<string, string | number | null>;
  demographics: Record<string, string | number | null>;
} | null> {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem("experiment.state.v1");
    if (!raw) return null;
    const envelope = JSON.parse(raw) as { state: unknown };
    return envelope.state as never;
  });
}

/** Login + informed consent → mendarat di /step-1-scenario (timer tampil). */
export async function loginAndConsent(page: Page, username: string): Promise<void> {
  await page.goto("/");
  await page.fill("#username", username);
  await page.check("#consent-agree");
  await Promise.all([
    page.waitForURL("**/step-1-scenario"),
    page.locator('form button[type="submit"]').click(),
  ]);
  await expect(page.locator('[data-testid="global-timer"]')).toBeVisible();
}

/** Buka modal kasus, tunggu `openMs`, tutup (stopwatch tersimpan saat tutup). */
export async function openAndCloseCase(page: Page, caseId: number, openMs: number): Promise<void> {
  const card = page.locator("article", { has: page.locator(`#case-card-${caseId}`) });
  await card.locator('button:has-text("Buka Detail Kasus")').click();
  const modal = page.locator(`[data-testid="case-modal-${caseId}"]`);
  await expect(modal).toBeVisible();
  await page.waitForTimeout(openMs);
  await modal.locator('button:has-text("Tutup Kasus")').click();
  await expect(modal).toBeHidden();
}

/** Baca durasi tersimpan satu kasus (detik) dari kartu (badge mm:ss). */
export async function readCardDurationSeconds(page: Page, caseId: number): Promise<number> {
  const badge = page.locator(`[data-testid="case-duration-${caseId}"]`);
  const text = (await badge.textContent()) ?? "00:00";
  const [m, s] = text.trim().split(":").map(Number);
  return m * 60 + s;
}

export type Step2Options = {
  /** Peringkat per kasus (default: rank = caseId). */
  rankFor?: (caseId: number) => number;
  /** Sitasi per kasus (default: Ya untuk caseId genap). */
  isSavedFor?: (caseId: number) => boolean;
  /** Lama modal dibuka per kasus ms (default 250 → durasi tercatat 0 detik). */
  openMsFor?: (caseId: number) => number;
  /** Hanya sebagian kasus dikerjakan (untuk uji gerbang/duplikat). */
  onlyCases?: number[];
};

/**
 * Kerjakan Step 2: buka tiap modal (merekam durasi), centang sitasi, pilih
 * peringkat unik. Default lengkap 14 kasus.
 */
export async function completeStep2(page: Page, options: Step2Options = {}): Promise<void> {
  const rankFor = options.rankFor ?? ((caseId: number) => caseId);
  const isSavedFor = options.isSavedFor ?? ((caseId: number) => caseId % 2 === 0);
  const openMsFor = options.openMsFor ?? (() => 250);
  const cases = options.onlyCases ?? Array.from({ length: 14 }, (_, i) => i + 1);
  for (const caseId of cases) {
    await openAndCloseCase(page, caseId, openMsFor(caseId));
    const card = page.locator("article", { has: page.locator(`#case-card-${caseId}`) });
    if (isSavedFor(caseId)) await card.locator('input[type="checkbox"]').check();
    await card.locator("select").selectOption(String(rankFor(caseId)));
  }
}

export type Fees = { knowHowFee: number; entertainment: number; maintenance: number; marketing: number };

export const DEFAULT_FEES: Fees = {
  knowHowFee: 350_000_000,
  entertainment: 200_000_000,
  maintenance: 250_000_000,
  marketing: 100_000_000,
};

/** Set input[type=range] React-controlled (fill() tidak didukung untuk range). */
export async function setConfidenceSlider(page: Page, value: number): Promise<void> {
  await page.locator("#confidence-slider").evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("HTMLInputElement value setter tidak tersedia");
    setter.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
  await expect(page.locator('[data-testid="step3-confidence-value"]')).toHaveText(`${value}%`);
}

/** Step 3: isi 4 input biaya + slider keyakinan, lanjut ke kuesioner. */
export async function completeStep3(
  page: Page,
  fees: Fees = DEFAULT_FEES,
  confidence = 80,
): Promise<void> {
  await page.fill("#fee-knowHowFee", String(fees.knowHowFee));
  await page.fill("#fee-entertainment", String(fees.entertainment));
  await page.fill("#fee-maintenance", String(fees.maintenance));
  await page.fill("#fee-marketing", String(fees.marketing));
  await setConfidenceSlider(page, confidence);
  await page.click('a:has-text("Lanjut ke Kuesioner")');
  await page.waitForURL("**/step-4-quiz");
}

export type QuizAnswers = { q1: string; q2: string; q3: string; manipulationCheck: number };

/**
 * Step 4: jawab 3 pilihan ganda (opsi pertama) + Likert manipulation check.
 * Mengembalikan teks opsi yang dipilih (untuk assert DB q1–q3).
 */
export async function completeStep4(
  page: Page,
  likert = 4,
): Promise<QuizAnswers> {
  const answers: QuizAnswers = { q1: "", q2: "", q3: "", manipulationCheck: likert };
  for (const q of ["q1", "q2", "q3"] as const) {
    await page.locator(`input[name="quiz-${q}"]`).first().check();
    answers[q] = ((await page
      .locator(`label:has(input[name="quiz-${q}"]:checked)`)
      .textContent()) ?? "").trim();
  }
  await page.locator('input[name="likert-manipulationCheck"]').nth(likert - 1).check();
  await page.click('a:has-text("Lanjut ke Demografi")');
  await page.waitForURL("**/step-5-demographics");
  return answers;
}

export type Demographics = {
  age: number;
  gender: string;
  education: string;
  affiliation: string;
  phoneNumber: string;
};

/** Step 5: isi demografi + submit batch → /debriefing. */
export async function completeStep5AndSubmit(
  page: Page,
  demo: Demographics,
): Promise<void> {
  await page.fill("#demo-age", String(demo.age));
  await page.selectOption("#demo-gender", { label: demo.gender });
  await page.selectOption("#demo-education", { label: demo.education });
  await page.fill("#demo-affiliation", demo.affiliation);
  await page.fill("#demo-phone", demo.phoneNumber);
  await Promise.all([
    page.waitForURL("**/debriefing"),
    page.locator('[data-testid="step5-submit"]').click(),
  ]);
}

export const DEFAULT_DEMO: Omit<Demographics, "affiliation" | "phoneNumber"> = {
  age: 30,
  gender: "Laki-laki",
  education: "S1",
};

/** Selipkan deadline ke masa lalu di storage, lalu reload SEGERA (satu blok
 * sinkron, tanpa jeda — mencegah write-through aplikasi menimpa perubahan). */
export async function expireTimerAndReload(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const storage of [window.sessionStorage, window.localStorage]) {
      const raw = storage.getItem("experiment.state.v1");
      if (!raw) continue;
      const envelope = JSON.parse(raw) as { state: { sessionData: { deadlineTimestamp: number } } };
      envelope.state.sessionData.deadlineTimestamp = Date.now() - 1000;
      storage.setItem("experiment.state.v1", JSON.stringify(envelope));
    }
    location.reload();
  });
}
