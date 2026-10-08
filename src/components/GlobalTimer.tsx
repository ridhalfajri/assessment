"use client";

import { useExperiment } from "@/context/ExperimentContext";

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// TODO(BETE-6): countdown aktif yang berjalan lintas halaman, tahan refresh (F5),
// dan berhenti setelah submit selesai.
export function GlobalTimer() {
  const { state } = useExperiment();
  const remaining = state.sessionData.globalTimeRemaining;

  return (
    <time
      aria-label="Sisa waktu eksperimen"
      className="rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 font-mono text-sm font-semibold tabular-nums dark:border-neutral-700 dark:bg-neutral-800"
    >
      {formatClock(remaining)}
    </time>
  );
}
