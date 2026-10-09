"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { AdminParticipantSummary } from "@/lib/admin-service";
import { formatRupiah } from "@/lib/format";

export function ParticipantsFilterTable({
  initialParticipants,
}: {
  initialParticipants: AdminParticipantSummary[];
}) {
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [revealedPhones, setRevealedPhones] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    return initialParticipants.filter((p) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = p.username.toLowerCase().includes(q);
        const matchAffil = p.affiliation.toLowerCase().includes(q);
        const matchPhone = p.phoneNumber.toLowerCase().includes(q);
        if (!matchName && !matchAffil && !matchPhone) return false;
      }

      // Treatment Group
      if (selectedGroup !== "all") {
        const grp = parseInt(selectedGroup, 10);
        if (p.session?.treatmentGroup !== grp) return false;
      }

      // Status
      if (selectedStatus === "completed" && !p.session?.isCompleted) return false;
      if (selectedStatus === "expired" && p.session?.isCompleted) return false;

      return true;
    });
  }, [initialParticipants, search, selectedGroup, selectedStatus]);

  function toggleRevealPhone(id: string) {
    setRevealedPhones((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function maskPhone(phone: string): string {
    if (phone.length <= 6) return phone;
    return phone.slice(0, 4) + "••••" + phone.slice(-3);
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}d`;
  }

  return (
    <div className="space-y-6">
      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <svg
            className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            id="filter-search-participants"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama subjek, instansi afiliasi, atau No. HP..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            id="filter-treatment-group"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            aria-label="Filter Grup Perlakuan"
            className="px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 focus:outline-none"
          >
            <option value="all">Semua Grup (1–4)</option>
            <option value="1">Grup 1: Implisit – Lemah</option>
            <option value="2">Grup 2: Eksplisit – Lemah</option>
            <option value="3">Grup 3: Implisit – Kuat</option>
            <option value="4">Grup 4: Eksplisit – Kuat</option>
          </select>

          <select
            id="filter-completion-status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter Status Pengerjaan"
            className="px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="completed">Selesai (Completed)</option>
            <option value="expired">Habis Waktu (Expired)</option>
          </select>

          <div className="text-xs font-medium text-neutral-500 px-2 py-1">
            Menampilkan <span className="font-bold text-neutral-900 dark:text-neutral-100">{filtered.length}</span> dari {initialParticipants.length} subjek
          </div>
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Partisipan</th>
                <th className="py-3.5 px-6">Kontak (HP)</th>
                <th className="py-3.5 px-6">Grup Perlakuan</th>
                <th className="py-3.5 px-6">Waktu Pengerjaan</th>
                <th className="py-3.5 px-6">14 Kasus Acuan</th>
                <th className="py-3.5 px-6">Total Biaya Rekomendasi</th>
                <th className="py-3.5 px-6">Keyakinan</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.map((p) => {
                const isPhoneRevealed = !!revealedPhones[p.id];
                const displayPhone = isPhoneRevealed ? p.phoneNumber : maskPhone(p.phoneNumber);

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition"
                  >
                    <td className="py-4 px-6 font-medium text-neutral-900 dark:text-neutral-100">
                      <div className="font-bold">{p.username}</div>
                      <div className="text-[11px] text-neutral-500">
                        {p.gender}, {p.age} thn • {p.education}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-normal">
                        {p.affiliation}
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span>{displayPhone}</span>
                        <button
                          type="button"
                          onClick={() => toggleRevealPhone(p.id)}
                          title={isPhoneRevealed ? "Sembunyikan" : "Tampilkan nomor HP"}
                          className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isPhoneRevealed ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            )}
                          </svg>
                        </button>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                        Grup {p.session?.treatmentGroup || "-"}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-neutral-600 dark:text-neutral-400">
                      <div>{formatTime(p.session?.timeSpentSeconds || 0)}</div>
                      <div className="text-[10px] text-neutral-400">
                        Sisa: {p.session?.globalRemainingSeconds != null ? `${p.session.globalRemainingSeconds}d` : "-"}
                      </div>
                    </td>

                    <td className="py-4 px-6 text-neutral-600 dark:text-neutral-400">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {p.caseStats.totalViewed}
                      </span>{" "}
                      kasus dibaca
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        {p.caseStats.totalSaved} disitasi (Ya)
                      </div>
                    </td>

                    <td className="py-4 px-6 font-medium text-neutral-900 dark:text-neutral-100">
                      {p.surveyResults
                        ? formatRupiah(p.surveyResults.totalRecommendedFee)
                        : "-"}
                    </td>

                    <td className="py-4 px-6">
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {p.surveyResults?.confidenceLevel != null
                          ? `${p.surveyResults.confidenceLevel}%`
                          : "-"}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        MC: {p.surveyResults?.manipulationCheck ?? "-"} / 5
                      </div>
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 font-semibold hover:bg-neutral-900 hover:text-white dark:hover:bg-white dark:hover:text-neutral-900 transition shadow-sm"
                      >
                        <span>Bedah Detail</span>
                        <span>→</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400">
                    Tidak ditemukan subjek yang cocok dengan kriteria filter saat ini.
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
