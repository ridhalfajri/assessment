import { isAuthenticatedAdmin } from "@/lib/admin-auth";
import { getAdminDashboardStats, getAdminParticipantsList } from "@/lib/admin-service";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    redirect("/admin/login");
  }

  const [stats, participants] = await Promise.all([
    getAdminDashboardStats().catch(() => null),
    getAdminParticipantsList().catch(() => []),
  ]);

  if (!stats) {
    return (
      <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
          Gagal Memuat Data Supabase
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Pastikan kredensial Supabase diatur dengan benar dan migrasi SQL telah dijalankan.
        </p>
      </div>
    );
  }

  const recentParticipants = participants.slice(0, 5);

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}d`;
  }

  return (
    <div className="space-y-8">
      {/* Header Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
            Ringkasan Eksperimen
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Monitoring aktivitas pengambilan keputusan pajak &amp; integritas data subjek.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/export"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Ekspor CSV</span>
          </Link>
          <Link
            href="/admin/participants"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition shadow-sm"
          >
            <span>Lihat Semua Partisipan</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Total Partisipan
            </span>
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-neutral-900 dark:text-neutral-100">
              {stats.totalParticipants}
            </span>
            <span className="text-xs text-neutral-500">subjek terdaftar</span>
          </div>
          <div className="mt-2 text-xs text-neutral-500">
            {stats.completionRate}% menyelesaikan seluruh langkah
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Selesai vs Expired
            </span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {stats.totalCompleted}
            </span>
            <span className="text-xs text-neutral-400 font-medium">/ {stats.totalExpired} habis waktu</span>
          </div>
          <div className="mt-2 text-xs text-neutral-500">
            Auto-submit timer 40 menit
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Rata-rata Durasi
            </span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-neutral-900 dark:text-neutral-100">
              {formatDuration(stats.avgTimeSpentSeconds)}
            </span>
          </div>
          <div className="mt-2 text-xs text-neutral-500">
            Dari alokasi total 40 menit (2.400 detik)
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Keyakinan &amp; Manipulasi
            </span>
            <span className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-neutral-900 dark:text-neutral-100">
              {stats.avgConfidenceLevel}%
            </span>
            <span className="text-xs text-neutral-500 font-medium">
              Skor MC: {stats.avgManipulationCheck} / 5
            </span>
          </div>
          <div className="mt-2 text-xs text-neutral-500">
            Rata-rata confidence slider &amp; manipulation check
          </div>
        </div>
      </div>

      {/* Two Column Grid: Treatment Balance & Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Treatment Distribution */}
        <div className="bg-white dark:bg-neutral-900 p-6 sm:p-7 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Keseimbangan Perlakuan (Treatment Balance)
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Distribusi subjek ke dalam desain faktorial 2×2
              </p>
            </div>
            <Link
              href="/admin/analytics"
              className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 hover:underline"
            >
              Lihat Analisis Detail →
            </Link>
          </div>

          <div className="space-y-4 pt-2">
            {stats.treatmentDistribution.map((item) => {
              const maxCount = Math.max(...stats.treatmentDistribution.map((t) => t.count), 1);
              const percentage = Math.round((item.count / maxCount) * 100);

              return (
                <div key={item.group} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-neutral-700 dark:text-neutral-300">
                      {item.label}
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">
                      {item.count} partisipan
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neutral-900 dark:bg-neutral-100 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Demographics Summary */}
        <div className="bg-white dark:bg-neutral-900 p-6 sm:p-7 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Komposisi Demografi Subjek
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Distribusi jenis kelamin dan jenjang pendidikan
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Jenis Kelamin
              </span>
              <div className="space-y-1.5">
                {Object.entries(stats.genderCounts).map(([gender, count]) => (
                  <div key={gender} className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400 capitalize">{gender}</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">{count}</span>
                  </div>
                ))}
                {Object.keys(stats.genderCounts).length === 0 && (
                  <span className="text-xs text-neutral-400">Belum ada data</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Pendidikan Terakhir
              </span>
              <div className="space-y-1.5">
                {Object.entries(stats.educationCounts).map(([edu, count]) => (
                  <div key={edu} className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400">{edu}</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">{count}</span>
                  </div>
                ))}
                {Object.keys(stats.educationCounts).length === 0 && (
                  <span className="text-xs text-neutral-400">Belum ada data</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Submissions Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Subjek Terbaru
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              5 partisipan terakhir yang masuk ke sistem
            </p>
          </div>
          <Link
            href="/admin/participants"
            className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 hover:underline"
          >
            Buka Tabel Lengkap →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-6">Partisipan</th>
                <th className="py-3 px-6">Grup Perlakuan</th>
                <th className="py-3 px-6">Kasus Dibaca</th>
                <th className="py-3 px-6">Keyakinan</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {recentParticipants.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition">
                  <td className="py-4 px-6 font-medium text-neutral-900 dark:text-neutral-100">
                    <div>{p.username}</div>
                    <div className="text-[11px] text-neutral-400">{p.affiliation}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                      Grup {p.session?.treatmentGroup || "-"}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-neutral-600 dark:text-neutral-400">
                    {p.caseStats.totalViewed} dari 14 kasus ({p.caseStats.totalSaved} disitasi)
                  </td>
                  <td className="py-4 px-6 font-medium">
                    {p.surveyResults?.confidenceLevel != null
                      ? `${p.surveyResults.confidenceLevel}%`
                      : "-"}
                  </td>
                  <td className="py-4 px-6">
                    {p.session?.isCompleted ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        ● Selesai
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        ● Habis Waktu
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Link
                      href={`/admin/participants/${p.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
              {recentParticipants.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    Belum ada subjek yang menyelesaikan eksperimen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
