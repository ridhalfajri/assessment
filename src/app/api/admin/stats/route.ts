import { NextResponse } from "next/server";
import { isAuthenticatedAdmin } from "@/lib/admin-auth";
import { getAdminDashboardStats } from "@/lib/admin-service";

export async function GET() {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: "Tidak diizinkan. Silakan login admin." }, { status: 401 });
  }

  try {
    const stats = await getAdminDashboardStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[admin-stats] error:", err);
    return NextResponse.json({ error: "Gagal memuat statistik." }, { status: 500 });
  }
}
