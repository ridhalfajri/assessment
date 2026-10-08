"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useExperiment } from "@/context/ExperimentContext";
import { EDUCATION_OPTIONS, GENDER_OPTIONS } from "@/content/demographics";
import {
  buildSubmitRequest,
  getDemographicsFieldErrors,
  postSubmitSurvey,
  SubmitRequestError,
} from "@/lib/submit-client";

/**
 * Konten Step 5 — Demografi + Submit Batch (BETE-10, PRD 3.7 & 3.8):
 *  - Form profil partisipan: usia, gender, pendidikan, afiliasi, dan No. HP
 *    (krusial untuk distribusi insentif pulsa; format Indonesia divalidasi
 *    dengan aturan yang SAMA dengan API — sub-skema zod kontrak dipakai
 *    langsung, tanpa duplikasi regex). Username dari halaman login sudah
 *    tersimpan di state (ditampilkan sebagai konfirmasi identitas).
 *  - Tombol final mengirim SELURUH state (POST /api/submit-survey) dalam satu
 *    panggilan: UI loading, error handling dengan tombol retry (idempoten di
 *    server — participantId sama tidak pernah menduplikasi baris).
 *  - Setelah sukses (created ATAU already_submitted): MARK_SUBMITTED → state
 *    persisten (sessionStorage + localStorage) dibersihkan oleh engine,
 *    peringatan beforeunload berhenti (guard melepas listener), lalu navigate
 *    (replace) ke halaman debriefing.
 */

type SubmitUiState = "idle" | "submitting" | "error";

export function Step5DemographicsContent() {
  const { state, dispatch } = useExperiment();
  const router = useRouter();
  const { demographics, status } = state;
  const isLocked = status !== "running";

  const [uiState, setUiState] = useState<SubmitUiState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = getDemographicsFieldErrors(demographics);
  const hasErrors = Object.keys(errors).length > 0;
  const isSubmitting = uiState === "submitting";

  const markTouched = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSubmit = async () => {
    if (isSubmitting) return; // pengaman double-click; server tetap idempoten.
    setUiState("submitting");
    setErrorMessage(null);
    try {
      await postSubmitSurvey(buildSubmitRequest(state, { isComplete: true }));
      // Sukses: bersihkan storage persisten + matikan beforeunload (status
      // "submitted"), lalu keluar dari alur survei (replace, bukan push).
      dispatch({ type: "MARK_SUBMITTED" });
      router.replace("/debriefing");
    } catch (err) {
      setUiState("error");
      setErrorMessage(
        err instanceof SubmitRequestError
          ? err.message
          : "Terjadi kesalahan tak terduga. Silakan coba lagi.",
      );
    }
  };

  const setAge = (raw: string) => {
    if (raw.trim() === "") {
      dispatch({ type: "SET_DEMOGRAPHICS", patch: { age: null } });
      return;
    }
    if (!/^\d+$/.test(raw)) return; // hanya digit bulat.
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isSafeInteger(parsed)) return;
    dispatch({ type: "SET_DEMOGRAPHICS", patch: { age: parsed } });
  };

  const errorText = (field: keyof typeof errors) =>
    touched[field] && errors[field] ? (
      <p id={`${field}-error`} role="alert" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
        {errors[field]}
      </p>
    ) : null;

  const inputClass = (field: keyof typeof errors) =>
    `mt-2 block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:opacity-50 dark:bg-neutral-900 dark:focus-visible:outline-white ${
      touched[field] && errors[field]
        ? "border-red-400 dark:border-red-700"
        : "border-neutral-300 dark:border-neutral-700"
    }`;

  return (
    <div className="mt-6">
      <div className="card">
        <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          Terakhir, lengkapi data profil Anda.{" "}
          <strong>No. HP wajib diisi</strong> semata untuk pengiriman insentif
          pulsa dan dijaga kerahasiaannya.
        </p>
        {demographics.username !== null && (
          <p
            data-testid="step5-username"
            className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            Username: <span className="font-semibold">{demographics.username}</span>
          </p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="demo-age" className="block text-sm font-semibold">
              Usia (tahun)
            </label>
            <input
              id="demo-age"
              name="demo-age"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              disabled={isLocked || isSubmitting}
              value={demographics.age === null ? "" : String(demographics.age)}
              onChange={(event) => setAge(event.target.value)}
              onBlur={() => markTouched("age")}
              aria-invalid={Boolean(touched.age && errors.age) || undefined}
              aria-describedby="demo-age-error"
              placeholder="mis. 28"
              className={inputClass("age")}
            />
            {errorText("age")}
          </div>

          <div>
            <label htmlFor="demo-gender" className="block text-sm font-semibold">
              Jenis kelamin
            </label>
            <select
              id="demo-gender"
              name="demo-gender"
              disabled={isLocked || isSubmitting}
              value={demographics.gender ?? ""}
              onChange={(event) =>
                dispatch({
                  type: "SET_DEMOGRAPHICS",
                  patch: { gender: event.target.value === "" ? null : event.target.value },
                })
              }
              onBlur={() => markTouched("gender")}
              aria-invalid={Boolean(touched.gender && errors.gender) || undefined}
              aria-describedby="demo-gender-error"
              className={inputClass("gender")}
            >
              <option value="">— Pilih —</option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errorText("gender")}
          </div>

          <div>
            <label htmlFor="demo-education" className="block text-sm font-semibold">
              Pendidikan terakhir
            </label>
            <select
              id="demo-education"
              name="demo-education"
              disabled={isLocked || isSubmitting}
              value={demographics.education ?? ""}
              onChange={(event) =>
                dispatch({
                  type: "SET_DEMOGRAPHICS",
                  patch: { education: event.target.value === "" ? null : event.target.value },
                })
              }
              onBlur={() => markTouched("education")}
              aria-invalid={Boolean(touched.education && errors.education) || undefined}
              aria-describedby="demo-education-error"
              className={inputClass("education")}
            >
              <option value="">— Pilih —</option>
              {EDUCATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errorText("education")}
          </div>

          <div>
            <label htmlFor="demo-affiliation" className="block text-sm font-semibold">
              Afiliasi
            </label>
            <input
              id="demo-affiliation"
              name="demo-affiliation"
              type="text"
              autoComplete="off"
              maxLength={200}
              disabled={isLocked || isSubmitting}
              value={demographics.affiliation ?? ""}
              onChange={(event) =>
                dispatch({
                  type: "SET_DEMOGRAPHICS",
                  patch: { affiliation: event.target.value },
                })
              }
              onBlur={() => markTouched("affiliation")}
              aria-invalid={Boolean(touched.affiliation && errors.affiliation) || undefined}
              aria-describedby="demo-affiliation-error"
              placeholder="mis. KAP, perusahaan, atau institusi"
              className={inputClass("affiliation")}
            />
            {errorText("affiliation")}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="demo-phone" className="block text-sm font-semibold">
              No. HP
            </label>
            <input
              id="demo-phone"
              name="demo-phone"
              type="tel"
              autoComplete="tel"
              maxLength={25}
              disabled={isLocked || isSubmitting}
              value={demographics.phoneNumber ?? ""}
              onChange={(event) =>
                dispatch({
                  type: "SET_DEMOGRAPHICS",
                  patch: { phoneNumber: event.target.value },
                })
              }
              onBlur={() => markTouched("phoneNumber")}
              aria-invalid={Boolean(touched.phoneNumber && errors.phoneNumber) || undefined}
              aria-describedby="demo-phone-hint demo-phone-error"
              placeholder="081234567890"
              className={inputClass("phoneNumber")}
            />
            <p id="demo-phone-hint" className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              Format Indonesia: diawali 08 atau +62 (contoh: 081234567890). Digunakan hanya
              untuk pengiriman insentif pulsa.
            </p>
            {errorText("phoneNumber")}
          </div>
        </div>
      </div>

      <div className="card mt-6">
        {uiState === "error" && errorMessage !== null ? (
          <div
            role="alert"
            data-testid="step5-error"
            className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950"
          >
            <p className="text-sm font-semibold text-red-900 dark:text-red-200">
              Pengiriman data gagal
            </p>
            <p className="mt-1 text-sm leading-6 text-red-800 dark:text-red-300">{errorMessage}</p>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              data-testid="step5-retry"
              className="btn-primary mt-4"
            >
              Coba Lagi
            </button>
          </div>
        ) : hasErrors ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Lengkapi seluruh isian di atas (usia, jenis kelamin, pendidikan,
            afiliasi, dan No. HP yang valid) untuk mengirim data Anda.
          </p>
        ) : (
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
            Semua isian lengkap. Tekan tombol di bawah untuk mengirim seluruh
            jawaban eksperimen Anda sekaligus dan membuka halaman penutup.
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isLocked || isSubmitting || hasErrors}
            data-testid="step5-submit"
            className="btn-primary w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <span
                  aria-hidden="true"
                  className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-neutral-600 dark:border-t-neutral-900"
                />
                Mengirim data…
              </>
            ) : (
              <>
                Kirim &amp; Selesai
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Data dikirim satu kali secara batch. Jika pengiriman gagal, tombol
          kirim ulang aman ditekan — server tidak akan menduplikasi data Anda.
        </p>
        {isLocked && (
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Waktu eksperimen telah habis — jawaban dikunci.
          </p>
        )}
      </div>
    </div>
  );
}
