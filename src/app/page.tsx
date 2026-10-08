import { ConsentForm } from "@/components/ConsentForm";
import { CONSENT_CONTENT as C } from "@/content/consent";

/**
 * Halaman Index — Login & Informed Consent (BETE-8, PRD 3.1).
 * Logika sesi (START_SESSION + navigate) ada di <ConsentForm>.
 */
export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="card w-full max-w-xl">
        <p className="step-label">Login &amp; Informed Consent</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          {C.welcomeHeading}
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          {C.welcomeIntro}
        </p>
        <ConsentForm />
      </section>
    </main>
  );
}
