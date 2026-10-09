import { isAuthenticatedAdmin } from "@/lib/admin-auth";
import { getResearchAnalytics } from "@/lib/admin-service";
import { REFERENCE_CASES } from "@/content/cases";
import { formatRupiah } from "@/lib/format";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminAnalyticsPage() {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    redirect("/admin/login");
  }

  const analytics = await getResearchAnalytics().catch(() => null);

  if (!analytics) {
    return (
      <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
          Gagal Memuat Analitik
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          Belum ada data subjek atau koneksi database mengalami kendala.
        </p>
      </div>
    );
  }

  const { treatmentGroups, caseSearchPatterns, manipulationCheckDistribution } = analytics;

  // Temukan max values untuk bar visual scaling
  const maxTotalFee = Math.max(...treatmentGroups.map((t) => t.avgTotalFee), 1);
  const maxCaseReadSeconds = Math.max(...caseSearchPatterns.map((c) => c.totalReadSeconds), 1);

  // Map case titles
  const caseTitleMap = new Map<number, string>();
  for (const c of REFERENCE_CASES) {
    caseTitleMap.set(c.caseId, c.title);
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <Link href="/admin" className="hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-neutral-900 dark:text-neutral-100 font-semibold">
              Analitik Riset
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
            Laporan &amp; Analisis Ilmiah Eksperimen
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Perbandingan efek perlakuan antar kelompok (ANOVA-ready) dan pola pencarian informasi 14 kasus.
          </p>
        </div>

        <Link
          href="/admin/export"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition shadow-sm self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Unduh Dataset CSV Lengkap</span>
        </Link>
      </div>

      {/* SECTION 1: Treatment Group Comparison (2x2 Factorial Matrix) */}
      <section className="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Faktorial 2×2 Analysis
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            1. Perbandingan Keputusan Biaya Antar Grup Perlakuan
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Rata-rata nominal rekomendasi beban pajak yang disetujui subjek per grup perlakuan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {treatmentGroups.map((grp) => {
            const feePct = Math.round((grp.avgTotalFee / maxTotalFee) * 100);

            return (
              <div
                key={grp.group}
                className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                      Grup {grp.group}
                    </span>
                    <span className="text-xs text-neutral-400 font-medium">
                      N = {grp.participantCount} subjek
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mt-2">
                    {grp.label.replace(/^Grup \d:\s*/, "")}
                  </h3>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Jasa Konsultasi:</span>
                      <span className="font-semibold">{formatRupiah(grp.avgKnowHowFee)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Entertainment:</span>
                      <span className="font-semibold">{formatRupiah(grp.avgEntertainment)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Maintenance:</span>
                      <span className="font-semibold">{formatRupiah(grp.avgMaintenance)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Marketing:</span>
                      <span className="font-semibold">{formatRupiah(grp.avgMarketing)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold text-neutral-500">Rata-rata Total:</span>
                    <span className="text-sm font-black text-neutral-900 dark:text-neutral-100">
                      {formatRupiah(grp.avgTotalFee)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neutral-900 dark:bg-neutral-100 rounded-full transition-all"
                      style={{ width: `${feePct}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-neutral-400 pt-1">
                    <span>Keyakinan: <strong>{grp.avgConfidence}%</strong></span>
                    <span>MC: <strong>{grp.avgManipulationCheck} / 5</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: Information Search Patterns across 14 cases */}
      <section className="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Information Search Analysis
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            2. Pola Penelusuran Informasi (14 Kasus Acuan)
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Analisis akumulasi waktu baca, tingkat sitasi rujukan, serta rata-rata peringkat prioritas per kasus.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-6 w-16">Kasus</th>
                <th className="py-3 px-6">Topik Kasus Acuan</th>
                <th className="py-3 px-6 w-48">Total Waktu Baca</th>
                <th className="py-3 px-6 w-32">Rata-rata Durasi</th>
                <th className="py-3 px-6 w-36">Tingkat Sitasi (%)</th>
                <th className="py-3 px-6 w-28 text-center">Rata-rata Rank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {caseSearchPatterns.map((c) => {
                const durPct = Math.round((c.totalReadSeconds / maxCaseReadSeconds) * 100);

                return (
                  <tr key={c.caseId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition">
                    <td className="py-4 px-6 font-bold text-neutral-400">#{c.caseId}</td>
                    <td className="py-4 px-6 font-semibold text-neutral-900 dark:text-neutral-100">
                      {caseTitleMap.get(c.caseId) || `Kasus Acuan #${c.caseId}`}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-between text-[11px] mb-1 font-medium">
                        <span>{Math.round(c.totalReadSeconds / 60)} menit</span>
                        <span className="text-neutral-400">{c.totalReadSeconds} dtk</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all"
                          style={{ width: `${durPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-neutral-700 dark:text-neutral-300">
                      {c.avgDurationSeconds} detik / subjek
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 dark:text-neutral-100">
                          {c.savePercentage}%
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          ({c.savedCount} kali)
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center font-bold">
                      {c.avgRank != null ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">
                          #{c.avgRank}
                        </span>
                      ) : (
                        <span className="text-neutral-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 3: Manipulation Check Distribution */}
      <section className="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Manipulation Check Validity
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            3. Uji Validitas Manipulasi Akuntabilitas (Skala Likert 1–5)
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Memverifikasi apakah manipulasi tekanan akuntabilitas berhasil diserap oleh subjek pada grup perlakuan kuat vs lemah.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          {manipulationCheckDistribution.map((item) => (
            <div
              key={item.score}
              className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 text-center space-y-3"
            >
              <div className="text-xs font-semibold text-neutral-500">
                Skor {item.score}
              </div>
              <div className="text-3xl font-black text-purple-600 dark:text-purple-400">
                {item.total}
              </div>
              <div className="text-[11px] text-neutral-400">partisipan</div>

              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700 text-[10px] space-y-1 text-neutral-500 text-left">
                <div className="flex justify-between">
                  <span>Grup 1 (Lemah):</span>
                  <span className="font-bold">{item.group1}</span>
                </div>
                <div className="flex justify-between">
                  <span>Grup 2 (Lemah):</span>
                  <span className="font-bold">{item.group2}</span>
                </div>
                <div className="flex justify-between">
                  <span>Grup 3 (Kuat):</span>
                  <span className="font-bold">{item.group3}</span>
                </div>
                <div className="flex justify-between">
                  <span>Grup 4 (Kuat):</span>
                  <span className="font-bold">{item.group4}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
