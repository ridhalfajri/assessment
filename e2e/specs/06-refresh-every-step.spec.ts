/**
 * BETE-11 Tugas 3 — Refresh di setiap step: data terisi, peringkat, durasi,
 * dan sisa timer tidak hilang; alur bisa dilanjutkan sampai submit sukses dan
 * data final benar di DB. Parameterized untuk step 1–5.
 */
import { expect, test } from "@playwright/test";
import { dbCount, dbQuery } from "../helpers/db";
import {
  completeStep2,
  completeStep5AndSubmit,
  setConfidenceSlider,
  loginAndConsent,
  openAndCloseCase,
  readExperimentState,
  stubTreatmentGroup,
} from "../helpers/flow";

for (const step of [1, 2, 3, 4, 5]) {
  test(`refresh di step ${step} — state & timer persisten, alur lanjut sampai submit`, async ({ page }) => {
    test.setTimeout(180_000);
    const username = `qa_rfs${step}_${Date.now().toString(36)}`;
    await stubTreatmentGroup(page, 3);
    await loginAndConsent(page, username);
    const deadlineBefore = (await readExperimentState(page))?.sessionData.deadlineTimestamp;

    // Berjalan sampai step yang diuji, isi sebagian data.
    if (step >= 2) {
      await page.click('a:has-text("Lanjut ke Pencarian Kasus")');
      await page.waitForURL("**/step-2-cases");
    }
    if (step === 2) {
      await openAndCloseCase(page, 1, 1_200);
      const card3 = page.locator("article", { has: page.locator("#case-card-3") });
      await card3.locator('input[type="checkbox"]').check();
      await card3.locator("select").selectOption("3");
      await page.reload();
    } else if (step === 1) {
      await page.reload();
    }

    if (step >= 3) {
      await completeStep2(page);
      await page.click('a:has-text("Lanjut ke Form Rekomendasi")');
      await page.waitForURL("**/step-3-form");
    }
    if (step === 3) {
      await page.fill("#fee-knowHowFee", "111000000");
      await page.fill("#fee-entertainment", "222000000");
      await page.reload();
    }

    if (step >= 4) {
      await page.fill("#fee-knowHowFee", "111000000");
      await page.fill("#fee-entertainment", "222000000");
      await page.fill("#fee-maintenance", "333000000");
      await page.fill("#fee-marketing", "444000000");
      await setConfidenceSlider(page, 66);
      await page.click('a:has-text("Lanjut ke Kuesioner")');
      await page.waitForURL("**/step-4-quiz");
    }
    if (step === 4) {
      // q2 & q3 sengaja dibiarkan kosong; hanya q1 dijawab sebelum refresh.
      await page.locator('input[name="quiz-q1"]').first().check();
      await page.reload();
    }

    if (step >= 5) {
      // Kuesioner lengkap (step 4) sebelum maju ke demografi.
      await page.locator('input[name="quiz-q1"]').first().check();
      await page.locator('input[name="quiz-q2"]').first().check();
      await page.locator('input[name="quiz-q3"]').first().check();
      await page.locator('input[name="likert-manipulationCheck"]').nth(3).check();
      await page.click('a:has-text("Lanjut ke Demografi")');
      await page.waitForURL("**/step-5-demographics");
    }
    if (step === 5) {
      await page.fill("#demo-age", "44");
      await page.selectOption("#demo-gender", { label: "Perempuan" });
      await page.fill("#demo-phone", "081298764444");
      await page.reload();
    }

    // --- Setelah refresh: data yang sudah diisi masih ada ---
    await expect(page.locator('[data-testid="global-timer"]')).toBeVisible();

    if (step === 1) {
      await expect(page.locator("main")).toContainText(/PT Cahaya Gama/);
    }
    if (step === 2) {
      const state = await readExperimentState(page);
      const log1 = state?.caseLogs.find((c) => c.caseId === 1);
      const log3 = state?.caseLogs.find((c) => c.caseId === 3);
      expect(log1?.durationSeconds ?? 0).toBeGreaterThanOrEqual(1); // durasi bertahan
      expect(log1?.rank).toBeNull(); // peringkat kasus 1 memang belum diisi
      expect(log3?.rank).toBe(3); // peringkat kasus 3 bertahan
      expect(log3?.isSaved).toBe(true); // sitasi kasus 3 bertahan
      const card3 = page.locator("article", { has: page.locator("#case-card-3") });
      await expect(card3.locator('input[type="checkbox"]')).toBeChecked();
      await expect(card3.locator("select")).toHaveValue("3");
    }
    if (step === 3) {
      await expect(page.locator("#fee-knowHowFee")).toHaveValue(/111[,.\s]?000[,.\s]?000/);
      await expect(page.locator("#fee-entertainment")).toHaveValue(/222[,.\s]?000[,.\s]?000/);
    }
    if (step === 4) {
      await expect(page.locator('input[name="quiz-q1"]').first()).toBeChecked();
      await expect(page.locator('input[name="quiz-q2"]').first()).not.toBeChecked();
      await expect(page.locator('input[name="quiz-q3"]').first()).not.toBeChecked();
    }
    if (step === 5) {
      await expect(page.locator("#demo-age")).toHaveValue("44");
      await expect(page.locator("#demo-gender")).toHaveValue("Perempuan");
      await expect(page.locator("#demo-phone")).toHaveValue("081298764444");
    }

    // Timer tidak direset: deadline absolut sama; setelah ≥2 detik berjalan
    // pasca-reload, sisa waktu pasti sudah turun dari 40:00 penuh.
    await page.waitForTimeout(2_100);
    const stateAfter = await readExperimentState(page);
    expect(stateAfter?.sessionData.deadlineTimestamp).toBe(deadlineBefore);
    const remaining = stateAfter?.sessionData.globalTimeRemaining ?? 2400;
    expect(remaining).toBeLessThan(2400);

    // --- Lanjutkan alur sampai selesai, lalu integritas DB ---
    if (step === 1) {
      await page.click('a:has-text("Lanjut ke Pencarian Kasus")');
      await page.waitForURL("**/step-2-cases");
    }
    if (step <= 2) {
      await completeStep2(page);
      await page.click('a:has-text("Lanjut ke Form Rekomendasi")');
      await page.waitForURL("**/step-3-form");
    }
    if (step <= 3) {
      // Lengkapi semua biaya (nilai yang terisi sebelum refresh tetap dipertahankan).
      await page.fill("#fee-knowHowFee", "111000000");
      await page.fill("#fee-entertainment", "222000000");
      await page.fill("#fee-maintenance", "333000000");
      await page.fill("#fee-marketing", "444000000");
      await setConfidenceSlider(page, 66);
      await page.click('a:has-text("Lanjut ke Kuesioner")');
      await page.waitForURL("**/step-4-quiz");
    }
    if (step <= 4) {
      if (step === 4) {
        // q2 & q3 belum (setelah uncheck) → isi sekarang; q1 sudah tercentang.
        await page.locator('input[name="quiz-q2"]').first().check();
        await page.locator('input[name="quiz-q3"]').first().check();
      } else {
        await page.locator('input[name="quiz-q1"]').first().check();
        await page.locator('input[name="quiz-q2"]').first().check();
        await page.locator('input[name="quiz-q3"]').first().check();
      }
      await page.locator('input[name="likert-manipulationCheck"]').nth(3).check();
      await page.click('a:has-text("Lanjut ke Demografi")');
      await page.waitForURL("**/step-5-demographics");
    }
    if (step === 5) {
      // age/gender/phone sudah terisi sebelum refresh; lengkapi sisanya.
      await page.selectOption("#demo-education", { label: "S1" });
      await page.fill("#demo-affiliation", `PT Refresh ${step}`);
    } else {
      await page.fill("#demo-age", "44");
      await page.selectOption("#demo-gender", { label: "Perempuan" });
      await page.selectOption("#demo-education", { label: "S1" });
      await page.fill("#demo-affiliation", `PT Refresh ${step}`);
      await page.fill("#demo-phone", "081298764444");
    }

    await completeStep5AndSubmit(page, { age: 44, gender: "Perempuan", education: "S1", affiliation: `PT Refresh ${step}`, phoneNumber: "081298764444" });
    await expect(page.locator("h1").first()).toContainText(/Terima kasih/i); // halaman debriefing

    // DB: tepat satu baris per tabel (tidak ada duplikat akibat refresh).
    expect(await dbCount("participants", "username = $1", [username])).toBe(1);
    const participant = (await dbQuery<{ id: string }>("select id from public.participants where username = $1", [username]))[0];
    expect(await dbCount("sessions", "participant_id = $1", [participant.id])).toBe(1);
    const session = (await dbQuery<{ id: string }>("select id from public.sessions where participant_id = $1", [participant.id]))[0];
    expect(await dbCount("case_logs", "session_id = $1", [session.id])).toBe(14);
    expect(await dbCount("survey_results", "session_id = $1", [session.id])).toBe(1);

    // Refresh SETELAH submit: tetap debriefing, TIDAK resubmit.
    await page.reload();
    await expect(page.locator("h1").first()).toContainText(/Terima kasih/i); // halaman debriefing
    expect(await dbCount("participants", "username = $1", [username])).toBe(1);
  });
}
