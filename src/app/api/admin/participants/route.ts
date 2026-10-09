import { NextResponse } from "next/server";
import { isAuthenticatedAdmin } from "@/lib/admin-auth";
import { getAdminParticipantsList } from "@/lib/admin-service";

export async function GET(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: "Tidak diizinkan. Silakan login admin." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const groupStr = searchParams.get("treatmentGroup");
  const treatmentGroup = groupStr ? parseInt(groupStr, 10) : undefined;
  const statusParam = searchParams.get("status");
  const status =
    statusParam === "completed" || statusParam === "expired" ? statusParam : "all";

  try {
    const list = await getAdminParticipantsList({
      search,
      treatmentGroup,
      status,
    });
    return NextResponse.json({ participants: list });
  } catch (err) {
    console.error("[admin-participants] error:", err);
    return NextResponse.json({ error: "Gagal memuat daftar partisipan." }, { status: 500 });
  }
}
