import { StartExperimentButton } from "@/components/StartExperimentButton";

const consentPoints = [
  "Saya memahami bahwa eksperimen ini berlangsung 40 menit dengan timer global yang tidak dapat dijeda.",
  "Saya memahami bahwa alur eksperimen bersifat satu arah — saya tidak dapat kembali ke halaman sebelumnya.",
  "Data saya digunakan hanya untuk keperluan penelitian dan dijaga kerahasiaannya.",
  "Saya berhak menerima insentif pulsa setelah menyelesaikan seluruh rangkaian eksperimen.",
];

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="card w-full max-w-xl">
        <p className="step-label">Login &amp; Informed Consent</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Selamat datang, Partisipan
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          Masuk dengan kredensial yang diberikan peneliti, lalu setujui
          persyaratan berikut untuk memulai simulasi studi kasus.
        </p>
        <ul className="mt-6 space-y-3">
          {consentPoints.map((point) => (
            <li key={point} className="flex gap-3 text-sm leading-6">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-neutral-400" />
              <span className="text-neutral-600 dark:text-neutral-400">{point}</span>
            </li>
          ))}
        </ul>
        <StartExperimentButton />
      </section>
    </main>
  );
}
