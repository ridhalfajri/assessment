export default function DebriefingPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="card w-full max-w-xl">
        <p className="step-label">Eksperimen Selesai</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Terima kasih atas partisipasi Anda
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          Halaman debriefing akan menjelaskan tujuan penelitian dan tujuan
          setiap langkah yang baru saja Anda ikuti. Global timer berhenti pada
          halaman ini.
        </p>
      </section>
    </main>
  );
}
