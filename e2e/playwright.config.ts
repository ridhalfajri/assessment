/**
 * Konfigurasi Playwright E2E — BETE-11 (QA aplikasi eksperimen pajak).
 *
 * Target: aplikasi berjalan di E2E_BASE_URL (default http://localhost:3000)
 * dengan Postgres lokal + gateway REST kompatibel Supabase (lihat e2e/README.md
 * dan e2e/local-stack.sh). Suite TIDAK pernah mengarah ke instance produksi.
 */
import { defineConfig } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./specs",
  globalSetup: "./global-setup.ts",
  // Flaky = gagal (tanpa retry); kegagalan harus didiagnosis, bukan disembunyikan.
  retries: 0,
  // Paralel antar-file (2 worker); di dalam file tes berjalan berurutan.
  workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : 2,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    launchOptions: {
      executablePath: process.env.E2E_CHROMIUM_PATH ?? "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
    viewport: { width: 1280, height: 800 },
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },
});
