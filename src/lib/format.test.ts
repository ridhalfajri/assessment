import { describe, expect, it } from "vitest";
import { formatRupiah, groupDigits, parseRupiahInput } from "@/lib/format";

describe("formatRupiah", () => {
  it("memformat nilai besar dengan pemisah ribuan titik", () => {
    expect(formatRupiah(1_000_000_000)).toBe("Rp1.000.000.000");
    expect(formatRupiah(250_000_000)).toBe("Rp250.000.000");
    expect(formatRupiah(1_000)).toBe("Rp1.000");
  });

  it("memformat nilai kecil tanpa pemisah", () => {
    expect(formatRupiah(0)).toBe("Rp0");
    expect(formatRupiah(999)).toBe("Rp999");
  });
});

describe("parseRupiahInput", () => {
  it("menerima format ribuan titik, koma, spasi, dan digit polos", () => {
    expect(parseRupiahInput("1.250.000")).toBe(1_250_000);
    expect(parseRupiahInput("1,250,000")).toBe(1_250_000);
    expect(parseRupiahInput("1 250 000")).toBe(1_250_000);
    expect(parseRupiahInput("1250000")).toBe(1_250_000);
    expect(parseRupiahInput("0")).toBe(0);
  });

  it("menolak input tanpa digit atau berisi karakter lain", () => {
    expect(parseRupiahInput("")).toBeNull();
    expect(parseRupiahInput("   ")).toBeNull();
    expect(parseRupiahInput("abc")).toBeNull();
    expect(parseRupiahInput("12a3")).toBeNull();
    expect(parseRupiahInput("-500")).toBeNull();
    expect(parseRupiahInput("1.5e9")).toBeNull();
  });

  it("menolak nilai di luar safe integer (tidak pernah negatif)", () => {
    expect(parseRupiahInput("9".repeat(13))).toBe(Number.parseInt("9".repeat(13), 10));
    expect(parseRupiahInput("9".repeat(16))).toBeNull();
  });
});

describe("groupDigits", () => {
  it("mengelompokkan digit dengan titik ribuan saat diketik", () => {
    expect(groupDigits("1250000")).toBe("1.250.000");
    expect(groupDigits("1000000000")).toBe("1.000.000.000");
    expect(groupDigits("0")).toBe("0");
  });

  it("membuang bukan-digit dan memotong ke batas 13 digit", () => {
    expect(groupDigits("12ab34")).toBe("1.234");
    expect(groupDigits("9".repeat(20))).toBe("9.999.999.999.999");
    expect(groupDigits("")).toBe("");
  });
});
