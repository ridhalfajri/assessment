"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useExperiment } from "@/context/ExperimentContext";
import { groupDigits, parseRupiahInput, formatRupiah } from "@/lib/format";
import { isStep3GateSatisfied } from "@/lib/submit-client";
import type { Recommendations } from "@/lib/experiment";

/**
 * Konten Step 3 — Form Rekomendasi Biaya (BETE-10, PRD 3.5):
 *  - 4 input nilai Rupiah (know_how_fee, entertainment, maintenance,
 *    marketing) dengan format ribuan titik saat diketik dan validasi angka
 *    non-negatif (bukan digit/pemisah ditolak; kosong = belum terisi).
 *  - Slider tingkat keyakinan 0–100% dengan label nilai live; default 50%
 *    langsung disimpan saat halaman dibuka agar tidak menggagalkan submit.
 *  - Gerbang navigasi: tombol lanjut aktif hanya setelah keempat nilai
 *    terisi non-negatif (isStep3GateSatisfied — aturan sama dengan API).
 *  - Input terkunci saat status expired (timer habis), konsisten dengan Step 2.
 */

const FEE_FIELDS: {
  key: keyof Omit<Recommendations, "confidenceLevel">;
  label: string;
  hint: string;
}[] = [
  {
    key: "knowHowFee",
    label: "Jasa Konsultasi (Know-How Fee)",
    hint: "Nilai rekomendasi untuk akun biaya jasa konsultasi.",
  },
  {
    key: "entertainment",
    label: "Hiburan (Entertainment)",
    hint: "Nilai rekomendasi untuk akun biaya hiburan.",
  },
  {
    key: "maintenance",
    label: "Perbaikan (Maintenance)",
    hint: "Nilai rekomendasi untuk akun biaya perbaikan.",
  },
  {
    key: "marketing",
    label: "Pemasaran (Marketing)",
    hint: "Nilai rekomendasi untuk akun biaya pemasaran.",
  },
];

const CONFIDENCE_DEFAULT = 50;

export function Step3FormContent() {
  const { state, dispatch } = useExperiment();
  const { recommendations, status } = state;
  const isLocked = status !== "running";
  const isGateSatisfied = isStep3GateSatisfied(recommendations);

  // Slider punya nilai default (50%) yang langsung tersimpan — partisipan yang
  // tidak menyentuh slider tetap menghasilkan jawaban valid untuk submit.
  useEffect(() => {
    if (isLocked) return;
    if (recommendations.confidenceLevel === null) {
      dispatch({ type: "SET_RECOMMENDATIONS", patch: { confidenceLevel: CONFIDENCE_DEFAULT } });
    }
  }, [isLocked, recommendations.confidenceLevel, dispatch]);

  const setFee = (key: keyof Omit<Recommendations, "confidenceLevel">, raw: string) => {
    if (raw.trim() === "") {
      dispatch({ type: "SET_RECOMMENDATIONS", patch: { [key]: null } });
      return;
    }
    const parsed = parseRupiahInput(raw);
    if (parsed === null) return; // bukan digit/pemisah ribuan → abaikan keystroke.
    dispatch({ type: "SET_RECOMMENDATIONS", patch: { [key]: parsed } });
  };

  const total =
    (recommendations.knowHowFee ?? 0) +
    (recommendations.entertainment ?? 0) +
    (recommendations.maintenance ?? 0) +
    (recommendations.marketing ?? 0);

  const confidence = recommendations.confidenceLevel ?? CONFIDENCE_DEFAULT;

  return (
    <div className="mt-6">
      <div className="card">
        <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          Tentukan nilai rekomendasi (dalam Rupiah) untuk keempat akun biaya
          pada kasus PT Cahaya Gama, lalu nyatakan tingkat keyakinan Anda.
          Nilai yang Anda masukkan otomatis diformat per ribuan.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {FEE_FIELDS.map((field) => {
            const value = recommendations[field.key];
            const grouped = value === null ? "" : groupDigits(String(value));
            const inputId = `fee-${field.key}`;
            return (
              <div key={field.key}>
                <label htmlFor={inputId} className="block text-sm font-semibold">
                  {field.label}
                </label>
                <div
                  className={`mt-2 flex items-center gap-2 rounded-lg border bg-white px-3 shadow-sm transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-neutral-900 dark:bg-neutral-900 dark:focus-within:outline-white ${
                    value === null
                      ? "border-neutral-300 dark:border-neutral-700"
                      : "border-neutral-400 dark:border-neutral-600"
                  }`}
                >
                  <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                    Rp
                  </span>
                  <input
                    id={inputId}
                    name={inputId}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    disabled={isLocked}
                    value={grouped}
                    onChange={(event) => setFee(field.key, event.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent py-2 text-sm font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-neutral-400 disabled:opacity-50"
                  />
                </div>
                <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {value !== null ? formatRupiah(value) : field.hint}
                </p>
              </div>
            );
          })}
        </div>

        <p
          data-testid="step3-total"
          className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium tabular-nums dark:border-neutral-700 dark:bg-neutral-800"
        >
          Total alokasi: {formatRupiah(total)}
        </p>
      </div>

      <div className="card mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="confidence-slider" className="text-sm font-semibold">
            Tingkat keyakinan terhadap rekomendasi Anda
          </label>
          <span
            data-testid="step3-confidence-value"
            aria-hidden="true"
            className="text-2xl font-bold tabular-nums"
          >
            {confidence}%
          </span>
        </div>
        <input
          id="confidence-slider"
          name="confidence-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          disabled={isLocked}
          value={confidence}
          onChange={(event) =>
            dispatch({
              type: "SET_RECOMMENDATIONS",
              patch: { confidenceLevel: Number.parseInt(event.target.value, 10) },
            })
          }
          aria-valuetext={`${confidence} persen`}
          data-testid="step3-confidence-slider"
          className="mt-4 w-full accent-neutral-900 disabled:opacity-50 dark:accent-white"
        />
        <div className="mt-1 flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span>0% (sangat tidak yakin)</span>
          <span>100% (sangat yakin)</span>
        </div>
      </div>

      <div className="card mt-6">
        {isGateSatisfied ? (
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
            Keempat nilai biaya dan tingkat keyakinan sudah terisi. Anda dapat melanjutkan ke
            langkah berikutnya.
          </p>
        ) : (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Isi keempat nilai biaya (angka non-negatif) untuk melanjutkan ke kuesioner.
          </p>
        )}
        <div className="mt-4 flex justify-end">
          {isGateSatisfied ? (
            <Link href="/step-4-quiz" className="btn-primary">
              Lanjut ke Kuesioner
              <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              data-testid="step3-next-disabled"
              className="btn-primary"
            >
              Lanjut ke Kuesioner
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
