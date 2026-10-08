import Link from "next/link";
import { CaseModalTracker } from "@/components/CaseModalTracker";

const CASE_COUNT = 14;

export default function Step2CasesPage() {
  return (
    <section className="mx-auto w-full max-w-2xl">
      <p className="step-label">Langkah 2 dari 5</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
        Pencarian Kasus Acuan
      </h1>
      <div className="card mt-6">
        <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          Buka tiap kasus acuan untuk membaca detailnya — durasi pembukaan tiap
          kasus dicatat per detik di latar belakang. Setelah itu, tentukan
          ranking prioritas 1&ndash;14 dan tandai kasus yang disitasi.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: CASE_COUNT }, (_, index) => (
            <CaseModalTracker key={index + 1} caseId={index + 1} />
          ))}
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Link href="/step-3-form" className="btn-primary">
          Lanjut ke Form Rekomendasi
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
