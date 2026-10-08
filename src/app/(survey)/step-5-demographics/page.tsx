import Link from "next/link";

export default function Step5DemographicsPage() {
  return (
    <section className="mx-auto w-full max-w-2xl">
      <p className="step-label">Langkah 5 dari 5</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Demografi</h1>
      <div className="card mt-6">
        <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          Form profil partisipan (usia, gender, pendidikan) termasuk Nomor HP
          untuk pengiriman insentif pulsa. Dari halaman ini, seluruh data
          eksperimen dikirim sekaligus (batch) ke Supabase sebelum masuk ke
          halaman debriefing.
        </p>
      </div>
      <div className="mt-6 flex justify-end">
        <Link href="/debriefing" className="btn-primary">
          Kirim &amp; Selesai
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
