"use client";

import { useRouter } from "next/navigation";
import { useExperiment } from "@/context/ExperimentContext";
import { assignTreatmentGroup, createParticipantId, pathForStep } from "@/lib/experiment";

/**
 * Tombol submit informed consent: memicu random assignment SEKALI —
 * participantId (uuid-v4) dibuat, assignTreatmentGroup() dipanggil, deadline
 * absolut timer di-set — semuanya dikunci di state oleh reducer. Klik ulang
 * saat sesi berjalan TIDAK me-restart timer; partisipan dilanjutkan ke
 * langkah terakhirnya. (Halaman login/consent lengkap dibangun di BETE-8.)
 */
export function StartExperimentButton() {
  const { state, dispatch } = useExperiment();
  const router = useRouter();
  const { status } = state;
  const { currentStep } = state.sessionData;

  const handleClick = () => {
    if (status === "running") {
      // Sesi masih berjalan (mis. kembali dari refresh): lanjut, jangan reset.
      router.push(pathForStep(Math.max(currentStep, 1)));
      return;
    }
    if (status === "expired") {
      // Waktu habis: tidak ada sesi baru; langsung ke debriefing.
      router.replace("/debriefing");
      return;
    }
    // idle atau submitted (storage sudah dibersihkan) → sesi baru.
    dispatch({
      type: "START_SESSION",
      participantId: createParticipantId(),
      treatmentGroupId: assignTreatmentGroup(),
      nowMs: Date.now(),
    });
    router.push("/step-1-scenario");
  };

  return (
    <button type="button" onClick={handleClick} className="btn-primary mt-8 w-full">
      {status === "running" ? "Lanjutkan Eksperimen" : "Mulai Eksperimen"}
      <span aria-hidden="true">→</span>
    </button>
  );
}
