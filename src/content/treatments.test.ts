import { describe, expect, it } from "vitest";
import { TREATMENTS, getTreatmentContent } from "@/content/treatments";
import type { TreatmentGroupId } from "@/lib/experiment";

const ALL_GROUPS: TreatmentGroupId[] = [1, 2, 3, 4];

/** Matriks desain eksperimen 2×2 (dokumen arsitektur, BETE-2). */
const EXPECTED_MATRIX: Record<
  TreatmentGroupId,
  { clientPreference: "implisit" | "eksplisit"; accountability: "lemah" | "kuat" }
> = {
  1: { clientPreference: "implisit", accountability: "lemah" },
  2: { clientPreference: "eksplisit", accountability: "lemah" },
  3: { clientPreference: "implisit", accountability: "kuat" },
  4: { clientPreference: "eksplisit", accountability: "kuat" },
};

function allParagraphs(groupId: TreatmentGroupId): string[] {
  const treatment = TREATMENTS[groupId];
  return [...treatment.clientPreferenceParagraphs, ...treatment.memoParagraphs];
}

describe("TREATMENTS — struktur matriks 4 grup", () => {
  it("menyediakan tepat grup 1–4", () => {
    expect(Object.keys(TREATMENTS).map(Number).sort()).toStrictEqual(ALL_GROUPS);
  });

  it("setiap grup membaca kondisi yang benar sesuai matriks 2×2", () => {
    for (const groupId of ALL_GROUPS) {
      const treatment = getTreatmentContent(groupId);
      expect(treatment.groupId).toBe(groupId);
      expect(treatment.label).not.toHaveLength(0);
      expect(treatment.clientPreference).toBe(EXPECTED_MATRIX[groupId].clientPreference);
      expect(treatment.accountability).toBe(EXPECTED_MATRIX[groupId].accountability);
    }
  });

  it("setiap paragraf teks non-kosong dan bertanda PLACEHOLDER (belum final)", () => {
    for (const groupId of ALL_GROUPS) {
      for (const paragraph of allParagraphs(groupId)) {
        expect(paragraph.trim().length).toBeGreaterThan(0);
        expect(paragraph).toContain("PLACEHOLDER");
      }
    }
  });

  it("grup dengan kondisi sama berbagi teks identik (faktorial 2×2)", () => {
    // Variabel 1 — preferensi klien: 1≡3 (implisit), 2≡4 (eksplisit).
    expect(TREATMENTS[1].clientPreferenceParagraphs).toStrictEqual(
      TREATMENTS[3].clientPreferenceParagraphs,
    );
    expect(TREATMENTS[2].clientPreferenceParagraphs).toStrictEqual(
      TREATMENTS[4].clientPreferenceParagraphs,
    );
    // Variabel 2 — memo manajer: 1≡2 (lemah), 3≡4 (kuat).
    expect(TREATMENTS[1].memoParagraphs).toStrictEqual(TREATMENTS[2].memoParagraphs);
    expect(TREATMENTS[3].memoParagraphs).toStrictEqual(TREATMENTS[4].memoParagraphs);
  });

  it("grup dengan kondisi berbeda punya teks berbeda", () => {
    // Preferensi klien implisit ≠ eksplisit.
    expect(TREATMENTS[1].clientPreferenceParagraphs).not.toStrictEqual(
      TREATMENTS[2].clientPreferenceParagraphs,
    );
    // Memo akuntabilitas lemah ≠ kuat.
    expect(TREATMENTS[1].memoParagraphs).not.toStrictEqual(TREATMENTS[3].memoParagraphs);
  });

  it("getTreatmentContent mengembalikan objek grup yang sesuai", () => {
    expect(getTreatmentContent(4)).toBe(TREATMENTS[4]);
  });
});
