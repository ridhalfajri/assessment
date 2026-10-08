import { describe, expect, it } from "vitest";
import {
  SCENARIO_CONTENT,
  TOTAL_PROBLEM_EXPENSE_RP,
} from "@/content/scenario";

describe("SCENARIO_CONTENT — kasus dasar PT Cahaya Gama", () => {
  it("memuat tepat 4 akun biaya bermasalah dengan total Rp1.000.000.000", () => {
    expect(SCENARIO_CONTENT.accounts).toHaveLength(4);
    const total = SCENARIO_CONTENT.accounts.reduce((sum, account) => sum + account.amountRp, 0);
    expect(total).toBe(TOTAL_PROBLEM_EXPENSE_RP);
    expect(TOTAL_PROBLEM_EXPENSE_RP).toBe(1_000_000_000);
  });

  it("setiap akun bernilai positif dengan id yang unik dan senada payload submit", () => {
    const ids = SCENARIO_CONTENT.accounts.map((account) => account.id);
    expect(new Set(ids).size).toBe(4);
    for (const account of SCENARIO_CONTENT.accounts) {
      expect(account.amountRp).toBeGreaterThan(0);
      expect(account.label.trim().length).toBeGreaterThan(0);
    }
    // Senada field rekomendasi di payload submit (BETE-7).
    expect(new Set(ids)).toEqual(
      new Set(["know_how_fee", "entertainment", "maintenance", "marketing"]),
    );
  });

  it("narasi skenario tidak kosong", () => {
    expect(SCENARIO_CONTENT.introParagraphs.length).toBeGreaterThan(0);
    expect(SCENARIO_CONTENT.taskParagraphs.length).toBeGreaterThan(0);
    expect(SCENARIO_CONTENT.companyName.trim().length).toBeGreaterThan(0);
  });
});
