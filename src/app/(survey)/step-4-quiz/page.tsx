import Link from "next/link";

export default function Step4QuizPage() {
  return (
    <section className="mx-auto w-full max-w-2xl">
      <p className="step-label">Langkah 4 dari 5</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Kuesioner</h1>
      <div className="card mt-6">
        <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          Halaman ini akan berisi pertanyaan pilihan ganda terkait pengetahuan
          perpajakan dan skala Likert 1&ndash;5 untuk manipulation check.
        </p>
      </div>
      <div className="mt-6 flex justify-end">
        <Link href="/step-5-demographics" className="btn-primary">
          Lanjut ke Demografi
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
