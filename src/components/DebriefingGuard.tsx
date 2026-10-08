"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExperiment } from "@/context/ExperimentContext";
import { pathForStep } from "@/lib/experiment";

/**
 * Pengaman anti-cheat halaman debriefing (BETE-10): debriefing adalah halaman
 * AKHIR setelah submit berhasil — partisipan yang masih berada di tengah
 * eksperimen (status "running") tidak boleh melompat ke sini lewat URL
 * langsung; dipulihkan ke langkah terakhirnya. Setelah submit (status
 * "submitted") atau setelah sesi berakhir ("expired"), maupun setelah reload
 * (storage bersih → status "idle"), halaman ini tetap ditampilkan.
 *
 * Merender null — murni logika sisi klien.
 */
export function DebriefingGuard() {
  const { state, isRehydrated } = useExperiment();
  const router = useRouter();

  useEffect(() => {
    if (!isRehydrated) return;
    if (state.status === "running") {
      router.replace(pathForStep(Math.max(state.sessionData.currentStep, 1)));
    }
  }, [isRehydrated, state.status, state.sessionData.currentStep, router]);

  return null;
}
