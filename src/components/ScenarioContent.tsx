"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useExperiment } from "@/context/ExperimentContext";
import {
  SCENARIO_CONTENT,
  TOTAL_PROBLEM_EXPENSE_RP,
} from "@/content/scenario";
import { getTreatmentContent } from "@/content/treatments";
import { parseDevGroupOverride } from "@/lib/dev-override";
import { formatRupiah } from "@/lib/format";

/**
 * Konten Step 1 — Skenario & Memo (BETE-8, PRD 3.3):
 *   - Kasus dasar PT Cahaya Gama (4 akun biaya bermasalah, total Rp1 M)
 *     dari src/content/scenario.ts — sama untuk semua grup.
 *   - Pesan klien & memo manajer DINAMIS per treatmentGroupId dari
 *     src/content/treatments.ts (matriks 2×2). Tidak ada teks treatment
 *     di komponen ini — komponen hanya memilih objek per grup.
 *
 * Override grup dev: query param `?group=1..4` (hanya di luar produksi,
 * lihat parseDevGroupOverride) untuk memeriksa keempat varian teks.
 */
export function ScenarioContent() {
  const { state } = useExperiment();
  const searchParams = useSearchParams();

  // process.env.NODE_ENV di-inline Next.js saat build; argumen disuntikkan agar
  // helper murni dan bisa di-unit-test.
  const devOverride = parseDevGroupOverride(
    searchParams.get("group"),
    process.env.NODE_ENV !== "production",
  );
  const groupId = devOverride ?? state.sessionData.treatmentGroupId;

  // Belum ada grup (mis. render pertama sebelum rehidrasi, atau status idle
  // yang segera dialihkan AntiCheatGuard ke halaman login).
  if (groupId === null) {
    return (
      <p className="card mt-6 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
        Memuat skenario…
      </p>
    );
  }

  const treatment = getTreatmentContent(groupId);

  return (
    <div className="mt-6 space-y-6">
      {devOverride !== null && (
        <p
          role="status"
          className="rounded-lg border border-sky-300 bg-sky-50 p-3 text-xs font-medium text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300"
        >
          [DEV] Override grup {devOverride} aktif{" "}
          {state.sessionData.treatmentGroupId !== null &&
            state.sessionData.treatmentGroupId !== devOverride &&
            `(grup asli hasil random assignment: ${state.sessionData.treatmentGroupId})`}{" "}
          — kondisi: {treatment.label}. Hanya tersedia di lingkungan non-produksi.
        </p>
      )}

      {/* Skenario: kasus dasar PT Cahaya Gama (sama untuk semua grup). */}
      <article className="card" aria-labelledby="scenario-heading">
        <h2 id="scenario-heading" className="text-lg font-bold tracking-tight">
          Skenario: {SCENARIO_CONTENT.companyName}
        </h2>
        {SCENARIO_CONTENT.introParagraphs.map((paragraph, index) => (
          <p key={index} className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            {paragraph}
          </p>
        ))}

        <table className="mt-5 w-full border-collapse text-sm">
          <caption className="sr-only">
            Empat akun biaya bermasalah {SCENARIO_CONTENT.companyName}
          </caption>
          <thead>
            <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
              <th scope="col" className="py-2 pr-4 font-semibold">
                Akun biaya
              </th>
              <th scope="col" className="py-2 text-right font-semibold tabular-nums">
                Nilai
              </th>
            </tr>
          </thead>
          <tbody>
            {SCENARIO_CONTENT.accounts.map((account) => (
              <tr key={account.id} className="border-b border-neutral-100 dark:border-neutral-800/60">
                <th scope="row" className="py-2 pr-4 text-left font-normal">
                  {account.label}
                </th>
                <td className="py-2 text-right tabular-nums">{formatRupiah(account.amountRp)}</td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="py-2 pr-4 text-left font-semibold">
                {SCENARIO_CONTENT.totalLabel}
              </th>
              <td className="py-2 text-right font-semibold tabular-nums">
                {formatRupiah(TOTAL_PROBLEM_EXPENSE_RP)}
              </td>
            </tr>
          </tbody>
        </table>

        {SCENARIO_CONTENT.taskParagraphs.map((paragraph, index) => (
          <p key={index} className="mt-4 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            {paragraph}
          </p>
        ))}
      </article>

      {/* Variabel 1 — teks preferensi klien (dinamis per grup). */}
      <article className="card" aria-labelledby="client-message-heading">
        <h2 id="client-message-heading" className="text-lg font-bold tracking-tight">
          Pesan dari Klien
        </h2>
        {treatment.clientPreferenceParagraphs.map((paragraph, index) => (
          <p key={index} className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            {paragraph}
          </p>
        ))}
      </article>

      {/* Variabel 2 — memo manajer (dinamis per grup), ditata seperti memo. */}
      <article
        className="card border-l-4 border-l-neutral-900 dark:border-l-white"
        aria-labelledby="memo-heading"
      >
        <h2 id="memo-heading" className="text-lg font-bold tracking-tight">
          Memo dari Manajer
        </h2>
        {treatment.memoParagraphs.map((paragraph, index) => (
          <p key={index} className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            {paragraph}
          </p>
        ))}
      </article>

      <div className="flex justify-end">
        <Link href="/step-2-cases" className="btn-primary">
          Lanjut ke Pencarian Kasus
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
