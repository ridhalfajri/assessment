/**
 * BETE-11 Tugas 4 — Responsivitas: alur penuh pada viewport ponsel
 * (390×844, sentuh) — partisipan kemungkinan besar mengisi via HP.
 */
import { expect, test } from "@playwright/test";
import { dbQuery } from "../helpers/db";
import {
  CONDITION_MARKERS,
  GROUP_CONDITIONS,
  completeStep2,
  completeStep3,
  completeStep4,
  completeStep5AndSubmit,
  DEFAULT_FEES,
  loginAndConsent,
  stubTreatmentGroup,
} from "../helpers/flow";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test("alur penuh layar mobile (390×844): login → … → submit → debriefing + DB", async ({ page }) => {
  test.setTimeout(180_000);
  const username = `qa_mobile_${Date.now().toString(36)}`;
  await stubTreatmentGroup(page, 4);
  await loginAndConsent(page, username);

  // Tidak ada scroll horizontal (layout mobile sehat).
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(2);

  // Skenario sesuai grup 4 (eksplisit × kuat) tetap terbaca di layar kecil.
  const scenarioText = (await page.locator("main").textContent()) ?? "";
  expect(scenarioText).toContain(GROUP_CONDITIONS[4].client);
  expect(scenarioText).toContain(GROUP_CONDITIONS[4].memo);
  expect(scenarioText).not.toContain(CONDITION_MARKERS.implicitClient);

  await page.click('a:has-text("Lanjut ke Pencarian Kasus")');
  await page.waitForURL("**/step-2-cases");
  const overflow2 = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow2).toBeLessThanOrEqual(2);

  await completeStep2(page);
  await page.click('a:has-text("Lanjut ke Form Rekomendasi")');
  await page.waitForURL("**/step-3-form");
  await completeStep3(page, DEFAULT_FEES, 75);
  await completeStep4(page, 2);
  await completeStep5AndSubmit(page, {
    age: 27,
    gender: "Perempuan",
    education: "S1",
    affiliation: "PT Mobile QA",
    phoneNumber: "081298765555",
  });
  await expect(page.locator("h1").first()).toContainText(/Terima kasih/i); // halaman debriefing

  // DB: satu sesi utuh dari perangkat mobile.
  const session = (
    await dbQuery<{ id: string; treatment_group: number; global_remaining_seconds: number | null }>(
      `select s.id, s.treatment_group, s.global_remaining_seconds from public.sessions s
       join public.participants p on p.id = s.participant_id where p.username = $1`,
      [username],
    )
  )[0];
  expect(session).toBeDefined();
  expect(session.treatment_group).toBe(4);
  expect(session.global_remaining_seconds).toBeLessThanOrEqual(2400);
  const caseLogs = await dbQuery<{ rank_assigned: number | null }>(
    "select rank_assigned from public.case_logs where session_id = $1",
    [session.id],
  );
  expect(caseLogs).toHaveLength(14);
  expect(new Set(caseLogs.map((c) => c.rank_assigned)).size).toBe(14);
});
