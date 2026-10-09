import { isAuthenticatedAdmin } from "@/lib/admin-auth";
import { getAdminParticipantsList } from "@/lib/admin-service";
import { redirect } from "next/navigation";
import { ParticipantsFilterTable } from "@/components/admin/ParticipantsFilterTable";
import Link from "next/link";

export default async function AdminParticipantsPage() {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    redirect("/admin/login");
  }

  const participants = await getAdminParticipantsList().catch(() => []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <Link href="/admin" className="hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-neutral-900 dark:text-neutral-100 font-semibold">
              Partisipan
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
            Daftar Partisipan &amp; Monitoring
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Pantau seluruh data subjek, durasi pencarian informasi, dan status kelengkapan data.
          </p>
        </div>

        <Link
          href="/admin/export"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition shadow-sm self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Ekspor CSV</span>
        </Link>
      </div>

      {/* Interactive Table with Search & Filter */}
      <ParticipantsFilterTable initialParticipants={participants} />
    </div>
  );
}
