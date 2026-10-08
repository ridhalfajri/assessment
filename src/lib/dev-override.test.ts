import { describe, expect, it } from "vitest";
import { parseDevGroupOverride } from "@/lib/dev-override";

describe("parseDevGroupOverride", () => {
  it("di dev: menerima '1'–'4' sebagai grup treatment", () => {
    expect(parseDevGroupOverride("1", true)).toBe(1);
    expect(parseDevGroupOverride("2", true)).toBe(2);
    expect(parseDevGroupOverride("3", true)).toBe(3);
    expect(parseDevGroupOverride("4", true)).toBe(4);
  });

  it("di dev: menolak nilai di luar 1–4", () => {
    expect(parseDevGroupOverride("0", true)).toBeNull();
    expect(parseDevGroupOverride("5", true)).toBeNull();
    expect(parseDevGroupOverride("abc", true)).toBeNull();
    expect(parseDevGroupOverride("", true)).toBeNull();
    expect(parseDevGroupOverride("12", true)).toBeNull();
  });

  it("di produksi: SELALU null — random assignment tidak bisa ditimpa", () => {
    expect(parseDevGroupOverride("1", false)).toBeNull();
    expect(parseDevGroupOverride("4", false)).toBeNull();
  });

  it("param kosong → null", () => {
    expect(parseDevGroupOverride(null, true)).toBeNull();
    expect(parseDevGroupOverride(undefined, true)).toBeNull();
  });
});
