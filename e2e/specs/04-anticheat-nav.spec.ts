/**
 * BETE-11 Tugas 2 — Anti-cheat navigasi & gerbang:
 *   - tombol back browser tidak bisa mengembalikan ke step sebelumnya,
 *   - membuka URL step lebih awal saat sesi berjalan dipaksa maju,
 *   - URL step tanpa sesi (belum consent) dialihkan ke login,
 *   - gerbang Step 2: lanjut hanya setelah 14 peringkat unik; duplikat ditolak,
 *   - beforeunload aktif selama eksperimen, hilang setelah submit final.
 */
import { expect, test } from "@playwright/test";
import { expectBeforeUnload, goBackAndExpectUnchanged } from "../helpers/browser";
import {
  completeStep2,
  completeStep3,
  completeStep4,
  completeStep5AndSubmit,
  DEFAULT_DEMO,
  loginAndConsent,
  stubTreatmentGroup,
} from "../helpers/flow";

test("back navigation diblokir — partisipan tidak kembali mengedit step sebelumnya", async ({ page }) => {
  await stubTreatmentGroup(page, 1);
  await loginAndConsent(page, `qa_back_${Date.now().toString(36)}`);

  // Dari step-1, back membawa ke halaman login — TAPI sesi tidak di-reset:
  // tampil panel resume, bukan form login baru (identitas tetap terkunci).
  await page.goBack().catch(() => {});
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  await expect(page.getByText("Sesi masih berjalan")).toBeVisible();
  await expect(page.locator("#username")).toHaveCount(0); // tidak bisa login ulang
  await page.getByRole("button", { name: /Lanjutkan Eksperimen/ }).click();
  await expect(page).toHaveURL(/\/step-1-scenario$/, { timeout: 10_000 });

  // Maju ke step-2 lalu coba back: traversal dicegah/dipaksa maju — tetap di step-2.
  await page.click('a:has-text("Lanjut ke Pencarian Kasus")');
  await page.waitForURL("**/step-2-cases");
  await goBackAndExpectUnchanged(page, "/step-2-cases");
});

test("URL step lebih awal saat sesi berjalan dipaksa maju ke step terakhir", async ({ page }) => {
  test.setTimeout(180_000);
  await stubTreatmentGroup(page, 2);
  await loginAndConsent(page, `qa_fwd_${Date.now().toString(36)}`);
  await page.click('a:has-text("Lanjut ke Pencarian Kasus")');
  await page.waitForURL("**/step-2-cases");
  await completeStep2(page);
  await page.click('a:has-text("Lanjut ke Form Rekomendasi")');
  await page.waitForURL("**/step-3-form");

  await page.goto("/step-1-scenario");
  // Guard satu arah memaksa maju kembali ke langkah terakhir (step 3).
  await expect(page).toHaveURL(/\/step-3-form$/, { timeout: 15_000 });
});

test("URL step dibuka tanpa sesi (belum consent) dialihkan ke halaman login", async ({ browser }) => {
  const context = await browser.newContext(); // storage kosong — belum pernah consent
  const page = await context.newPage();
  await page.goto("/step-3-form");
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
  await context.close();
});

test("gerbang Step 2: butuh 14 peringkat unik; peringkat duplikat ditolak", async ({ page }) => {
  await stubTreatmentGroup(page, 4);
  await loginAndConsent(page, `qa_gate_${Date.now().toString(36)}`);
  await page.click('a:has-text("Lanjut ke Pencarian Kasus")');
  await page.waitForURL("**/step-2-cases");

  // 13 kasus pertama dikerjakan → tombol lanjut nonaktif.
  await completeStep2(page, { onlyCases: Array.from({ length: 13 }, (_, i) => i + 1) });
  await expect(page.locator('[data-testid="step2-next-disabled"]')).toBeVisible();
  await expect(page.locator('a:has-text("Lanjut ke Form Rekomendasi")')).toHaveCount(0);

  // Duplikat peringkat ditolak dengan pesan jelas; nilai tidak tersimpan.
  const card14 = page.locator("article", { has: page.locator("#case-card-14") });
  await card14.locator("select").selectOption("1"); // peringkat 1 milik Kasus 1
  await expect(page.locator('article [role="alert"]')).toContainText(/sudah dipakai Kasus 1/i);
  await expect(card14.locator("select")).toHaveValue("");

  // Kasus ke-14 diberi peringkat unik → gerbang terbuka.
  await card14.locator("select").selectOption("14");
  await expect(page.locator('a:has-text("Lanjut ke Form Rekomendasi")')).toBeVisible();
  await expect(page.locator('[data-testid="step2-next-disabled"]')).toHaveCount(0);
});

test("beforeunload aktif selama eksperimen, hilang setelah submit final", async ({ page }) => {
  test.setTimeout(180_000);
  await stubTreatmentGroup(page, 3);
  await loginAndConsent(page, `qa_unload_${Date.now().toString(36)}`);

  // Selama sesi berjalan: listener beforeunload terpasang di window.
  await expectBeforeUnload(page, 1);

  // Selesaikan seluruh alur sampai submit sukses.
  await page.click('a:has-text("Lanjut ke Pencarian Kasus")');
  await page.waitForURL("**/step-2-cases");
  await completeStep2(page);
  await page.click('a:has-text("Lanjut ke Form Rekomendasi")');
  await page.waitForURL("**/step-3-form");
  await completeStep3(page);
  await completeStep4(page, 4);
  await completeStep5AndSubmit(page, { ...DEFAULT_DEMO, affiliation: "PT Unload", phoneNumber: "081298765555" });
  await expect(page.locator("h1").first()).toContainText(/Terima kasih/i); // halaman debriefing

  // Setelah submit final: listener beforeunload SUDAH DIHAPUS.
  await expectBeforeUnload(page, 0);
});
