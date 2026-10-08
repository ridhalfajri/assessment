"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useExperiment } from "@/context/ExperimentContext";
import { assignTreatmentGroup, createParticipantId, pathForStep } from "@/lib/experiment";
import { CONSENT_CONTENT as C } from "@/content/consent";

/**
 * Form Login & Informed Consent (BETE-8, PRD 3.1):
 *   - input username (identitas partisipan, disimpan ke demographics.username
 *     untuk kolom participants.username yang NOT NULL),
 *   - teks informed consent lengkap + janji insentif pulsa
 *     (konten di src/content/consent.ts),
 *   - checkbox persetujuan WAJIB — tombol mulai tidak aktif sebelum dicentang.
 *
 * Saat consent disetujui (submit): generate participantId (uuid v4), random
 * assignment grup 1–4, mulai global timer (deadline absolut via START_SESSION),
 * simpan username, lalu navigate ke /step-1-scenario — semuanya lewat
 * ExperimentContext. Sesi berjalan tidak pernah di-reset: refresh di halaman
 * ini menampilkan panel lanjutkan.
 */
export function ConsentForm() {
  const { state, dispatch, isRehydrated } = useExperiment();
  const router = useRouter();
  const { status } = state;
  const { currentStep } = state.sessionData;

  const [username, setUsername] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // --- Sesi berjalan (mis. partisipan refresh saat eksperimen): lanjutkan. ---
  if (isRehydrated && status === "running") {
    return (
      <div className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950">
        <h2 className="text-base font-semibold text-amber-900 dark:text-amber-200">
          {C.resumeHeading}
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-800 dark:text-amber-300">{C.resumeBody}</p>
        <button
          type="button"
          onClick={() => router.push(pathForStep(Math.max(currentStep, 1)))}
          className="btn-primary mt-4 w-full"
        >
          {C.resumeButtonLabel}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    );
  }

  // --- Waktu habis: tidak ada sesi baru; arahkan ke debriefing. --------------
  if (isRehydrated && status === "expired") {
    return (
      <div className="mt-8 rounded-xl border border-red-300 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950">
        <h2 className="text-base font-semibold text-red-900 dark:text-red-200">
          {C.expiredHeading}
        </h2>
        <p className="mt-2 text-sm leading-6 text-red-800 dark:text-red-300">{C.expiredBody}</p>
        {/* replace agar back tidak mengembalikan ke alur eksperimen. */}
        <button
          type="button"
          onClick={() => router.replace("/debriefing")}
          className="btn-primary mt-4 w-full"
        >
          {C.expiredButtonLabel}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    );
  }

  // --- Sesi submitted (masih di memori tab): sesi sudah selesai. -------------
  if (isRehydrated && status === "submitted") {
    return (
      <div className="mt-8 rounded-xl border border-neutral-200 bg-neutral-100 p-5 dark:border-neutral-800 dark:bg-neutral-800">
        <p className="text-sm leading-6 text-neutral-700 dark:text-neutral-300">
          {C.submittedBody}
        </p>
        <button
          type="button"
          onClick={() => router.push("/debriefing")}
          className="btn-primary mt-4 w-full"
        >
          {C.submittedButtonLabel}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    );
  }

  // --- idle / submitted-setelah-reload (storage dibersihkan): form consent. --
  const usernameTrimmed = username.trim();
  const usernameInvalid = submitted && usernameTrimmed.length === 0;
  const consentInvalid = submitted && !agreed;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (!agreed || usernameTrimmed.length === 0) return;
    // Sesi baru: participantId uuid v4 + random assignment grup 1–4 + deadline
    // absolut timer — semuanya dikunci oleh reducer via START_SESSION. Urutan
    // dispatch penting: SET_DEMOGRAPHICS hanya diproses saat status "running".
    dispatch({
      type: "START_SESSION",
      participantId: createParticipantId(),
      treatmentGroupId: assignTreatmentGroup(),
      nowMs: Date.now(),
    });
    dispatch({ type: "SET_DEMOGRAPHICS", patch: { username: usernameTrimmed } });
    router.push("/step-1-scenario");
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8">
      <div>
        <label htmlFor="username" className="block text-sm font-semibold">
          {C.usernameLabel}
        </label>
        <input
          id="username"
          name="username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="off"
          maxLength={100}
          required
          aria-invalid={usernameInvalid || undefined}
          aria-describedby="username-hint username-error"
          className={`mt-2 block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:bg-neutral-900 dark:focus-visible:outline-white ${
            usernameInvalid
              ? "border-red-400 dark:border-red-700"
              : "border-neutral-300 dark:border-neutral-700"
          }`}
        />
        <p id="username-hint" className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          {C.usernameHint}
        </p>
        <p
          id="username-error"
          role="alert"
          className={`mt-1 text-xs font-medium text-red-600 dark:text-red-400 ${
            usernameInvalid ? "" : "hidden"
          }`}
        >
          {C.usernameError}
        </p>
      </div>

      <div aria-labelledby="consent-heading" className="mt-6 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 id="consent-heading" className="text-base font-semibold">
          {C.consentHeading}
        </h2>
        {C.consentParagraphs.map((paragraph, index) => (
          <p key={index} className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            {paragraph}
          </p>
        ))}
        <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {C.incentiveText}
        </p>
      </div>

      <div className="mt-5">
        <label htmlFor="consent-agree" className="flex cursor-pointer items-start gap-3 text-sm leading-6">
          <input
            id="consent-agree"
            name="consent-agree"
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            required
            aria-invalid={consentInvalid || undefined}
            aria-describedby="consent-error"
            className="mt-1 size-4 shrink-0 rounded border-neutral-400 accent-neutral-900 dark:accent-white"
          />
          <span className="font-medium">{C.consentCheckboxLabel}</span>
        </label>
        <p
          id="consent-error"
          role="alert"
          className={`mt-1 text-xs font-medium text-red-600 dark:text-red-400 ${
            consentInvalid ? "" : "hidden"
          }`}
        >
          {C.consentError}
        </p>
      </div>

      <button
        type="submit"
        // Consent wajib dicentang + username wajib terisi sebelum mulai.
        disabled={!isRehydrated || !agreed || usernameTrimmed.length === 0}
        className="btn-primary mt-8 w-full"
      >
        {C.startButtonLabel}
        <span aria-hidden="true">→</span>
      </button>
      <p className="mt-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
        {C.startButtonHint}
      </p>
    </form>
  );
}
