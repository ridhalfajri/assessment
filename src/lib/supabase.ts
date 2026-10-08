import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Inisialisasi klien Supabase dari environment variables (lihat .env.example).
 * Klien dibuat secara lazy agar build/prerender tidak gagal ketika env belum diisi.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variabel lingkungan "${name}" belum diatur. Salin .env.example ke .env.local lalu isi nilainya.`,
    );
  }
  return value;
}

let browserClient: SupabaseClient | null = null;

/**
 * Klien anon (public) — aman dipakai di browser maupun server.
 * Aksesnya dibatasi oleh Row Level Security (RLS) di Supabase.
 */
export function getSupabaseClient(): SupabaseClient {
  browserClient ??= createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
  return browserClient;
}

let adminClient: SupabaseClient | null = null;

/**
 * Klien service-role — SERVER ONLY.
 * Melewati RLS; jangan pernah dipanggil dari client component dan jangan pernah
 * di-prefix NEXT_PUBLIC_ (nilai service role tidak boleh sampai ke browser).
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseAdminClient() hanya boleh dipanggil di server.");
  }
  adminClient ??= createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return adminClient;
}
