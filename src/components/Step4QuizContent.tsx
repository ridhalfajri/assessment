"use client";

import Link from "next/link";
import { useExperiment } from "@/context/ExperimentContext";
import {
  KNOWLEDGE_QUESTIONS,
  LIKERT_LABELS,
  LIKERT_MAX,
  LIKERT_MIN,
  MANIPULATION_CHECK_QUESTION,
  type KnowledgeQuestionId,
} from "@/content/questionnaire";
import { isStep4GateSatisfied } from "@/lib/submit-client";

/**
 * Konten Step 4 — Kuesioner (BETE-10, PRD 3.6):
 *  - 3 pilihan ganda pengetahuan perpajakan (q1–q3). Jawaban disimpan sebagai
 *    TEKS OPSI yang dipilih (konvensi payload arsitektur BETE-2).
 *  - 1 butir manipulation check berupa skala Likert 1–5 (jawaban angka).
 *  - Butir & opsi dari src/content/questionnaire.ts (placeholder sampai
 *    owner menyerahkan butir final; komponen tidak menyimpan teks).
 *  - Gerbang navigasi: aktif setelah q1–q3 + Likert terjawab lengkap.
 *  - Input terkunci saat status expired (timer habis), konsisten dengan Step 2/3.
 */

function QuestionCard({
  number,
  prompt,
  children,
}: {
  number: number;
  prompt: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="card mt-6">
      <legend className="sr-only">{`Pertanyaan ${number}`}</legend>
      <p className="text-sm font-semibold leading-6">
        <span className="step-label mr-2">{`Pertanyaan ${number}`}</span>
        {prompt}
      </p>
      {children}
    </fieldset>
  );
}

export function Step4QuizContent() {
  const { state, dispatch } = useExperiment();
  const { questionnaire, status } = state;
  const isLocked = status !== "running";
  const isGateSatisfied = isStep4GateSatisfied(questionnaire);

  const setKnowledgeAnswer = (id: KnowledgeQuestionId, answer: string) => {
    dispatch({ type: "SET_QUESTIONNAIRE", patch: { [id]: answer } });
  };

  const setManipulationCheck = (value: number) => {
    dispatch({ type: "SET_QUESTIONNAIRE", patch: { manipulationCheck: value } });
  };

  return (
    <div className="mt-6">
      <div className="card">
        <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          Bagian ini berisi pertanyaan pilihan ganda tentang pengetahuan
          perpajakan dan satu pernyataan untuk Anda nilai pada skala 1–5.
          Jawaban tidak memengaruhi nilai apa pun — jawablah sejujurahnya.
        </p>
      </div>

      {KNOWLEDGE_QUESTIONS.map((question) => (
        <QuestionCard key={question.id} number={question.number} prompt={question.prompt}>
          <div className="mt-4 grid grid-cols-1 gap-2">
            {question.options.map((option, optionIndex) => {
              const inputId = `quiz-${question.id}-${optionIndex}`;
              const isChecked = questionnaire[question.id] === option;
              return (
                <label
                  key={optionIndex}
                  htmlFor={inputId}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm leading-6 transition-colors hover:border-neutral-400 dark:hover:border-neutral-500 ${
                    isChecked
                      ? "border-neutral-900 bg-neutral-100 font-medium dark:border-white dark:bg-neutral-800"
                      : "border-neutral-200 dark:border-neutral-700"
                  } ${isLocked ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <input
                    id={inputId}
                    type="radio"
                    name={`quiz-${question.id}`}
                    value={option}
                    checked={isChecked}
                    disabled={isLocked}
                    onChange={() => setKnowledgeAnswer(question.id, option)}
                    className="mt-1.5 size-4 shrink-0 accent-neutral-900 dark:accent-white"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        </QuestionCard>
      ))}

      <QuestionCard
        number={KNOWLEDGE_QUESTIONS.length + 1}
        prompt={MANIPULATION_CHECK_QUESTION.prompt}
      >
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-5">
          {Array.from({ length: LIKERT_MAX - LIKERT_MIN + 1 }, (_, index) => index + LIKERT_MIN).map(
            (value) => {
              const inputId = `likert-${MANIPULATION_CHECK_QUESTION.id}-${value}`;
              const isChecked = questionnaire.manipulationCheck === value;
              return (
                <label
                  key={value}
                  htmlFor={inputId}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center text-xs font-medium transition-colors hover:border-neutral-400 dark:hover:border-neutral-500 ${
                    isChecked
                      ? "border-neutral-900 bg-neutral-100 dark:border-white dark:bg-neutral-800"
                      : "border-neutral-200 dark:border-neutral-700"
                  } ${isLocked ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <input
                    id={inputId}
                    type="radio"
                    name={`likert-${MANIPULATION_CHECK_QUESTION.id}`}
                    value={value}
                    checked={isChecked}
                    disabled={isLocked}
                    onChange={() => setManipulationCheck(value)}
                    aria-label={`${value} — ${LIKERT_LABELS[value - 1]}`}
                    className="size-4 accent-neutral-900 dark:accent-white"
                  />
                  <span className="text-base font-bold tabular-nums">{value}</span>
                  <span className="leading-4">{LIKERT_LABELS[value - 1]}</span>
                </label>
              );
            },
          )}
        </div>
        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
          Skala: 1 = {LIKERT_LABELS[0]} &middot; 5 = {LIKERT_LABELS[LIKERT_LABELS.length - 1]}
        </p>
      </QuestionCard>

      <div className="card mt-6">
        {isGateSatisfied ? (
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
            Semua pertanyaan terjawab. Anda dapat melanjutkan ke langkah berikutnya.
          </p>
        ) : (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Jawab semua pertanyaan di atas untuk melanjutkan ke demografi.
          </p>
        )}
        <div className="mt-4 flex justify-end">
          {isGateSatisfied ? (
            <Link href="/step-5-demographics" className="btn-primary">
              Lanjut ke Demografi
              <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              data-testid="step4-next-disabled"
              className="btn-primary"
            >
              Lanjut ke Demografi
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
        {isLocked && (
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Waktu eksperimen telah habis — jawaban dikunci.
          </p>
        )}
      </div>
    </div>
  );
}
