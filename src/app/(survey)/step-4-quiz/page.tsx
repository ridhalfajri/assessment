import { Step4QuizContent } from "@/components/Step4QuizContent";

/**
 * Step 4 — Kuesioner (BETE-10, PRD 3.6): pilihan ganda pengetahuan perpajakan
 * (q1–q3) + skala Likert 1–5 manipulation check. Shell server; kontennya
 * komponen klien <Step4QuizContent>.
 */
export default function Step4QuizPage() {
  return (
    <section className="mx-auto w-full max-w-2xl">
      <p className="step-label">Langkah 4 dari 5</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Kuesioner</h1>
      <Step4QuizContent />
    </section>
  );
}
