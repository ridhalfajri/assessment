/**
 * BETE-11 Tugas 2 — Distribusi random assignment:
 *   jalankan N sesi login baru (TANPA stub — Math.random asli aplikasi),
 *   kumpulkan treatmentGroupId hasil assignment, pastikan keempat grup 1–4
 *   muncul dan tidak ada nilai di luar 1–4.
 */
import { expect, test } from "@playwright/test";
import { readExperimentState } from "../helpers/flow";

const RUNS = 16;

test("random assignment menghasilkan distribusi grup 1–4 (semua grup muncul)", async ({ browser }) => {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (let run = 0; run < RUNS; run += 1) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/");
    await page.fill("#username", `qa_rand_${run}_${Date.now().toString(36)}`);
    await page.check("#consent-agree");
    await Promise.all([
      page.waitForURL("**/step-1-scenario"),
      page.locator('form button[type="submit"]').click(),
    ]);
    await page.waitForSelector('[data-testid="global-timer"]');
    const state = await readExperimentState(page);
    const group = state?.sessionData.treatmentGroupId ?? -1;
    expect([1, 2, 3, 4]).toContain(group);
    counts[group] += 1;
    await context.close();
  }
  // Semua grup 1–4 muncul dalam N run.
  for (const group of [1, 2, 3, 4]) {
    expect(counts[group], `grup ${group} muncul minimal 1× dari ${RUNS} run`).toBeGreaterThanOrEqual(1);
  }
  console.log("[random-assignment] distribusi:", JSON.stringify(counts));
});
