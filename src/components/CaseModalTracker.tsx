"use client";

import { useEffect, useState } from "react";

type CaseModalTrackerProps = {
  caseId: number;
  title?: string;
};

// TODO(BETE-9): stopwatch latar belakang per kasus (presisi detik) — mulai saat
// modal dibuka, berhenti saat ditutup, lalu push durationSeconds ke ExperimentContext.
export function CaseModalTracker({ caseId, title }: CaseModalTrackerProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium transition-colors hover:border-neutral-400 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-500 dark:hover:bg-neutral-800 dark:focus-visible:outline-white"
      >
        Kasus {caseId}
        {title ? <span className="block text-xs text-neutral-500 dark:text-neutral-400">{title}</span> : null}
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Detail Kasus ${caseId}`}
          className="fixed inset-0 z-20 flex items-center justify-center p-4"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          <div className="card relative w-full max-w-lg">
            <p className="step-label">Stub — Kasus {caseId}</p>
            <h2 className="mt-2 text-lg font-bold tracking-tight">
              {title ?? `Detail Kasus Acuan ${caseId}`}
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              Isi detail kasus acuan pajak akan dirender di sini. Durasi pembacaan
              kasus ini akan dicatat per detik di latar belakang.
            </p>
            <button type="button" onClick={() => setIsOpen(false)} className="btn-primary mt-6">
              Tutup Kasus
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
