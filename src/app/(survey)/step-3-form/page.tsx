import { Step3FormContent } from "@/components/Step3FormContent";

/**
 * Step 3 — Form Rekomendasi Biaya (BETE-10, PRD 3.5): 4 input nilai Rupiah
 * dengan format ribuan + slider keyakinan 0–100%. Shell server; kontennya
 * komponen klien <Step3FormContent>.
 */
export default function Step3FormPage() {
  return (
    <section className="mx-auto w-full max-w-2xl">
      <p className="step-label">Langkah 3 dari 5</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
        Form Rekomendasi Biaya
      </h1>
      <Step3FormContent />
    </section>
  );
}
