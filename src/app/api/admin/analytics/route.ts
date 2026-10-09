import { NextResponse } from "next/server";
import { isAuthenticatedAdmin } from "@/lib/admin-auth";
import { getResearchAnalytics } from "@/lib/admin-service";

export async function GET() {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: "Tidak diizinkan. Silakan login admin." }, { status: 401 });
  }

  try {
    const analytics = await getResearchAnalytics();
    return NextResponse.json(analytics);
  } catch (err) {
    console.error("[admin-analytics] error:", err);
    return NextResponse.json({ error: "Gagal memuat analitik riset." }, { status: 500 });
  }
}
