import Link from "next/link";

export default function Step3FormPage() {
  return (
    <section className="mx-auto w-full max-w-2xl">
      <p className="step-label">Langkah 3 dari 5</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
        Form Rekomendasi Biaya
      </h1>
      <div className="card mt-6">
        <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          Form ini akan berisi 4 input nilai biaya dalam Rupiah (jasa
          konsultasi/know-how, entertainment, perbaikan, dan pemasaran) beserta
          slider tingkat keyakinan 0&ndash;100%.
        </p>
      </div>
      <div className="mt-6 flex justify-end">
        <Link href="/step-4-quiz" className="btn-primary">
          Lanjut ke Kuesioner
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
