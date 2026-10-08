import { NextResponse } from "next/server";

// TODO(BETE-7): validasi payload + batch insert transaksional ke Supabase
// memakai getSupabaseAdminClient() dari "@/lib/supabase" (server-only).
export async function POST() {
  return NextResponse.json(
    { error: "Endpoint /api/submit-survey belum diimplementasikan (stub scaffold)." },
    { status: 501 },
  );
}
