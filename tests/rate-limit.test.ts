import { beforeEach, describe, expect, it } from "vitest";
import {
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  checkRateLimit,
  resetRateLimitsForTests,
} from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimitsForTests();
});

describe("checkRateLimit (BETE-13)", () => {
  it("mengizinkan hingga batas, lalu menolak dengan retry-after", () => {
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i += 1) {
      expect(checkRateLimit("ip-a", 1000).allowed).toBe(true);
    }

    const blocked = checkRateLimit("ip-a", 1001);

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(RATE_LIMIT_WINDOW_MS / 1000);
  });

  it("jendela baru mengizinkan lagi (waktu disuntik)", () => {
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i += 1) {
      checkRateLimit("ip-a", 1000);
    }
    expect(checkRateLimit("ip-a", 1001).allowed).toBe(false);

    const afterWindow = checkRateLimit("ip-a", 1000 + RATE_LIMIT_WINDOW_MS);

    expect(afterWindow.allowed).toBe(true);
  });

  it("kunci berbeda punya kuota masing-masing", () => {
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i += 1) {
      checkRateLimit("ip-a", 1000);
    }
    expect(checkRateLimit("ip-a", 1001).allowed).toBe(false);
    expect(checkRateLimit("ip-b", 1001).allowed).toBe(true);
  });

  it("retry-after mundur sesuai sisa jendela", () => {
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i += 1) {
      checkRateLimit("ip-a", 1000);
    }

    const { retryAfterSeconds } = checkRateLimit("ip-a", 1000 + RATE_LIMIT_WINDOW_MS - 5000);

    expect(retryAfterSeconds).toBe(5);
  });
});
