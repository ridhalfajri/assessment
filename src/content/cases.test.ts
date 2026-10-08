import { describe, expect, it } from "vitest";
import { CASE_COUNT, getReferenceCase, REFERENCE_CASES } from "@/content/cases";

describe("REFERENCE_CASES — 14 kasus acuan pajak (BETE-9)", () => {
  it("memuat tepat 14 kasus dengan CASE_COUNT senada", () => {
    expect(REFERENCE_CASES).toHaveLength(14);
    expect(CASE_COUNT).toBe(14);
  });

  it("caseId 1–14 masing-masing tepat sekali (senada case_logs.case_id skema BETE-5)", () => {
    const ids = REFERENCE_CASES.map((referenceCase) => referenceCase.caseId);
    expect(ids).toStrictEqual(Array.from({ length: 14 }, (_, index) => index + 1));
  });

  it("setiap kasus punya judul, ringkasan, dan isi non-kosong bertanda PLACEHOLDER", () => {
    for (const referenceCase of REFERENCE_CASES) {
      expect(referenceCase.title.trim().length).toBeGreaterThan(0);
      expect(referenceCase.title).toContain("PLACEHOLDER");
      expect(referenceCase.summary.trim().length).toBeGreaterThan(0);
      expect(referenceCase.paragraphs.length).toBeGreaterThan(0);
      for (const paragraph of referenceCase.paragraphs) {
        expect(paragraph.trim().length).toBeGreaterThan(0);
        expect(paragraph).toContain("PLACEHOLDER");
      }
    }
  });

  it("judul tiap kasus unik agar kartu mudah dibedakan", () => {
    const titles = REFERENCE_CASES.map((referenceCase) => referenceCase.title);
    expect(new Set(titles).size).toBe(14);
  });

  it("getReferenceCase mengembalikan kasus yang sesuai atau undefined", () => {
    expect(getReferenceCase(1)?.caseId).toBe(1);
    expect(getReferenceCase(14)?.caseId).toBe(14);
    expect(getReferenceCase(0)).toBeUndefined();
    expect(getReferenceCase(15)).toBeUndefined();
  });
});
