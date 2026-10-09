import { NextResponse } from "next/server";
import { isAuthenticatedAdmin } from "@/lib/admin-auth";
import { getAdminParticipantDetail } from "@/lib/admin-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: "Tidak diizinkan. Silakan login admin." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "ID partisipan tidak valid." }, { status: 400 });
  }

  try {
    const detail = await getAdminParticipantDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "Partisipan tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (err) {
    console.error("[admin-participant-detail] error:", err);
    return NextResponse.json({ error: "Gagal memuat detail partisipan." }, { status: 500 });
  }
}
