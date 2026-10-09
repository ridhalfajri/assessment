"use client";

import { useState } from "react";
import Link from "next/link";
import type { AdminParticipantDetail } from "@/lib/admin-service";
import { REFERENCE_CASES } from "@/content/cases";
import { TREATMENTS } from "@/content/treatments";
import { KNOWLEDGE_QUESTIONS, LIKERT_LABELS } from "@/content/questionnaire";
import { formatRupiah } from "@/lib/format";
import type { TreatmentGroupId } from "@/lib/experiment";

export function ParticipantDetailView({
  data,
}: {
  data: AdminParticipantDetail;
}) {
  const [showPhone, setShowPhone] = useState(false);
  const [activeTab, setActiveTab] = useState<"cases" | "decisions" | "treatment">("cases");

  const { participant, session, surveyResults, caseLogs } = data;

  // Map case logs by caseId (1..14)
  const caseLogsMap = new Map<number, (typeof caseLogs)[number]>();
  for (const log of caseLogs) {
    caseLogsMap.set(log.caseId, log);
  }

  const maxCaseDuration = Math.max(
    ...caseLogs.map((c) => c.durationSeconds),
    1,
  );

  const totalCaseDuration = caseLogs.reduce((acc, c) => acc + c.durationSeconds, 0);
  const totalSavedCases = caseLogs.filter((c) => c.isSaved).length;
  const totalViewedCases = caseLogs.filter((c) => c.durationSeconds > 0).length;

  const treatmentInfo =
    session && session.treatmentGroup >= 1 && session.treatmentGroup <= 4
      ? TREATMENTS[session.treatmentGroup as TreatmentGroupId]
      : null;

  function maskPhone(phone: string): string {
    if (phone.length <= 6) return phone;
    return phone.slice(0, 4) + "••••" + phone.slice(-3);
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}d`;
  }

  const totalFee =
    surveyResults
      ? surveyResults.knowHowFee +
        surveyResults.entertainment +
        surveyResults.maintenance +
        surveyResults.marketing
      : 0;

  return (
    <div className="space-y-8">
      {/* Top Navigation & Profile Header */}
      <div className="space-y-3">
        <Link
          href="/admin/participants"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition"
        >
          <span>← Kembali ke Daftar Partisipan</span>
        </Link>

        <div className="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center font-bold text-2xl shadow-sm flex-shrink-0">
              {participant.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-neutral-100">
                  {participant.username}
                </h1>
                {session?.isCompleted ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    ● Selesai (Completed)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    ● Habis Waktu (Expired)
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                  Grup {session?.treatmentGroup} ({treatmentInfo?.label || "Perlakuan"})
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                <span>
                  <strong>Afiliasi:</strong> {participant.affiliation}
                </span>
                <span>•</span>
                <span>
                  <strong>Demografi:</strong> {participant.gender}, {participant.age} thn ({participant.education})
                </span>
                <span>•</span>
                <span>
                  <strong>Waktu Mulai:</strong>{" "}
                  {new Date(participant.createdAt).toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>

          {/* Contact & ID card */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 text-xs space-y-2 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <span className="text-neutral-400">No. Handphone:</span>
              <div className="flex items-center gap-1.5 font-mono font-medium">
                <span>{showPhone ? participant.phoneNumber : maskPhone(participant.phoneNumber)}</span>
                <button
                  type="button"
                  onClick={() => setShowPhone(!showPhone)}
                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
                  title={showPhone ? "Sembunyikan No. HP" : "Buka No. HP"}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPhone ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-neutral-400">Total Waktu Sesi:</span>
              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                {formatTime(session?.timeSpentSeconds || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-neutral-400">Sisa Global Timer:</span>
              <span className="text-neutral-700 dark:text-neutral-300">
                {session?.globalRemainingSeconds != null ? `${session.globalRemainingSeconds} detik` : "-"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("cases")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "cases"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          1. Perilaku 14 Kasus Acuan ({totalViewedCases} Dibuka / {totalSavedCases} Disitasi)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("decisions")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "decisions"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          2. Rekomendasi Biaya &amp; Kuesioner
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("treatment")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "treatment"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          3. Skenario Treatment yang Diterima
        </button>
      </div>

      {/* TAB 1: 14 Cases Search Behavior */}
      {activeTab === "cases" && (
        <div className="space-y-6">
          {/* Summary Stat Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <span className="text-xs font-semibold uppercase text-neutral-400">
                Kasus yang Dibaca
              </span>
              <div className="mt-2 text-2xl font-black text-neutral-900 dark:text-neutral-100">
                {totalViewedCases} <span className="text-sm font-normal text-neutral-400">/ 14 kasus</span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">Kasus yang dibuka subjek selama simulasi</p>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <span className="text-xs font-semibold uppercase text-neutral-400">
                Total Waktu Baca Kasus
              </span>
              <div className="mt-2 text-2xl font-black text-neutral-900 dark:text-neutral-100">
                {formatTime(totalCaseDuration)}
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                Akumulasi durasi stopwatch membaca isi kasus
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <span className="text-xs font-semibold uppercase text-neutral-400">
                Kasus Disitasi (Ya)
              </span>
              <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {totalSavedCases} <span className="text-sm font-normal text-neutral-400">/ 14 kasus</span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                Kasus acuan yang dijadikan rujukan argumentasi
              </p>
            </div>
          </div>

          {/* 14 Cases Table Matrix */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Matriks Detail 14 Kasus Acuan
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Pencatatan durasi membaca, status sitasi (Ya/Tidak), serta urutan peringkat prioritas (Rank 1–14).
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-6 w-16">No</th>
                    <th className="py-3 px-6">Topik Kasus Acuan</th>
                    <th className="py-3 px-6 w-48">Durasi Baca</th>
                    <th className="py-3 px-6 w-32">Status Sitasi</th>
                    <th className="py-3 px-6 w-28 text-center">Peringkat (Rank)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {REFERENCE_CASES.map((refCase) => {
                    const log = caseLogsMap.get(refCase.caseId);
                    const dur = log?.durationSeconds || 0;
                    const isSaved = log?.isSaved || false;
                    const rank = log?.rankAssigned ?? null;
                    const durPct = Math.round((dur / maxCaseDuration) * 100);

                    return (
                      <tr
                        key={refCase.caseId}
                        className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition ${
                          isSaved ? "bg-emerald-50/20 dark:bg-emerald-950/10" : ""
                        }`}
                      >
                        <td className="py-4 px-6 font-bold text-neutral-400">
                          #{refCase.caseId}
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {refCase.title}
                          </div>
                          <div className="text-[11px] text-neutral-500 line-clamp-1">
                            {refCase.summary}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-between text-[11px] mb-1 font-medium">
                            <span className="font-bold text-neutral-900 dark:text-neutral-100">
                              {formatTime(dur)}
                            </span>
                            <span className="text-neutral-400">{dur} detik</span>
                          </div>
                          <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-neutral-900 dark:bg-neutral-100 rounded-full transition-all"
                              style={{ width: `${durPct}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {isSaved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              ✓ Disitasi (Ya)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                              ✕ Tidak
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {rank != null ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl font-extrabold text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm">
                              #{rank}
                            </span>
                          ) : (
                            <span className="text-neutral-300 dark:text-neutral-600">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Decisions & Questionnaire */}
      {activeTab === "decisions" && (
        <div className="space-y-8">
          {/* Tax Deductions Cards */}
          <div className="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Keputusan Rekomendasi Beban Pajak
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Nominal pembebanan biaya yang diputuskan partisipan pada Step 3
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-neutral-400">Total Beban Direkomendasikan:</span>
                <div className="text-xl font-black text-neutral-900 dark:text-neutral-100">
                  {formatRupiah(totalFee)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-semibold text-neutral-500">1. Jasa Konsultasi (Know-how)</span>
                <div className="mt-2 text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {formatRupiah(surveyResults?.knowHowFee || 0)}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-semibold text-neutral-500">2. Biaya Jamuan (Entertainment)</span>
                <div className="mt-2 text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {formatRupiah(surveyResults?.entertainment || 0)}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-semibold text-neutral-500">3. Biaya Perbaikan (Maintenance)</span>
                <div className="mt-2 text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {formatRupiah(surveyResults?.maintenance || 0)}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-semibold text-neutral-500">4. Biaya Pemasaran (Marketing)</span>
                <div className="mt-2 text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {formatRupiah(surveyResults?.marketing || 0)}
                </div>
              </div>
            </div>

            {/* Confidence Level Slider Bar */}
            <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Tingkat Keyakinan Subjek Terhadap Rekomendasi
                </span>
                <span className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100">
                  {surveyResults?.confidenceLevel || 0}%
                </span>
              </div>
              <div className="w-full h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                  style={{ width: `${surveyResults?.confidenceLevel || 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Manipulation Check & Questionnaire */}
          <div className="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Manipulation Check &amp; Kuesioner
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Hasil evaluasi akuntabilitas dan pemahaman subjek
              </p>
            </div>

            {/* Manipulation Check Card */}
            <div className="p-5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  Manipulation Check (Skala Likert 1–5)
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-purple-200 text-purple-900 dark:bg-purple-900 dark:text-purple-100">
                  Skor: {surveyResults?.manipulationCheck ?? "-"} / 5
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300">
                Tingkat persepsi tanggung jawab / akuntabilitas yang dirasakan subjek:{" "}
                <strong>
                  {surveyResults?.manipulationCheck
                    ? LIKERT_LABELS[surveyResults.manipulationCheck - 1]
                    : "Tidak ada data"}
                </strong>
              </p>
            </div>

            {/* Qualitative Questions Q1-Q3 */}
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-2">
                <span className="text-xs font-bold text-neutral-500">Pertanyaan 1 (Q1)</span>
                <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {KNOWLEDGE_QUESTIONS[0]?.prompt}
                </p>
                <div className="mt-2 p-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  {surveyResults?.q1Answer || "(Tidak ada jawaban)"}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-2">
                <span className="text-xs font-bold text-neutral-500">Pertanyaan 2 (Q2)</span>
                <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {KNOWLEDGE_QUESTIONS[1]?.prompt}
                </p>
                <div className="mt-2 p-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  {surveyResults?.q2Answer || "(Tidak ada jawaban)"}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-2">
                <span className="text-xs font-bold text-neutral-500">Pertanyaan 3 (Q3)</span>
                <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {KNOWLEDGE_QUESTIONS[2]?.prompt}
                </p>
                <div className="mt-2 p-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  {surveyResults?.q3Answer || "(Tidak ada jawaban)"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Treatment Scenario Received */}
      {activeTab === "treatment" && (
        <div className="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 mb-2">
              Kondisi: {treatmentInfo?.label || `Grup ${session?.treatmentGroup}`}
            </div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Skenario Eksperimen yang Dibaca Oleh Partisipan
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Kombinasi Variabel 1 (Preferensi Klien: {treatmentInfo?.clientPreference}) dan Variabel 2 (Akuntabilitas: {treatmentInfo?.accountability})
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Variabel 1: Preferensi Klien ({treatmentInfo?.clientPreference})
              </span>
              <div className="text-xs text-neutral-700 dark:text-neutral-300 space-y-2 leading-relaxed">
                {treatmentInfo?.clientPreferenceParagraphs.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Variabel 2: Memo Manajer ({treatmentInfo?.accountability})
              </span>
              <div className="text-xs text-neutral-700 dark:text-neutral-300 space-y-2 leading-relaxed">
                {treatmentInfo?.memoParagraphs.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
