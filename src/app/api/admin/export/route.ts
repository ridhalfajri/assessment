import { NextResponse } from "next/server";
import { isAuthenticatedAdmin } from "@/lib/admin-auth";
import { generateExportCsv } from "@/lib/admin-service";

export async function GET(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: "Tidak diizinkan. Silakan login admin." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type");
  const type: "wide" | "long" | "incentive" =
    typeParam === "long" || typeParam === "incentive" ? typeParam : "wide";

  try {
    const csvContent = await generateExportCsv(type);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename =
      type === "incentive"
        ? `assessment_disbursement_incentives_${dateStr}.csv`
        : type === "long"
          ? `assessment_panel_cases_long_${dateStr}.csv`
          : `assessment_experiment_wide_dataset_${dateStr}.csv`;

    // Tambahkan UTF-8 BOM (\uFEFF) agar Microsoft Excel langsung membaca aksen & karakter dengan benar
    const bomCsv = "\uFEFF" + csvContent;

    return new NextResponse(bomCsv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("[admin-export] error:", err);
    return NextResponse.json({ error: "Gagal membuat file ekspor." }, { status: 500 });
  }
}
