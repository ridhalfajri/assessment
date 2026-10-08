import { Step5DemographicsContent } from "@/components/Step5DemographicsContent";

/**
 * Step 5 — Demografi + Submit Batch (BETE-10, PRD 3.7): profil partisipan
 * termasuk No. HP untuk insentif pulsa, lalu tombol final mengirim seluruh
 * state ke /api/submit-survey sebelum masuk halaman debriefing. Shell server;
 * kontennya komponen klien <Step5DemographicsContent>.
 */
export default function Step5DemographicsPage() {
  return (
    <section className="mx-auto w-full max-w-2xl">
      <p className="step-label">Langkah 5 dari 5</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Demografi</h1>
      <Step5DemographicsContent />
    </section>
  );
}
