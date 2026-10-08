import { Step2CasesContent } from "@/components/Step2CasesContent";

/**
 * Step 2 — Information Search (BETE-9, PRD 3.4): daftar 14 kasus acuan,
 * stopwatch latar belakang per kasus (CaseModalTracker), ranking prioritas
 * 1–14 unik, dan sitasi Ya/Tidak. Shell server; kontennya komponen klien.
 */
export default function Step2CasesPage() {
  return (
    <section className="mx-auto w-full max-w-4xl">
      <p className="step-label">Langkah 2 dari 5</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
        Pencarian Kasus Acuan
      </h1>
      <Step2CasesContent />
    </section>
  );
}
