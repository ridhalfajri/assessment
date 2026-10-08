"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useExperiment } from "@/context/ExperimentContext";
import {
  buildSubmitPayload,
  formatClock,
} from "@/lib/experiment";

// TODO(BETE-6) sudah diimplementasikan: countdown 40:00 lintas halaman yang
// tahan refresh. Sisa waktu selalu dihitung dari deadline absolut (bukan
// dikurangi tiap detik) sehingga tidak drift meski tab di-throttle browser.
// Saat mencapai 00:00 (default proposal, menunggu konfirmasi owner):
// kunci input (status "expired"), auto-submit data terisi dengan flag
// tidak-lengkap, lalu langsung ke halaman debriefing.

const TICK_INTERVAL_MS = 1000;
/** Batas warna merah: 5 menit terakhir. */
const URGENT_THRESHOLD_SECONDS = 5 * 60;

export function GlobalTimer() {
  const { state, dispatch } = useExperiment();
  const router = useRouter();
  const { status, sessionData } = state;
  const remaining = sessionData.globalTimeRemaining;

  // Detak per detik — hanya saat sesi berjalan dan deadline sudah ada.
  useEffect(() => {
    if (status !== "running" || sessionData.deadlineTimestamp === null) return;
    const intervalId = window.setInterval(() => {
      dispatch({ type: "TICK", nowMs: Date.now() });
    }, TICK_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [status, sessionData.deadlineTimestamp, dispatch]);

  // Alur expired: kunci input → auto-submit best-effort → debriefing.
  // Effect tunggal dengan guard status mencegah trigger ganda.
  const autoSubmitFiredRef = useRef(false);
  useEffect(() => {
    if (status !== "running" || remaining > 0 || autoSubmitFiredRef.current) return;
    autoSubmitFiredRef.current = true;
    dispatch({ type: "EXPIRE" });
    // Auto-submit data yang sudah terisi dengan flag tidak-lengkap.
    // Best-effort: kegagalan API tidak menghalangi debriefing (API-nya
    // diimplementasikan di BETE-7, pemanggil final di BETE-10).
    void fetch("/api/submit-survey", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildSubmitPayload(state, { isComplete: false })),
    }).catch(() => {});
    // replace (bukan push) agar back button tidak mengembalikan ke survey.
    router.replace("/debriefing");
  }, [status, remaining, dispatch, router, state]);

  const isUrgent = status === "running" && remaining <= URGENT_THRESHOLD_SECONDS;

  return (
    <time
      role="timer"
      aria-label="Sisa waktu eksperimen"
      aria-live="off"
      data-testid="global-timer"
      className={`rounded-full border px-3 py-1 font-mono text-sm font-semibold tabular-nums ${
        isUrgent
          ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
          : "border-neutral-200 bg-neutral-100 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
      }`}
    >
      {formatClock(remaining)}
    </time>
  );
}
