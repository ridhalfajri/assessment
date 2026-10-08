/**
 * BETE-11 Tugas 1 — Test matrix 4 grup treatment × alur penuh.
 * Untuk tiap grup (deterministik via stub Math.random):
 *   login → consent → grup ter-stub → skenario sesuai matriks 2×2 → 14 kasus
 *   → form → kuesioner → demografi → submit → debriefing, lalu konsistensi
 *   DB (participants/sessions/case_logs/survey_results).
 */
import { expect, test } from "@playwright/test";
import { dbCount, dbQuery } from "../helpers/db";
import {
  CONDITION_MARKERS,
  GROUP_CONDITIONS,
  completeStep2,
  completeStep3,
  completeStep4,
  completeStep5AndSubmit,
  DEFAULT_DEMO,
  DEFAULT_FEES,
  loginAndConsent,
  stubTreatmentGroup,
  type TreatmentGroup,
} from "../helpers/flow";

for (const group of [1, 2, 3, 4] as TreatmentGroup[]) {
  test(`grup ${group} (${GROUP_CONDITIONS[group].client === CONDITION_MARKERS.implicitClient ? "implisit" : "eksplisit"} × ${GROUP_CONDITIONS[group].memo === CONDITION_MARKERS.weakMemo ? "lemah" : "kuat"}) — alur penuh + integritas DB`, async ({ page }) => {
    test.setTimeout(180_000);
    const username = `qa_g${group}_${Date.now().toString(36)}`;
    const phone = `08129876543${group}`;
    const affiliation = `PT QA Grup ${group}`;

    await stubTreatmentGroup(page, group);
    await loginAndConsent(page, username);

    // --- Step 1: teks skenario & memo sesuai kondisi matriks grup ---
    const scenarioText = (await page.locator("main").textContent()) ?? "";
    expect(scenarioText).toContain(GROUP_CONDITIONS[group].client);
    expect(scenarioText).toContain(GROUP_CONDITIONS[group].memo);
    const oppositeClient =
      GROUP_CONDITIONS[group].client === CONDITION_MARKERS.implicitClient
        ? CONDITION_MARKERS.explicitClient
        : CONDITION_MARKERS.implicitClient;
    const oppositeMemo =
      GROUP_CONDITIONS[group].memo === CONDITION_MARKERS.weakMemo
        ? CONDITION_MARKERS.strongMemo
        : CONDITION_MARKERS.weakMemo;
    expect(scenarioText).not.toContain(oppositeClient);
    expect(scenarioText).not.toContain(oppositeMemo);

    await page.click('a:has-text("Lanjut ke Pencarian Kasus")');
    await page.waitForURL("**/step-2-cases");

    // --- Step 2: 14 kasus, sitasi (genap = Ya), peringkat unik ---
    await completeStep2(page);
    const progress = (await page.locator('[data-testid="step2-progress"]').textContent()) ?? "";
    expect(progress).toContain("14/14");
    await page.click('a:has-text("Lanjut ke Form Rekomendasi")');
    await page.waitForURL("**/step-3-form");

    // --- Step 3: biaya + keyakinan ---
    await completeStep3(page, DEFAULT_FEES, 80);

    // --- Step 4: kuesioner + manipulation check ---
    const answers = await completeStep4(page, 4);

    // --- Step 5: demografi + submit ---
    await completeStep5AndSubmit(page, { ...DEFAULT_DEMO, affiliation, phoneNumber: phone });

    // --- Debriefing ---
    await expect(page.locator("h1").first()).toContainText(/Terima kasih/i); // halaman debriefing

    // --- Integritas DB ---
    expect(await dbCount("participants", "username = $1", [username])).toBe(1);
    const participant = (
      await dbQuery<{ id: string; phone_number: string; age: number; gender: string; education: string; affiliation: string }>(
        "select id, phone_number, age, gender, education, affiliation from public.participants where username = $1",
        [username],
      )
    )[0];
    expect(participant.phone_number).toBe(phone);
    expect(participant.age).toBe(30);
    expect(participant.gender).toBe("Laki-laki");
    expect(participant.education).toBe("S1");
    expect(participant.affiliation).toBe(affiliation);

    expect(await dbCount("sessions", "participant_id = $1", [participant.id])).toBe(1);
    const session = (
      await dbQuery<{ id: string; treatment_group: number; is_completed: boolean; global_remaining_seconds: number | null }>(
        "select id, treatment_group, is_completed, global_remaining_seconds from public.sessions where participant_id = $1",
        [participant.id],
      )
    )[0];
    // treatment_group sesuai teks yang dirender (assert matriks di atas).
    expect(session.treatment_group).toBe(group);
    expect(session.is_completed).toBe(true);
    expect(session.global_remaining_seconds).not.toBeNull();
    expect(session.global_remaining_seconds!).toBeGreaterThanOrEqual(0);
    expect(session.global_remaining_seconds!).toBeLessThanOrEqual(2400);

    // case_logs = tepat 14 per session, case_id 1–14 unik, rank unik 1–14.
    const caseLogs = await dbQuery<{ case_id: number; duration_seconds: number; is_saved: boolean; rank_assigned: number | null }>(
      "select case_id, duration_seconds, is_saved, rank_assigned from public.case_logs where session_id = $1 order by case_id",
      [session.id],
    );
    expect(caseLogs).toHaveLength(14);
    expect(new Set(caseLogs.map((c) => c.case_id))).toEqual(new Set(Array.from({ length: 14 }, (_, i) => i + 1)));
    const ranks = caseLogs.map((c) => c.rank_assigned);
    expect(new Set(ranks).size).toBe(14);
    expect(ranks.every((r) => r !== null && r >= 1 && r <= 14)).toBe(true);
    for (const log of caseLogs) {
      expect(log.is_saved).toBe(log.case_id % 2 === 0);
      expect(Number.isInteger(log.duration_seconds)).toBe(true);
      expect(log.duration_seconds).toBeGreaterThanOrEqual(0);
    }

    // survey_results: biaya, keyakinan, kuesioner, manipulation check.
    expect(await dbCount("survey_results", "session_id = $1", [session.id])).toBe(1);
    const survey = (
      await dbQuery<{
        know_how_fee: string; entertainment: string; maintenance: string; marketing: string;
        confidence_level: number; q1_answer: string; q2_answer: string; q3_answer: string; manipulation_check: number | null;
      }>(
        "select know_how_fee, entertainment, maintenance, marketing, confidence_level, q1_answer, q2_answer, q3_answer, manipulation_check from public.survey_results where session_id = $1",
        [session.id],
      )
    )[0];
    expect(Number(survey.know_how_fee)).toBe(DEFAULT_FEES.knowHowFee);
    expect(Number(survey.entertainment)).toBe(DEFAULT_FEES.entertainment);
    expect(Number(survey.maintenance)).toBe(DEFAULT_FEES.maintenance);
    expect(Number(survey.marketing)).toBe(DEFAULT_FEES.marketing);
    expect(survey.confidence_level).toBe(80);
    expect(survey.q1_answer).toBe(answers.q1);
    expect(survey.q2_answer).toBe(answers.q2);
    expect(survey.q3_answer).toBe(answers.q3);
    expect(survey.manipulation_check).toBe(4);
  });
}
