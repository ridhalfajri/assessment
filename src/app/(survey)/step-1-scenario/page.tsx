import Link from "next/link";

export default function Step1ScenarioPage() {
  return (
    <section className="mx-auto w-full max-w-2xl">
      <p className="step-label">Langkah 1 dari 5</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Skenario &amp; Memo Klien</h1>
      <div className="card mt-6">
        <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          Halaman ini akan menampilkan kasus PT Cahaya Gama beserta memo dari
          manajer. Narasinya dirender dinamis sesuai grup treatment (1&ndash;4)
          hasil random assignment saat partisipan login.
        </p>
      </div>
      <div className="mt-6 flex justify-end">
        <Link href="/step-2-cases" className="btn-primary">
          Lanjut ke Pencarian Kasus
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
