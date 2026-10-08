import { describe, expect, it } from "vitest";
import { submitSurveyPayloadSchema } from "@/lib/submit-survey";
import {
  KNOWLEDGE_QUESTIONS,
  LIKERT_LABELS,
  LIKERT_MAX,
  LIKERT_MIN,
  MANIPULATION_CHECK_QUESTION,
} from "@/content/questionnaire";

describe("KNOWLEDGE_QUESTIONS — kuesioner pengetahuan perpajakan (BETE-10)", () => {
  it("memuat tepat 3 butir dengan id q1–q3 (senada survey_results.q1–q3_answer)", () => {
    expect(KNOWLEDGE_QUESTIONS).toHaveLength(3);
    expect(KNOWLEDGE_QUESTIONS.map((question) => question.id)).toStrictEqual(["q1", "q2", "q3"]);
    expect(KNOWLEDGE_QUESTIONS.map((question) => question.number)).toStrictEqual([1, 2, 3]);
  });

  it("setiap butir punya pertanyaan & minimal 2 opsi non-kosong bertanda PLACEHOLDER", () => {
    for (const question of KNOWLEDGE_QUESTIONS) {
      expect(question.prompt.trim().length).toBeGreaterThan(0);
      expect(question.prompt).toContain("PLACEHOLDER");
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      for (const option of question.options) {
        expect(option.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("opsi tiap butir unik agar pilihan tidak ambigu", () => {
    for (const question of KNOWLEDGE_QUESTIONS) {
      expect(new Set(question.options).size).toBe(question.options.length);
    }
  });
});

describe("manipulation check — skala Likert 1–5 (BETE-10)", () => {
  it("punya tepat satu butir Likert bertanda PLACEHOLDER", () => {
    expect(MANIPULATION_CHECK_QUESTION.id).toBe("manipulationCheck");
    expect(MANIPULATION_CHECK_QUESTION.prompt).toContain("PLACEHOLDER");
    expect(MANIPULATION_CHECK_QUESTION.prompt.trim().length).toBeGreaterThan(0);
  });

  it("label skala 1–5 lengkap dan berurutan", () => {
    expect(LIKERT_LABELS).toHaveLength(LIKERT_MAX - LIKERT_MIN + 1);
    expect(LIKERT_MIN).toBe(1);
    expect(LIKERT_MAX).toBe(5);
  });
});

describe("jawaban kuesioner lolos skema zod kontrak API (BETE-7)", () => {
  it("teks opsi apapun dari butir placeholder valid sebagai q1–q3", () => {
    for (const q1 of KNOWLEDGE_QUESTIONS[0].options) {
      const result = submitSurveyPayloadSchema.shape.questionnaire.safeParse({
        q1,
        q2: "opsi apa pun",
        q3: "opsi apa pun",
      });
      expect(result.success).toBe(true);
    }
  });
});
