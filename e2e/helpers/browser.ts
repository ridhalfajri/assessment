/**
 * Helper browser-level BETE-11: inspeksi listener `beforeunload` pada window
 * via CDP. Diperlukan karena Chromium headless tidak menampilkan dialog
 * beforeunload saat page.close — kontrak yang diuji adalah KEHADIRAN
 * listener (aktif selama eksperimen, hilang setelah submit final).
 */
import { expect, type Page } from "@playwright/test";

export async function countBeforeUnloadListeners(page: Page): Promise<number> {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { result } = await cdp.send("Runtime.evaluate", { expression: "window" });
    if (!result.objectId) throw new Error("Runtime.evaluate tidak mengembalikan objectId untuk window");
    const { listeners } = await cdp.send("DOMDebugger.getEventListeners", {
      objectId: result.objectId,
      depth: 0,
    });
    return listeners.filter((l) => l.type === "beforeunload").length;
  } finally {
    await cdp.detach().catch(() => {});
  }
}

export async function expectBeforeUnload(page: Page, expectedCount: 0 | 1): Promise<void> {
  await expect
    .poll(() => countBeforeUnloadListeners(page), { timeout: 5_000 })
    .toBe(expectedCount);
}

/**
 * Navigasi mundur lalu pastikan URL TIDAK berubah. Untuk assert negatif
 * ("tidak terjadi apa-apa") diperlukan batas tunggu terbatas — ini bukan
 * sleep untuk menunggu UI, melainkan jendela quiescence deterministik untuk
 * memastikan tidak ada navigasi yang terjadi (traversal dicegah atau dipaksa
 * maju kembali oleh guard).
 */
export async function goBackAndExpectUnchanged(page: Page, expectedPathname: string): Promise<void> {
  const urlBefore = new URL(page.url()).pathname;
  await page.goBack().catch(() => {
    /* traversal yang dicegah bisa melempar — perilaku yang diharapkan */
  });
  await page.waitForTimeout(600);
  expect(new URL(page.url()).pathname).toBe(expectedPathname ?? urlBefore);
}
