/**
 * BETE-11 Tugas 2 — Global timer 40 menit:
 *   - tampil & berjalan lintas semua step,
 *   - tahan refresh (deadline absolut: deadlineTimestamp tidak berubah,
 *     sisa waktu TIDAK direset ke 40:00),
 *   - perilaku saat habis: input terkunci, auto-submit data terisi (best-
 *     effort), global_remaining_seconds=0 di DB, partisipan ke debriefing.
 */
import { expect, test } from "@playwright/test";
import { dbQuery } from "../helpers/db";
import {
  completeStep2,
  completeStep3,
  completeStep4,
  expireTimerAndReload,
  loginAndConsent,
  readExperimentState,
  stubTreatmentGroup,
} from "../helpers/flow";

async function parseTimer(page: import("@playwright/test").Page): Promise<number> {
  const text = (await page.locator('[data-testid="global-timer"]').textContent()) ?? "";
  const [m, s] = text.trim().split(":").map(Number);
  expect(m).not.toBeNaN();
  return m * 60 + s;
}

test("timer berjalan lintas step dan tahan refresh (deadline absolut)", async ({ page }) => {
  await stubTreatmentGroup(page, 2);
  await loginAndConsent(page, `qa_timer_${Date.now().toString(36)}`);

  const atStep1 = await parseTimer(page);
  expect(atStep1).toBeLessThanOrEqual(2400);
  expect(atStep1).toBeGreaterThanOrEqual(2397); // belum lama berjalan

  // Lintas step: sisa waktu terus berkurang (bukan reset per halaman).
  await page.click('a:has-text("Lanjut ke Pencarian Kasus")');
  await page.waitForURL("**/step-2-cases");
  const atStep2 = await parseTimer(page);
  expect(atStep2).toBeLessThanOrEqual(atStep1);
  expect(page.locator('[data-testid="global-timer"]')).toBeVisible();

  // Deadline absolut: deadlineTimestamp di storage TIDAK berubah setelah reload,
  // dan sisa waktu dilanjutkan (tidak direset ke 40:00).
  const before = await readExperimentState(page);
  expect(before?.sessionData.deadlineTimestamp).not.toBeNull();
  await page.waitForTimeout(2_000);
  await page.reload();
  await expect(page.locator('[data-testid="global-timer"]')).toBeVisible();
  const after = await readExperimentState(page);
  expect(after?.sessionData.deadlineTimestamp).toBe(before?.sessionData.deadlineTimestamp);
  const afterReload = await parseTimer(page);
  expect(afterReload).toBeLessThan(atStep2); // melanjutkan hitungan, bukan reset
  expect(afterReload).toBeLessThanOrEqual(atStep2 - 1);

  // Terus berkurang setelah reload (bukan beku).
  await page.waitForTimeout(2_100);
  const laterAgain = await parseTimer(page);
  expect(laterAgain).toBeLessThan(afterReload);
});

test("timer habis → auto-submit data terisi, DB tercatat (remaining=0), ke debriefing", async ({ page }) => {
  test.setTimeout(180_000);
  const username = `qa_expire_${Date.now().toString(36)}`;
  await stubTreatmentGroup(page, 3);
  await loginAndConsent(page, username);

  // Isi seluruh alur sampai Step 5 (tanpa submit manual).
  await page.click('a:has-text("Lanjut ke Pencarian Kasus")');
  await page.waitForURL("**/step-2-cases");
  await completeStep2(page);
  await page.click('a:has-text("Lanjut ke Form Rekomendasi")');
  await page.waitForURL("**/step-3-form");
  await completeStep3(page);
  await completeStep4(page, 5);
  await page.fill("#demo-age", "31");
  await page.selectOption("#demo-gender", { label: "Perempuan" });
  await page.selectOption("#demo-education", { label: "S2" });
  await page.fill("#demo-affiliation", "PT Expired Test");
  await page.fill("#demo-phone", "081298761111");

  // Geser deadline absolut ke masa lalu + reload sinkron → 00:00.
  await expireTimerAndReload(page);
  await page.waitForURL("**/debriefing", { timeout: 60_000 });
  await expect(page.locator("h1").first()).toContainText(/Terima kasih/i); // halaman debriefing

  // DB: sesi tersimpan via auto-submit dengan sisa waktu 0.
  const session = (
    await dbQuery<{ id: string; is_completed: boolean; global_remaining_seconds: number | null }>(
      `select s.id, s.is_completed, s.global_remaining_seconds from public.sessions s
       join public.participants p on p.id = s.participant_id where p.username = $1`,
      [username],
    )
  )[0];
  expect(session).toBeDefined();
  // BETE-13: auto-submit saat timer habis mengirim isComplete:false — sesi
  // kadaluarsa terbedakan di kolom is_completed (migrasi 0004).
  expect(session.is_completed).toBe(false);
  expect(session.global_remaining_seconds).toBe(0);

  const caseLogs = await dbQuery<{ n: number }>(
    "select count(*)::int as n from public.case_logs where session_id = $1",
    [session.id],
  );
  expect(caseLogs[0].n).toBe(14);
  const survey = await dbQuery<{ manipulation_check: number | null }>(
    "select manipulation_check from public.survey_results where session_id = $1",
    [session.id],
  );
  expect(survey[0].manipulation_check).toBe(5);

  // Storage dibersihkan setelah submit (tidak ada sesi untuk dilanjutkan).
  const state = await readExperimentState(page);
  expect(state === null || state.status === "idle").toBe(true);
});
