import { isAuthenticatedAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminExportPage() {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    redirect("/admin/login");
  }

  const exportOptions = [
    {
      id: "wide",
      title: "1. Dataset Riset Lengkap (Wide Format — Siap SPSS / Stata / Excel)",
      tag: "Direkomendasikan untuk Olah Data",
      description:
        "1 baris per partisipan dengan seluruh variabel teragregasi: demografi, grup perlakuan (1–4), rekomendasi biaya 4 akun, tingkat keyakinan, skor manipulation check, jawaban Q1–Q3, serta 14 pasang kolom durasi, sitasi, dan ranking kasus acuan.",
      columns: [
        "participant_id",
        "username",
        "gender, age, education, affiliation",
        "treatment_group",
        "is_completed, total_time_spent_seconds",
        "know_how_fee, entertainment_fee, maintenance_fee, marketing_fee, total_recommended_fee",
        "confidence_level, manipulation_check",
        "q1_answer, q2_answer, q3_answer",
        "case_1_dur_sec ... case_14_dur_sec",
        "case_1_saved ... case_14_saved",
        "case_1_rank ... case_14_rank",
      ],
      href: "/api/admin/export?type=wide",
      buttonText: "Unduh CSV Dataset Lengkap (Wide)",
      buttonVariant: "primary",
    },
    {
      id: "long",
      title: "2. Dataset Panel Per Kasus (Long Format)",
      tag: "Untuk Analisis Multilevel / Panel Data",
      description:
        "1 baris per interaksi kasus (14 baris per partisipan). Cocok untuk pemodelan regresi panel atau menganalisis faktor-faktor yang memengaruhi keputusan sitasi dan durasi baca per kasus secara spesifik.",
      columns: [
        "session_id",
        "participant_id",
        "username",
        "treatment_group",
        "is_completed",
        "case_id (1–14)",
        "duration_seconds",
        "is_saved (0/1)",
        "rank_assigned (1–14 / NULL)",
      ],
      href: "/api/admin/export?type=long",
      buttonText: "Unduh CSV Format Panel (Long)",
      buttonVariant: "secondary",
    },
    {
      id: "incentive",
      title: "3. Daftar Kontak Insentif (Disbursement List)",
      tag: "Untuk Pembagian Pulsa / E-Wallet",
      description:
        "Daftar khusus tim lapangan untuk memproses pengiriman insentif pulsa/e-wallet. Nomor HP diformat agar angka 0 di depan tidak hilang saat dibuka di Microsoft Excel. Tidak menyertakan data keputusan eksperimen.",
      columns: [
        "No",
        "Username",
        "No_Handphone (Excel preserved)",
        "Afiliasi",
        "Status_Pengerjaan (Selesai / Habis Waktu)",
        "Waktu_Mulai",
      ],
      href: "/api/admin/export?type=incentive",
      buttonText: "Unduh CSV Daftar Kontak Pulsa",
      buttonVariant: "secondary",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
          <Link href="/admin" className="hover:underline">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-neutral-900 dark:text-neutral-100 font-semibold">
            Ekspor Data
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
          Pusat Unduhan &amp; Ekspor Data
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Unduh data hasil eksperimen dalam format CSV berstandar UTF-8 BOM yang langsung terbaca rapi di Microsoft Excel, SPSS, R, Stata, dan Python.
        </p>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 gap-6">
        {exportOptions.map((opt) => (
          <div
            key={opt.id}
            className="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {opt.tag}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {opt.title}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {opt.description}
              </p>

              <div className="pt-2">
                <span className="text-[11px] font-semibold text-neutral-400 block mb-1">
                  Struktur Kolom Utama:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {opt.columns.map((col, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0">
              <a
                href={opt.href}
                download
                className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition shadow-sm w-full md:w-auto ${
                  opt.buttonVariant === "primary"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100"
                    : "border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>{opt.buttonText}</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="p-6 rounded-3xl bg-neutral-100/70 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 space-y-2">
        <div className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <span>💡 Tips Pengolahan Data untuk Peneliti:</span>
        </div>
        <p>
          • <strong>Untuk SPSS:</strong> Buka SPSS → File → Open → Data → pilih file CSV yang telah diunduh. Kolom angka dan teks akan langsung terpetakan dengan tipe variabel yang sesuai.
        </p>
        <p>
          • <strong>Untuk Excel:</strong> File diekspor dengan UTF-8 Byte Order Mark (BOM), sehingga karakter khusus dan teks multibyte akan langsung terbuka tanpa perlu *Text to Columns*.
        </p>
        <p>
          • <strong>Kerahasiaan Data:</strong> Pastikan file ekspor yang memuat nomor handphone (PII) disimpan di media penyimpanan pribadi yang aman sesuai etika penelitian.
        </p>
      </div>
    </div>
  );
}
