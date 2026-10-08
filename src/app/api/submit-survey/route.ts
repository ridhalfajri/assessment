import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { submitSurveyPayloadSchema } from "@/lib/submit-survey";

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
 *  - 500 { error } — pesan umum tanpa detail internal; detail dicatat di log
 *    server untuk debugging.
 */
export async function POST(request: Request) {
  let raw: unknown;

  try {
    raw = await request.json();
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
