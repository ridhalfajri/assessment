import { describe, expect, it } from "vitest";
import { formatRupiah } from "@/lib/format";

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
