import { Suspense } from "react";
import { ScenarioContent } from "@/components/ScenarioContent";

/**
 * Step 1 — Skenario & Memo Klien (BETE-8). Shell server; kontennya komponen
 * klien <ScenarioContent> (dibungkus Suspense karena memakai useSearchParams
 * untuk override grup dev).
 */
export default function Step1ScenarioPage() {
  return (
    <section className="mx-auto w-full max-w-2xl">
      <p className="step-label">Langkah 1 dari 5</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
        Skenario &amp; Memo Klien
      </h1>
      <Suspense
        fallback={<p className="card mt-6 text-sm text-neutral-500 dark:text-neutral-400">Memuat…</p>}
      >
        <ScenarioContent />
      </Suspense>
    </section>
  );
}
