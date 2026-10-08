import { DebriefingGuard } from "@/components/DebriefingGuard";
import { DEBRIEFING_CONTENT as C } from "@/content/debriefing";

/**
 * Halaman Debriefing (BETE-10, PRD 3.8): penjelasan riset setelah survei —
 * tanpa tombol kembali ke survei, di luar route group (survey) sehingga
 * bebas header/global timer. Konten dari src/content/debriefing.ts
 * (placeholder sampai naskah final owner diserahkan).
 *
 * DebriefingGuard mencegah lompatan ke halaman ini lewat URL selama sesi
 * masih berjalan (belum submit).
 */
export default function DebriefingPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <DebriefingGuard />
      <section className="card w-full max-w-xl">
        <p className="step-label">Eksperimen Selesai</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{C.heading}</h1>
        {C.introParagraphs.map((paragraph, index) => (
          <p key={`intro-${index}`} className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            {paragraph}
          </p>
        ))}

        <h2 className="mt-6 text-base font-semibold">Tentang eksperimen ini</h2>
        {C.designParagraphs.map((paragraph, index) => (
          <p key={`design-${index}`} className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            {paragraph}
          </p>
        ))}

        <h2 className="mt-6 text-base font-semibold">Data &amp; kerahasiaan</h2>
        {C.dataParagraphs.map((paragraph, index) => (
          <p key={`data-${index}`} className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            {paragraph}
          </p>
        ))}

        <p className="mt-6 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {C.incentiveParagraph}
        </p>
        <p className="mt-4 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
          {C.contactParagraph}
        </p>
        <p className="mt-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
          Anda dapat menutup halaman ini dengan aman.
        </p>
      </section>
    </main>
  );
}
