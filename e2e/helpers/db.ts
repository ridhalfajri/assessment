/**
 * Helper DB untuk suite E2E BETE-11 — akses langsung Postgres lokal
 * (docker bete11-pg, port host 54329) untuk memverifikasi konsistensi data
 * di keempat tabel eksperimen. TIDAK pernah mengarah ke Supabase produksi.
 */
import { Client, type QueryResultRow } from "pg";

const PG_URL = process.env.E2E_PG_URL ?? "postgres://postgres:postgres@localhost:54329/postgres";

let client: Client | null = null;

async function getClient(): Promise<Client> {
  if (!client) {
    client = new Client({ connectionString: PG_URL });
    await client.connect();
  }
  return client;
}

export async function dbQuery<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const c = await getClient();
  const res = await c.query<T>(sql, params);
  return res.rows;
}

export async function dbCount(table: string, where: string, params: unknown[] = []): Promise<number> {
  const rows = await dbQuery<{ n: number }>(`select count(*)::int as n from public.${table} where ${where}`, params);
  return rows[0].n;
}

export async function dbClose(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
  }
}
