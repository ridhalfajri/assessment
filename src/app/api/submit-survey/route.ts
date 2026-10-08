import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { submitSurveyPayloadSchema } from "@/lib/submit-survey";
import { checkRateLimit } from "@/lib/rate-limit";

/** Batas ukuran body JSON — payload sah berukuran < 10 KB (BETE-13). */
const MAX_BODY_BYTES = 128 * 1024;

/**
 * POST /api/submit-survey — batch submit seluruh state eksperimen (BETE-7).
 *
 * Kontrak respons JSON:
 *  - 200 { status: "created", sessionId, participantId } — submit baru; semua
 *    baris (participants, sessions, case_logs, survey_results) tersimpan dalam
 *    SATU transaksi (RPC submit_survey, migrasi 0002).
 *  - 200 { status: "already_submitted", sessionId, participantId } — idempoten:
 *    submit ulang dengan participantId yang sama tidak menduplikasi baris.
 *  - 400 { error, details: [{ path, message }] } — payload invalid/tampered;
 *    tidak ada insert yang dieksekusi.
 *  - 413 { error } — ukuran body melebihi batas (BETE-13).
 *  - 429 { error } — terlalu banyak request dari IP yang sama (BETE-13);
 *    header Retry-After berisi detik tunggu.
 *  - 500 { error } — pesan umum tanpa detail internal; detail dicatat di log
 *    server untuk debugging.
 */

/** IP klien dari header proxy platform; fallback "unknown" (tetap dibatasi). */
function clientIpFrom(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(request: Request) {
  // Rate limit per IP sebelum menyentuh body (BETE-13: cegah spam submit).
  const { allowed, retryAfterSeconds } = checkRateLimit(clientIpFrom(request));
  if (!allowed) {
    console.warn(
      "[submit-survey] rate limit tercapai (retry-after %d dtk)",
      retryAfterSeconds,
    );
    return NextResponse.json(
      {
        error:
          "Terlalu banyak permintaan dari koneksi Anda. Tunggu beberapa menit, lalu coba lagi.",
      },
      { status: 429, headers: { "retry-after": String(retryAfterSeconds) } },
    );
  }

  // Baca body sebagai teks dulu untuk menggerbang ukuran (BETE-13: DoS via
  // body raksasa); payload sah berukuran jauh di bawah batas ini.
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Body request tidak dapat dibaca." },
      { status: 400 },
    );
  }
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Ukuran payload melebihi batas." },
      { status: 413 },
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Body request bukan JSON yang valid." },
      { status: 400 },
    );
  }

  const parsed = submitSurveyPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn(
      "[submit-survey] payload ditolak (%d masalah validasi): %s",
      parsed.error.issues.length,
      parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; "),
    );
    return NextResponse.json(
      {
        error: "Validasi payload gagal.",
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await getSupabaseAdminClient().rpc("submit_survey", {
      p_payload: parsed.data,
    });
    if (error) {
      throw error;
    }

    console.log(
      "[submit-survey] %s participant=%s session=%s",
      data?.status,
      data?.participantId,
      data?.sessionId,
    );
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("[submit-survey] gagal menyimpan data:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal saat menyimpan data survei." },
      { status: 500 },
    );
  }
}
