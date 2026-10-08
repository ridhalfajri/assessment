/**
 * Global setup Playwright — BETE-11.
 * 1. Pastikan aplikasi (E2E_BASE_URL) dan Postgres lokal (E2E_PG_URL) hidup.
 * 2. Reset tabel eksperimen agar tiap run suite mulai dari data bersih.
 * Gagal di sini = lingkungan belum siap (lihat e2e/README.md & e2e/local-stack.sh).
 */
import { execSync } from "node:child_process";
import { Client } from "pg";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const PG_URL = process.env.E2E_PG_URL ?? "postgres://postgres:postgres@localhost:54329/postgres";

export default async function globalSetup(): Promise<void> {
  // 1) Aplikasi hidup?
  let appUp = false;
  for (let attempt = 1; attempt <= 15 && !appUp; attempt += 1) {
    try {
      const res = await fetch(`${BASE_URL}/`, { method: "GET" });
      appUp = res.ok;
    } catch {
      appUp = false;
    }
    if (!appUp) await new Promise((r) => setTimeout(r, 1000));
  }
  if (!appUp) {
    throw new Error(
      `Aplikasi tidak merespons di ${BASE_URL}. Jalankan dulu: npm run build && npm start (dan e2e/local-stack.sh untuk DB).`,
    );
  }

  // 2) Postgres lokal hidup + tabel ada?
  const client = new Client({ connectionString: PG_URL });
  try {
    await client.connect();
  } catch {
    throw new Error(
      `Tidak bisa konek ke Postgres lokal (${PG_URL}). Jalankan e2e/local-stack.sh terlebih dahulu.`,
    );
  }

  try {
    const tables = await client.query(
      "select count(*)::int as n from information_schema.tables where table_schema='public' and table_name in ('participants','sessions','case_logs','survey_results')",
    );
    if (tables.rows[0].n !== 4) {
      throw new Error("Migrasi belum diterapkan (tabel eksperimen tidak lengkap). Jalankan e2e/local-stack.sh.");
    }
    // Data bersih untuk suite ini — container PG lokal khusus E2E, aman di-truncate.
    execSync(`docker exec bete11-pg psql -U postgres -q -c "truncate participants, sessions, case_logs, survey_results cascade"`);
  } finally {
    await client.end();
  }
}
