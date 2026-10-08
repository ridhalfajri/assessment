import { GlobalTimer } from "@/components/GlobalTimer";

// Header global + slot Global Timer untuk seluruh langkah eksperimen.
// Anti-cheat (blokir back, beforeunload, persistensi) menyusul di BETE-6.
export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <p className="text-sm font-semibold tracking-tight">Simulasi Studi Kasus Daring</p>
          <GlobalTimer />
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
