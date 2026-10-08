"use client";

import Link from "next/link";
import { CASE_COUNT, REFERENCE_CASES } from "@/content/cases";
import { useExperiment } from "@/context/ExperimentContext";
import { CaseModalTracker } from "@/components/CaseModalTracker";
import { countRankedCases, getCaseLog, isStep2GateSatisfied } from "@/lib/case-tracking";

/**
 * Konten Step 2 — Information Search (BETE-9):
 *  - 14 kartu kasus (konten dari src/content/cases.ts — placeholder sampai
 *    naskah final owner diserahkan; komponen tidak memuat teks kasus).
 *  - Tiap kartu: tombol buka modal (stopwatch per kasus), select peringkat
 *    1–14 unik (duplikat ditolak dengan pesan), checkbox sitasi (is_saved).
 *  - Gerbang navigasi: tombol lanjut aktif hanya setelah SEMUA kasus punya
 *    catatan di caseLogs dan peringkat 1–14 terpasang unik (permutasi penuh).
 *    Karena sitasi tersimpan sebagai is_saved per kasus (default Tidak),
 *    syarat ini sekaligus memastikan setiap kasus punya status sitasi.
 */
export function Step2CasesContent() {
  const { state } = useExperiment();
  const { caseLogs, status } = state;
  const isLocked = status !== "running";

  const rankedCount = countRankedCases(caseLogs, CASE_COUNT);
  const loggedCount = REFERENCE_CASES.filter(
    (referenceCase) => getCaseLog(caseLogs, referenceCase.caseId) !== undefined,
  ).length;
  const isGateSatisfied = isStep2GateSatisfied(caseLogs, CASE_COUNT);

  return (
    <div className="mt-6">
      <div className="card">
        <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          Buka tiap kasus acuan untuk membaca detailnya — durasi pembacaan tiap
          kasus dicatat per detik di latar belakang dan terakumulasi setiap kali
          Anda membuka kembali kasus. Setelah itu, tetapkan{" "}
          <strong>peringkat prioritas 1–14 yang unik</strong> (satu peringkat
          hanya untuk satu kasus) dan tandai kasus yang akan Anda sitasi.
        </p>
        <p
          data-testid="step2-progress"
          className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium tabular-nums dark:border-neutral-700 dark:bg-neutral-800"
        >
          Kasus tercatat: {loggedCount}/{CASE_COUNT} &middot; Peringkat terisi:{" "}
          {rankedCount}/{CASE_COUNT}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REFERENCE_CASES.map((referenceCase) => (
          <CaseModalTracker key={referenceCase.caseId} referenceCase={referenceCase} />
        ))}
      </div>

      <div className="card mt-6">
        {isGateSatisfied ? (
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
            Semua {CASE_COUNT} kasus memiliki peringkat unik dan status sitasi. Anda dapat
            melanjutkan ke langkah berikutnya.
          </p>
        ) : (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {rankedCount < CASE_COUNT
              ? `Lengkapi peringkat untuk semua ${CASE_COUNT} kasus (baru ${rankedCount} yang terisi). Setiap peringkat 1–14 hanya boleh dipakai satu kasus.`
              : "Peringkat belum unik — pastikan setiap kasus memakai peringkat 1–14 yang berbeda."}
          </p>
        )}
        <div className="mt-4 flex justify-end">
          {isGateSatisfied ? (
            <Link href="/step-3-form" className="btn-primary">
              Lanjut ke Form Rekomendasi
              <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              data-testid="step2-next-disabled"
              className="btn-primary"
            >
              Lanjut ke Form Rekomendasi
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
        {isLocked && (
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Waktu eksperimen telah habis — jawaban dikunci.
          </p>
        )}
      </div>
    </div>
  );
}
