/**
 * BETE-11 Tugas 2 — Integritas pencatatan durasi per kasus (Step 2):
 *   - presisi detik (durasi tersimpan ≈ durasi dinding modal terbuka),
 *   - akumulasi saat modal dibuka ulang (kumulatif),
 *   - tahan refresh: durasi parsial tersimpan via write-through persistence.
 */
import { expect, test } from "@playwright/test";
import {
  loginAndConsent,
  openAndCloseCase,
  readCardDurationSeconds,
  readExperimentState,
  stubTreatmentGroup,
} from "../helpers/flow";

test("durasi per kasus presisi detik, kumulatif saat reopen, dan tahan refresh", async ({ page }) => {
  test.setTimeout(120_000);
  await stubTreatmentGroup(page, 1);
  await loginAndConsent(page, `qa_dur_${Date.now().toString(36)}`);
  await page.click('a:has-text("Lanjut ke Pencarian Kasus")');
  await page.waitForURL("**/step-2-cases");

  // --- Buka pertama: ~2,3 detik → durasi tersimpan 2 detik (±1) ---
  const t0 = Date.now();
  await openAndCloseCase(page, 1, 2_300);
  const wallElapsedFirst = Math.floor((Date.now() - t0) / 1000);
  const first = await readCardDurationSeconds(page, 1);
  expect(Math.abs(first - wallElapsedFirst)).toBeLessThanOrEqual(1);
  expect(first).toBeGreaterThanOrEqual(2);

  // --- Reopen: durasi KUMULATIF (bukan ditimpa) ---
  const t1 = Date.now();
  await openAndCloseCase(page, 1, 1_300);
  const wallElapsedSecond = Math.floor((Date.now() - t1) / 1000);
  const cumulative = await readCardDurationSeconds(page, 1);
  expect(cumulative).toBeGreaterThanOrEqual(first + wallElapsedSecond - 1);
  expect(cumulative).toBeLessThanOrEqual(first + wallElapsedSecond + 1);

  // --- State persisten berisi nilai yang sama ---
  const state = await readExperimentState(page);
  const log1 = state?.caseLogs.find((c) => c.caseId === 1);
  expect(log1?.durationSeconds).toBe(cumulative);

  // --- Refresh: durasi parsial tidak hilang ---
  await page.reload();
  await expect(page.locator('[data-testid="global-timer"]')).toBeVisible();
  const afterReload = await readCardDurationSeconds(page, 1);
  expect(Math.abs(afterReload - cumulative)).toBeLessThanOrEqual(1);

  // --- Refresh SAAT modal terbuka: durasi parsial ikut tersimpan ---
  await page.locator("article", { has: page.locator("#case-card-2") })
    .locator('button:has-text("Buka Detail Kasus")').click();
  await expect(page.locator('[data-testid="case-modal-2"]')).toBeVisible();
  await page.waitForTimeout(2_200);
  await page.reload();
  await expect(page.locator('[data-testid="global-timer"]')).toBeVisible();
  const case2 = await readCardDurationSeconds(page, 2);
  expect(case2).toBeGreaterThanOrEqual(2);

  // --- Presisi integer & non-negatif di state untuk semua log ---
  const stateAfter = await readExperimentState(page);
  for (const log of stateAfter?.caseLogs ?? []) {
    expect(Number.isInteger(log.durationSeconds)).toBe(true);
    expect(log.durationSeconds).toBeGreaterThanOrEqual(0);
  }
});
