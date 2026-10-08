"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReferenceCase } from "@/content/cases";
import { useExperiment } from "@/context/ExperimentContext";
import {
  computeElapsedSeconds,
  findRankOwner,
  getCaseLog,
  RANK_MAX,
  RANK_MIN,
} from "@/lib/case-tracking";
import { formatClock, type CaseLog } from "@/lib/experiment";

const STOPWATCH_TICK_MS = 1000;

/**
 * Kartu + modal detail kasus dengan stopwatch latar belakang (BETE-9, PRD 3.4).
 *
 * Perilaku stopwatch (keputusan desain BETE-9, menunggu konfirmasi owner):
 *  - Mulai saat modal dibuka, berhenti & tersimpan saat modal ditutup
 *    (presisi detik, dihitung dari jam dinding — bukan hitungan interval —
 *    sehingga tetap berjalan wall-clock meski tab pindah ke background).
 *  - Durasi AKUMULATIF per kasus: membuka kembali modal menambah durasi.
 *  - Tahan refresh: setiap detik durasi parsial di-dispatch ke
 *    ExperimentContext (write-through ke sessionStorage + localStorage),
 *    jadi refresh di tengah membaca paling banyak kehilangan <1 detik.
 *  - Timer global habis saat modal terbuka → durasi parsial tetap tersimpan
 *    (action SAVE_CASE_DURATION diizinkan saat status "expired") dengan
 *    is_saved/rank semula; input peringkat & sitasi terkunci.
 *
 * Kartu juga memuat kontrol peringkat 1–14 (unik — duplikat ditolak dengan
 * pesan jelas) dan checkbox sitasi (disimpan sebagai is_saved).
 */
export function CaseModalTracker({ referenceCase }: { referenceCase: ReferenceCase }) {
  const { state, dispatch } = useExperiment();
  const { caseId, title, summary, paragraphs } = referenceCase;

  const caseLog = getCaseLog(state.caseLogs, caseId);
  const isLocked = state.status !== "running";

  const [isOpen, setIsOpen] = useState(false);
  const [rankError, setRankError] = useState<string | null>(null);
  const [liveDurationSeconds, setLiveDurationSeconds] = useState(0);

  const openedAtMsRef = useRef(0);
  const baseSecondsRef = useRef(0);
  const statusRef = useRef(state.status);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  const openModal = useCallback(() => {
    baseSecondsRef.current = getCaseLog(state.caseLogs, caseId)?.durationSeconds ?? 0;
    openedAtMsRef.current = Date.now();
    setLiveDurationSeconds(baseSecondsRef.current);
    setRankError(null);
    setIsOpen(true);
  }, [state.caseLogs, caseId]);

  const closeModal = useCallback(() => {
    if (!isOpen) return;
    // Presisi detik: selisih jam dinding sejak modal dibuka, diambil TEPAT
    // saat tombol tutup ditekan (bukan nilai tick terakhir).
    const finalSeconds = computeElapsedSeconds(
      baseSecondsRef.current,
      openedAtMsRef.current,
      Date.now(),
    );
    dispatch({ type: "SAVE_CASE_DURATION", caseId, durationSeconds: finalSeconds });
    setIsOpen(false);
    // Kembalikan fokus ke pemicu agar navigasi keyboard tetap mulus.
    triggerButtonRef.current?.focus();
  }, [caseId, dispatch, isOpen]);

  // Tick stopwatch: tiap detik perbarui tampilan + simpan durasi parsial
  // (persistence engine menuliskannya ke storage — tahan refresh). Setelah
  // timer global habis, akumulasi dihentikan (waktu setelah 00:00 tidak
  // dihitung); nilai final disimpan oleh effect expiry di bawah.
  useEffect(() => {
    if (!isOpen) return;
    const intervalId = window.setInterval(() => {
      const seconds = computeElapsedSeconds(
        baseSecondsRef.current,
        openedAtMsRef.current,
        Date.now(),
      );
      setLiveDurationSeconds(seconds);
      if (statusRef.current === "running") {
        dispatch({ type: "SAVE_CASE_DURATION", caseId, durationSeconds: seconds });
      }
    }, STOPWATCH_TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [isOpen, caseId, dispatch]);

  // Timer global habis saat modal terbuka: simpan durasi parsial final TEPAT
  // saat status berubah menjadi "expired" (SAVE_CASE_DURATION diizinkan saat
  // expired) dengan is_saved/rank semula — sesuai keputusan desain BETE-9.
  useEffect(() => {
    if (state.status !== "expired" || !isOpen) return;
    dispatch({
      type: "SAVE_CASE_DURATION",
      caseId,
      durationSeconds: computeElapsedSeconds(baseSecondsRef.current, openedAtMsRef.current, Date.now()),
    });
  }, [state.status, isOpen, caseId, dispatch]);

  // Escape menutup modal.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeModal]);

  // Fokus ke tombol tutup saat modal terbuka (sinkronisasi pembaca layar).
  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen]);

  const assignRank = (rank: number) => {
    setRankError(null);
    const owner = findRankOwner(state.caseLogs, rank, caseId);
    if (owner !== null) {
      setRankError(`Peringkat ${rank} sudah dipakai Kasus ${owner}. Pilih peringkat lain.`);
      return; // Peringkat ganda tidak pernah tersimpan; select kembali ke nilai lama.
    }
    const nextLog: CaseLog = {
      caseId,
      durationSeconds: caseLog?.durationSeconds ?? 0,
      isSaved: caseLog?.isSaved ?? false,
      rank,
    };
    dispatch({ type: "UPSERT_CASE_LOG", caseLog: nextLog });
  };

  const toggleSaved = (isSaved: boolean) => {
    setRankError(null);
    const nextLog: CaseLog = {
      caseId,
      durationSeconds: caseLog?.durationSeconds ?? 0,
      isSaved,
      rank: caseLog?.rank ?? null,
    };
    dispatch({ type: "UPSERT_CASE_LOG", caseLog: nextLog });
  };

  const durationSeconds = caseLog?.durationSeconds ?? 0;
  const rank = caseLog?.rank ?? null;
  const isSaved = caseLog?.isSaved ?? false;

  return (
    <>
      <article
        aria-labelledby={`case-card-${caseId}`}
        className={`card flex h-full flex-col p-5 sm:p-6 ${isOpen ? "opacity-60" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="step-label">Kasus {caseId}</p>
          {durationSeconds > 0 && (
            <span
              data-testid={`case-duration-${caseId}`}
              className="whitespace-nowrap rounded-full border border-neutral-200 bg-neutral-100 px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              {formatClock(durationSeconds)}
            </span>
          )}
        </div>
        <h3 id={`case-card-${caseId}`} className="mt-1 text-sm font-bold leading-5 tracking-tight">
          {title}
        </h3>
        <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">{summary}</p>

        <div className="mt-3 grid grid-cols-1 gap-2">
          <label className="flex items-center justify-between gap-2 text-xs font-medium">
            <span>Peringkat prioritas</span>
            <select
              aria-label={`Peringkat prioritas Kasus ${caseId} (1–14)`}
              aria-invalid={rankError !== null}
              disabled={isLocked}
              value={rank ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "") return;
                assignRank(Number.parseInt(value, 10));
              }}
              className="w-24 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm font-semibold disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="">—</option>
              {Array.from({ length: RANK_MAX - RANK_MIN + 1 }, (_, index) => index + RANK_MIN).map(
                (optionRank) => (
                  <option key={optionRank} value={optionRank}>
                    {optionRank}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              aria-label={`Sitasi Kasus ${caseId} (Ya = dicentang, Tidak = kosong)`}
              disabled={isLocked}
              checked={isSaved}
              onChange={(event) => toggleSaved(event.target.checked)}
              className="size-4 rounded border-neutral-300 accent-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:accent-neutral-100"
            />
            <span>Disitasi (Ya)</span>
          </label>
        </div>

        {rankError && (
          <p role="alert" className="mt-2 text-xs font-medium text-red-700 dark:text-red-300">
            {rankError}
          </p>
        )}

        <button
          type="button"
          ref={triggerButtonRef}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={openModal}
          disabled={isLocked}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold transition-colors hover:border-neutral-500 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-500 dark:hover:bg-neutral-800 dark:focus-visible:outline-white"
        >
          Buka Detail Kasus
        </button>
      </article>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Detail Kasus ${caseId}: ${title}`}
          className="fixed inset-0 z-20 flex items-center justify-center p-4"
        >
          <div aria-hidden="true" className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div
            className="card relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-y-auto"
            data-testid={`case-modal-${caseId}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="step-label">
                Kasus {caseId} dari 14 — stopwatch berjalan di latar belakang
              </p>
              <time
                role="timer"
                aria-label={`Durasi baca kasus ${caseId}`}
                data-testid={`modal-stopwatch-${caseId}`}
                className="whitespace-nowrap rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-1 font-mono text-sm font-semibold tabular-nums text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                {formatClock(liveDurationSeconds)}
              </time>
            </div>
            <h2 className="mt-2 text-lg font-bold tracking-tight">{title}</h2>
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                {paragraph}
              </p>
            ))}
            <p className="mt-4 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
              Durasi pembacaan kasus ini dicatat per detik dan terakumulasi setiap kali Anda
              membuka kembali kasus — termasuk saat halaman di-refresh.
            </p>
            <div className="mt-6 flex justify-end">
              <button ref={closeButtonRef} type="button" onClick={closeModal} className="btn-primary">
                Tutup Kasus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
